export type OrderKey = string | number;

export interface BookedOrder {
  orderId: OrderKey;
  orderCode: string;
  trackingId: string;
  /** True when NCM was not called because this order already had a tracking id. */
  alreadyBooked: boolean;
}

export interface FailedOrder {
  orderId: OrderKey;
  orderCode: string;
  reason: string;
}

export interface BookingResult {
  booked: BookedOrder[];
  failed: FailedOrder[];
}

/** Removes repeated ids (1 and "1" count as the same order), keeping the first of each. */
export function dedupeOrderIds<T extends OrderKey>(ids: T[]): T[] {
  const seen = new Set<string>();
  return ids.filter((id) => {
    const key = String(id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** One tracking string for Vendure's fulfillment, e.g. "TRK1, TRK2". */
export function trackingCodeOf(result: BookingResult): string {
  return result.booked.map((b) => b.trackingId).join(", ");
}

/** A message an admin can act on: what failed, why, and what is already safe. */
export function failureMessage(result: BookingResult): string {
  const total = result.booked.length + result.failed.length;
  const failedText = result.failed
    .map((f) => `${f.orderCode} (${f.reason})`)
    .join("; ");
  const bookedText = result.booked.length
    ? ` Already booked, will be skipped on retry: ${result.booked
        .map((b) => `${b.orderCode} -> ${b.trackingId}`)
        .join(", ")}.`
    : "";
  return `NCM booking failed for ${result.failed.length} of ${total} order(s): ${failedText}.${bookedText}`;
}

export interface BookingOutcome {
  orderId: string;
  orderCode: string;
  trackingId: string | null;
  alreadyBooked: boolean;
  error: string | null;
}

/** Flat list for the admin API: booked and failed orders in one list. */
export function toBookingOutcomes(result: BookingResult): BookingOutcome[] {
  return [
    ...result.booked.map((b) => ({
      orderId: String(b.orderId),
      orderCode: b.orderCode,
      trackingId: b.trackingId,
      alreadyBooked: b.alreadyBooked,
      error: null,
    })),
    ...result.failed.map((f) => ({
      orderId: String(f.orderId),
      orderCode: f.orderCode,
      trackingId: null,
      alreadyBooked: false,
      error: f.reason,
    })),
  ];
}
