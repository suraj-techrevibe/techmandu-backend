import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext } from '@vendure/core';
import { Page } from '../entities/page.entity';
import { PageService } from '../services/page.service';

@Resolver('Page')
export class PageEntityResolver {
    constructor(private readonly pageService: PageService) {}

    @ResolveField()
    async group(@Ctx() ctx: RequestContext, @Parent() page: Page) {
        return this.pageService.getPageGroup(ctx, page.id);
    }
}
