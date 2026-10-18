import { registerRouteComponent } from '@vendure/admin-ui/core';
import { CustomerPromotionUsageListComponent } from './components/customer-promotion-usage-list.component';

export default [
  registerRouteComponent({
    component: CustomerPromotionUsageListComponent,
    path: '', // because the nav points to ['extensions','promotion-usage']
    breadcrumb: 'Customer Promotion Usage',
  }),
];
