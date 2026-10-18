/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  AccountRegistrationEvent,
  ConfigService,
  EntityHydrator,
  IdentifierChangeRequestEvent,
  Injector,
  NativeAuthenticationMethod,
  Order,
  OrderStateTransitionEvent,
  PasswordResetEvent,
  RequestContext,
  ShippingLine,
} from '@vendure/core';
import { Request } from 'express';

import { mockOrderDeliveredEvent, mockOrderShippedEvent } from './mock-events';
import {
  EmailEventListener,
  transformOrderLineAssetUrls,
} from '@vendure/email-plugin';
import { lowStockHandler } from './low-stock-email-handler';
import { biddingNotificationHandler } from './bidding-email-handler';

export const orderShippedHandler = new EmailEventListener('order-shipped')
  .on(OrderStateTransitionEvent)
  .filter(
    (event) =>
      event.toState === 'Shipped' &&
      event.fromState !== 'Modifying' &&
      !!event.order.customer
  )
  .loadData(async ({ event, injector }) => {
    const entityHydrator = injector.get(EntityHydrator);
    await entityHydrator.hydrate(event.ctx, event.order, {
      relations: ['lines.featuredAsset', 'shippingLines.shippingMethod'],
    });

    transformOrderLineAssetUrls(event.ctx, event.order, injector);
    const shippingLines = shippingLinesWithMethod(event.order);
    return { shippingLines };
  })
  .setRecipient((event) => event.order.customer!.emailAddress)
  .setFrom('{{ fromAddress }}')
  .setSubject('Order shipped for #{{ order.code }}')
  .setTemplateVars((event) => ({
    order: event.order,
    shippingLines: event.data.shippingLines,
  }))
  .setMockEvent(mockOrderShippedEvent);

export const orderDeliveredHandler = new EmailEventListener('order-delivered')
  .on(OrderStateTransitionEvent)
  .filter(
    (event) =>
      event.toState === 'Delivered' &&
      event.fromState !== 'Modifying' &&
      !!event.order.customer
  )
  .loadData(async ({ event, injector }) => {
    const entityHydrator = injector.get(EntityHydrator);
    await entityHydrator.hydrate(event.ctx, event.order, {
      relations: ['lines.featuredAsset', 'shippingLines.shippingMethod'],
    });

    transformOrderLineAssetUrls(event.ctx, event.order, injector);
    const shippingLines = shippingLinesWithMethod(event.order);
    return { shippingLines };
  })
  .setRecipient((event) => event.order.customer!.emailAddress)
  .setFrom('{{ fromAddress }}')
  .setSubject('Order delivered for #{{ order.code }}')
  .setTemplateVars((event) => ({
    order: event.order,
    shippingLines: event.data.shippingLines,
  }))
  .setMockEvent(mockOrderDeliveredEvent);

export function shippingLinesWithMethod(order: Order): ShippingLine[] {
  const shippingLines: ShippingLine[] = [];

  for (const line of order.shippingLines || []) {
    if (line.shippingMethod) {
      shippingLines.push(line);
    }
  }
  return shippingLines;
}

export const emailHandlerExtensions = [
  orderShippedHandler,
  orderDeliveredHandler,
  lowStockHandler,
  biddingNotificationHandler,
];
