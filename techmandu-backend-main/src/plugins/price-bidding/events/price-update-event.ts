import { RequestContext, VendureEvent } from '@vendure/core';

export class NewBidAmountEvent extends VendureEvent {
  constructor(
    public ctx: RequestContext,
    public recipientEmail: string,
    public bidAmount: number,
    public productId: number,
    public productName: string,
    public sellerName: string,
    public businessName: string,
    public channelId: number,
  ) {
    super();
  }
}
