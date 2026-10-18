import { addNavMenuSection } from '@vendure/admin-ui/core';

export default [
    addNavMenuSection(
        {
            id: 'banners',
            label: 'Banners',
            requiresPermission:'SuperAdmin',
            items: [
                {
                    id: 'banner-list',
                    label: 'Banner List',
                    routerLink: ['/extensions/banners'],
                    icon: 'image-gallery',
                },
            ],
        },
        'marketing' 
    ),
];