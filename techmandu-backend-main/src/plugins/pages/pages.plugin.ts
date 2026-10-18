import path from 'path';
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import { Page } from './entities/page.entity';
import { PageTranslation } from './entities/page-translation.entity';
import { adminApiExtensions, shopApiExtensions } from './api/extension';
import { PageAdminResolver } from './api/admin.resolver';
import { PageShopResolver } from './api/shop.resolver';
import { PageService } from './services/page.service';
import { pagePermission } from './constants';
import { PageGroup } from './entities/page-group.entity';
import { PageGroupTranslation } from './entities/page-group-translation.entity';
import { PageGroupService } from './services/page-group.service';
import { PageGroupEntityResolver } from './api/page-group-entity.resolver';
import { PageEntityResolver } from './api/page-entity.resolver';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [PageGroupService, PageService],
    entities: [Page, PageTranslation, PageGroup, PageGroupTranslation],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [PageAdminResolver, PageEntityResolver, PageGroupEntityResolver],
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [PageShopResolver, PageEntityResolver, PageGroupEntityResolver],
    },
    configuration: config => {
        config.authOptions.customPermissions.push(pagePermission);
        return config;
    },
    compatibility: '^3.0.0',
})
export class PagePlugin {
    static ui: AdminUiExtension = {
        extensionPath: path.join(__dirname, './ui'),
        id: 'page',
        providers: ['providers.ts'],
        routes: [
            {
                filePath: 'routes.ts',
                route: 'page',
            },
            {
                route: 'page-groups',
                filePath: 'groups.routes.ts',
            },
        ],
    };
}
