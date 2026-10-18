import { addNavMenuSection, registerCustomDetailComponent, registerFormInputComponent } from '@vendure/admin-ui/core';
import { AssetURLSelectorField } from './asset-url-selector';

export default [
    registerFormInputComponent('asset-url-selector', AssetURLSelectorField),
];
