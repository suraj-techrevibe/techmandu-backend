import { Args, Query, Resolver } from '@nestjs/graphql';
import { 
    Allow, 
    Ctx, 
    Permission, 
    RequestContext, 
    TransactionalConnection, 
    Order,
    UserInputError
} from '@vendure/core';

@Resolver()
export class OrderTrackingResolver {
    constructor(private connection: TransactionalConnection) {}

    @Query()
    @Allow(Permission.Public) 
    async trackOrder(
        @Ctx() ctx: RequestContext,
        @Args('orderCode') orderCode: string,
        @Args('email') email: string
    ): Promise<Order | null> {
        const order = await this.connection.getRepository(ctx, Order).findOne({
            where: { code: orderCode },
            relations: ['customer', 'lines', 'lines.featuredAsset'], 
        });
        if (!order) {
            throw new UserInputError('Order not found or email does not match');
        }
        const orderEmail = order.customer?.emailAddress.toLowerCase();
        const inputEmail = email.toLowerCase().trim();

        if (orderEmail !== inputEmail) {
            throw new UserInputError('Order not found or email does not match');
        }
        return order;
    }
}