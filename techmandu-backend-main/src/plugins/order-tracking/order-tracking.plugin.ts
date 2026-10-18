import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { orderTrackingApiExtensions } from './api/api-extensions';
import { OrderTrackingResolver } from './api/order-tracking.resolver';

@VendurePlugin({
    imports: [PluginCommonModule],
    shopApiExtensions: {
        schema: orderTrackingApiExtensions,
        resolvers: [OrderTrackingResolver],
    },
})
export class OrderTrackingPlugin {}