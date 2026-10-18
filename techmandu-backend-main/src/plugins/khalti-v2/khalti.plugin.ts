import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { KHALTI_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { KhaltiController } from './khalti-controller';

@VendurePlugin({
    imports: [PluginCommonModule],
    controllers: [KhaltiController],
    providers: [{ provide: KHALTI_PLUGIN_OPTIONS, useFactory: () => KhaltiPlugin.options }],
    configuration: config => {
        // Plugin-specific configuration
        // such as custom fields, custom permissions,
        // strategies etc. can be configured here by
        // modifying the `config` object.
        return config;
    },
    compatibility: '^3.0.0',
})
export class KhaltiPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<KhaltiPlugin> {
        this.options = options;
        return KhaltiPlugin;
    }
}
