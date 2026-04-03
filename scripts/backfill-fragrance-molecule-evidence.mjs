import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const { loadCatalogSeed, buildCatalogRecords, seedCatalog } = require('../lib/server/catalog-seed');

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

const seed = loadCatalogSeed();
const records = buildCatalogRecords(seed);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log(
    JSON.stringify(
      {
        mode: 'dry-run',
        fragranceCount: records.fragrances.length,
        moleculeCount: records.molecules.length,
        evidenceRelationCount: Array.isArray(records.relations) ? records.relations.length : 0,
        stats: records.stats || {},
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const result = await seedCatalog({
  url: process.env.SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  moleculeTable: process.env.SUPABASE_MOLECULES_TABLE || 'molecules',
  fragranceTable: process.env.SUPABASE_FRAGRANCES_TABLE || 'fragrances',
  evidenceTable: process.env.SUPABASE_FRAGRANCE_MOLECULE_EVIDENCE_TABLE || 'fragrance_molecule_evidence',
});

console.log(JSON.stringify(result, null, 2));
