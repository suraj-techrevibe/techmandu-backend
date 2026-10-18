import {
  AccountRegistrationEvent,
  Channel,
  CouponCodeEvent,
  Customer,
  CustomerService,
  EventBus,
  ForbiddenError,
  GlobalSettingsService,
  I18nService,
  ID,
  InternalServerError,
  LanguageCode,
  OrderService,
  OrderStateTransitionEvent,
  PluginCommonModule,
  PromotionService,
  RequestContext,
  TransactionalConnection,
  Type,
  VendurePlugin,
} from "@vendure/core";
import { AdminUiExtension } from "@vendure/ui-devkit/compiler";
import * as path from "path";

import { BadRequestException, NotFoundException, OnApplicationBootstrap, UnauthorizedException } from "@nestjs/common";
import { filter } from "rxjs/operators";
import { adminApiExtension } from "./api/admin-api-entension";
import { AdminApiResolver } from "./api/admin-loyalty-coupon-resolver";
// import { ShopApiResolver } from "./api/remove-loyalty-coupon-resolver";
import { shopApiExtension } from "./api/shop-api-extension";
import { LOYALTY_POINTS_PLUGIN_OPTIONS } from "./constants";
import { PluginInitOptions } from "./types";
import { TechCoinResolver } from "./api/tech-coin.resolver";
import { TechCoinService } from "./service/tech-coin.service";
import { TechCoinTransaction, TechCoinTransactionType, TechCoinType } from "./entities/loyalty-point-transaction.entity";
import { CustomerEntityResolver } from "./api/customer-entity.resolver";
import { ApplyTechCoinsResultResolver } from "./api/tech-coin-union.resolver";

declare module "@vendure/core/dist/entity/custom-entity-fields" {

  interface CustomGlobalSettingsFields {
    nprEquivalentToUsd: number;
    nprEquvalentToAud: number;

    amountToLoyaltyPoints: number;
  }

  interface CustomOrderFields {
    loyaltyPointsRedeemed: number;
  }

  interface CustomChannelFields {
    signupBonus: any;
    orderBonus: any;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [
    {
      provide: LOYALTY_POINTS_PLUGIN_OPTIONS,
      useFactory: () => LoyaltyPointsPlugin.options,
    },
    TechCoinService,
  ],
  configuration: (config) => {
    config.customFields.GlobalSettings.push({
      name: "nprEquivalentToUsd",
      type: "float",
      defaultValue: 0,
      label: [
        { languageCode: LanguageCode.en, value: "NPR Equivalent to 1 USD" },
      ],
      description: [
        {
          languageCode: LanguageCode.en,
          value: "The exchange rate of NPR and USD",
        },
      ],
    });

    config.customFields.GlobalSettings.push({
      name: "nprEquvalentToAud",
      type: "float",
      defaultValue: 0,
      label: [
        { languageCode: LanguageCode.en, value: "NPR Equivalent to 1 AUD" },
      ],
      description: [
        {
          languageCode: LanguageCode.en,
          value: "The exchange rate of NPR and AUD",
        },
      ],
    });

    config.customFields.GlobalSettings.push({
      name: "amountToLoyaltyPoints",
      type: "int",
      defaultValue: 100,
      label: [
        { languageCode: LanguageCode.en, value: "Amount to Loyalty Points" },
      ],
      description: [
        {
          languageCode: LanguageCode.en,
          value: "Amount spent in NRP to earn 1 loyalty point",
        },
      ],
    });

    config.customFields.Order.push({
      name: "loyaltyPointsRedeemed",
      type: "int",
      defaultValue: 0,
      public: false,
      readonly: true,
      label: [
        { languageCode: LanguageCode.en, value: "Loyalty Points Redeemed" },
      ],
      description: [
        {
          languageCode: LanguageCode.en,
          value: "The number of loyalty points redeemed on this order",
        },
      ],
    });

    return config;
  },
  shopApiExtensions: {
    schema: shopApiExtension,
    resolvers: [TechCoinResolver, CustomerEntityResolver, ApplyTechCoinsResultResolver],
  },
  adminApiExtensions: {
    schema: adminApiExtension,
    resolvers: [AdminApiResolver],
  },
  compatibility: "^3.0.0",
  entities: [TechCoinTransaction],
})
export class LoyaltyPointsPlugin implements OnApplicationBootstrap {
  static options: PluginInitOptions;

