import { registerRouteComponent } from '@vendure/admin-ui/core';
import { BiddingHistoryListComponent } from './components/bidding-list/bidding-history-list.component';

export default [
registerRouteComponent({
        path: '',
        component: BiddingHistoryListComponent,
        title: 'Bidding History',
        breadcrumb: 'Bidding History',
    
    }),];
