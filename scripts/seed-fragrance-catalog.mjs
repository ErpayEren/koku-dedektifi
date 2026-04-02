import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const { seedCatalog } = require('../lib/server/catalog-seed');

function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL veya service role key bulunamadi. Once .env.local veya ortam degiskenlerini tanimla.');
}

const result = await seedCatalog({
  url: supabaseUrl,
  serviceRoleKey: supabaseKey,
  moleculeTable: process.env.SUPABASE_MOLECULES_TABLE || 'molecules',
  fragranceTable: process.env.SUPABASE_FRAGRANCES_TABLE || 'fragrances',
});

console.log(
  `Catalog seed tamamlandi. Molekuller: ${result.moleculeCount}, parfumler: ${result.fragranceCount}`,
);
