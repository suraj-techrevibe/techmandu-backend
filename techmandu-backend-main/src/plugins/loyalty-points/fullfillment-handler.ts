// daraz-fulfillment.handler.ts
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import {
  FulfillmentHandler,
  LanguageCode,
  RequestContext,
  Order,
  ID,
  TransactionalConnection,
  OrderLine as CoreOrderLine,
} from '@vendure/core';
import { In } from 'typeorm';

/** ───────────────── ENV ───────────────── **/
const DARAZ_APP_KEY = process.env.DARAZ_APP_KEY!;
const DARAZ_APP_SECRET = process.env.DARAZ_APP_SECRET!;
const DARAZ_API_URL = process.env.DARAZ_API_URL ?? 'https://api.daraz.com.np/rest';
const DARAZ_ACCESS_TOKEN = process.env.DARAZ_ACCESS_TOKEN || '';

if (!DARAZ_APP_KEY || !DARAZ_APP_SECRET) {
  throw new Error('Missing DARAZ_APP_KEY or DARAZ_APP_SECRET');
}

/** ─────────── EPIS types (required fields aligned with docs) ─────────── **/
type EpisItem = {
  unitPrice: string;                                // required (string)
  quantity: number;                                 // required (number)
  dimWeight: { length: string; width: string; height: string; weight: string }; // optional in docs, we send it
  name: string;                                     // required
  id?: string;
  sku?: string;
  category?: string;
  paidPrice: string;                                // required
};

type EpisContact = {
  name: string;                                     // required
  phone: string;                                    // required
  email?: string;
  address: {
    details: string;                                // required
    type?: string;
    city?: string;
    id?: string;
  };
  geoLocation?: { latitude: string; longitude: string };
};

type EpisPayment = {
  totalAmount: string;                              // required
  insuranceAmount?: string;
  currency: string;                                 // required (e.g., NPR)
  paymentType: 'COD' | 'NON-COD';                   // required
};

type EpisDimWeight = { length: string; width: string; height: string; weight: string }; // package-level required

type CreatePackagePayload = {
  packageType?: 'Sales_order' | 'Customer_return';
  externalOrderId: string;                          // required
  platformOrderCreationTime?: number;               // ms
  dangerousGood: boolean;                           // required
  items: EpisItem[];                                // required
  shipper: {
    externalSellerId: string;                       // required
    platformName?: string;
    externalWarehouseCode?: string;
    warehouseName?: string;
  };
  origin: EpisContact;                              // required
  destination: EpisContact;                         // required
  payment: EpisPayment;                             // required
  dimWeight: EpisDimWeight;                         // required
  options?: Record<string, any>;
  deliveryOption: 'standard' | 'economy';           // required
};

/** ─────────── Vendure-shaped helpers ─────────── **/
type OrderAddress = {
  fullName?: string | null;
  company?: string | null;
  streetLine1?: string | null;
  streetLine2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  phoneNumber?: string | null;
  emailAddress?: string | null;
};

function nonEmpty(s?: string | null) {
  return typeof s === 'string' && s.trim().length > 0;
}
function safePhone(p?: string | null) {
  return nonEmpty(p) ? String(p).trim() : '0000000000';
}
function safeEmail(e?: string | null) {
  return nonEmpty(e) ? String(e).trim() : 'no-reply@example.com';
}
function addressToContact(addr: OrderAddress, fallbackName: string): EpisContact {
  const details = [addr.streetLine1, addr.streetLine2, addr.postalCode, addr.city, addr.province]
    .filter(Boolean)
    .join(', ')
    .trim();

  const name =
    [addr.fullName, addr.company].filter(Boolean).join(' ').trim() ||
    fallbackName ||
    'Unknown';

  return {
    name,
    phone: safePhone(addr.phoneNumber),
    email: safeEmail(addr.emailAddress),
    address: {
      details: details || (addr.city ?? 'Unknown'),
      type: 'home',
      city: addr.city ?? undefined,
    },
  };
}

function toStr(n: number | string | undefined | null, fallback: string): string {
  if (n === undefined || n === null) return fallback;
  return String(n);
}

/** Vendure passes OrderLineInput[] to createFulfillment */
type OrderLineInput = { orderLineId: ID; quantity: number };
type SelectedLine = { line: any; qty: number };

/** Load actual OrderLine rows (with relations) for the IDs we received */
async function loadSelectedLines(
  ctx: RequestContext,
  connection: TransactionalConnection,
  order: Order,
  inputs: OrderLineInput[],
): Promise<SelectedLine[]> {
  const qtyById = new Map<string, number>(inputs.map(i => [String(i.orderLineId), Number(i.quantity)]));
  const ids = [...qtyById.keys()];
  if (ids.length === 0) return [];

  const dbLines = await connection.getRepository(ctx, CoreOrderLine).find({
    where: { id: In(ids as any) },
    relations: { productVariant: { product: true } } as any,
  });

  // Keep only lines that belong to this order and have a positive requested qty
  return dbLines
    .filter(l => String((l as any).orderId ?? (l as any).order?.id ?? order.id) === String(order.id))
    .map(l => ({ line: l as any, qty: qtyById.get(String((l as any).id))! }))
    .filter(s => s.qty > 0);
}

