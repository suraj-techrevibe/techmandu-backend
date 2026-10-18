import { registerRouteComponent } from '@vendure/admin-ui/core';
import { PageGroupListComponent } from './components/page-group-list/page-group-list.component';
import { PageGroupDetailComponent } from './components/page-group-detail/page-group-detail.component';
import { GetPageGroupDocument } from './generated/graphql';

export default [
    registerRouteComponent({
        component: PageGroupListComponent,
        path: '',
        title: 'Page Groups',
        breadcrumb: 'Page Groups',
    }),
    registerRouteComponent({
        path: ':id',
        component: PageGroupDetailComponent,
        query: GetPageGroupDocument,
        entityKey: 'pageGroup',
        getBreadcrumbs: entity => {
            return [
                { label: 'Page Groups', link: ['/extensions', 'page-groups'] },
                { label: entity?.name ?? 'New Page Group', link: [] },
            ];
        },
    }),
];
