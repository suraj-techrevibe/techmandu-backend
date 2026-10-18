// import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
// import { Ctx, RequestContext, TransactionalConnection, Transaction, Allow, Permission, Order, ActiveOrderService, ACTIVE_ORDER_INPUT_FIELD_NAME, OrderService, PromotionService, Promotion, Customer, ProductService } from '@vendure/core';
// import { MutationApplyCouponCodeArgs,  } from 'src/plugins/codegen/generated-shop-types';
// import { IsNull } from 'typeorm';
//
// type ActiveOrderArgs = { [ACTIVE_ORDER_INPUT_FIELD_NAME]?: any };
//
// @Resolver()
// export class ShopApiResolver {
//   constructor(
//     private connection: TransactionalConnection,
//     private activeOrderService: ActiveOrderService,
//     private orderService: OrderService,
//     private promotionService: PromotionService,
//     private productService: ProductService
//   ) { }
//
//    @Transaction()
//     @Mutation()
//     @Allow(Permission.UpdateOrder, Permission.Owner)
//     async removeCouponCode(
//         @Ctx() ctx: RequestContext,
//         @Args() args: MutationApplyCouponCodeArgs & ActiveOrderArgs,
//     ): Promise<Order> {
//         const order = await this.activeOrderService.getActiveOrder(
//             ctx,
//             args[ACTIVE_ORDER_INPUT_FIELD_NAME],
//             true,
//         );
//
//         const promotions = await this.promotionService.getActivePromotionsOnOrder(ctx, order.id);
//
//         const isLoyaltyPromotion = promotions.find(promo => promo.conditions.some(cond => cond.code === "customer_loyalty_min_points") && promo.actions.some(action => action.code === "order_discount_per_loyalty_point"))
//         if(isLoyaltyPromotion && isLoyaltyPromotion.couponCode == args.couponCode){
//           await this.orderService.updateCustomFields(ctx, order.id, {
//             loyaltyPointsRedeemed: 0
//           })
//         }
//         return this.orderService.removeCouponCode(ctx, order.id, args.couponCode);
//     }
//
//     private async getLoyaltyCouponCodes(ctx: RequestContext,points:number): Promise<string[]> {
//     const promoRepo = this.connection.getRepository(ctx, Promotion);
//
//     const promos = await promoRepo.find({
//       where: {
//         enabled: true,
//         deletedAt: IsNull(),
//       },
//     });
//
//     const codes = promos
//   .filter(p => !!(p as any).couponCode)
//   .filter(p => {
//     const conditions = ((p as any).conditions ?? []);
//     const actions = ((p as any).actions ?? []);
//
//     const hasCondition = conditions.some((c: any) => {
//       if (c?.code === 'customer_loyalty_min_points') {
//         const minPointsArg = c.args?.find((a: any) => a.name === 'minPoints');
//         const minPoints = minPointsArg ? Number(minPointsArg.value) : 0;
//
//         console.log(
//           `Promo: ${(p as any).couponCode}, required minPoints: ${minPoints}, user points: ${points}`
//         );
//
//         return minPoints <= points;
//       }
//       return false;
//     });
//
//     const hasAction = actions.some((a: any) => a?.code === 'order_discount_per_loyalty_point');
//
//     return hasCondition && hasAction;
//   })
//   .map(p => String((p as any).couponCode));
//
// return Array.from(new Set(codes));
//
//   }
//
//   @Query()
//   @Allow(Permission.Authenticated)
//   async loyaltyCouponCodes(@Ctx() ctx: RequestContext): Promise<string[]> {
//     const userId= await ctx.activeUserId    
//     const customer= await this.connection.getRepository(ctx, Customer).findOne({where:{user:{id:userId}}})
//     if(!customer){
//       throw Error("Customer not found");
//     }
//     return this.getLoyaltyCouponCodes(ctx,customer?.customFields.loyaltyPoints as number);
//   }
// }