/** Build EPIS items honoring required fields */
function buildEpisItems(selected: SelectedLine[]): EpisItem[] {
  return selected.map(({ line, qty }) => {
    const pv: any = line.productVariant;
    const p: any = pv?.product;

    // Daraz requires strings for unitPrice/paidPrice (unitPrice = excluding vouchers; paidPrice = actual charged)
    const unitPrice = Math.round(line.unitPrice ?? 0);
    const unitPriceWithTax = Math.round(line.unitPriceWithTax ?? unitPrice);
    const paidPrice = unitPriceWithTax * qty;

    const name: string = (pv?.name ?? p?.name ?? `Item ${line.id}`).toString().trim();
    if (!name) {
      throw new Error('EPIS validation: item.name must not be blank');
    }

    // Daraz units: length/width/height in cm, weight in grams
    const lengthCm = pv?.customFields?.length ?? 20;
    const widthCm = pv?.customFields?.width ?? 20;
    const heightCm = pv?.customFields?.height ?? 10;
    const weightG = pv?.weight ?? 1;

    return {
      unitPrice: toStr(unitPrice, '0'),
      quantity: qty,
      dimWeight: {
        length: toStr(lengthCm, '1'),
        width: toStr(widthCm, '1'),
        height: toStr(heightCm, '1'),
        weight: toStr(weightG, '1'),
      },
      name,
      id: String(pv?.id ?? line.id),
      sku: pv?.sku ? String(pv.sku) : undefined,
      category: p?.facetValues?.[0]?.name ?? 'General',
      paidPrice: toStr(paidPrice, '0'),
    };
  });
}

/** Package-level dimWeight (required by Daraz) */
function buildPackageDimWeight(selected: SelectedLine[]): EpisDimWeight {
  const totalWeightG = selected.reduce((sum, { line, qty }) => {
    const pv: any = line.productVariant;
    const w = pv?.weight ?? 0;
    return sum + (Number(w) * qty || 0);
  }, 0);

  return {
    length: '20',
    width: '20',
    height: '10',
    weight: toStr(Math.max(1, Math.ceil(totalWeightG || 1)), '1'),
  };
}

/** ─────────── Daraz/Lazada Open Platform signature ─────────── **/
function darazSign(path: string, params: Record<string, any>, appSecret: string): string {
  const keys = Object.keys(params).sort();
  const concatenated = keys.map(k => `${k}${params[k]}`).join('');
  const base = `${path}${concatenated}`;
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(base, 'utf8');
  return hmac.digest('hex').toUpperCase();
}

/** ─────────── Daraz EPIS Client ─────────── **/
class DarazClient {
  private http: AxiosInstance;

  constructor(
    private baseUrl: string,
    private appKey: string,
    private appSecret: string,
    private accessToken?: string,
  ) {
    this.http = axios.create({ baseURL: baseUrl, timeout: 15000 });
  }

  private buildSignedParams(path: string, apiParams: Record<string, any>) {
    const sysParams: Record<string, any> = {
      app_key: this.appKey,
      sign_method: 'sha256',
      timestamp: Date.now(),
      ...(this.accessToken ? { access_token: this.accessToken } : {}),
    };
    const all = { ...apiParams, ...sysParams };
    const sign = darazSign(path, all, this.appSecret);
    return { ...all, sign };
  }

