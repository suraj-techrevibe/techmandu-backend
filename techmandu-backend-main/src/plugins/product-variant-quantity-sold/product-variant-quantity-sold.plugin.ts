import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { shopApiExtensions } from './api/api-extensions';
import { ProductVariantEntityResolver } from './api/product-variant-quantity-sold-admin.resolver';
import { PRODUCT_VARIANT_QUANTITY_SOLD_PLUGIN_OPTIONS } from './constants';
import { ProductVariantQuantitySoldService } from './services/product-variant-quantity-sold.service';
import { PluginInitOptions } from './types';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        {
            provide: PRODUCT_VARIANT_QUANTITY_SOLD_PLUGIN_OPTIONS,
            useFactory: () => ProductVariantQuantitySoldPlugin.options,
        },
        ProductVariantQuantitySoldService,
    ],
    compatibility: '^3.0.0',
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [ProductVariantEntityResolver],
    },
})
export class ProductVariantQuantitySoldPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<ProductVariantQuantitySoldPlugin> {
        this.options = options;
        return ProductVariantQuantitySoldPlugin;
    }
}
