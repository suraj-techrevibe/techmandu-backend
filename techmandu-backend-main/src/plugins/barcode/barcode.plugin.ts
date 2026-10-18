import { EventBus, LanguageCode, OrderStateTransitionEvent, PluginCommonModule, ProductVariantService, Type, VendurePlugin } from '@vendure/core';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import * as path from 'path';

import { adminApiExtensions } from './api/api-extensions';
import { BarcodeAdminResolver } from './api/barcode-admin.resolver';
import { BARCODE_PLUGIN_OPTIONS } from './constants';
import { BarcodeService } from './services/barcode.service';
import { PluginInitOptions } from './types';
import { OnApplicationBootstrap } from '@nestjs/common';
import { filter } from 'rxjs/operators';
declare module '@vendure/core/dist/entity/custom-entity-fields' {

    interface CustomProductVariantFields {
        variantSerialCode: string;
    }

    // interface CustomOrderLineFields {
    //     serialCodes: string[];
    // }

    interface CustomOrderLineFields {
        serialCodes: string[];
    }
}

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: BARCODE_PLUGIN_OPTIONS, useFactory: () => BarcodePlugin.options }, BarcodeService],
    configuration: config => {

        config.customFields.ProductVariant.push({
            name: 'variantSerialCode',
            type: 'string',
            list: true,
            nullable: true,
            unique:false,
            label: [{ languageCode: LanguageCode.en, value: 'Variant Serial Code' }],
            ui:{
                // component: 'variant-serial-code-control'
            }
        });

        config.customFields.OrderLine.push({
            name: 'serialCodes',
            type: 'string',
            list: true,
            nullable: true,
            public: true,
            label: [{ languageCode: LanguageCode.en, value: 'Serial Codes' }],
            
        }); 
        return config;
    },
    compatibility: '^3.0.0',
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [BarcodeAdminResolver]
    },
})
export class BarcodePlugin implements OnApplicationBootstrap {
    static options: PluginInitOptions;
    constructor(
        private eventBus:EventBus,
        private productVariantService: ProductVariantService
    ){}
    static init(options: PluginInitOptions): Type<BarcodePlugin> {
        this.options = options;
        return BarcodePlugin;
    }

    async onApplicationBootstrap() {

    this.eventBus
      .ofType(OrderStateTransitionEvent)
      .pipe(
        filter(event => event.toState === 'PaymentSettled'),
      )
      .subscribe((event) => {
        // If lines contains variants with serial codes, remove them from the product variant custom fields
        event.order.lines.forEach(async line => {
            console.log('Order Line:', line.id);

            const serialCodes: string[] = line.customFields?.serialCodes ?? [];
            if (serialCodes.length > 0) {
                console.log(serialCodes)
                const productVariant = line.productVariant;
                const updatedVariantSerialCodes:any = productVariant.customFields?.variantSerialCode ?? [];
                const newVariantSerialCodes = updatedVariantSerialCodes.filter((code:any) => !serialCodes.includes(code));
                await this.productVariantService.update(event.ctx,[{
                    id: productVariant.id,
                    customFields: {
                        variantSerialCode: newVariantSerialCodes
                    }
                }])

            }
        });
        });
    }

    static ui: AdminUiExtension = {
        id: 'barcode-ui',
        extensionPath: path.join(__dirname, 'ui'),
        routes: [{ route: 'barcode', filePath: 'routes.ts' }],
        providers: ['providers.ts'],
    };
}
