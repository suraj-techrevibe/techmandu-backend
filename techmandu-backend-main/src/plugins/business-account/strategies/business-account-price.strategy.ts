import { Injectable } from '@nestjs/common';
import {
  OrderItemPriceCalculationStrategy,
  RequestContext,
  ProductVariant,
  Order,
  PriceCalculationResult,
  GlobalSettingsService,
} from '@vendure/core';

@Injectable()
export class BusinessAccountPriceStrategy implements OrderItemPriceCalculationStrategy {
  constructor(private globalSettingsService: GlobalSettingsService) {}

  async calculateUnitPrice(
    ctx: RequestContext,
    productVariant: ProductVariant,
    orderLineCustomFields: { [key: string]: unknown },
    order: Order,
    quantity: number,
  ): Promise<PriceCalculationResult> {

    const originalPrice = productVariant.price;
    let finalPrice = originalPrice;


    if (!order.customer) {
      return {
        price: finalPrice,
        priceIncludesTax: productVariant.listPriceIncludesTax,
      };
    }

    const customerCustomFields = order.customer.customFields as { isBusiness?: boolean; isVerified?: boolean } | undefined;
    const isBusiness = customerCustomFields?.isBusiness ?? false;
    const isVerified = customerCustomFields?.isVerified ?? false;

    if (!isBusiness || !isVerified) {
      return {
        price: finalPrice,
        priceIncludesTax: productVariant.listPriceIncludesTax,
      };
    }

    const productCustomFields = productVariant.product.customFields as { isBusinessExclusive?: boolean } | undefined;
    const isBusinessExclusive = productCustomFields?.isBusinessExclusive ?? false;

    if (!isBusinessExclusive) {
      return {
        price: finalPrice,
        priceIncludesTax: productVariant.listPriceIncludesTax,
      };
    }

    const globalSettings = await this.globalSettingsService.getSettings(ctx);
    const globalSettingsCustomFields = globalSettings.customFields as { businessAccountExtraDiscount?: number } | undefined;
    const discountPercentage = globalSettingsCustomFields?.businessAccountExtraDiscount ?? 0;

    if (discountPercentage > 0) {
      finalPrice = originalPrice * (1 - discountPercentage / 100);
      finalPrice = Math.round(finalPrice * 100) / 100;
    }

    return {
      price: finalPrice,
      priceIncludesTax: productVariant.listPriceIncludesTax,
    };
  }
}

