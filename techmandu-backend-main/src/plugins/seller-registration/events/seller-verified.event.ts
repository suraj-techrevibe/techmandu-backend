import { VendureEvent, RequestContext } from '@vendure/core';
import { SellerRegistration } from '../entities/seller-registration.entity';

export class SellerVerifiedEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public sellerRegistration: SellerRegistration,
    ) {
        super();
    }
}