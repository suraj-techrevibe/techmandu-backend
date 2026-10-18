import { LanguageCode, PluginCommonModule, VendurePlugin } from "@vendure/core";

import { ProductReview } from "./entities/product-review.entity";
import { adminApiExtensions, shopApiExtensions } from "./api/api-extensions";
import { ProductEntityResolver } from "./api/product-entity.resolver";
import { ProductReviewAdminResolver } from "./api/product-review-admin.resolver";
import { ProductReviewEntityResolver } from "./api/product-review-entity.resolver";
import { ProductReviewShopResolver } from "./api/product-review-shop.resolver";
import path from "path";
import { AdminUiExtension } from "@vendure/ui-devkit/compiler";

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [ProductReview],
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [
      ProductEntityResolver,
      ProductReviewAdminResolver,
      ProductReviewEntityResolver,
    ],
  },
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [
      ProductEntityResolver,
      ProductReviewShopResolver,
      ProductReviewEntityResolver,
    ],
  },
})
export class ReviewsPlugin {
  static uiExtensions: AdminUiExtension = {
    extensionPath: path.join(__dirname, "ui"),
    providers: ["providers.ts"],
    routes: [{ route: "product-reviews", filePath: "routes.ts" }],
  };
}
