import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  FormInputComponent,
  SharedModule,
  StringCustomFieldConfig,
} from '@vendure/admin-ui/core';
import { Subscription } from 'rxjs';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'variant-serial-code-control',
  standalone: true,
  imports: [SharedModule],
  template: `
    <div style="max-width: 480px;">
      <!-- Label -->
      <label class="clr-control-label" style="font-weight: 500;">
        {{ config?.label?.[0]?.value || 'Variant Serial Code' }}
      </label>

      <!-- List of codes -->
      <div *ngFor="let code of codes; let i = index" style="margin-bottom: 1rem;">
        <!-- Input row -->
        <div
          class="clr-control-container"
          style="margin-bottom: 0.5rem; display: flex; gap: 0.5rem; align-items: center;"
        >
          <input
            class="form-control"
            [ngModel]="codes[i]"
            (ngModelChange)="onCodeChange(i, $event)"
            [readonly]="readonly"
            placeholder="Enter variant serial code"
          />
          <button
            *ngIf="!readonly"
            type="button"
            class="btn btn-sm btn-outline-danger"
            (click)="removeCode(i)"
          >
            Remove
          </button>
        </div>

        <!-- Barcode preview -->
        <div
          *ngIf="code; else noCode"
          style="
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            padding: 0.75rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          "
        >
          <div style="font-size: 0.85rem; color: #6b7280;">
            Barcode preview for:
            <strong>{{ code }}</strong>
          </div>

          <div style="overflow-x: auto; padding-bottom: 0.25rem;">
            <svg #barcodeSvg></svg>
          </div>

          <button
            type="button"
            class="btn btn-sm btn-primary"
            (click)="downloadBarcode(i)"
            style="display: flex; justify-content: center; align-items: center; width: 100%;"
          >
            Download barcode (SVG)
          </button>
        </div>

        <ng-template #noCode>
          <div
            style="
              font-size: 0.85rem;
              color: #9ca3af;
              border: 1px dashed #e5e7eb;
              border-radius: 0.5rem;
              padding: 0.75rem;
            "
          >
            No serial code yet. Enter a value to see the barcode preview.
          </div>
        </ng-template>
      </div>

      <!-- Add new code -->
      <button
        *ngIf="!readonly"
        type="button"
        class="btn btn-sm btn-link"
        (click)="addCode()"
      >
        + Add serial code
      </button>

      <!-- Empty state when there are no items at all -->
      <div
        *ngIf="codes.length === 0"
        style="
          margin-top: 0.5rem;
          font-size: 0.85rem;
          color: #9ca3af;
          border: 1px dashed #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.75rem;
        "
      >
        No serial codes yet. Click "Add serial code" to create one.
      </div>
    </div>
  `,
})
export class VariantSerialCodeControlComponent
  implements
    FormInputComponent<StringCustomFieldConfig>,
    OnInit,
    AfterViewInit,
    OnDestroy
{
  readonly!: boolean;
  formControl!: FormControl;
  config!: StringCustomFieldConfig;

  // List of current codes backing the list field
  codes: string[] = [];

  @ViewChildren('barcodeSvg') barcodeSvgRefs!: QueryList<SVGSVGElement | ElementRef<SVGSVGElement>>;

  private sub?: Subscription;
  private viewChildrenSub?: Subscription;

  ngOnInit() {
    // Initialize from formControl value (string | string[])
    const initialValue = this.formControl?.value;
    if (Array.isArray(initialValue)) {
      this.codes = [...initialValue];
    } else if (initialValue) {
      this.codes = [String(initialValue)];
    } else {
      this.codes = [];
    }

    // React to external changes to the formControl (e.g. reset)
    this.sub = this.formControl.valueChanges.subscribe(val => {
      if (Array.isArray(val)) {
        this.codes = [...val];
      } else if (val) {
        this.codes = [String(val)];
      } else {
        this.codes = [];
      }
      this.renderBarcodes();
    });
  }

  ngAfterViewInit() {
    this.renderBarcodes();

    // When DOM for barcodes changes (add/remove items), re-render
    this.viewChildrenSub = this.barcodeSvgRefs.changes.subscribe(() => {
      this.renderBarcodes();
    });
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
    if (this.viewChildrenSub) {
      this.viewChildrenSub.unsubscribe();
    }
  }

  /** Sync local codes array back to the underlying list formControl */
  private updateFormControl() {
    if (this.formControl) {
      this.formControl.setValue([...this.codes]);
      this.formControl.markAsDirty();
      this.formControl.markAsTouched();
    }
    this.renderBarcodes();
  }

  addCode() {
    this.codes.push('');
    this.updateFormControl();
  }

  removeCode(index: number) {
    this.codes.splice(index, 1);
    this.updateFormControl();
  }

  onCodeChange(index: number, value: string) {
    this.codes[index] = value;
    this.updateFormControl();
  }

  private renderBarcodes() {
    if (!this.barcodeSvgRefs) {
      return;
    }

    // barcodeSvgRefs might be ElementRef or raw SVG, normalize
    this.barcodeSvgRefs.forEach((ref: any, index: number) => {
      const svg: SVGSVGElement =
        ref instanceof ElementRef ? ref.nativeElement : ref;
      const value = this.codes[index] || '';

      // Clear previous barcode
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }

      if (!value) {
        return;
      }

      try {
        JsBarcode(svg, value, {
          format: 'CODE128',
          displayValue: true,
          fontSize: 14,
          height: 60,
          margin: 8,
        });
      } catch (e) {
        console.error('Failed to render barcode:', e);
      }
    });
  }

  downloadBarcode(index: number) {
    const ref = this.barcodeSvgRefs?.get(index) as any;
    if (!ref) {
      return;
    }

    const svgElement: SVGSVGElement =
      ref instanceof ElementRef ? ref.nativeElement : ref;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElement);

    const blob = new Blob([source], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const filenameBase =
      this.codes[index] || `variant-serial-code-${index + 1}`;
    a.download = `${filenameBase}-barcode.svg`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
