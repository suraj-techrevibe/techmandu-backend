import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService, NotificationService, SharedModule } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';

@Component({
  selector: 'edit-blog',
  standalone: true,
  templateUrl: './blog-edit.component.html',
  imports: [SharedModule],
})
export class BlogEditComponent implements OnInit {
  form: FormGroup;
  id!: string;
  isCreateMode = false;
  private autoSlugLocked = true;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private dataService: DataService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      slug: ['', Validators.required],
      content: ['', Validators.required],
      metaTags: [''],        // String in your schema
      metaTitle: [''],
      metaDescription: [''],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.id = id;
    this.isCreateMode = id === 'create';

    // Auto-slug from name until user edits slug manually
    this.form.get('slug')!.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(() => (this.autoSlugLocked = false));

    this.form.get('name')!.valueChanges
      .pipe(debounceTime(120), distinctUntilChanged(), filter(() => this.autoSlugLocked))
      .subscribe((val: string) => {
        this.form.get('slug')!.setValue(this.slugify(val), { emitEvent: false });
      });

    if (!this.isCreateMode) {
      const GET_BLOG = gql`
        query GetBlog($id: ID!) {
          blog(id: $id) {
            id
            name
            slug
            content
            metaTags
            metaTitle
            metaDescription
          }
        }
      `;

      this.dataService
        .query<{ blog: any }>(GET_BLOG, { id: this.id })
        .mapSingle(data => data.blog)
        .subscribe(blog => {
          this.form.patchValue({
            name: blog.name ?? '',
            slug: blog.slug ?? '',
            content: blog.content ?? '',
            metaTags: blog.metaTags ?? '',
            metaTitle: blog.metaTitle ?? '',
            metaDescription: blog.metaDescription ?? '',
          });
          this.autoSlugLocked = !(!blog.slug && blog.name);
        });
    }
  }

  submit() {
    if (this.form.invalid) return;

    const v = this.form.value;
    const input = {
      name: v.name,
      slug: v.slug,
      content: v.content,
      metaTitle: v.metaTitle || null,
      metaDescription: v.metaDescription || null,
      metaTags: v.metaTags || null, // remains String
    };

    const CREATE_BLOG = gql`
      mutation CreateBlog($input: CreateblogInput!) {
        createBlog(input: $input) { id }
      }
    `;
    const UPDATE_BLOG = gql`
      mutation UpdateBlog($input: UpdateblogInput!) {
        updateBlog(input: $input) { id }
      }
    `;

    const mutation = this.isCreateMode ? CREATE_BLOG : UPDATE_BLOG;
    const variables = { input: this.isCreateMode ? input : { id: this.id, ...input } };

    this.dataService
      .mutate<{ createBlog?: { id: string }; updateBlog?: { id: string } }>(mutation, variables)
      .subscribe({
        next: (res) => {
          const blogId = res.createBlog?.id || res.updateBlog?.id;
          this.notificationService.success(this.isCreateMode ? 'Blog created' : 'Blog updated');
          if (this.isCreateMode && blogId) {
            this.router.navigate(['/extensions/blog/blogs', blogId]); // adjust to your route
          }
        },
        error: (err) => {
          this.notificationService.error('Failed to save: ' + err.message);
        },
      });
  }

  deleteBlog() {
    if (this.isCreateMode) return;
    const confirmed = confirm('Are you sure you want to delete this blog?');
    if (!confirmed) return;

    const DELETE_BLOG = gql`
      mutation DeleteBlog($id: ID!) {
        deleteBlog(id: $id) { result message }
      }
    `;

    this.dataService
      .mutate<{ deleteBlog: { result: string; message: string } }>(DELETE_BLOG, { id: this.id })
      .subscribe({
        next: ({ deleteBlog }) => {
          if (deleteBlog.result === 'DELETED') {
            this.notificationService.success('Blog deleted');
            this.router.navigate(['/extensions/blog/blogs']); // adjust to your list route
          } else {
            this.notificationService.error('Failed to delete: ' + deleteBlog.message);
          }
        },
        error: err => {
          this.notificationService.error('Deletion failed: ' + err.message);
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
