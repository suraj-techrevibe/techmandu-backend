import { addNavMenuItem, registerFormInputComponent } from '@vendure/admin-ui/core';
import { AssetURLSelectorField } from './asset-url-selector';

export default [
    registerFormInputComponent('asset-url-selector', AssetURLSelectorField),
    addNavMenuItem(
        {
            id: 'ncm-shipping-workbench',
            label: 'Shipping workbench',
            routerLink: ['/extensions/shipping-workbench'],
            icon: 'truck',
            requiresPermission: 'UpdateOrder',
        },
        'sales',
    ),
];
