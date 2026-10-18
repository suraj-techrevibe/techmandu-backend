import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Ctx, ID, RequestContext } from "@vendure/core";

import { NcmService } from "../service/ncm.service";

@Resolver()
export class NcmResolver {
  constructor(private ncmService: NcmService) {}

  @Query()
  async getOrderStatus(
    @Ctx() ctx: RequestContext,
    @Args("orderId") orderId: ID
  ): Promise<any> {
    return this.ncmService.getOrderStatus(ctx, orderId);
  }

  @Mutation()
  async addNcmBranchToOrder(
    @Ctx() ctx: RequestContext,
    @Args("destinationBranch") destinationBranch: string,
    @Args("orderId") orderId: ID
  ) {
    return this.ncmService.AddNcmBranchToOrder(ctx, destinationBranch, orderId);
  }

  @Mutation()
  async addOrderNote(
    @Ctx() ctx: RequestContext,
    @Args("note") note: string,
    @Args("orderId") orderId: string
  ) {
    return this.ncmService.addNote(ctx, note, orderId);
  }

  @Mutation()
  async valleyStatus(
    @Ctx() ctx: RequestContext,
    @Args("outOfValley") outOfValley: boolean,
    @Args("orderId") orderId: string
  ) {
    return this.ncmService.valleyStatus(ctx, outOfValley, orderId);
  }
}