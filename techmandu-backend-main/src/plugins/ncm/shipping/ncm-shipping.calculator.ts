import { Injector, LanguageCode, ShippingCalculator } from "@vendure/core";
import { NcmService } from "../service/ncm.service";
import {
  INSIDE_VALLEY_SHIPPING_CALCULATOR,
  NCM_SHIPPING_CALCULATOR,
} from "../contstants";

let ncmService: NcmService;
export const NcmShippingCalculator = new ShippingCalculator({
  code: NCM_SHIPPING_CALCULATOR,
  description: [
    { languageCode: LanguageCode.en, value: "NCM Shipping Calculator" },
  ],
  args: {},
  init: (injector: Injector) => {
    ncmService = injector.get(NcmService);
  },
  calculate: async (ctx, order, args) => {
    return ncmService.getDeliveryAmount(ctx, order, "Pickup/Collect");
  },
});

export const insideValleyShippingCalculator = new ShippingCalculator({
  code: INSIDE_VALLEY_SHIPPING_CALCULATOR,
  description: [
    {
      languageCode: LanguageCode.en,
      value: "Inside Valley Shipping Calculator",
    },
  ],
  args: {},
  calculate: (ctx, order, args) => {
    const zone = order.shippingAddress?.streetLine2;
    if (!zone) {
      return {
        price: 0,
        priceIncludesTax: false,
        taxRate: 0,
        metadata: {
          success: false,
          error: "Missing ring road zone",
        },
      };
    }
    if (zone === "outside_ring_road") {
      return {
        price: 100 * 100,
        priceIncludesTax: false,
        taxRate: 0,
        metadata: {
          success: true,
        },
      };
    } else if (zone === "inside_ring_road") {
      return {
        price: 70 * 100,
        priceIncludesTax: false,
        taxRate: 0,
        metadata: {
          success: true,
        },
      };
    } else {
      return {
        price: 0,
        priceIncludesTax: false,
        taxRate: 0,
        metadata: {
          success: false,
        },
      };
    }
  },
});
