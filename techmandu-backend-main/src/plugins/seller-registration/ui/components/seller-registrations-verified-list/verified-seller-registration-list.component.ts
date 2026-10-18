import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService, SharedModule } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface VerifiedSellerRegistrationRow {
  id: string;
  createdAt: string;
  panNo: string;
  businessName: string;
  businessRegistrationNo: string;
  address: string | null;
  ownerName: string;
  phone: string;
  email: string;
}

@Component({
  selector: 'verified-seller-registration-list',
  templateUrl: './verified-seller-registration-list.component.html',
  standalone: true,
  imports: [SharedModule],
})
export class VerifiedSellerRegistrationListComponent implements OnInit {
  itemsPerPage$ = new BehaviorSubject<number>(10);
  currentPage$ = new BehaviorSubject<number>(1);
  totalItems$ = new BehaviorSubject<number>(0);
  registrations$!: Observable<VerifiedSellerRegistrationRow[]>;

  constructor(
    private dataService: DataService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.registrations$ = this.fetchVerifiedRegistrations();
  }

  setPageNumber(page: number) {
    this.currentPage$.next(page);
    this.registrations$ = this.fetchVerifiedRegistrations();
  }

  setItemsPerPage(count: number) {
    this.itemsPerPage$.next(count);
    this.currentPage$.next(1);
    this.registrations$ = this.fetchVerifiedRegistrations();
  }

  fetchVerifiedRegistrations(): Observable<VerifiedSellerRegistrationRow[]> {
    const GET_VERIFIED_SELLER_REGISTRATIONS = gql`
      query GetVerifiedSellerRegistrations($skip: Int!, $take: Int!) {
        verifiedSellerRegistrations(
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
      .query<{
        verifiedSellerRegistrations: {
          items: VerifiedSellerRegistrationRow[];
          totalItems: number;
        };
      }>(GET_VERIFIED_SELLER_REGISTRATIONS, vars)
      .mapSingle(({ verifiedSellerRegistrations }) => {
        this.totalItems$.next(verifiedSellerRegistrations.totalItems);
        return verifiedSellerRegistrations.items;
      });
  }

  openDetail(id: string) {
    this.router.navigate(['/extensions/vendor-registrations', id]);
  }
}
