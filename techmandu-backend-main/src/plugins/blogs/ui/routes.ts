import { registerRouteComponent } from '@vendure/admin-ui/core';
import { BlogListComponent } from './components/list-blogs/blog-list.component';
import { BlogEditComponent } from './components/edit-blogs/blog-edit.component';
import { BlogCreateComponent } from './components/create-blogs/blog-create.component';

export default [
    registerRouteComponent({
        path: '',
        component: BlogListComponent,
        title: 'Blogs',
        breadcrumb: 'Blogs',
    }),
    registerRouteComponent({
        path: 'create',
        component: BlogCreateComponent,
        title: 'Create Blog',
         breadcrumb: [
            {
                label: 'Blogs',
                link: ['/extensions', 'blogs'],
            },
            {
                label: `Create Blog`,
                link: ['/extensions', 'blogs', 'create'],
            },
        ]
    }),
    registerRouteComponent({
        path: ':id',
        component: BlogEditComponent,
        title: 'Edit Blog',
        breadcrumb: [
            {
                label: 'Blogs',
                link: ['/extensions', 'blogs'],
            },
            {
                label: `Edit Blog`,
                link: ['/extensions', 'blogs', ':id'],
            },
        ]
    }),
];
