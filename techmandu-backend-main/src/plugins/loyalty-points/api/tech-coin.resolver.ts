import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Ctx, ID, RequestContext } from "@vendure/core";
import { TechCoinService } from "../service/tech-coin.service";

@Resolver()
export class TechCoinResolver {
  constructor(private techCoinService: TechCoinService) { }

  @Query()
  async orderPlacedBonus(@Ctx() ctx: RequestContext) {
    return this.techCoinService.fetchAllOrderBonus(ctx);
  }

  @Query()
  async signupBonus(@Ctx() ctx: RequestContext) {
    return this.techCoinService.fetchSignupBonus(ctx);
  }

  @Query()
  async techcoinTrasnsactions(@Ctx() ctx: RequestContext, @Args('customerId') customerId: ID) {
    return this.techCoinService.techcoinTrasnsactions(ctx, customerId);
  }

  @Mutation()
  async reedemTechCoins(
    @Ctx() ctx: RequestContext,
    @Args('orderId') orderId: ID,
    @Args('coins') coins: number
  ) {
    return this.techCoinService.reedemTechCoins(ctx, orderId, coins)
  }

  @Mutation()
  async revertTechCoinRedemption(
    @Ctx() ctx: RequestContext,
    @Args('orderId') orderId: ID,
  ) {
    return this.techCoinService.revertTechCoinRedemption(ctx, orderId)
  }
}
