#!/usr/bin/env node
/**
 * Brewno seed script — inserts specialty coffees and brew guides into Supabase.
 * Usage: node scripts/seed-brewno.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const seedPath = join(__dirname, '../data/brewno-seed.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));

async function seedCoffees() {
  console.log(`☕ Seeding ${seed.coffees.length} coffees…`);

  const { data, error } = await supabase
    .from('coffees')
    .upsert(seed.coffees, { onConflict: 'slug', ignoreDuplicates: false })
    .select('slug');

  if (error) {
    console.error('❌ Coffee seed error:', error.message);
    return;
  }

  console.log(`✅ Seeded ${data.length} coffees`);
}

async function seedBrewGuides() {
  console.log(`📖 Seeding ${seed.brewGuides.length} brew guides…`);

  const { data, error } = await supabase
    .from('brew_guides')
    .upsert(seed.brewGuides, { onConflict: 'method', ignoreDuplicates: false })
    .select('method');

  if (error) {
    console.error('❌ Brew guide seed error:', error.message);
    return;
  }

  console.log(`✅ Seeded ${data.length} brew guides`);
}

async function main() {
  console.log('🚀 Starting Brewno seed…');
  await seedCoffees();
  await seedBrewGuides();
  console.log('✨ Brewno seed complete!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
