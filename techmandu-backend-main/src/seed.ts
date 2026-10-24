import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";
import { IsNull } from "typeorm";

dotenv.config({ path: path.join(__dirname, "../.env") });

import { INestApplicationContext } from "@nestjs/common";
import {
  bootstrapWorker,
  ChannelService,
  ConfigService,
  DefaultJobQueuePlugin,
  RequestContext,
  RequestContextService,
  RoleService,
  Seller,
  TransactionalConnection,
  User,
  ZoneService,
  ProductVariant,
  SearchService,
} from "@vendure/core";
import { populate } from "@vendure/core/cli";
import { initialData } from "./initial";
import { shippingMethodsForEnv } from "./seed-shipping.util";
import { config } from "../src/vendure-config";
import { SearchIndexService } from "@vendure/core/dist/plugin/default-search-plugin/indexer/search-index.service";
import { parse } from "csv-parse/sync";

const CSV_PATH = path.join(__dirname, "./final.csv");

const populateConfig = {
  ...config,
  plugins: (config.plugins || []).filter(
    (plugin) => plugin !== DefaultJobQueuePlugin,
  ),
};

if (require.main === module) {
  (async () => {
    try {
      await populateServer();
      console.log("✅ Vendure populated successfully");
      process.exit(0);
    } catch (err) {
      console.error("❌ Population failed", err);
      process.exit(1);
    }
  })();
}

async function populateServer() {
  const { app } = await bootstrapWorker({
    ...populateConfig,
    importExportOptions: {
      importAssetsDir: path.join(__dirname, "./data/assets"),
    },
    dbConnectionOptions: {
      ...config.dbConnectionOptions,
      synchronize: true,
    },
  });

  const ctx = await getSuperadminContext(app);

  // 1️⃣ Normal Vendure populate (variants get created)
  // Demo flat-rate shipping methods are dev only. See seed-shipping.util.ts.
  const seedData = {
    ...initialData,
    shippingMethods: shippingMethodsForEnv(initialData.shippingMethods, process.env.APP_ENV),
  };
  if (process.env.APP_ENV?.trim().toLowerCase() !== "dev") {
    console.log("ℹ️ APP_ENV is not dev: skipping demo shipping methods. Create NCM / Inside Valley / Pickup in the admin.");
  }
  await populate(() => Promise.resolve(app), seedData, CSV_PATH);

  // 2️⃣ Populate struct[] custom field manually
  await populateVariantSpecifications(ctx, app.get(TransactionalConnection));

  // 3️⃣ Reindex
  const searchIndexService = app.get(SearchService);
  await searchIndexService.reindex(ctx);
}

/**
 * Reads `variant:specification` from CSV
 * and populates ProductVariant.customFields.specification
 */
async function populateVariantSpecifications(
  ctx: RequestContext,
  connection: TransactionalConnection,
) {
  const csv = fs.readFileSync(CSV_PATH);
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  });

  const variantRepo = connection.getRepository(ctx, ProductVariant);

  for (const row of rows) {
    const sku = row["sku"]?.trim();
    let rawSpec = row["variant:specification"];
    const vendorSupplier = row["Vendor/Supplier"]?.trim();

    if (!sku) {
      console.warn(`⚠️ Skipping row - missing SKU`);
      continue;
    }

    let specification = null;
    if (rawSpec) {
      rawSpec = rawSpec
        .trim()
        .replace(/^"+|"+$/g, "")
        .replace(/""/g, '"');

      try {
        specification = JSON.parse(rawSpec);
      } catch (e) {
        console.error("❌ JSON parse failed for SKU:", sku, e);
        // Continue — we can still set sellerBusinessName
      }
    }

    // Fetch variant with product relation
    const variant = await variantRepo.findOne({
      where: { sku, deletedAt: IsNull() },
      relations: ["product"], // Load the product to access its customFields
    });

    if (!variant) {
      console.error("❌ Variant NOT FOUND for SKU:", sku);
      continue;
    }

    // Update variant specification if valid
    if (specification !== null) {
      await variantRepo.update(variant.id, {
        customFields: {
          ...variant.customFields,
          specification,
        },
      });
    }

    // Update product's sellerBusinessName if vendorSupplier exists
    if (vendorSupplier && variant.product) {
      await variantRepo.manager.update(
        "Product",
        { id: variant.product.id },
        {
          customFields: {
            ...variant.product.customFields,
            sellerBusinessName: vendorSupplier,
            sellerName: vendorSupplier,
          },
        },
      );
    }
  }
}

async function getSuperadminContext(
  app: INestApplicationContext,
): Promise<RequestContext> {
  const configService = app.get(ConfigService);
  const channelService = app.get(ChannelService);
  const connection = app.get(TransactionalConnection);
  const requestContextService = app.get(RequestContextService);

  const defaultChannel = await channelService.getDefaultChannel();
  const superadminIdentifier =
    configService.authOptions.superadminCredentials.identifier;

  const user = await connection.rawConnection
    .getRepository(User)
    .findOneOrFail({ where: { identifier: superadminIdentifier } });

  return requestContextService.create({
    apiType: "admin",
    user,
    channelOrToken: defaultChannel.token,
  });
}
