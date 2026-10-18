import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, PaginatedList, RequestContext, Translated } from '@vendure/core';
import {
  QueryPageArgs,
  QueryPageGroupArgs,
  QueryPageGroupsArgs,
  QueryPagesArgs,
} from '../../codegen/generated-shop-types';
import { PageGroup } from '../entities/page-group.entity';
import { Page } from '../entities/page.entity';
import { PageGroupService } from '../services/page-group.service';
import { PageService } from '../services/page.service';

@Resolver()
export class PageShopResolver {
  constructor(
    private pageService: PageService,
    private pageGroupService: PageGroupService
  ) {}

  @Query()
  async pages(
    @Ctx() ctx: RequestContext,
    @Args() args: QueryPagesArgs
  ): Promise<PaginatedList<Translated<Page>>> {
    return this.pageService.findAll(ctx, {
      ...args.options,
      filter: {
        ...args.options?.filter,
        // Ensure that only enabled pages are returned, regardless of the filter provided
        enabled: { eq: true },
      },
    });
  }

  @Query()
  async page(
    @Ctx() ctx: RequestContext,
    @Args() args: QueryPageArgs
  ): Promise<Translated<Page>> {
    return this.pageService.findOne(ctx, args);
  }

  @Query()
  async pageGroups(
    @Ctx() ctx: RequestContext,
    @Args() args: QueryPageGroupsArgs
  ): Promise<PaginatedList<Translated<PageGroup>>> {
    return this.pageGroupService.findAll(ctx, {
      ...args.options,
      filter: {
        ...args.options?.filter,
        // Ensure that only enabled page groups are returned, regardless of the filter provided
        enabled: { eq: true },
      },
    });
  }

  @Query()
  async pageGroup(
    @Ctx() ctx: RequestContext,
    @Args() args: QueryPageGroupArgs
  ): Promise<Translated<PageGroup>> {
    return this.pageGroupService.findOne(ctx, args);
  }
}
