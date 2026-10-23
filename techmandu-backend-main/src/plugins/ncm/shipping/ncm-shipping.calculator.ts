import {
  GlobalSettingsService,
  Injector,
  LanguageCode,
  Logger,
  RequestContext,
  ShippingCalculator,
} from "@vendure/core";
import { NcmService } from "../service/ncm.service";
import {
  INSIDE_VALLEY_SHIPPING_CALCULATOR,
  NCM_SHIPPING_CALCULATOR,
} from "../contstants";
import {
  isValleyAddress,
  nprToMinorUnits,
  NprRates,
  parseRingRoadZone,
  resolveNepalProvince,
} from "../util/shipping-price.util";

const LOGGER_CONTEXT = "Shipping";

let ncmService: NcmService;
let settingsService: GlobalSettingsService;

/** NPR-per-USD / NPR-per-AUD, edited by admins in Settings → Global settings. */
async function loadRates(ctx: RequestContext): Promise<NprRates> {
  const settings = await settingsService.getSettings(ctx);
    const fields = (settings.customFields ?? {}) as unknown as Record<string, unknown>;
  return {
    USD: fields.nprEquivalentToUsd as number | undefined,
    AUD: fields.nprEquvalentToAud as number | undefined,
  };
}

const result = (price: number, metadata: Record<string, unknown> = {}) => ({
  price,
  priceIncludesTax: false,
  taxRate: 0,
  metadata,
});

