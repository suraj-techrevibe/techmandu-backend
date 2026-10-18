import { Inject, Injectable } from '@nestjs/common';
import { 
    ID, 
    Product, 
    RequestContext, 
    TransactionalConnection,
    OrderService,
    Order,
    OrderLine,
    ProductVariant,
    Logger,
    LanguageCode,
    ProductVariantService
} from '@vendure/core';
import { BARCODE_PLUGIN_OPTIONS } from '../constants';
import { PluginInitOptions } from '../types';
import { error } from 'console';
import { ArrayContains } from "typeorm"

@Injectable()
export class BarcodeService {
    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
        private productVariantService: ProductVariantService,
        @Inject(BARCODE_PLUGIN_OPTIONS) private options: PluginInitOptions
    ) {}

    async posOrder(
        ctx: RequestContext, 
        serialCode: string,
        requestToken: string
    ) {
        if(requestToken !== "Techmandu@pos#2025"){
            return {
                success: false,
                message: "Unauthorized Request - Invalid request token"
            }
        }
        try{
             const variant = await this.connection.getRepository(ctx, ProductVariant).findOne({
                relations:['stockLevels'],
                where: {
                    
                    customFields: {
                        variantSerialCode: serialCode
                    }
                }
            });
            if(!variant){
                return {
                    success: false,
                    message: "Invalid Serial Code - Corresponding product variant not found"
                }
            }
        await this.productVariantService.update(ctx,[{
            id: variant.id,
            stockOnHand: variant.stockLevels[0].stockOnHand - 1
        }])
        return {
            success: true,
            message: `Order placed successfully for variant ID: ${variant.id} - New stockOnHand: ${variant.stockLevels[0].stockOnHand - 1}`
        }
        }
        catch(err){
            return {
                success: false,
                message: "An error occurred while processing the order"
            }
        }
       
    }

    async searchProductVariantBySerialCode(
        ctx: RequestContext,
        serialCode: string
    ){
        const variant = await this.connection
    .getRepository(ctx, ProductVariant)
    .createQueryBuilder('variant')
    .leftJoinAndSelect('variant.product', 'product')
    .where(`(variant.customFields.variantSerialCode)::jsonb @> :code`, {
        code: JSON.stringify([serialCode]),
    })
    .getOne();

        if(variant){
            return variant;
        }
        return null;
    }
}