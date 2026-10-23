import fs from "fs";
import { CurrencyCode, LanguageCode } from "@vendure/common/lib/generated-types";
import {
  AdministratorService,
  Asset,
  AssetService,
  ChannelService,
  GlobalSettingsService,
  isGraphQlErrorResult,
  PaymentMethodService,
  PromotionService,
  RoleService,
  ShippingMethodService,
} from "@vendure/core";
import { log, SeedContext } from "./context";
import { ADMINS, LOYALTY_TIERS, RATES, SEED_PASSWORD, SERVER_URL_FALLBACK, SOCIAL_LINKS } from "./data";

/** Imports a local image file as a Vendure Asset (stored through the configured AssetServerPlugin). */
export async function createAssetFromFile(sc: SeedContext, filePath: string): Promise<Asset> {
  const result = await sc.get(AssetService).createFromFileStream(fs.createReadStream(filePath), filePath, sc.ctx);
  if (isGraphQlErrorResult(result)) throw new Error(`Asset import failed for ${filePath}: ${(result as any).message}`);
  return result as Asset;
}

export function assetUrl(asset: Asset): string {
  const base = (process.env.SERVER_URL || SERVER_URL_FALLBACK).replace(/\/$/, "");
  return `${base}/assets/${asset.source}`;
}

const t = (name: string, description = "") => [{ languageCode: LanguageCode.en, name, description }];

