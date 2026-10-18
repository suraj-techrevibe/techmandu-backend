import { RequestContext, VendureEvent } from '@vendure/core';

export class ProductCreatedEvent extends VendureEvent {
  constructor(
    public ctx: RequestContext,
    public productVariantId: string,
    public productId: string,
    public name: string,
    public sku: string,
    public creatorName: string,
    public businessName: string,
    public recipientEmail: string,
    
  ) {
    super();
  }
}
