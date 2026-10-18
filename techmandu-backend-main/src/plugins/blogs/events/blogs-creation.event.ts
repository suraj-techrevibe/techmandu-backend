import { RequestContext, VendureEvent } from '@vendure/core';

export class BlogCreationEvent extends VendureEvent {
  constructor(
    public ctx: RequestContext,
  ) {
    super();
  }
}