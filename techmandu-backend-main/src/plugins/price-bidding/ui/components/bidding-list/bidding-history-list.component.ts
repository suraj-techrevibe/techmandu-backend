import { Component, OnInit } from '@angular/core';
import { DataService, ModalService, SharedModule } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UpdateBiddingDialogComponent } from './update-bidding-dialog.component';


interface BiddingHistoryRow {
  id: string;
  createdAt: string;
  variantId: number;
  initialPrice: number;
  finalPrice: number;
  isVerified: boolean;
}

@Component({
  selector: 'bidding-history-list',
  templateUrl: './bidding-history-list.component.html',
  standalone: true,
  imports: [SharedModule],
})
export class BiddingHistoryListComponent implements OnInit {
  itemsPerPage$ = new BehaviorSubject<number>(10);
  currentPage$ = new BehaviorSubject<number>(1);
  totalItems$ = new BehaviorSubject<number>(0);
  totalPages$!: Observable<number>;
  biddingHistory$!: Observable<BiddingHistoryRow[]>;

  constructor(
    private dataService: DataService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.biddingHistory$ = this.fetchBiddingHistory();
    this.totalPages$ = this.totalItems$.pipe(
      map(t => Math.ceil(t / this.itemsPerPage$.getValue())),
    );
  }

  setPageNumber(page: number) {
    this.currentPage$.next(page);
    this.biddingHistory$ = this.fetchBiddingHistory();
  }

  setItemsPerPage(count: number) {
    this.itemsPerPage$.next(count);
    this.currentPage$.next(1);
    this.biddingHistory$ = this.fetchBiddingHistory();
  }

  openUpdateDialog(item: BiddingHistoryRow) {
  const modal = this.modalService.fromComponent(UpdateBiddingDialogComponent, {
    size: 'md',
    locals: { item },
  });

  modal.subscribe((result: boolean | undefined) => {
    if (result) {
      this.biddingHistory$ = this.fetchBiddingHistory();
    }
  });
}


  fetchBiddingHistory(): Observable<BiddingHistoryRow[]> {
    const GET_BIDDING_HISTORY = gql`
      query GetBiddingHistory($skip: Int!, $take: Int!) {
        biddingHistorys(
          options: { skip: $skip, take: $take, sort: { createdAt: DESC } }
        ) {
          items {
            id
            createdAt
            variantId
            initialPrice
            finalPrice
            isVerified
          }
          totalItems
        }
      }
    `;

    const vars = {
      skip: this.itemsPerPage$.getValue() * (this.currentPage$.getValue() - 1),
      take: this.itemsPerPage$.getValue(),
    };

    return this.dataService
      .query<{ biddingHistorys: { items: BiddingHistoryRow[]; totalItems: number } }>(
        GET_BIDDING_HISTORY,
        vars
      )
      .mapSingle(({ biddingHistorys }) => {
        this.totalItems$.next(biddingHistorys.totalItems);
        return biddingHistorys.items;
      });
  }
}
