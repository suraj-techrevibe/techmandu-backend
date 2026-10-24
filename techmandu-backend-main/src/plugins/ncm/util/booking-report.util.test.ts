import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BookingResult, formatBookingFailure, summariseBookings } from "./booking-report.util";

const booked = (code: string, id: string): BookingResult => ({ orderId: code, orderCode: code, status: "booked", trackingId: id });

describe("summariseBookings", () => {
  it("is ok when every order is booked, and lists all tracking ids", () => {
    const s = summariseBookings([booked("A", "T1"), booked("B", "T2")]);
    assert.equal(s.ok, true);
    assert.deepEqual(s.trackingIds, ["T1", "T2"]);
  });
  it("counts already-booked orders as ok and keeps their id", () => {
    const s = summariseBookings([
      { orderId: "A", orderCode: "A", status: "already-booked", trackingId: "T0" },
      booked("B", "T2"),
    ]);
    assert.equal(s.ok, true);
    assert.deepEqual(s.trackingIds, ["T0", "T2"]);
  });
  it("is not ok when any order failed, and does not list ids of failed orders", () => {
    const s = summariseBookings([
      booked("A", "T1"),
      { orderId: "B", orderCode: "B", status: "failed", error: "boom", trackingId: "T9" },
    ]);
    assert.equal(s.ok, false);
    assert.deepEqual(s.trackingIds, ["T1"]);
    assert.equal(s.failures.length, 1);
  });
  it("removes duplicate tracking ids", () => {
    assert.deepEqual(summariseBookings([booked("A", "T1"), booked("B", "T1")]).trackingIds, ["T1"]);
  });
});

describe("formatBookingFailure", () => {
  it("names each failed order and what was booked", () => {
    const msg = formatBookingFailure([
      booked("A", "T1"),
      { orderId: "B", orderCode: "B", status: "failed", error: "no valid recipient phone number" },
      { orderId: "C", orderCode: "C", status: "failed", error: "order not found" },
    ]);
    assert.match(msg, /failed for 2 of 3 order/);
    assert.match(msg, /- B: no valid recipient phone number/);
    assert.match(msg, /- C: order not found/);
    assert.match(msg, /Booked OK: T1/);
  });
  it("warns when NCM holds a parcel that was not saved", () => {
    const msg = formatBookingFailure([
      { orderId: "B", orderCode: "B", status: "failed", error: "db down", trackingId: "T7" },
    ]);
    assert.match(msg, /NCM already holds parcel T7/);
  });
});
