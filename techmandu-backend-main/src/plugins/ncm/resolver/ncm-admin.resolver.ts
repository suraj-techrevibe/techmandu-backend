import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  Allow,
  Ctx,
  ID,
  Permission,
  RequestContext,
  Transaction,
} from "@vendure/core";

import { NcmService } from "../service/ncm.service";
import { toBookingOutcomes } from "../util/booking-result.util";

const MAX_BOOK_AT_ONCE = 50;

@Resolver()
export class NcmAdminResolver {
  constructor(private ncmService: NcmService) {}

  @Query()
  @Allow(Permission.ReadOrder)
  async ncmWorkbench(
    @Ctx() ctx: RequestContext,
    @Args("skip") skip?: number,
    @Args("take") take?: number,
    @Args("onlyBookable") onlyBookable?: boolean
  ) {
    return this.ncmService.getWorkbench(ctx, { skip, take, onlyBookable });
  }

  /** Live status from NCM. NCM's own tracking id, not the Vendure order id. */
  @Query()
  @Allow(Permission.ReadOrder)
  async ncmTrackingStatus(
    @Ctx() ctx: RequestContext,
    @Args("trackingId") trackingId: string
  ) {
    const raw = await this.ncmService.getOrderStatus(ctx, trackingId.trim());
    return {
      trackingId: String(raw?.orderid ?? trackingId),
      status: String(raw?.status ?? "unknown"),
      addedTime: raw?.added_time ? String(raw.added_time) : null,
      vendorReturn: typeof raw?.vendor_return === "boolean" ? raw.vendor_return : null,
    };
  }

  /**
   * Books the given orders with NCM. Safe to run again after a failure:
   * orders that already have a tracking id are not sent to NCM twice.
   */
  @Transaction()
  @Mutation()
  @Allow(Permission.UpdateOrder)
  async ncmBookOrders(
    @Ctx() ctx: RequestContext,
    @Args("orderIds") orderIds: ID[]
  ) {
    if (orderIds.length > MAX_BOOK_AT_ONCE) {
      throw new Error(`Book at most ${MAX_BOOK_AT_ONCE} orders at a time`);
    }
    return toBookingOutcomes(await this.ncmService.createDelivery(ctx, orderIds));
  }
}
