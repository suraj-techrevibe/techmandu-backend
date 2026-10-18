import { Args, Query, Mutation, Resolver } from '@nestjs/graphql';
import {
  Ctx,
  RequestContext,
  Allow,
  Permission,
  Customer,
  ID,
  ListQueryOptions,
  PaginatedList,
  Relations,
  RelationPaths,
} from '@vendure/core';
import { BusinessAccountService } from '../services/business-account.service';

@Resolver()
export class BusinessAccountAdminResolver {
  constructor(private businessAccountService: BusinessAccountService) {}

  @Query()
  async businessAccounts(
    @Ctx() ctx: RequestContext,
    @Args() args: { options?: ListQueryOptions<Customer> },
    @Relations(Customer) relations: RelationPaths<Customer>,
  ): Promise<PaginatedList<Customer>> {
    return this.businessAccountService.findBusinessAccounts(
      ctx,
      args.options,
      relations,
    );
  }

  @Query()
  async businessAccount(
    @Ctx() ctx: RequestContext,
    @Args() args: { id: ID },
    @Relations(Customer) relations: RelationPaths<Customer>,
  ): Promise<Customer | null> {
    return this.businessAccountService.findOne(ctx, args.id, relations);
  }

  @Mutation()
  async verifyBusinessAccount(
    @Ctx() ctx: RequestContext,
    @Args() args: { id: ID; isVerified: boolean },
  ): Promise<Customer> {
    return this.businessAccountService.updateVerificationStatus(
      ctx,
      args.id,
      args.isVerified,
    );
  }
}

