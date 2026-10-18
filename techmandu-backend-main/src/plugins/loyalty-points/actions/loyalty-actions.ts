// order-discount-per-loyalty-point.action.ts
import { LanguageCode, PromotionOrderAction } from '@vendure/core';

export const orderDiscountPerLoyaltyPoint = new PromotionOrderAction({
  code: 'order_discount_per_loyalty_point',
  description: [
    {
      languageCode: LanguageCode.en,
      value: 'Discount = customer loyalty points × { ratePerPoint }',
    },
  ],
  args: {
    ratePerPoint: {
      type: 'int',
      ui: { component: 'currency-form-input' }, // minor units (cents/paise)
      label: [{ languageCode: LanguageCode.en, value: 'Rate per point' }],
    },
    capToSubtotal: {
      type: 'boolean',
      label: [{ languageCode: LanguageCode.en, value: 'Cap to order subtotal' }],
      // default true when omitted
    },
  },
  execute(ctx, order, args) {
    // No customer associated? No discount.
    const customer = order.customer as any;
    if (!customer) return 0;

    const points: number = customer?.customFields?.loyaltyPoints ?? 0;
    const rate = Math.max(0, args.ratePerPoint ?? 0);
    const rawDiscount = points * rate; // in minor units

    if (rawDiscount <= 0) return 0;

    // Optional safety cap so we never discount beyond the subtotal
    const cap = args.capToSubtotal !== false; // default true
    if (cap) {
      const subtotal = ctx.channel.pricesIncludeTax
        ? order.subTotalWithTax
        : order.subTotal;
      const capped = Math.min(rawDiscount, Math.max(0, subtotal));
      return -capped;
    }

    return -rawDiscount;
  },
});
