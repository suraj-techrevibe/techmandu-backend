/**
 * Downloads public placeholder product photos and wires them into Vendure's
 * existing CSV import. Run before src/seed.ts.
 *
 * This intentionally prepares local import assets; Vendure then creates the
 * Asset records and attaches them to products during its normal populate step.
 */
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CSV_PATH = path.join(__dirname, './final.csv');
const ASSET_DIR = path.join(__dirname, './data/assets');
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

// Public Unsplash CDN images used as development/demo placeholders. Replace
// with licensed product photography before using these as commercial listings.
const IMAGE_GROUPS: Record<string, string[]> = {
  laptop: [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?fit=crop&w=1200&q=85',
  ],
  phone: [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?fit=crop&w=1200&q=85',
  ],
  earbuds: [
    'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?fit=crop&w=1200&q=85',
  ],
  keyboard: [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1595225476474-87563907a212?fit=crop&w=1200&q=85',
  ],
  monitor: [
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?fit=crop&w=1200&q=85',
  ],
  camera: [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?fit=crop&w=1200&q=85',
  ],
  watch: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?fit=crop&w=1200&q=85',
  ],
  speaker: [
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?fit=crop&w=1200&q=85',
  ],
  power: [
    'https://images.unsplash.com/photo-1609592806596-b43badefae3a?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?fit=crop&w=1200&q=85',
  ],
  tablet: [
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1561150447-6d4ac7e2c8b1?fit=crop&w=1200&q=85',
  ],
  router: [
    'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?fit=crop&w=1200&q=85',
  ],
  printer: [
    'https://images.unsplash.com/photo-1612815154858-60aa4c59e4fb?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1563206767-5b18f218e8de?fit=crop&w=1200&q=85',
  ],
  generic: [
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?fit=crop&w=1200&q=85',
  ],
};

function groupFor(name: string): string {
  const n = name.toLowerCase();
  if (/laptop|macbook|notebook/.test(n)) return 'laptop';
  if (/iphone|phone|galaxy|pixel|mobile/.test(n)) return 'phone';
  if (/earbud|airpod|headphone|earphone|tws/.test(n)) return 'earbuds';
  if (/keyboard|mouse|keycap/.test(n)) return 'keyboard';
  if (/monitor|display|screen/.test(n)) return 'monitor';
  if (/camera|webcam|dslr/.test(n)) return 'camera';
  if (/watch|fitness tracker|smart band/.test(n)) return 'watch';
  if (/speaker|microphone|soundbar/.test(n)) return 'speaker';
  if (/power bank|powerbank|charger|battery|cable|adapter/.test(n)) return 'power';
  if (/ipad|tablet/.test(n)) return 'tablet';
  if (/router|wifi|wi-fi|network/.test(n)) return 'router';
  if (/printer|toner|ink/.test(n)) return 'printer';
  return 'generic';
}

function safeBaseName(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'product';
}

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function fetchImage(urls: string[]): Promise<{ url: string; bytes: Buffer }> {
  const failures: string[] = [];
  // Try every URL in this category. Public image links can be removed, so one
  // dead demo URL must not stop the entire seeding process.
  for (const url of [...new Set(urls)]) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Techmandu-demo-seeder/1.0' } });
      if (!response.ok) {
        failures.push(`${response.status} ${url}`);
        continue;
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        failures.push(`not an image (${contentType}) ${url}`);
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 2_000) {
        failures.push(`response too small (${bytes.length} bytes) ${url}`);
        continue;
      }
      return { url, bytes };
    } catch (error) {
      failures.push(`${error instanceof Error ? error.message : String(error)} ${url}`);
    }
  }
  throw new Error(`All ${urls.length} candidate image URLs failed:\n${failures.join('\n')}`);
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) throw new Error(`CSV not found: ${CSV_PATH}`);
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const csvText = fs.readFileSync(CSV_PATH, 'utf8');
  const records = parse(csvText, { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[];
  if (!records.length) throw new Error('The product CSV contains no records.');
  const headers = Object.keys(records[0]);
  if (!headers.includes('name') || !headers.includes('assets')) {
    throw new Error(`Expected CSV columns "name" and "assets". Found: ${headers.join(', ')}`);
  }

  let prepared = 0;
  let retained = 0;
  const imageBytesByUrl = new Map<string, Buffer>();

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const name = (row.name || '').trim();
    if (!name) continue;
    const current = (row.assets || '').trim();
    if (current && !FORCE) {
      retained++;
      continue;
    }

    const group = groupFor(name);
    const urls = IMAGE_GROUPS[group] || IMAGE_GROUPS.generic;
    const url = urls[i % urls.length];
    const fileName = `${String(i + 1).padStart(4, '0')}-${safeBaseName(row.slug || name)}.jpg`;
    const destination = path.join(ASSET_DIR, fileName);
    if (!DRY_RUN) {
      if (!fs.existsSync(destination) || FORCE) {
        let bytes = imageBytesByUrl.get(url);
        if (!bytes) {
          // Try the selected URL first, then the remaining URLs in this group.
          // Cache the successful URL too, so subsequent products can reuse it.
          const candidates = [url, ...urls.filter(candidate => candidate !== url)];
          const result = await fetchImage(candidates);
          bytes = result.bytes;
          imageBytesByUrl.set(url, bytes);
          imageBytesByUrl.set(result.url, bytes);
          if (result.url !== url) {
            console.warn(`Using fallback image URL for \"${name}\": ${result.url}`);
          }
        }
        fs.writeFileSync(destination, bytes);
      }
      // Vendure's CSV importer resolves asset filenames from importAssetsDir.
      row.assets = fileName;
    }
    prepared++;
    if (prepared % 25 === 0) console.log(`Prepared ${prepared} image assignments...`);
  }

  if (DRY_RUN) {
    console.log(`[dry-run] ${prepared} rows would receive demo images; ${retained} existing asset assignments would be preserved.`);
    return;
  }

  // Preserve the CSV header order and quote cells correctly, including JSON specs.
  const output = [headers.map(csvCell).join(','), ...records.map(row => headers.map(h => csvCell(row[h])).join(','))].join('\n') + '\n';
  fs.writeFileSync(CSV_PATH, output, 'utf8');
  console.log(`Image preparation complete. Assigned ${prepared} product images; preserved ${retained} existing asset assignments.`);
  console.log(`Assets directory: ${ASSET_DIR}`);
  console.log('Next: run the existing seed.ts importer to create Vendure Asset records and attach the images.');
}

main().catch(error => {
  console.error('Image seeding failed:', error);
  process.exitCode = 1;
});
