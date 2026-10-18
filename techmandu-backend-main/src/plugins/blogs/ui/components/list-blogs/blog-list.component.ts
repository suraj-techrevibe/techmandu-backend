import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService, NotificationService, SharedModule } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

interface Blog {
  id: string;
  name: string;
  slug: string;
}

interface DeletionResponse {
  result: 'DELETED' | 'NOT_DELETED';
  message?: string;
}

@Component({
  selector: 'blog-list',
  templateUrl: './blog-list.component.html',
  standalone: true,
  imports: [SharedModule],
})
export class BlogListComponent implements OnInit {
  itemsPerPage$ = new BehaviorSubject<number>(10);
  currentPage$ = new BehaviorSubject<number>(1);
  totalItems$ = new BehaviorSubject<number>(0);
  blogs$: Observable<Blog[]>;
  selectedBlogIds: string[] = [];
  totalPages$: Observable<number>;

  constructor(
    private dataService: DataService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.blogs$ = this.fetchBlogs();
    this.totalPages$ = this.totalItems$.pipe(
      map(total => Math.ceil(total / this.itemsPerPage$.getValue()))
    );
  }

  setPageNumber(page: number) {
    this.currentPage$.next(page);
    this.blogs$ = this.fetchBlogs();
  }

  setItemsPerPage(count: number) {
    this.itemsPerPage$.next(count);
    this.blogs$ = this.fetchBlogs();
  }

  fetchBlogs(): Observable<Blog[]> {
    const GET_BLOGS = gql`
      query GetBlogs($skip: Int!, $take: Int!) {
        blogs(options: { skip: $skip, take: $take, sort: { createdAt: DESC } }) {
          items {
            id
            name
            slug
          }
          totalItems
        }
      }
    `;

    return this.dataService
      .query<{ blogs: { items: Blog[]; totalItems: number } }>(GET_BLOGS, {
        skip: this.itemsPerPage$.getValue() * (this.currentPage$.getValue() - 1),
        take: this.itemsPerPage$.getValue(),
      })
      .mapSingle(({ blogs }) => {
        this.totalItems$.next(blogs.totalItems);
        return blogs.items;
      });
  }

  editBlog(id: string) {
    this.router.navigate(['/extensions/blogs', id]);
  }

  toggleSelection(id: string, checked: boolean) {
    if (checked) {
      this.selectedBlogIds.push(id);
    } else {
      this.selectedBlogIds = this.selectedBlogIds.filter(existingId => existingId !== id);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedBlogIds.includes(id);
  }

  deleteSelectedBlogs() {
    if (!this.selectedBlogIds.length) return;

    const DELETE_BLOG = gql`
      mutation DeleteBlog($id: ID!) {
        deleteBlog(id: $id) {
          result
          message
        }
      }
    `;

    // Run individual deleteBlog mutations in parallel
    forkJoin(
      this.selectedBlogIds.map(id =>
        this.dataService
          .mutate<{ deleteBlog: DeletionResponse }>(DELETE_BLOG, { id })
          .pipe(map(res => res.deleteBlog))
      )
    ).subscribe({
      next: (responses) => {
        const failed = responses.filter(r => r.result !== 'DELETED');
        if (failed.length) {
          this.notificationService.error('Some blogs could not be deleted');
        } else {
          this.notificationService.success('Blogs deleted');
        }
        this.blogs$ = this.fetchBlogs();
        this.selectedBlogIds = [];
      },
      error: (err) => {
        this.notificationService.error('Deletion failed: ' + err.message);
      },
    });
  }

  navigateToCreate() {
    this.router.navigate(['/extensions/blogs/create']);
  }
}
