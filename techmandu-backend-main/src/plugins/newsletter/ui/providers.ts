import { addNavMenuSection } from '@vendure/admin-ui/core';

export default [
    addNavMenuSection(
        {
            id: 'newsletter',
            label: 'Newsletter',
            requiresPermission:'SuperAdmin',
            items: [
                {
                    id: 'newsletter-subscribers',
                    label: 'Subscribers',
                    routerLink: ['extensions', 'newsletter'],
                    icon: 'envelope',
                },
            ],
        },
        'marketing',
    ),
];