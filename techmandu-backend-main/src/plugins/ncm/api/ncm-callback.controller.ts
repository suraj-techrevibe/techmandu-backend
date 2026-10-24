import {
  Controller,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  Logger,
  Order,
  RequestContextService,
  TransactionalConnection,
} from '@vendure/core';
import {
  describeEvent,
  isNcmUserAgent,
  isValidWebhookSecret,
  parseOrderCodes,
  readWebhookSecrets,
} from '../util/webhook-security.util';

const LOG_CONTEXT = 'NcmWebhook';

/**
 * Webhook URL: POST /webhooks/ncm/<NCM_WEBHOOK_SECRET>
 * The secret lives in the environment, never in the repo. See README notes
 * for how to rotate it.
 */
@Controller('webhooks/ncm')
export class NcmWebhookController {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly ctxService: RequestContextService,
  ) {}

  @Post(':secret')
  async handleNcmWebhook(
    @Param('secret') secret: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const secrets = readWebhookSecrets();
    if (!secrets.length) {
      Logger.error(
        'NCM_WEBHOOK_SECRET is not set (or shorter than 16 characters). Rejecting every NCM webhook until it is configured.',
        LOG_CONTEXT,
      );
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'not found' });
    }

    // Wrong path secret: answer like the route does not exist.
    if (!isValidWebhookSecret(secret, secrets)) {
      Logger.warn(`Rejected NCM webhook with a wrong secret (ip ${req.ip})`, LOG_CONTEXT);
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'not found' });
    }

    const userAgent = req.headers['user-agent'];
    if (!isNcmUserAgent(userAgent)) {
      Logger.warn(
        `Rejected NCM webhook with unexpected User-Agent "${String(userAgent).slice(0, 80)}" (ip ${req.ip})`,
        LOG_CONTEXT,
      );
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'forbidden' });
    }

    const payload = req.body ?? {};

    try {
      if (payload.test === true) {
        return res.status(HttpStatus.OK).json({ status: 'success' });
      }

      if (payload.event !== 'delivery_completed') {
        // Answer 200 so NCM does not keep retrying, but leave a trace.
        Logger.warn(
          `Ignoring NCM webhook with unknown event "${describeEvent(payload.event)}"`,
          LOG_CONTEXT,
        );
        return res.status(HttpStatus.OK).json({ status: 'ignored' });
      }

      const orderCodes = parseOrderCodes(payload);
      if (!orderCodes.length) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'No order id provided' });
      }

      const ctx = await this.ctxService.create({ apiType: 'admin' });
      const repo = this.connection.getRepository(ctx, Order);

      for (const code of orderCodes) {
        const order = await repo.findOne({ where: { code } });
        if (!order) {
          Logger.warn(`NCM webhook for unknown order "${code}"`, LOG_CONTEXT);
          continue;
        }
        // Atomic and idempotent: only the first notification changes the row,
        // duplicates (even at the same moment) update nothing.
        const result = await repo
          .createQueryBuilder()
          .update(Order)
          .set({ state: 'Delivered' })
          .where('id = :id AND state != :state', {
            id: order.id,
            state: 'Delivered',
          })
          .execute();
        if (!result.affected) {
          Logger.verbose(`Order ${code} already Delivered, duplicate ignored`, LOG_CONTEXT);
        }
      }

      return res.status(HttpStatus.OK).json({ status: 'received' });
    } catch (error) {
      Logger.error(
        `NCM webhook processing failed: ${error instanceof Error ? error.message : String(error)}`,
        LOG_CONTEXT,
      );
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'processing failed' });
    }
  }
}
