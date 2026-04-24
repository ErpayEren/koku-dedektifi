/**
 * download_gold_images.ts
 *
 * Dataset'teki Popular / Niche / Trap kategorilerindeki parfümler için
 * Fragrantica'dan şişe fotoğrafı indirir, WebP'ye dönüştürür ve
 * assets/gold_images/ altına kaydeder.
 *
 * Kullanım:
 *   npx ts-node scripts/download_gold_images.ts
 *   npx ts-node scripts/download_gold_images.ts --dry-run   (indirme yapmadan listeler)
 *   npx ts-node scripts/download_gold_images.ts --from=50   (50. item'dan başlar)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp');

type Browser = puppeteer.Browser;
type Page    = puppeteer.Page;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATASET_PATH = path.resolve(__dirname, '../docs/gold_dataset/perfume_gold_dataset_v1_2.json');
const OUT_DIR      = path.resolve(__dirname, '../assets/gold_images');
const FAILURES_MD  = path.resolve(__dirname, './download_failures.md');

const PROCESS_CATEGORIES = new Set(['popular', 'niche', 'trap']);
const RATE_LIMIT_MS = 2000;
const WEBP_QUALITY  = 85;
const NAV_TIMEOUT   = 30_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DatasetItem {
  id?: string;
  expected_brand?: string | null;
  expected_name?:  string | null;
  brand?:          string | null;
  name?:           string | null;
  category: string;
  image: string;
  [key: string]: unknown;
}

interface Failure {
  index:    number;
  brand:    string;
  name:     string;
  category: string;
  image:    string;
  reason:   string;
}

/** Placeholder görsel URL'lerini tanımlar (Fragrantica default) */
const PLACEHOLDER_PATTERNS = [
  /375x500\.1\.jpg/,
  /nopic\.jpg/,
  /no_picture/,
  /placeholder/i,
];

function isPlaceholderUrl(url: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(url));
}

/** item'dan marka ve ismi okur; her iki field adı formatını destekler */
function itemBrand(item: DatasetItem): string {
  return (item.expected_brand ?? item.brand ?? '').trim();
}

function itemName(item: DatasetItem): string {
  return (item.expected_name ?? item.name ?? '').trim();
}

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const fromFlag  = args.find((a) => a.startsWith('--from='));
const FROM      = fromFlag ? parseInt(fromFlag.split('=')[1] ?? '0', 10) : 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadDataset(): DatasetItem[] {
  if (!fs.existsSync(DATASET_PATH)) {
    throw new Error(`Dataset bulunamadı: ${DATASET_PATH}`);
  }
  const raw = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8')) as unknown;
  if (Array.isArray(raw)) return raw as DatasetItem[];
  // { items: [...] } veya { dataset: [...] } formatı
  for (const key of ['items', 'dataset', 'perfumes', 'data']) {
    const val = (raw as Record<string, unknown>)[key];
    if (Array.isArray(val)) return val as DatasetItem[];
  }
  throw new Error('Dataset formatı tanınamadı. Beklenen: dizi ya da { items: [...] }');
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
}

/** Fragrantica arama URL'si */
function searchUrl(brand: string, name: string): string {
  const q = encodeURIComponent(`${brand} ${name}`);
  return `https://www.fragrantica.com/search/?query=${q}`;
}

/**
 * Sayfadaki şişe fotoğraf URL'sini bulur.
 * Önce .thumbnail-cropped class'ını dener, yoksa og:image meta tag'ine düşer.
 */
async function extractBottleImageUrl(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    // 1) Parfüm sayfasındaki ana şişe görseli
    const cropped = document.querySelector('.thumbnail-cropped img, .thumbnail-cropped');
    if (cropped) {
      const src = (cropped as HTMLImageElement).src || cropped.getAttribute('src');
      if (src) return src;
    }

    // 2) Parfüm sayfasındaki ilk büyük görsel
    const mainImg = document.querySelector<HTMLImageElement>('[itemprop="image"], .fragrance-image img, .perfume-thumb img');
    if (mainImg?.src) return mainImg.src;

    // 3) og:image fallback
    const og = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    return og?.content ?? null;
  });
}

/**
 * Arama sayfasından ilk parfüm sonucunun URL'sini alır.
 */
async function getFirstResultUrl(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const link = document.querySelector<HTMLAnchorElement>(
      '.results-col a[href*="/perfume/"], .cell a[href*="/perfume/"], a[href*="/perfume/"]'
    );
    return link?.href ?? null;
  });
}

/**
 * URL'den binary içeriği indirir, Buffer döner.
 */
async function downloadBuffer(page: Page, url: string): Promise<Buffer> {
  const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
  if (!response || !response.ok()) {
    throw new Error(`HTTP ${response?.status() ?? 'unknown'} — ${url}`);
  }
  const arr = await response.buffer();
  return Buffer.from(arr);
}

// ---------------------------------------------------------------------------
// Core: tek bir item için indirme
// ---------------------------------------------------------------------------

