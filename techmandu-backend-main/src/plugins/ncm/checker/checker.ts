import { Injector, LanguageCode, ShippingEligibilityChecker } from "@vendure/core";
import { NcmService } from "../service/ncm.service";
import { computeNearestBranch } from "../util/branch-match.util";
import { geocodeAddress } from "../util/geocode.util";
import { haversineDistance } from "../util/distance-compute.util";
let ncmService: NcmService | undefined;

export const ncmChecker = new ShippingEligibilityChecker({
  code: "ncm-checker",
  description: [
    { languageCode: LanguageCode.en, value: "Nepal Can Move shipping" },
  ],
  args: {},
  init: (injector: Injector) => {
    ncmService = injector.get(NcmService);
  },
  check: async (ctx, order, args) => {
    const shippingAddress = order.shippingAddress;

    if (!ncmService) {
      return false;
    }
    if (!(await ncmService.hasActiveChannelConfig(ctx))) {
      return false;
    }

    if (!shippingAddress || !shippingAddress.countryCode) {
      return true;
    }

    const countryCode =
      typeof shippingAddress.countryCode === "string"
        ? shippingAddress.countryCode.toUpperCase()
        : "";
    if (countryCode !== "NP") {
      return false;
    }

    const streetLine1 =
      typeof shippingAddress.streetLine1 === "string"
        ? shippingAddress.streetLine1.trim()
        : "";
    const city =
      typeof shippingAddress.city === "string"
        ? shippingAddress.city.trim()
        : "";
    if (!streetLine1 || !city) {
      return false;
    }

    // Loose: skip geocoding/nearest-branch check
    return true;
  },
});

export const insideValleyChecker = new ShippingEligibilityChecker({
  code: "inside-valley-checker",
  description: [
    { languageCode: LanguageCode.en, value: "Inside Valley value" },
  ],
  args: {},

  check: async (ctx, order, args) => {
    // Allow when outOfValley is not set or explicitly false
    return !order.customFields?.outOfValley;
  },
});
