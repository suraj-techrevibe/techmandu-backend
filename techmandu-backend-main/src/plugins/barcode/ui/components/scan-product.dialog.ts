import { Component } from '@angular/core';
import {
    DataService,
    Dialog,
    NotificationService,
    SharedModule,
} from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { lastValueFrom } from 'rxjs';

const SEARCH_PRODUCT_BY_SERIAL = gql`
    query SearchProductVariantBySerialCode($serialCode: String!) {
        searchProductVariantBySerialCode(serialCode: $serialCode) {
            id
            name
            sku
            stockLevel
            assets {
                source
            }
        }
    }
`;

const ADD_ITEM_TO_DRAFT_ORDER = gql`
    mutation AddItemToDraftOrder(
        $orderId: ID!
        $productVariantId: ID!
        $quantity: Int!
        $serialCode: [String!]!
    ) {
        addItemToDraftOrder(
            orderId: $orderId
            input: {
                productVariantId: $productVariantId
                quantity: $quantity
                serialCode: $serialCode
            }
        ) {
            __typename
            ... on Order {
                id
                code
            }
            ... on InsufficientStockError {
                message
            }
            ... on OrderModificationError {
                message
            }
        }
    }
`;

interface VariantSummary {
    id: string;
    name: string;
    sku: string;
    stockLevel: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    assets: { source: string }[];
}

interface SearchProductBySerialResponse {
    searchProductVariantBySerialCode: VariantSummary | null;
}

type AddItemResult =
    | {
          __typename: 'Order';
          id: string;
          code: string;
      }
    | {
          __typename: 'InsufficientStockError' | 'OrderModificationError';
          message: string;
      };

interface AddItemToDraftOrderResponse {
    addItemToDraftOrder: AddItemResult;
}

interface PendingItem {
    variant: VariantSummary;
    serialCode: string;
}

