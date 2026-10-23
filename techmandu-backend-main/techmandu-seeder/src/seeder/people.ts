import { IsNull } from "typeorm";
import {
  Customer,
  CustomerService,
  isGraphQlErrorResult,
  Product,
  ProductVariant,
  TransactionalConnection,
} from "@vendure/core";
import { ProductReview } from "../plugins/reviews/entities/product-review.entity";
import { Question } from "../plugins/question-answer/entities/question.entity";
import { Answer } from "../plugins/question-answer/entities/answer.entity";
import { WishlistItem } from "../plugins/wishlist/entities/wishlist-item.entity";
import { NewsletterSubscriber } from "../plugins/newsletter/entities/newsletter-subscriber.entity";
import {
  TechCoinTransaction,
  TechCoinTransactionType,
  TechCoinType,
} from "../plugins/loyalty-points/entities/loyalty-point-transaction.entity";
import { between, log, pick, rng, SeedContext } from "./context";
import { CatalogRow } from "./catalog";
import { CUSTOMERS, PLACES, QUESTIONS, REVIEWS, SEED_PASSWORD } from "./data";

export async function seedPeople(sc: SeedContext, _rows: CatalogRow[]) {
  const { ctx } = sc;
  const connection = sc.get(TransactionalConnection);
  const customerService = sc.get(CustomerService);

  // ---- Customers + addresses + B2B accounts ------------------------------------------------------
  const customers: Customer[] = [];
  let created = 0;
  for (const seed of CUSTOMERS) {
    const existing = await connection
      .getRepository(ctx, Customer)
      .findOne({ where: { emailAddress: seed.email, deletedAt: IsNull() } });
    if (existing) {
      customers.push(existing);
      continue;
    }
    // Inside a transaction, so events (e.g. the loyalty plugin's signup bonus) fire AFTER the commit,
    // exactly like a real registration through the shop API.
    const place = PLACES[seed.place];
    const rand = rng(`address-${seed.email}`);
    const result = await connection.withTransaction(ctx, async (txCtx) => {
      const created = await customerService.create(
        txCtx,
        {
          emailAddress: seed.email,
          firstName: seed.firstName,
          lastName: seed.lastName,
          phoneNumber: seed.phone,
          customFields: sc.fields("Customer", {
            isBusiness: !!seed.business,
            isVerified: seed.business?.verified ?? false,
            vatPan: seed.business?.vatPan,
            businessName: seed.business?.name,
          }),
        } as any,
        SEED_PASSWORD, // a password makes the account verified, so the login works straight away
      );
      if (isGraphQlErrorResult(created)) return created;
      const address = await customerService.createAddress(txCtx, (created as Customer).id, {
        fullName: seed.business?.name ?? `${seed.firstName} ${seed.lastName}`,
        streetLine1: `${pick(rand, place.streets)}-${between(rand, 1, 35)}`,
        streetLine2: `Near ${pick(rand, ["Bhatbhateni", "the temple", "the main chowk", "Himalayan Bank", "the petrol pump"])}`,
        city: place.city,
        province: place.province,
        postalCode: place.postalCode,
        countryCode: "NP",
        phoneNumber: seed.phone,
        defaultShippingAddress: true,
        defaultBillingAddress: true,
        customFields: sc.fields("Address", { vat: seed.business?.vatPan }),
      } as any);
      if (isGraphQlErrorResult(address)) log.warn(`Address for ${seed.email}: ${(address as any).message}`);
      return created;
    });
    if (isGraphQlErrorResult(result)) {
      log.warn(`Customer ${seed.email}: ${(result as any).message}`);
      continue;
    }
    const customer = result as Customer;

    customers.push(customer);
    created++;
  }
  log.ok(`Customers: ${created} created (${CUSTOMERS.filter((c) => c.business).length} business accounts), login password "${SEED_PASSWORD}"`);

  // ---- Tech Coins ledger -------------------------------------------------------------------------
  // The loyalty plugin grants the signup bonus itself (AccountRegistrationEvent). Wait for those rows, then add
  // "coins earned from past orders" so balances are interesting. Balance = SUM(points) per customer.
  const txRepo = connection.getRepository(ctx, TechCoinTransaction);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let coinRows = 0;
  for (const seed of CUSTOMERS) {
    const customer = customers.find((c) => c.emailAddress === seed.email);
    if (!customer) continue;
    for (let i = 0; i < 40 && (await txRepo.count({ where: { customerId: customer.id } })) === 0; i++) await sleep(250);
    if (seed.coins <= 0) continue;
    if ((await txRepo.count({ where: { customerId: customer.id, loyaltyPointsType: TechCoinType.ORDER } })) > 0) continue;
    await txRepo.save(
      new TechCoinTransaction({
        customerId: customer.id,
        customer,
        points: seed.coins,
        type: TechCoinTransactionType.EARNED,
        loyaltyPointsType: TechCoinType.ORDER,
        description: `${seed.firstName} ${seed.lastName} earned ${seed.coins} coins.`,
      }),
    );
    coinRows++;
  }
  const balances = await txRepo
    .createQueryBuilder("tx")
    .select("COALESCE(SUM(tx.points), 0)", "total")
    .getRawOne();
  log.ok(`Tech Coins: 50 signup bonus each (by the plugin) + ${coinRows} past-order rows; ${balances?.total ?? 0} coins in total`);

  const shoppers = customers.filter((c) => !(c.customFields as any)?.isBusiness);
  if (!shoppers.length) return;

  const products = await connection.getRepository(ctx, Product).find({ where: { deletedAt: IsNull() }, order: { id: "ASC" } });

  // ---- Reviews (+ aggregate rating on the product) -----------------------------------------------
  const reviewRepo = connection.getRepository(ctx, ProductReview);
  if ((await reviewRepo.count()) === 0) {
    let reviews = 0;
    for (const product of products) {
      const rand = rng(`reviews-${product.id}`);
      if (rand() < 0.35) continue; // some products have no reviews yet
      const count = between(rand, 1, 4);
      const approved: ProductReview[] = [];
      for (let i = 0; i < count; i++) {
        const author = pick(rand, shoppers);
        const template = pick(rand, REVIEWS);
        const roll = rand();
        const state = roll < 0.82 ? "approved" : roll < 0.95 ? "new" : "rejected";
        const place = PLACES[CUSTOMERS.find((c) => c.email === author.emailAddress)?.place ?? 0];
        const review = await reviewRepo.save(
          new ProductReview({
            product,
            productVariant: null,
            summary: template.summary,
            body: template.body,
            rating: template.rating,
            author,
            authorName: `${author.firstName} ${author.lastName.charAt(0)}.`,
            authorLocation: place.city,
            upvotes: between(rand, 0, 12),
            downvotes: between(rand, 0, 2),
            state: state as any,
            ...(state === "approved" && rand() < 0.3
              ? { response: "Thank you for your feedback! We are glad you like it.", responseCreatedAt: new Date() }
              : {}),
          }),
        );
        reviews++;
        if (state === "approved") approved.push(review);
      }
      if (approved.length) {
        const avg = approved.reduce((sum, r) => sum + r.rating, 0) / approved.length;
        const featured = approved.reduce((best, r) => (r.rating * 100 + r.upvotes > best.rating * 100 + best.upvotes ? r : best));
        await connection.rawConnection.query(
          `UPDATE "product" SET "customFieldsReviewrating" = $1, "customFieldsReviewcount" = $2, "customFieldsFeaturedreviewid" = $3 WHERE "id" = $4`,
          [Math.round(avg * 10) / 10, approved.length, featured.id, product.id],
        );
      }
    }
    log.ok(`Reviews: ${reviews} (approved / pending / rejected mix) with product rating, count and featured review`);
  }

  // ---- Product questions & answers ---------------------------------------------------------------
  const questionRepo = connection.getRepository(ctx, Question);
  if ((await questionRepo.count()) === 0) {
    const answerRepo = connection.getRepository(ctx, Answer);
    const rand = rng("questions");
    let questions = 0;
    for (const product of products.filter(() => rand() < 0.4)) {
      for (const template of Array.from({ length: between(rand, 1, 3) }, () => pick(rand, QUESTIONS))) {
        const answer = template.answer ? await answerRepo.save(new Answer({ text: template.answer })) : undefined;
        await questionRepo.save(
          new Question({ question: template.question, product, askedBy: pick(rand, shoppers), ...(answer ? { answer } : {}) }),
        );
        questions++;
      }
    }
    log.ok(`Product Q&A: ${questions} questions (most answered)`);
  }

  // ---- Wishlists ---------------------------------------------------------------------------------
  const wishRepo = connection.getRepository(ctx, WishlistItem);
  if ((await wishRepo.count()) === 0) {
    const variants = await connection.getRepository(ctx, ProductVariant).find({ where: { deletedAt: IsNull() }, take: 200 });
    let items = 0;
    for (const customer of shoppers.slice(0, 6)) {
      const rand = rng(`wishlist-${customer.id}`);
      const chosen = new Set<number>();
      while (chosen.size < Math.min(between(rand, 2, 5), variants.length)) chosen.add(Math.floor(rand() * variants.length));
      for (const index of chosen) {
        await wishRepo.save(new WishlistItem({ customerId: customer.id, productVariantId: variants[index].id }));
        items++;
      }
    }
    log.ok(`Wishlists: ${items} items across ${Math.min(6, shoppers.length)} customers`);
  }

  // ---- Newsletter --------------------------------------------------------------------------------
  const newsletterRepo = connection.getRepository(ctx, NewsletterSubscriber);
  let subscribers = 0;
  for (const customer of shoppers.slice(0, 8)) {
    if (await newsletterRepo.findOne({ where: { email: customer.emailAddress } })) continue;
    await newsletterRepo.save(
      new NewsletterSubscriber({ email: customer.emailAddress, name: `${customer.firstName} ${customer.lastName}`, source: "seed" }),
    );
    subscribers++;
  }
  log.ok(`Newsletter: ${subscribers} subscribers`);
}
