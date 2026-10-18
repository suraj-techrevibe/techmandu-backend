import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { StringCustomFieldConfig, SharedModule, FormInputComponent } from '@vendure/admin-ui/core';

@Component({
    template: `
        <input class="disabled-form" type="string" [formControl]="formControl" />
    `,
    styleUrls: ['./disabled-form.component.scss'],
    standalone: true,
    imports: [SharedModule],
})
export class DisabledFormComponent implements FormInputComponent<StringCustomFieldConfig> {
    readonly: boolean;
    config: StringCustomFieldConfig;
    formControl: FormControl;
}
