import { EntityHydrator, EventBus, LanguageCode, Order, OrderPlacedEvent, PluginCommonModule, TransactionalConnection, Type, VendurePlugin } from '@vendure/core';
import { OnApplicationBootstrap } from '@nestjs/common';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import path from 'path';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
    interface CustomOrderFields {
        scanDetails: Array<{
            variantName: string;
            serialNumber: string;
        }>;
    }
}

@VendurePlugin({
    imports: [PluginCommonModule],
    configuration: config => {
        config.customFields.Order.push({
            type: 'struct',
            name: 'scanDetails',
            ui: {
                tab: 'Fulfillment Scan'
            },
            label: [{ languageCode: LanguageCode.en, value: 'Scan Details' }],
            list: true,
            fields: [{
                name: 'variantName',
                type: 'string',
                ui:{
                    component: 'disabled-form-input',
                },
                label: [{ languageCode: LanguageCode.en, value: 'Variant Name' }],
            }, {
                name: 'serialNumber',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'Serial Number' }],
            }]
        });
        return config;
    },
    compatibility: '^3.0.0',
})
export class FulfillmentScanPlugin implements OnApplicationBootstrap {
    static ui: AdminUiExtension = {
        id: 'fulfillment-scan-ui',
        extensionPath: path.join(__dirname, 'ui'),
        providers: ['providers.ts'],
    };
    constructor(
        private eventBus: EventBus,
        private hydrator: EntityHydrator,
        private connection: TransactionalConnection,
    ) { }

    async onApplicationBootstrap() {
        this.eventBus.ofType(OrderPlacedEvent).subscribe(async event => {
            await this.hydrator.hydrate(event.ctx, event.order, {
                relations: [
                    'lines',
                    'lines.productVariant'
                ]
            });
            const scanDetails = event.order.customFields.scanDetails || [];
            for (const line of event.order.lines) {
                const theVariant = line.productVariant;
                const theQuantity = line.quantity;
                for (let i = 0; i < theQuantity; i++) {
                    scanDetails.push({
                        variantName: theVariant.name,
                        serialNumber: ''
                    });
                }
            }
            if (scanDetails.length) {
                await this.connection.getRepository(event.ctx, Order).update({ id: event.order.id }, {
                    customFields: {
                        scanDetails
                    }
                });
            }
        });
    }

}
