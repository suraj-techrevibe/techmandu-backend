import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { CHANNEL_OVERRIDE_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { ChannelResolver } from './api/channel-override-admin-resolver';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: CHANNEL_OVERRIDE_PLUGIN_OPTIONS, useFactory: () => ChannelOverridePlugin.options }],
    configuration: config => {
        // Plugin-specific configuration
        // such as custom fields, custom permissions,
        // strategies etc. can be configured here by
        // modifying the `config` object.
        return config;
    },
    compatibility: '^3.0.0',
    adminApiExtensions:{
        resolvers:[ChannelResolver]
    }
})
export class ChannelOverridePlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<ChannelOverridePlugin> {
        this.options = options;
        return ChannelOverridePlugin;
    }
}
