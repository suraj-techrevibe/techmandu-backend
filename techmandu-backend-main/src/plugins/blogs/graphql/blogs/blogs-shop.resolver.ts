import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, PaginatedList, RequestContext } from '@vendure/core';
import { Blog } from '../../entities/blog-entity';

import { BlogsService } from './blogs.service';

@Resolver()
export class BlogsShopResolver {
  constructor(private blogsService: BlogsService) {}

  @Query()
  async blogs(
    @Ctx() ctx: RequestContext,
    @Args() args: any
  ): Promise<PaginatedList<Blog>> {
    return this.blogsService.getblogs(ctx, args.options);
  }

  @Query()
  async blogBySlug(
    @Ctx() ctx: RequestContext,
    @Args() args: any
  ): Promise<Blog> {
    return this.blogsService.getBlogFromSlug(ctx, args.slug);
  }
}
