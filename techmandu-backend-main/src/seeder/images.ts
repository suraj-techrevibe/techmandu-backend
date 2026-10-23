import fs from "fs";
import path from "path";
import zlib from "zlib";

/**
 * Image provider for the seeder.
 *
 *  - picsum       (default) https://picsum.photos  – random photos, free to use (Unsplash licence),
 *                 deterministic per seed so re-running gives the same pictures.
 *  - loremflickr  https://loremflickr.com – random Creative-Commons photos matching a keyword
 *                 (e.g. "smartphone"), more relevant but slower / less reliable.
 *  - placeholder  no network at all: coloured gradient images with a simple device silhouette,
 *                 generated locally.
 *
 * Downloaded files are cached in `dir`, so a second run is instant and works offline.
 * If the network is unavailable, the provider silently falls back to generated placeholders.
 *
 * NOTE: this file deliberately does NOT use `sharp`. Vendure loads its own copies of sharp/libvips
 * (core + asset-server-plugin use different versions); touching a third copy from the seeder crashes
 * Node with "free(): invalid size". Placeholders are therefore encoded as PNG in plain JavaScript.
 */
export type ImageSource = "picsum" | "loremflickr" | "placeholder";

export interface ImageRequest {
  /** File name without extension, e.g. "iphone-17-1" */
  name: string;
  /** Deterministic seed, defaults to `name` */
  seed?: string;
  /** Keyword used by loremflickr and to pick the placeholder silhouette */
  keyword?: string;
  width: number;
  height: number;
  /** Kept for API symmetry / future use */
  label?: string;
}

export interface ImageStats {
  downloaded: number;
  cached: number;
  generated: number;
}

const KEYWORDS: Array<[RegExp, string]> = [
  [/iphone|phone|galaxy|pixel/i, "smartphone"],
  [/macbook|laptop|notebook|computer/i, "laptop"],
  [/ipad|tablet/i, "tablet"],
  [/earbud|airpod|headphone|audio/i, "headphones"],
  [/watch|fitness|health/i, "smartwatch"],
  [/power ?bank|cable|charger|power/i, "charger"],
  [/mouse|keyboard/i, "keyboard"],
  [/printer/i, "printer"],
  [/monitor|display/i, "monitor"],
  [/camera/i, "camera"],
];

export function keywordFor(text: string): string {
  for (const [re, kw] of KEYWORDS) {
    if (re.test(text)) return kw;
  }
  return "gadget";
}

