import { LanguageCode, PromotionCondition } from '@vendure/core';

export const customerLoyaltyMinPoints = new PromotionCondition({
  code: 'customer_loyalty_min_points',
  description: [
    {
      languageCode: LanguageCode.en,
      value: 'Apply only if customer loyalty points ≥ { minPoints }',
    },
  ],
  args: {
    minPoints: {
      type: 'int',
      ui: {
        component: 'number-form-input',
        suffix: 'pts',
      },
      label: [{ languageCode: LanguageCode.en, value: 'Minimum points' }],
    },
    isForLoyaltyProgram:{
        type: 'boolean',
        defaultValue: true,
        
    }
  },
  async check(ctx, order, args) {
    if (!order.customer) {
      return false;
    }
   const points = (order.customer as any)?.customFields?.loyaltyPoints ?? 0;
   const applicable=points >= (args.minPoints ?? 100);
   return applicable
  },
});
