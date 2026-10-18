import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext } from '@vendure/core';
import { QueryPagesArgs } from '../../codegen/generated-admin-types';
import { PageGroup } from '../entities/page-group.entity';
import { PageGroupService } from '../services/page-group.service';

@Resolver('PageGroup')
export class PageGroupEntityResolver {
  constructor(private readonly pageGroupService: PageGroupService) {}

  @ResolveField()
  async pages(
    @Ctx() ctx: RequestContext,
    @Parent() pageGroup: PageGroup,
    @Args() args: QueryPagesArgs
  ) {
    return this.pageGroupService.findGroupPagesByGroupId(
      ctx,
      pageGroup.id,
      args.options
    );
  }
}
