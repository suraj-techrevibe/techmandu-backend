import { FulfillmentHandler, Injector, LanguageCode, Logger } from '@vendure/core';
import { NcmService } from '../service/ncm.service';
import { failureMessage, trackingCodeOf } from '../util/booking-result.util';

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
            const result = await ncmService.createDelivery(ctx, orderIds);
            // A fulfillment must not be created unless every order is booked.
            // Orders booked in this attempt keep their tracking id and are
            // skipped when the admin retries.
            if (result.failed.length) {
                throw new Error(failureMessage(result));
            }
            return {
                method: 'ncm',
                trackingCode: trackingCodeOf(result),
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
