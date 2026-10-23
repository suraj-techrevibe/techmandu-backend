import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  codAmountNpr,
  isValleyAddress,
  normaliseNepalPhone,
  nprToMinorUnits,
  parseAreaList,
  parseRingRoadZone,
  resolveNepalProvince,
} from "./shipping-price.util";

const rates = { USD: 140, AUD: 92 };

describe("nprToMinorUnits", () => {
  it("keeps NPR as paisa", () => {
    assert.equal(nprToMinorUnits(70, "NPR", rates), 7000);
  });
  it("converts to USD cents", () => {
    assert.equal(nprToMinorUnits(140, "USD", rates), 100);
    assert.equal(nprToMinorUnits(70, "USD", rates), 50);
  });
  it("converts to AUD cents", () => {
    assert.equal(nprToMinorUnits(92, "AUD", rates), 100);
  });
  it("is case-insensitive", () => {
    assert.equal(nprToMinorUnits(140, "usd", rates), 100);
  });
  it("returns undefined for a missing, zero or invalid rate", () => {
    assert.equal(nprToMinorUnits(70, "USD", {}), undefined);
    assert.equal(nprToMinorUnits(70, "USD", { USD: 0 }), undefined);
    assert.equal(nprToMinorUnits(70, "USD", { USD: Number.NaN }), undefined);
    assert.equal(nprToMinorUnits(70, "AUD", { USD: 140 }), undefined);
  });
  it("returns undefined for an unsupported currency or bad amount", () => {
    assert.equal(nprToMinorUnits(70, "EUR", rates), undefined);
    assert.equal(nprToMinorUnits(-1, "NPR", rates), undefined);
  });
});

describe("parseRingRoadZone", () => {
  it("reads the legacy machine values", () => {
    assert.equal(parseRingRoadZone({ streetLine2: "inside_ring_road" }), "inside");
    assert.equal(parseRingRoadZone({ streetLine2: "outside_ring_road" }), "outside");
  });
  it("reads plain text from either street line", () => {
    assert.equal(parseRingRoadZone({ streetLine2: "Outside Ring Road, Koteshwor" }), "outside");
    assert.equal(parseRingRoadZone({ streetLine1: "Inside the ring road" }), "inside");
  });
  it("does not guess when nothing is stated", () => {
    assert.equal(parseRingRoadZone({ streetLine2: "Near Bhatbhateni" }), undefined);
    assert.equal(parseRingRoadZone(undefined), undefined);
  });
});

describe("isValleyAddress", () => {
  it("matches Valley cities", () => {
    for (const city of ["Kathmandu", "Lalitpur", "Bhaktapur", "Kathmandu Metropolitan City", "Kirtipur"]) {
      assert.equal(isValleyAddress({ city }), true, city);
    }
  });
  it("rejects cities outside the Valley, even with a Valley word in the street", () => {
    assert.equal(isValleyAddress({ city: "Pokhara", streetLine1: "Kathmandu Road" }), false);
    assert.equal(isValleyAddress({ city: "Biratnagar" }), false);
  });
  it("falls back to the street lines when the city is empty", () => {
    assert.equal(isValleyAddress({ city: "", streetLine1: "New Baneshwor" }), true);
  });
  it("supports admin-added areas", () => {
    assert.equal(isValleyAddress({ city: "Sunakothi" }), false);
    assert.equal(isValleyAddress({ city: "Sunakothi" }, ["sunakothi"]), true);
  });
  it("is false without an address", () => {
    assert.equal(isValleyAddress(null), false);
  });
});

describe("parseAreaList", () => {
  it("splits and trims", () => {
    assert.deepEqual(parseAreaList(" Sunakothi, Dhapasi ,,"), ["Sunakothi", "Dhapasi"]);
    assert.deepEqual(parseAreaList(undefined), []);
  });
});

describe("codAmountNpr", () => {
  const paid = (method: string, amount: number, state = "Settled") => ({ method, state, amount });

  it("is 0 for a prepaid card order, even in USD", () => {
    assert.equal(codAmountNpr(14000, "USD", [paid("stripe", 14000)], rates), 0);
  });
  it("is 0 for a settled QR or Khalti payment in NPR", () => {
    assert.equal(codAmountNpr(500000, "NPR", [paid("qr-payment", 500000)], rates), 0);
    assert.equal(codAmountNpr(500000, "NPR", [paid("khalti", 500000, "Authorized")], rates), 0);
  });
  it("charges the full total for cash on delivery, in whole rupees", () => {
    assert.equal(codAmountNpr(123450, "NPR", [paid("cash-on-delivery", 123450, "Authorized")], rates), 1235);
    assert.equal(codAmountNpr(123450, "NPR", [], rates), 1235);
  });
  it("charges only the unpaid remainder", () => {
    assert.equal(codAmountNpr(100000, "NPR", [paid("khalti", 60000)], rates), 400);
  });
  it("ignores declined and cancelled payments", () => {
    assert.equal(codAmountNpr(100000, "NPR", [paid("khalti", 100000, "Declined")], rates), 1000);
  });
  it("converts a USD remainder to NPR with the rate", () => {
    assert.equal(codAmountNpr(1000, "USD", [], rates), 1400);
  });
  it("returns undefined for a foreign remainder without a rate", () => {
    assert.equal(codAmountNpr(1000, "USD", [], {}), undefined);
  });
});

describe("normaliseNepalPhone", () => {
  it("strips the country code and punctuation", () => {
    assert.equal(normaliseNepalPhone("+977 98-4123 4567"), "9841234567");
    assert.equal(normaliseNepalPhone("977 9841234567"), "9841234567");
    assert.equal(normaliseNepalPhone("(984) 1234567"), "9841234567");
  });
  it("keeps landline numbers", () => {
    assert.equal(normaliseNepalPhone("01-4412345"), "014412345");
  });
  it("returns undefined for empty or too short input", () => {
    assert.equal(normaliseNepalPhone(""), undefined);
    assert.equal(normaliseNepalPhone(undefined), undefined);
    assert.equal(normaliseNepalPhone("12345"), undefined);
  });
});


describe("resolveNepalProvince", () => {
  it("recognises current province names and legacy numbered names", () => {
    assert.equal(resolveNepalProvince("Koshi Province"), "koshi");
    assert.equal(resolveNepalProvince("Province 1"), "koshi");
    assert.equal(resolveNepalProvince("Madhesh"), "madhesh");
    assert.equal(resolveNepalProvince("Bagmati Province"), "bagmati");
    assert.equal(resolveNepalProvince("Province 4"), "gandaki");
    assert.equal(resolveNepalProvince("Lumbini"), "lumbini");
    assert.equal(resolveNepalProvince("Karnali Province"), "karnali");
    assert.equal(resolveNepalProvince("Sudurpashchim Province"), "sudurpashchim");
  });

  it("does not guess a province from a city or blank value", () => {
    assert.equal(resolveNepalProvince("Pokhara"), undefined);
    assert.equal(resolveNepalProvince(""), undefined);
    assert.equal(resolveNepalProvince(undefined), undefined);
  });
});
