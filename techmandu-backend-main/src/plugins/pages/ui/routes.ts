import { registerRouteComponent } from '@vendure/admin-ui/core';
import { PageDetailCompnent } from './components/page-detail/page-detail.component';
import { PageListComponent } from './components/page-list/page-list.component';
import { GetPageDetailDocument } from './generated/graphql';

export default [
    registerRouteComponent({
        component: PageListComponent,
        path: '',
        breadcrumb: 'Pages',
    }),
    registerRouteComponent({
        path: ':id',
        component: PageDetailCompnent,
        query: GetPageDetailDocument,
        entityKey: 'page',
        getBreadcrumbs(entity) {
            return [
                {
                    label: 'Page',
                    link: ['/extensions', 'page'],
                },
                {
                    label: `${entity ? `${entity?.title}` : ''}`,
                    link: [],
                },
            ];
        },
    }),
];
