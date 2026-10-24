import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isKnownNcmEvent,
  isNcmUserAgent,
  parseNcmWebhook,
  safeSecretEqual,
} from "./webhook-security.util";

describe("safeSecretEqual", () => {
  it("accepts the same secret", () => {
    assert.equal(safeSecretEqual("abc123", "abc123"), true);
  });
  it("rejects a different secret, including one that differs in length", () => {
    assert.equal(safeSecretEqual("abc124", "abc123"), false);
    assert.equal(safeSecretEqual("abc", "abc123"), false);
    assert.equal(safeSecretEqual("abc1234", "abc123"), false);
  });
  it("never matches when either side is empty or missing", () => {
    assert.equal(safeSecretEqual("", ""), false);
    assert.equal(safeSecretEqual(undefined, undefined), false);
    assert.equal(safeSecretEqual("abc", undefined), false);
    assert.equal(safeSecretEqual(undefined, "abc"), false);
    assert.equal(safeSecretEqual(null, "abc"), false);
  });
});

describe("isNcmUserAgent", () => {
  it("accepts NCM-Webhook/ with any version", () => {
    assert.equal(isNcmUserAgent("NCM-Webhook/1.0"), true);
    assert.equal(isNcmUserAgent("NCM-Webhook/2.3.1 (+https://x)"), true);
  });
  it("rejects anything else", () => {
    assert.equal(isNcmUserAgent("curl/8.0"), false);
    assert.equal(isNcmUserAgent("ncm-webhook/1.0"), false);
    assert.equal(isNcmUserAgent("Mozilla NCM-Webhook/1.0"), false);
    assert.equal(isNcmUserAgent(""), false);
    assert.equal(isNcmUserAgent(undefined), false);
  });
});

describe("isKnownNcmEvent", () => {
  it("knows the documented events", () => {
    for (const e of ["pickup_completed", "sent_for_delivery", "order_dispatched", "order_arrived", "delivery_completed"]) {
      assert.equal(isKnownNcmEvent(e), true, e);
    }
  });
  it("does not know others", () => {
    assert.equal(isKnownNcmEvent("order_returned"), false);
    assert.equal(isKnownNcmEvent(undefined), false);
    assert.equal(isKnownNcmEvent(42), false);
  });
});

describe("parseNcmWebhook", () => {
  it("reads a single order id in different spellings", () => {
    assert.deepEqual(parseNcmWebhook({ event: "delivery_completed", order_id: "123" }).references, ["123"]);
    assert.deepEqual(parseNcmWebhook({ event: "delivery_completed", orderId: 456 }).references, ["456"]);
    assert.deepEqual(parseNcmWebhook({ event: "delivery_completed", orderid: "789" }).references, ["789"]);
  });
  it("reads a list and removes duplicates, keeping order", () => {
    const parsed = parseNcmWebhook({ event: "delivery_completed", order_id: "1", order_ids: ["2", "1", 3, " 2 "] });
    assert.deepEqual(parsed.references, ["1", "2", "3"]);
  });
  it("includes our own vref_id", () => {
    assert.deepEqual(parseNcmWebhook({ event: "x", vref_id: 77 }).references, ["77"]);
  });
  it("flags test calls", () => {
    assert.equal(parseNcmWebhook({ test: true }).isTest, true);
    assert.equal(parseNcmWebhook({ test: "true" }).isTest, false);
  });
  it("survives junk bodies", () => {
    for (const body of [undefined, null, "text", 5, [], {}]) {
      const parsed = parseNcmWebhook(body);
      assert.deepEqual(parsed.references, []);
      assert.equal(parsed.event, undefined);
    }
  });
  it("ignores empty and non-scalar ids", () => {
    assert.deepEqual(parseNcmWebhook({ order_id: "  ", order_ids: [null, {}, [], ""] }).references, []);
  });
});
