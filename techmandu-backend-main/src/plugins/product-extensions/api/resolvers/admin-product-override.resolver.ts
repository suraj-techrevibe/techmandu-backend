import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  Ctx,
  RequestContext,
  TransactionalConnection,
  Product,
  ProductVariant,
  Allow,
  Permission,
  Translated,
  ProductService,
  ProductVariantService,
  Transaction,
  EventBus,
  GlobalSettings,
  GlobalSettingsService,
} from "@vendure/core";
import {
  MutationCreateProductArgs,
  MutationCreateProductVariantsArgs,
  MutationUpdateProductArgs,
  MutationUpdateProductVariantArgs,
  MutationUpdateProductVariantsArgs,
} from "../../../codegen/generated-admin-types";
import { BiddingHistory } from "../../../price-bidding/entities/bidding-history.entity";
import { NewBidAmountEvent } from "../../../price-bidding/events/price-update-event";

@Resolver()
export class AdminProductResolver {
  constructor(
    private connection: TransactionalConnection,
    private productService: ProductService,
    private productVariantService: ProductVariantService,
    private eventBus: EventBus,
    private globalSettingsService: GlobalSettingsService,
  ) {}

  @Transaction()
  @Mutation()
  @Allow(Permission.CreateCatalog, Permission.CreateProduct)
  async createProduct(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationCreateProductArgs,
  ): Promise<Translated<Product>> {
    const { input } = args;
    if (ctx.activeUserId === 1) {
      return this.productService.create(ctx, input);
    } else {
      input.enabled = false;
      return this.productService.create(ctx, input);
    }
  }

  @Transaction()
  @Mutation()
  @Allow(Permission.UpdateCatalog, Permission.UpdateProduct)
  async updateProduct(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationUpdateProductArgs,
  ): Promise<Translated<Product>> {
    const { input } = args;

    if (ctx.activeUserId === 1) {
      return await this.productService.update(ctx, input);
    } else {
      const productInstance = await this.productService.findOne(ctx, input.id);
      if (productInstance) {
        (input as any).enabled = (productInstance as any).enabled;
      }
      return await this.productService.update(ctx, input);
    }
  }

  @Transaction()
  @Mutation()
  @Allow(Permission.UpdateCatalog, Permission.UpdateProduct)
  async createProductVariants(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationCreateProductVariantsArgs,
  ): Promise<Array<Translated<ProductVariant>>> {
    const { input } = args;
    if (ctx.activeUserId === 1) {
      return this.productVariantService.create(ctx, input);
    } else {
      const locked = input.map((iv) => ({ ...iv, enabled: false }));

      const variant = await this.productVariantService.create(ctx, locked);
      for (const v of variant) {
        await this.connection.getRepository(ctx, BiddingHistory).save({
          variantId: v.id as number,
          initialPrice: 0,
          finalPrice: v.price,
          isVerified: false,
        });
      }

      return variant;
    }
  }

  @Transaction()
  @Mutation()
  @Allow(Permission.UpdateCatalog, Permission.UpdateProduct)
  async updateProductVariant(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationUpdateProductVariantArgs,
  ): Promise<Translated<ProductVariant>> {
    const { input } = args;

    if (ctx.activeUserId === 1) {
      const variants = await this.productVariantService.update(ctx, [input]);
      return variants[0];
    } else {
      const existing = await this.productVariantService.findOne(ctx, input.id);
      if (existing) {
        (input as any).enabled = (existing as any).enabled;
        const initialPrice = (existing as any).price;
        const newPrice = (input as any).price;
        let priceUpdate = false;
        if (initialPrice !== newPrice) {
          // Publish Event for price update notification email
          priceUpdate = true;
          const globalSettingsConfig =
            await this.globalSettingsService.getSettings(ctx);

          const bidListnerEmail =
            globalSettingsConfig.customFields.productNotificationEmail;

          const existingBidding = await this.connection
            .getRepository(ctx, BiddingHistory)
            .findOne({
              where: { variantId: input.id as number },
            });
          this.eventBus.publish(
            new NewBidAmountEvent(
              ctx,
              bidListnerEmail,
              newPrice,
              input.id as number,
              existing.name,
              "SellerName",
              "BusinessName",
              ctx.channelId as number,
            ),
          );
          if (!existingBidding) {
            await this.connection.getRepository(ctx, BiddingHistory).save({
              variantId: input.id as number,
              initialPrice: initialPrice,
              finalPrice: newPrice,
              isVerified: false,
            });
          } else {
            await this.connection.getRepository(ctx, BiddingHistory).update(
              {
                id: existingBidding.id,
              },
              {
                finalPrice: newPrice,
                isVerified: false,
              },
            );
          }
        }
      }
      const variants = await this.productVariantService.update(ctx, [input]);
      return variants[0];
    }
  }

