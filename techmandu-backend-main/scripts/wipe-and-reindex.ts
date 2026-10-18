import { Client } from '@elastic/elasticsearch';
import {
  bootstrapWorker,
  ChannelService,
  ConfigService,
  RequestContext,
  RequestContextService,
  SearchService,
  TransactionalConnection,
  User,
} from '@vendure/core';
import * as dotenv from 'dotenv';

import { config } from '../src/vendure-config';

dotenv.config();

const VENDURE_INDEX_PREFIX = 'vendure-variants';
const TEMP_INDEX_PREFIX = 'temp-';

function getElasticClient(): Client {
  const node = process.env.ELASTIC_URL;
  if (!node) {
    console.error(
      'ELASTIC_URL is required. Set it in .env or pass as env var.',
    );
    process.exit(1);
  }

  const username = process.env.ELASTIC_USERNAME;
  const password = process.env.ELASTIC_PASSWORD;

  return new Client({
    node,
    auth: username && password ? { username, password } : undefined,
    tls: { rejectUnauthorized: false },
  });
}

function isVendureOrTempIndex(name: string): boolean {
  if (!name || name.startsWith('.')) return false;
  return (
    name.startsWith(VENDURE_INDEX_PREFIX) || name.startsWith(TEMP_INDEX_PREFIX)
  );
}

async function listVendureAndTempIndices(client: Client): Promise<string[]> {
  const response = await client.cat.indices({ format: 'json', h: 'index' });
  const records = Array.isArray(response) ? response : [];
  return records
    .map((entry: { index?: string }) => entry.index ?? '')
    .filter(
      (name): name is string =>
        typeof name === 'string' && isVendureOrTempIndex(name),
    );
}

async function deleteVendureIndices(): Promise<string[]> {
  const client = getElasticClient();
  const toDelete = await listVendureAndTempIndices(client);

  if (toDelete.length === 0) {
    return [];
  }

  for (const indexName of toDelete) {
    await client.indices.delete({ index: indexName });
  }
  return toDelete;
}

async function getSuperadminContext(
  app: Awaited<ReturnType<typeof bootstrapWorker>>['app'],
): Promise<RequestContext> {
  const { superadminCredentials } = app.get(ConfigService).authOptions;
  const channelService = app.get(ChannelService);
  const defaultChannel = await channelService.getDefaultChannel();

  const superAdminUser = await app
    .get(TransactionalConnection)
    .rawConnection.getRepository(User)
    .findOneOrFail({ where: { identifier: superadminCredentials.identifier } });

  return app.get(RequestContextService).create({
    apiType: 'admin',
    user: superAdminUser,
    channelOrToken: defaultChannel.token,
  });
}

async function main(): Promise<void> {
  const ts = () => new Date().toISOString();

  console.log(`[${ts()}] Wipe Vendure ES indices + reindex\n`);

  try {
    console.log(
      `[${ts()}] Step 1: Deleting vendure-variants* and temp-* indices...`,
    );
    const deleted = await deleteVendureIndices();

    if (deleted.length === 0) {
      console.log(`[${ts()}] No Vendure indices to delete.\n`);
    } else {
      console.log(
        `[${ts()}] Deleted ${deleted.length} index/indices: ${deleted.join(', ')}\n`,
      );
    }

    console.log(
      `[${ts()}] Step 2: Bootstrapping Vendure worker and running reindex...`,
    );
    const { app } = await bootstrapWorker(config);
    const ctx = await getSuperadminContext(app);
    const searchService = app.get(SearchService);
    await searchService.reindex(ctx);
    await app.close();

    console.log(
      `[${ts()}]  Done. Vendure reindex completed; new index created.\n`,
    );
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${ts()}]  Error:`, message);
    process.exit(1);
  }
}

main();
