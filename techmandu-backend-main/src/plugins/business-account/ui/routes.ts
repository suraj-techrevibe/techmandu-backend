import { registerRouteComponent } from '@vendure/admin-ui/core';
import { BusinessAccountListComponent } from './components/business-account-list/business-account-list.component';
import { BusinessAccountDetailComponent } from './components/business-account-detail/business-account-detail.component';

export default [
    // LIST (default)
    registerRouteComponent({
        path: '',
        component: BusinessAccountListComponent,
        title: 'Business Accounts',
        breadcrumb: 'Business Accounts',
    }),

    // DETAIL (DYNAMIC)
    registerRouteComponent({
        path: ':id',
        component: BusinessAccountDetailComponent,
        title: 'Business Account Detail',
        breadcrumb: [
            {
                label: 'Business Accounts',
                link: ['/extensions', 'business-accounts'],
            },
            {
                label: 'Detail',
                link: ['/extensions', 'business-accounts', ':id'],
            },
        ],
    }),
];

