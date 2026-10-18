import {
  PluginCommonModule,
  VendurePlugin,
  LanguageCode,
  Type,
} from "@vendure/core";
import { AdminUiExtension } from "@vendure/ui-devkit/compiler";
import path from "path";
import { SellerRegistration } from "./entities/seller-registration.entity";
import { SellerRegistrationService } from "./services/seller-registration.service";
import { SellerChannelService } from "./services/seller-channel.service";
import { SellerRegistrationShopController } from "./api/shop/seller-registration-shop.controller";
import { adminApiExtensions } from "./api/admin/admin-api-extensions";
import { SellerRegistrationAdminResolver } from "./api/admin/seller-registration-admin.resolver";
import { shopApiExtensions } from "./api/shop/shop-api-extensions";
import { SellerRegistrationShopResolver } from "./api/shop/seller-registration-shop.resolver";
import { SELLER_REGISTRATION_PLUGIN_OPTIONS } from "./constants";
import { PluginInitOptions } from "./types";

declare module "@vendure/core/dist/entity/custom-entity-fields" {
  interface CustomChannelFields {
    vendorBusinessName?: string;
    vendorName?: string;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [SellerRegistration],
  providers: [
    {
      provide: SELLER_REGISTRATION_PLUGIN_OPTIONS,
      useFactory: () => SellerRegistrationPlugin.options,
    },
    SellerRegistrationService,
    SellerChannelService,
  ],
  controllers: [SellerRegistrationShopController],
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [SellerRegistrationAdminResolver],
  },
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [SellerRegistrationShopResolver],
  },
  configuration: (config) => {
    config.customFields.Channel.push(
      {
        name: "vendorBusinessName",
        type: "string",
        public: true,
        label: [
          { languageCode: LanguageCode.en, value: "Vendor Business Name" },
        ],
        description: [
          {
            languageCode: LanguageCode.en,
            value: "Name of the vendor business",
          },
        ],
      },
      {
        name: "vendorName",
        type: "string",
        public: true,
        label: [{ languageCode: LanguageCode.en, value: "Vendor Name" }],
        description: [
          { languageCode: LanguageCode.en, value: "Name of the vendor" },
        ],
      },
    );
    return config;
  },
})
export class SellerRegistrationPlugin {
  static options: PluginInitOptions;
  static init(options: PluginInitOptions): Type<SellerRegistrationPlugin> {
    this.options = options;
    return SellerRegistrationPlugin;
  }

  static ui: AdminUiExtension = {
    id: "seller-registration-ui",
    extensionPath: path.join(__dirname, "ui"),
    routes: [{ route: "vendor-registrations", filePath: "routes.ts" }],
    providers: ["providers.ts"],
  };
}
