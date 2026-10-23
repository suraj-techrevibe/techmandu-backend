import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { parse } from "csv-parse/sync";
import { IsNull } from "typeorm";
import { CurrencyCode, LanguageCode, Permission } from "@vendure/common/lib/generated-types";
import { DEFAULT_CHANNEL_CODE } from "@vendure/common/lib/shared-constants";
import {
  AdministratorService,
  ChannelService,
  isGraphQlErrorResult,
  ID,
  Product,
  ProductService,
  RequestContext,
  ProductVariant,
  RoleService,
  SellerService,
  TransactionalConnection,
  ProductVariantService,
} from "@vendure/core";
import { keywordFor, mapLimit } from "./images";
import { between, log, pick, rng, SeedContext, slugify } from "./context";
import { ImageProvider } from "./images";
import {
  CATEGORY_COPY,
  CategoryCopy,
  EXTRA_PRODUCTS,
  DEFAULT_COPY,
  LOYALTY_TIERS,
  PLACES,
  RATES,
  SEED_PASSWORD,
  VENDOR_PROFILES,
  VendorProfile,
  FIRST_NAMES,
  LAST_NAMES,
} from "./data";

export const CSV_PATH = path.join(__dirname, "../final.csv");
const SEEDED_CSV_PATH = path.join(os.tmpdir(), "techmandu-products.seeded.csv");

export interface CatalogRow {
  name: string;
  slug: string;
  sku: string;
  /** Price in major units (NPR) */
  price: number;
  stock: number;
  categories: string[];
  brand: string;
  vendor: string;
  specs: Array<{ key: string; value: string }>;
  copy: CategoryCopy;
  /** Original CSV record (used to write the importer CSV) */
  raw: Record<string, string>;
  featured: boolean;
  businessExclusive: boolean;
  description: string;
}

// ---------------------------------------------------------------------------------------------
// CSV → rows
// ---------------------------------------------------------------------------------------------
function parseSpecs(raw: string | undefined): Array<{ key: string; value: string }> {
  if (!raw) return [];
  const cleaned = raw.trim().replace(/^"+|"+$/g, "").replace(/""/g, '"');
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed)
      ? parsed.filter((s) => s && s.key).map((s) => ({ key: String(s.key), value: String(s.value ?? "") }))
      : [];
  } catch {
    return [];
  }
}

const PRICE_RANGES: Array<[RegExp, number, number]> = [
  [/smart ?watch/i, 3999, 14999],
  [/fitness/i, 2499, 12999],
  [/earbud|airpod/i, 1499, 7999],
  [/power ?bank/i, 1799, 5999],
  [/cable|power|charger/i, 399, 2499],
  [/audio|visual/i, 999, 9999],
];

function demoPrice(categories: string, rand: () => number): number {
  const [, lo, hi] = PRICE_RANGES.find(([re]) => re.test(categories)) ?? [null, 999, 9999];
  return Math.round((lo + rand() * (hi - lo)) / 100) * 100 - 1;
}

function stockFor(rand: () => number): number {
  const roll = rand();
  if (roll < 0.06) return 0; // out of stock
  if (roll < 0.18) return between(rand, 1, 5); // low stock → exercises the low-stock alert
  return between(rand, 10, 80);
}

function descriptionFor(row: Omit<CatalogRow, "description" | "raw">): string {
  const bullets = row.specs.slice(0, 4).map((s) => `<li><strong>${s.key}:</strong> ${s.value}</li>`);
  const highlights = row.copy.highlights.map((h) => `<li>${h}</li>`);
  return [
    `<p><strong>${row.name}</strong> by ${row.brand || "a trusted brand"} is ${row.copy.tagline}.</p>`,
    `<ul>${highlights.join("")}</ul>`,
    bullets.length ? `<p><strong>Key specifications</strong></p><ul>${bullets.join("")}</ul>` : "",
    `<p>Sold by <strong>${row.vendor || "Techmandu"}</strong>. ${row.copy.warranty} and a ${row.copy.returnDays}-day return window. Nationwide delivery with VAT invoice.</p>`,
  ].join("");
}

