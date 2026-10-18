import { FulfillmentHandler, Injector, LanguageCode, Logger } from '@vendure/core';
import { NcmService } from '../service/ncm.service';

let ncmService: NcmService;
export const ncmFullfillmentHandler = new FulfillmentHandler({
    code: 'ncm-fullfillment-handler',
    description: [{ languageCode: LanguageCode.en, value: 'Ncm Fullfillment Handler' }],
    args: {},
    init: (injector: Injector) => {
        ncmService = injector.get(NcmService);
    },

    createFulfillment: async (ctx, orders, lines, args) => {
        const orderIds = orders.map(o => o.id);
        try {
            const trackingCode = await ncmService.createDelivery(ctx, orderIds);
            return {
                method: 'ncm',
                trackingCode,
            };
        } catch (error) {
            Logger.error(
                `Failed to create NCM fulfillment: ${error instanceof Error ? error.message : String(error)}`,
                'ncm-fullfillment-handler'
            );
            throw error;
        }
    },
});
