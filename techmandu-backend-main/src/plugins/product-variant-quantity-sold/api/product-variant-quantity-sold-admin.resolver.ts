import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Ctx, ProductVariant, RequestContext } from '@vendure/core';
import { ProductVariantQuantitySoldService } from '../services/product-variant-quantity-sold.service';

@Resolver('ProductVariant')
export class ProductVariantEntityResolver {
    constructor(private productVariantQuantitySoldService: ProductVariantQuantitySoldService) {}

    @ResolveField()
    async quantitySold(@Ctx() ctx: RequestContext, @Parent() variant: ProductVariant): Promise<number> {
        return this.productVariantQuantitySoldService.getSoldUnitsForVariant(ctx, variant.id);
    }
}