/** Deterministic: the same input CSV always produces the same rows (prices, stock, flags). */
export function loadCatalogRows(keepPrices: boolean): CatalogRow[] {
  const records: Record<string, string>[] = parse(fs.readFileSync(CSV_PATH), {
    columns: true,
    skip_empty_lines: true,
  });
  const extras: Record<string, string>[] = EXTRA_PRODUCTS.map((e, i) => ({
    name: e.name,
    slug: "",
    description: "",
    "variant:specification": JSON.stringify(e.specs.map(([key, value]) => ({ key, value }))),
    assets: "",
    facets: [...["Technology", ...e.cats].map((c) => `category:${c}`), `brand:${e.brand}`].join("|"),
    optionGroups: "",
    optionValues: "",
    sku: `TM-X${String(i + 1).padStart(3, "0")}`,
    price: String(e.price),
    taxCategory: "standard",
    stockOnHand: "",
    trackInventory: "TRUE",
    variantAssets: "",
    variantFacets: "",
    "Vendor/Supplier": e.vendor,
  }));
  const usedSlugs = new Set<string>();

  return [...records, ...extras].map((raw, i) => {
    const rand = rng(`row-${raw.sku}-${i}`);
    const facets = (raw.facets ?? "").split("|").map((f) => f.trim());
    const categories = facets.filter((f) => f.startsWith("category:")).map((f) => f.slice(9));
    const brand = facets.find((f) => f.startsWith("brand:"))?.slice(6) ?? "";
    const catText = [...categories].reverse().join(" ");

    let slug = raw.slug?.trim() || slugify(raw.name);
    if (usedSlugs.has(slug)) {
      let n = 2;
      while (usedSlugs.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }
    usedSlugs.add(slug);

    const csvPrice = Number(raw.price);
    const isPlaceholder = csvPrice === 9999;
    const price = isPlaceholder && !keepPrices ? demoPrice(catText, rand) : csvPrice;

    const base = {
      name: raw.name.trim(),
      slug,
      sku: raw.sku.trim(),
      price,
      stock: stockFor(rand),
      categories,
      brand,
      vendor: (raw["Vendor/Supplier"] ?? "").trim(),
      specs: parseSpecs(raw["variant:specification"]),
      copy: CATEGORY_COPY.find((c) => c.match.test(catText)) ?? DEFAULT_COPY,
      featured: rand() < 0.17,
      businessExclusive: rand() < 0.08,
    };
    return { ...base, raw, description: descriptionFor(base) };
  });
}

// ---------------------------------------------------------------------------------------------
// Step: currency (must run BEFORE the CSV import so prices are stored in NPR)
// ---------------------------------------------------------------------------------------------
export async function configureCurrency(sc: SeedContext) {
  const channelService = sc.get(ChannelService);
  const channel = await channelService.getDefaultChannel(sc.ctx);
  const result = await channelService.update(sc.ctx, {
    id: channel.id,
    defaultCurrencyCode: CurrencyCode.NPR,
    availableCurrencyCodes: [CurrencyCode.NPR, CurrencyCode.USD, CurrencyCode.AUD],
    defaultLanguageCode: LanguageCode.en,
  });
  if (isGraphQlErrorResult(result)) throw new Error(`Could not set channel currency: ${result.message}`);
  log.ok("Default channel currency set to NPR (USD and AUD enabled as extra currencies)");
}

// ---------------------------------------------------------------------------------------------
// Step: build the CSV that Vendure's importer will read (adds images + descriptions + stock)
// ---------------------------------------------------------------------------------------------
const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function prepareImportCsv(images: ImageProvider, imagesPerProduct: number, rows: CatalogRow[]): Promise<string> {
  const total = rows.length;
  let done = 0;
  const assets = await mapLimit(rows, 6, async (row) => {
    const files = await images.getMany(row.slug, imagesPerProduct, {
      width: 800,
      height: 800,
      keyword: keywordFor(`${row.categories.join(" ")} ${row.name}`),
      label: row.name,
    });
    if (++done % 10 === 0 || done === total) log.info(`images ${done}/${total} products`);
    return files.join("|");
  });

  // `variant:specification` (struct list) and `Vendor/Supplier` are not importer columns – they are
  // applied after the import by finishCatalog().
  const columns = [
    "name", "slug", "description", "assets", "facets", "optionGroups", "optionValues",
    "sku", "price", "taxCategory", "stockOnHand", "trackInventory", "variantAssets", "variantFacets",
  ];
  const lines = [columns.join(",")];
  rows.forEach((row, i) => {
    const values: Record<string, unknown> = {
      ...row.raw,
      slug: row.slug,
      description: row.description,
      assets: assets[i],
      price: row.price,
      stockOnHand: row.stock,
    };
    lines.push(columns.map((c) => q(values[c])).join(","));
  });
  fs.writeFileSync(SEEDED_CSV_PATH, lines.join("\n"), "utf8");
  return SEEDED_CSV_PATH;
}

// ---------------------------------------------------------------------------------------------
// Step: product / variant custom fields after the import
// ---------------------------------------------------------------------------------------------
export function profileFor(vendor: string, index = 0): VendorProfile {
  if (VENDOR_PROFILES[vendor]) return VENDOR_PROFILES[vendor];
  const rand = rng(`vendor-${vendor}`);
  return {
    ownerName: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
    phone: `98010${String(1000 + index).slice(-4)}0`.slice(0, 10),
    place: between(rand, 0, 2),
    pan: String(300000000 + between(rand, 100000, 999999)),
  };
}

export async function finishCatalog(sc: SeedContext, rows: CatalogRow[]) {
  const { ctx } = sc;
  const connection = sc.get(TransactionalConnection);
  const variantService = sc.get(ProductVariantService);
  const variantRepo = connection.getRepository(ctx, ProductVariant);
  const productRepo = connection.getRepository(ctx, Product);

  let updated = 0;
  for (const row of rows) {
    const variant = await variantRepo.findOne({
      where: { sku: row.sku, deletedAt: IsNull() },
      relations: ["product"],
    });
    if (!variant) {
      log.warn(`Variant not found for SKU ${row.sku} (${row.name}) – skipped`);
      continue;
    }
    const profile = profileFor(row.vendor);

    await variantService.update(ctx, [
      {
        id: variant.id,
        customFields: sc.fields("ProductVariant", {
          specification: row.specs.map((s, i) => ({ key: s.key, value: s.value, isPinned: i < 3 })),
          return: `<p>Returnable within ${row.copy.returnDays} days of delivery if unused and in the original packaging. ${row.copy.warranty} provided by the seller.</p>`,
          stockWarningThreshold: 5,
          variantSerialCode: [`TM-${row.sku}`],
        }),
      },
    ]);

    await productRepo.update(variant.product.id, {
      customFields: sc.fields("Product", {
        vendorBusinessName: row.vendor || null,
        vendorName: row.vendor ? profile.ownerName : null,
        weight: row.copy.weightKg,
        height: row.copy.dims[0],
        length: row.copy.dims[1],
        width: row.copy.dims[2],
        additionalInfo: `${row.copy.warranty} • ${row.copy.returnDays}-day return`,
        additionalDescription: `<p>Packed with care and dispatched within 24 hours. Includes warranty card and VAT invoice.</p>`,
        isFeatured: row.featured,
        isBusinessExclusive: row.businessExclusive,
      }),
    } as any);
    updated++;
  }
  log.ok(`Custom fields set on ${updated}/${rows.length} products (specs, vendor, dimensions, featured flags)`);
}

// ---------------------------------------------------------------------------------------------
// Step: pricing – NPR / USD / AUD price rows + discounts, in the default channel and in vendor channels
// ---------------------------------------------------------------------------------------------
interface PricePlan {
  npr: number;
  usd: number;
  aud: number;
  pct: number;
  fixedRatio: number;
}

/** Deterministic per product: same CSV → same prices and the same discounts on every run. */
function planPrices(row: CatalogRow): PricePlan {
  const rand = rng(`discount-${row.sku}`);
  const roll = rand();
  return {
    npr: Math.round(row.price * 100),
    usd: Math.max(1, Math.round(row.price / RATES.usd)) * 100 - 1,
    aud: Math.max(1, Math.round(row.price / RATES.aud)) * 100 - 1,
    // ~22% of products get a % discount, ~8% a fixed discount (never both)
    pct: roll < 0.22 ? pick(rand, [5, 10, 15, 20]) : 0,
    fixedRatio: roll >= 0.22 && roll < 0.3 ? pick(rand, [0.05, 0.08, 0.1, 0.12]) : 0,
  };
}

/** Writes the three currency prices (and discount fields) of one variant for the channel `ctx` belongs to. */
async function writePrices(sc: SeedContext, ctx: RequestContext, variantId: ID, plan: PricePlan, withVariantFields: boolean) {
  const rows: Array<[CurrencyCode, number, number]> = [
    [CurrencyCode.NPR, plan.npr, 100],
    [CurrencyCode.USD, plan.usd, 1],
    [CurrencyCode.AUD, plan.aud, 1],
  ];
  await sc.get(ProductVariantService).update(ctx, [
    {
      id: variantId,
      prices: rows.map(([currencyCode, price]) => ({ currencyCode, price })),
      ...(withVariantFields
        ? { customFields: sc.fields("ProductVariant", { nprPrice: plan.npr / 100, usdPrice: plan.usd / 100, audPrice: plan.aud / 100 }) }
        : {}),
    } as any,
  ]);

  // ProductVariantService only persists price custom fields for the channel's default currency, so the
  // discount fields are written for every currency row directly.
  if (sc.hasField("ProductVariantPrice", "discountPrice")) {
    const db = sc.get(TransactionalConnection).rawConnection;
    for (const [currencyCode, minor, roundTo] of rows) {
      await db.query(
        `UPDATE "product_variant_price" SET "customFieldsDiscountpercentage" = $1, "customFieldsDiscountprice" = $2
         WHERE "variantId" = $3 AND "channelId" = $4 AND "currencyCode" = $5`,
        [plan.pct, plan.fixedRatio ? Math.round((minor * plan.fixedRatio) / roundTo) * roundTo : 0, variantId, ctx.channelId, currencyCode],
      );
    }
  }
}

export async function applyPricing(sc: SeedContext, rows: CatalogRow[]) {
  const { ctx } = sc;
  const variantRepo = sc.get(TransactionalConnection).getRepository(ctx, ProductVariant);
  let discounted = 0;
  for (const row of rows) {
    const variant = await variantRepo.findOne({ where: { sku: row.sku, deletedAt: IsNull() } });
    if (!variant) continue;
    const plan = planPrices(row);
    if (plan.pct || plan.fixedRatio) discounted++;
    await writePrices(sc, ctx, variant.id, plan, true);
  }
  log.ok(`Prices set in NPR/USD/AUD for ${rows.length} variants (${discounted} with a discount)`);
}

// ---------------------------------------------------------------------------------------------
// Step: vendors – Seller + Channel + vendor admin login + product assignment
// ---------------------------------------------------------------------------------------------
export async function seedVendors(sc: SeedContext, rows: CatalogRow[]) {
  let ctx = sc.ctx;
  const channelService = sc.get(ChannelService);
  const sellerService = sc.get(SellerService);
  const roleService = sc.get(RoleService);
  const adminService = sc.get(AdministratorService);
  const productService = sc.get(ProductService);
  const connection = sc.get(TransactionalConnection);
  const variantRepo = connection.getRepository(ctx, ProductVariant);

  // findAll() loads the zone relations (getDefaultChannel() serves a cached copy without them)
  const existingChannels = await channelService.findAll(ctx, { take: 500 });
  const defaultChannel = existingChannels.items.find((c) => c.code === DEFAULT_CHANNEL_CODE)!;
  const existingSellers = await sellerService.findAll(ctx, { take: 500 });
  const vendors = [...new Set(rows.map((r) => r.vendor).filter(Boolean))];

  for (const [index, vendor] of vendors.entries()) {
    const code = slugify(vendor);
    const profile = profileFor(vendor, index);
    const place = PLACES[profile.place];

    let seller = existingSellers.items.find((s) => s.name === vendor);
    if (!seller) seller = await sellerService.create(ctx, { name: vendor });

    let channel = existingChannels.items.find((c) => c.code === code);
    if (!channel) {
      const result = await channelService.create(ctx, {
        code,
        token: randomUUID(),
        sellerId: seller.id,
        defaultLanguageCode: LanguageCode.en,
        availableLanguageCodes: [LanguageCode.en],
        pricesIncludeTax: false,
        defaultCurrencyCode: CurrencyCode.NPR,
        availableCurrencyCodes: [CurrencyCode.NPR, CurrencyCode.USD, CurrencyCode.AUD],
        defaultTaxZoneId: defaultChannel.defaultTaxZone.id,
        defaultShippingZoneId: defaultChannel.defaultShippingZone.id,
        customFields: sc.fields("Channel", {
          vendorBusinessName: vendor,
          vendorName: profile.ownerName,
          pickupLocation: `${pick(rng(code), place.streets)}, ${place.city}`,
          signupBonus: 50,
          // Required: the loyalty plugin calls orderBonus.sort() when an order settles in this channel
          orderBonus: LOYALTY_TIERS,
          loyaltyCodeName: "Tech Coins",
          loyaltyCurrencyCode: "NPR",
          loyaltyCurrencyRate: 0.5,
        }),
      } as any);
      if (isGraphQlErrorResult(result)) throw new Error(`Channel "${code}": ${(result as any).message}`);
      channel = result as any;

      // Same as Vendure's createChannel resolver: without this the superadmin cannot see the channel and
      // customers cannot register / check out in it.
      const superAdminRole = await roleService.getSuperAdminRole(ctx);
      const customerRole = await roleService.getCustomerRole(ctx);
      await roleService.assignRoleToChannel(ctx, superAdminRole.id, channel!.id);
      await roleService.assignRoleToChannel(ctx, customerRole.id, channel!.id);
    }

    // The superadmin's channel permissions are captured when the RequestContext is created, so a context
    // made before this channel existed is not allowed to create roles inside it.
    ctx = await sc.refresh();

    // Vendor staff login that only sees its own channel
    const roleCode = `vendor-${code}`;
    const roles = await roleService.findAll(ctx, { take: 500 });
    let role = roles.items.find((r) => r.code === roleCode);
    if (!role) {
      role = await roleService.create(ctx, {
        code: roleCode,
        description: `${vendor} staff`,
        channelIds: [channel!.id],
        permissions: [
          Permission.CreateCatalog, Permission.ReadCatalog, Permission.UpdateCatalog, Permission.DeleteCatalog,
          Permission.CreateAsset, Permission.ReadAsset, Permission.UpdateAsset, Permission.DeleteAsset,
          Permission.ReadOrder, Permission.UpdateOrder, Permission.ReadCustomer,
        ],
      });
    }
    const email = `vendor.${code}@techmandu.example.com`;
    const admins = await adminService.findAll(ctx, { take: 500 });
    if (!admins.items.some((a) => a.emailAddress === email)) {
      await adminService.create(ctx, {
        emailAddress: email,
        firstName: profile.ownerName.split(" ")[0],
        lastName: profile.ownerName.split(" ").slice(1).join(" ") || "Vendor",
        password: SEED_PASSWORD,
        roleIds: [role.id],
      });
    }

    // Assign this vendor's products to its channel (they stay visible in the main marketplace channel too)
    const productIds = new Set<string | number>();
    for (const row of rows.filter((r) => r.vendor === vendor)) {
      const variant = await variantRepo.findOne({
        where: { sku: row.sku, deletedAt: IsNull() },
        relations: ["product"],
      });
      if (variant) productIds.add(variant.product.id);
    }
    if (productIds.size) {
      await productService.assignProductsToChannel(ctx, {
        productIds: [...productIds],
        channelId: channel!.id,
        priceFactor: 1,
      });
      // Assignment only copies the default-currency price, so add USD/AUD + discounts inside the vendor channel
      const vendorCtx = await sc.contextFor(channel!.token);
      for (const row of rows.filter((r) => r.vendor === vendor)) {
        const variant = await variantRepo.findOne({ where: { sku: row.sku, deletedAt: IsNull() } });
        if (variant) await writePrices(sc, vendorCtx, variant.id, planPrices(row), false);
      }
    }
    log.ok(`Vendor "${vendor}": channel "${code}", ${productIds.size} products, login ${email}`);
  }
}
