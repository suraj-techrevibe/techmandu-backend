import { addNavMenuSection } from '@vendure/admin-ui/core';
import { addNavMenuItem } from '@vendure/admin-ui/core';

export default [
    addNavMenuSection(
        {
            id: 'bidding-history',
            label: 'Bidding History',
            requiresPermission: "SuperAdmin",
            items: [
                {
                    id: 'list-all-biddings',
                    label: 'Bidding History',
                    routerLink: ['/extensions/bidding-history'],
                    icon: 'line-chart',
                },
            ],
        },
        'settings',
    ),
];