  @Transaction()
  @Mutation()
  @Allow(Permission.UpdateCatalog, Permission.UpdateProduct)
  async updateProductVariants(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationUpdateProductVariantsArgs,
  ): Promise<Array<Translated<ProductVariant>>> {
    const { input } = args;
    if (ctx.activeUserId === 1) {
      return this.productVariantService.update(ctx, input);
    } else {
      const lockedInputs = await Promise.all(
        input.map(async (iv: any) => {
          const existing: any = await this.connection
            .getRepository(ctx, ProductVariant)
            .findOne({
              relations: ["product"],
              where: {
                id: iv.id as number,
              },
            });
          const initialPrice = existing?.productVariantPrices[0].price || 0;
          let newPrice: any;
          if ((iv as any).prices) {
            newPrice = (iv as any).prices[0].price;
          } else {
            newPrice = initialPrice;
          }
          let priceUpdate = false;
          if (initialPrice !== newPrice) {
            priceUpdate = true;
            // Publish Event for price update notification email
            const globalSettingsConfig =
              await this.globalSettingsService.getSettings(ctx);

            const bidListnerEmail =
              globalSettingsConfig.customFields.productNotificationEmail;
            const variantName = iv.translations[0].name;
            const sellerName =
              existing.product.customFields.vendorName || "SellerName";
            const businessName =
              existing.product.customFields.vendorBusinessName ||
              "BusinessName";
            await this.eventBus.publish(
              new NewBidAmountEvent(
                ctx,
                bidListnerEmail,
                newPrice / 100,
                iv.id as number,
                variantName,
                sellerName,
                businessName,
                ctx.channelId as number,
              ),
            );
            const existingBidding = await this.connection
              .getRepository(ctx, BiddingHistory)
              .findOne({
                where: { variantId: iv.id as number },
              });

            if (!existingBidding) {
              await this.connection.getRepository(ctx, BiddingHistory).save({
                variantId: iv.id as number,
                initialPrice: initialPrice,
                finalPrice: newPrice,
                isVerified: false,
              });
            } else {
              await this.connection.getRepository(ctx, BiddingHistory).update(
                {
                  id: existingBidding.id,
                },
                {
                  finalPrice: newPrice,
                  isVerified: false,
                },
              );
            }
          }
          // Also just keep the price lock
          let prices_: any = [];
          if (iv.prices) {
            iv.prices.forEach((priceObj: any) => {
              prices_.push({
                ...priceObj,
                price: newPrice,
              });
            });
            if (priceUpdate) {
              return existing ? { ...iv, enabled: false, prices: prices_ } : iv;
            } else {
              return existing
                ? { ...iv, enabled: (existing as any).enabled, prices: prices_ }
                : iv;
            }
          } else {
            if (priceUpdate) {
              return existing ? { ...iv, enabled: false } : iv;
            } else {
              return existing
                ? { ...iv, enabled: (existing as any).enabled }
                : iv;
            }
          }
        }),
      );
      return this.productVariantService.update(ctx, lockedInputs);
    }
  }
}
