import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

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

loadEnvFile('.env.production.temp');
loadEnvFile('.env.local');
loadEnvFile('.env');

const key = process.env.METRICS_API_KEY || '';
if (!key) {
  throw new Error('METRICS_API_KEY bulunamadi. once .env.production.temp veya .env.local doldur.');
}

const response = await fetch('https://koku-dedektifi.vercel.app/api/ops?r=catalog-seed', {
  method: 'POST',
  headers: {
    'x-metrics-key': key,
    'Content-Type': 'application/json',
  },
});

const payload = await response.json().catch(() => ({}));

if (!response.ok) {
  throw new Error(payload?.error || `Prod catalog seed basarisiz (${response.status})`);
}

console.log(JSON.stringify(payload, null, 2));
