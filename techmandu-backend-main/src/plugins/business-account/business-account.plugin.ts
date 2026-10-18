import { LanguageCode, OrderItemPriceCalculationStrategy, PluginCommonModule, VendurePlugin } from '@vendure/core';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import path from 'path';
import { adminApiExtensions } from './api/api-extensions';
import { BusinessAccountAdminResolver } from './api/business-account-admin.resolver';
import { BusinessAccountService } from './services/business-account.service';
import { BusinessAccountPriceStrategy } from './strategies/business-account-price.strategy';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
  interface CustomCustomerFields {
    isBusiness: boolean;
    vatPan: string | null;
    isVerified: boolean;
    businessName: string | null;
  }
  interface CustomGlobalSettingsFields {
    businessAccountExtraDiscount: number;
  }
  interface CustomProductFields {
    isBusinessExclusive: boolean;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [BusinessAccountService, BusinessAccountPriceStrategy],
 
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [BusinessAccountAdminResolver],
  },
  configuration: (config) => {
    config.customFields.Customer.push({
      name: 'isBusiness',
      type: 'boolean',
      defaultValue: false,
      label: [{ languageCode: LanguageCode.en, value: 'Is Business Account' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'Indicates whether this is a business account',
        },
      ],
    });

    config.customFields.Customer.push({
      name: 'vatPan',
      type: 'string',
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'VAT/PAN Number' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'VAT or PAN registration number for business accounts',
        },
      ],
    });

    config.customFields.Customer.push({
      name: 'isVerified',
      type: 'boolean',
      defaultValue: false,
      label: [{ languageCode: LanguageCode.en, value: 'Is Verified' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'Indicates whether the business account has been verified',
        },
      ],
    });

    config.customFields.Customer.push({
      name: 'businessName',
      type: 'string',
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Business Name' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'The name of the business',
        },
      ],
    });

    config.customFields.GlobalSettings.push({
      name: 'businessAccountExtraDiscount',
      type: 'float',
      defaultValue: 0,
      label: [{ languageCode: LanguageCode.en, value: 'Business Account Extra Discount (%)' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'Extra discount percentage applied to verified business accounts on business-exclusive products',
        },
      ],
    });

    config.customFields.Product.push({
      name: 'isBusinessExclusive',
      type: 'boolean',
      defaultValue: false,
      label: [{ languageCode: LanguageCode.en, value: 'Business Exclusive' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'Mark this product as exclusive to business accounts. Business discounts will only apply to business-exclusive products.',
        },
      ],
    });

    config.orderOptions.orderItemPriceCalculationStrategy =  BusinessAccountPriceStrategy as unknown as OrderItemPriceCalculationStrategy

    return config;
  },
  compatibility: '^3.0.0',
})
export class BusinessAccountPlugin {
  static ui: AdminUiExtension = {
    id: 'business-account-ui',
    extensionPath: path.join(__dirname, 'ui'),
    routes: [{ route: 'business-accounts', filePath: 'routes.ts' }],
    providers: ['providers.ts'],
  };
}
