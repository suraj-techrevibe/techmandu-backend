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

// These can be replaced by generated types if you set up code generation
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
export class SellerRegistrationAdminResolver {
    constructor(private sellerRegistrationService: SellerRegistrationService) {}

    @Query()
    @Allow(Permission.SuperAdmin)
    async sellerRegistration(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID },
        @Relations(SellerRegistration) relations: RelationPaths<SellerRegistration>,
    ): Promise<SellerRegistration | null> {
        const allRelations = new Set(relations || []);
        allRelations.add('panPhoto');
        allRelations.add('documents');
        
        return this.sellerRegistrationService.findOne(ctx, args.id, Array.from(allRelations) as any);
       
    }

    @Query()
    @Allow(Permission.SuperAdmin)
    async sellerRegistrations(
        @Ctx() ctx: RequestContext,
        @Args() args: { options: ListQueryOptions<SellerRegistration> },
        @Relations(SellerRegistration) relations: RelationPaths<SellerRegistration>,
    ): Promise<PaginatedList<SellerRegistration>> {
        return this.sellerRegistrationService.findAll(ctx, args.options || undefined, relations);
    }

    // @Mutation()
    // @Transaction()
    // @Allow(Permission.SuperAdmin)
    // async createSellerRegistration(
    //     @Ctx() ctx: RequestContext,
    //     @Args() args: { input: CreateSellerRegistrationInput },
    // ): Promise<SellerRegistration> {
    //     return this.sellerRegistrationService.create(ctx, args.input);
    // }

    // @Mutation()
    // @Transaction()
    // @Allow(Permission.SuperAdmin)
    // async updateSellerRegistration(
    //     @Ctx() ctx: RequestContext,
    //     @Args() args: { input: UpdateSellerRegistrationInput },
    // ): Promise<SellerRegistration> {
    //     return this.sellerRegistrationService.update(ctx, args.input);
    // }

    @Mutation()
    @Transaction()
    @Allow(Permission.SuperAdmin)
    async deleteSellerRegistration(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<DeletionResponse> {
        return this.sellerRegistrationService.delete(ctx, args.id);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.SuperAdmin)
    async verifySellerRegistration(@Ctx() ctx: RequestContext, @Args() args: { id: ID, stockLocationId: ID }): Promise<{message: string, success: boolean}> {
        return this.sellerRegistrationService.verify(ctx, args.id, args.stockLocationId);
    }
    
    @Query()
    @Allow(Permission.SuperAdmin)
    async verifiedSellerRegistrations(
        @Ctx() ctx: RequestContext,
        @Args() args: { options: ListQueryOptions<SellerRegistration> },
        @Relations(SellerRegistration) relations: RelationPaths<SellerRegistration>,
    ): Promise<PaginatedList<SellerRegistration>> {
        return this.sellerRegistrationService.verifiedFindAll(ctx, args.options || undefined, relations);
    }
}
