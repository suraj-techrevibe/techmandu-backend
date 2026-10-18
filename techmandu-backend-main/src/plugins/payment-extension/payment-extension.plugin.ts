import {
    Asset,
    LanguageCode,
    PaymentMethodEligibilityChecker,
    Permission,
    PluginCommonModule,
    Type,
    VendurePlugin,
} from '@vendure/core';

import { PAYMENT_EXTENSION_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { PaymentGatewayTransactions } from './entities/payment-gateway-transactions.entity';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
    // interface CustomPaymentMethodFields {
    //     paymentGatewayIcon: Asset;
    // }

    interface CustomOrderFields {
        isCustomPaymentHandlerFlow: boolean;
    }
    interface CustomChannelFields {
        isCustomPaymentHandlerFlow: boolean;
        isEsewaEnabled: boolean;
        isKhaltiEnabled: boolean;
        khaltiToken: string;
        esewaToken: string;
        merchantId: string;
        isCodEnabled: boolean;
    }
}
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        { provide: PAYMENT_EXTENSION_PLUGIN_OPTIONS, useFactory: () => PaymentExtensionPlugin.options },
    ],
    configuration: config => {
        //     config.customFields.PaymentMethod.push({
        //         name: 'paymentGatewayIcon',
        //         type: 'relation',
        //         entity: Asset,
        //         label: [{ languageCode: LanguageCode.en, value: 'Payment Gateway Icon' }],
        //         description: [
        //             {
        //                 languageCode: LanguageCode.en,
        //                 value: 'Upload or select an icon to represent this payment method in the storefront',
        //             },
        //         ],
        //     }
        // );

        config.customFields.Order.push({
            name: 'isCustomPaymentHandlerFlow',
            type: 'boolean',
            defaultValue: false,
            internal: true,
            label: [{ languageCode: LanguageCode.en, value: 'Is Custom Payment Handler Flow' }],
            description: [
                {
                    languageCode: LanguageCode.en,
                    value: 'If true, this payment method will use the custom payment handler flow',
                },
            ],
        });
        config.customFields.Channel.push({
            name: 'isEsewaEnabled',
            type: 'boolean',
            defaultValue: false,
            label: [{ languageCode: LanguageCode.en, value: 'Is Esewa Payment Method Enabled' }],
            description: [
                {
                    languageCode: LanguageCode.en,
                    value: 'If true, Esewa will be enabled as payment gateway',
                },
            ],
            ui: {
                tab: 'Esewa Payment Gateway',
            },
        });
        config.customFields.Channel.push({
            name: 'isCodEnabled',
            type: 'boolean',
            defaultValue: false,
            label: [{ languageCode: LanguageCode.en, value: 'Is Cash on Delivery Payment Mode Enabled' }],
            description: [
                {
                    languageCode: LanguageCode.en,
                    value: 'If true, Cash on Delivery will be enabled as payment Mode',
                },
            ],
            ui: {
                tab: 'Cash on Delivery Mode ',
            },
        });
        config.customFields.Channel.push({
            name: 'isKhaltiEnabled',
            type: 'boolean',
            defaultValue: false,
            label: [{ languageCode: LanguageCode.en, value: 'Is Khalti Payment Method Enabled' }],
            description: [
                {
                    languageCode: LanguageCode.en,
                    value: 'If true, Khalti will be enabled as payment gateway',
                },
            ],
            ui: {
                tab: 'Khalti Payment Gateway',
            },
        });
        config.customFields.Channel.push({
            name: 'khaltiToken',
            type: 'string',
            defaultValue: '',
            label: [{ languageCode: LanguageCode.en, value: 'Khalti API Key' }],
            description: [
                {
                    languageCode: LanguageCode.en,
                    value: 'Merchant Khalti API Key',
                },
            ],
            ui: {
                tab: 'Khalti Payment Gateway',
            },
        });
        config.customFields.Channel.push({
            name: 'esewaToken',
            type: 'string',
            defaultValue: '',
            label: [{ languageCode: LanguageCode.en, value: 'Esewa API Key' }],
            description: [
                {
                    languageCode: LanguageCode.en,
                    value: 'Merchant Esewa API Key',
                },
            ],
            ui: {
                tab: 'Esewa Payment Gateway',
            },
        });
        config.customFields.Channel.push({
            name: 'merchantId',
            type: 'string',
            defaultValue: '',
            label: [{ languageCode: LanguageCode.en, value: 'Esewa Merchant ID' }],
            description: [
                {
                    languageCode: LanguageCode.en,
                    value: 'Merchant ID ',
                },
            ],
            ui: {
                tab: 'Esewa Payment Gateway',
            },
        });

        return config;
    },
    compatibility: '^3.0.0',
    entities: [PaymentGatewayTransactions],
})
export class PaymentExtensionPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<PaymentExtensionPlugin> {
        this.options = options;
        return PaymentExtensionPlugin;
    }
}

export const customPaymentHandlerFlowEligibilityChecker = new PaymentMethodEligibilityChecker({
    code: 'custom-payment-handler-flow-eligibility-checker',
    description: [
        { languageCode: LanguageCode.en, value: 'Disables all the order beyond custom payment flow' },
    ],
    args: {
        // isPublicDisabled: { type: 'boolean', ui: { component: 'boolean-form-input' } },
    },
    check: (ctx, order, args) => {
        if (order.customFields.isCustomPaymentHandlerFlow) {
            return true;
        }
        return false;
    },
});
