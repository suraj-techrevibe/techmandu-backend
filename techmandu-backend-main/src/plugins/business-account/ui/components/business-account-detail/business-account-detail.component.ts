import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService, SharedModule, NotificationService } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { map } from 'rxjs/operators';

type BusinessAccount = {
  id: string;
  createdAt: string;
  updatedAt: string;
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
};

@Component({
  selector: 'business-account-detail',
  standalone: true,
  templateUrl: './business-account-detail.component.html',
  styleUrls: ['./business-account-detail.component.scss'],
  imports: [SharedModule, CommonModule],
})
export class BusinessAccountDetailComponent implements OnInit {
  id!: string;
  loading = true;
  account: BusinessAccount | null = null;

  private readonly GET_ACCOUNT = gql`
    query GetBusinessAccount($id: ID!) {
      businessAccount(id: $id) {
        id
        createdAt
        updatedAt
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
    }
  `;

  private readonly VERIFY_ACCOUNT = gql`
    mutation VerifyBusinessAccount($id: ID!, $isVerified: Boolean!) {
      verifyBusinessAccount(id: $id, isVerified: $isVerified) {
        id
        customFields {
          isVerified
        }
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
      this.notificationService.error('Invalid account id');
      this.router.navigate(['/extensions/business-accounts']);
      return;
    }
    this.id = id;
    this.loadAccount();
  }

  loadAccount(): void {
    this.loading = true;
    this.dataService
      .query<{ businessAccount: BusinessAccount }>(this.GET_ACCOUNT, { id: this.id })
      .mapSingle(d => d.businessAccount)
      .subscribe({
        next: account => {
          this.account = account;
          this.loading = false;
        },
        error: err => {
          this.notificationService.error('Could not load business account');
          this.loading = false;
        },
      });
  }

  verifyAccount(isVerified: boolean): void {
    this.dataService
      .mutate<{ verifyBusinessAccount: BusinessAccount }>(this.VERIFY_ACCOUNT, {
        id: this.id,
        isVerified: isVerified,
      })
      .pipe(map((res: { verifyBusinessAccount: BusinessAccount }) => res.verifyBusinessAccount))
      .subscribe({
        next: account => {
          // Update only the isVerified field to preserve all other account data
          // Create new object references to trigger Angular change detection
          if (this.account) {
            this.account = {
              ...this.account,
              customFields: {
                ...this.account.customFields,
                isVerified: account.customFields.isVerified,
              },
            };
          }
          this.notificationService.success(
            `Business account ${isVerified ? 'verified' : 'unverified'} successfully`,
          );
        },
        error: err => {
          this.notificationService.error('Could not update verification status');
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/extensions/business-accounts']);
  }

  getFullName(): string {
    if (!this.account) return '—';
    const parts = [this.account.firstName, this.account.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '—';
  }
}

