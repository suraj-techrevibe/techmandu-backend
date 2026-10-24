import { registerRouteComponent } from '@vendure/admin-ui/core';
import { ShippingWorkbenchComponent } from './components/shipping-workbench/shipping-workbench.component';

export default [
  registerRouteComponent({
    path: '',
    component: ShippingWorkbenchComponent,
    title: 'Shipping workbench',
    breadcrumb: 'Shipping workbench',
  }),
];