export const NcmShippingCalculator = new ShippingCalculator({
  code: NCM_SHIPPING_CALCULATOR,
  description: [
    { languageCode: LanguageCode.en, value: "NCM Shipping Calculator" },
  ],
  args: {
    koshiNpr: { type: "int", defaultValue: 0, label: [{ languageCode: LanguageCode.en, value: "Koshi fallback fee (NPR)" }], ui: { component: "number-form-input", suffix: "NPR" } },
    madheshNpr: { type: "int", defaultValue: 0, label: [{ languageCode: LanguageCode.en, value: "Madhesh fallback fee (NPR)" }], ui: { component: "number-form-input", suffix: "NPR" } },
    bagmatiNpr: { type: "int", defaultValue: 0, label: [{ languageCode: LanguageCode.en, value: "Bagmati fallback fee (NPR)" }], ui: { component: "number-form-input", suffix: "NPR" } },
    gandakiNpr: { type: "int", defaultValue: 0, label: [{ languageCode: LanguageCode.en, value: "Gandaki fallback fee (NPR)" }], ui: { component: "number-form-input", suffix: "NPR" } },
    lumbiniNpr: { type: "int", defaultValue: 0, label: [{ languageCode: LanguageCode.en, value: "Lumbini fallback fee (NPR)" }], ui: { component: "number-form-input", suffix: "NPR" } },
    karnaliNpr: { type: "int", defaultValue: 0, label: [{ languageCode: LanguageCode.en, value: "Karnali fallback fee (NPR)" }], ui: { component: "number-form-input", suffix: "NPR" } },
    sudurpashchimNpr: { type: "int", defaultValue: 0, label: [{ languageCode: LanguageCode.en, value: "Sudurpashchim fallback fee (NPR)" }], ui: { component: "number-form-input", suffix: "NPR" } },
  },
  init: (injector: Injector) => {
    ncmService = injector.get(NcmService);
    settingsService = injector.get(GlobalSettingsService);
  },
  calculate: async (ctx, order) => {
    try {
      // NCM always quotes in NPR. The service returns NPR paisa and caches the NPR quote,
      // so it stays correct if the buyer switches the order to USD or AUD.
      let quoteError: string | undefined;
    try {
      const quote = await ncmService.getDeliveryAmount(ctx, order, "Pickup/Collect");
      if (quote.metadata?.failed) {
        quoteError = String(quote.metadata.error ?? "NCM could not quote this address");
      } else {
        const price = nprToMinorUnits(quote.price / 100, order.currencyCode, await loadRates(ctx));
        if (price !== undefined) {
          return result(price, { ...quote.metadata, nprCharge: quote.price / 100 });
        }
        quoteError = `no exchange rate for ${order.currencyCode}`;
      }
    } catch (error) {
      quoteError = error instanceof Error ? error.message : String(error);
      Logger.warn(
        `NCM live quote unavailable for order ${order.code}: ${quoteError}`,
        LOGGER_CONTEXT
      );
    }

    // The fallback is deliberately outside the Kathmandu Valley. Inside-Valley delivery
    // has its own calculator and should not inherit an intercity courier fee.
    const address = order.shippingAddress;
    if (
      !address ||
      String(address.countryCode ?? "").toUpperCase() !== "NP" ||
      !String(address.streetLine1 ?? "").trim() ||
      !String(address.city ?? "").trim() ||
      isValleyAddress(address)
    ) {
      Logger.warn(
        `NCM hidden for order ${order.code}: no usable outside-Valley fallback address`,
        LOGGER_CONTEXT
      );
      return undefined;
    }

    const region = resolveNepalProvince(address.province);
    const fallbackRates = {
      koshi: args.koshiNpr,
      madhesh: args.madheshNpr,
      bagmati: args.bagmatiNpr,
      gandaki: args.gandakiNpr,
      lumbini: args.lumbiniNpr,
      karnali: args.karnaliNpr,
      sudurpashchim: args.sudurpashchimNpr,
    };
    const fallbackNpr = region ? fallbackRates[region] : undefined;
    if (typeof fallbackNpr !== "number" || !Number.isFinite(fallbackNpr) || fallbackNpr <= 0) {
      Logger.warn(
        `NCM hidden for order ${order.code}: no positive fallback price configured for region ${region ?? "unknown"}`,
        LOGGER_CONTEXT
      );
      return undefined;
    }

    const fallbackPrice = nprToMinorUnits(fallbackNpr, order.currencyCode, await loadRates(ctx));
    if (fallbackPrice === undefined) {
      Logger.error(
        `NCM hidden for order ${order.code}: no exchange rate for ${order.currencyCode}`,
        LOGGER_CONTEXT
      );
      return undefined;
    }
    Logger.warn(
      `Using regional NCM fallback for order ${order.code}: ${region}, NPR ${fallbackNpr}; live quote unavailable (${quoteError ?? "unknown error"})`,
      LOGGER_CONTEXT
    );
    return result(fallbackPrice, {
      success: true,
      fallback: true,
      source: "regional-fallback",
      region,
      nprCharge: fallbackNpr,
      liveQuoteError: quoteError,
    });
  },
});

export const insideValleyShippingCalculator = new ShippingCalculator({
  code: INSIDE_VALLEY_SHIPPING_CALCULATOR,
  description: [
    { languageCode: LanguageCode.en, value: "Inside Valley Shipping Calculator" },
  ],
  args: {
    insideRingRoadNpr: {
      type: "int",
      defaultValue: 70,
      label: [{ languageCode: LanguageCode.en, value: "Inside Ring Road fee (NPR)" }],
      ui: { component: "number-form-input", suffix: "NPR" },
    },
    outsideRingRoadNpr: {
      type: "int",
      defaultValue: 100,
      label: [{ languageCode: LanguageCode.en, value: "Outside Ring Road fee (NPR)" }],
      ui: { component: "number-form-input", suffix: "NPR" },
    },
    unknownZone: {
      type: "string",
      defaultValue: "outside",
      label: [{ languageCode: LanguageCode.en, value: "Fee when the zone is not stated" }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: "Used when the address does not say inside or outside the Ring Road. Outside is the safer default.",
        },
      ],
      ui: {
        component: "select-form-input",
        options: [
          { value: "outside", label: [{ languageCode: LanguageCode.en, value: "Outside Ring Road fee" }] },
          { value: "inside", label: [{ languageCode: LanguageCode.en, value: "Inside Ring Road fee" }] },
        ],
      },
    },
  },
  init: (injector: Injector) => {
    settingsService = injector.get(GlobalSettingsService);
  },
  calculate: async (ctx, order, args) => {
    const zone =
      parseRingRoadZone(order.shippingAddress) ??
      (args.unknownZone === "inside" ? "inside" : "outside");
    const insideNpr = args.insideRingRoadNpr ?? 70;
    const outsideNpr = args.outsideRingRoadNpr ?? 100;
    const nprFee = zone === "inside" ? insideNpr : outsideNpr;

    const price = nprToMinorUnits(nprFee, order.currencyCode, await loadRates(ctx));
    if (price === undefined) {
      Logger.error(
        `Inside Valley hidden for order ${order.code}: no exchange rate for ${order.currencyCode}`,
        LOGGER_CONTEXT
      );
      return undefined;
    }
    return result(price, {
      success: true,
      zone,
      zoneStated: parseRingRoadZone(order.shippingAddress) !== undefined,
      nprFee,
    });
  },
});
