import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

import { INestApplicationContext } from "@nestjs/common";
import { lastValueFrom } from "rxjs";
import { DataSource } from "typeorm";
import { JobState } from "@vendure/common/lib/generated-types";
import {
  bootstrapWorker,
  ChannelService,
  ConfigService,
  Product,
  RequestContext,
  RequestContextService,
  runMigrations,
  SearchService,
  TransactionalConnection,
  User,
} from "@vendure/core";
import { populate } from "@vendure/core/cli";
import { SubscribableJob } from "@vendure/core/dist/job-queue/subscribable-job";
import { config } from "./vendure-config";
import { initialData } from "./initial";
import { HELP, log, makeContext, parseFlags, SeedContext, SeedFlags } from "./seeder/context";
import { ImageProvider } from "./seeder/images";
import {
  CatalogRow,
  applyPricing,
  configureCurrency,
  finishCatalog,
  loadCatalogRows,
  prepareImportCsv,
  seedVendors,
} from "./seeder/catalog";
import { prepareContentImages } from "./seeder/content";
import { seedStore } from "./seeder/store";
import { seedPeople } from "./seeder/people";
import { seedContent, seedOrders } from "./seeder/content";
import { SEED_PASSWORD } from "./seeder/data";

/**
 * Techmandu seeder – run `yarn seed --help` for options.
 *
 * It works on a brand-new database: migrations are applied first (exactly like `yarn dev` does),
 * then the demo data is created through Vendure's own services so events, search index and
 * channel assignments behave like real data.
 */

// Nepal VAT is 13%. "Reduced Tax" is only a placeholder category – adjust it to your accountant's advice.
const seedInitialData = {
  ...initialData,
  taxRates: [
    { name: "Standard Tax", percentage: 13 },
    { name: "Reduced Tax", percentage: 5 },
    { name: "Zero Tax", percentage: 0 },
  ],
  // Shipping + payment methods are created by seedStore() with this app's real handlers.
  shippingMethods: [],
  paymentMethods: [],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (process.argv.includes("--help")) {
    console.log(HELP);
    return;
  }
  const flags = parseFlags(process.argv.slice(2));
  guardEnvironment(flags);

  if (flags.reset) await resetDatabase();

  log.step("Preparing database (migrations)");
  await prepareDatabase();
  await runMigrations(config);
  log.ok("Migrations applied");

  // All images are created BEFORE Vendure starts: Vendure loads its own copy of sharp/libvips and
  // using a second copy in the same process can crash Node ("free(): invalid size").
  const images = new ImageProvider({ source: flags.images, dir: flags.imagesDir, refresh: flags.refreshImages });
  const rows = loadCatalogRows(flags.keepPrices);
  log.step(`Preparing images (source: ${flags.images}) – this can take a minute on the first run`);
  const csvPath = flags.steps.has("base") ? await prepareImportCsv(images, flags.imagesPerProduct, rows) : "";
  const extra = await prepareContentImages(images);
  const s = images.stats;
  log.ok(`Images ready – downloaded ${s.downloaded}, cached ${s.cached}, generated locally ${s.generated}`);

  const worker = await bootstrapWorker({
    ...config,
    // EmailPlugin is left out so creating demo customers never tries to send real verification emails
    // (this repo always uses SMTP: IS_EMAIL_DEV is hard-coded to false in vendure-config.ts).
    // DefaultJobQueuePlugin stays: the in-memory queue refuses to run inside a worker process.
    plugins: (config.plugins || []).filter((p) => (p as any)?.name !== "EmailPlugin"),
    importExportOptions: { importAssetsDir: flags.imagesDir },
  });
  const app = worker.app;
  // Process background jobs (search index updates, collection filter application…) like a real worker does.
  await worker.startJobQueue();

  try {
    const ctx = await getSuperadminContext(app);
    const sc = makeContext(app, ctx, flags, images, { csvPath, ...extra });
    sc.refresh = async () => (sc.ctx = await getSuperadminContext(app));
    sc.contextFor = (token) => getSuperadminContext(app, token);
    await run(sc, rows);
    await reindex(sc);
    printSummary(sc);
  } finally {
    await sleep(500);
    await app.close();
  }
}

