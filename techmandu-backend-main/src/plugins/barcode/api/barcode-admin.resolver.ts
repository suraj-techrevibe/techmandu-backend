import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Permission, UpdateOrderItemsResult } from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';
import { Allow, Ctx, ErrorResultUnion, Order, RequestContext, Transaction,OrderService, OrderLine, TransactionalConnection, ProductVariantService } from '@vendure/core';
import { BarcodeService } from '../services/barcode.service';

@Resolver()
export class BarcodeAdminResolver {
    constructor(
        private barcodeService: BarcodeService,
        private orderService: OrderService,
        private connection: TransactionalConnection,
        private productVariantService: ProductVariantService,
        
    ) {}

    @Transaction()
    @Mutation()
    async posOrder(
        @Ctx() ctx: RequestContext,
        @Args('input') input: {serialCode: string, requestToken: string}
    ): Promise<{ success: boolean; message: string }> {
        const { serialCode, requestToken } = input;
        const result = await this.barcodeService.posOrder(ctx, serialCode, requestToken);
        return result
    }
    @Query()
    async searchProductVariantBySerialCode(
        @Ctx() ctx: RequestContext,
        @Args('serialCode') serialCode: string
    ): Promise<{ id: ID; name: string } | null> {
        return this.barcodeService.searchProductVariantBySerialCode(ctx, serialCode);
    }
@Transaction()
@Mutation()
@Allow(Permission.CreateOrder)
async addItemToDraftOrder(
    @Ctx() ctx: RequestContext,
    @Args() { orderId, input }: any,
) {
    // 1. Add item to the order
    let serialCode
    serialCode = (input as any).serialCode;
    if(!serialCode){
        const productVariant = await this.productVariantService.findOne(ctx, input.productVariantId);
        if(productVariant?.customFields.variantSerialCode){
        serialCode = productVariant?.customFields.variantSerialCode[0]
        }
    }
    let order: any = await this.orderService.addItemToOrder(
        ctx,
        orderId,
        input.productVariantId,
        input.quantity,
        (input as any).customFields,
    );
    if (!order) {
        return order;
    }

    // 2. Find the specific line for this variant
    const line = order.lines.find(
        (l: OrderLine) => l.productVariantId === input.productVariantId,
    );

    if (!line) {
        // nothing to update, just return order as-is
        return order;
    }
    const existingCodes: string[] = line.customFields?.serialCodes ?? [];
    console.log(serialCode)
    // 3. Update that line with the new serialCode
    let customFields={}
    if(serialCode){
        customFields = {
           serialCodes: [...existingCodes, ...serialCode]
        }
    }
    else{
        customFields = {
            serialCodes: [...existingCodes]
         }
    }
    await this.connection.getRepository(ctx, OrderLine).update({
        id: line.id
    },{
        customFields
    })

    return order;
}

}
