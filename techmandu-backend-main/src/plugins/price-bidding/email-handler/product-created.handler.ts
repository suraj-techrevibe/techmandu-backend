import { EmailEventListener } from '@vendure/email-plugin';
import { ProductCreatedEvent } from '../events/product-created-event';
 
export const productCreatedEmailHandler =
  new EmailEventListener('product-created-email')
    .on(ProductCreatedEvent)

    .setRecipient(event => event.recipientEmail)

    .setFrom('{{ fromAddress }}')

    .setSubject(event =>
      `New Product Created — ${event.name}`
    )

    .setTemplateVars(event => ({
      productVariantId: event.productVariantId,
      name: event.name,
      sku: event.sku,
      creatorName: event.creatorName,
      businessName: event.businessName,
      productDashboardUrl: `${process.env.SERVER_URL}/admin/catalog/products/${event.productId}/variants/${event.productVariantId}`
    }));
