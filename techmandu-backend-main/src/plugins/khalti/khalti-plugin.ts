import { LanguageCode, Permission, PluginCommonModule, VendurePlugin } from "@vendure/core";
import { khaltiPaymentHandler } from "./khalti-payment-handler";
import { PaymentController } from "./khalti-callback.controller";

declare module "@vendure/core/dist/entity/custom-entity-fields" {
  interface CustomOrderFields {
    paymentId: string;
  }

  interface CustomChannelFields {
    khaltiSecretKey: string;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: (config) => {
    config.paymentOptions.paymentMethodHandlers.push(khaltiPaymentHandler);
    config.customFields.Order.push({
      name: "paymentId",
      type: "string",
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: "Khalti Payment Id" }],
    });
    
    config.customFields.Channel.push({
      name: "khaltiSecretKey",
      type: "string",
      nullable: true,
      requiresPermission:Permission.SuperAdmin,
      label: [{ languageCode: LanguageCode.en, value: "Khalti Secret Key" }],
    });

    return config;
  },
  controllers: [PaymentController],
})
export class KhaltiPaymentPlugin {}
