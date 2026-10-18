// email-handlers/new-bid-amount.handler.ts

import { EmailEventListener } from '@vendure/email-plugin';
import { NewBidAmountEvent } from '../events/price-update-event';

export const newBidAmountEmailHandler =
  new EmailEventListener('bidding-email')
    .on(NewBidAmountEvent)

    // Recipient — decide if this goes to admin, seller, or buyer
    .setRecipient(event => event.recipientEmail)

    .setFrom('{{ fromAddress }}')

    .setSubject(event =>
      `New Bid Received — ${event.productName}`
    )

    .setTemplateVars(event => ({
      bidAmount: event.bidAmount,
      productId: event.productId,
      productName: event.productName,
      sellerName: event.sellerName,
      businessName: event.businessName,
      bidDashboardUrl: `${process.env.SERVER_URL}/admin/extensions/bidding-history`
    }));
