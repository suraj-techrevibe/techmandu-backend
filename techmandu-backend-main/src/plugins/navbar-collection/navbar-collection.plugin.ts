import { LanguageCode, PluginCommonModule, VendurePlugin } from '@vendure/core';
import { NavbarCollectionResolver } from './api/navbar-collection.resolver';
import { shopApiExtension } from './api/api-extension';


@VendurePlugin({
  imports: [PluginCommonModule],
  shopApiExtensions: {
    schema: shopApiExtension,
    resolvers: [NavbarCollectionResolver],
  },
  configuration: config => {
    config.customFields.Collection.push({
      name: 'showInNavBar',
      type: 'boolean',
      defaultValue: false,
      label: [
        { languageCode: LanguageCode.en, value: 'Show in Navbar' },
      ],
      description: [
        { languageCode: LanguageCode.en, value: 'If enabled, this collection will appear in the navbar' },
      ],
    });
    return config;
  },
  compatibility: "^3.0.0",

})
export class NavbarCollectionPlugin {}
