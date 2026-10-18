import { Resolver, Args, Query } from "@nestjs/graphql";
import { Ctx, ID, RequestContext } from "@vendure/core";
import { SaleService } from "../service/sales.service";

@Resolver()
export class OrderTypeResolver {
  constructor(private readonly salesService: SaleService) {}

  @Query()
  async getAllProductsOnSale(@Ctx() ctx: RequestContext) {
    return await this.salesService.getAllProductsOnSale(ctx);
  }

  @Query()
  async getAllPromotionsForProduct(
    @Ctx() ctx: RequestContext,
    @Args("productId") productId: ID,
  ) {
    return await this.salesService.getAllPromotionsForProduct(ctx, productId);
  }
}
