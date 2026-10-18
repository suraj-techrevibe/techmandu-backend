import { addNavMenuItem, Permission } from '@vendure/admin-ui/core';

export default [
  addNavMenuItem(
    {
      id: 'customer-promotion-usage',
      label: 'Customer Promotion Usage',
      requiresPermission:Permission.SuperAdmin,
      routerLink: ['/extensions/loyalty-points'],
      icon: 'tag',
    },
    'marketing', 
  ),
];
