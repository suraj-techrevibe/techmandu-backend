/**
 * Pure helpers for reporting the outcome of booking several orders with NCM.
 * No Vendure imports, so they can be unit-tested directly.
 */

export type BookingStatus = "booked" | "already-booked" | "failed";

export interface BookingResult {
  orderId: string;
  orderCode: string;
  status: BookingStatus;
  /** Present for "booked" and "already-booked". Can also be present on "failed" when NCM accepted the parcel but we could not save the id. */
  trackingId?: string;
  /** Present for "failed". */
  error?: string;
}

export interface BookingSummary {
  /** Every tracking id that exists for these orders, booked now or earlier, without duplicates. */
  trackingIds: string[];
  failures: BookingResult[];
  ok: boolean;
}

export function summariseBookings(results: BookingResult[]): BookingSummary {
  const trackingIds: string[] = [];
  for (const r of results) {
    if (r.status !== "failed" && r.trackingId && !trackingIds.includes(r.trackingId)) {
      trackingIds.push(r.trackingId);
    }
  }
  const failures = results.filter((r) => r.status === "failed");
  return { trackingIds, failures, ok: failures.length === 0 };
}

/**
 * One readable message naming every order that failed and why, plus what did get booked,
 * so staff know exactly which orders to retry. Re-running is safe: booked orders are skipped.
 */
export function formatBookingFailure(results: BookingResult[]): string {
  const { trackingIds, failures } = summariseBookings(results);
  const lines = failures.map((f) => {
    const note = f.trackingId ? ` (NCM already holds parcel ${f.trackingId}, save it on the order by hand)` : "";
    return `- ${f.orderCode}: ${f.error ?? "unknown error"}${note}`;
  });
  const booked = trackingIds.length
    ? ` Booked OK: ${trackingIds.join(", ")}. Retrying skips orders that are already booked.`
    : "";
  return `NCM booking failed for ${failures.length} of ${results.length} order(s):\n${lines.join("\n")}${booked}`;
}
