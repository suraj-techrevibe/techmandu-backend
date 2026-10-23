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
import { nprToMinorUnits, NprRates, parseRingRoadZone } from "../util/shipping-price.util";

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
  args: {},
  init: (injector: Injector) => {
    ncmService = injector.get(NcmService);
    settingsService = injector.get(GlobalSettingsService);
  },
  calculate: async (ctx, order) => {
    try {
      // NCM always quotes in NPR. The service returns NPR paisa and caches the NPR quote,
      // so it stays correct if the buyer switches the order to USD or AUD.
      const quote = await ncmService.getDeliveryAmount(ctx, order, "Pickup/Collect");
      if (quote.metadata?.failed) {
        // Returning nothing hides the method. Returning 0 would show free delivery.
        Logger.warn(
          `NCM hidden for order ${order.code}: ${quote.metadata.error}`,
          LOGGER_CONTEXT
        );
        return undefined;
      }
      const price = nprToMinorUnits(quote.price / 100, order.currencyCode, await loadRates(ctx));
      if (price === undefined) {
        Logger.error(
          `NCM hidden for order ${order.code}: no exchange rate for ${order.currencyCode}`,
          LOGGER_CONTEXT
        );
        return undefined;
      }
      return result(price, { ...quote.metadata, nprCharge: quote.price / 100 });
    } catch (error) {
      // An error here would otherwise break the whole shipping list, hiding Inside Valley and pickup too.
      Logger.error(
        `NCM quote failed for order ${order.code}: ${error instanceof Error ? error.message : String(error)}`,
        LOGGER_CONTEXT
      );
      return undefined;
    }
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
