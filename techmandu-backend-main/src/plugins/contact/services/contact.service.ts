import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError, IsNull } from 'typeorm';
import { DeletionResponse, DeletionResult } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import {
    assertFound,
    ListQueryBuilder,
    ListQueryOptions,
    RelationPaths,
    RequestContext,
    TransactionalConnection,
} from '@vendure/core';
import { CreateContactInput } from '../../codegen/generated-shop-types';
import { CONTACT_PLUGIN_OPTIONS } from '../constants';
import { Contact } from '../entities/contact.entity';
import { PluginInitOptions } from '../types';

@Injectable()
export class ContactService {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        @Inject(CONTACT_PLUGIN_OPTIONS) private options: PluginInitOptions,
    ) {}

    async findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<Contact>,
        relations?: RelationPaths<Contact>,
    ): Promise<PaginatedList<Contact>> {
        return this.listQueryBuilder
            .build(Contact, options, {
                where: { deletedAt: IsNull() },
                relations,
                ctx,
            })
            .getManyAndCount()
            .then(([items, totalItems]) => {
                return {
                    items,
                    totalItems,
                };
            });
    }

    async findOne(ctx: RequestContext, id: ID, relations?: RelationPaths<Contact>): Promise<Contact | null> {
        return this.connection.getRepository(ctx, Contact).findOne({
            where: { id, deletedAt: IsNull() },
            relations,
        });
    }

    async create(ctx: RequestContext, input: CreateContactInput): Promise<Contact> {
        const newEntityInstance = new Contact(input);
        const newEntity = await this.connection.getRepository(ctx, Contact).save(newEntityInstance);
        return assertFound(this.findOne(ctx, newEntity.id));
    }

    async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const entity = await this.connection.getEntityOrThrow(ctx, Contact, id);
        try {
            await this.connection.getRepository(ctx, Contact).softDelete({ id: entity.id });
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
}
