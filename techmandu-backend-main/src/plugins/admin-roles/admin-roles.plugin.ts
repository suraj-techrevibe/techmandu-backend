import * as path from 'path';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { ADMIN_ROLES_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: ADMIN_ROLES_PLUGIN_OPTIONS, useFactory: () => AdminRolesPlugin.options }],
    configuration: config => {
        // Plugin-specific configuration
        // such as custom fields, custom permissions,
        // strategies etc. can be configured here by
        // modifying the `config` object.
        return config;
    },
    compatibility: '^3.0.0',
})
export class AdminRolesPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<AdminRolesPlugin> {
        this.options = options;
        return AdminRolesPlugin;
    }

    static ui: AdminUiExtension = {
        id: 'admin-roles-ui',
        extensionPath: path.join(__dirname, 'ui'),
        routes: [{ route: 'seller', filePath: 'routes.ts' }],
        providers: ['providers.ts'],
    };
}