/** 32-bit FNV-1a hash, used for deterministic colours / lock values. */
export function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------------------------
// Minimal PNG encoder (RGB, 8-bit, "Sub" filter + zlib)
// ---------------------------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const out = y * (stride + 1);
    raw[out] = 1; // filter type "Sub"
    for (let x = 0; x < stride; x++) {
      const cur = rgb[y * stride + x];
      const left = x >= 3 ? rgb[y * stride + x - 3] : 0;
      raw[out + 1 + x] = (cur - left) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** Signed distance to a rounded rectangle centred at (cx, cy). Negative = inside. */
function sdRoundRect(u: number, v: number, cx: number, cy: number, hx: number, hy: number, r: number): number {
  const qx = Math.abs(u - cx) - hx + r;
  const qy = Math.abs(v - cy) - hy + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Light silhouette shapes (in units of the shorter image side, origin = image centre). */
function silhouette(keyword: string): Array<(u: number, v: number) => number> {
  const rr = sdRoundRect;
  switch (keyword) {
    case "smartphone":
      return [(u, v) => rr(u, v, 0, 0, 0.14, 0.27, 0.04), (u, v) => Math.hypot(u, v + 0.22) - 0.015];
    case "laptop":
      return [(u, v) => rr(u, v, 0, -0.06, 0.27, 0.17, 0.02), (u, v) => rr(u, v, 0, 0.17, 0.34, 0.025, 0.012)];
    case "tablet":
      return [(u, v) => rr(u, v, 0, 0, 0.2, 0.27, 0.04)];
    case "headphones":
      return [
        (u, v) => Math.hypot(u - 0.13, v - 0.08) - 0.09,
        (u, v) => Math.hypot(u + 0.13, v - 0.08) - 0.09,
        (u, v) => (v < 0.06 ? Math.abs(Math.hypot(u, v - 0.06) - 0.21) - 0.014 : 1),
      ];
    case "smartwatch":
      return [(u, v) => rr(u, v, 0, 0, 0.1, 0.12, 0.04), (u, v) => rr(u, v, 0, -0.2, 0.06, 0.1, 0.01), (u, v) => rr(u, v, 0, 0.2, 0.06, 0.1, 0.01)];
    case "charger":
      return [(u, v) => rr(u, v, 0, 0, 0.1, 0.2, 0.03), (u, v) => Math.hypot(u, v) - 0.04];
    case "keyboard":
      return [(u, v) => rr(u, v, 0, 0.02, 0.3, 0.12, 0.02), (u, v) => rr(u, v, 0, -0.02, 0.26, 0.015, 0.005)];
    case "printer":
      return [(u, v) => rr(u, v, 0, 0.04, 0.3, 0.13, 0.03), (u, v) => rr(u, v, 0, -0.14, 0.18, 0.07, 0.01)];
    default:
      return [(u, v) => rr(u, v, 0, 0, 0.17, 0.17, 0.04), (u, v) => Math.hypot(u, v) - 0.05];
  }
}

function renderPlaceholder(width: number, height: number, seed: string, keyword: string): Buffer {
  const hue = hash(seed) % 360;
  const [r1, g1, b1] = hslToRgb(hue, 0.7, 0.52);
  const [r2, g2, b2] = hslToRgb((hue + 40) % 360, 0.75, 0.35);
  const shapes = silhouette(keyword);
  const m = Math.min(width, height);
  const px = new Uint8Array(width * height * 3);
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = (x - width / 2) / m;
      const v = (y - height / 2) / m;
      const t = Math.min(1, Math.max(0, (x / width + y / height) / 2));
      let r = r1 + (r2 - r1) * t;
      let g = g1 + (g2 - g1) * t;
      let b = b1 + (b2 - b1) * t;
      // soft decorative circles
      if (Math.hypot(u - 0.3, v + 0.25) < 0.32) { r += (255 - r) * 0.1; g += (255 - g) * 0.1; b += (255 - b) * 0.1; }
      if (Math.hypot(u + 0.38, v - 0.4) < 0.26) { r *= 0.9; g *= 0.9; b *= 0.9; }
      // device silhouette (anti-aliased)
      let cover = 0;
      for (const shape of shapes) cover = Math.max(cover, Math.min(1, Math.max(0, 0.5 - shape(u, v) * m)));
      if (cover > 0) {
        const a = 0.28 * cover;
        r += (255 - r) * a; g += (255 - g) * a; b += (255 - b) * a;
      }
      px[i++] = r; px[i++] = g; px[i++] = b;
    }
  }
  return encodePng(width, height, px);
}

/** Fake-but-QR-looking image used for the demo "manual QR payment" setting (PNG). */
export function generateDemoQr(filePath: string, size = 600): void {
  const grid = 29;
  const cell = Math.floor(size / (grid + 4));
  const offset = Math.floor((size - cell * grid) / 2);
  const modules: boolean[][] = Array.from({ length: grid }, (_, y) =>
    Array.from({ length: grid }, (_, x) => hash(`qr-${x}-${y}`) % 100 < 48),
  );
  const finder = (x0: number, y0: number) => {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const gx = x0 + x, gy = y0 + y;
        if (gx < 0 || gy < 0 || gx >= grid || gy >= grid) continue;
        const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
        modules[gy][gx] = x < 7 && y < 7 ? ring !== 2 : false; // 7x7 black frame, white ring, 3x3 core
      }
    }
  };
  finder(0, 0);
  finder(grid - 7, 0);
  finder(0, grid - 7);
  const px = new Uint8Array(size * size * 3).fill(255);
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      if (!modules[gy][gx]) continue;
      for (let y = 0; y < cell; y++) {
        for (let x = 0; x < cell; x++) {
          const o = ((offset + gy * cell + y) * size + offset + gx * cell + x) * 3;
          px[o] = px[o + 1] = px[o + 2] = 0;
        }
      }
    }
  }
  fs.writeFileSync(filePath, encodePng(size, size, px));
}

