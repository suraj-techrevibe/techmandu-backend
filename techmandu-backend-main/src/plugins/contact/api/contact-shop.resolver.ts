import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Permission } from '@vendure/common/lib/generated-types';
import { Allow, Ctx, RequestContext, Transaction } from '@vendure/core';
import { MutationCreateContactArgs } from '../../codegen/generated-shop-types';
import { Contact } from '../entities/contact.entity';
import { ContactService } from '../services/contact.service';

@Resolver()
export class ContactShopResolver {
    constructor(private contactService: ContactService) {}

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async createContact(
        @Ctx() ctx: RequestContext,
        @Args() args: MutationCreateContactArgs,
    ): Promise<Contact> {
        return this.contactService.create(ctx, args.input);
    }
}
