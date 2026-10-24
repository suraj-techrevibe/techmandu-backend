/**
 * Pure helpers for the NCM webhook. No Nest or Vendure imports on purpose, so they can be
 * unit-tested without booting the server (see webhook-security.util.test.ts).
 */
import { createHash, timingSafeEqual } from "crypto";

/** Events NCM is known to send. Anything else is logged as unknown. */
export const KNOWN_NCM_EVENTS = [
  "pickup_completed",
  "sent_for_delivery",
  "order_dispatched",
  "order_arrived",
  "delivery_completed",
] as const;

export type KnownNcmEvent = (typeof KNOWN_NCM_EVENTS)[number];

export function isKnownNcmEvent(event: unknown): event is KnownNcmEvent {
  return typeof event === "string" && (KNOWN_NCM_EVENTS as readonly string[]).includes(event);
}

/**
 * Compares two secrets in constant time.
 * Both sides are hashed first so the comparison always runs on 32 bytes, which also hides
 * the length of the real secret. An empty or missing value never matches.
 */
export function safeSecretEqual(
  provided: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!provided || !expected) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** NCM calls the webhook with a User-Agent such as "NCM-Webhook/1.0". */
export function isNcmUserAgent(userAgent: string | string[] | null | undefined): boolean {
  const value = Array.isArray(userAgent) ? userAgent[0] : userAgent;
  return typeof value === "string" && value.startsWith("NCM-Webhook/");
}

export interface ParsedNcmWebhook {
  event: string | undefined;
  /** NCM order ids / our own references, as strings, de-duplicated, in the order received. */
  references: string[];
  isTest: boolean;
}

const toRefString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
};

/**
 * Reads the webhook body. The exact field names are not documented publicly, so this accepts
 * the snake_case and camelCase spellings seen in NCM clients: order_id / orderId / orderid,
 * order_ids / orderIds, and vref_id / vrefId (our own reference).
 */
export function parseNcmWebhook(body: unknown): ParsedNcmWebhook {
  const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const event = typeof payload.event === "string" ? payload.event : undefined;

  const refs: string[] = [];
  const push = (value: unknown) => {
    const ref = toRefString(value);
    if (ref && !refs.includes(ref)) refs.push(ref);
  };

  for (const key of ["order_id", "orderId", "orderid", "vref_id", "vrefId"]) push(payload[key]);
  for (const key of ["order_ids", "orderIds"]) {
    const list = payload[key];
    if (Array.isArray(list)) list.forEach(push);
  }

  return { event, references: refs, isTest: payload.test === true };
}
