import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DataService, SharedModule } from '@vendure/admin-ui/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, shareReplay, switchMap, take, tap } from 'rxjs/operators';
import gql from 'graphql-tag';

interface CustomerSummary {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

interface PromotionUsage {
  customer: CustomerSummary;
  couponCode: string;
  currencyCode: string;
  orderId: string;
  createdAt: string;
}

interface PromotionUsageList {
  items: PromotionUsage[];
  totalItems: number;
}

interface GetPromotionUsageQuery {
  customerPromotionUsage: PromotionUsageList;
}

const GET_PROMOTION_USAGE = gql`
  query GetPromotionUsage($options: PromotionUsageListOptions) {
    customerPromotionUsage(options: $options) {
      items {
        customer { firstName lastName email }
        couponCode
        currencyCode
        orderId
        createdAt
      }
      totalItems
    }
  }
`;

@Component({
  selector: 'vdr-customer-promotion-usage-list',
  templateUrl: './customer-promotion-usage-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [SharedModule],
})
export class CustomerPromotionUsageListComponent {
  readonly defaultItemsPerPage = 25;

  private readonly currentPageSubject = new BehaviorSubject<number>(1);
  private readonly itemsPerPageSubject = new BehaviorSubject<number>(this.defaultItemsPerPage);
  private latestListSnapshot: PromotionUsageList | null = null;

  readonly currentPage$: Observable<number> = this.currentPageSubject.asObservable();
  readonly itemsPerPage$: Observable<number> = this.itemsPerPageSubject.asObservable();
  private readonly pagination$ = combineLatest([this.currentPage$, this.itemsPerPage$]);

  readonly list$: Observable<PromotionUsageList> = this.pagination$.pipe(
    switchMap(([page, pageSize]) =>
      this.dataService
        .query<GetPromotionUsageQuery, { options: { page: number; pageSize: number } }>(
          GET_PROMOTION_USAGE,
          { options: { page, pageSize } },
        )
        .mapStream(r => r.customerPromotionUsage),
    ),
    tap(list => (this.latestListSnapshot = list)),
    shareReplay(1),
  );

  readonly items$: Observable<PromotionUsage[]> = this.list$.pipe(map(l => l.items));
  readonly totalItems$: Observable<number> = this.list$.pipe(map(l => l.totalItems));

  constructor(private dataService: DataService) {}

  setPageNumber(page: number): void {
    this.currentPageSubject.next(page);
  }
  setItemsPerPage(perPage: number): void {
    this.itemsPerPageSubject.next(perPage);
    this.currentPageSubject.next(1);
  }

  exportCsv(): void {
    const totalItems = this.latestListSnapshot?.totalItems ?? 0;
    if (totalItems === 0) {
      alert('No promotion usage to export yet.');
      return;
    }

    this.dataService
      .query<GetPromotionUsageQuery, { options: { page: number; pageSize: number } }>(
        GET_PROMOTION_USAGE,
        { options: { page: 1, pageSize: totalItems } },
      )
      .mapStream(r => r.customerPromotionUsage.items)
      .pipe(take(1))
      .subscribe(items => {
        const csv = this.buildCsv(items);
        this.triggerDownload(csv, 'customer-promotion-usage.csv');
      });
  }

  private buildCsv(items: PromotionUsage[]): string {
    const header = ['First Name', 'Last Name', 'Email', 'Coupon Code', 'Currency', 'Order ID', 'Created At'];
    const rows = items.map(i => [
      i.customer.firstName ?? '',
      i.customer.lastName ?? '',
      i.customer.email ?? '',
      i.couponCode,
      i.currencyCode,
      i.orderId,
      i.createdAt,
    ]);
    return [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
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
