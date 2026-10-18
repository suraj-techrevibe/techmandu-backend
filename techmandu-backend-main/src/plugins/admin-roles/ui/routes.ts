import { registerRouteComponent } from '@vendure/admin-ui/core';
import { StoreDynamicRedirectComponent } from './components/redirect/redirect-component';


export default [
registerRouteComponent( {
    path: 'store-redirect',
    component: StoreDynamicRedirectComponent,
  })];
