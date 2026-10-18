import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import { BulkAction, DataService, ItemOf, ModalService, NotificationService } from '@vendure/admin-ui/core';
import { EMPTY } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DeletePageGroupsDocument, GetPageGroupsQuery, Permission } from '../../generated/graphql';

export const deletePageGroupBulkAction: BulkAction<ItemOf<GetPageGroupsQuery, 'pageGroups'>> = {
    location: 'page-group-list',
    label: 'Delete',
    icon: 'trash',
    iconClass: 'text-danger',
    requiresPermission: Permission.DeletePage,
    onClick: ({ injector, selection, clearSelection, hostComponent }) => {
        const modalService = injector.get(ModalService);
        const dataService = injector.get(DataService);
        const notificationService = injector.get(NotificationService);

        const name = selection.map(page => page.name ?? '').join(', ');

        modalService
            .dialog({
                title: 'Confirm Delete Page Groups',
                body: `Deleting these Page Group (${name}) will also remove them from all channels. Are you sure you want to continue?`,
                buttons: [
                    { type: 'secondary', label: _('common.cancel') },
                    { type: 'danger', label: _('common.delete'), returnValue: true },
                ],
            })
            .pipe(
                switchMap(response =>
                    response
                        ? dataService.mutate(DeletePageGroupsDocument, {
                              ids: selection.map(p => p.id),
                          })
                        : EMPTY,
                ),
            )
            .subscribe({
                next: res => {
                    if (res.deletePageGroup?.result === 'DELETED') {
                        notificationService.success('All selected Page Group deleted successfully.');
                    } else {
                        notificationService.error(
                            res.deletePageGroup?.message || 'Failed to delete Page Group.',
                        );
                    }
                    clearSelection();
                    hostComponent?.refresh?.();
                },
                error: () => {
                    notificationService.error('An unexpected error occurred while deleting Page Group.');
                    clearSelection();
                },
            });
    },
};
