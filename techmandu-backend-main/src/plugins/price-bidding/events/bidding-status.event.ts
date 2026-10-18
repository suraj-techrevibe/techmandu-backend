import { RequestContext, VendureEvent, ProductVariant } from '@vendure/core';
import { BiddingHistory } from '../entities/bidding-history.entity';

export class BiddingStatusEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public bid: BiddingHistory,
        public variant: ProductVariant,
        public status: 'accepted' | 'rejected',
    ) {
        super();
    }
}