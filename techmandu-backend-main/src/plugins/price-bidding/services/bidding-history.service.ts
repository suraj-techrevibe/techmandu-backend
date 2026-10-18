import { Inject, Injectable } from '@nestjs/common';
import { DeletionResponse, DeletionResult } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import {
    ListQueryBuilder,
    ListQueryOptions,
    ProductVariant,
    ProductVariantService,
    RelationPaths,
    RequestContext,
    RequestContextService,
    TransactionalConnection,
    assertFound,
    patchEntity,
    EventBus,
    translateDeep
} from '@vendure/core';
import { PRICE_BIDDING_PLUGIN_OPTIONS } from '../constants';
import { BiddingHistory } from '../entities/bidding-history.entity';
import { PluginInitOptions } from '../types';
import { BiddingStatusEvent } from '../events/bidding-status.event'; 
interface CreateBiddingHistoryInput {
    variantId: number;
    initialPrice: number;
    finalPrice: number;
    isVerified: boolean;
   
}
interface UpdateBiddingHistoryInput {
    id: ID;
    variantId?: number;
    initialPrice?: number;
    finalPrice?: number;
    isVerified?: boolean;
  
}

@Injectable()
export class BiddingHistoryService {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        @Inject(PRICE_BIDDING_PLUGIN_OPTIONS) private options: PluginInitOptions,
        private productVariantService: ProductVariantService,
        private requestContextService: RequestContextService,
        private eventBus: EventBus, 
    ) { }

    findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<BiddingHistory>,
        relations?: RelationPaths<BiddingHistory>,
    ): Promise<PaginatedList<BiddingHistory>> {
        return this.listQueryBuilder
            .build(BiddingHistory, options, {
                relations,
                ctx,
            })
            .getManyAndCount()
            .then(([items, totalItems]) => {
                return {
                    items,
                    totalItems,
                }
            });
    }

    findOne(
        ctx: RequestContext,
        id: ID,
        relations?: RelationPaths<BiddingHistory>,
    ): Promise<BiddingHistory | null> {
        return this.connection
            .getRepository(ctx, BiddingHistory)
            .findOne({
                where: { id },
                relations,
            });
    }

    async create(ctx: RequestContext, input: CreateBiddingHistoryInput): Promise<BiddingHistory> {
        const newEntity = await this.connection.getRepository(ctx, BiddingHistory).save(input);
        return assertFound(this.findOne(ctx, newEntity.id));
    }

    async update(ctx: RequestContext, input: UpdateBiddingHistoryInput): Promise<BiddingHistory> {
        const entity = await this.connection.getEntityOrThrow(ctx, BiddingHistory, input.id);
        const updatedEntity = patchEntity(entity, input);
        await this.connection.getRepository(ctx, BiddingHistory).save(updatedEntity, { reload: false });
        return assertFound(this.findOne(ctx, updatedEntity.id));
    }

    async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const entity = await this.connection.getEntityOrThrow(ctx, BiddingHistory, id);
        try {
            await this.connection.getRepository(ctx, BiddingHistory).remove(entity);
            return {
                result: DeletionResult.DELETED,
            };
        } catch (e: any) {
            return {
                result: DeletionResult.NOT_DELETED,
                message: e.toString(),
            };
        }
    }

    async updateBidding(
        ctx: RequestContext,
        id: ID,
        isAccepted: boolean,
        newProposedPrice?: number,
        enableVariant?: boolean
    ): Promise<boolean> {
        const entity = await this.connection.getRepository(ctx, BiddingHistory).findOne({
             where: { id },
        });

        if (!entity) {
             throw new Error('BiddingHistory not found');
        }
        
        let priceToSet = 0;
        if (isAccepted) {
            priceToSet = entity.finalPrice;
        }
        else {
            if (newProposedPrice) {
                console.log("New proposed price : ", newProposedPrice)
                priceToSet = newProposedPrice * 100;
            }
            else{
                priceToSet = entity.initialPrice;
            }
        }

        console.log(priceToSet);

        const variantInstance = await this.connection
            .getRepository(ctx, ProductVariant)
            .findOne({
                relations: ['channels', 'product','product.translations', 'translations'],
                where: {
                    id: entity.variantId as number,
                },
            });

        if (!variantInstance) {
            throw new Error(`ProductVariant ${entity.variantId} not found`);
        }
        const translatedVariant = translateDeep(variantInstance, ctx.languageCode);
        this.eventBus.publish(new BiddingStatusEvent(
            ctx,
            entity,
            translatedVariant,
            isAccepted ? 'accepted' : 'rejected'
        ));

        let newCtx: RequestContext[] = []
        for (const channel of variantInstance.channels) {
            const ctx = await this.requestContextService.create({
                apiType: 'admin',
                channelOrToken: channel.token,
            })
            newCtx.push(ctx)
        }

        newCtx.forEach(async (ctx) => {
            await this.productVariantService.update(ctx, [{
                id: entity.variantId as ID,
                enabled: enableVariant ? true : variantInstance.enabled,
                prices: [{
                    currencyCode: variantInstance.currencyCode,
                    price: priceToSet
                }]
            }])
        })
        
        await this.connection.getRepository(ctx, BiddingHistory).delete({
            id: id
        })
        return true;
    }

}
