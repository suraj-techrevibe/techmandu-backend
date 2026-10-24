import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import axios from "axios";
import { NcmService } from "./ncm.service";
import { summariseBookings } from "../util/booking-report.util";

/**
 * Exercises the real NcmService.createDelivery with axios mocked and an in-memory stand-in
 * for the order repository. Nothing here touches the network or a database.
 */

interface FakeOrder {
  id: string;
  code: string;
  currencyCode: string;
  totalWithTax: number;
  customFields: Record<string, any>;
  shippingAddress: Record<string, any>;
  shippingLines: { shippingMethod: { code: string } }[];
  customer: Record<string, any>;
  payments: { method: string; state: string; amount: number }[];
}

const makeOrder = (id: string, overrides: Partial<FakeOrder> = {}): FakeOrder => ({
  id,
  code: `ORD-${id}`,
  currencyCode: "NPR",
  totalWithTax: 250000, // NPR 2,500 in paisa
  customFields: { destinationBranch: "POKHARA" },
  shippingAddress: {
    fullName: `Recipient ${id}`,
    streetLine1: "Lakeside",
    city: "Pokhara",
    province: "Gandaki",
    countryCode: "NP",
    phoneNumber: "+977 9841234567",
  },
  shippingLines: [{ shippingMethod: { code: "ncm" } }],
  customer: { firstName: "Buyer", lastName: "Abroad", phoneNumber: "" },
  payments: [{ method: "cash-on-delivery", state: "Authorized", amount: 250000 }],
  ...overrides,
});

function setup(orders: FakeOrder[]) {
  const store = new Map(orders.map((o) => [o.id, o]));
  const updates: { id: string; value: any }[] = [];
  const repo = {
    findOne: async ({ where }: any) => store.get(String(where.id)) ?? null,
    update: async (id: string, value: any) => {
      updates.push({ id, value });
      const order = store.get(String(id));
      if (order) order.customFields = { ...order.customFields, ...value.customFields };
    },
  };
  const connection = { getRepository: () => repo };
  const settings = { getSettings: async () => ({ customFields: { nprEquivalentToUsd: 140, nprEquvalentToAud: 92 } }) };
  const service = new NcmService(connection as any, settings as any);
  // Branch matching calls a geocoder. The orders above already carry a destination branch.
  mock.method(service, "enrichOrderShippingMeta", async () => undefined);
  const ctx = { channel: { customFields: { ncmApiKey: "KEY", ncmCreationBranch: "TINKUNE" } } } as any;
  return { service, ctx, store, updates };
}

