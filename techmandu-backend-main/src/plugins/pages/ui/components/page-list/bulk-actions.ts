import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    BulkAction,
    createBulkAssignToChannelAction,
    createBulkRemoveFromChannelAction,
    DataService,
    ItemOf,
    ModalService,
    NotificationService,
} from '@vendure/admin-ui/core';
import { EMPTY } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
    AssignPagesToChannelsDocument,
    DeletePagesDocument,
    GetPageListQuery,
    Permission,
    RemovePagesFromCurrentChannelDocument,
} from '../../generated/graphql';

export const deletePagesBulkAction: BulkAction<ItemOf<GetPageListQuery, 'pages'>> = {
    location: 'page-list',
    label: 'Delete',
    icon: 'trash',
    iconClass: 'text-danger',
    requiresPermission: Permission.DeletePage,
    onClick: ({ injector, selection, clearSelection, hostComponent }) => {
        const modalService = injector.get(ModalService);
        const dataService = injector.get(DataService);
        const notificationService = injector.get(NotificationService);

        const titles = selection.map(page => page.title ?? '').join(', ');

        modalService
            .dialog({
                title: 'Confirm Delete Pages',
                body: `Deleting these Pages (${titles}) will also remove them from all channels. Are you sure you want to continue?`,
                buttons: [
                    { type: 'secondary', label: _('common.cancel') },
                    { type: 'danger', label: _('common.delete'), returnValue: true },
                ],
            })
            .pipe(
                switchMap(response =>
                    response
                        ? dataService.mutate(DeletePagesDocument, {
                              ids: selection.map(p => p.id),
                          })
                        : EMPTY,
                ),
            )
            .subscribe({
                next: res => {
                    if (res.deletePage?.result === 'DELETED') {
                        notificationService.success('All selected Pages deleted successfully.');
                    } else {
                        notificationService.error(res.deletePage?.message || 'Failed to delete Pages.');
                    }
                    clearSelection();
                    hostComponent?.refresh?.();
                },
                error: () => {
                    notificationService.error('An unexpected error occurred while deleting Pages.');
                    clearSelection();
                },
            });
    },
};

export const assignPagesToChannelsBulkAction: BulkAction<ItemOf<GetPageListQuery, 'pages'>> =
    createBulkAssignToChannelAction<ItemOf<GetPageListQuery, 'pages'>>({
        location: 'page-list',
        requiresPermission: Permission.UpdatePage,
        getItemName: item => item.title ?? '',
        bulkAssignToChannel: (dataService, pageIds, channelIds) => {
            return channelIds.map(channelId =>
                dataService
                    .mutate(AssignPagesToChannelsDocument, {
                        input: {
                            channelIds: [channelId],
                            pageIds,
                        },
                    })
                    .pipe(map(res => res.assignPagesToChannels)),
            );
        },
    });

export const removePagesFromChannelBulkAction = createBulkRemoveFromChannelAction<
    ItemOf<GetPageListQuery, 'pages'>
>({
    location: 'page-list',
    requiresPermission: Permission.UpdatePage,
    getItemName: item => item.title ?? '',
    bulkRemoveFromChannel: (dataService, pageIds) =>
        dataService
            .mutate(RemovePagesFromCurrentChannelDocument, { pageIds })
            .pipe(map(res => res.removePagesFromCurrentChannel)),
});
