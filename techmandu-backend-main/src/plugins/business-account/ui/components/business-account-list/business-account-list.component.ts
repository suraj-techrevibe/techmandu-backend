import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';
import { DataService, SharedModule, NotificationService } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';

interface BusinessAccount {
  id: string;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string;
  phoneNumber: string | null;
  customFields: {
    isBusiness: boolean;
    vatPan: string | null;
    isVerified: boolean;
    businessName: string | null;
  };
}

interface BusinessAccountList {
  items: BusinessAccount[];
  totalItems: number;
}

interface GetBusinessAccountsQuery {
  businessAccounts: BusinessAccountList;
}

const GET_BUSINESS_ACCOUNTS = gql`
  query GetBusinessAccounts($options: CustomerListOptions) {
    businessAccounts(options: $options) {
      items {
        id
        createdAt
        firstName
        lastName
        emailAddress
        phoneNumber
        customFields {
          isBusiness
          vatPan
          isVerified
          businessName
        }
      }
      totalItems
    }
  }
`;

@Component({
  selector: 'vdr-business-account-list',
  templateUrl: './business-account-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [SharedModule],
})
export class BusinessAccountListComponent {
  readonly defaultItemsPerPage = 25;
  private readonly currentPageSubject = new BehaviorSubject<number>(1);
  private readonly itemsPerPageSubject = new BehaviorSubject<number>(this.defaultItemsPerPage);
  private readonly filterIsVerifiedSubject = new BehaviorSubject<boolean | null>(null);
  private latestListSnapshot: BusinessAccountList | null = null;

  readonly currentPage$: Observable<number> = this.currentPageSubject.asObservable();
  readonly itemsPerPage$: Observable<number> = this.itemsPerPageSubject.asObservable();
  readonly filterIsVerified$: Observable<boolean | null> = this.filterIsVerifiedSubject.asObservable();
  
  get filterIsVerifiedValue(): string {
    const value = this.filterIsVerifiedSubject.value;
    return value === null ? 'null' : value === true ? 'true' : 'false';
  }

  private readonly pagination$ = combineLatest([
    this.currentPage$,
    this.itemsPerPage$,
    this.filterIsVerified$,
  ]);

  readonly list$: Observable<BusinessAccountList> = this.pagination$.pipe(
    switchMap(([page, take, isVerified]) => {
      const filter: any = {};
      if (isVerified !== null) {
        filter.isVerified = { eq: isVerified };
      }

      return this.dataService
        .query<GetBusinessAccountsQuery, { options: { take: number; skip: number; filter?: any } }>(
          GET_BUSINESS_ACCOUNTS,
          {
            options: {
              take,
              skip: (page - 1) * take,
              filter: Object.keys(filter).length > 0 ? filter : undefined,
            },
          },
        )
        .mapStream(result => result.businessAccounts);
    }),
    tap(list => (this.latestListSnapshot = list)),
    shareReplay(1),
  );

  readonly items$: Observable<BusinessAccount[]> = this.list$.pipe(map(list => list.items));
  readonly totalItems$: Observable<number> = this.list$.pipe(map(list => list.totalItems));

  constructor(
    private dataService: DataService,
    private router: Router,
    private notificationService: NotificationService,
  ) {}

  setPageNumber(page: number): void {
    this.currentPageSubject.next(page);
  }

  setItemsPerPage(perPage: number): void {
    this.itemsPerPageSubject.next(perPage);
    this.currentPageSubject.next(1);
  }

  setFilterIsVerified(isVerified: boolean | null): void {
    this.filterIsVerifiedSubject.next(isVerified);
    this.currentPageSubject.next(1);
  }

  clearFilter(): void {
    this.filterIsVerifiedSubject.next(null);
    this.currentPageSubject.next(1);
  }

  openDetail(id: string): void {
    this.router.navigate(['/extensions/business-accounts', id]);
  }

  getFullName(account: BusinessAccount): string {
    const parts = [account.firstName, account.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '—';
  }
}

