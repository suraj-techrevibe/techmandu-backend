import { Resolver, ResolveField, Parent, Context } from '@nestjs/graphql';
import {
    Ctx,
    RequestContext,
    ProductVariantService,
    Logger,
} from '@vendure/core';

interface PriceWithDiscount {
    currencyCode: string;
    currencyCodeName: string;
    price: number;
    discountPrice: number;
    isDefault: boolean;
    customFields: Record<string, any>;
}

const DEFAULT_LOCALE = 'en';
const LOGGER_CONTEXT = 'SearchResultPricesResolver';

@Resolver('SearchResult')
export class SearchResultPricesResolver {
    private readonly currencyDisplay = new Intl.DisplayNames([DEFAULT_LOCALE], {
        type: 'currency',
    });

    constructor(
        private readonly productVariantService: ProductVariantService,
    ) {}

    private getCurrencyFullName(code: string): string {
        if (!code) return 'Unknown';
        try {
            return this.currencyDisplay.of(code.toUpperCase()) ?? code;
        } catch {
            return code;
        }
    }

    private getDiscountAmount(basePrice: number, fields: Record<string, any>): number {
        if (!fields) return 0;

        const { discountPrice, discountPercentage } = fields;

        if (typeof discountPrice === 'number' && discountPrice > 0) {
            return discountPrice;
        }
        if (typeof discountPercentage === 'number' && discountPercentage > 0) {
            return Math.round((basePrice * discountPercentage) / 100);
        }
        return 0;
    }

    @ResolveField()
    async prices(
        @Ctx() ctx: RequestContext,
        @Parent() searchResult: any,
    ): Promise<PriceWithDiscount[]> {
        if (!ctx.channel || !ctx.channel.defaultCurrencyCode) {
            Logger.error('Invalid channel configuration', LOGGER_CONTEXT);
            return [];
        }

        const { productVariantId } = searchResult;
        if (!productVariantId) return [];

        // get product variant entity
        const productVariant = await this.productVariantService.findOne(ctx, productVariantId);
        if (!productVariant) return [];

        const {
            loyaltyCurrencyCode,
            loyaltyCurrencyRate,
            loyaltyCodeName,
        } = ctx.channel.customFields;

        const defaultCurrency = ctx.channel.defaultCurrencyCode;

        const prices =
            productVariant.productVariantPrices ??
            (await this.productVariantService.getProductVariantPrices(ctx, productVariant.id));

        const defaultPVP = prices.find(p => p.currencyCode === defaultCurrency);
        if (!defaultPVP) return [];

        const basePrice = defaultPVP.price;
        const customFields = defaultPVP.customFields ?? {};
        const discount = this.getDiscountAmount(basePrice, customFields);

        const result: PriceWithDiscount[] = [];

        if (
            loyaltyCurrencyCode &&
            loyaltyCurrencyRate &&
            loyaltyCurrencyRate > 0 &&
            loyaltyCurrencyCode !== defaultCurrency
        ) {
            const converted = Math.round(basePrice * loyaltyCurrencyRate);
            const convertedDiscount = Math.round(discount * loyaltyCurrencyRate);

            result.push({
                currencyCode: loyaltyCurrencyCode,
                currencyCodeName: loyaltyCodeName || loyaltyCurrencyCode,
                price: converted,
                discountPrice: converted - convertedDiscount,
                isDefault: true,
                customFields,
            });
        }

        result.push({
            currencyCode: defaultCurrency,
            currencyCodeName: this.getCurrencyFullName(defaultCurrency),
            price: basePrice,
            discountPrice: basePrice - discount,
            isDefault: false,
            customFields,
        });

        return result;
    }
}