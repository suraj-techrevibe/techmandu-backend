import { Args, Query, Resolver } from '@nestjs/graphql';
import {
  Allow,
  Ctx,
  Order,
  Permission,
  Promotion,
  RequestContext,
  TransactionalConnection,
} from '@vendure/core';
import { IsNull, In } from 'typeorm';

type PromotionUsageListOptions = { page?: number; pageSize?: number };
type PromotionUsageList = {
  items: Array<{
    customer: { firstName?: string | null; lastName?: string | null; email?: string | null };
    couponCode: string;
    currencyCode: string;
    orderId: string | number;
    createdAt: Date;
  }>;
  totalItems: number;
};

@Resolver()
export class AdminApiResolver {
  constructor(private connection: TransactionalConnection) {}

  @Query()
  @Allow(Permission.SuperAdmin)
  async customerPromotionUsage(
    @Args('options') options?: PromotionUsageListOptions,
    @Ctx() ctx?: RequestContext,
  ): Promise<PromotionUsageList> {
    const page = Math.max(1, options?.page ?? 1);
    const take = Math.min(100, Math.max(1, options?.pageSize ?? 10));
    const skip = (page - 1) * take;

    const promoRepo = this.connection.getRepository(ctx, Promotion);
    const promos = await promoRepo.find({ where: { enabled: true, deletedAt: IsNull() } });

    const matchingPromoIds = promos
      .filter(p => {
        const conditions = (p as any).conditions ?? [];
        const actions = (p as any).actions ?? [];
        return (
          conditions.some((c: any) => c?.code === 'customer_loyalty_min_points') &&
          actions.some((a: any) => a?.code === 'order_discount_per_loyalty_point')
        );
      })
      .map(p => p.id);

    if (matchingPromoIds.length === 0) {
      return { items: [], totalItems: 0 };
    }

    const states = ['PaymentSettled', 'Settled'];

    const connType = this.connection.rawConnection.options.type;

    
    const couponCodesPredicate =
      connType === 'postgres'
        ? `"order"."couponCodes" IS NOT NULL AND "order"."couponCodes" <> '' AND "order"."couponCodes" <> '[]'`
        : `(JSON_LENGTH(order.couponCodes) IS NOT NULL AND JSON_LENGTH(order.couponCodes) > 0)
           OR (order.couponCodes IS NOT NULL AND order.couponCodes <> '' AND order.couponCodes <> '[]')`;

    const orderRepo = this.connection.getRepository(ctx, Order);

    const countQb = orderRepo
      .createQueryBuilder('order')
      .innerJoin('order.promotions', 'promotion')
      .where('order.state IN (:...states)', { states })
      .andWhere('promotion.id IN (:...promoIds)', { promoIds: matchingPromoIds })
      .andWhere(couponCodesPredicate)
      .select('COUNT(DISTINCT order.id)', 'cnt');

    const raw = await countQb.getRawOne<{ cnt: string }>();
    const totalItems = Number(raw?.cnt ?? 0);
    if (totalItems === 0) {
      return { items: [], totalItems: 0 };
    }

    const idsQb = orderRepo
      .createQueryBuilder('order')
      .innerJoin('order.promotions', 'promotion')
      .where('order.state IN (:...states)', { states })
      .andWhere('promotion.id IN (:...promoIds)', { promoIds: matchingPromoIds })
      .andWhere(couponCodesPredicate)
      .select(['order.id AS id', 'order.createdAt AS createdAt'])
      .orderBy('order.createdAt', 'DESC')
      .offset(skip)
      .limit(take);

    const pagedIdRows = await idsQb.getRawMany<{ id: string | number }>();
    const pageIds = pagedIdRows.map(r => r.id);
    if (pageIds.length === 0) {
      return { items: [], totalItems };
    }

    const orders = await orderRepo.find({
      where: { id: In(pageIds as any) },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
      loadEagerRelations: false,
    });

    const items = orders.flatMap(order => {
      const codes: string[] = order.couponCodes ?? [];
      if (!codes.length) return [];
      const base = {
        customer: {
          firstName: order.customer?.firstName ?? null,
          lastName: order.customer?.lastName ?? null,
          email: order.customer?.emailAddress ?? null,
        },
        currencyCode: order.currencyCode,
        orderId: order.id,
        createdAt: order.createdAt,
      };
      return codes.map(code => ({ ...base, couponCode: code }));
    });

    items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    return { items, totalItems };
  }
}
