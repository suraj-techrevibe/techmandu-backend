import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DeletionResponse } from '@vendure/common/lib/generated-types';
import {
    Allow,
    Ctx,
    PaginatedList,
    RelationPaths,
    Relations,
    RequestContext,
    Transaction,
} from '@vendure/core';
import {
    MutationDeleteContactArgs,
    MutationDeleteContactsArgs,
    QueryContactArgs,
    QueryContactsArgs,
} from '../../codegen/generated-admin-types';
import { contactPermission } from '../constants';
import { Contact } from '../entities/contact.entity';
import { ContactService } from '../services/contact.service';

@Resolver()
export class ContactAdminResolver {
    constructor(private contactService: ContactService) {}

    @Query()
    @Allow(contactPermission.Read)
    async contact(
        @Ctx() ctx: RequestContext,
        @Args() args: QueryContactArgs,
        @Relations(Contact) relations: RelationPaths<Contact>,
    ): Promise<Contact | null> {
        return this.contactService.findOne(ctx, args.id, relations);
    }

    @Query()
    @Allow(contactPermission.Read)
    async contacts(
        @Ctx() ctx: RequestContext,
        @Args() args: QueryContactsArgs,
        @Relations(Contact) relations: RelationPaths<Contact>,
    ): Promise<PaginatedList<Contact>> {
        return this.contactService.findAll(ctx, args.options || undefined, relations);
    }

    @Mutation()
    @Transaction()
    @Allow(contactPermission.Delete)
    async deleteContact(
        @Ctx() ctx: RequestContext,
        @Args() args: MutationDeleteContactArgs,
    ): Promise<DeletionResponse> {
        return this.contactService.delete(ctx, args.id);
    }

    @Mutation()
    @Transaction()
    @Allow(contactPermission.Delete)
    async deleteContacts(
        @Ctx() ctx: RequestContext,
        @Args() args: MutationDeleteContactsArgs,
    ): Promise<DeletionResponse[]> {
        return Promise.all(args.ids.map(id => this.contactService.delete(ctx, id)));
    }
}
