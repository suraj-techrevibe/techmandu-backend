import { PluginCommonModule, Type, VendurePlugin } from "@vendure/core";

import { shopApiExtensions } from "./api/api-extensions";
import { WishlistShopResolver } from "./api/wishlist.resolver";
import { WISHLIST_PLUGIN_OPTIONS } from "./constants";
import { WishlistItem } from "./entities/wishlist-item.entity";
import { WishlistService } from "./services/wishlist.service";
import { PluginInitOptions } from "./types";
import { ProductVariantEntityResolver } from "./api/product-variant-entity.resolver";

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [WishlistItem],
  providers: [
    {
      provide: WISHLIST_PLUGIN_OPTIONS,
      useFactory: () => WishlistPlugin.options,
    },
    WishlistService,
  ],
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [WishlistShopResolver, ProductVariantEntityResolver],
  },
  configuration: (config) => {
    return config;
  },
  compatibility: "^3.0.0",
})
export class WishlistPlugin {
  static options: PluginInitOptions;

  static init(options: PluginInitOptions): Type<WishlistPlugin> {
    this.options = options;
    return WishlistPlugin;
  }
}
