import path from "path";
import { INestApplicationContext, Type } from "@nestjs/common";
import { ConfigService, RequestContext } from "@vendure/core";
import { hash, ImageProvider, ImageSource } from "./images";

export type StepName = "base" | "store" | "vendors" | "pricing" | "people" | "content" | "orders";

export const ALL_STEPS: StepName[] = ["base", "store", "vendors", "pricing", "people", "content", "orders"];
/** `orders` is opt-in because it fires the real order/payment side-effects of the plugins. */
export const DEFAULT_STEPS: StepName[] = ["base", "store", "vendors", "pricing", "people", "content"];

export interface SeedFlags {
  reset: boolean;
  force: boolean;
  images: ImageSource;
  imagesPerProduct: number;
  refreshImages: boolean;
  keepPrices: boolean;
  imagesDir: string;
  steps: Set<StepName>;
}

export const HELP = `
Techmandu seeder

  yarn seed [options]

Options
  --reset                    Drop ALL data (schema "public") and re-create it before seeding. Dev only.
  --only=a,b                 Run only these steps. Steps: ${ALL_STEPS.join(", ")}
  --skip=a,b                 Run the default steps except these
  --with-orders              Also create demo orders (same as adding "orders" to the steps)
  --images=picsum|loremflickr|placeholder
                             Image source (default: picsum). Falls back to generated placeholders if offline.
  --images-per-product=N     Gallery size per product (default: 3)
  --refresh-images           Ignore the on-disk image cache and download again
  --keep-prices              Keep the 9999 placeholder prices from final.csv instead of replacing them
  --force                    Allow running when APP_ENV is not "dev"
  --help                     Show this help
`;

export function parseFlags(argv: string[]): SeedFlags {
  const args = new Map<string, string>();
  for (const a of argv) {
    if (!a.startsWith("--")) continue;
    const [k, v] = a.slice(2).split("=");
    args.set(k, v ?? "true");
  }
  const list = (key: string): StepName[] | null => {
    const raw = args.get(key);
    if (!raw) return null;
    const names = raw.split(",").map((s) => s.trim()) as StepName[];
    const bad = names.filter((n) => !ALL_STEPS.includes(n));
    if (bad.length) throw new Error(`Unknown step(s): ${bad.join(", ")}. Valid: ${ALL_STEPS.join(", ")}`);
    return names;
  };

  let steps = new Set<StepName>(DEFAULT_STEPS);
  const only = list("only");
  const skip = list("skip");
  if (only) steps = new Set(only);
  if (skip) skip.forEach((s) => steps.delete(s));
  if (args.has("with-orders")) steps.add("orders");

  const images = (args.get("images") ?? process.env.SEED_IMAGES ?? "picsum") as ImageSource;
  if (!["picsum", "loremflickr", "placeholder"].includes(images)) {
    throw new Error(`--images must be picsum, loremflickr or placeholder (got "${images}")`);
  }

  return {
    reset: args.has("reset"),
    force: args.has("force"),
    images,
    imagesPerProduct: Math.max(1, Math.min(6, Number(args.get("images-per-product") ?? 3) || 3)),
    refreshImages: args.has("refresh-images"),
    keepPrices: args.has("keep-prices"),
    imagesDir: path.join(__dirname, "../data/assets"),
    steps,
  };
}

/** Image files created BEFORE Vendure boots (Vendure loads its own copy of sharp/libvips; using ours afterwards can crash). */
export interface PreparedAssets {
  csvPath: string;
  qrPath: string;
  hero: string[];
  banners: string[];
  /** collection slug → image file name inside the images dir */
  collections: Record<string, string>;
}

export interface SeedContext {
  app: INestApplicationContext;
  prepared: PreparedAssets;
  ctx: RequestContext;
  /** Builds a fresh superadmin RequestContext (needed after channels/zones change) and stores it in `ctx`. */
  refresh(): Promise<RequestContext>;
  /** Superadmin RequestContext scoped to another channel (by token). */
  contextFor(channelToken: string): Promise<RequestContext>;
  flags: SeedFlags;
  images: ImageProvider;
  config: ConfigService;
  get<T>(type: Type<T> | Function): T;
  /** Keep only custom fields that are really declared for `entity` in this app's config. */
  fields(entity: string, values: Record<string, any>): Record<string, any>;
  hasField(entity: string, name: string): boolean;
}

export function makeContext(
  app: INestApplicationContext,
  ctx: RequestContext,
  flags: SeedFlags,
  images: ImageProvider,
  prepared: PreparedAssets,
): SeedContext {
  const config = app.get(ConfigService);
  const hasField = (entity: string, name: string) =>
    ((config.customFields as any)[entity] ?? []).some((f: any) => f.name === name);
  const sc: SeedContext = {
    app,
    prepared,
    ctx,
    refresh: async () => sc.ctx,
    contextFor: async () => sc.ctx,
    flags,
    images,
    config,
    get: (type) => app.get(type as any),
    hasField,
    fields: (entity, values) =>
      Object.fromEntries(Object.entries(values).filter(([name]) => hasField(entity, name))),
  };
  return sc;
}

// ---------------------------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------------------------
export const log = {
  step: (msg: string) => console.log(`\n▶ ${msg}`),
  ok: (msg: string) => console.log(`  ✔ ${msg}`),
  info: (msg: string) => console.log(`  • ${msg}`),
  warn: (msg: string) => console.warn(`  ⚠️  ${msg}`),
};

// ---------------------------------------------------------------------------------------------
// Deterministic "random" – same seed, same data on every run.
// ---------------------------------------------------------------------------------------------
export function rng(seed: string): () => number {
  let a = hash(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(rand: () => number, items: readonly T[]): T => items[Math.floor(rand() * items.length)];
export const between = (rand: () => number, min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
