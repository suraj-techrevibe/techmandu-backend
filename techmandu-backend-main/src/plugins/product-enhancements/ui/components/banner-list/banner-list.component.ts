import { Component, OnInit } from '@angular/core';
import { DataService, SharedModule,NotificationService,ModalService } from '@vendure/admin-ui/core';
import { gql } from 'graphql-tag';
import { Observable,Subject,merge   } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { tap,switchMap } from 'rxjs/operators';



const GET_BANNERS = gql`
    query GetHeroSectionBanners {
        heroSectionBanners {
            id
            title
            description
            ctaText
            ctaLink
            image {
                id
                preview
            }
        }
    }
`;
const DELETE_BANNER = gql`
  mutation DeleteBanner($id: ID!) {
      deleteBanner(id: $id) {
          result
      }
  }
`;

interface Banner {
    id: string;
    title: string;
    description: string;
    ctaText: string;
    ctaLink: string;
    image: {
        id: string;
        preview: string;
    };
}

@Component({
    selector: 'banner-list',
    standalone: true,
    imports: [SharedModule],
    templateUrl: './banner-list.component.html',
    styleUrls: ['./banner-list.component.scss']
})
export class BannerListComponent implements OnInit {
    banners$: Observable<Banner[]>;
    refresh$ = new Subject<void>();
    constructor(
        private dataService: DataService,
        private router: Router,
        private route: ActivatedRoute,
         private modalService: ModalService,               
  private notificationService: NotificationService

    ) {}

    // ngOnInit() {
    //     this.loadBanners();
    // }
ngOnInit() {
     const routeReentered$ = this.route.url.pipe(tap(() => this.refresh$.next()));
 this.banners$ = merge(this.refresh$, routeReentered$).pipe(
    switchMap(() =>
      this.dataService
        .query<{ heroSectionBanners: Banner[] }>(GET_BANNERS)
        .mapSingle(data => data.heroSectionBanners)
    ),
    tap(banners => {
      console.log('Banners loaded:', banners);
      console.log('Number of banners:', banners?.length || 0);
    })
  );

  this.refresh$.next();
}

    // loadBanners() {
    //     this.banners$ = this.dataService
    //         .query<{ heroSectionBanners: Banner[] }>(GET_BANNERS)
    //         .mapSingle(data => data.heroSectionBanners)
    //         .pipe(
    //             tap(banners => {
    //                 console.log('Banners loaded:', banners);
    //                 console.log('Number of banners:', banners?.length || 0);
    //             })
    //         );
    //          this.refresh$.next();
    // }

    onBannerClick(banner: Banner) {
        console.log('Banner clicked:', banner);
        this.router.navigate(['./', banner.id], { relativeTo: this.route });
    }

     deleteBanner(banner: Banner) {
        this.modalService
            .dialog({
                title: `Delete "${banner.title}"?`,
                body: 'Are you sure you want to delete this banner? This action cannot be undone.',
                buttons: [
                    { type: 'secondary', label: 'Cancel' },
                    { type: 'danger', label: 'Delete', returnValue: true },
                ],
            })
            .subscribe(response => {
                if (response) {
                    this.dataService.mutate(DELETE_BANNER, { id: banner.id }).subscribe({
                        next: () => {
                            this.notificationService.success('Banner deleted successfully');
                            this.refresh$.next(); 
                        },
                        error: (err) => {
                            this.notificationService.error('Failed to delete banner: ' + err.message);
                        },
                    });
                }
            });
        }

}