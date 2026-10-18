import { EmailEventListener } from '@vendure/email-plugin';
import { 
    ProductVariant, 
    GlobalSettingsService, 
    StockMovementEvent, 
    TransactionalConnection,
    EntityHydrator,
    translateDeep
} from '@vendure/core';

export const lowStockHandler = new EmailEventListener('low-stock-warning')
    .on(StockMovementEvent)
    .loadData(async ({ event, injector }) => {
        const globalSettingsService = injector.get(GlobalSettingsService);
        const connection = injector.get(TransactionalConnection);
        const entityHydrator = injector.get(EntityHydrator);
        
        const globalSettings = await globalSettingsService.getSettings(event.ctx);
        const warningEmail = (globalSettings.customFields as any).thresholdWarningEmail;

        const doNotSend = { 
            shouldSend: false, 
            recipient: '' as string, 
            variants: [] as Array<{ name: string; sku: string; stock: number; threshold: number }> 
        };

        if (!warningEmail) {
            return doNotSend;
        }

        const lowStockVariants: any[] = [];

        for (const item of event.stockMovements) {
            const variant = await connection.getEntityOrThrow(event.ctx, ProductVariant, item.productVariant.id);
            await entityHydrator.hydrate(event.ctx, variant, {
                relations: ['product', 'product.translations', 'translations']
            });

            const translatedVariant = translateDeep(variant, event.ctx.languageCode);

            const threshold = (variant.customFields as any).stockWarningThreshold;
       
            const currentStock = (variant as any).stockOnHand ?? (variant as any).stockLevel ?? 0;

            console.log(`[LowStockDebug] Name: ${translatedVariant.name} | SKU: ${translatedVariant.sku} | Stock: ${currentStock} | Threshold: ${threshold}`);

            if (threshold !== null && threshold > 0 && currentStock <= threshold) {
                lowStockVariants.push({
                    name: translatedVariant.name,
                    sku: translatedVariant.sku,
                    stock: currentStock,
                    threshold: threshold,
                });
            }
        }

        if (lowStockVariants.length === 0) {
            return doNotSend;
        }

        return { 
            shouldSend: true, 
            recipient: warningEmail,
            variants: lowStockVariants 
        };
    })
    .setRecipient(event => event.data.recipient)
    .setFrom('{{ fromAddress }}')
    .setSubject('Low Stock Warning')
    .setTemplateVars(event => ({
        variants: event.data.variants,
    }));