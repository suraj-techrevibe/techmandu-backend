import { EmailEventListener } from "@vendure/email-plugin";
import { BiddingStatusEvent } from "../../plugins/price-bidding/events/bidding-status.event";

export const biddingNotificationHandler = new EmailEventListener(
  "bidding-email",
)
  .on(BiddingStatusEvent)
  .loadData(async ({ event }) => {
    const channel = event.variant.channels?.[0];
    const customFields = channel?.customFields as any;

    return {
      sellerName: customFields?.vendorName || "Seller",
      businessName: customFields?.vendorBusinessName || "Techmandu",
    };
  })
  .setRecipient((event) => {
    if (event.bid.user && event.bid.user.identifier) {
      return event.bid.user.identifier;
    }
    return "test@test.com";
  })
  .setFrom("{{ fromAddress }}")
  .setSubject("Update on your Bid for {{ productName }}")
  .setTemplateVars((event) => {
    const isAccepted = event.status === "accepted";
    const data = event.data as any;

    return {
      emailTitle: isAccepted ? "Bid Accepted" : "Bid Rejected",
      isAccepted: isAccepted,
      productName: event.variant.product.name,
      bidAmount: event.bid.finalPrice || event.bid.initialPrice,
      sellerName: data.sellerName,
      businessName: data.businessName,
      bidDashboardUrl: `${process.env.SERVER_URL}/admin/extensions/bidding`,
    };
  });

