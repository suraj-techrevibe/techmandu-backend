import {
  LanguageCode,
  PluginCommonModule,
  Type,
  VendurePlugin,
} from "@vendure/core";
import { CustomProductFields } from "@vendure/core/dist/entity/custom-entity-fields";

import { PRODUCT_EXTENSIONS_PLUGIN_OPTIONS } from "./constants";
import { PluginInitOptions } from "./types";
import { ShopResolver } from "./api/resolvers/product-highest.resolver";
import { shopApiExtensions } from "./api/schemas/shop.schema";
import { AdminProductResolver } from "./api/resolvers/admin-product-override.resolver";
import { ProductSellerService } from "./services/product-seller.service";
import { ProductReview } from "../reviews/entities/product-review.entity";

declare module "@vendure/core/dist/entity/custom-entity-fields" {
  interface CustomProductFields {
    additionalInfo?: string;
    reviewRating?: string;
    reviewCount?: string;
    featuredReview?: ProductReview;
  }

  interface CustomVariantFields {
    nprPrice: number;
    usdPrice: number;
    audPrice: number;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  shopApiExtensions: {
    resolvers: [ShopResolver],
    schema: shopApiExtensions,
  },
  adminApiExtensions: {
    resolvers: [AdminProductResolver],
  },
  providers: [
    {
      provide: PRODUCT_EXTENSIONS_PLUGIN_OPTIONS,
      useFactory: () => ProductExtensionsPlugin.options,
    },
    ProductSellerService,
  ],
  configuration: (config) => {
    config.customFields.Product.push({
      name: "additionalInfo",
      type: "string",
      nullable: true,
      label: [
        { languageCode: LanguageCode.en, value: "Additional Information" },
      ],
      description: [
        {
          languageCode: LanguageCode.en,
          value: "Additional information about the product",
        },
      ],
      ui: { component: "rich-text-form-input" },
    });
    config.customFields.Product.push({
      name: "additionalDescription",
      type: "string",
      nullable: true,
      label: [
        { languageCode: LanguageCode.en, value: "Additional Description" },
      ],
      description: [
        {
          languageCode: LanguageCode.en,
          value: "Additional Description about the product",
        },
      ],
      ui: { component: "rich-text-form-input" },
    });
    config.customFields.ProductVariant.push({
      name: "nprPrice",
      type: "float",
      defaultValue: 0,
      label: [{ languageCode: LanguageCode.en, value: "NPR Price (in NRP)" }],
    });
    config.customFields.ProductVariant.push({
      name: "usdPrice",
      type: "float",
      defaultValue: 0,
      label: [{ languageCode: LanguageCode.en, value: "USD Price (in $USD)" }],
    });
    config.customFields.ProductVariant.push({
      name: "audPrice",
      type: "float",
      defaultValue: 0,
      label: [{ languageCode: LanguageCode.en, value: "AUD Price (in $AUD)" }],
    });
    return config;
  },
  compatibility: "^3.0.0",
})
export class ProductExtensionsPlugin {
  static options: PluginInitOptions;

  static init(options: PluginInitOptions): Type<ProductExtensionsPlugin> {
    this.options = options;
    return ProductExtensionsPlugin;
  }
}
