import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import * as path from 'path';

import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { ContactAdminResolver } from './api/contact-admin.resolver';
import { ContactShopResolver } from './api/contact-shop.resolver';
import { CONTACT_PLUGIN_OPTIONS, contactPermission } from './constants';
import { Contact } from './entities/contact.entity';
import { ContactService } from './services/contact.service';
import { PluginInitOptions } from './types';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: CONTACT_PLUGIN_OPTIONS, useFactory: () => ContactPlugin.options }, ContactService],
    configuration: config => {
        config.authOptions.customPermissions.push(contactPermission);
        return config;
    },
    compatibility: '^3.0.0',
    entities: [Contact],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [ContactAdminResolver],
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [ContactShopResolver],
    },
})
export class ContactPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<ContactPlugin> {
        this.options = options;
        return ContactPlugin;
    }

    static ui: AdminUiExtension = {
        id: 'contact-ui',
        extensionPath: path.join(__dirname, 'ui'),
        routes: [{ route: 'contacts', filePath: 'routes.ts' }],
        providers: ['providers.ts'],
    };
}
