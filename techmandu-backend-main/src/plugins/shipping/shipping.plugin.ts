import { LanguageCode, PluginCommonModule, VendurePlugin } from "@vendure/core";
import { pickupFulfillmentHandler } from "./handler/shipping.handler";
import { PaymentSuccessService } from "./shipping.resolver";

declare module "@vendure/core/dist/entity/custom-entity-fields" {
  interface CustomOrderFields {
    pickupTime: string | null;
  }

  interface CustomFulfillmentFields {
    pickupTime: string | null;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [PaymentSuccessService],
  entities: [],
  configuration: (config) => {
    config.customFields.Order.push({
      name: "pickupTime",
      type: "string",
      label: [{ languageCode: LanguageCode.en, value: "Pickup Time" }],
      nullable: true,
      public: true,
    });
    config.customFields.Fulfillment.push({
      name: "pickupTime",
      type: "string",
      label: [{ languageCode: LanguageCode.en, value: "Pickup Time" }],
      nullable: true,
      public: true,
    });
    config.shippingOptions.fulfillmentHandlers.push(pickupFulfillmentHandler);
    return config;
  },
})
export class ShippingPlugin {}
