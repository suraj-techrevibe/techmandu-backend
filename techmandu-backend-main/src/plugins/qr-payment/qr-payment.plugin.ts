import { Asset, LanguageCode, PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { QR_PAYMENT_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { QrImageUploaderController } from './api/qr-image-uploader-controller';
import { QrManualPaymentService } from './services/qr-manual-payment.service';
import { QrManualPaymentShopResolver } from './api/qr-manual-payment-shop.resolver';
import { shopApiExtensions } from './api/api-extensions';

declare module '@vendure/core/dist/entity/custom-entity-fields' {

  interface CustomOrderFields {
    qrPaymentProof: Asset;
  }

  interface CustomAssetFields {
    isQrPaymentProofImage: Boolean
  }

  interface CustomGlobalSettingsFields {
    manualPaymentQrImage: Asset | null;
  }
}

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: QR_PAYMENT_PLUGIN_OPTIONS, useFactory: () => QrPaymentPlugin.options }, QrManualPaymentService],
    controllers: [
        QrImageUploaderController
    ],
    configuration: config => {
       
        config.customFields.Order.push({
            name: 'qrPaymentProof',
            type: 'relation',
            entity: Asset,
            nullable: true,
            label: [{ languageCode: LanguageCode.en, value: 'QR Payment Proof Image' }],
        })

        config.customFields.Asset.push({
            name: 'isQrPaymentProofImage',
            type: 'boolean',
            nullable: true,
            label: [{ languageCode: LanguageCode.en, value: 'Is QR Payment Proof Image' }],
        })

        config.customFields.GlobalSettings.push({
            name: 'manualPaymentQrImage',
            type: 'relation',
            entity: Asset,
            nullable: true,
            label: [{ languageCode: LanguageCode.en, value: 'Manual Payment QR Image' }],
        })
        return config;
    },
    compatibility: '^3.0.0',
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [QrManualPaymentShopResolver]
    },
})
export class QrPaymentPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<QrPaymentPlugin> {
        this.options = options;
        return QrPaymentPlugin;
    }
}