  static init(options: PluginInitOptions): Type<LoyaltyPointsPlugin> {
    this.options = options;
    return LoyaltyPointsPlugin;
  }
  constructor(
    private eventBus: EventBus,
    private customerService: CustomerService,
    private globalSettingsService: GlobalSettingsService,
    private orderService: OrderService,
    private promotionService: PromotionService,
    private connection: TransactionalConnection,
    private techCoinsService: TechCoinService,
    private i18nService: I18nService,
  ) { }
  async onApplicationBootstrap() {

    this.i18nService.addTranslation(LanguageCode.en, {
      errorResult: {
        INSUFFICIENT_LOYALTY_POINTS_ERROR: 'Insufficient tech coins.',
      },
    })


    // Add 25 tech coins to user on registration
    this.eventBus.ofType(AccountRegistrationEvent).subscribe(async (event) => {
      const signupBonusPoints = event.ctx.channel.customFields.signupBonus || 0;

      const customer = await this.getCustomerForUser(event.ctx, event.user.id);

      const transaction = await this.connection.getRepository(event.ctx, TechCoinTransaction).create({
        customer,
        customerId: customer.id,
        points: signupBonusPoints,
        type: TechCoinTransactionType.EARNED,
        loyaltyPointsType: TechCoinType.REGISTER,
        description: `${customer.firstName} ${customer.lastName} earned ${signupBonusPoints} coins.`,
      })

      await this.connection.getRepository(event.ctx, TechCoinTransaction).save(transaction)
    });

    this.eventBus
      .ofType(OrderStateTransitionEvent)
      .pipe(filter((event) => event.toState === "PaymentSettled"))
      .subscribe(async (event) => {
        const order = event.order;
        const customer = order.customer;
        if (!customer) throw new BadRequestException('No customer found')
        let pointsToAdd = 0;
        if (customer) {
          const orderValue = order.subTotalWithTax / 100;

          pointsToAdd = (await this.techCoinAwarder(
            orderValue,
            event.ctx.channel,
          )) as unknown as number;

          const transaction = await this.connection.getRepository(event.ctx, TechCoinTransaction).create({
            customer,
            customerId: customer.id,
            order,
            orderId: order.id,
            points: pointsToAdd,
            type: TechCoinTransactionType.EARNED,
            loyaltyPointsType: TechCoinType.ORDER,
            description: `${customer.firstName} ${customer.lastName} earned ${pointsToAdd} coins.`,
            orderCode: order.code
          })
          await this.connection.getRepository(event.ctx, TechCoinTransaction).save(transaction)
        }
      });

    this.eventBus
      .ofType(OrderStateTransitionEvent)
      .pipe(filter((event) => event.toState === "Cancelled"))
      .subscribe(async (event) => {
        if (event.fromState === "PaymentSettled" && event.toState === "Cancelled") {
          if (!event.ctx.activeUserId) throw new UnauthorizedException("Unauthorized")
          const order = event.order
          const customer = order.customer;
          if (!customer) throw new BadRequestException('No customer found')

          const transactionLogs = await this.techCoinsService.techcoinTrasnsactions(event.ctx, customer.id)

          const transaction = await this.connection.getRepository(event.ctx, TechCoinTransaction).create({
            customer,
            customerId: customer.id,
            order,
            orderId: order.id,
            points: -transactionLogs[0].points,
            type: TechCoinTransactionType.REVERTED,
            loyaltyPointsType: TechCoinType.ORDER,
            description: `${customer.firstName} ${customer.lastName} reverted ${transactionLogs[0].points} coins.`,
            orderCode: order.code
          })
          await this.connection.getRepository(event.ctx, TechCoinTransaction).save(transaction)

          await this.techCoinsService.revertTechCoinRedemption(event.ctx, order.id)
        } else {
          if (event.order.surcharges.length !== 0) {
            const order = event.order
            await this.techCoinsService.revertTechCoinRedemption(event.ctx, order.id)
          }
        }
      })
  }

  private async getCustomerForUser(
    ctx: RequestContext,
    userId: ID,
  ): Promise<Customer> {
    if (!userId) {
      throw new ForbiddenError();
    }
    const customer = await this.customerService.findOneByUserId(ctx, userId);
    if (!customer) {
      throw new InternalServerError("error.no-customer-found-for-current-user");
    }
    return customer;
  }

  // helper function to determine to coins based on given criteria
  private async techCoinAwarder(amount: number, channel: Channel) {

    const schemas = channel.customFields.orderBonus.sort(
      (a: any, b: any) => a.minOrderValue - b.minOrderValue,
    );

    for (const schema of schemas) {
      const isFixedSchema =
        amount >= schema.minOrderValue &&
        (!schema.maxOrderValue || amount <= schema.maxOrderValue);

      if (!isFixedSchema) continue;

      if (!schema.rewardInterval || schema.rewardInterval === 0) {
        return schema.coins;
      }

      const coins = Math.floor(amount / schema.rewardInterval) * schema.coins;

      return coins
    }

    return 0;
  }

  static ui: AdminUiExtension = {
    id: "loyalty-points-ui",
    extensionPath: path.join(__dirname, "ui"),
    routes: [{ route: "loyalty-points", filePath: "routes.ts" }],
    providers: ["providers.ts"],
  };
}
