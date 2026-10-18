import { FulfillmentHandler, LanguageCode } from "@vendure/core";

export const pickupFulfillmentHandler = new FulfillmentHandler({
  code: "pickup-fulfillment",
  description: [{ languageCode: LanguageCode.en, value: "Pickup Fulfillment" }],
  args: {},
  createFulfillment: async (ctx, orders, lines, args) => {
    const order = orders[0];
    let pickupTime = order.customFields.pickupTime;
    return {
      method: "Pickup",
      trackingCode: "",
      customFields: {
        pickupTime,
      },
    };
  },
});
