#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const root = process.cwd();

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    out[key] = value;
  }
  return out;
}

function pick(env, key) {
  return String(process.env[key] || env[key] || '').trim();
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function ok(msg) {
  console.log(`OK  ${msg}`);
}

function warn(msg) {
  console.log(`WARN ${msg}`);
}

function fail(msg) {
  console.log(`FAIL ${msg}`);
}

const envPath = path.join(root, '.env.local');
const env = readEnvFile(envPath);
let hasFailure = false;

function readCatalogSeed() {
  const filePath = path.join(root, 'data', 'catalog-seed.json');
  if (!fs.existsSync(filePath)) {
    return { ok: false, fragranceCount: 0, moleculeCount: 0, everyFragranceHasThreeMolecules: false };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const fragranceCount = Array.isArray(raw.fragrances) ? raw.fragrances.length : 0;
    const moleculeCount = Array.isArray(raw.molecules) ? raw.molecules.length : 0;
    const everyFragranceHasThreeMolecules = Array.isArray(raw.fragrances)
      ? raw.fragrances.every((item) => Array.isArray(item.key_molecules) && item.key_molecules.length >= 3)
      : false;

    return { ok: true, fragranceCount, moleculeCount, everyFragranceHasThreeMolecules };
  } catch {
    return { ok: false, fragranceCount: 0, moleculeCount: 0, everyFragranceHasThreeMolecules: false };
  }
}

if (exists('.env.local')) {
  ok('.env.local mevcut');
} else {
  fail('.env.local bulunamadi. .env.example dosyasindan olustur.');
  hasFailure = true;
}

const geminiKey = pick(env, 'GEMINI_API_KEY');
if (geminiKey) ok('GEMINI_API_KEY ayarli');
else warn('GEMINI_API_KEY bos (LLM analiz calismaz)');

const supabaseUrl = pick(env, 'SUPABASE_URL') || pick(env, 'NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = pick(env, 'SUPABASE_SERVICE_ROLE_KEY') || pick(env, 'SUPABASE_SERVICE_KEY');
const supabaseStrict = ['1', 'true', 'yes', 'on'].includes(pick(env, 'WARDROBE_REQUIRE_SUPABASE').toLowerCase());

if (supabaseUrl && supabaseKey) {
  ok('Supabase URL + service key ayarli');
} else if (supabaseStrict) {
  fail('WARDROBE_REQUIRE_SUPABASE=true ama SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik');
  hasFailure = true;
} else {
  warn('Supabase cloud sync ayarsiz (opsiyonel)');
}

const catalogSeed = readCatalogSeed();
if (!catalogSeed.ok) {
  fail('data/catalog-seed.json okunamadi');
  hasFailure = true;
} else if (catalogSeed.fragranceCount >= 20 && catalogSeed.moleculeCount >= 20 && catalogSeed.everyFragranceHasThreeMolecules) {
  ok(`Katalog seed hazir (${catalogSeed.fragranceCount} parfum, ${catalogSeed.moleculeCount} molekul)`);
} else {
  fail(`Katalog seed eksik (parfum=${catalogSeed.fragranceCount}, molekul=${catalogSeed.moleculeCount}, 3+ molekul=${catalogSeed.everyFragranceHasThreeMolecules})`);
  hasFailure = true;
}

if (supabaseUrl && supabaseKey) {
  ok('Catalog seed Supabase ortam degiskenleri ile yuklenebilir');
} else {
  warn('Supabase katalog env eksik; uygulama katalogu seed fallback ile calistirir');
}

if (exists('docs/supabase_schema.sql')) ok('Supabase schema dosyasi mevcut');
else {
  fail('docs/supabase_schema.sql bulunamadi');
  hasFailure = true;
}

if (exists('flutterw.ps1') && exists('flutterw.cmd')) ok('Flutter wrapper scriptleri mevcut');
else warn('Flutter wrapper scriptlerinden biri eksik');

if (exists('flutter_sdk/flutter/bin/flutter.bat')) ok('Yerel Flutter SDK bulundu');
else warn('Yerel Flutter SDK bulunamadi (mobil build icin Flutter kurulu olmali)');

const mobileBillingProvider = pick(env, 'MOBILE_BILLING_PROVIDER').toLowerCase();
if (!mobileBillingProvider || mobileBillingProvider === 'none') {
  ok('RevenueCat mobil tarafta opsiyonel/kapali');
} else if (mobileBillingProvider === 'revenuecat') {
  const rcKey = pick(env, 'MOBILE_REVENUECAT_PUBLIC_SDK_KEY');
  if (rcKey) ok('RevenueCat key ayarli');
  else warn('MOBILE_BILLING_PROVIDER=revenuecat ama MOBILE_REVENUECAT_PUBLIC_SDK_KEY bos');
} else {
  warn(`Mobil billing provider=${mobileBillingProvider} (RevenueCat disi)`);
}

if (exists('BILLING_PRODUCTION_CHECKLIST_TR.md')) {
  ok('Billing checklist dosyasi mevcut');
} else {
  fail('BILLING_PRODUCTION_CHECKLIST_TR.md bulunamadi');
  hasFailure = true;
}

const billingProvider = (pick(env, 'BILLING_PROVIDER') || 'manual').toLowerCase();
const requiredByProvider = {
  manual: ['BILLING_CHECKOUT_URL_PRO', 'BILLING_WEBHOOK_SECRET'],
  stripe: [
    'BILLING_STRIPE_SECRET_KEY',
    'BILLING_STRIPE_PRICE_ID_PRO',
    'BILLING_STRIPE_SUCCESS_URL',
    'BILLING_STRIPE_CANCEL_URL',
    'BILLING_WEBHOOK_SECRET',
  ],
  paddle: ['BILLING_PADDLE_API_KEY', 'BILLING_PADDLE_PRICE_ID_PRO', 'BILLING_WEBHOOK_SECRET'],
};

const required = requiredByProvider[billingProvider] || requiredByProvider.manual;
const missing = required.filter((key) => !pick(env, key));
if (missing.length === 0) {
  ok(`Billing provider (${billingProvider}) envleri tamam`);
} else {
  warn(`Billing provider (${billingProvider}) icin eksik env: ${missing.join(', ')}`);
}

console.log('');
if (hasFailure) {
  console.log('Readiness sonucu: BASARISIZ (kritik eksik var)');
  process.exitCode = 1;
} else {
  console.log('Readiness sonucu: TAMAMLANDI (kritik hata yok)');
}
