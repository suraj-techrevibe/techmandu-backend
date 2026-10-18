import { addNavMenuSection } from '@vendure/admin-ui/core';
import { addNavMenuItem } from '@vendure/admin-ui/core';
import { Permission } from './generated/graphql';

export default [
  addNavMenuItem(
    {
      id: 'blogs',
      label: 'Blogs',
      requiresPermission: Permission.ReadBlogs,
      routerLink: ['/extensions/blogs'],
      icon: 'file',
    },
    'cms'
  ),
];
