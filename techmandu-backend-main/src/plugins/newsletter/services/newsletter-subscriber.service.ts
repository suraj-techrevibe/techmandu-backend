import { Inject, Injectable } from '@nestjs/common';
import { DeletionResponse, DeletionResult } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import {
    ListQueryBuilder,
    ListQueryOptions,
    Logger,
    RelationPaths,
    RequestContext,
    TransactionalConnection,
    UserInputError,
    assertFound,
    patchEntity,
} from '@vendure/core';

import { loggerCtx, NEWSLETTER_PLUGIN_OPTIONS } from '../constants';
import { NewsletterSubscriber } from '../entities/newsletter-subscriber.entity';
import { PluginInitOptions, ResolvedNewsletterPluginOptions } from '../types';

interface CreateNewsletterSubscriberInput {
    email: string;
    name?: string | null;
    source?: string | null;
}

interface UpdateNewsletterSubscriberInput {
    id: ID;
    email?: string;
    name?: string | null;
    source?: string | null;
}

interface SubscribeNewsletterInput {
    email: string;
    name?: string | null;
    source?: string | null;
}

interface UnsubscribeNewsletterInput {
    email: string;
}

@Injectable()
export class NewsletterSubscriberService {
    private readonly options: ResolvedNewsletterPluginOptions;

    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        @Inject(NEWSLETTER_PLUGIN_OPTIONS) pluginOptions: PluginInitOptions,
    ) {
        this.options = {
            allowDuplicateEmail: false,
            ...pluginOptions,
        } as ResolvedNewsletterPluginOptions;
    }

    findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<NewsletterSubscriber>,
        relations?: RelationPaths<NewsletterSubscriber>,
    ): Promise<PaginatedList<NewsletterSubscriber>> {
        const qb = this.listQueryBuilder.build(NewsletterSubscriber, options, {
            relations,
            ctx,
        });

        const hasSort = !!options?.sort && Object.keys(options.sort).length > 0;
        if (!hasSort) {
            const alias = qb.alias;
            qb.addOrderBy(`${alias}."createdAt"`, 'DESC');
        }

        return qb.getManyAndCount().then(([items, totalItems]) => ({ items, totalItems }));
    }

    findOne(
        ctx: RequestContext,
        id: ID,
        relations?: RelationPaths<NewsletterSubscriber>,
    ): Promise<NewsletterSubscriber | null> {
        return this.connection.getRepository(ctx, NewsletterSubscriber).findOne({
            where: { id },
            relations,
        });
    }

    async create(ctx: RequestContext, input: CreateNewsletterSubscriberInput): Promise<NewsletterSubscriber> {
        const email = this.normalizeEmail(input.email);
        this.ensureValidEmail(email);
        const repo = this.connection.getRepository(ctx, NewsletterSubscriber);
        const existing = await repo.findOne({ where: { email } });

        if (existing) {
            if (this.options.allowDuplicateEmail) {
                Logger.warn(
                    `Duplicate newsletter subscriber detected for email ${email}. Returning existing record.`,
                    loggerCtx,
                );
                return existing;
            }
            throw new UserInputError(`A subscriber with email "${email}" already exists.`);
        }

        const subscriberEntity = repo.create({
            email,
            name: this.sanitizeName(input.name),
            source: this.sanitizeSource(input.source),
        });
        const subscriber = await repo.save(subscriberEntity);

        return assertFound(this.findOne(ctx, subscriber.id));
    }

    async update(ctx: RequestContext, input: UpdateNewsletterSubscriberInput): Promise<NewsletterSubscriber> {
        const repo = this.connection.getRepository(ctx, NewsletterSubscriber);
        const entity = await this.connection.getEntityOrThrow(ctx, NewsletterSubscriber, input.id);

        if (input.email) {
            const email = this.normalizeEmail(input.email);
            this.ensureValidEmail(email);
            if (!this.options.allowDuplicateEmail) {
                const duplicate = await repo.findOne({ where: { email } });
                if (duplicate && duplicate.id !== entity.id) {
                    throw new UserInputError(`A subscriber with email "${email}" already exists.`);
                }
            }
            entity.email = email;
        }

        if (input.name !== undefined) {
            entity.name = this.sanitizeName(input.name);
        }

        if (input.source !== undefined) {
            entity.source = this.sanitizeSource(input.source);
        }

        await repo.save(entity, { reload: false });

        return assertFound(this.findOne(ctx, entity.id));
    }

    async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const repo = this.connection.getRepository(ctx, NewsletterSubscriber);
        const entity = await this.connection.getEntityOrThrow(ctx, NewsletterSubscriber, id);
        try {
            await repo.remove(entity);
            return { result: DeletionResult.DELETED };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Failed to delete newsletter subscriber ${id}: ${message}`, loggerCtx);
            return {
                result: DeletionResult.NOT_DELETED,
                message,
            };
        }
    }

    async subscribe(
        ctx: RequestContext,
        input: SubscribeNewsletterInput,
    ): Promise<{ subscriber: NewsletterSubscriber; created: boolean }> {
        const email = this.normalizeEmail(input.email);
        this.ensureValidEmail(email);
        const repo = this.connection.getRepository(ctx, NewsletterSubscriber);
        const existing = await repo.findOne({ where: { email } });
        if (existing) {
            let requiresUpdate = false;
            if (input.source && !existing.source) {
                existing.source = this.sanitizeSource(input.source);
                requiresUpdate = true;
            }
            if (input.name && !existing.name) {
                existing.name = this.sanitizeName(input.name);
                requiresUpdate = true;
            }
            if (requiresUpdate) {
                await repo.save(existing, { reload: false });
            }
            return { subscriber: existing, created: false };
        }

        const subscriberEntity = repo.create({
            email,
            name: this.sanitizeName(input.name),
            source: this.sanitizeSource(input.source),
        });
        const subscriber = await repo.save(subscriberEntity);

        const hydratedSubscriber = await assertFound(this.findOne(ctx, subscriber.id));
        return { subscriber: hydratedSubscriber, created: true };
    }

    async unsubscribe(ctx: RequestContext, input: UnsubscribeNewsletterInput): Promise<{ removed: boolean }> {
        const email = this.normalizeEmail(input.email);
        const repo = this.connection.getRepository(ctx, NewsletterSubscriber);
        const result = await repo.delete({ email });
        return { removed: (result.affected ?? 0) > 0 };
    }

    private normalizeEmail(email: string): string {
        return email.trim().toLowerCase();
    }

    private ensureValidEmail(email: string): void {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            throw new UserInputError('Please provide a valid email address.');
        }
    }

    private sanitizeSource(source?: string | null): string | null {
        if (!source) {
            return null;
        }
        return source.slice(0, 255);
    }

    private sanitizeName(name?: string | null): string | null {
        if (!name) {
            return null;
        }
        const trimmed = name.trim();
        return trimmed ? trimmed.slice(0, 255) : null;
    }
}