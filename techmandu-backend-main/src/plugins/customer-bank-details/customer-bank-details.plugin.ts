import { LanguageCode, PluginCommonModule, VendurePlugin } from '@vendure/core';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
  interface CustomCustomerFields {
    bankAccount: {
      bankName: string;
      accountNumber: string;
      branchName: string;
    } | null;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: (config) => {
    config.customFields.Customer.push({
      name: 'bankAccount',
      type: 'struct',
      label: [{ languageCode: LanguageCode.en, value: 'Bank Account Details' }],
      fields: [
        {
          name: 'bankName',
          type: 'string',
          label: [{ languageCode: LanguageCode.en, value: 'Bank Name' }],
        },
        {
          name: 'accountNumber',
          type: 'string',
          label: [{ languageCode: LanguageCode.en, value: 'Account Number' }],
        },
        {
          name: 'branchName',
          type: 'string',
          label: [{ languageCode: LanguageCode.en, value: 'Branch Name' }],
        },
      ],
    });

    return config;
  },
})
export class CustomerBankDetailsPlugin {}