// ---------------------------------------------------------------------------------------------
export class ImageProvider {
  readonly stats: ImageStats = { downloaded: 0, cached: 0, generated: 0 };
  private mode: ImageSource;
  private failures = 0;
  private successes = 0;

  constructor(
    private readonly options: {
      source: ImageSource;
      dir: string;
      refresh?: boolean;
      timeoutMs?: number;
    },
  ) {
    this.mode = options.source;
    fs.mkdirSync(options.dir, { recursive: true });
  }

  get dir(): string {
    return this.options.dir;
  }

  /** Returns the file name (relative to `dir`) of the ready image. */
  async get(req: ImageRequest): Promise<string> {
    if (!this.options.refresh) {
      for (const ext of ["jpg", "png", "webp"]) {
        const file = `${req.name}.${ext}`;
        const full = path.join(this.options.dir, file);
        if (fs.existsSync(full) && fs.statSync(full).size > 1500) {
          this.stats.cached++;
          return file;
        }
      }
    }

    if (this.mode !== "placeholder") {
      try {
        const { buffer, ext } = await this.download(this.urlFor(req));
        const file = `${req.name}.${ext}`;
        fs.writeFileSync(path.join(this.options.dir, file), buffer);
        this.successes++;
        this.stats.downloaded++;
        return file;
      } catch {
        this.failures++;
        // Circuit breaker: if the very first downloads all fail we are offline / blocked,
        // so stop waiting for timeouts and generate everything locally.
        if ((this.mode as ImageSource) !== "placeholder" && this.failures >= 3 && this.successes === 0) {
          console.warn(`⚠️  Could not download images from "${this.mode}" – using generated placeholders instead.`);
          this.mode = "placeholder";
        }
      }
    }

    const file = `${req.name}.png`;
    fs.writeFileSync(
      path.join(this.options.dir, file),
      renderPlaceholder(req.width, req.height, req.seed ?? req.name, req.keyword ?? "gadget"),
    );
    this.stats.generated++;
    return file;
  }

  /** Convenience: N images for the same subject, returns file names. */
  async getMany(baseName: string, count: number, req: Omit<ImageRequest, "name" | "seed">): Promise<string[]> {
    const out: string[] = [];
    for (let i = 1; i <= count; i++) {
      out.push(await this.get({ ...req, name: `${baseName}-${i}`, seed: `${baseName}-${i}` }));
    }
    return out;
  }

  private urlFor(req: ImageRequest): string {
    const seed = req.seed ?? req.name;
    if (this.mode === "loremflickr") {
      const kw = encodeURIComponent(req.keyword ?? "gadget");
      return `https://loremflickr.com/${req.width}/${req.height}/${kw}?lock=${hash(seed) % 100000}`;
    }
    return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${req.width}/${req.height}.jpg`;
  }

  private async download(url: string): Promise<{ buffer: Buffer; ext: "jpg" | "png" | "webp" }> {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(this.options.timeoutMs ?? 15000),
      headers: { "user-agent": "techmandu-seeder/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 2000) throw new Error("Image too small");
    // Trust the bytes, not the headers
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return { buffer, ext: "jpg" };
    if (buffer.subarray(1, 4).toString("ascii") === "PNG") return { buffer, ext: "png" };
    if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return { buffer, ext: "webp" };
    throw new Error("Response is not an image");
  }
}

/** Tiny concurrency limiter so we do not open hundreds of connections at once. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
