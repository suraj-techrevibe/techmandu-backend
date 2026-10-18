import { addNavMenuSection } from '@vendure/admin-ui/core';

export default [
    addNavMenuSection(
        {
            id: 'contact',
            label: 'Contact',
            requiresPermission: 'ReadContact',
            items: [
                {
                    id: 'contact-messages',
                    label: 'Messages',
                    routerLink: ['/extensions/contacts'],
                    icon: 'envelope',
                },
            ],
        },
        'marketing',
    ),
];


