import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import path from 'path';
import { blogsPermission } from './constants';
import { Blog } from './entities/blog-entity';
import { BlogsAdminResolver } from './graphql/blogs/blogs-admin.resolver';
import { BlogsShopResolver } from './graphql/blogs/blogs-shop.resolver';
import { BlogsService } from './graphql/blogs/blogs.service';
import {
  adminApiExtensions,
  shopApiExtensions,
} from './graphql/schema-extensions.graphql';

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [Blog],
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [BlogsAdminResolver],
  },
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [BlogsShopResolver],
  },
  providers: [BlogsService],
  configuration: (config) => {
    config.authOptions.customPermissions.push(blogsPermission);
    return config;
  },
})
export class BlogsPlugin {
  static ui: AdminUiExtension = {
    id: 'blogs-ui',
    extensionPath: path.join(__dirname, 'ui'),
    routes: [{ route: 'blogs', filePath: 'routes.ts' }],
    providers: ['providers.ts'],
  };
}
