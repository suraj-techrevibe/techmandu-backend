import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  ActiveOrderService,
  Ctx,
  ForbiddenError,
  ID,
  Order,
  OrderService,
  RequestContext,
} from "@vendure/core";

import { NcmService } from "../service/ncm.service";
import { canAccessOrder } from "../util/order-access.util";

const NOT_ALLOWED = { message: "Order not found", status: false };

@Resolver()
export class NcmResolver {
  constructor(
    private ncmService: NcmService,
    private activeOrderService: ActiveOrderService,
    private orderService: OrderService
  ) {}

  /** These are Shop API calls, so the caller must own the order they name. */
  private async mayAccess(ctx: RequestContext, orderId: ID): Promise<boolean> {
    const active = await this.activeOrderService.getActiveOrder(ctx, undefined);
    let order: Order | undefined;
    if (ctx.activeUserId != null) {
      order = await this.orderService.findOne(ctx, orderId, ["customer", "customer.user"]);
    }
    return canAccessOrder({
      orderId,
      activeOrderId: active?.id,
      activeUserId: ctx.activeUserId,
      order,
    });
  }

  @Query()
  async getOrderStatus(
    @Ctx() ctx: RequestContext,
    @Args("orderId") orderId: ID
  ): Promise<any> {
    if (!(await this.mayAccess(ctx, orderId))) throw new ForbiddenError();
    return this.ncmService.getOrderStatus(ctx, orderId);
  }

  @Mutation()
  async addNcmBranchToOrder(
    @Ctx() ctx: RequestContext,
    @Args("destinationBranch") destinationBranch: string,
    @Args("orderId") orderId: ID
  ) {
    if (!(await this.mayAccess(ctx, orderId))) return NOT_ALLOWED;
    return this.ncmService.AddNcmBranchToOrder(ctx, destinationBranch, orderId);
  }

  @Mutation()
  async addOrderNote(
    @Ctx() ctx: RequestContext,
    @Args("note") note: string,
    @Args("orderId") orderId: string
  ) {
    if (!(await this.mayAccess(ctx, orderId))) return NOT_ALLOWED;
    return this.ncmService.addNote(ctx, note, orderId);
  }

  @Mutation()
  async valleyStatus(
    @Ctx() ctx: RequestContext,
    @Args("outOfValley") outOfValley: boolean,
    @Args("orderId") orderId: string
  ) {
    if (!(await this.mayAccess(ctx, orderId))) return NOT_ALLOWED;
    return this.ncmService.valleyStatus(ctx, outOfValley, orderId);
  }
}
