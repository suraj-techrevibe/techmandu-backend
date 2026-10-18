import { LanguageCode, PluginCommonModule, VendurePlugin } from '@vendure/core';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
  interface CustomAddressFields {
    vat: string | null;
  }
  interface CustomChannelFields {
    pickupLocation: string | null;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: (config) => {
    config.customFields.Address.push({
      name: 'vat',
      type: 'string',
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'VAT Number' }],
    });

    config.customFields.Channel.push({
      name: 'pickupLocation',
      type: 'string',
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Pickup Location' }],
    });
    
    return config;
  },
})
export class AddressExtensionsPlugin {}
