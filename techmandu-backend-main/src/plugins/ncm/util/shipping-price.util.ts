/**
 * Pure helpers for shipping prices. No Vendure imports on purpose, so they can be unit-tested
 * without booting the server (see shipping-price.util.test.ts).
 */

/** NPR per 1 unit of the foreign currency, as stored in Global settings. */
export interface NprRates {
  USD?: number | null;
  AUD?: number | null;
}

export type RingRoadZone = "inside" | "outside";

export interface AddressLike {
  city?: string | null;
  streetLine1?: string | null;
  streetLine2?: string | null;
  countryCode?: string | null;
}

const isUsableRate = (rate: unknown): rate is number =>
  typeof rate === "number" && Number.isFinite(rate) && rate > 0;

/**
 * Converts an amount in whole NPR to the minor units (cents/paisa) of the order currency.
 * Returns `undefined` when the currency is unsupported or its exchange rate is missing/invalid,
 * so the caller can hide the shipping method instead of charging a wrong price.
 */
export function nprToMinorUnits(
  nprAmount: number,
  currencyCode: string,
  rates: NprRates
): number | undefined {
  if (!Number.isFinite(nprAmount) || nprAmount < 0) return undefined;
  const code = currencyCode.toUpperCase();
  if (code === "NPR") return Math.round(nprAmount * 100);
  const rate = code === "USD" ? rates.USD : code === "AUD" ? rates.AUD : undefined;
  if (!isUsableRate(rate)) return undefined;
  return Math.round((nprAmount / rate) * 100);
}

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[_\-.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Reads the ring road zone from the address. Accepts the legacy machine values
 * ("inside_ring_road") and plain text typed by a customer ("Outside Ring Road, Koteshwor").
 */
export function parseRingRoadZone(address: AddressLike | null | undefined): RingRoadZone | undefined {
  const text = normalise(`${address?.streetLine2 ?? ""} ${address?.streetLine1 ?? ""}`);
  if (/\boutside (the )?ring road\b/.test(text)) return "outside";
  if (/\binside (the )?ring road\b/.test(text)) return "inside";
  return undefined;
}

/** Municipalities and common area names of the Kathmandu Valley (Kathmandu, Lalitpur, Bhaktapur). */
export const VALLEY_AREAS = [
  "kathmandu", "lalitpur", "bhaktapur", "patan", "kirtipur", "thimi", "madhyapur",
  "budhanilkantha", "tokha", "tarakeshwar", "gokarneshwar", "kageshwari", "manohara",
  "chandragiri", "nagarjun", "dakshinkali", "shankharapur", "changunarayan",
  "godawari", "konjyosom", "mahalaxmi", "suryabinayak", "bode", "sanothimi",
  "baneshwor", "koteshwor", "balkumari", "imadol", "satdobato", "kalanki",
];

/**
 * True when the delivery address is in the Kathmandu Valley.
 * Uses the city when present (so "Kathmandu Road, Pokhara" is not matched), otherwise the street lines.
 * `extraAreas` lets admins add local names without a code change.
 */
export function isValleyAddress(
  address: AddressLike | null | undefined,
  extraAreas: string[] = []
): boolean {
  if (!address) return false;
  const areas = [...VALLEY_AREAS, ...extraAreas.map(normalise).filter(Boolean)];
  const city = normalise(address.city ?? "");
  const haystack = city || normalise(`${address.streetLine1 ?? ""} ${address.streetLine2 ?? ""}`);
  return areas.some((area) => haystack.includes(area));
}

/** Splits the admin-entered comma separated list of extra area names. */
export function parseAreaList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface PaymentLike {
  method: string;
  state: string;
  amount: number;
}

/** Payment states that mean the customer has already paid (or the payment is awaiting manual check). */
const PAID_STATES = ["Settled", "Authorized"];

/**
 * Cash the courier must collect at the door, in whole NPR.
 *
 * Prepaid orders (card, QR, Khalti...) return 0, so the recipient is never asked to pay again.
 * Only a cash-on-delivery payment, or an unpaid remainder, produces an amount.
 * Returns `undefined` when the order is not in NPR and no exchange rate is available.
 */
export function codAmountNpr(
  totalWithTaxMinor: number,
  currencyCode: string,
  payments: PaymentLike[],
  rates: NprRates,
  codMethodCodes: string[] = ["cash-on-delivery"]
): number | undefined {
  const prepaid = payments
    .filter((p) => PAID_STATES.includes(p.state) && !codMethodCodes.includes(p.method))
    .reduce((sum, p) => sum + p.amount, 0);
  const outstandingMinor = Math.max(0, totalWithTaxMinor - prepaid);
  if (outstandingMinor === 0) return 0;

  const code = currencyCode.toUpperCase();
  if (code === "NPR") return Math.round(outstandingMinor / 100);
  const rate = code === "USD" ? rates.USD : code === "AUD" ? rates.AUD : undefined;
  if (!isUsableRate(rate)) return undefined;
  return Math.round((outstandingMinor / 100) * rate);
}

/**
 * Normalises a Nepal phone number to local digits (no +977, spaces or dashes).
 * Returns `undefined` when there is nothing usable, so the caller can refuse to book a parcel
 * instead of sending a made-up number to the courier.
 */
export function normaliseNepalPhone(raw: string | null | undefined): string | undefined {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("977") && digits.length > 10) digits = digits.slice(3);
  if (digits.length < 7 || digits.length > 10) return undefined;
  return digits;
}
