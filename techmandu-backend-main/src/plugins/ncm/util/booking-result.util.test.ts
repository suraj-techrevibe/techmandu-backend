import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dedupeOrderIds,
  failureMessage,
  trackingCodeOf,
} from "./booking-result.util";

const booked = (code: string, trk: string) => ({
  orderId: code,
  orderCode: code,
  trackingId: trk,
  alreadyBooked: false,
});

describe("dedupeOrderIds", () => {
  it("drops repeats and treats 1 and '1' alike", () => {
    assert.deepEqual(dedupeOrderIds([1, "1", 2, 2, 3]), [1, 2, 3]);
  });
  it("keeps order and handles empty input", () => {
    assert.deepEqual(dedupeOrderIds(["b", "a", "b"]), ["b", "a"]);
    assert.deepEqual(dedupeOrderIds([]), []);
  });
});

describe("trackingCodeOf", () => {
  it("joins all tracking ids", () => {
    assert.equal(
      trackingCodeOf({ booked: [booked("A", "T1"), booked("B", "T2")], failed: [] }),
      "T1, T2"
    );
  });
  it("is empty when nothing booked", () => {
    assert.equal(trackingCodeOf({ booked: [], failed: [] }), "");
  });
});

describe("failureMessage", () => {
  it("names failed orders with reasons and lists safe ones", () => {
    const msg = failureMessage({
      booked: [booked("A", "T1")],
      failed: [{ orderId: "B", orderCode: "B", reason: "no valid phone" }],
    });
    assert.match(msg, /failed for 1 of 2 order/);
    assert.match(msg, /B \(no valid phone\)/);
    assert.match(msg, /A -> T1/);
  });
  it("omits the booked part when none were booked", () => {
    const msg = failureMessage({
      booked: [],
      failed: [{ orderId: 1, orderCode: "X", reason: "timeout" }],
    });
    assert.doesNotMatch(msg, /Already booked/);
  });
});
