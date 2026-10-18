import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Ctx, Customer, RequestContext } from '@vendure/core';
import { TechCoinService } from '../service/tech-coin.service';

@Resolver('Customer')
export class CustomerEntityResolver {
  constructor(private techcoinService: TechCoinService) { }

  @ResolveField()
  async availableLoyaltyPoints(@Ctx() ctx: RequestContext, @Parent() customer: Customer): Promise<number> {
    return this.techcoinService.getAvailablePointsForCustomer(ctx, customer.id);
  }
}
