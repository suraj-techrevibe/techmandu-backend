import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DataService, DeletionResult, NotificationService, SharedModule } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, shareReplay, switchMap, take, tap } from 'rxjs/operators';

interface Contact {
    id: string;
    createdAt: string;
    name: string;
    emailAddress: string;
    phone: string;
    subject: string;
}

interface ContactList {
    items: Contact[];
    totalItems: number;
}

interface GetContactsQuery {
    contacts: ContactList;
}

interface DeleteContactMutation {
    deleteContact: {
        result: DeletionResult;
        message?: string | null;
    };
}

const GET_CONTACTS = gql`
    query GetContacts($options: ContactListOptions) {
        contacts(options: $options) {
            items {
                id
                createdAt
                name
                emailAddress
                phone
                subject
            }
            totalItems
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
    selector: 'vdr-contact-list',
    templateUrl: './contact-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule],
})
export class ContactListComponent {
    readonly defaultItemsPerPage = 25;
    private readonly currentPageSubject = new BehaviorSubject<number>(1);
    private readonly itemsPerPageSubject = new BehaviorSubject<number>(this.defaultItemsPerPage);
    private latestListSnapshot: ContactList | null = null;

    readonly currentPage$: Observable<number> = this.currentPageSubject.asObservable();
    readonly itemsPerPage$: Observable<number> = this.itemsPerPageSubject.asObservable();

    private readonly pagination$ = combineLatest([this.currentPage$, this.itemsPerPage$]);

    readonly list$: Observable<ContactList> = this.pagination$.pipe(
        switchMap(([page, takeCount]) =>
            this.dataService
                .query<GetContactsQuery, { options: { take: number; skip: number } }>(GET_CONTACTS, {
                    options: {
                        take: takeCount,
                        skip: (page - 1) * takeCount,
                    },
                })
                .mapStream(result => result.contacts),
        ),
        tap(list => (this.latestListSnapshot = list)),
        shareReplay(1),
    );

    readonly items$: Observable<Contact[]> = this.list$.pipe(map(list => list.items));
    readonly totalItems$: Observable<number> = this.list$.pipe(map(list => list.totalItems));

    constructor(
        private dataService: DataService,
        private notificationService: NotificationService,
    ) {}

    setPageNumber(page: number): void {
        this.currentPageSubject.next(page);
    }

    setItemsPerPage(perPage: number): void {
        this.itemsPerPageSubject.next(perPage);
        this.currentPageSubject.next(1);
    }

    deleteContact(id: string): void {
        this.dataService
            .mutate<DeleteContactMutation, { id: string }>(DELETE_CONTACT, { id })
            .pipe(take(1))
            .subscribe(({ deleteContact }) => {
                if (deleteContact.result === DeletionResult.DELETED) {
                    this.notificationService.success('common.notify-delete-success', {
                        entity: 'Contact message',
                    });
                    const shouldGoBackOnePage =
                        !!this.latestListSnapshot &&
                        this.latestListSnapshot.items.length === 1 &&
                        this.currentPageSubject.value > 1;
                    const targetPage = shouldGoBackOnePage
                        ? this.currentPageSubject.value - 1
                        : this.currentPageSubject.value;
                    this.currentPageSubject.next(targetPage);
                } else {
                    const message = deleteContact.message || 'Unable to delete contact message';
                    this.notificationService.error(message);
                }
            });
    }
}


