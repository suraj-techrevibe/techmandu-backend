import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService, SharedModule, NotificationService } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

type SellerRegistration = {
  id: string;
  createdAt: string;
  updatedAt: string;
  panNo: string;
  businessName: string;
  businessRegistrationNo: string;
  address: string;
  ownerName: string;
  phone: string;
  email: string;
  isVerified: boolean;
  panPhoto: { id: string; preview: string; source: string };
  documents: { id: string; preview: string; name: string; source: string; type: string }[];
};

@Component({
  selector: 'seller-registration-detail',
  standalone: true,
  templateUrl: './seller-registration-detail.component.html',
  styleUrls: ['./seller-registration-detail.component.scss'],
  imports: [SharedModule, CommonModule, FormsModule],
})
export class SellerRegistrationDetailComponent implements OnInit {
  id!: string;
  loading = true;
  registration: SellerRegistration | null = null;

  stockLocations: Array<{ id: string; name: string }> = [];
  stockLocationId: string | null = null;

  private readonly GET_REGISTRATION = gql`
    query GetSellerRegistration($id: ID!) {
      sellerRegistration(id: $id) {
        id
        createdAt
        updatedAt
        panNo
        businessName
        businessRegistrationNo
        address
        ownerName
        phone
        email
        isVerified
        panPhoto {
          id
          preview
          source
        }
        documents {
          id
          preview
          source
          name
          type
        }
      }
    }
  `;

  private readonly GET_STOCK_LOCATIONS = gql`
    query GetStockLocations {
      stockLocations {
        items {
          id
          name
        }
      }
    }
  `;

  private readonly DELETE_REGISTRATION = gql`
    mutation DeleteSellerRegistration($id: ID!) {
      deleteSellerRegistration(id: $id) {
        result
        message
      }
    }
  `;

  private readonly VERIFY_REGISTRATION = gql`
    mutation VerifySellerRegistration($id: ID!, $stockLocationId: ID!) {
      verifySellerRegistration(id: $id, stockLocationId: $stockLocationId) {
        success
        message
      }
    }
  `;

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService,
    private notificationService: NotificationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notificationService.error('Invalid registration id');
      this.router.navigate(['/extensions/vendor-registrations']);
      return;
    }

    this.id = id;
    this.loadRegistration();
    this.loadStockLocations();
  }

  private loadRegistration() {
    this.loading = true;
    this.dataService
      .query<{ sellerRegistration: SellerRegistration }>(this.GET_REGISTRATION, { id: this.id })
      .mapSingle(d => d.sellerRegistration)
      .subscribe({
        next: reg => {
          this.registration = reg;
          this.loading = false;
        },
        error: err => {
          this.loading = false;
          this.notificationService.error('Failed to load registration');
          this.router.navigate(['/extensions/vendor-registrations']);
        },
      });
  }

  private loadStockLocations() {
  this.dataService
    .query<{ stockLocations: { items: { id: string; name: string }[] } }>(
      this.GET_STOCK_LOCATIONS,
    )
    .mapSingle(result => result.stockLocations.items)
    .subscribe({
      next: (items) => {
        this.stockLocations = items;
      },
      error: () => {
        this.notificationService.error('Failed to load stock locations');
      },
    });
}


  backToList() {
    this.router.navigate(['/extensions/vendor-registrations']);
  }

  onDelete() {
    if (!this.id) return;

    this.loading = true;
    this.dataService
      .mutate<{ deleteSellerRegistration: { result: string; message?: string } }>(
        this.DELETE_REGISTRATION,
        { id: this.id },
      )
      .pipe(map(res => res.deleteSellerRegistration))
      .subscribe({
        next: ({ result, message }) => {
          this.loading = false;
          if (result === 'DELETED') {
            this.notificationService.success('Registration deleted');
            setTimeout(() => this.backToList(), 800);
          } else {
            this.notificationService.warning(message || 'Delete failed');
          }
        },
        error: err => {
          this.loading = false;
          this.notificationService.error(err.message);
        },
      });
  }

 onVerify() {
  if (!this.id) return;

  const isResend = !!this.registration?.isVerified;

  // ✅ Require stock location ONLY for first-time verification
  if (!isResend && !this.stockLocationId) {
    this.notificationService.error('Please select a stock location');
    return;
  }

  this.loading = true;

  this.dataService
    .mutate<{ verifySellerRegistration: { success: boolean; message: string } }>(
      this.VERIFY_REGISTRATION,
      {
        id: this.id,
        stockLocationId: isResend ? null : this.stockLocationId,
      },
    )
    .pipe(map(res => res.verifySellerRegistration))
    .subscribe({
      next: ({ success, message }) => {
        this.loading = false;

        if (success) {
          this.notificationService.success(
            message ||
              (isResend
                ? 'Verification email resent'
                : 'Vendor verified successfully'),
          );

          if (!isResend) {
            setTimeout(() => window.location.reload(), 800);
          }
        } else {
          this.notificationService.warning(message || 'Operation failed');
        }
      },
      error: err => {
        this.loading = false;
        this.notificationService.error(err.message);
      },
    });
}

  get verifiedLabel(): string {
    return this.registration?.isVerified ? 'Resend Email' : 'Verify';
  }
}
