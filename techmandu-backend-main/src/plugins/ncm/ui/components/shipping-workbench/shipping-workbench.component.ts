import { Component, OnInit } from '@angular/core';
import { DataService, NotificationService, SharedModule } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';

interface WorkbenchRow {
  orderId: string;
  code: string;
  placedAt: string | null;
  customerName: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  phoneValid: boolean;
  destination: string | null;
  currencyCode: string;
  total: number;
  cashToCollectNpr: number | null;
  ncmTrackingId: string | null;
  problems: string[];
  canBook: boolean;
  // screen state, not from the server
  busy?: boolean;
  error?: string | null;
  status?: string | null;
  statusBusy?: boolean;
}

interface BookingOutcome {
  orderId: string;
  orderCode: string;
  trackingId: string | null;
  alreadyBooked: boolean;
  error: string | null;
}

const WORKBENCH_QUERY = gql`
  query NcmWorkbench($skip: Int, $take: Int, $onlyBookable: Boolean) {
    ncmWorkbench(skip: $skip, take: $take, onlyBookable: $onlyBookable) {
      totalItems
      items {
        orderId
        code
        placedAt
        customerName
        recipientName
        recipientPhone
        phoneValid
        destination
        currencyCode
        total
        cashToCollectNpr
        ncmTrackingId
        problems
        canBook
      }
    }
  }
`;

const BOOK_MUTATION = gql`
  mutation NcmBookOrders($orderIds: [ID!]!) {
    ncmBookOrders(orderIds: $orderIds) {
      orderId
      orderCode
      trackingId
      alreadyBooked
      error
    }
  }
`;

const STATUS_QUERY = gql`
  query NcmTrackingStatus($trackingId: String!) {
    ncmTrackingStatus(trackingId: $trackingId) {
      trackingId
      status
      addedTime
    }
  }
`;

@Component({
  selector: 'ncm-shipping-workbench',
  templateUrl: './shipping-workbench.component.html',
  standalone: true,
  imports: [SharedModule],
})
export class ShippingWorkbenchComponent implements OnInit {
  rows: WorkbenchRow[] = [];
  totalItems = 0;
  itemsPerPage = 25;
  currentPage = 1;
  onlyBookable = false;
  loading = false;

  constructor(
    private dataService: DataService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get readyRows(): WorkbenchRow[] {
    return this.rows.filter(r => r.canBook && !r.busy);
  }

  load(): void {
    this.loading = true;
    this.dataService
      .query<{ ncmWorkbench: { items: WorkbenchRow[]; totalItems: number } }>(
        WORKBENCH_QUERY,
        {
          skip: this.itemsPerPage * (this.currentPage - 1),
          take: this.itemsPerPage,
          onlyBookable: this.onlyBookable,
        },
        'network-only',
      )
      .mapSingle(res => res.ncmWorkbench)
      .subscribe({
        next: result => {
          this.rows = result.items.map(item => ({ ...item }));
          this.totalItems = result.totalItems;
          this.loading = false;
        },
        error: err => {
          this.loading = false;
          this.notificationService.error(err?.message || 'Could not load orders');
        },
      });
  }

  setPageNumber(page: number): void {
    this.currentPage = page;
    this.load();
  }

  setItemsPerPage(count: number): void {
    this.itemsPerPage = count;
    this.currentPage = 1;
    this.load();
  }

  toggleOnlyBookable(): void {
    this.onlyBookable = !this.onlyBookable;
    this.currentPage = 1;
    this.load();
  }

  /** Books one order. Safe to press again after a failure (Retry). */
  book(row: WorkbenchRow): void {
    this.bookRows([row]);
  }

  bookAllReady(): void {
    this.bookRows(this.readyRows);
  }

  private bookRows(targets: WorkbenchRow[]): void {
    if (!targets.length) {
      return;
    }
    targets.forEach(r => {
      r.busy = true;
      r.error = null;
    });
    this.dataService
      .mutate<{ ncmBookOrders: BookingOutcome[] }>(BOOK_MUTATION, {
        orderIds: targets.map(r => r.orderId),
      })
      .subscribe({
        next: res => this.applyOutcomes(targets, res.ncmBookOrders),
        error: err => {
          targets.forEach(r => {
            r.busy = false;
            r.error = err?.message || 'Booking request failed';
          });
          this.notificationService.error(err?.message || 'Booking request failed');
        },
      });
  }

  private applyOutcomes(targets: WorkbenchRow[], outcomes: BookingOutcome[]): void {
    let booked = 0;
    let failed = 0;
    for (const row of targets) {
      row.busy = false;
      const outcome = outcomes.find(o => o.orderId === row.orderId);
      if (!outcome) {
        row.error = 'No answer for this order. Reload and check before retrying.';
        failed++;
      } else if (outcome.error) {
        row.error = outcome.error;
        failed++;
      } else {
        row.ncmTrackingId = outcome.trackingId;
        row.canBook = false;
        row.error = null;
        booked++;
      }
    }
    if (booked) {
      this.notificationService.success(`Booked ${booked} order(s) with NCM`);
    }
    if (failed) {
      this.notificationService.error(`${failed} order(s) failed. See the red text on each row, then press Retry.`);
    }
  }

  checkStatus(row: WorkbenchRow): void {
    if (!row.ncmTrackingId) {
      return;
    }
    row.statusBusy = true;
    this.dataService
      .query<{ ncmTrackingStatus: { status: string } }>(
        STATUS_QUERY,
        { trackingId: row.ncmTrackingId },
        'network-only',
      )
      .mapSingle(res => res.ncmTrackingStatus)
      .subscribe({
        next: result => {
          row.status = result.status;
          row.statusBusy = false;
        },
        error: err => {
          row.statusBusy = false;
          row.status = null;
          this.notificationService.error(err?.message || 'NCM status check failed');
        },
      });
  }

  money(minor: number, currency: string): string {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}
