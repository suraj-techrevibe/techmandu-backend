import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, TransactionalConnection, Product, OrderLine, GlobalSettingsService, CurrencyCode } from '@vendure/core';
import { In } from 'typeorm';


type GqlProductList = { items: Product[]; totalItems: number };

@Resolver()
export class ShopResolver {
  constructor(
    private connection: TransactionalConnection,
    private readonly globalSettingsService: GlobalSettingsService,
  ) { }

  @Query()
  async highestSellingProduct(
    @Ctx() ctx: RequestContext,
    @Args('take') take: number,
  ): Promise<GqlProductList> {
    const limit = Math.max(1, Math.min(take ?? 10, 100));

    const qb = this.connection
      .getRepository(ctx, OrderLine)
      .createQueryBuilder('ol')
      .leftJoin('ol.order', 'o')
      .leftJoin('ol.productVariant', 'pv')
      .leftJoin('pv.product', 'p')
      .where('o.active = :active', { active: true })
      .select('p.id', 'productId')
      .addSelect(
        'SUM(COALESCE(NULLIF(ol.orderPlacedQuantity, 0), ol.quantity))',
        'totalQty',
      )
      .groupBy('p.id')
      .orderBy('"totalQty"', 'DESC')
      .limit(limit);

    const rows = await qb.getRawMany<{ productId: string; totalQty: string }>();
    const productIds = rows.map(r => r.productId);
    if (productIds.length === 0) return { items: [], totalItems: 0 };

    const products = await this.connection.getRepository(ctx, Product).findBy({ id: In(productIds) });

    const byId = new Map(products.map(p => [p.id, p]));
    const ranked = productIds.map(id => byId.get(id)).filter(Boolean) as Product[];

    return { items: ranked, totalItems: ranked.length };
  }
  

@Query()
async currencyExchangeRate(@Ctx() ctx: RequestContext) {
  const base = ctx.channel.defaultCurrencyCode as CurrencyCode;

  const gs = await this.globalSettingsService.getSettings(ctx);
  const { nprEquivalentToUsd, nprEquvalentToAud } = gs.customFields as {
    nprEquivalentToUsd: number;  
    nprEquvalentToAud: number;   
  };

  const nprPerUnit: Record<'NPR' | 'USD' | 'AUD', number> = {
    NPR: 1,
    USD: nprEquivalentToUsd,
    AUD: nprEquvalentToAud,
  };

  const baseFactor = nprPerUnit[base as 'NPR' | 'USD' | 'AUD'];
  if (!baseFactor) {
    throw new Error(`Unsupported base currency: ${base}`);
  }

  const rates = Object.fromEntries(
    Object.entries(nprPerUnit).map(([code, npr]) => [
      code.toLowerCase(),             
      Number((npr / baseFactor).toFixed(6)),
    ]),
  );

  return rates;
}

}
