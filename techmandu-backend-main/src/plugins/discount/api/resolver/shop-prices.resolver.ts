import { Ctx, ProductVariant, ProductVariantService, RequestContext, Logger } from '@vendure/core';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';

interface PriceWithDiscount {
    currencyCode: string;
    currencyCodeName: string;
    price: number;
    discountPrice: number;
    isDefault: boolean;
    customFields: Record<string, any>;
}

const DEFAULT_LOCALE = 'en';
const LOGGER_CONTEXT = 'ProductVariantPricesResolver';

@Resolver('ProductVariant')
export class ProductVariantPricesResolver {
    private readonly currencyDisplay: Intl.DisplayNames;

    constructor(private readonly productVariantService: ProductVariantService) {
        this.currencyDisplay = new Intl.DisplayNames([DEFAULT_LOCALE], { type: 'currency' });
    }

    private getCurrencyFullName(currencyCode: string): string {
        if (!currencyCode) {
            Logger.warn(`Invalid currency code provided`, LOGGER_CONTEXT);
            return currencyCode || 'Unknown';
        }

        try {
            const fullName = this.currencyDisplay.of(currencyCode.toUpperCase());
            if (!fullName) {
                Logger.warn(`No currency name found for code: ${currencyCode}`, LOGGER_CONTEXT);
                return currencyCode;
            }
            return fullName;
        } catch (err) {
            Logger.error(
                `Error resolving currency name for ${currencyCode}: ${err instanceof Error ? err.message : String(err)}`,
                LOGGER_CONTEXT,
            );
            return currencyCode;
        }
    }

    private getDiscountAmount(basePrice: number, customFields: Record<string, any>): number {
        if (!customFields || typeof customFields !== 'object') {
            Logger.warn(`Invalid custom fields provided for basePrice: ${basePrice}`, LOGGER_CONTEXT);
            return 0;
        }

        const { discountPrice, discountPercentage } = customFields;

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
        @Parent() productVariant: ProductVariant,
    ): Promise<PriceWithDiscount[]> {
        if (!ctx.channel?.customFields || !ctx.channel?.defaultCurrencyCode) {
            Logger.error(`Invalid channel configuration in context`, LOGGER_CONTEXT);
            return [];
        }

        const { loyaltyCurrencyCode, loyaltyCurrencyRate, loyaltyCodeName } = ctx.channel.customFields;
        const defaultCurrency = ctx.channel.defaultCurrencyCode;

        const prices =
            productVariant.productVariantPrices?.length > 0
                ? productVariant.productVariantPrices
                : await this.productVariantService.getProductVariantPrices(ctx, productVariant.id);

        const defaultPVP = prices.find(p => p.currencyCode === defaultCurrency);
        if (!defaultPVP) {
            Logger.warn(
                `No price found for default currency ${defaultCurrency} for variant ${productVariant.id}`,
                LOGGER_CONTEXT,
            );
            return [];
        }

        const basePrice = defaultPVP.price;
        const customFields = defaultPVP.customFields ?? {};
        const discountAmount = this.getDiscountAmount(basePrice, customFields);

        const result: PriceWithDiscount[] = [];

        if (
            loyaltyCurrencyCode &&
            typeof loyaltyCurrencyRate === 'number' &&
            loyaltyCurrencyRate > 0 &&
            loyaltyCurrencyCode !== defaultCurrency
        ) {
            const convertedPrice = Math.round(basePrice * loyaltyCurrencyRate);
            const convertedDiscount = Math.round(discountAmount * loyaltyCurrencyRate);

            result.push({
                currencyCode: loyaltyCurrencyCode,
                currencyCodeName: loyaltyCodeName || loyaltyCurrencyCode,
                price: convertedPrice,
                discountPrice: convertedPrice - convertedDiscount,
                isDefault: true,
                customFields,
            });
        }
        result.push({
            currencyCode: defaultCurrency,
            currencyCodeName: this.getCurrencyFullName(defaultCurrency),
            price: basePrice,
            discountPrice: basePrice - discountAmount,
            isDefault: false,
            customFields,
        });
        return result;
    }
}
