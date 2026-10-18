import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Transaction } from '@vendure/core';

import { NewsletterSubscriberService } from '../services/newsletter-subscriber.service';

interface SubscribeToNewsletterInput {
    email: string;
    name?: string | null;
    source?: string | null;
}

interface SubscribeToNewsletterResult {
    success: boolean;
    created: boolean;
}

interface UnsubscribeFromNewsletterInput {
    email: string;
}

interface UnsubscribeFromNewsletterResult {
    success: boolean;
    removed: boolean;
}

@Resolver()
export class NewsletterSubscriberShopResolver {
    constructor(private newsletterSubscriberService: NewsletterSubscriberService) {}

    @Mutation()
    @Transaction()
    async subscribeToNewsletter(
        @Ctx() ctx: RequestContext,
        @Args('input') input: SubscribeToNewsletterInput,
    ): Promise<SubscribeToNewsletterResult> {
        const { created } = await this.newsletterSubscriberService.subscribe(ctx, input);
        return {
            success: true,
            created,
        };
    }

    @Mutation()
    @Transaction()
    async unsubscribeFromNewsletter(
        @Ctx() ctx: RequestContext,
        @Args('input') input: UnsubscribeFromNewsletterInput,
    ): Promise<UnsubscribeFromNewsletterResult> {
        const { removed } = await this.newsletterSubscriberService.unsubscribe(ctx, input);
        return {
            success: true,
            removed,
        };
    }
}