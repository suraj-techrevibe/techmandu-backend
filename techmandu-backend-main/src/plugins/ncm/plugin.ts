import {
  Asset,
  LanguageCode,
  Permission,
  PluginCommonModule,
  VendurePlugin,
} from '@vendure/core';
import {
  insideValleyShippingCalculator,
  NcmShippingCalculator,
} from './shipping/ncm-shipping.calculator';
import { NcmService } from './service/ncm.service';
import { ncmFullfillmentHandler } from './fulfilment/handler';
import { shopApiExtension } from './api/api.extention';
import { NcmResolver } from './resolver/ncm.resolver';
import { insideValleyChecker, ncmChecker } from './checker/checker';
import { NcmEventHandler } from './events/ncm-event-handler';
import path from 'path';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import { NcmWebhookController } from './api/ncm-callback.controller';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
  interface CustomOrderFields {
    creationBranch: string;
    destinationBranch: string;
    ncmTrackingId: string;
    outOfValley: boolean;
    orderNotes: string;
    nearestNcmBranch: string;
  }
   interface CustomChannelFields {
    ncmApiKey: string;
    ncmCreationBranch: string;
  }
  interface CustomGlobalSettingsFields {
    creationBranch: string;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  controllers:[NcmWebhookController],
  providers: [NcmService, NcmEventHandler],
  shopApiExtensions: {
    schema: shopApiExtension,
    resolvers: [NcmResolver],
  },

  configuration: (config) => {
    config.customFields.GlobalSettings.push({
      name: 'creationBranch',
      type: 'string',
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Creation Branch' }],
    });
    config.customFields.Order.push({
      name: 'destinationBranch',
      type: 'string',
      public: false, // set by the server only; customers must not read or write it through the Shop API
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Destination Branch ' }],
    });
    config.customFields.Order.push({
      name: 'ncmTrackingId',
      type: 'string',
      public: false, // set by the server only; customers must not read or write it through the Shop API
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Ncm Tracking Id' }],
    });
    config.customFields.Order.push({
      name: 'nearestNcmBranch',
      type: 'string',
      public: false, // set by the server only; customers must not read or write it through the Shop API
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Nearest NCM Branch' }],
    });
    config.customFields.Product.push({
      name: 'weight',
      type: 'string',
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Weight Of Product' }],
    });
    config.customFields.Product.push({
      name: 'height',
      type: 'string',
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Height Of Product' }],
    });
    config.customFields.Product.push({
      name: 'length',
      type: 'string',
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Length Of Product' }],
    });
    config.customFields.Product.push({
      name: 'width',
      type: 'string',
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Width Of Product' }],
    });
    config.customFields.Order.push({
      name: 'outOfValley',
      type: 'boolean',
      nullable: true,
      defaultValue: false,
      label: [
        { languageCode: LanguageCode.en, value: 'Is order Out of  Valley' },
      ],
    });
    config.customFields.Order.push({
      name: 'orderNotes',
      type: 'string',
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Order Notes' }],
    });
    config.customFields.Order.push({
      name: 'estimatedDeliveryDate',
      type: 'datetime',
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Delivery Date' }],
    });
    config.customFields.Channel.push({
      name: 'ncmApiKey',
      type: 'string',
      nullable: true,
      ui: {
        tab: 'Shipping',
      },
      label: [{ languageCode: LanguageCode.en, value: 'NCM API Key' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'Token issued by Nepal Can Move for API access.',
        },
      ],
    });
    config.customFields.Channel.push({
      name: 'ncmCreationBranch',
      type: 'string',
      nullable: true,
      ui: {
        tab: 'Shipping',
      },
      label: [{ languageCode: LanguageCode.en, value: 'NCM Creation Branch' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'Branch code used as the pickup branch for NCM shipments.',
        },
      ],
    });


    config.customFields.Order.push({
    name: 'ncmQuote',
    type: 'text',
    public: false, // set by the server only; customers must not read or write it through the Shop API
    nullable: true,
    label: [{ languageCode: LanguageCode.en, value: 'NCM Shipping Quote Cache' }],
    });


    config.shippingOptions.shippingCalculators.push(NcmShippingCalculator);
    config.shippingOptions.shippingCalculators.push(
      insideValleyShippingCalculator
    );
    config.shippingOptions.fulfillmentHandlers.push(ncmFullfillmentHandler);
    config.shippingOptions.shippingEligibilityCheckers.push(ncmChecker);
    config.shippingOptions.shippingEligibilityCheckers.push(
      insideValleyChecker
    );



    return config;
  },
})
export class NcmPlugin {
  static ui: AdminUiExtension = {
    id: 'ncm-plugin',
    extensionPath: path.join(__dirname, 'ui'),
    providers: ['providers.ts'],
  };
}
