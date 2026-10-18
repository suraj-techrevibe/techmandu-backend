import { Component, OnInit } from '@angular/core';
import { DataService, SharedModule } from '@vendure/admin-ui/core';
import { gql } from 'graphql-tag';

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
                source
            }
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
        source: string;
    };
}

interface GetBannersResponse {
    heroSectionBanners: Banner[];
}

@Component({
    selector: 'banner-list',
    standalone: true,
    imports: [SharedModule],
    template: `
        <vdr-page-block>
            <vdr-action-bar>
                <vdr-ab-left>
                    <h1>Hero Section Banners</h1>
                </vdr-ab-left>
                <vdr-ab-right>
                    <vdr-action-bar-items locationId="banner-list"></vdr-action-bar-items>
                </vdr-ab-right>
            </vdr-action-bar>
            
            <vdr-data-table 
                [items]="banners$ | async" 
                [itemsPerPage]="10">
                <vdr-dt-column>Image</vdr-dt-column>
                <vdr-dt-column>Title</vdr-dt-column>
                <vdr-dt-column>Description</vdr-dt-column>
                <vdr-dt-column>CTA</vdr-dt-column>
                
                <ng-template let-banner="item">
                    <td class="left align-middle">
                        <img 
                            [src]="banner.image?.preview" 
                            style="max-width: 80px; height: auto; border-radius: 4px;" 
                            *ngIf="banner.image?.preview" 
                            alt="Banner image"
                        />
                    </td>
                    <td class="left align-middle">
                        <strong>{{ banner.title }}</strong>
                    </td>
                    <td class="left align-middle">
                        <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            {{ banner.description }}
                        </div>
                    </td>
                    <td class="left align-middle">
                        <div>
                            <strong>{{ banner.ctaText }}</strong>
                            <br>
                            <a [href]="banner.ctaLink" target="_blank" style="color: #1e88e5; text-decoration: none;">
                                {{ banner.ctaLink }}
                            </a>
                        </div>
                    </td>
                </ng-template>
            </vdr-data-table>
        </vdr-page-block>
    `,
})
export class BannerListComponent implements OnInit {
    banners$;

    constructor(private dataService: DataService) {}

    ngOnInit() {
        this.banners$ = this.dataService
            .query<GetBannersResponse>(GET_BANNERS)
            .mapSingle((data: GetBannersResponse) => data.heroSectionBanners || []);
    }
}