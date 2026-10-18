import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import {
  EventBus,
  ChannelService,
  Channel,
  TransactionalConnection,
} from "@vendure/core";
import { filter } from "rxjs/operators";
import { SellerVerifiedEvent } from "../events/seller-verified.event";

@Injectable()
export class SellerChannelService implements OnApplicationBootstrap {
  constructor(
    private eventBus: EventBus,
    private channelService: ChannelService,
    private connection: TransactionalConnection,
  ) {}

  onApplicationBootstrap() {
    this.eventBus.ofType(SellerVerifiedEvent).subscribe(async (event) => {
      const { ctx, sellerRegistration } = event;

      console.log(
        `[SellerChannel] Processing verification for: ${sellerRegistration.businessName}`,
      );
      const channelCode = sellerRegistration.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");

      const existingChannel = await this.connection
        .getRepository(ctx, Channel)
        .findOne({
          where: { code: channelCode },
        });

      if (!existingChannel) {
        await this.channelService.create(ctx, {
          code: channelCode,
          token: Math.random().toString(36).substr(2),
          defaultLanguageCode: ctx.languageCode,
          currencyCode: ctx.channel.defaultCurrencyCode,
          defaultShippingZoneId: 1,
          defaultTaxZoneId: 1,
          pricesIncludeTax: false,
          customFields: {
            vendorBusinessName: sellerRegistration.businessName,
            vendorName: sellerRegistration.ownerName,
          },
        });
        console.log(
          `[SellerChannel] Created Channel for ${sellerRegistration.businessName}`,
        );
      } else {
        await this.channelService.update(ctx, {
          id: existingChannel.id,
          customFields: {
            vendorBusinessName: sellerRegistration.businessName,
            vendorName: sellerRegistration.ownerName,
          },
        });
        console.log(
          `[SellerChannel] Updated Channel for ${sellerRegistration.businessName}`,
        );
      }
    });
  }
}

