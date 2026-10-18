import { addNavMenuSection } from '@vendure/admin-ui/core';
import { addNavMenuItem } from '@vendure/admin-ui/core';

export default [
    addNavMenuSection(
        {
            id: 'seller-registrations',
            label: 'Vendor Registrations',
            requiresPermission:"SuperAdmin",
            items: [
                {
                    id: 'list-all-sellers',
                    label: 'Vendor Registrations',
                    routerLink: ['/extensions/vendor-registrations'],
                    icon: 'users',
                },
                {
                    id: 'list-verified-sellers',
                    label: 'Verified Vendors',
                    routerLink: ['/extensions/vendor-registrations/verified-vendor'],
                    icon: 'check-circle',
                },
            ],
        },
        'settings',
    ),
];
