import { VendurePlugin, PluginCommonModule, LanguageCode } from "@vendure/core";
import { Banner } from "./entities/banner.entity";
import { shopApiExtensions } from "./api/schemas/shop.schema";
import { BannerResolver } from "./api/resolvers/banner.resolver";
import path from "path";
import { AdminUiExtension } from "@vendure/ui-devkit/compiler";

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [Banner],
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [BannerResolver],
  },
  adminApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [BannerResolver],
  },
  configuration: (config) => {
    return config;
  },
})
export class ProductEnhancementsPlugin {
  static ui: AdminUiExtension = {
    extensionPath: path.join(__dirname, "./ui"),
    id: "banners",
    providers: ["providers.ts"],
    // ngModules:[
    //             {
    //                 type: 'lazy',
    //                 route: 'banners',
    //                 ngModuleFileName: 'banner.module.ts',
    //                 ngModuleName: 'BannerModule',
    //             },
    //         ],
    routes: [{ filePath: "routes.ts", route: "banners" }],
  };
}