async function run(sc: SeedContext, rows: CatalogRow[]) {
  const { flags } = sc;

  if (flags.steps.has("base")) {
    const existing = await sc.get(TransactionalConnection).getRepository(sc.ctx, Product).count();
    if (existing > 0) {
      log.warn(`Catalog already has ${existing} products – skipping "base". Use --reset for a clean start.`);
    } else {
      log.step(`Catalog: ${rows.length} products, ${flags.imagesPerProduct} images each`);
      await configureCurrency(sc);
      log.info("Importing initial data, collections and products (Vendure importer)…");
      await populate(() => Promise.resolve(sc.app), seedInitialData, sc.prepared.csvPath);
      // The import created zones/tax rates and changed the default channel: our old RequestContext still
      // holds the stale channel (no tax zone), so build a fresh one.
      await sc.refresh();
      await finishCatalog(sc, rows);
    }
  }
  if (flags.steps.has("store")) {
    log.step("Store setup");
    await seedStore(sc);
  }
  if (flags.steps.has("pricing")) {
    log.step("Pricing (NPR / USD / AUD + discounts)");
    await applyPricing(sc, rows);
  }
  if (flags.steps.has("vendors")) {
    log.step("Vendors (sellers, channels, staff logins)");
    await seedVendors(sc, rows);
  }
  if (flags.steps.has("people")) {
    log.step("Customers, loyalty coins, reviews, Q&A");
    await seedPeople(sc, rows);
  }
  if (flags.steps.has("content")) {
    log.step("Storefront content (pages, blogs, banners, hero, collection images)");
    await seedContent(sc);
  }
  if (flags.steps.has("orders")) {
    log.step("Demo orders");
    await seedOrders(sc);
  }
}

// ---------------------------------------------------------------------------------------------
function guardEnvironment(flags: SeedFlags) {
  if (process.env.APP_ENV !== "dev" && !flags.force) {
    throw new Error(
      `Refusing to seed because APP_ENV="${process.env.APP_ENV}" (expected "dev"). ` +
        `The seeder creates test logins with a known password. Pass --force if you really mean it.`,
    );
  }
  if (flags.reset && process.env.APP_ENV !== "dev") {
    throw new Error("--reset is only allowed when APP_ENV=dev.");
  }
}

async function withDatabase<T>(fn: (ds: DataSource) => Promise<T>): Promise<T> {
  const o = config.dbConnectionOptions as any;
  const ds = new DataSource({
    type: "postgres",
    host: o.host,
    port: o.port,
    username: o.username,
    password: o.password,
    database: o.database,
  });
  await ds.initialize();
  try {
    return await fn(ds);
  } finally {
    await ds.destroy();
  }
}

async function resetDatabase() {
  const o = config.dbConnectionOptions as any;
  const schema = o.schema || "public";
  log.step(`Resetting database "${o.database}" (schema "${schema}") on ${o.host}:${o.port}`);
  await withDatabase(async (ds) => {
    await ds.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await ds.query(`CREATE SCHEMA "${schema}"`);
  });
  const uploadDir = path.join(__dirname, "../static/assets");
  if (fs.existsSync(uploadDir)) fs.rmSync(uploadDir, { recursive: true, force: true });
  log.ok("Database schema and uploaded assets cleared");
}

/**
 * The project's migrations use uuid_generate_v4(), which needs the "uuid-ossp" extension.
 * Supabase has it enabled; a plain Postgres / Docker image does not – so enable it here.
 */
