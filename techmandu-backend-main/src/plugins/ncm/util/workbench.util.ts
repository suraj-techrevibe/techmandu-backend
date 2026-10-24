import {
  codAmountNpr,
  normaliseNepalPhone,
  NprRates,
  PaymentLike,
} from "./shipping-price.util";

export interface WorkbenchOrderLike {
  id: string | number;
  code: string;
  currencyCode: string;
  totalWithTax: number;
  orderPlacedAt?: Date | string | null;
  customer?: { firstName?: string | null; lastName?: string | null } | null;
  shippingAddress?: {
    fullName?: string | null;
    phoneNumber?: string | null;
  } | null;
  payments?: PaymentLike[] | null;
  customFields?: {
    ncmTrackingId?: string | null;
    destinationBranch?: string | null;
    nearestNcmBranch?: string | null;
  } | null;
}

export interface WorkbenchRow {
  orderId: string;
  code: string;
  placedAt: string | null;
  customerName: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  phoneValid: boolean;
  destination: string | null;
  currencyCode: string;
  /** Order total in minor units of its own currency. */
  total: number;
  /** NPR the rider must collect: 0 for prepaid orders, null if it cannot be worked out. */
  cashToCollectNpr: number | null;
  ncmTrackingId: string | null;
  /** Reasons the order cannot be booked yet. Empty means it can. */
  problems: string[];
  canBook: boolean;
}

const clean = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

export function buildWorkbenchRow(
  order: WorkbenchOrderLike,
  opts: { rates: NprRates; addressOk: boolean }
): WorkbenchRow {
  const phone = normaliseNepalPhone(order.shippingAddress?.phoneNumber);
  const trackingId = clean(order.customFields?.ncmTrackingId);
  const cash = codAmountNpr(
    order.totalWithTax,
    order.currencyCode,
    order.payments ?? [],
    opts.rates
  );

  const problems: string[] = [];
  if (!opts.addressOk) problems.push("Not a complete Nepal address");
  if (!phone) problems.push("No valid recipient phone");
  if (cash === undefined) {
    problems.push(`No exchange rate for ${order.currencyCode}`);
  }

  const customerName =
    [order.customer?.firstName, order.customer?.lastName]
      .map(clean)
      .filter(Boolean)
      .join(" ") || null;

  return {
    orderId: String(order.id),
    code: order.code,
    placedAt: order.orderPlacedAt ? new Date(order.orderPlacedAt).toISOString() : null,
    customerName,
    recipientName: clean(order.shippingAddress?.fullName),
    recipientPhone: phone ?? clean(order.shippingAddress?.phoneNumber),
    phoneValid: !!phone,
    destination:
      clean(order.customFields?.destinationBranch) ??
      clean(order.customFields?.nearestNcmBranch),
    currencyCode: order.currencyCode,
    total: order.totalWithTax,
    cashToCollectNpr: cash ?? null,
    ncmTrackingId: trackingId,
    problems,
    canBook: !trackingId && problems.length === 0,
  };
}
