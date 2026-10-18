import { registerRouteComponent } from '@vendure/admin-ui/core';
import { ContactDetailComponent } from './components/contact-detail.component';
import { ContactListComponent } from './components/contact-list.component';

export default [
    registerRouteComponent({
        component: ContactListComponent,
        path: '',
        breadcrumb: 'Contact messages',
    }),
    registerRouteComponent({
        component: ContactDetailComponent,
        path: ':id',
        breadcrumb: [
            {
                label: 'Contact messages',
                link: ['/extensions', 'contacts'],
            },
            {
                label: 'Message detail',
                link: [],
            },
        ],
    }),
];


