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
import { map, switchMap, take } from 'rxjs/operators';
import {
    CreatePageGroupDocument,
    GetPageGroupDocument,
    UpdatePageGroupDocument,
    GetPageGroupQuery,
    UpdatePageGroupInput,
    CreatePageGroupInput,
} from '../../generated/graphql';
import { combineLatest } from 'rxjs';

@Component({
    selector: 'page-group-detail',
    templateUrl: './page-group-detail.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule],
})
export class PageGroupDetailComponent
    extends TypedBaseDetailComponent<typeof GetPageGroupDocument, 'pageGroup'>
    implements OnInit, OnDestroy
{
    detailForm: UntypedFormGroup;

    constructor(
        private formBuilder: FormBuilder,
        private changeDetector: ChangeDetectorRef,
        private notificationService: NotificationService,
    ) {
        super();
        this.detailForm = this.formBuilder.group({
            name: ['', Validators.required],
            slug: ['', Validators.required],
            enabled: [true, Validators.required],
        });
    }

    ngOnInit() {
        this.init();
    }

    ngOnDestroy() {
        this.destroy();
    }

    create() {
        const pageGroupFormGroup = this.detailForm;
        if (!pageGroupFormGroup.dirty) {
            return;
        }

        const newPageGroup = this.getUpdatedPageGroup(
            {
                id: '',
                createdAt: '',
                updatedAt: '',
                name: '',
                slug: '',
                enabled: true,
                translations: [],
            },
            pageGroupFormGroup,
            this.languageCode,
        ) as CreatePageGroupInput;

        this.dataService
            .mutate(CreatePageGroupDocument, {
                input: {
                    enabled: newPageGroup.enabled,
                    translations: newPageGroup.translations,
                },
            })
            .subscribe({
                next: ({ createPageGroup }) => {
                    this.detailForm.markAsPristine();
                    this.changeDetector.markForCheck();
                    this.notificationService.success(_('common.notify-create-success'), {
                        entity: 'PageGroup',
                    });
                    this.router.navigate(['../', createPageGroup.id], {
                        relativeTo: this.route,
                    });
                },
                error: err => {
                    this.notificationService.error(_('common.notify-create-error'), {
                        entity: 'PageGroup',
                    });
                },
            });
    }

    update() {
        combineLatest([this.entity$, this.languageCode$])
            .pipe(
                take(1),
                map(([entity, languageCode]) => {
                    const pageGroupFormGroup = this.detailForm;
                    const pageGroupInput = this.getUpdatedPageGroup(
                        entity,
                        pageGroupFormGroup,
                        languageCode,
                    ) as UpdatePageGroupInput;
                    return { pageGroupInput, languageCode };
                }),
                switchMap(({ pageGroupInput, languageCode }) => {
                    return this.dataService
                        .mutate(UpdatePageGroupDocument, {
                            input: {
                                id: pageGroupInput.id,
                                enabled: pageGroupInput.enabled,
                                translations: pageGroupInput.translations,
                            },
                        })
                        .pipe(map(({ updatePageGroup }) => ({ updatePageGroup, languageCode })));
                }),
            )
            .subscribe({
                next: ({ updatePageGroup, languageCode }) => {
                    this.setFormValues(updatePageGroup, languageCode);
                    this.detailForm.markAsPristine();
                    this.changeDetector.markForCheck();
                    this.notificationService.success(_('common.notify-update-success'), {
                        entity: 'PageGroup',
                    });
                },
                error: err => {
                    this.notificationService.error(_('common.notify-update-error'), {
                        entity: 'PageGroup',
                    });
                },
            });
    }

    private getUpdatedPageGroup(
        pageGroup: NonNullable<GetPageGroupQuery['pageGroup']>,
        pageGroupFormGroup: UntypedFormGroup,
        languageCode: LanguageCode,
    ): UpdatePageGroupInput | CreatePageGroupInput {
        const updatedPageGroup = createUpdatedTranslatable({
            translatable: pageGroup,
            updatedFields: pageGroupFormGroup.value,
            languageCode,
            defaultTranslation: {
                languageCode,
                name: pageGroup.name || '',
                slug: pageGroup.slug || '',
            },
        });

        return updatedPageGroup as UpdatePageGroupInput | CreatePageGroupInput;
    }

    protected setFormValues(entity: NonNullable<GetPageGroupQuery['pageGroup']>, languageCode: LanguageCode) {
        const currentTranslation = findTranslation(entity, languageCode) as any;
        this.detailForm.patchValue({
            name: currentTranslation?.name ?? '',
            slug: currentTranslation?.slug ?? '',
            enabled: entity.enabled,
        });
    }
}
