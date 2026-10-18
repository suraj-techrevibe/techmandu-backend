import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import {
  EventBus,
  ProductEvent,
  TransactionalConnection,
  Channel,
} from "@vendure/core";
import { filter } from "rxjs/operators";

@Injectable()
export class ProductSellerService implements OnApplicationBootstrap {
  constructor(
    private eventBus: EventBus,
    private connection: TransactionalConnection,
  ) {}

  onApplicationBootstrap() {
    this.eventBus
      .ofType(ProductEvent)
      .pipe(filter((event) => event.type === "created"))
      .subscribe(async (event) => {
        const { product, ctx } = event;
        const channel = await this.connection
          .getRepository(ctx, Channel)
          .findOne({
            where: { id: ctx.channelId },
          });

        if (channel) {
          const businessName = (channel.customFields as any).vendorBusinessName;
          const sellerName = (channel.customFields as any).vendorName;
          if (businessName || sellerName) {
            product.customFields = {
              ...product.customFields,
              vendorBusinessName: businessName,
              vendorName: sellerName,
            };
            await this.connection
              .getRepository(ctx, product.constructor)
              .save(product);
            console.log(
              `[ProductSeller] Linked Product "${product.name}" to Seller: ${businessName}`,
            );
          }
        }
      });
  }
}