@Component({
    selector: 'scan-product-dialog',
    standalone: true,
    imports: [SharedModule],
    template: `
    <div class="scan-dialog-theme">

        <ng-template vdrDialogTitle>Scan product</ng-template>

        <div class="sp-container">

            <div class="sp-actions">
                <button
                    type="button"
                    class="btn btn-primary sp-btn-primary"
                    (click)="startScan()"
                    [disabled]="scanning || loadingSearch || savingAll"
                >
                    <clr-spinner
                        *ngIf="scanning"
                        [clrInline]="true"
                        class="mr-1"
                    ></clr-spinner>
                    <span *ngIf="!scanning">Scan product</span>
                    <span *ngIf="scanning">Scanning...</span>
                </button>

                <button
                    type="button"
                    class="btn btn-warning sp-btn-warning"
                    (click)="cancel()"
                >
                    Cancel
                </button>
            </div>

            <div class="sp-manual">
                <label class="sp-label">Debug / manual serialCode</label>
                <div class="sp-manual-row">
                    <input
                        class="form-control sp-input"
                        [(ngModel)]="debugSerialCode"
                        placeholder="Type serial code to simulate scan"
                        (keyup.enter)="manualSearch()"
                    />
                    <button
                        type="button"
                        class="btn btn-secondary sp-search-btn"
                        (click)="manualSearch()"
                        [disabled]="loadingSearch || savingAll"
                    >
                        Search
                    </button>
                </div>
            </div>

            <div *ngIf="loadingSearch" class="sp-loading">
                <clr-spinner [clrInline]="true" class="mr-2"></clr-spinner>
                <span>Looking up product…</span>
            </div>

            <p *ngIf="errorMessage" class="sp-error">{{ errorMessage }}</p>

            <div *ngIf="items.length" class="sp-list">
                <div class="sp-row sp-header-row">
                    <div>Image</div>
                    <div>Product name</div>
                    <div>SKU</div>
                    <div>Serial code</div>
                    <div class="sp-actions-header"></div>
                </div>

                <div
                    class="sp-row sp-item-row"
                    *ngFor="let item of items; let i = index"
                >
                    <div class="sp-image-cell">
                        <img
                            *ngIf="item.variant.assets?.length"
                            [src]="item.variant.assets[0].source"
                            [alt]="item.variant.name"
                        />
                    </div>

                    <div class="sp-name-cell">
                        <div class="sp-name">{{ item.variant.name }}</div>
                    </div>

                    <div class="sp-serial-cell">{{ item.variant.sku }}</div>

                    <div class="sp-serial-cell">{{ item.serialCode }}</div>

                   

                    <div class="sp-actions-cell">
                        <button
                            type="button"
                            class="btn btn-icon sp-remove-btn"
                            (click)="removeItem(i)"
                            title="Remove"
                        >
                            <clr-icon shape="trash"></clr-icon>
                        </button>
                    </div>
                </div>

                <div class="sp-footer">
                    <button
                        type="button"
                        class="btn btn-primary sp-btn-primary"
                        (click)="addAllToOrder()"
                        [disabled]="savingAll || !items.length"
                    >
                        <clr-spinner
                            *ngIf="savingAll"
                            [clrInline]="true"
                            class="mr-1"
                        ></clr-spinner>
                        <span *ngIf="!savingAll">Add all to order</span>
                        <span *ngIf="savingAll">Adding…</span>
                    </button>
                </div>
            </div>

            <p *ngIf="!items.length && !loadingSearch" class="sp-empty-hint">
                Scan a product or enter a serial code to add items.
            </p>

        </div>

    </div>
    `,
    styles: [`
        /* —————————————————————————————————————
           FIX DARK MODE — FORCE LIGHT STYLE
        —————————————————————————————————————— */
        

        :host ::ng-deep .modal-content {
            background: #ffffff !important;
            color: #1f2937 !important;
        }

        /* —————————————————————————————————————
           YOUR ORIGINAL STYLES BELOW
        —————————————————————————————————————— */
        .sp-container {
            padding: 1.5rem;
        }

        .sp-actions {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .sp-btn-primary {
            min-width: 140px;
        }

        .sp-btn-warning {
            min-width: 100px;
        }

        .sp-manual {
            max-width: 420px;
            margin: 0 auto 1.5rem auto;
        }

        .sp-label {
            font-weight: 600;
            font-size: 0.85rem;
            margin-bottom: 0.25rem;
            display: block;
        }

        .sp-manual-row {
            display: flex;
            gap: 0.5rem;
        }

        .sp-input {
            flex: 1;
        }

        .sp-loading {
            display: flex;
            align-items: center;
            font-size: 0.9rem;
            margin-bottom: 0.75rem;
        }

        .sp-error {
            color: #b91c1c !important;
            font-size: 0.9rem;
            margin-bottom: 0.75rem;
        }

        .sp-empty-hint {
            margin-top: 0.5rem;
            font-size: 0.9rem;
            color: #6b7280;
            text-align: center;
        }

        .sp-list {
            margin-top: 1rem;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            overflow: hidden;
        }

        .sp-row {
            display: grid;
            grid-template-columns: 72px 2fr 1.2fr 1.4fr 110px 90px;
            align-items: center;
            padding: 0.6rem 0.9rem;
            column-gap: 0.75rem;
            font-size: 0.9rem;
        }

        .sp-header-row {
            background: #f9fafb;
            font-weight: 600;
            font-size: 0.75rem;
            text-transform: uppercase;
            color: #6b7280;
        }

        .sp-item-row {
            border-top: 1px solid #e5e7eb;
        }

        .sp-image-cell img {
            width: 48px;
            height: 48px;
            object-fit: contain;
        }

        .sp-name {
            font-weight: 600;
        }

        .sp-text-cell {
            color: #374151;
        }

        .sp-stock-cell .badge {
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
        }

        .sp-actions-cell {
            text-align: center;
        }

        .sp-remove-btn.btn-icon {
            padding: 0.15rem;
        }

        .sp-footer {
            padding: 0.75rem 0.9rem 0.9rem;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: flex-end;
        }
    `],
})
export class ScanProductDialogComponent implements Dialog {
    resolveWith!: (result?: { added: boolean }) => void;

