import { Injectable } from '@nestjs/common';
import {
    OrderItemPriceCalculationStrategy,
    RequestContext,
    ProductVariant,
    Order,
    VendurePlugin,
    PriceCalculationResult,
    PluginCommonModule,
    LanguageCode,
} from '@vendure/core';
import { gql } from 'graphql-tag';
import { ProductVariantPricesResolver } from './api/resolver/shop-prices.resolver';
import { SearchResultPricesResolver } from './api/resolver/search-result-price.resolver';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
    interface CustomProductVariantPriceFields {
        discountPrice: number;
        discountPercentage: number;
    }
}

declare module '@vendure/core/dist/entity/custom-entity-fields' {
    interface CustomChannelFields {
        loyaltyCodeName: string;
        loyaltyCurrencyCode: string;
        loyaltyCurrencyRate: number;
    }
}


@Injectable()
export class CustomOrderItemPriceCalculationStrategy implements OrderItemPriceCalculationStrategy {
    async calculateUnitPrice(
        ctx: RequestContext,
        productVariant: ProductVariant,
        orderLineCustomFields: { [key: string]: any },
        order: Order,
        quantity: number,
    ): Promise<PriceCalculationResult> {
        const price = productVariant.productVariantPrices?.find(
            p => p.channelId === ctx.channelId && p.currencyCode === ctx.currencyCode,
        );

        const originalPrice = price ? price.price : productVariant.price;

        const discountPrice = price?.customFields?.discountPrice ?? 0;
        const discountPercentage = price?.customFields?.discountPercentage ?? 0;

        let finalPrice = originalPrice;

        if (discountPrice > 0) {
            finalPrice = finalPrice - discountPrice;
        } else if (discountPercentage > 0) {
            finalPrice = originalPrice * (1 - discountPercentage / 100);
        }

        finalPrice = Math.round(finalPrice * 100) / 100;

        return {
            price: finalPrice,
            priceIncludesTax: productVariant.listPriceIncludesTax,
        };
    }
}

@VendurePlugin({
    imports: [PluginCommonModule],
    
    configuration: config => {
        config.customFields.Channel.push(
            {
                name: 'loyaltyCodeName',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'Loyalty Code Name' }],
                nullable: true,
                ui: { tab: 'Loyalty Details' },
            },
            {
                name: 'loyaltyCurrencyCode',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'Loyalty Currency Code' }],
                nullable: true,
                ui: { tab: 'Loyalty Details' },
            },
            {
                name: 'loyaltyCurrencyRate',
                type: 'float',
                label: [
                    {
                        languageCode: LanguageCode.en,
                        value: 'Loyalty Currency Conversion Rate Relative to Default Store Currency',
                    },
                ],
                nullable: true,
                ui: { component: 'number-form-input', tab: 'Loyalty Details' },
            },
        )
        config.orderOptions.orderItemPriceCalculationStrategy = new CustomOrderItemPriceCalculationStrategy();
        config.customFields.ProductVariantPrice = [
            {
                name: 'discountPrice',
                type: 'int',
                defaultValue: 0,
                label: [{ languageCode: LanguageCode.en, value: 'Discount Price' }],
                description: [
                    {
                        languageCode: LanguageCode.en,
                        value: 'Set a fixed discount price for this variant.',
                    },
                ],
                public: true,
                ui: { component: 'currency-form-input' },
            },
            {
                name: 'discountPercentage',
                type: 'int',
                defaultValue: 0,
                min: 0,
                max: 100,
                label: [{ languageCode: LanguageCode.en, value: 'Discount Percentage' }],
                description: [
                    {
                        languageCode: LanguageCode.en,
                        value: 'Set a discount percentage for this variant.',
                    },
                ],
                ui: { component: 'number-form-input', suffix: '%' },
            }
        ]
        return config;
    },
    shopApiExtensions: {
        resolvers: [ProductVariantPricesResolver,SearchResultPricesResolver],
        schema: gql`
            type ProductVariantPrice {
                currencyCode: String!
                currencyCodeName: String!
                price: Money!
                discountPrice: Money!
                isDefault: Boolean!
            }
                
            extend type SearchResult {
                prices: [ProductVariantPrice!]!
            }

            extend type ProductVariant {
                prices: [ProductVariantPrice!]!
            }
        `,
    },
})
export class DiscountPlugin { }
