import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService, NotificationService, SharedModule, ModalService, AssetPickerDialogComponent, Asset } from '@vendure/admin-ui/core';
import { CREATE_BANNER, GET_BANNER,UPDATE_BANNER } from './banner-detail.graphql';

@Component({
    selector: 'banner-detail',
    standalone: true,
    imports: [SharedModule],
    templateUrl: './banner-detail.component.html',
    styleUrls: ['./banner-detail.component.scss']
})
export class BannerDetailComponent implements OnInit {
    form: FormGroup;
    featuredAsset: Asset | undefined;
    isNew = true;
    bannerId: string | null = null;

    constructor(
        private fb: FormBuilder,
        private dataService: DataService,
        private notificationService: NotificationService,
        private router: Router,
        private route: ActivatedRoute,
        private modalService: ModalService,
        private cdr: ChangeDetectorRef
    ) {
        this.form = this.fb.group({
            title: ['', [Validators.required, Validators.minLength(3)]],
            description: ['', [Validators.required, Validators.minLength(10)]],
            ctaText: ['', [Validators.required, Validators.minLength(2)]],
            ctaLink: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
            imageId: [null, Validators.required],
        });
    }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id && id !== 'create') {
                this.isNew = false;
                this.bannerId = id;
                this.loadBanner(id);
            }
        });
    }

    loadBanner(id: string) {
        this.dataService
            .query(GET_BANNER, { id })
            .mapSingle(data => (data as any).heroSectionBanner)
            .subscribe(banner => {
                if (banner) {
                    this.form.patchValue({
                        title: banner.title,
                        description: banner.description,
                        ctaText: banner.ctaText,
                        ctaLink: banner.ctaLink,
                        imageId: banner.image?.id,
                    });
                    this.featuredAsset = banner.image;
                    this.cdr.markForCheck();
                }
            });
    }

    selectImage() {
        this.modalService
            .fromComponent(AssetPickerDialogComponent, {
                size: 'xl',
            })
            .subscribe(result => {
                if (result && result.length) {
                    this.featuredAsset = result[0];
                    this.form.patchValue({ imageId: result[0].id });
                    this.form.markAsDirty();
                    this.cdr.markForCheck();
                }
            });
    }

    createBanner() {
        if (this.form.invalid) {
            this.notificationService.error('Please fill all required fields correctly');
            Object.keys(this.form.controls).forEach(key => {
                const control = this.form.get(key);
                if (control?.invalid) {
                    control.markAsTouched();
                }
            });
            return;
        }

        const formValue = this.form.value;
        
        if (this.isNew) {
           
            this.dataService
                .mutate(CREATE_BANNER, {
                    title: formValue.title,
                    description: formValue.description,
                    ctaText: formValue.ctaText,
                    ctaLink: formValue.ctaLink,
                    imageId: formValue.imageId,
                })
                .subscribe({
                    next: () => {
                        this.notificationService.success('Banner created successfully');
                        this.router.navigate(['../../'], { relativeTo: this.route });
                    },
                    error: (err) => {
                        this.notificationService.error('Failed to create banner: ' + err.message);
                    },
                });
        } else {
           
            this.dataService
                .mutate(UPDATE_BANNER, {
                    id: this.bannerId,
                    title: formValue.title,
                    description: formValue.description,
                    ctaText: formValue.ctaText,
                    ctaLink: formValue.ctaLink,
                    imageId: formValue.imageId,
                })
                .subscribe({
                    next: () => {
                        this.notificationService.success('Banner updated successfully');
                        this.router.navigate(['../../'], { relativeTo: this.route });
                    },
                    error: (err) => {
                        this.notificationService.error('Failed to update banner: ' + err.message);
                    },
                });
        }
    }

    cancel() {
        this.router.navigate(['../../'], { relativeTo: this.route });
    }

    getErrorMessage(fieldName: string): string {
        const control = this.form.get(fieldName);
        if (control?.hasError('required')) {
            return 'This field is required';
        }
        if (control?.hasError('minlength')) {
            const minLength = control.errors?.['minlength']?.requiredLength;
            return `Minimum ${minLength} characters required`;
        }
        if (control?.hasError('pattern')) {
            return 'Please enter a valid URL (e.g., https://example.com)';
        }
        return '';
    }

    isFieldInvalid(fieldName: string): boolean {
        const control = this.form.get(fieldName);
        return !!(control?.invalid && (control?.dirty || control?.touched));
    }
}