  async createPackage(payload: CreatePackagePayload) {
    const path = '/logistics/epis/packages';
    const params = this.buildSignedParams(path, {
      packageType: payload.packageType ?? 'Sales_order',
      externalOrderId: payload.externalOrderId,
      platformOrderCreationTime: payload.platformOrderCreationTime ?? Date.now(),
      dangerousGood: String(payload.dangerousGood),
      items: JSON.stringify(payload.items),
      shipper: JSON.stringify(payload.shipper),
      origin: JSON.stringify(payload.origin),
      destination: JSON.stringify(payload.destination),
      payment: JSON.stringify(payload.payment),
      dimWeight: JSON.stringify(payload.dimWeight),
      options: JSON.stringify(payload.options ?? {}),
      deliveryOption: payload.deliveryOption,
    });

    const body = new URLSearchParams(params as any).toString();
    const res = await this.http.post(path, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  }

  async cancelPackage(packageCode: string) {
    const path = '/logistics/epis/packages/cancel';
    const apiParams = { packageCode };
    const params = this.buildSignedParams(path, apiParams);
    const res = await this.http.post(path, new URLSearchParams(params as any).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  }
}

/** ─────────── Fulfillment Handler ─────────── **/

type CreateFulfillmentLinesInput = { orderLineId: ID; quantity: number };

let darazClient: DarazClient;
let connection: TransactionalConnection;

export const DarazFulfillmentHandler = new FulfillmentHandler({
  code: 'daraz-epis',
  description: [{ languageCode: LanguageCode.en, value: 'Book shipments & get tracking via Daraz EPIS' }],
  args: {
    deliveryOption: {
      type: 'string',
      defaultValue: "standard",
      ui: { component: 'select-form-input', options: [{ value: 'standard' }, { value: 'economy' }] },
    },
    dangerousGood: { type: 'boolean' },
    warehouseCode: { type: 'string', defaultValue: "BDP-211" },
    externalSellerId: { type: 'string', defaultValue: "123-warehouse" }, // required by Daraz
  },

  /** Grab the DB connection for loading lines */
  init: (injector) => {
    darazClient = new DarazClient(DARAZ_API_URL, DARAZ_APP_KEY, DARAZ_APP_SECRET, DARAZ_ACCESS_TOKEN);
    connection = injector.get(TransactionalConnection);
  },

  createFulfillment: async (
    ctx: RequestContext,
    orders: Order[],
    lines: CreateFulfillmentLinesInput[],
    args: any
  ) => {
    const order = orders[0];

    // Validate handler args
    if (!nonEmpty(args?.externalSellerId)) {
      throw new Error('Daraz EPIS: externalSellerId is required for shipper.externalSellerId');
    }

    // Load actual OrderLine entities for the given ids
    const selected = await loadSelectedLines(ctx, connection, order, lines);
    if (selected.length === 0) {
      throw new Error('Daraz EPIS: no matching order lines for fulfillment');
    }

    // Contacts
    const origin: EpisContact = {
      // Replace these with your warehouse/channel config or customFields
      name: 'Default Warehouse',
      phone: '9800000000',
      email: 'warehouse@example.com',
      address: { details: 'Your Warehouse Address, Kathmandu', type: 'warehouse', city: 'Kathmandu' },
    };
    const destination = addressToContact(order.shippingAddress as any, (order as any)?.customer?.firstName ?? 'Customer');

    // Items & dims
    const items = buildEpisItems(selected);
    const dimWeight = buildPackageDimWeight(selected);

    // Payment
    const totalWithTaxNum = Math.round((order as any).totalWithTax ?? order.total ?? 0);
    const hasSettled = (order.payments ?? []).some(p => (p as any).state === 'Settled');
    const paymentType: 'COD' | 'NON-COD' = hasSettled ? 'NON-COD' : 'COD';

    const payload: CreatePackagePayload = {
      externalOrderId: order.code,
      dangerousGood: Boolean(args.dangerousGood ?? false),
      items,
      shipper: {
        externalSellerId: String(args.externalSellerId),
        platformName: 'Vendure',
        warehouseName: 'Primary Warehouse',
        externalWarehouseCode: args.warehouseCode?.trim() || undefined,
      },
      origin,
      destination,
      payment: {
        totalAmount: String(totalWithTaxNum),
        currency: (order as any).currencyCode || 'NPR',
        paymentType,
      },
      dimWeight,
      options: {
        // expose more options later if needed (openBox, undeliverableOption, deliveryNote, etc.)
      },
      deliveryOption: (args.deliveryOption as 'standard' | 'economy') ?? 'standard',
    };

    if (items.some(i => !nonEmpty(i.name))) {
      throw new Error('Daraz EPIS: each item.name must be non-empty');
    }

    const res = await darazClient.createPackage(payload);
    console.log(res)
    const isOk = res?.success === true || res?.code === '0';

    if (!isOk) {
      const message = res?.message || 'Daraz EPIS createPackage failed';
      const errors = Array.isArray(res?.errors) ? ` | ${JSON.stringify(res.errors)}` : '';
      throw new Error(`${message}${errors}`);
    }

    const tracking = res?.data?.trackingNumber ?? res?.data?.packageCode ?? 'UNKNOWN';
    return {
      method: `Daraz ${payload.deliveryOption}`,
      trackingCode: tracking,
      customFields: {
        darazPackageCode: res?.data?.packageCode,
        darazRouteCode: res?.data?.routeCode,
        darazPortCode: res?.data?.portCode,
        darazTrackingNumber: res?.data?.trackingNumber,
        darazRespTraceId: res?.traceId ?? res?.request_id,
      } as any,
    };
  },

  onFulfillmentTransition: async (_fromState, toState, { fulfillment }) => {
    if (toState === 'Cancelled' && (fulfillment as any)?.customFields?.darazPackageCode) {
      try {
        await darazClient.cancelPackage((fulfillment as any).customFields.darazPackageCode);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Daraz cancel error', e);
      }
    }
  },
});
