import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  Allow,
  Ctx,
  PaginatedList,
  RequestContext,
  Transaction,
} from '@vendure/core';
import { Blog } from '../../entities/blog-entity';

import { BlogsService } from './blogs.service';
import { blogsPermission } from '../../constants';

@Resolver()
export class BlogsAdminResolver {
  constructor(private blogsService: BlogsService) {}

  @Query()
  @Allow(blogsPermission.Read)
  async blogs(
    @Ctx() ctx: RequestContext,
    @Args() args: any
  ): Promise<PaginatedList<Blog>> {
    return this.blogsService.getblogs(ctx, args.options || undefined);
  }

  @Query()
  @Allow(blogsPermission.Read)
  async blog(@Ctx() ctx: RequestContext, @Args() args: any): Promise<Blog> {
    return this.blogsService.getBlog(ctx, args.id);
  }

  @Transaction()
  @Mutation()
  @Allow(blogsPermission.Create)
  async createBlog(
    @Ctx() ctx: RequestContext,
    @Args() args: any
  ): Promise<Blog> {
    return this.blogsService.createBlog(ctx, args.input);
  }

  @Transaction()
  @Mutation()
  @Allow(blogsPermission.Update)
  async updateBlog(
    @Ctx() ctx: RequestContext,
    @Args() args: any
  ): Promise<Blog> {
    return this.blogsService.updateBlog(ctx, args.input);
  }

  @Transaction()
  @Mutation()
  @Allow(blogsPermission.Delete)
  async deleteBlog(
    @Ctx() ctx: RequestContext,
    @Args() args: any
  ): Promise<any> {
    return this.blogsService.deleteBlog(ctx, args.id);
  }
}
