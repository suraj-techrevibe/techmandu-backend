// events/seller-registration-verified.event.ts
import { RequestContext, VendureEvent } from '@vendure/core';
import { SellerRegistration } from '../entities/seller-registration.entity';

export class SellerRegistrationVerifiedEvent extends VendureEvent {
  constructor(
    public ctx: RequestContext,
    public sellerEmail: string,
    public businessName: string,
    public username: string,
    public tempPassword: string,
    public loginDashboardUrl: string,
  
  ) {
    super();
    console.log(`SellerRegistrationVerifiedEvent created for ${businessName} (${sellerEmail})`);
  }
}
