import { Component } from '@angular/core';
import {
  DataService,
  Dialog,
  SharedModule,
  NotificationService,
} from '@vendure/admin-ui/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import gql from 'graphql-tag';

const UPDATE_BIDDING = gql`
  mutation UpdateBidding(
    $id: ID!
    $isAccepted: Boolean!
    $newProposedPrice: Int
    $enableVariant: Boolean!
  ) {
    updateBidding(
      id: $id
      isAccepted: $isAccepted
      newProposedPrice: $newProposedPrice
      enableVariant: $enableVariant
    )
  }
`;

@Component({
  selector: 'update-bidding-dialog',
  template: `
    <!-- Dialog Title -->
    <ng-template vdrDialogTitle>
      Update Bidding Status
    </ng-template>

    <!-- Body -->
    <div class="p-4">
      <form [formGroup]="form" class="w-full">

        <!-- Accept checkbox -->
        <vdr-form-field label="Accept the bidding?">
          <input
            type="checkbox"
            formControlName="isAccepted"
            class="form-control"
          />
        </vdr-form-field>

        <!-- Price input (only visible when NOT accepted) -->
        <div *ngIf="!form.get('isAccepted')?.value">
          <vdr-form-field
            label="New Proposed Price (Optional)"
            for="price"
            class="mt-4"
            hint="Leave empty if no change is needed"
          >
            <input
              id="price"
              type="number"
              class="form-control"
              placeholder="Enter new price"
              formControlName="newProposedPrice"
            />
          </vdr-form-field>
        </div>

        <!-- Enable Variant Toggle -->
        <vdr-form-field label="Enable this product variant" class="mt-4">
          <input
            type="checkbox"
            class="form-control"
            formControlName="enableVariant"
          />
        </vdr-form-field>

      </form>
    </div>

    <!-- Buttons -->
    <ng-template vdrDialogButtons>
      <button type="button" class="btn" (click)="resolveWith(false)">Cancel</button>
      <button type="button" class="btn btn-primary" (click)="submit()">Update</button>
    </ng-template>
  `,
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
})
export class UpdateBiddingDialogComponent implements Dialog<boolean> {
  form = new FormGroup({
    isAccepted: new FormControl(false),
    newProposedPrice: new FormControl(null),
    enableVariant: new FormControl(true), // default checked TRUE
  });

  resolveWith!: (result?: boolean) => void;
  item: any;

  constructor(
    private dataService: DataService,
    private notificationService: NotificationService,
  ) {}

  submit() {
    const { isAccepted, newProposedPrice, enableVariant } = this.form.value;

    this.dataService
      .mutate<{ updateBidding: boolean }>(UPDATE_BIDDING, {
        id: this.item.id,
        isAccepted,
        newProposedPrice:
          !isAccepted && newProposedPrice ? Number(newProposedPrice) : null,
        enableVariant, // always send
      })
      .subscribe({
        next: ({ updateBidding }) => {
          if (updateBidding) {
            this.notificationService.success('Bidding updated successfully');
            this.resolveWith(true);
          } else {
            this.notificationService.error('Failed to update bidding');
            this.resolveWith(false);
          }
        },
        error: (err) => {
          console.error(err);
          this.notificationService.error('An error occurred while updating bidding');
          this.resolveWith(false);
        },
      });
  }
}
