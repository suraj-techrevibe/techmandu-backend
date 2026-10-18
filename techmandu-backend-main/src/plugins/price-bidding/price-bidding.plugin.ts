import {
  EventBus,
  GlobalSettingsService,
  LanguageCode,
  PluginCommonModule,
  ProductVariant,
  ProductVariantEvent,
  TransactionalConnection,
  Type,
  VendurePlugin,
} from "@vendure/core";
import { AdminUiExtension } from "@vendure/ui-devkit/compiler";
import * as path from "path";

import { adminApiExtensions } from "./api/api-extensions";
import { BiddingHistoryAdminResolver } from "./api/bidding-history-admin.resolver";
import { PRICE_BIDDING_PLUGIN_OPTIONS } from "./constants";
import { BiddingHistory } from "./entities/bidding-history.entity";
import { BiddingHistoryService } from "./services/bidding-history.service";
import { PluginInitOptions } from "./types";
import { OnApplicationBootstrap } from "@nestjs/common";
import { filter } from "rxjs/operators";
import { ProductCreatedEvent } from "./events/product-created-event";
declare module "@vendure/core/dist/entity/custom-entity-fields" {
  interface CustomGlobalSettingsFields {
    productNotificationEmail: string;
  }

  interface CustomProductVariantFields {
    currentBidPrice: number;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [
    {
      provide: PRICE_BIDDING_PLUGIN_OPTIONS,
      useFactory: () => PriceBiddingPlugin.options,
    },
    BiddingHistoryService,
  ],
  configuration: (config) => {
    config.customFields.GlobalSettings.push({
      name: "productNotificationEmail",
      type: "string",
      label: [
        { languageCode: LanguageCode.en, value: "Bidding Notification Email" },
      ],
      description: [
        {
          languageCode: LanguageCode.en,
          value: "The email address to send bidding notifications to.",
        },
      ],
    });
    config.customFields.ProductVariant.push({
      name: "currentBidPrice",
      type: "float",
      label: [{ languageCode: LanguageCode.en, value: "Current Bid Price" }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: "The current highest bid price for this product variant.",
        },
      ],
    });
    return config;
  },
  compatibility: "^3.0.0",
  entities: [BiddingHistory],
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [BiddingHistoryAdminResolver],
  },
})
export class PriceBiddingPlugin implements OnApplicationBootstrap {
  static options: PluginInitOptions;

  constructor(
    private eventBus: EventBus,
    private connection: TransactionalConnection,
    private globalSettingsService: GlobalSettingsService,
  ) {}

  static init(options: PluginInitOptions): Type<PriceBiddingPlugin> {
    this.options = options;
    return PriceBiddingPlugin;
  }

  onApplicationBootstrap() {
    this.eventBus
      .ofType(ProductVariantEvent)
      .pipe(filter((event) => event.type === "created"))
      .subscribe(async (event) => {
        console.log("Product Variant Create Event");
        event.entity.map(async (entity) => {
          const variant = await this.connection
            .getRepository(event.ctx, ProductVariant)
            .findOne({
              where: { id: entity.id },
              relations: ["channels"],
            });
          const sellerChannel = variant?.channels.find(
            (channel) => channel.id !== 1,
          );
          if (sellerChannel) {
            const globalSettingsConfig =
              await this.globalSettingsService.getSettings(event.ctx);
            const adminEmail =
              globalSettingsConfig.customFields.productNotificationEmail;
            await this.eventBus.publish(
              new ProductCreatedEvent(
                event.ctx,
                entity.id as string,
                entity.productId as string,
                entity.name,
                entity.sku,
                sellerChannel?.customFields.vendorName || "SellerName",
                sellerChannel?.customFields.vendorBusinessName ||
                  "BusinessName",
                adminEmail,
              ),
            );
          } else {
            console.log(
              "Skipping email for default channel product variant creation",
            );
          }
        });
      });
  }

  static ui: AdminUiExtension = {
    id: "price-bidding-ui",
    extensionPath: path.join(__dirname, "ui"),
    routes: [{ route: "bidding-history", filePath: "routes.ts" }],
    providers: ["providers.ts"],
  };
}
