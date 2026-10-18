import { addNavMenuSection } from '@vendure/admin-ui/core';

export default [
    addNavMenuSection(
        {
            id: 'business-accounts',
            label: 'Business Accounts',
            requiresPermission: 'SuperAdmin',
            items: [
                {
                    id: 'business-accounts-list',
                    label: 'All Accounts',
                    routerLink: ['extensions', 'business-accounts'],
                    icon: 'building',
                },
            ],
        },
        'customers',
    ),
];

