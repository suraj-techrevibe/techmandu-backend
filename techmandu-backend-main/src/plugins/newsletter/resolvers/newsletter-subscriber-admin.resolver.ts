import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DeletionResponse, Permission } from '@vendure/common/lib/generated-types';
import { CustomFieldsObject } from '@vendure/common/lib/shared-types';
import {
    Allow,
    Ctx,
    ID,
    ListQueryOptions,
    PaginatedList,
    RelationPaths,
    Relations,
    RequestContext,
    Transaction,
} from '@vendure/core';
import { NewsletterSubscriber } from '../entities/newsletter-subscriber.entity';
import { NewsletterSubscriberService } from '../services/newsletter-subscriber.service';

// These can be replaced by generated types if you set up code generation
interface CreateNewsletterSubscriberInput {
    email: string;
    name?: string | null;
    source?: string | null;
    // Define the input fields here
    customFields?: CustomFieldsObject;
}
interface UpdateNewsletterSubscriberInput {
    id: ID;
    email?: string;
    name?: string | null;
    // Define the input fields here
    customFields?: CustomFieldsObject;
}

@Resolver()
export class NewsletterSubscriberAdminResolver {
    constructor(private newsletterSubscriberService: NewsletterSubscriberService) {}

    @Query()
    @Allow(Permission.SuperAdmin)
    async newsletterSubscriber(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID },
        @Relations(NewsletterSubscriber) relations: RelationPaths<NewsletterSubscriber>,
    ): Promise<NewsletterSubscriber | null> {
        return this.newsletterSubscriberService.findOne(ctx, args.id, relations);
    }

    @Query()
    @Allow(Permission.SuperAdmin)
    async newsletterSubscribers(
        @Ctx() ctx: RequestContext,
        @Args() args: { options: ListQueryOptions<NewsletterSubscriber> },
        @Relations(NewsletterSubscriber) relations: RelationPaths<NewsletterSubscriber>,
    ): Promise<PaginatedList<NewsletterSubscriber>> {
        return this.newsletterSubscriberService.findAll(ctx, args.options || undefined, relations);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.SuperAdmin)
    async createNewsletterSubscriber(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: CreateNewsletterSubscriberInput },
    ): Promise<NewsletterSubscriber> {
        return this.newsletterSubscriberService.create(ctx, args.input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.SuperAdmin)
    async updateNewsletterSubscriber(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: UpdateNewsletterSubscriberInput },
    ): Promise<NewsletterSubscriber> {
        return this.newsletterSubscriberService.update(ctx, args.input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.SuperAdmin)
    async deleteNewsletterSubscriber(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID },
    ): Promise<DeletionResponse> {
        return this.newsletterSubscriberService.delete(ctx, args.id);
    }
}