import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    createUpdatedTranslatable,
    findTranslation,
    LanguageCode,
    NotificationService,
    SharedModule,
    TypedBaseDetailComponent,
} from '@vendure/admin-ui/core';
import { combineLatest, Observable } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import {
    CreatePageDocument,
    CreatePageInput,
    GetPageDetailDocument,
    GetPageDetailQuery,
    GetPageGroupsSelectOptionsDocument,
    UpdatePageDocument,
    UpdatePageInput,
} from '../../generated/graphql';

@Component({
    selector: 'page-detail',
    templateUrl: './page-detail.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule],
})
export class PageDetailCompnent
    extends TypedBaseDetailComponent<typeof GetPageDetailDocument, 'page'>
    implements OnInit, OnDestroy
{
    detailForm: UntypedFormGroup;
    groups$: Observable<any[]>;

    constructor(
        private formBuilder: FormBuilder,
        private changeDetector: ChangeDetectorRef,
        private notificationService: NotificationService,
    ) {
        super();
        this.detailForm = this.formBuilder.group({
            title: ['', Validators.required],
            slug: ['', [Validators.required]],
            content: ['', [Validators.required]],
            metaKeywords: [null],
            metaTitle: [null],
            metaDescription: [null],
            enabled: [true, Validators.required],
            groupId: null,
        });
    }

    ngOnInit() {
        this.init();
        this.getPageGroups();
    }

    ngOnDestroy() {
        this.destroy();
    }

    create() {
        const pageFormGroup = this.detailForm;
        if (!pageFormGroup.dirty) {
            return;
        }

        const newPage = this.getUpdatedPage(
            {
                id: '',
                createdAt: '',
                updatedAt: '',
                title: '',
                slug: '',
                content: '',
                metaKeywords: '',
                metaTitle: '',
                metaDescription: '',
                enabled: true,
                languageCode: this.languageCode,
                translations: [],
            },
            pageFormGroup,
            this.languageCode,
        ) as CreatePageInput;

        this.dataService
            .mutate(CreatePageDocument, {
                input: {
                    enabled: newPage.enabled,
                    translations: newPage.translations,
                    group: pageFormGroup.get('groupId')?.value,
                },
            })
            .subscribe({
                next: ({ createPage }) => {
                    this.detailForm.markAsPristine();
                    this.notificationService.success(_('common.notify-create-success'), {
                        entity: 'Page',
                    });
                    this.router.navigate(['../', createPage.id], {
                        relativeTo: this.route,
                    });
                },
                error: err => {
                    this.notificationService.error(_('common.notify-create-error'), {
                        entity: 'Page',
                    });
                },
            });
    }

    update() {
        combineLatest([this.entity$, this.languageCode$])
            .pipe(
                take(1),
                map(([page, languageCode]) => {
                    const pageFormGroup = this.detailForm;
                    const pageInput = this.getUpdatedPage(
                        page,
                        pageFormGroup,
                        languageCode,
                    ) as UpdatePageInput;
                    return { pageInput, languageCode };
                }),
                switchMap(({ pageInput, languageCode }) =>
                    this.dataService
                        .mutate(UpdatePageDocument, {
                            input: {
                                id: pageInput.id,
                                enabled: pageInput.enabled,
                                group: this.detailForm.get('groupId')?.value,
                                translations: pageInput.translations,
                            },
                        })
                        .pipe(map(({ updatePage }) => ({ updatePage, languageCode }))),
                ),
            )
            .subscribe({
                next: ({ updatePage, languageCode }) => {
                    this.setFormValues(updatePage, languageCode);
                    this.detailForm.markAsPristine();
                    this.changeDetector.markForCheck();
                    this.notificationService.success(_('common.notify-update-success'), {
                        entity: 'Page',
                    });
                },
                error: err => {
                    this.notificationService.error(_('common.notify-update-error'), {
                        entity: 'Page',
                    });
                },
            });
    }

    private getPageGroups() {
        this.groups$ = this.dataService
            .query(GetPageGroupsSelectOptionsDocument)
            .mapSingle(data => data.pageGroups.items ?? []);
    }

    private getUpdatedPage(
        page: NonNullable<GetPageDetailQuery['page']>,
        pageFormGroup: UntypedFormGroup,
        languageCode: LanguageCode,
    ): UpdatePageInput | CreatePageInput {
        const updatedPage = createUpdatedTranslatable({
            translatable: page,
            updatedFields: pageFormGroup.value,
            languageCode,
            defaultTranslation: {
                languageCode,
                title: page.title || '',
                slug: page.slug || '',
                content: page.content || '',
                metaKeywords: page.metaKeywords || '',
                metaTitle: page.metaTitle || '',
                metaDescription: page.metaDescription || '',
            },
        });

        return updatedPage as UpdatePageInput | CreatePageInput;
    }

    protected setFormValues(entity: NonNullable<GetPageDetailQuery['page']>, languageCode: LanguageCode) {
        const currentTranslation = findTranslation(entity, languageCode) as any;
        this.detailForm.patchValue({
            enabled: entity.enabled,
            groupId: entity.group?.id ?? null,
            title: currentTranslation?.title ? currentTranslation.title : '',
            slug: currentTranslation?.slug ? currentTranslation.slug : '',
            content: currentTranslation?.content ? currentTranslation.content : '',
            metaKeywords: currentTranslation?.metaKeywords ? currentTranslation.metaKeywords : '',
            metaTitle: currentTranslation?.metaTitle ? currentTranslation.metaTitle : '',
            metaDescription: currentTranslation?.metaDescription ? currentTranslation.metaDescription : '',
        });
    }
}
