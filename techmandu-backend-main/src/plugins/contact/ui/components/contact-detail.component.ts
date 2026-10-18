import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService, DeletionResult, NotificationService, SharedModule } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

interface Contact {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    emailAddress: string;
    phone: string;
    subject: string;
    message: string;
}

interface GetContactQuery {
    contact: Contact | null;
}

interface DeleteContactMutation {
    deleteContact: {
        result: DeletionResult;
        message?: string | null;
    };
}

const GET_CONTACT = gql`
    query GetContact($id: ID!) {
        contact(id: $id) {
            id
            createdAt
            updatedAt
            name
            emailAddress
            phone
            subject
            message
        }
    }
`;

const DELETE_CONTACT = gql`
    mutation DeleteContact($id: ID!) {
        deleteContact(id: $id) {
            result
            message
        }
    }
`;

@Component({
    selector: 'vdr-contact-detail',
    templateUrl: './contact-detail.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule],
})
export class ContactDetailComponent {
    readonly contact$: Observable<Contact | null> = this.route.paramMap.pipe(
        map(params => params.get('id')),
        switchMap(id =>
            this.dataService
                .query<GetContactQuery, { id: string }>(GET_CONTACT, { id: id ?? '' })
                .mapStream(result => result.contact),
        ),
    );

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private dataService: DataService,
        private notificationService: NotificationService,
    ) {}

    delete(id: string): void {
        this.dataService
            .mutate<DeleteContactMutation, { id: string }>(DELETE_CONTACT, { id })
            .pipe(take(1))
            .subscribe(({ deleteContact }) => {
                if (deleteContact.result === DeletionResult.DELETED) {
                    this.notificationService.success('common.notify-delete-success', {
                        entity: 'Contact message',
                    });
                    this.router.navigate(['/extensions', 'contacts']);
                } else {
                    const message = deleteContact.message || 'Unable to delete contact message';
                    this.notificationService.error(message);
                }
            });
    }
}


