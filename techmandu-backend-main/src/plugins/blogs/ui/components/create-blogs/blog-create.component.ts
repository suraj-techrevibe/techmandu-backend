import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService, NotificationService, SharedModule } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';

@Component({
  selector: 'create-blog',
  standalone: true,
  templateUrl: './blog-create.component.html',
  imports: [SharedModule],
})
export class BlogCreateComponent {
  blogForm: FormGroup;
  private autoSlugLocked = true;

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private notificationService: NotificationService,
    private router: Router,
  ) {
    this.blogForm = this.fb.group({
      name: ['', Validators.required],
      slug: ['', Validators.required],
      content: ['', Validators.required],
      metaTags: [''],
      metaTitle: [''],
      metaDescription: [''],
    });

    // Stop auto-slug once user edits slug manually
    this.blogForm.get('slug')!.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(() => (this.autoSlugLocked = false));

    // Auto-generate slug from name
    this.blogForm.get('name')!.valueChanges
      .pipe(debounceTime(120), distinctUntilChanged(), filter(() => this.autoSlugLocked))
      .subscribe((val: string) => {
        this.blogForm.get('slug')!.setValue(this.slugify(val), { emitEvent: false });
      });
  }

  createBlog() {
    if (this.blogForm.invalid) return;

    const value = this.blogForm.value;
    const input = {
      name: value.name,
      slug: value.slug,
      content: value.content,
      metaTitle: value.metaTitle || null,
      metaDescription: value.metaDescription || null,
      metaTags: value.metaTags || null, // API expects String, not array
    };

    const CREATE_BLOG = gql`
      mutation CreateBlog($input: CreateblogInput!) {
        createBlog(input: $input) { id }
      }
    `;

    this.dataService
      .mutate<{ createBlog: { id: string } }>(CREATE_BLOG, { input })
      .pipe(map(res => res.createBlog.id))
      .subscribe({
        next: (blogId) => {
          this.notificationService.success('Blog created');
          this.router.navigate(['/extensions/blogs', blogId]);
        },
        error: (err) => {
          this.notificationService.error('Failed to create: ' + err.message);
        },
      });
  }

  private slugify(s: string): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 120);
  }
}
