import { addNavMenuSection } from '@vendure/admin-ui/core';
import { registerBulkAction } from '@vendure/admin-ui/core';
import {
    assignPagesToChannelsBulkAction,
    deletePagesBulkAction,
    removePagesFromChannelBulkAction,
} from './components/page-list/bulk-actions';
import { Permission } from './generated/graphql';
import { deletePageGroupBulkAction } from './components/page-group-list/page-group-bulk.component';

export default [
    registerBulkAction(assignPagesToChannelsBulkAction),
    registerBulkAction(removePagesFromChannelBulkAction),
    registerBulkAction(deletePagesBulkAction),
    registerBulkAction(deletePageGroupBulkAction),
    addNavMenuSection(
        {
            id: 'static-pages',
            label: 'Static Pages',
            requiresPermission:'SuperAdmin',
            items: [
                {
                    id: 'page',
                    label: 'Page',
                    requiresPermission: Permission.ReadPage,
                    icon: 'file-group',
                    routerLink: ['extensions', 'page'],
                },
                {
                    id: 'page-groups',
                    label: 'Page Groups',
                    requiresPermission: Permission.ReadPage,
                    icon: 'folder-open',
                    routerLink: ['extensions', 'page-groups'],
                },
            ],
        },
        'settings',
    ),
];
