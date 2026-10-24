import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import axios, { AxiosError } from "axios";
import { NcmService } from "./ncm.service";
import { ncmFullfillmentHandler } from "../fulfilment/handler";

const OK = { data: { orderid: "", Message: "Order Successfully Created" } };

function makeOrder(id: number, over: Record<string, any> = {}) {
  return {
    id,
    code: `T${id}`,
    currencyCode: "USD",
    totalWithTax: 14000, // $140 = NPR 19600 at rate 140
    customer: { firstName: "Asha", lastName: "K", phoneNumber: "" },
    payments: [],
    shippingLines: [{ shippingMethod: { code: "ncm" } }],
    shippingAddress: {
      fullName: "Ram Sharma",
      streetLine1: "Ward 4",
      city: "Pokhara",
      countryCode: "NP",
      phoneNumber: "9841234567",
    },
    customFields: { destinationBranch: "POKHARA" },
    ...over,
  };
}

function makeService(orders: any[]) {
  const store = new Map(orders.map((o) => [String(o.id), o]));
  const updates: { id: unknown; data: any }[] = [];
  const repo = {
    findOne: async ({ where }: any) => store.get(String(where.id)) ?? null,
    update: async (id: unknown, data: any) => {
      updates.push({ id, data });
      const o = store.get(String(id));
      if (o) o.customFields = { ...o.customFields, ...data.customFields };
    },
  };
  const connection: any = { getRepository: () => repo };
  const settings: any = {
    getSettings: async () => ({
      customFields: { nprEquivalentToUsd: 140, nprEquvalentToAud: 92 },
    }),
  };
  const service = new NcmService(connection, settings);
  // No network: skip nearest-branch lookup, orders already carry a destination.
  service.enrichOrderShippingMeta = async () => {};
  const ctx: any = {
    channel: { customFields: { ncmApiKey: "key", ncmCreationBranch: "KTM" } },
    channelId: 1,
  };
  return { service, ctx, updates, store };
}

