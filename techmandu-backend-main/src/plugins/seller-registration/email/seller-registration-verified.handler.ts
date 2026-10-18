// email-handlers/seller-registration-verified.handler.ts
import { EmailEventListener } from '@vendure/email-plugin';
import { SellerRegistrationVerifiedEvent } from '../events/seller-registration-verified.event';

export const sellerRegistrationVerifiedEmailHandler =
  new EmailEventListener('seller-registration-verified')
    .on(SellerRegistrationVerifiedEvent)

    .setRecipient(event => event.sellerEmail)

    .setFrom('{{ fromAddress }}')

    .setSubject(event => `Seller Registration Verified — ${event.businessName}`)

    .setTemplateVars(event => ({
      seller: { businessName: event.businessName },
      username: event.username,
      password: event.tempPassword,
      loginDashboardUrl: event.loginDashboardUrl,
    }));
