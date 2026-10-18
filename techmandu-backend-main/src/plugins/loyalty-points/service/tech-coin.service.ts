import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import {
  TransactionalConnection,
  RequestContext,
  Channel,
  Logger,
  ID,
  CustomerService,
  OrderService,
  Order,
  Customer,
  Surcharge,
  EventBus,
  OrderStateTransitionEvent,
} from "@vendure/core";
import { TechCoinTransaction, TechCoinTransactionType, TechCoinType } from "../entities/loyalty-point-transaction.entity";
import { filter } from 'rxjs/operators';
import { InsufficientLoyaltyPointsError } from "../errors/loyalty-points.errors";
import { TechCoinsReedemResponse } from "src/plugins/codegen/generated-shop-types";

@Injectable()
export class TechCoinService {
  constructor(private readonly connection: TransactionalConnection, private readonly customerService: CustomerService, private readonly orderService: OrderService, private eventBus: EventBus) { }

  async fetchAllOrderBonus(ctx: RequestContext) {
    const channel = await this.connection.getRepository(ctx, Channel).findOne({
      where: {
        id: ctx.channelId,
      },
    });

    if (!channel) throw new NotFoundException();

    return channel.customFields.orderBonus;
  }

  async fetchSignupBonus(ctx: RequestContext) {
    const channel = await this.connection.getRepository(ctx, Channel).findOne({
      where: {
        id: ctx.channelId,
      },
    });

    if (!channel) throw new NotFoundException();

    return channel.customFields.signupBonus;
  }

  async reedemTechCoins(ctx: RequestContext, orderId: ID, coins: number): Promise<TechCoinsReedemResponse | InsufficientLoyaltyPointsError> {
    try {

      if (coins < 100) {
        return new InsufficientLoyaltyPointsError()
      }

      await this.coinsIntervalValidator(coins)

      const order = await this.orderService.findOne(ctx, orderId)

      if (!order) return {
        success: false,
        message: "No such order exists"
      }

      if (order.state !== "ArrangingPayment") return {
        success: false,
        message: "Can only reedem the tech coins during arranging the payment"
      }

      if (!ctx.activeUserId) throw new UnauthorizedException('Unauthorized')

      const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId)

      if (!customer) throw new NotFoundException('No such customer')

      const availableLoyaltyPoints = await this.getAvailablePointsForCustomer(ctx, customer.id)

      if (coins > availableLoyaltyPoints) return {
        success: false,
        message: "Insufficient tech coins"
      }

      const techCoins = availableLoyaltyPoints
      if (!techCoins) return {
        success: false,
        message: "Sorry, You do not contain any tech coins to reedem"
      }

      if (techCoins < 100) return {
        success: false,
        message: "A minimum of 100 techcoins is required to reedem it"
      }


      // techcoins value are static as of now
      const techCoinsValue = ((coins / 10) * 5) * 100
      const surcharge = await this.orderService.getOrderSurcharges(ctx, order.id)

      const transaction = await this.connection.getRepository(ctx, TechCoinTransaction).create({
        customer,
        customerId: customer.id,
        order,
        orderId: order.id,
        points: -coins,
        type: TechCoinTransactionType.REDEEMED,
        loyaltyPointsType: TechCoinType.ORDER,
        description: `${customer.firstName} ${customer.lastName} reedemed ${coins} coins.`,
        orderCode: order.code
      })

      await this.connection.getRepository(ctx, TechCoinTransaction).save(transaction)

      if (surcharge.length === 0) {
        await this.orderService.addSurchargeToOrder(ctx, order.id, {
          description: 'Loyalty discount',
          listPrice: -techCoinsValue,
          listPriceIncludesTax: false,
        });
      } else {
        await this.connection.getRepository(ctx, Surcharge).update({
          id: surcharge[0].id
        },
          {
            listPrice: -(-(surcharge[0].listPrice) + techCoinsValue)
          })

      }
      return {
        success: true,
        message: "Tech coins reedemed successfully"
      }
    } catch (error) {
      Logger.error(error as string)
      throw new Error(error as string)
    }
  }

  async revertTechCoinRedemption(ctx: RequestContext, orderId: ID) {
    try {
      if (!ctx.activeUserId) throw new UnauthorizedException("Unauthorized")

      const order = await this.orderService.findOne(ctx, orderId, ['surcharges'])


      if (!order) return {
        success: false,
        message: 'No such order exists'
      }

      if (!order.customerId) return

      const customer = await this.customerService.findOne(ctx, order.customerId)
      if (!customer) throw new NotFoundException("Customer not found")

      if (order.surcharges.length === 0) {
        return {
          success: false,
          message: "No techcoins discounts found to be reverted"
        }
      } else {
        const discountToCoins = ((-(order.surcharges[0].listPrice) * 10) / 5) / 100

        await this.orderService.removeSurchargeFromOrder(ctx, orderId, order.surcharges[0].id)
        const transac = new TechCoinTransaction({

          customer,
          customerId: customer.id,
          order,
          orderId: order.id,
          points: discountToCoins,
          type: TechCoinTransactionType.REVERTED,
          loyaltyPointsType: TechCoinType.ORDER,
          description: `${customer.firstName} ${customer.lastName} reverted ${discountToCoins} coins.`,
          orderCode: order.code
        })
        //  transac = await this.connection.getRepository(ctx, TechCoinTransaction).save({
        //   customer,
        //   customerId: customer.id,
        //   order,
        //   orderId: order.id,
        //   points: discountToCoins,
        //   type: TechCoinTransactionType.REVERTED,
        //   loyaltyPointsType: TechCoinType.ORDER,
        //   description: `${customer.firstName} ${customer.lastName} reverted ${discountToCoins} coins.`,
        //   orderCode: order.code
        // })

        await this.connection.getRepository(ctx, TechCoinTransaction).save(transac)

        return {
          success: true,
          message: "Techcoins discount reverted successfully"
        }
      }
    } catch (error) {
      Logger.error(error as string)
      throw new Error(error as string)
    }
  }

  async techcoinTrasnsactions(ctx: RequestContext, customerId: ID) {
    try {
      if (!ctx.activeUserId) throw new UnauthorizedException('Unauthorized')

      // const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId)
      const customer = await this.customerService.findOne(ctx, customerId)


      if (!customer) throw new NotFoundException('No such customer found')

      return await this.connection.getRepository(ctx, TechCoinTransaction).find({
        where: {
          customerId: customerId
        },
        relations: ['customer', 'order'],
        order: {
          id: "DESC"
        }
      })

    } catch (error) {
      Logger.error(error as string)
      throw new Error(error as string)
    }
  }

  async getAvailablePointsForCustomer(ctx: RequestContext, customerId: ID): Promise<number> {
    // const now = new Date();
    const result = await this.connection
      .getRepository(ctx, TechCoinTransaction)
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.points), 0)', 'totalPoints')
      .where('tx.customerId = :customerId', { customerId })
      // .andWhere('tx.expiresAt > :now', { now })
      .getRawOne();

    return parseInt(result.totalPoints, 10);
  }

  async coinsIntervalValidator(coins: number) {
    try {
      if (coins % 50 !== 0) throw new BadRequestException('Coins can only be redeemed on interval of 50')
      return
    } catch (error) {
      Logger.error(error as string)
      throw new Error(error as string)
    }

  }
}
