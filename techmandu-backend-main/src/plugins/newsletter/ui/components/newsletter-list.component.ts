import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DataService, DeletionResult, NotificationService, SharedModule } from '@vendure/admin-ui/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, shareReplay, switchMap, take, tap } from 'rxjs/operators';
import gql from 'graphql-tag';

interface NewsletterSubscriber {
    id: string;
    email: string;
    name?: string | null;
    createdAt: string;
    source?: string | null;
}

interface NewsletterSubscriberList {
    items: NewsletterSubscriber[];
    totalItems: number;
}

interface GetNewsletterSubscribersQuery {
    newsletterSubscribers: NewsletterSubscriberList;
}

interface DeleteNewsletterSubscriberMutation {
    deleteNewsletterSubscriber: {
        result: DeletionResult;
        message?: string | null;
    };
}

const GET_NEWSLETTER_SUBSCRIBERS = gql`
    query GetNewsletterSubscribers($options: NewsletterSubscriberListOptions) {
        newsletterSubscribers(options: $options) {
            items {
                id
                email
                name
                source
                createdAt
            }
            totalItems
        }
    }
`;

const DELETE_NEWSLETTER_SUBSCRIBER = gql`
    mutation DeleteNewsletterSubscriber($id: ID!) {
        deleteNewsletterSubscriber(id: $id) {
            result
            message
        }
    }
`;

@Component({
    selector: 'vdr-newsletter-list',
    templateUrl: './newsletter-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule],
})
export class NewsletterListComponent {
    readonly defaultItemsPerPage = 25;
    private readonly currentPageSubject = new BehaviorSubject<number>(1);
    private readonly itemsPerPageSubject = new BehaviorSubject<number>(this.defaultItemsPerPage);
    private latestListSnapshot: NewsletterSubscriberList | null = null;

    readonly currentPage$: Observable<number> = this.currentPageSubject.asObservable();

    readonly itemsPerPage$: Observable<number> = this.itemsPerPageSubject.asObservable();

    private readonly pagination$ = combineLatest([this.currentPage$, this.itemsPerPage$]);

    readonly list$: Observable<NewsletterSubscriberList> = this.pagination$.pipe(
        switchMap(([page, take]) =>
            this.dataService
                .query<GetNewsletterSubscribersQuery, { options: { take: number; skip: number } }>(
                    GET_NEWSLETTER_SUBSCRIBERS,
                    {
                        options: {
                            take,
                            skip: (page - 1) * take,
                        },
                    },
                )
                .mapStream(result => result.newsletterSubscribers),
        ),
        tap(list => (this.latestListSnapshot = list)),
        shareReplay(1),
    );

    readonly items$: Observable<NewsletterSubscriber[]> = this.list$.pipe(map(list => list.items));
    readonly totalItems$: Observable<number> = this.list$.pipe(map(list => list.totalItems));
    readonly hasNameColumn$: Observable<boolean> = this.list$.pipe(
        map(list => list.items.some(item => !!item.name?.trim())),
    );

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

    deleteSubscriber(id: string): void {
        this.dataService
            .mutate<DeleteNewsletterSubscriberMutation, { id: string }>(DELETE_NEWSLETTER_SUBSCRIBER, { id })
            .pipe(take(1))
            .subscribe(({ deleteNewsletterSubscriber }) => {
                if (deleteNewsletterSubscriber.result === DeletionResult.DELETED) {
                    this.notificationService.success('common.notify-delete-success');
                    const shouldGoBackOnePage =
                        !!this.latestListSnapshot &&
                        this.latestListSnapshot.items.length === 1 &&
                        this.currentPageSubject.value > 1;
                    const targetPage = shouldGoBackOnePage
                        ? this.currentPageSubject.value - 1
                        : this.currentPageSubject.value;
                    this.currentPageSubject.next(targetPage);
                } else {
                    const message = deleteNewsletterSubscriber.message || 'Unable to delete subscriber';
                    this.notificationService.error(message);
                }
            });
    }

    exportCsv(): void {
        const totalItems = this.latestListSnapshot?.totalItems ?? 0;
        if (totalItems === 0) {
            this.notificationService.info('No subscribers to export yet.');
            return;
        }

        this.dataService
            .query<GetNewsletterSubscribersQuery, { options: { take: number; skip: number } }>(
                GET_NEWSLETTER_SUBSCRIBERS,
                {
                    options: {
                        take: totalItems,
                        skip: 0,
                    },
                },
            )
            .mapStream(result => result.newsletterSubscribers.items)
            .pipe(take(1))
            .subscribe((subscribers: NewsletterSubscriber[]) => {
                const csvContent = this.buildCsv(subscribers);
                this.triggerDownload(csvContent, 'newsletter-subscribers.csv');
            });
    }

    private buildCsv(subscribers: NewsletterSubscriber[]): string {
        const header = ['Email', 'Name', 'Source', 'CreatedAt'];
        const rows = subscribers.map(subscriber => [
            subscriber.email,
            subscriber.name ?? '',
            subscriber.source ?? '',
            subscriber.createdAt,
        ]);
        return [header, ...rows]
            .map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(','))
            .join('\r\n');
    }

    private triggerDownload(content: string, filename: string): void {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        link.click();
        URL.revokeObjectURL(link.href);
    }
}