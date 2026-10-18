import { registerRouteComponent } from '@vendure/admin-ui/core';
import { SellerRegistrationListComponent } from './components/seller-registrations-list/seller-registration-list.component';
import { SellerRegistrationDetailComponent } from './components/seller-registrations-detail/seller-registration-detail.component';
import { VerifiedSellerRegistrationListComponent } from './components/seller-registrations-verified-list/verified-seller-registration-list.component';

export default [
    // LIST (default)
    registerRouteComponent({
        path: '',
        component: SellerRegistrationListComponent,
        title: 'Vendor Registrations',
        breadcrumb: 'Vendor Registrations',
    }),

    // VERIFIED LIST (STATIC PATH MUST COME BEFORE :id)
    registerRouteComponent({
        path: 'verified-vendor',
        component: VerifiedSellerRegistrationListComponent,
        title: 'Verified Vendor Registrations',
        breadcrumb: 'Verified Vendor Registrations',
    }),

    // DETAIL (DYNAMIC — ALWAYS LAST)
    registerRouteComponent({
        path: ':id',
        component: SellerRegistrationDetailComponent,
        title: 'Vendor Registration Detail',
        breadcrumb: [
            {
                label: 'Vendor Registrations',
                link: ['/extensions', 'vendor-registrations'],
            },
            {
                label: 'Detail',
                link: ['/extensions', 'vendor-registrations', ':id'],
            },
        ],
    }),
];
