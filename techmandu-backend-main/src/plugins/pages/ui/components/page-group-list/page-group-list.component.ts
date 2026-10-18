import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ItemOf, LanguageCode, SharedModule, TypedBaseListComponent } from '@vendure/admin-ui/core';
import { combineLatest, distinctUntilChanged, map, Observable } from 'rxjs';
import { GetPageGroupsDocument, GetPageGroupsQuery } from '../../generated/graphql';

@Component({
    selector: 'page-group-list',
    templateUrl: './page-group-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule],
})
export class PageGroupListComponent
    extends TypedBaseListComponent<typeof GetPageGroupsDocument, 'pageGroups'>
    implements OnInit
{
    activePageGroup$: Observable<ItemOf<GetPageGroupsQuery, 'pageGroups'> | undefined>;
    readonly filters = this.createFilterCollection()
        .addFilter({
            name: 'name',
            label: 'Name',
            type: { kind: 'text' },
            filterField: 'name',
        })
        .addFilter({
            name: 'slug',
            label: 'Slug',
            type: { kind: 'text' },
            filterField: 'slug',
        })
        .connectToRoute(this.route);

    readonly sorts = this.createSortCollection()
        .defaultSort('createdAt', 'DESC')
        .addSorts([{ name: 'name' }, { name: 'slug' }, { name: 'createdAt' }, { name: 'updatedAt' }])
        .connectToRoute(this.route);

    constructor() {
        super();
        super.configure({
            document: GetPageGroupsDocument,
            getItems: data => data.pageGroups,
            setVariables: (skip, take) => ({
                options: {
                    skip,
                    take,
                    filter: {
                        name: {
                            contains: this.searchTermControl.value ?? '',
                            ...this.filters.createFilterInput(),
                        },
                    },
                    sort: this.sorts.createSortInput(),
                },
            }),
            refreshListOnChanges: [this.filters.valueChanges, this.sorts.valueChanges],
        });
    }

    ngOnInit(): void {
        super.ngOnInit();
        const activePageGrouId$ = this.route.paramMap.pipe(
            map(pm => pm.get('contents')),
            distinctUntilChanged(),
        );

        this.activePageGroup$ = combineLatest([this.items$, activePageGrouId$]).pipe(
            map(([items, activePageGroupId]) => {
                if (activePageGroupId) {
                    return items.find(t => t.id === activePageGroupId);
                }
            }),
        );
    }

    closeMembers() {
        const params = { ...this.route.snapshot.params };
        delete params.contents;
        this.router.navigate(['./', params], {
            relativeTo: this.route,
            queryParamsHandling: 'preserve',
        });
    }

    setLanguage(code: LanguageCode) {
        this.dataService.client.setContentLanguage(code).subscribe();
    }
}