describe("NcmService.createDelivery", () => {
  let post: ReturnType<typeof mock.method>;
  let counter: number;

  beforeEach(() => {
    counter = 0;
    post = mock.method(axios, "post", async () => ({
      data: { orderid: `TRK${++counter}`, Message: "Order Successfully Created" },
    })) as any;
  });
  afterEach(() => mock.restoreAll());

  it("books every order, not just the first", async () => {
    const { service, ctx, updates } = makeService([makeOrder(1), makeOrder(2), makeOrder(3)]);
    const res = await service.createDelivery(ctx, [1, 2, 3]);
    assert.equal(post.mock.callCount(), 3);
    assert.deepEqual(res.booked.map((b) => b.trackingId), ["TRK1", "TRK2", "TRK3"]);
    assert.equal(res.failed.length, 0);
    assert.equal(updates.length, 3);
    assert.deepEqual(updates[1].data, { customFields: { ncmTrackingId: "TRK2" } });
  });

  it("keeps going when one order fails and reports why", async () => {
    let call = 0;
    post.mock.mockImplementation(async () => {
      call++;
      if (call === 2) {
        throw new AxiosError("bad", "ERR_BAD_RESPONSE", undefined, undefined, {
          status: 502,
          data: { Message: "Branch closed" },
        } as any);
      }
      return { data: { orderid: `TRK${call}`, Message: "Order Successfully Created" } };
    });
    const { service, ctx } = makeService([makeOrder(1), makeOrder(2), makeOrder(3)]);
    const res = await service.createDelivery(ctx, [1, 2, 3]);
    assert.deepEqual(res.booked.map((b) => b.orderCode), ["T1", "T3"]);
    assert.equal(res.failed.length, 1);
    assert.equal(res.failed[0].orderCode, "T2");
    assert.match(res.failed[0].reason, /502.*Branch closed/);
  });

  it("treats an unexpected NCM reply as a failure", async () => {
    post.mock.mockImplementation(async () => ({ data: { Message: "Nope" } }));
    const { service, ctx, updates } = makeService([makeOrder(1)]);
    const res = await service.createDelivery(ctx, [1]);
    assert.equal(res.booked.length, 0);
    assert.match(res.failed[0].reason, /Nope/);
    assert.equal(updates.length, 0);
  });

  it("never books an order that already has a tracking id", async () => {
    const { service, ctx } = makeService([
      makeOrder(1, { customFields: { destinationBranch: "X", ncmTrackingId: "OLD9" } }),
      makeOrder(2),
    ]);
    const res = await service.createDelivery(ctx, [1, 2]);
    assert.equal(post.mock.callCount(), 1);
    assert.equal(res.booked[0].trackingId, "OLD9");
    assert.equal(res.booked[0].alreadyBooked, true);
    assert.equal(res.booked[1].trackingId, "TRK1");
  });

  it("books a repeated id only once", async () => {
    const { service, ctx } = makeService([makeOrder(1)]);
    const res = await service.createDelivery(ctx, [1, 1, "1" as any]);
    assert.equal(post.mock.callCount(), 1);
    assert.equal(res.booked.length, 1);
  });

  it("does not double-book when the same order is submitted twice at once", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    post.mock.mockImplementation(async () => {
      await gate;
      return { data: { orderid: "TRK-A", Message: "Order Successfully Created" } };
    });
    const { service, ctx } = makeService([makeOrder(1)]);
    const first = service.createDelivery(ctx, [1]);
    await new Promise((r) => setTimeout(r, 20));
    const second = await service.createDelivery(ctx, [1]);
    release();
    const firstRes = await first;
    assert.equal(post.mock.callCount(), 1);
    assert.equal(firstRes.booked.length, 1);
    assert.match(second.failed[0].reason, /in progress/);
  });

  it("reports orders it cannot send, without calling NCM", async () => {
    const { service, ctx } = makeService([
      makeOrder(1, { shippingAddress: { ...makeOrder(1).shippingAddress, phoneNumber: "abc" } }),
      makeOrder(2, { shippingLines: [{ shippingMethod: { code: "pickup" } }] }),
      makeOrder(3, { shippingAddress: { ...makeOrder(3).shippingAddress, countryCode: "AU" } }),
      makeOrder(4, { customFields: {} }),
    ]);
    const res = await service.createDelivery(ctx, [1, 2, 3, 4, 99]);
    assert.equal(post.mock.callCount(), 0);
    assert.deepEqual(
      res.failed.map((f) => f.reason),
      [
        "no valid recipient phone number",
        "shipping method is not NCM",
        "shipping address is not a complete Nepal address",
        "no destination branch could be worked out",
        "order not found",
      ]
    );
  });

  it("asks for 0 on prepaid orders and for the NPR total on cash on delivery", async () => {
    const { service, ctx } = makeService([
      makeOrder(1, { payments: [{ method: "stripe", state: "Settled", amount: 14000 }] }),
      makeOrder(2, { payments: [{ method: "cash-on-delivery", state: "Authorized", amount: 14000 }] }),
    ]);
    await service.createDelivery(ctx, [1, 2]);
    assert.equal((post.mock.calls[0].arguments as any[])[1].cod_charge, 0);
    assert.equal((post.mock.calls[1].arguments as any[])[1].cod_charge, 19600);
  });

  it("fails an order whose currency has no exchange rate", async () => {
    const { service, ctx } = makeService([makeOrder(1, { currencyCode: "EUR" })]);
    const res = await service.createDelivery(ctx, [1]);
    assert.equal(post.mock.callCount(), 0);
    assert.match(res.failed[0].reason, /no exchange rate for EUR/);
  });

  it("flags loudly when NCM booked but the id could not be saved", async () => {
    const { service, ctx } = makeService([makeOrder(1)]);
    (service as any).connection = {
      getRepository: () => ({
        findOne: async () => makeOrder(1),
        update: async () => {
          throw new Error("db down");
        },
      }),
    };
    const res = await service.createDelivery(ctx, [1]);
    assert.equal(res.booked.length, 0);
    assert.match(res.failed[0].reason, /TRK1.*do NOT retry/);
  });

  it("throws when NCM is not configured for the channel", async () => {
    const { service } = makeService([makeOrder(1)]);
    (service as any).connection.getRepository = () => ({ findOne: async () => null });
    await assert.rejects(
      service.createDelivery({ channel: { customFields: {} }, channelId: 1 } as any, [1]),
      /not configured/
    );
  });
});

describe("ncmFullfillmentHandler", () => {
  const run = async (result: any) => {
    const fake = { createDelivery: async () => result };
    ncmFullfillmentHandler.init({ get: () => fake } as any);
    return (ncmFullfillmentHandler as any).createFulfillment(
      {},
      [{ id: 1 }, { id: 2 }],
      [],
      [] // Vendure passes the configured args as an array
    );
  };

  it("returns all tracking ids when every order is booked", async () => {
    const out = await run({
      booked: [
        { orderCode: "T1", trackingId: "A1", alreadyBooked: false },
        { orderCode: "T2", trackingId: "A2", alreadyBooked: true },
      ],
      failed: [],
    });
    assert.deepEqual(out, { method: "ncm", trackingCode: "A1, A2" });
  });

  it("refuses to create a fulfillment if any order failed", async () => {
    await assert.rejects(
      run({
        booked: [{ orderCode: "T1", trackingId: "A1", alreadyBooked: false }],
        failed: [{ orderId: 2, orderCode: "T2", reason: "timeout" }],
      }),
      /failed for 1 of 2.*T2 \(timeout\).*T1 -> A1/
    );
  });
});
