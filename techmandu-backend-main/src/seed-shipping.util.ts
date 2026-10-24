/**
 * The demo shipping methods in initial.ts ("Standard Shipping", "Express Shipping") use Vendure's
 * built-in flat-rate calculator, which charges the same number in every currency. A USD order
 * would show 500 cents as $5 and 25000 as $250, so they must never reach a live shop.
 * Real Nepal methods (NCM, Inside Valley, Pickup) are created in the admin and convert from NPR.
 *
 * Kept free of Vendure imports so it can be unit-tested directly.
 */
export function shippingMethodsForEnv<T>(methods: readonly T[] | undefined, appEnv: string | undefined): T[] {
  return appEnv?.trim().toLowerCase() === "dev" ? [...(methods ?? [])] : [];
}