export async function seedStore(sc: SeedContext) {
  const { ctx } = sc;

  // ---- Global settings + demo QR image for the manual QR payment method -------------------------
  const qrAsset = await createAssetFromFile(sc, sc.prepared.qrPath);
  const settings = await sc.get(GlobalSettingsService).updateSettings(ctx, {
    customFields: sc.fields("GlobalSettings", {
      thresholdWarningEmail: "inventory@techmandu.example.com",
      productNotificationEmail: "admin@techmandu.example.com",
      businessAccountExtraDiscount: 5,
      nprEquivalentToUsd: RATES.usd,
      nprEquvalentToAud: RATES.aud,
      amountToLoyaltyPoints: 100,
      manualPaymentQrImageId: qrAsset.id,
    }),
  } as any);
  if (isGraphQlErrorResult(settings)) throw new Error(`Global settings: ${(settings as any).message}`);
  log.ok("Global settings: exchange rates, B2B extra discount (5%), notification emails, demo payment QR");

  // ---- Default channel: loyalty + contact info ---------------------------------------------------
  const channelService = sc.get(ChannelService);
  const channel = await channelService.getDefaultChannel(ctx);
  await channelService.update(ctx, {
    id: channel.id,
    customFields: sc.fields("Channel", {
      signupBonus: 50,
      orderBonus: LOYALTY_TIERS,
      loyaltyCodeName: "Tech Coins",
      loyaltyCurrencyCode: "NPR",
      loyaltyCurrencyRate: 0.5, // 10 coins = NPR 5 – matches the redemption formula in TechCoinService
      pickupLocation: "Techmandu Experience Center, New Baneshwor, Kathmandu",
      socialLinks: SOCIAL_LINKS,
    }),
  } as any);
  log.ok("Default channel: Tech Coins (50 signup bonus, 3 earning tiers), pickup location, social links");

  // ---- Payment methods ---------------------------------------------------------------------------
  const paymentService = sc.get(PaymentMethodService);
  const existingPayments = (await paymentService.findAll(ctx, { take: 100 })).items.map((p) => p.code);
  const paymentMethods = [
    {
      code: "cash-on-delivery",
      enabled: true,
      // Uses the built-in dev handler with manual settling: payment is "Authorized" and an admin settles it on delivery.
      handler: { code: "dummy-payment-handler", arguments: [{ name: "automaticSettle", value: "false" }] },
      translations: t("Cash on Delivery", "Pay in cash when your order arrives (Kathmandu Valley)."),
    },
    {
      code: "qr-payment",
      enabled: true,
      handler: { code: "qr-payment-method", arguments: [] },
      translations: t("Pay by QR", "Scan the QR code with any wallet / mobile banking app and upload the payment screenshot."),
    },
    {
      code: "khalti",
      enabled: false, // needs a real Khalti secret key – edit it in Admin → Settings → Payment methods and enable
      handler: { code: "khalti-payment-method", arguments: [{ name: "secretKey", value: "REPLACE_WITH_KHALTI_SANDBOX_SECRET" }] },
      translations: t("Khalti", "Pay securely with your Khalti wallet."),
    },
    {
      code: "test-payment",
      enabled: true,
      handler: { code: "dummy-payment-handler", arguments: [{ name: "automaticSettle", value: "true" }] },
      translations: t("Test payment (dev only)", "Instantly settles the payment – for development and QA only."),
    },
  ];
  for (const method of paymentMethods) {
    if (existingPayments.includes(method.code)) continue;
    await paymentService.create(ctx, method as any);
  }
  log.ok(`Payment methods: ${paymentMethods.map((m) => m.code).join(", ")} (khalti is created disabled)`);

  // ---- Shipping methods --------------------------------------------------------------------------
  const shippingService = sc.get(ShippingMethodService);
  const existingShipping = (await shippingService.findAll(ctx, { take: 100 })).items.map((s) => s.code);
  const flatCalculator = (rateMinor: number) => ({
    code: "default-shipping-calculator",
    arguments: [
      { name: "rate", value: String(rateMinor) },
      { name: "includesTax", value: "auto" },
      { name: "taxRate", value: "0" },
    ],
  });
  const anyOrder = { code: "default-shipping-eligibility-checker", arguments: [{ name: "orderMinimum", value: "0" }] };
  const shippingMethods = [
    {
      code: "inside-valley-delivery",
      fulfillmentHandler: "manual-fulfillment",
      checker: { code: "inside-valley-checker", arguments: [] },
      calculator: { code: "inside-valley-shipping-calculator", arguments: [] },
      translations: t("Inside Valley Delivery", "Delivery within Kathmandu Valley in 1–2 working days."),
    },
    {
      code: "ncm-delivery",
      fulfillmentHandler: "ncm-fullfillment-handler",
      checker: { code: "ncm-checker", arguments: [] },
      calculator: { code: "ncm-shipping-calculator", arguments: [] },
      translations: t("NCM Delivery", "Nationwide delivery through Nepal Can Move in 3–5 working days."),
    },
    {
      code: "store-pickup",
      fulfillmentHandler: "pickup-fulfillment",
      checker: anyOrder,
      calculator: flatCalculator(0),
      translations: t("Store Pickup", "Collect your order from our experience center."),
    },
    {
      code: "flat-rate",
      fulfillmentHandler: "manual-fulfillment",
      checker: anyOrder,
      calculator: flatCalculator(25000),
      translations: t("Flat rate shipping (dev)", "Fixed NPR 250 – works without calling the NCM API."),
    },
  ];
  for (const method of shippingMethods) {
    if (existingShipping.includes(method.code)) continue;
    await shippingService.create(ctx, method as any);
  }
  log.ok(`Shipping methods: ${shippingMethods.map((m) => m.code).join(", ")}`);

  // ---- Staff logins (roles come from initial.ts) -------------------------------------------------
  const roleService = sc.get(RoleService);
  const adminService = sc.get(AdministratorService);
  const roles = (await roleService.findAll(ctx, { take: 200 })).items;
  const existingAdmins = (await adminService.findAll(ctx, { take: 500 })).items.map((a) => a.emailAddress);
  for (const admin of ADMINS) {
    const role = roles.find((r) => r.code === admin.role);
    if (!role || existingAdmins.includes(admin.email)) continue;
    await adminService.create(ctx, {
      emailAddress: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      password: SEED_PASSWORD,
      roleIds: [role.id],
    });
  }
  log.ok(`Staff logins: ${ADMINS.map((a) => a.email).join(", ")}`);

  // ---- Promotions --------------------------------------------------------------------------------
  const promotionService = sc.get(PromotionService);
  const existingPromos = (await promotionService.findAll(ctx, { take: 100 })).items.map((p) => p.couponCode);
  const promos = [
    {
      couponCode: "WELCOME10",
      name: "Welcome offer – 10% off orders over NPR 5,000",
      conditions: [{ code: "minimum_order_amount", arguments: [{ name: "amount", value: "500000" }, { name: "taxInclusive", value: "true" }] }],
      actions: [{ code: "order_percentage_discount", arguments: [{ name: "discount", value: "10" }] }],
    },
    {
      couponCode: "FREESHIP",
      name: "Free shipping on orders over NPR 20,000",
      conditions: [{ code: "minimum_order_amount", arguments: [{ name: "amount", value: "2000000" }, { name: "taxInclusive", value: "true" }] }],
      actions: [{ code: "free_shipping", arguments: [] }],
    },
    {
      couponCode: "DASHAIN15",
      name: "Dashain special – 15% off orders over NPR 50,000",
      conditions: [{ code: "minimum_order_amount", arguments: [{ name: "amount", value: "5000000" }, { name: "taxInclusive", value: "true" }] }],
      actions: [{ code: "order_percentage_discount", arguments: [{ name: "discount", value: "15" }] }],
    },
  ];
  for (const promo of promos) {
    if (existingPromos.includes(promo.couponCode)) continue;
    const result = await promotionService.createPromotion(ctx, {
      enabled: true,
      couponCode: promo.couponCode,
      conditions: promo.conditions,
      actions: promo.actions,
      translations: [{ languageCode: LanguageCode.en, name: promo.name, description: "" }],
    });
    if (isGraphQlErrorResult(result)) log.warn(`Promotion ${promo.couponCode}: ${(result as any).message}`);
  }
  log.ok(`Promotions (coupon codes): ${promos.map((p) => p.couponCode).join(", ")}`);
  void CurrencyCode;
}
