import {
  LanguageCode,
  Permission,
  PluginCommonModule,
  Type,
  VendurePlugin,
} from "@vendure/core";

import { CELLPAY_PLUGIN_OPTIONS } from "./constants";
import { PluginInitOptions } from "./types";
import { cellpayPaymentHandler } from "./handler/cellpay-payment.handler";
import { PaymentController } from "./controller/payment.controller";
declare module "@vendure/core/dist/entity/custom-entity-fields" {
  interface CustomOrderFields {
    cellpayUniqueToken?: string;
  }

  interface CustomChannelFields {
    cellpayBaseUrl?: string;
    cellpayUsername?: string;
    cellpayPassword?: string;
    cellpayClientId?: string;
    cellpayMemberId?: string;
    cellpayProductCode?: string;
    cellpayPublicKey?: string;
    cellpayPrivateKey?: string;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [
    {
      provide: CELLPAY_PLUGIN_OPTIONS,
      useFactory: () => CellpayPlugin.options,
    },
  ],
  configuration: (config) => {
    /** Register payment handler */
    config.paymentOptions.paymentMethodHandlers.push(cellpayPaymentHandler);

    /** =========================
     *  ORDER CUSTOM FIELDS
     *  ========================= */
    config.customFields.Order.push({
      name: "cellpayUniqueToken",
      type: "string",
      nullable: true,
      label: [
        {
          languageCode: LanguageCode.en,
          value: "CellPay Unique Token",
        },
      ],
    });

    /** =========================
     *  CHANNEL CUSTOM FIELDS
     *  ========================= */

    const adminOnly = Permission.SuperAdmin;

    config.customFields.Channel.push(
      {
        name: "cellpayBaseUrl",
        type: "string",
        nullable: true,
        label: [
          {
            languageCode: LanguageCode.en,
            value: "CellPay Base URL",
          },
        ],
      },
      {
        name: "cellpayUsername",
        type: "string",
        nullable: true,
        requiresPermission: adminOnly,
        label: [
          {
            languageCode: LanguageCode.en,
            value: "CellPay Username",
          },
        ],
      },
      {
        name: "cellpayPassword",
        type: "string",
        nullable: true,
        requiresPermission: adminOnly,
        label: [
          {
            languageCode: LanguageCode.en,
            value: "CellPay Password",
          },
        ],
      },
      {
        name: "cellpayClientId",
        type: "string",
        nullable: true,
        requiresPermission: adminOnly,
        label: [
          {
            languageCode: LanguageCode.en,
            value: "CellPay Client ID",
          },
        ],
      },
      {
        name: "cellpayMemberId",
        type: "string",
        nullable: true,
        requiresPermission: adminOnly,
        label: [
          {
            languageCode: LanguageCode.en,
            value: "CellPay Member ID",
          },
        ],
      },
      {
        name: "cellpayProductCode",
        type: "string",
        nullable: true,
        label: [
          {
            languageCode: LanguageCode.en,
            value: "CellPay Product Code",
          },
        ],
      },
      {
        name: "cellpayPublicKey",
        type: "text",
        nullable: true,
        requiresPermission: adminOnly,
        label: [
          {
            languageCode: LanguageCode.en,
            value: "CellPay Public Key (PEM)",
          },
        ],
      },
      {
        name: "cellpayPrivateKey",
        type: "text",
        nullable: true,
        requiresPermission: adminOnly,
        label: [
          {
            languageCode: LanguageCode.en,
            value: "CellPay Private Key (PEM)",
          },
        ],
      }
    );

    return config;
  },
  controllers: [PaymentController], // add CellPay callback controller here if needed
  compatibility: "^3.0.0",
})
export class CellpayPlugin {
  static options: PluginInitOptions;

  static init(options: PluginInitOptions): Type<CellpayPlugin> {
    this.options = options;
    return CellpayPlugin;
  }
}
