import { registerRouteComponent } from '@vendure/admin-ui/core';
import { BannerListComponent } from './components/banner-list/banner-list.component';
import { BannerDetailComponent } from './components/banner-detail/banner-detail.component';

export default [
    registerRouteComponent({
        path: '',
        component: BannerListComponent,
        title: 'Banners',
        breadcrumb: 'Banners',
    }),
    registerRouteComponent({
        path: ':id',
        component: BannerDetailComponent,
       getBreadcrumbs: entity => {
            return [
                { label: 'Banners', link: ['/extensions', 'banners'] },
                { label: entity ? `${(entity as any).title}` : 'Create Banner', link: [] },
            ];
        },
    }),
];