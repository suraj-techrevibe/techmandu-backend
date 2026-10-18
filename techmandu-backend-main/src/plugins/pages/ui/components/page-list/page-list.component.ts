import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LanguageCode, SharedModule, TypedBaseListComponent } from '@vendure/admin-ui/core';
import { GetPageListDocument, LogicalOperator } from '../../generated/graphql';

@Component({
    selector: 'page-list',
    templateUrl: './page-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule],
})
export class PageListComponent extends TypedBaseListComponent<typeof GetPageListDocument, 'pages'> {
    readonly filters = this.createFilterCollection()
        .addIdFilter()
        .addFilter({
            name: 'title',
            label: 'Title',
            type: { kind: 'text' },
        })
        .addFilter({
            filterField: 'slug',
            type: { kind: 'text' },
            label: 'Slug',
            name: 'slug',
        })
        .addFilter({
            filterField: 'enabled',
            type: { kind: 'boolean' },
            label: 'Enabled',
            name: 'enabled',
        })
        .connectToRoute(this.route);

    readonly sorts = this.createSortCollection()
        .defaultSort('createdAt', 'DESC')
        .addSort({ name: 'id' })
        .addSort({ name: 'createdAt' })
        .addSort({ name: 'updatedAt' })
        .addSort({ name: 'title' })
        .addSort({ name: 'slug' })
        .connectToRoute(this.route);

    constructor() {
        super();
        super.configure({
            document: GetPageListDocument,
            getItems: data => data.pages,
            setVariables: (skip, take) => ({
                sorts: this.sorts.createSortInput(),
                options: {
                    skip,
                    take,
                    filterOperator: LogicalOperator.OR,
                    filter: {
                        ...(this.searchTermControl.value
                            ? {
                                  title: { contains: this.searchTermControl.value },
                                  slug: { contains: this.searchTermControl.value },
                              }
                            : {}),
                        ...this.filters.createFilterInput(),
                    },
                    sort: this.sorts.createSortInput(),
                },
            }),
            refreshListOnChanges: [this.filters.valueChanges, this.sorts.valueChanges],
        });
    }

    setLanguage(code: LanguageCode) {
        this.dataService.client.setContentLanguage(code).subscribe();
    }
}
