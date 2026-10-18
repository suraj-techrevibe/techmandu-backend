import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@vendure/admin-ui/core';
import { BannerListComponent } from './components/banner-list/banner-list.component';
import { BannerDetailComponent } from './components/banner-detail/banner-detail.component';

@NgModule({
    imports: [
        SharedModule,
        
        RouterModule.forChild([
            {
                path: '',
                pathMatch: 'full',
                component: BannerListComponent,
                data: { breadcrumb: 'Banners' },
            },
            {
       
        path: 'create',
        component: BannerDetailComponent,
        data: { breadcrumb: 'Create Banner' },
      },
            {
        path: ':id',
        component: BannerDetailComponent,
        data: { breadcrumb: 'Banner Detail' },
      },
        ]),
    ],
   //declarations: [BannerListComponent, BannerDetailComponent],
})
export class BannerModule {}