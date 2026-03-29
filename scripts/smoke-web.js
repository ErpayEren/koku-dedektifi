#!/usr/bin/env node
/* eslint-disable no-console */
const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://koku-dedektifi.vercel.app').replace(/\/+$/, '');

async function getJson(path) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return {
    path,
    url,
    status: res.status,
    ok: res.ok,
    data,
  };
}

async function run() {
  const checks = await Promise.all([
    getJson('/api/health'),
    getJson('/api/wardrobe-health'),
    getJson('/api/feed-health'),
    getJson('/api/billing'),
  ]);

  let fail = false;
  checks.forEach((item) => {
    const ready = item?.data?.ready;
    const summary = [
      item.path,
      `status=${item.status}`,
      `ok=${item.ok}`,
      ready === undefined ? '' : `ready=${String(ready)}`,
    ].filter(Boolean).join(' ');
    console.log(summary);

    if (!item.ok) fail = true;
    if ((item.path === '/api/health' || item.path === '/api/wardrobe-health' || item.path === '/api/feed-health')
      && item?.data?.ready !== true) {
      fail = true;
    }
  });

  if (fail) {
    console.error('\nSmoke check failed.');
    process.exit(1);
  }

  console.log('\nSmoke check passed.');
}

run().catch((error) => {
  console.error('Smoke check crashed:', error?.message || error);
  process.exit(1);
});