describe("NcmService.createDelivery", () => {
  let post: ReturnType<typeof mock.method>;
  let nextId = 1000;

  beforeEach(() => {
    nextId = 1000;
    post = mock.method(axios, "post", async (_url: string, body: any) => ({
      data: { orderid: ++nextId, Message: "Order Successfully Created", echoed: body },
    }));
  });
  afterEach(() => mock.restoreAll());

  it("books every order, not just the first, and returns every tracking id", async () => {
    const { service, ctx, store } = setup([makeOrder("1"), makeOrder("2"), makeOrder("3")]);
    const results = await service.createDelivery(ctx, ["1", "2", "3"]);

    assert.equal(post.mock.callCount(), 3);
    assert.deepEqual(summariseBookings(results).trackingIds, ["1001", "1002", "1003"]);
    assert.equal(store.get("2")!.customFields.ncmTrackingId, "1002");
    assert.ok(results.every((r) => r.status === "booked"));
  });

  it("sends the vref_id, a cleaned phone number and COD 0 for prepaid orders", async () => {
    const prepaid = makeOrder("5", { payments: [{ method: "stripe", state: "Settled", amount: 250000 }] });
    const { service, ctx } = setup([prepaid]);
    await service.createDelivery(ctx, ["5"]);

    const body = post.mock.calls[0].arguments[1] as any;
    assert.equal(body.vref_id, "5");
    assert.equal(body.phone, "9841234567");
    assert.equal(body.cod_charge, 0);
    assert.equal(body.branch, "POKHARA");
    assert.equal(body.fbranch, "TINKUNE");
  });

  it("reports a failing order by name and still books the others", async () => {
    const noPhone = makeOrder("2");
    noPhone.shippingAddress.phoneNumber = "default";
    const { service, ctx } = setup([makeOrder("1"), noPhone, makeOrder("3")]);
    const results = await service.createDelivery(ctx, ["1", "2", "3"]);

    assert.equal(post.mock.callCount(), 2);
    assert.deepEqual(results.map((r) => r.status), ["booked", "failed", "booked"]);
    assert.match(results[1].error!, /phone number/);
    assert.equal(results[1].orderCode, "ORD-2");
  });

  it("reports an NCM API error for that order only", async () => {
    post.mock.mockImplementationOnce(async () => {
      throw Object.assign(new Error("Request failed with status code 500"), {
        isAxiosError: true,
        response: { status: 500, data: { detail: "NCM is down" } },
      });
    });
    const { service, ctx } = setup([makeOrder("1"), makeOrder("2")]);
    const results = await service.createDelivery(ctx, ["1", "2"]);

    assert.equal(results[0].status, "failed");
    assert.match(results[0].error!, /500.*NCM is down/);
    assert.equal(results[1].status, "booked");
  });

  it("treats a 200 reply without the success message as a failure", async () => {
    post.mock.mockImplementationOnce(async () => ({ data: { Message: "Branch not found" } }));
    const { service, ctx, updates } = setup([makeOrder("1")]);
    const results = await service.createDelivery(ctx, ["1"]);

    assert.equal(results[0].status, "failed");
    assert.match(results[0].error!, /Branch not found/);
    assert.equal(updates.length, 0);
  });

  it("never books the same order twice: already-booked orders are skipped", async () => {
    const done = makeOrder("1");
    done.customFields.ncmTrackingId = "EXISTING-9";
    const { service, ctx } = setup([done, makeOrder("2")]);
    const results = await service.createDelivery(ctx, ["1", "2"]);

    assert.equal(post.mock.callCount(), 1);
    assert.equal(results[0].status, "already-booked");
    assert.equal(results[0].trackingId, "EXISTING-9");
    assert.deepEqual(summariseBookings(results).trackingIds, ["EXISTING-9", "1001"]);
  });

  it("running the same fulfillment again books nothing new", async () => {
    const { service, ctx } = setup([makeOrder("1"), makeOrder("2")]);
    await service.createDelivery(ctx, ["1", "2"]);
    post.mock.resetCalls();
    const second = await service.createDelivery(ctx, ["1", "2"]);

    assert.equal(post.mock.callCount(), 0);
    assert.ok(second.every((r) => r.status === "already-booked"));
  });

  it("ignores a repeated id in the same request", async () => {
    const { service, ctx } = setup([makeOrder("1")]);
    const results = await service.createDelivery(ctx, ["1", "1", 1 as any]);

    assert.equal(post.mock.callCount(), 1);
    assert.equal(results.length, 1);
  });

  it("two simultaneous requests for one order book it once", async () => {
    post.mock.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return { data: { orderid: 4242, Message: "Order Successfully Created" } };
    });
    const { service, ctx } = setup([makeOrder("1")]);
    const [a, b] = await Promise.all([service.createDelivery(ctx, ["1"]), service.createDelivery(ctx, ["1"])]);

    assert.equal(post.mock.callCount(), 1);
    const statuses = [a[0].status, b[0].status].sort();
    assert.deepEqual(statuses, ["booked", "failed"]);
  });

  it("flags an order NCM accepted but we could not save, with its tracking id", async () => {
    const { service, ctx } = setup([makeOrder("1")]);
    (service as any).connection.getRepository = () => ({
      findOne: async () => makeOrder("1"),
      update: async () => {
        throw new Error("db down");
      },
    });
    const results = await service.createDelivery(ctx, ["1"]);

    assert.equal(results[0].status, "failed");
    assert.equal(results[0].trackingId, "1001");
    assert.match(results[0].error!, /booked at NCM but not saved/);
  });

  it("fails clearly for orders that are not NCM or not in Nepal, or unknown", async () => {
    const pickup = makeOrder("1", { shippingLines: [{ shippingMethod: { code: "store-pickup" } }] });
    const abroad = makeOrder("2");
    abroad.shippingAddress.countryCode = "AU";
    const { service, ctx } = setup([pickup, abroad]);
    const results = await service.createDelivery(ctx, ["1", "2", "99"]);

    assert.equal(post.mock.callCount(), 0);
    assert.match(results[0].error!, /not NCM/);
    assert.match(results[1].error!, /Nepal address/);
    assert.match(results[2].error!, /not found/);
  });

  it("fails when COD cannot be converted because the exchange rate is missing", async () => {
    const usd = makeOrder("1", { currencyCode: "USD" });
    const { service, ctx } = setup([usd]);
    (service as any).settingsService.getSettings = async () => ({ customFields: {} });
    const results = await service.createDelivery(ctx, ["1"]);

    assert.equal(results[0].status, "failed");
    assert.match(results[0].error!, /exchange rate for USD/);
  });

  it("throws when NCM is not configured for the channel", async () => {
    const { service } = setup([makeOrder("1")]);
    (service as any).connection.getRepository = () => ({ findOne: async () => null });
    await assert.rejects(
      service.createDelivery({ channelId: 1, channel: { customFields: {} } } as any, ["1"]),
      /not configured/
    );
  });
});
