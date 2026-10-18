import { registerRouteComponent } from '@vendure/admin-ui/core';
import { NewsletterListComponent } from './components/newsletter-list.component';

export default [
    registerRouteComponent({
        component: NewsletterListComponent,
        path: '',
        breadcrumb: 'Newsletter Subscribers',
    }),
];