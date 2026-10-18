import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import * as path from 'path';

import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { NewsletterSubscriberAdminResolver } from './resolvers/newsletter-subscriber-admin.resolver';
import { NewsletterSubscriberShopResolver } from './resolvers/newsletter-subscriber-shop.resolver';
import { MANAGE_NEWSLETTER_PERMISSION, NEWSLETTER_PLUGIN_OPTIONS } from './constants';
import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity';
import { NewsletterSubscriberService } from './services/newsletter-subscriber.service';
import { PluginInitOptions, ResolvedNewsletterPluginOptions, defaultPluginInitOptions } from './types';
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        { provide: NEWSLETTER_PLUGIN_OPTIONS, useFactory: () => NewsletterPlugin.options },
        NewsletterSubscriberService,
    ],
    configuration: config => {
        if (!config.authOptions.customPermissions.includes(MANAGE_NEWSLETTER_PERMISSION)) {
            config.authOptions.customPermissions.push(MANAGE_NEWSLETTER_PERMISSION);
        }

        return config;
    },
    compatibility: '^3.0.0',
    entities: [NewsletterSubscriber],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [NewsletterSubscriberAdminResolver],
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [NewsletterSubscriberShopResolver],
    },
})
export class NewsletterPlugin {
    static options: ResolvedNewsletterPluginOptions = defaultPluginInitOptions;

    static init(options: PluginInitOptions = {}): Type<NewsletterPlugin> {
        this.options = {
            ...defaultPluginInitOptions,
            ...options,
        };
        return NewsletterPlugin;
    }

    static ui: AdminUiExtension = {
        id: 'newsletter-ui',
        extensionPath: path.join(__dirname, 'ui'),
        routes: [{ route: 'newsletter', filePath: 'routes.ts' }],
        providers: ['providers.ts'],
    };
}