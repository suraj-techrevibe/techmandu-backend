import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  Allow,
  Ctx,
  PaginatedList,
  RequestContext,
  Transaction,
  Translated,
} from '@vendure/core';
import {
  DeletionResponse,
  MutationAssignPagesToChannelsArgs,
  MutationAssignPagesToGroupArgs,
  MutationCreatePageArgs,
  MutationCreatePageGroupArgs,
  MutationDeletePageArgs,
  MutationDeletePageGroupArgs,
  MutationRemovePagesFromCurrentChannelArgs,
  MutationRemovePagesFromGroupArgs,
  MutationUpdatePageArgs,
  MutationUpdatePageGroupArgs,
  QueryPageArgs,
  QueryPageGroupArgs,
  QueryPageGroupsArgs,
  QueryPagesArgs,
} from '../../codegen/generated-admin-types';
import { pagePermission } from '../constants';
import { PageGroup } from '../entities/page-group.entity';
import { Page } from '../entities/page.entity';
import { PageGroupService } from '../services/page-group.service';
import { PageService } from '../services/page.service';

@Resolver()
export class PageAdminResolver {
  constructor(
    private pageService: PageService,
    private pageGroupService: PageGroupService
  ) {}

  @Allow(pagePermission.Create)
  @Mutation()
  async createPage(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationCreatePageArgs
  ): Promise<Translated<Page>> {
    return this.pageService.create(ctx, args.input);
  }

  @Allow(pagePermission.Update)
  @Mutation()
  async updatePage(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationUpdatePageArgs
  ): Promise<Translated<Page>> {
    return this.pageService.update(ctx, args.input);
  }

  @Allow(pagePermission.Read)
  @Query()
  async pages(
    @Ctx() ctx: RequestContext,
    @Args() args: QueryPagesArgs
  ): Promise<PaginatedList<Translated<Page>>> {
    return this.pageService.findAll(ctx, args.options);
  }

  @Allow(pagePermission.Read)
  @Query()
  async page(
    @Ctx() ctx: any,
    @Args() args: QueryPageArgs
  ): Promise<Translated<Page>> {
    return this.pageService.findOne(ctx, args);
  }

  @Transaction()
  @Allow(pagePermission.Delete)
  @Mutation()
  async deletePage(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationDeletePageArgs
  ): Promise<DeletionResponse> {
    return this.pageService.delete(ctx, args.ids);
  }

  @Transaction()
  @Mutation()
  @Allow(pagePermission.Update)
  async assignPagesToChannels(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationAssignPagesToChannelsArgs
  ): Promise<Translated<Page>[]> {
    return this.pageService.assignToChannels(
      ctx,
      args.input.pageIds,
      args.input.channelIds
    );
  }

  @Transaction()
  @Mutation()
  @Allow(pagePermission.Update)
  async removePagesFromCurrentChannel(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationRemovePagesFromCurrentChannelArgs
  ): Promise<Translated<Page>[]> {
    return this.pageService.removeFromCurrentChannel(ctx, args.pageIds);
  }

  @Allow(pagePermission.Create)
  @Mutation()
  async createPageGroup(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationCreatePageGroupArgs
  ): Promise<Translated<PageGroup>> {
    return this.pageGroupService.create(ctx, args.input);
  }

  @Allow(pagePermission.Update)
  @Mutation()
  async updatePageGroup(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationUpdatePageGroupArgs
  ): Promise<Translated<PageGroup>> {
    return this.pageGroupService.update(ctx, args.input);
  }

  @Allow(pagePermission.Delete)
  @Mutation()
  async deletePageGroup(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationDeletePageGroupArgs
  ): Promise<DeletionResponse> {
    return this.pageGroupService.delete(ctx, args.ids);
  }

  @Query()
  async pageGroups(
    @Ctx() ctx: RequestContext,
    @Args() args: QueryPageGroupsArgs
  ): Promise<PaginatedList<Translated<PageGroup>>> {
    return this.pageGroupService.findAll(ctx, args.options || undefined);
  }

  @Query()
  async pageGroup(
    @Ctx() ctx: RequestContext,
    @Args() args: QueryPageGroupArgs
  ): Promise<Translated<PageGroup>> {
    return this.pageGroupService.findOne(ctx, args);
  }

  @Mutation()
  async assignPagesToGroup(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationAssignPagesToGroupArgs
  ): Promise<Translated<PageGroup>> {
    return this.pageGroupService.assignPagesToGroup(
      ctx,
      args.input.groupId,
      args.input.pageIds
    );
  }

  @Mutation()
  async removePagesFromGroup(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationRemovePagesFromGroupArgs
  ): Promise<Translated<PageGroup>> {
    return this.pageGroupService.removePagesFromGroup(
      ctx,
      args.input.groupId,
      args.input.pageIds
    );
  }
}