async function prepareDatabase() {
  try {
    await withDatabase((ds) => ds.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`));
    log.ok('Postgres extension "uuid-ossp" is enabled');
  } catch (err: any) {
    log.warn(`Could not enable "uuid-ossp" (${err.message}). If migrations fail, run: CREATE EXTENSION "uuid-ossp";`);
  }
}

async function getSuperadminContext(app: INestApplicationContext, channelToken?: string): Promise<RequestContext> {
  const configService = app.get(ConfigService);
  const channelService = app.get(ChannelService);
  const connection = app.get(TransactionalConnection);
  const defaultChannel = await channelService.getDefaultChannel();
  // roles + channels are required: the context derives its channel permissions from them
  const user = await connection.rawConnection.getRepository(User).findOneOrFail({
    where: { identifier: configService.authOptions.superadminCredentials.identifier },
    relations: ["roles", "roles.channels"],
  });
  return app.get(RequestContextService).create({
    apiType: "admin",
    user,
    channelOrToken: channelToken ?? defaultChannel.token,
  });
}

async function waitForJob(job: SubscribableJob<any>, timeoutMs = 180000) {
  // The returned job is a snapshot – its `.state` never changes. `updates()` polls the job queue instead.
  const last = await lastValueFrom(job.updates({ pollInterval: 500, timeoutMs }));
  if (last.state !== JobState.COMPLETED) throw new Error(`Search reindex ended with state ${last.state}`);
}

/** Waits until Vendure's background jobs (collection filters, index updates…) have all finished. */
async function waitForQueueIdle(sc: SeedContext, timeoutMs = 300000) {
  const query = (sql: string) => sc.get(TransactionalConnection).rawConnection.query(sql);
  const start = Date.now();
  let quiet = 0;
  while (Date.now() - start < timeoutMs) {
    const [{ open }] = await query(`SELECT COUNT(*)::int AS open FROM job_record WHERE state IN ('PENDING','RUNNING','RETRYING')`);
    quiet = open === 0 ? quiet + 1 : 0;
    if (quiet >= 3) break; // idle for 3 consecutive polls – no new jobs are being spawned
    await sleep(500);
  }
  const failed: Array<{ queueName: string; n: number }> = await query(
    `SELECT "queueName", COUNT(*)::int AS n FROM job_record WHERE state = 'FAILED' GROUP BY "queueName"`,
  );
  if (failed.length) log.warn(`Some background jobs failed: ${failed.map((f) => `${f.queueName}×${f.n}`).join(", ")}`);
}

async function reindex(sc: SeedContext) {
  log.step("Finishing background jobs and rebuilding the search index");
  await waitForQueueIdle(sc);
  const job = await sc.get(SearchService).reindex(sc.ctx);
  await waitForJob(job as unknown as SubscribableJob<any>);
  await waitForQueueIdle(sc);
  log.ok("Search index ready");
}

function printSummary(sc: SeedContext) {
  const port = process.env.PORT || 3000;
  console.log(`
────────────────────────────────────────────────────────────────────
✅ Seeding finished

  Admin UI     http://localhost:3002/admin
  Super admin  ${process.env.SUPERADMIN_USERNAME} / ${process.env.SUPERADMIN_PASSWORD}
  Staff        orders@ / inventory@ / admin@techmandu.example.com   (password: ${SEED_PASSWORD})
  Vendors      vendor.<vendor-slug>@techmandu.example.com           (password: ${SEED_PASSWORD})
  Customers    aarav.sharma@example.com …                          (password: ${SEED_PASSWORD})
  Coupons      WELCOME10, FREESHIP, DASHAIN15

  Shop API     http://localhost:${port}/shop-api      GraphiQL: /graphiql/shop
  Admin API    http://localhost:${port}/admin-api     GraphiQL: /graphiql/admin
────────────────────────────────────────────────────────────────────`);
  void sc;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Seeding failed:", err?.message ?? err);
    if (process.env.SEED_DEBUG) console.error(err);
    process.exit(1);
  });
