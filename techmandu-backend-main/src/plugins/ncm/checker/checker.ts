import { Injector, LanguageCode, ShippingEligibilityChecker } from "@vendure/core";
import { NcmService } from "../service/ncm.service";
import { computeNearestBranch } from "../util/branch-match.util";
import { geocodeAddress } from "../util/geocode.util";
import { haversineDistance } from "../util/distance-compute.util";
import { isValleyAddress, parseAreaList } from "../util/shipping-price.util";
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
    // Keep the option eligible without NCM credentials; the calculator will use
    // the configured regional fallback rate when the live quote is unavailable.
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
  args: {
    extraAreas: {
      type: "string",
      defaultValue: "",
      label: [{ languageCode: LanguageCode.en, value: "Extra Valley areas" }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: "Comma separated area names to treat as inside the Valley, for example: Sunakothi, Dhapasi",
        },
      ],
    },
  },

  check: async (ctx, order, args) => {
    if (order.customFields?.outOfValley) return false;

    const address = order.shippingAddress;
    // No address yet: stay available so the method is listed before the address is entered.
    if (!address || !address.countryCode) return true;
    if (String(address.countryCode).toUpperCase() !== "NP") return false;

    return isValleyAddress(address, parseAreaList(args.extraAreas));
  },
});
