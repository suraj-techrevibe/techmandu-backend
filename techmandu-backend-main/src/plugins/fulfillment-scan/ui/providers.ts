import { registerFormInputComponent } from '@vendure/admin-ui/core';
import { DisabledFormComponent } from './disabled-form/disabled-form.component';

export default [
    registerFormInputComponent('disabled-form-input', DisabledFormComponent),
];
