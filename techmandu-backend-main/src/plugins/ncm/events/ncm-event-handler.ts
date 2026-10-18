import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  EventBus,
  OrderStateTransitionEvent,
  RequestContext,
  TransactionalConnection,
  Order,
  Logger,
} from '@vendure/core';
import { NcmService } from '../service/ncm.service';
import {
  NCM_SHIPPING_CALCULATOR,
  NCM_SHIPPING_METHOD_CODE,
} from '../contstants';

@Injectable()
export class NcmEventHandler implements OnModuleInit {
  constructor(
    private eventBus: EventBus,
    private connection: TransactionalConnection,
    private ncmService: NcmService
  ) {}

  onModuleInit() {
    // Listen for order state transitions to detect shipping address changes
    this.eventBus.ofType(OrderStateTransitionEvent).subscribe(async (event) => {
      const { order, ctx } = event;
      
      // Only process if NCM is configured for this channel
      const hasConfig = await this.ncmService.hasActiveChannelConfig(ctx);
      if (!hasConfig) {
        return;
      }

      // Reload order with relations to ensure we have the latest data
      const fullOrder = await this.connection.getRepository(ctx, Order).findOne({
        where: { id: order.id },
        relations: ['shippingLines', 'shippingLines.shippingMethod'],
      });

      if (!fullOrder) {
        return;
      }

      // Check if this order uses NCM shipping
      const usesNcm = (fullOrder.shippingLines ?? []).some((line) => {
        const code = line.shippingMethod?.code;
        return (
          code === NCM_SHIPPING_METHOD_CODE ||
          code === NCM_SHIPPING_CALCULATOR
        );
      });

      if (!usesNcm) {
        return;
      }

      try {
        // Clear cached quote and recalculate
        const customFields = (fullOrder as any).customFields || {};
        if (customFields.ncmQuote) {
          customFields.ncmQuote = null;
          await this.connection.getRepository(ctx, Order).update(fullOrder.id, {
            customFields: { ...customFields },
          });
        }

        // Enrich order with nearest branch based on new address
        await this.ncmService.enrichOrderShippingMeta(ctx, fullOrder);
        
        Logger.info(
          `NCM: Refreshed shipping data for order ${fullOrder.code || fullOrder.id}`,
          'NcmEventHandler'
        );
      } catch (error) {
        Logger.error(
          `Failed to refresh NCM shipping for order ${fullOrder.code || fullOrder.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'NcmEventHandler'
        );
      }
    });
  }
}
