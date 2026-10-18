import {
  Controller,
  Post,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  RequestContextService,
  TransactionalConnection,
  Order,
  OrderService,
  FulfillmentService,
} from '@vendure/core';

@Controller('webhooks/ncm/8ae44a07-de97-4162-9f0e-f2c93608f8b9')
export class NcmWebhookController {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly ctxService: RequestContextService,
    private readonly orderService: OrderService,
  ) {}

  @Post()
  async handleNcmWebhook(@Req() req: Request, @Res() res: Response) {
    const payload = req.body;

    try {
      const {
        event,
        order_id,
        order_ids,
        test,
      } = payload;

      if (test === true) {
        return res.status(HttpStatus.OK).json({ status: 'success' });
      }

      if (event !== 'delivery_completed') {
        return res.status(HttpStatus.OK).json({ status: 'ignored' });
      }

      const orderCodes: string[] = order_id
        ? [order_id]
        : Array.isArray(order_ids)
        ? order_ids
        : [];

      if (!orderCodes.length) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'No order id provided',
        });
      }

      const ctx = await this.ctxService.create({
        apiType: 'admin',
      });


      for (const code of orderCodes) {
        const order = await this.connection
          .getRepository(ctx, Order)
          .findOne({
            where: { code },
            relations: ['lines'],
          });

        if (!order) {
          continue;
        }

        if (order.state === 'Delivered') {
          continue;
        }

        await this.connection.getRepository(ctx,Order).update({
          id: order.id
        },{
          state: 'Delivered'
        })

      }

      return res.status(HttpStatus.OK).json({ status: 'received' });

    } catch (error) {
      console.error('NCM Webhook Error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'processing failed',
      });
    }
  }
}
