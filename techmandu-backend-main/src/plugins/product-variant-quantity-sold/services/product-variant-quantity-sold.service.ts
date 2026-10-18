import { Injectable } from '@nestjs/common';
import { ID, RequestContext, StockMovement, TransactionalConnection } from '@vendure/core';

@Injectable()
export class ProductVariantQuantitySoldService {
    constructor(private connection: TransactionalConnection) {}

    async getSoldUnitsForVariant(ctx: RequestContext, variantId: ID): Promise<number> {
        const result = await this.connection
            .getRepository(ctx, StockMovement)
            .createQueryBuilder('stockMovement')
            .select(
                `
            COALESCE(
                ABS(SUM(CASE WHEN stockMovement.type = 'SALE' THEN stockMovement.quantity ELSE 0 END))
                - SUM(CASE WHEN stockMovement.type = 'CANCELLATION' THEN stockMovement.quantity ELSE 0 END),
            0
            )`,
                'netSold',
            )
            .where('stockMovement.productVariantId = :variantId', { variantId })
            .andWhere('stockMovement.type IN (:...types)', { types: ['SALE', 'CANCELLATION'] })
            .getRawOne();

        return parseInt(result.netSold, 10);
    }
}
