import {
  Controller,
  HttpStatus,
  OnModuleInit,
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
import { Not } from 'typeorm';
import {
  isKnownNcmEvent,
  isNcmUserAgent,
  parseNcmWebhook,
  safeSecretEqual,
} from '../util/webhook-security.util';

const LOGGER_CONTEXT = 'NcmWebhook';

/**
 * Receives delivery notifications from Nepal Can Move.
 *
 * URL: POST /webhooks/ncm/<NCM_WEBHOOK_SECRET>
 *
 * The secret lives in the NCM_WEBHOOK_SECRET env variable, never in the repository. If the variable
 * is empty the endpoint answers 404 for everything, so a missing config can never leave it open.
 * Set NCM_WEBHOOK_REQUIRE_UA=false only for local testing with curl.
 */
@Controller('webhooks/ncm')
export class NcmWebhookController implements OnModuleInit {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly ctxService: RequestContextService,
  ) {}

  onModuleInit() {
    if (!process.env.NCM_WEBHOOK_SECRET?.trim()) {
      Logger.warn(
        'NCM_WEBHOOK_SECRET is not set. The NCM webhook endpoint is disabled (it answers 404).',
        LOGGER_CONTEXT,
      );
    }
  }

  @Post(':secret')
  async handleNcmWebhook(
    @Param('secret') secret: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // 1. Secret in the path. 404 (not 401) so a scanner learns nothing about the route.
    if (!safeSecretEqual(secret, process.env.NCM_WEBHOOK_SECRET?.trim())) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'not found' });
    }

    // 2. NCM identifies itself with "NCM-Webhook/<version>".
    const requireUa = process.env.NCM_WEBHOOK_REQUIRE_UA?.trim().toLowerCase() !== 'false';
    if (requireUa && !isNcmUserAgent(req.headers['user-agent'])) {
      Logger.warn(
        `Rejected webhook call with User-Agent "${String(req.headers['user-agent'] ?? '')}"`,
        LOGGER_CONTEXT,
      );
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'forbidden' });
    }

    const { event, references, isTest } = parseNcmWebhook(req.body);

    try {
      if (isTest) {
        return res.status(HttpStatus.OK).json({ status: 'success' });
      }

      if (!event || !isKnownNcmEvent(event)) {
        // Answer 200 so NCM does not retry, but leave a trace so we notice new event types.
        Logger.warn(
          `Unknown NCM webhook event "${event ?? '(none)'}" for references [${references.join(', ')}]`,
          LOGGER_CONTEXT,
        );
        return res.status(HttpStatus.OK).json({ status: 'ignored' });
      }

      if (event !== 'delivery_completed') {
        Logger.verbose(`NCM event "${event}" for [${references.join(', ')}] needs no action`, LOGGER_CONTEXT);
        return res.status(HttpStatus.OK).json({ status: 'ignored' });
      }

      if (!references.length) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'No order id provided' });
      }

      const ctx = await this.ctxService.create({ apiType: 'admin' });
      const repo = this.connection.getRepository(ctx, Order);

      for (const ref of references) {
        const order = await this.findOrder(ctx, ref);
        if (!order) {
          Logger.warn(`NCM delivery_completed for unknown order reference "${ref}"`, LOGGER_CONTEXT);
          continue;
        }
        if (order.state === 'Delivered') {
          // Duplicate notification. Nothing to do.
          continue;
        }
        // The "state != Delivered" condition makes this safe when two copies arrive at the same time:
        // only one of them updates a row.
        const result = await repo.update({ id: order.id, state: Not('Delivered') }, { state: 'Delivered' });
        if (result.affected) {
          Logger.info(`Order ${order.code} marked Delivered by NCM (reference ${ref})`, LOGGER_CONTEXT);
        }
      }

      return res.status(HttpStatus.OK).json({ status: 'received' });
    } catch (error) {
      Logger.error(
        `NCM webhook processing failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
        LOGGER_CONTEXT,
      );
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'processing failed' });
    }
  }

  /**
   * NCM reports its own order id, which we store as the tracking id. We also send our order id as
   * vref_id when booking, and the order code was used by the old handler, so try all three.
   */
  private async findOrder(ctx: Parameters<TransactionalConnection['getRepository']>[0], ref: string) {
    const repo = this.connection.getRepository(ctx, Order);
    const byTracking = await repo.findOne({ where: { customFields: { ncmTrackingId: ref } } });
    if (byTracking) return byTracking;
    const byCode = await repo.findOne({ where: { code: ref } });
    if (byCode) return byCode;
    if (/^\d+$/.test(ref)) {
      return repo.findOne({ where: { id: ref } });
    }
    return null;
  }
}
