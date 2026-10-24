import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shippingMethodsForEnv } from "./seed-shipping.util";

const demo = [
  { name: "Standard Shipping", price: 500 },
  { name: "Express Shipping", price: 1000 },
];

describe("shippingMethodsForEnv", () => {
  it("keeps the demo methods when APP_ENV is dev", () => {
    assert.deepEqual(shippingMethodsForEnv(demo, "dev"), demo);
    assert.deepEqual(shippingMethodsForEnv(demo, " DEV "), demo);
  });
  it("seeds none in production, staging, empty or unset", () => {
    for (const env of ["prod", "production", "staging", "test", "", undefined]) {
      assert.deepEqual(shippingMethodsForEnv(demo, env), [], String(env));
    }
  });
  it("returns a copy, and copes with a missing list", () => {
    assert.notEqual(shippingMethodsForEnv(demo, "dev"), demo);
    assert.deepEqual(shippingMethodsForEnv(undefined, "dev"), []);
  });
});
