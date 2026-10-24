import { createHash, timingSafeEqual } from "node:crypto";

export const NCM_WEBHOOK_USER_AGENT_PREFIX = "NCM-Webhook/";
const MAX_ORDER_CODES = 100;
const MAX_CODE_LENGTH = 64;

/**
 * Constant-time string comparison. Both sides are hashed first so the two
 * buffers always have the same length, which timingSafeEqual requires and
 * which also stops the length of the secret leaking.
 */
export function safeEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Secrets accepted in the webhook URL path. NCM_WEBHOOK_SECRET is the current
 * one. NCM_WEBHOOK_SECRET_PREVIOUS is optional and only kept for the short
 * window while NCM is switched over to a new URL (rotation).
 * Empty or missing values are dropped, so no secret configured means no
 * request is accepted.
 */
export function readWebhookSecrets(
  env: Record<string, string | undefined> = process.env
): string[] {
  return [env.NCM_WEBHOOK_SECRET, env.NCM_WEBHOOK_SECRET_PREVIOUS]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length >= 16);
}

/** True if the supplied path secret matches any configured secret. Always checks all of them. */
export function isValidWebhookSecret(
  supplied: unknown,
  secrets: string[]
): boolean {
  let ok = false;
  for (const secret of secrets) {
    if (safeEqual(supplied, secret)) ok = true;
  }
  return ok;
}

export function isNcmUserAgent(userAgent: unknown): boolean {
  return (
    typeof userAgent === "string" &&
    userAgent.startsWith(NCM_WEBHOOK_USER_AGENT_PREFIX)
  );
}

/** Pulls clean order codes from either `order_id` or `order_ids`. Invalid entries are dropped. */
export function parseOrderCodes(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const { order_id, order_ids } = payload as Record<string, unknown>;
  const raw: unknown[] = order_id
    ? [order_id]
    : Array.isArray(order_ids)
    ? order_ids
    : [];
  const codes = raw
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && c.length <= MAX_CODE_LENGTH);
  return Array.from(new Set(codes)).slice(0, MAX_ORDER_CODES);
}

/** Short, log-safe version of an event name from an untrusted payload. */
export function describeEvent(event: unknown): string {
  if (typeof event !== "string") return "<missing>";
  return event.replace(/[^\w.\-:]/g, "?").slice(0, 60);
}
