import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DeletionResponse, Permission } from '@vendure/common/lib/generated-types';
import {
    Allow,
    Ctx,
    ID,
    ListQueryOptions,
    PaginatedList,
    RelationPaths,
    Relations,
    RequestContext,
    Transaction
} from '@vendure/core';
import { BiddingHistory } from '../entities/bidding-history.entity';
import { BiddingHistoryService } from '../services/bidding-history.service';

// These can be replaced by generated types if you set up code generation
interface CreateBiddingHistoryInput {
    variantId: number;
    initialPrice: number;
    finalPrice: number;
    isVerified: boolean;

    // Define the input fields here
}
interface UpdateBiddingHistoryInput {
    id: ID;
    variantId?: number;
    initialPrice?: number;
    finalPrice?: number;
    isVerified?: boolean;
    // Define the input fields here
}

@Resolver()
export class BiddingHistoryAdminResolver {
    constructor(private biddingHistoryService: BiddingHistoryService) {}

    @Query()
    @Allow(Permission.SuperAdmin)
    async biddingHistory(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID },
        @Relations(BiddingHistory) relations: RelationPaths<BiddingHistory>,
    ): Promise<BiddingHistory | null> {
        return this.biddingHistoryService.findOne(ctx, args.id, relations);
    }

    @Query()
    @Allow(Permission.SuperAdmin)
    async biddingHistorys(
        @Ctx() ctx: RequestContext,
        @Args() args: { options: ListQueryOptions<BiddingHistory> },
        @Relations(BiddingHistory) relations: RelationPaths<BiddingHistory>,
    ): Promise<PaginatedList<BiddingHistory>> {
        return this.biddingHistoryService.findAll(ctx, args.options || undefined, relations);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.SuperAdmin)
    async updateBidding(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID; isAccepted: boolean; newProposedPrice?: number, enableVariant?: boolean },
    ): Promise<boolean> {
        return this.biddingHistoryService.updateBidding(ctx, args.id, args.isAccepted, args.newProposedPrice, args.enableVariant);
    }


    // @Mutation()
    // @Transaction()
    // @Allow(Permission.SuperAdmin)
    // async createBiddingHistory(
    //     @Ctx() ctx: RequestContext,
    //     @Args() args: { input: CreateBiddingHistoryInput },
    // ): Promise<BiddingHistory> {
    //     return this.biddingHistoryService.create(ctx, args.input);
    // }

    // @Mutation()
    // @Transaction()
    // @Allow(Permission.SuperAdmin)
    // async updateBiddingHistory(
    //     @Ctx() ctx: RequestContext,
    //     @Args() args: { input: UpdateBiddingHistoryInput },
    // ): Promise<BiddingHistory> {
    //     return this.biddingHistoryService.update(ctx, args.input);
    // }

    // @Mutation()
    // @Transaction()
    // @Allow(Permission.SuperAdmin)
    // async deleteBiddingHistory(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<DeletionResponse> {
    //     return this.biddingHistoryService.delete(ctx, args.id);
    // }
}
