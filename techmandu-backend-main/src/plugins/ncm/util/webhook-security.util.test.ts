import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeEvent,
  isNcmUserAgent,
  isValidWebhookSecret,
  parseOrderCodes,
  readWebhookSecrets,
  safeEqual,
} from "./webhook-security.util";

const SECRET = "a".repeat(32);
const OLD = "b".repeat(32);

describe("safeEqual", () => {
  it("matches equal strings and rejects different ones", () => {
    assert.equal(safeEqual("abc", "abc"), true);
    assert.equal(safeEqual("abc", "abd"), false);
  });
  it("handles different lengths without throwing", () => {
    assert.equal(safeEqual("abc", "abcdef"), false);
    assert.equal(safeEqual("", "abc"), false);
  });
  it("rejects non-strings", () => {
    assert.equal(safeEqual(undefined, "abc"), false);
    assert.equal(safeEqual("abc", 123), false);
  });
});

describe("readWebhookSecrets", () => {
  it("reads current and previous secrets", () => {
    assert.deepEqual(
      readWebhookSecrets({ NCM_WEBHOOK_SECRET: SECRET, NCM_WEBHOOK_SECRET_PREVIOUS: OLD }),
      [SECRET, OLD]
    );
  });
  it("returns nothing when unset, blank or too short (fails closed)", () => {
    assert.deepEqual(readWebhookSecrets({}), []);
    assert.deepEqual(readWebhookSecrets({ NCM_WEBHOOK_SECRET: "   " }), []);
    assert.deepEqual(readWebhookSecrets({ NCM_WEBHOOK_SECRET: "short" }), []);
  });
});

describe("isValidWebhookSecret", () => {
  it("accepts the current and the previous secret", () => {
    assert.equal(isValidWebhookSecret(SECRET, [SECRET, OLD]), true);
    assert.equal(isValidWebhookSecret(OLD, [SECRET, OLD]), true);
  });
  it("rejects anything else, including when nothing is configured", () => {
    assert.equal(isValidWebhookSecret("c".repeat(32), [SECRET, OLD]), false);
    assert.equal(isValidWebhookSecret(SECRET, []), false);
    assert.equal(isValidWebhookSecret(undefined, [SECRET]), false);
  });
});

describe("isNcmUserAgent", () => {
  it("requires the NCM-Webhook/ prefix", () => {
    assert.equal(isNcmUserAgent("NCM-Webhook/1.0"), true);
    assert.equal(isNcmUserAgent("curl/8.0"), false);
    assert.equal(isNcmUserAgent("xNCM-Webhook/1.0"), false);
    assert.equal(isNcmUserAgent(undefined), false);
  });
});

describe("parseOrderCodes", () => {
  it("reads a single order_id", () => {
    assert.deepEqual(parseOrderCodes({ order_id: "T100" }), ["T100"]);
  });
  it("reads order_ids, trims, dedupes and drops junk", () => {
    assert.deepEqual(
      parseOrderCodes({ order_ids: [" T1 ", "T1", "", 5, null, "T2"] }),
      ["T1", "T2"]
    );
  });
  it("prefers order_id over order_ids", () => {
    assert.deepEqual(parseOrderCodes({ order_id: "A", order_ids: ["B"] }), ["A"]);
  });
  it("returns empty for bad payloads", () => {
    assert.deepEqual(parseOrderCodes(null), []);
    assert.deepEqual(parseOrderCodes("x"), []);
    assert.deepEqual(parseOrderCodes({}), []);
  });
  it("caps the list and ignores very long codes", () => {
    const many = Array.from({ length: 500 }, (_, i) => `T${i}`);
    assert.equal(parseOrderCodes({ order_ids: many }).length, 100);
    assert.deepEqual(parseOrderCodes({ order_id: "x".repeat(200) }), []);
  });
});

describe("describeEvent", () => {
  it("keeps normal names and cleans odd ones", () => {
    assert.equal(describeEvent("delivery_completed"), "delivery_completed");
    assert.equal(describeEvent("a\nb c"), "a?b?c");
    assert.equal(describeEvent(undefined), "<missing>");
    assert.equal(describeEvent("x".repeat(500)).length, 60);
  });
});