    orderId!: string;

    scanning = false;
    loadingSearch = false;
    savingAll = false;
    errorMessage: string | null = null;

    serialCode: string | null = null;
    debugSerialCode = '';

    items: PendingItem[] = [];

    constructor(
        private dataService: DataService,
        private notificationService: NotificationService,
    ) {}

    onDialogInit(input: { orderId: string }) {
        this.orderId = input.orderId;
    }

    startScan() {
        this.errorMessage = null;
        this.scanning = true;
    }

    onBarcodeScanned(code: string) {
        this.scanning = false;

        const normalized = code.trim();
        if (!normalized) return;

        const exists = this.items.some(
            i => i.serialCode.toLowerCase() === normalized.toLowerCase(),
        );
        if (exists) {
            this.errorMessage = 'This serial code has already been added.';
            this.notificationService.error(this.errorMessage);
            this.debugSerialCode = normalized;
            return;
        }

        this.serialCode = normalized;
        this.searchProduct(normalized);
    }

    manualSearch() {
        const code = this.debugSerialCode.trim();
        if (!code) return;
        this.onBarcodeScanned(code);
    }

    private searchProduct(code: string) {
        this.loadingSearch = true;
        this.errorMessage = null;

        this.dataService
            .query<SearchProductBySerialResponse, { serialCode: string }>(
                SEARCH_PRODUCT_BY_SERIAL,
                { serialCode: code },
            )
            .single$.subscribe({
                next: ({ searchProductVariantBySerialCode }) => {
                    this.loadingSearch = false;

                    if (!searchProductVariantBySerialCode) {
                        this.errorMessage = 'No product found for this barcode.';
                        return;
                    }

                    this.addScanRow(searchProductVariantBySerialCode, code);
                    this.debugSerialCode = '';
                },
                error: err => {
                    this.loadingSearch = false;
                    this.errorMessage = 'Error searching product.';
                    console.error(err);
                },
            });
    }

    private addScanRow(variant: VariantSummary, serialCode: string) {
        this.items = [...this.items, { variant, serialCode }];
    }

    removeItem(index: number) {
        this.items = this.items.filter((_, i) => i !== index);
    }

    async addAllToOrder() {
        if (!this.items.length) return;

        this.savingAll = true;
        this.errorMessage = null;

        try {
            const groupedByVariant = new Map<
                string,
                { variant: VariantSummary; serialCodes: string[] }
            >();

            for (const item of this.items) {
                const existing = groupedByVariant.get(item.variant.id);
                if (existing) {
                    existing.serialCodes.push(item.serialCode);
                } else {
                    groupedByVariant.set(item.variant.id, {
                        variant: item.variant,
                        serialCodes: [item.serialCode],
                    });
                }
            }

            for (const [variantId, group] of groupedByVariant.entries()) {
                const quantity = group.serialCodes.length;

                const { addItemToDraftOrder } = await lastValueFrom(
                    this.dataService.mutate<
                        AddItemToDraftOrderResponse,
                        {
                            orderId: string;
                            productVariantId: string;
                            quantity: number;
                            serialCode: string[];
                        }
                    >(ADD_ITEM_TO_DRAFT_ORDER, {
                        orderId: this.orderId,
                        productVariantId: variantId,
                        quantity,
                        serialCode: group.serialCodes,
                    }),
                );

                if (addItemToDraftOrder.__typename !== 'Order') {
                    throw new Error(
                        (addItemToDraftOrder as any).message ||
                            'Could not add item to order.',
                    );
                }
            }

            this.notificationService.success('Products added to draft order');
            this.resolveWith({ added: true });
        } catch (e: any) {
            console.error(e);
            this.errorMessage = e?.message || 'Error adding one of the items.';
            this.notificationService.error(this.errorMessage as string);
        } finally {
            this.savingAll = false;
        }
    }

    cancel() {
        this.resolveWith();
    }
}
