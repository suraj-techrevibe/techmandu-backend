import { Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, CollectionService } from '@vendure/core';

@Resolver()
export class NavbarCollectionResolver {
  constructor(private collectionService: CollectionService) {}

  @Query()
  async navBarCollections(@Ctx() ctx: RequestContext) {
    const { items } = await this.collectionService.findAll(ctx, {
      filter: {
        customFields: {
          showInNavBar: { eq: true },
        },
      } as any,
    });
  
    return items;
  }
}
