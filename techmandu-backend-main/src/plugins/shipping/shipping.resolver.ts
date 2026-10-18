import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  EventBus,
  FulfillmentService,
  OrderService,
  OrderStateTransitionEvent,
  PaymentStateTransitionEvent,
} from "@vendure/core";
import { pickupFulfillmentHandler } from "./handler/shipping.handler";

@Injectable()
export class PaymentSuccessService implements OnModuleInit {
  constructor(
    private eventBus: EventBus,
    private orderService: OrderService,
    private fulfillmentService: FulfillmentService,
  ) {}

  onModuleInit() {
    this.eventBus.ofType(OrderStateTransitionEvent).subscribe(async (event) => {
      if (event.toState !== "PaymentSettled") {
        return;
      }
      const ctx = event.ctx;
      const orderId = event.order.id;
      const order = await this.orderService.findOne(ctx, orderId, [
        "lines",
        "shippingLines",
        "shippingLines.shippingMethod",
      ]);

      if (!order || order.shippingLines.length === 0) return;

      const shippingMethod = order.shippingLines[0];

      if (
        shippingMethod.shippingMethod.code !== pickupFulfillmentHandler.code
      ) {
        return;
      }

      const pickupTime = order.customFields?.pickupTime;

      if (!pickupTime) {
        return;
      }

      let orderLines = order.lines.map((line) => ({
        orderLineId: line.id,
        quantity: line.quantity,
      }));

      await this.orderService.createFulfillment(ctx, {
        lines: orderLines,
        handler: {
          code: pickupFulfillmentHandler.code,
          arguments: [],
        },
      });
    });
  }
}
