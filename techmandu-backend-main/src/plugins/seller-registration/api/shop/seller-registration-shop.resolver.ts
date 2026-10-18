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
import { SellerRegistration } from '../../entities/seller-registration.entity';
import { SellerRegistrationService } from '../../services/seller-registration.service';

interface CreateSellerRegistrationInput {
    panNo: string;
    businessName: string;
    businessRegistrationNo: string;
    address: string;
    ownerName: string;
    phone: string;
    email: string;
    // Define the input fields here
}
interface UpdateSellerRegistrationInput {
    id: ID;
    panNo?: string;
    businessName?: string;
    businessRegistrationNo?: string;
    address?: string;
    ownerName?: string;
    phone?: string;
    email?: string;
    // Define the input fields here
}

@Resolver()
export class SellerRegistrationShopResolver {
    constructor(private sellerRegistrationService: SellerRegistrationService) {}

    // @Query()
    // @Allow(Permission.SuperAdmin)
    // async sellerRegistration(
    //     @Ctx() ctx: RequestContext,
    //     @Args() args: { id: ID },
    //     @Relations(SellerRegistration) relations: RelationPaths<SellerRegistration>,
    // ): Promise<SellerRegistration | null> {
    //     return this.sellerRegistrationService.findOne(ctx, args.id, relations);
    // }

    // @Query()
    // @Allow(Permission.SuperAdmin)
    // async sellerRegistrations(
    //     @Ctx() ctx: RequestContext,
    //     @Args() args: { options: ListQueryOptions<SellerRegistration> },
    //     @Relations(SellerRegistration) relations: RelationPaths<SellerRegistration>,
    // ): Promise<PaginatedList<SellerRegistration>> {
    //     return this.sellerRegistrationService.findAll(ctx, args.options || undefined, relations);
    // }

    @Mutation()
    @Transaction()
    // @Allow(Permission.SuperAdmin)
    async createSellerRegistration(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: CreateSellerRegistrationInput },
    ) {
        return this.sellerRegistrationService.legacyCreate(ctx, args.input);
    }

    // @Mutation()
    // @Transaction()
    // @Allow(Permission.SuperAdmin)
    // async updateSellerRegistration(
    //     @Ctx() ctx: RequestContext,
    //     @Args() args: { input: UpdateSellerRegistrationInput },
    // ): Promise<SellerRegistration> {
    //     return this.sellerRegistrationService.update(ctx, args.input);
    // }

    // @Mutation()
    // @Transaction()
    // @Allow(Permission.SuperAdmin)
    // async deleteSellerRegistration(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<DeletionResponse> {
    //     return this.sellerRegistrationService.delete(ctx, args.id);
    // }
}
