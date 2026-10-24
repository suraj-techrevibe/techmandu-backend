import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildWorkbenchRow, WorkbenchOrderLike } from "./workbench.util";

const rates = { USD: 140, AUD: 92 };

const base = (over: Partial<WorkbenchOrderLike> = {}): WorkbenchOrderLike => ({
  id: 5,
  code: "T5",
  currencyCode: "USD",
  totalWithTax: 14000,
  orderPlacedAt: "2026-10-20T01:00:00.000Z",
  customer: { firstName: "Asha", lastName: "K" },
  shippingAddress: { fullName: "Ram Sharma", phoneNumber: "+977 9841234567" },
  payments: [],
  customFields: { destinationBranch: "POKHARA" },
  ...over,
});

describe("buildWorkbenchRow", () => {
  it("shows a clean cash-on-delivery order as bookable", () => {
    const row = buildWorkbenchRow(
      base({ payments: [{ method: "cash-on-delivery", state: "Authorized", amount: 14000 }] }),
      { rates, addressOk: true }
    );
    assert.equal(row.canBook, true);
    assert.equal(row.cashToCollectNpr, 19600);
    assert.equal(row.recipientPhone, "9841234567");
    assert.equal(row.phoneValid, true);
    assert.equal(row.destination, "POKHARA");
    assert.equal(row.customerName, "Asha K");
  });

  it("shows 0 cash to collect for a prepaid order", () => {
    const row = buildWorkbenchRow(
      base({ payments: [{ method: "stripe", state: "Settled", amount: 14000 }] }),
      { rates, addressOk: true }
    );
    assert.equal(row.cashToCollectNpr, 0);
    assert.equal(row.canBook, true);
  });

  it("flags a bad phone and blocks booking", () => {
    const row = buildWorkbenchRow(
      base({ shippingAddress: { fullName: "R", phoneNumber: "12" } }),
      { rates, addressOk: true }
    );
    assert.equal(row.phoneValid, false);
    assert.equal(row.recipientPhone, "12");
    assert.deepEqual(row.problems, ["No valid recipient phone"]);
    assert.equal(row.canBook, false);
  });

  it("flags a bad address and a missing exchange rate", () => {
    const row = buildWorkbenchRow(base({ currencyCode: "EUR" }), { rates, addressOk: false });
    assert.equal(row.cashToCollectNpr, null);
    assert.deepEqual(row.problems, ["Not a complete Nepal address", "No exchange rate for EUR"]);
  });

  it("is not bookable once it has a tracking id, and keeps the id", () => {
    const row = buildWorkbenchRow(
      base({ customFields: { ncmTrackingId: " TRK9 ", nearestNcmBranch: "BIRGUNJ" } }),
      { rates, addressOk: true }
    );
    assert.equal(row.ncmTrackingId, "TRK9");
    assert.equal(row.canBook, false);
    assert.equal(row.destination, "BIRGUNJ");
  });

  it("copes with missing optional data", () => {
    const row = buildWorkbenchRow(
      { id: 1, code: "X", currencyCode: "USD", totalWithTax: 0 },
      { rates, addressOk: false }
    );
    assert.equal(row.customerName, null);
    assert.equal(row.placedAt, null);
    assert.equal(row.recipientName, null);
    assert.equal(row.destination, null);
  });
});
