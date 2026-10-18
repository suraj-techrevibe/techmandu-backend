import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService, SharedModule, NotificationService } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface SellerRegistrationRow {
  id: string;
  createdAt: string;
  panNo: string | null;
  businessName: string | null;
  businessRegistrationNo: string | null;
  address: string | null;
  ownerName: string | null;
  phone: string | null;
  email: string | null;
}

@Component({
  selector: 'seller-registration-list',
  templateUrl: './seller-registration-list.component.html',
  standalone: true,
  imports: [SharedModule],
})
export class SellerRegistrationListComponent implements OnInit {
  itemsPerPage$ = new BehaviorSubject<number>(10);
  currentPage$ = new BehaviorSubject<number>(1);
  totalItems$ = new BehaviorSubject<number>(0);
  totalPages$!: Observable<number>;
  registrations$!: Observable<SellerRegistrationRow[]>;

  constructor(
    private dataService: DataService,
    private router: Router,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.registrations$ = this.fetchRegistrations();
    this.totalPages$ = this.totalItems$.pipe(map(t => Math.ceil(t / this.itemsPerPage$.getValue())));
  }

  setPageNumber(page: number) {
    this.currentPage$.next(page);
    this.registrations$ = this.fetchRegistrations();
  }

  setItemsPerPage(count: number) {
    this.itemsPerPage$.next(count);
    this.currentPage$.next(1);
    this.registrations$ = this.fetchRegistrations();
  }

  fetchRegistrations(): Observable<SellerRegistrationRow[]> {
    const GET_SELLER_REGISTRATIONS = gql`
      query GetSellerRegistrations($skip: Int!, $take: Int!) {
        sellerRegistrations(
          options: { skip: $skip, take: $take, sort: { createdAt: DESC } }
        ) {
          items {
            id
            createdAt
            panNo
            businessName
            businessRegistrationNo
            address
            ownerName
            phone
            email
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
      .query<{ sellerRegistrations: { items: SellerRegistrationRow[]; totalItems: number } }>(
        GET_SELLER_REGISTRATIONS,
        vars,
      )
      .mapSingle(({ sellerRegistrations }) => {
        this.totalItems$.next(sellerRegistrations.totalItems);
        return sellerRegistrations.items;
      });
  }

  openDetail(id: string) {
    this.router.navigate(['/extensions/vendor-registrations', id]);
  }
}
