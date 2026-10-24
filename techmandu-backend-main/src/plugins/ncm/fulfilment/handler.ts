import { FulfillmentHandler, Injector, LanguageCode, Logger } from '@vendure/core';
import { NcmService } from '../service/ncm.service';
import { formatBookingFailure, summariseBookings } from '../util/booking-report.util';

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
        const results = await ncmService.createDelivery(ctx, orderIds);
        const summary = summariseBookings(results);

        if (!summary.ok) {
            // Nothing is fulfilled until every order has a parcel. Parcels that were booked are saved on
            // their orders, and booking again skips them, so staff can fix the failures and retry.
            const message = formatBookingFailure(results);
            Logger.error(message, 'ncm-fullfillment-handler');
            throw new Error(message);
        }

        return {
            method: 'ncm',
            // One fulfillment can cover several orders, so this holds every tracking id.
            trackingCode: summary.trackingIds.join(', '),
        };
    },
});
