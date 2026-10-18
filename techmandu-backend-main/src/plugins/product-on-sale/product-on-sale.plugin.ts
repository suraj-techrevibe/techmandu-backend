import { PluginCommonModule, Type, VendurePlugin } from "@vendure/core";
import { PRODUCT_ON_SALE_PLUGIN_OPTIONS } from "./constants";
import { PluginInitOptions } from "./types";
import { SaleService } from "./service/sales.service";
import { salesShopApiExtensions } from "./api/api.extension";
import { OrderTypeResolver } from "./resolver/sales.resovler";

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [SaleService],
  shopApiExtensions: {
    schema: salesShopApiExtensions,
    resolvers: [OrderTypeResolver],
  },
  configuration: (config) => {
    return config;
  },
  compatibility: "^3.0.0",
})
export class ProductOnSalePlugin {
  static options: PluginInitOptions;

  static init(options: PluginInitOptions): Type<ProductOnSalePlugin> {
    this.options = options;
    return ProductOnSalePlugin;
  }
}
