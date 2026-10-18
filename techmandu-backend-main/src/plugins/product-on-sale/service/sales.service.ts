import { Injectable, NotFoundException } from "@nestjs/common";
import {
  ID,
  ProductVariant,
  Promotion,
  RequestContext,
  TransactionalConnection,
} from "@vendure/core";

@Injectable()
export class SaleService {
  constructor(private connection: TransactionalConnection) {}

  async getAllProductsOnSale(ctx: RequestContext) {
    const allPromotions = await this.connection
      .getRepository(ctx, Promotion)
      .find({});

    if (!allPromotions) {
      throw new NotFoundException();
    }

    let variantIds: any[] = [];

    await Promise.all(
      allPromotions.map((promo) => {
        if (String(promo.deletedAt).length === 0) {
          const splitted = promo.conditions[0].args[1].value
            .replace("[", "")
            .replace("]", "")
            .split(",")
            .map((x) => x.trim());
          variantIds = [...variantIds, ...splitted];

          variantIds = [...new Set(variantIds)];
        }
      }),
    );

    let listedVariants: any[] = [];

    await Promise.all(
      variantIds.map(async (variants) => {
        const prods = await this.connection
          .getRepository(ctx, ProductVariant)
          .findBy({
            id: variants,
          });

        listedVariants = [...listedVariants, prods[0]];
      }),
    );

    return listedVariants;
  }

  async getAllPromotionsForProduct(ctx: RequestContext, productId: ID) {
    const promotions = await this.connection
      .getRepository(ctx, Promotion)
      .find({});

    if (!promotions) {
      throw new NotFoundException();
    }

    let allPromotions: any[] = [];

    await Promise.all(
      (allPromotions = [
        ...allPromotions,
        ...promotions.filter((promo) => {
          if (String(promo.deletedAt).length === 0) {
            promo.conditions[0].args[1].value.includes(productId as string);
          }
        }),
      ]),
    );

    return allPromotions;
  }
}