async function processItem(
  browser: Browser,
  item: DatasetItem,
  index: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const page = await browser.newPage();

  try {
    // Bot tespitini azaltmak için gerçek bir UA
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8' });

    // --- Arama sayfası ---
    const brand = itemBrand(item);
    const name  = itemName(item);
    const sUrl  = searchUrl(brand, name);
    log(`[${index}] Aranıyor: ${brand} — ${name}`);

    await page.goto(sUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });

    // Fragrantica bazen CAPTCHA gösteriyor — kontrol et
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    if (/captcha|robot|verify/i.test(bodyText)) {
      return { ok: false, reason: 'CAPTCHA — IP engellenmiş olabilir' };
    }

    const resultUrl = await getFirstResultUrl(page);
    if (!resultUrl) {
      return { ok: false, reason: 'Arama sonucu bulunamadı' };
    }

    // --- Parfüm sayfası ---
    await page.goto(resultUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await sleep(600); // lazy-load görsellerin yüklenmesi için

    const imgUrl = await extractBottleImageUrl(page);
    if (!imgUrl) {
      return { ok: false, reason: `Görsel URL bulunamadı — ${resultUrl}` };
    }

    if (isPlaceholderUrl(imgUrl)) {
      return { ok: false, reason: `Placeholder görsel döndü: ${imgUrl}` };
    }

    if (DRY_RUN) {
      log(`  [DRY-RUN] Bulundu: ${imgUrl}`);
      return { ok: true };
    }

    // --- İndir ---
    const imgPage = await browser.newPage();
    let rawBuffer: Buffer;
    try {
      rawBuffer = await downloadBuffer(imgPage, imgUrl);
    } finally {
      await imgPage.close();
    }

    // --- WebP'ye dönüştür ---
    const outFilename = item.image.endsWith('.webp')
      ? item.image
      : `${sanitizeFilename(item.image.replace(/\.\w+$/, ''))}.webp`;
    const outPath = path.join(OUT_DIR, outFilename);

    await sharp(rawBuffer).webp({ quality: WEBP_QUALITY }).toFile(outPath);

    const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
    log(`  ✓ Kaydedildi: ${outFilename} (${sizeKb} KB)`);
    return { ok: true };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: msg };
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const dataset = loadDataset();
  const targets = dataset
    .filter((item) => PROCESS_CATEGORIES.has(item.category.toLowerCase()))
    .filter((item) => Boolean(itemBrand(item)) && Boolean(itemName(item)));

  const slice = FROM > 0 ? targets.slice(FROM) : targets;

  log(`Dataset: ${dataset.length} toplam, ${targets.length} hedef (Popular/Niche/Trap)`);
  log(`İşlenecek: ${slice.length} item (FROM=${FROM})`);
  if (DRY_RUN) log('DRY-RUN modu — dosya yazılmayacak');

  ensureDir(OUT_DIR);

  const failures: Failure[] = [];
  let success = 0;
  let skipped = 0;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  try {
    for (let i = 0; i < slice.length; i++) {
      const item   = slice[i]!;
      const absIdx = FROM + i;

      // Zaten indirilmiş mi?
      const outFilename = item.image.endsWith('.webp')
        ? item.image
        : `${sanitizeFilename(item.image.replace(/\.\w+$/, ''))}.webp`;
      const outPath = path.join(OUT_DIR, outFilename);

      if (!DRY_RUN && fs.existsSync(outPath)) {
        log(`[${absIdx}] Atlandı (mevcut): ${outFilename}`);
        skipped++;
        continue;
      }

      const result = await processItem(browser, item, absIdx);

      if (result.ok) {
        success++;
      } else {
        const reason = result.ok === false ? result.reason : '';
        log(`  ✗ Başarısız: ${reason}`);
        failures.push({
          index:    absIdx,
          brand:    itemBrand(item),
          name:     itemName(item),
          category: item.category,
          image:    item.image,
          reason,
        });
      }

      // Rate limit
      if (i < slice.length - 1) await sleep(RATE_LIMIT_MS);
    }
  } finally {
    await browser.close();
  }

  // --- Failures log ---
  if (failures.length > 0) {
    const lines = [
      `# Download Failures`,
      ``,
      `Tarih: ${new Date().toISOString()}`,
      `Toplam başarısız: ${failures.length}`,
      ``,
      `| # | Brand | Name | Category | Image | Sebep |`,
      `|---|-------|------|----------|-------|-------|`,
      ...failures.map((f) =>
        `| ${f.index} | ${f.brand} | ${f.name} | ${f.category} | ${f.image} | ${f.reason} |`
      ),
    ];
    fs.writeFileSync(FAILURES_MD, lines.join('\n'), 'utf-8');
    log(`\nHatalar kaydedildi: ${FAILURES_MD}`);
  }

  log(`\n--- Özet ---`);
  log(`✓ Başarılı : ${success}`);
  log(`⊘ Atlandı  : ${skipped}`);
  log(`✗ Başarısız: ${failures.length}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
