import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAccessOrder } from "./order-access.util";

const owned = { customer: { user: { id: 7 } } };

describe("canAccessOrder", () => {
  it("allows the caller's own active order, even as a guest", () => {
    assert.equal(canAccessOrder({ orderId: "12", activeOrderId: 12 }), true);
  });
  it("allows a logged-in customer to reach their own finished order", () => {
    assert.equal(canAccessOrder({ orderId: 5, activeUserId: "7", order: owned }), true);
  });
  it("refuses someone else's order", () => {
    assert.equal(canAccessOrder({ orderId: 5, activeOrderId: 9, activeUserId: 8, order: owned }), false);
  });
  it("refuses anonymous callers with no matching active order", () => {
    assert.equal(canAccessOrder({ orderId: 5, order: owned }), false);
    assert.equal(canAccessOrder({ orderId: 5, activeOrderId: 6 }), false);
  });
  it("refuses unknown orders and orders with no customer", () => {
    assert.equal(canAccessOrder({ orderId: 5, activeUserId: 7, order: null }), false);
    assert.equal(canAccessOrder({ orderId: 5, activeUserId: 7, order: {} }), false);
  });
});
