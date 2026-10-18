import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import {
    AssetPickerDialogComponent,
    DataService,
    FormInputComponent,
    ModalService,
    SharedModule,
    StringCustomFieldConfig,
} from '@vendure/admin-ui/core';


@Component({
    selector: 'vdr-asset-url-selector',
    template: `
       <div class="asset-selector">
            <button 
                type="button" 
                class="btn btn-primary" 
                (click)="openAssetSelector()">
                <clr-icon shape="image" class="mr-1"></clr-icon>
                Select Asset
            </button>

            <div *ngIf="formControl.value" class="asset-preview mt-3">
                <a [href]="formControl.value" target="_blank">
                    <img 
                        [src]="formControl.value" 
                        alt="Selected asset preview" 
                        class="asset-thumbnail shadow rounded">
                </a>
            </div>
        </div>
    `,
    styles: [`
        .asset-selector {
            flex-direction: column;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            border-radius: 0.375rem;
            padding: 0.4rem 0.75rem;
            font-size: 14px;
            cursor: pointer;
        }
        .asset-preview {
            margin-top: 0.75rem;
        }
        .asset-thumbnail {
            max-width: 200px;
            max-height: 150px;
            object-fit: contain;
            border: 1px solid #ddd;
            background: #fafafa;
            padding: 4px;
            transition: transform 0.2s ease;
        }
        .asset-thumbnail:hover {
            transform: scale(1.05);
        }
    `],
    standalone: true,
    imports: [SharedModule],
})


export class AssetURLSelectorField implements FormInputComponent<StringCustomFieldConfig> {
    readonly: boolean;
    config: StringCustomFieldConfig;
    formControl: FormControl;

    constructor(
        private dataService: DataService,
        private modalService: ModalService,
    ) { }

    openAssetSelector() {
        this.modalService
            .fromComponent(AssetPickerDialogComponent, {
                size: 'xl',
                locals: {
                    multiSelect: false,
                },
            })
            .subscribe(result => {
                if (result && result.length) {
                    const firstResult = result[0];
                    const firstResultURL = firstResult?.source;
                    this.formControl.setValue(firstResultURL)
                }
            });
    }

}
