import { Resolver, ResolveField } from '@nestjs/graphql';
import { isGraphQlErrorResult } from '@vendure/core';

@Resolver('RedeemTechCoinResult')
export class ApplyTechCoinsResultResolver {
  constructor() { }

  @ResolveField()
  __resolveType(value: any) {
    return isGraphQlErrorResult(value) ? (value as any).__typename : 'TechCoinsReedemResponse';
  }
}
