#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const baseUrl = String(process.env.GUARDRAIL_BASE_URL || 'https://koku-dedektifi.vercel.app').replace(/\/+$/, '');

const budgets = {
  appJsMaxBytes: Number(process.env.BUDGET_APP_JS_MAX || 130000),
  initialJsMaxBytes: Number(process.env.BUDGET_INITIAL_JS_MAX || 320000),
};

function readText(filePath) {
  return fs.readFileSync(path.join(root, filePath), 'utf8');
}

function fileSize(filePath) {
  return fs.statSync(path.join(root, filePath)).size;
}

function parseLocalScriptSources(indexHtml) {
  const srcRegex = /<script[^>]+src="([^"]+)"[^>]*><\/script>/g;
  const sources = [];
  let match = null;
  while ((match = srcRegex.exec(indexHtml)) !== null) {
    const src = String(match[1] || '').trim();
    if (!src) continue;
    if (/^https?:\/\//i.test(src)) continue;
    if (!src.startsWith('/')) continue;
    sources.push(src);
  }
  return sources;
}

async function getJson(apiPath) {
  const url = `${baseUrl}${apiPath}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return {
    apiPath,
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function run() {
  const errors = [];
  const results = [];

  const appJsBytes = fileSize('app.js');
  results.push(`app.js = ${appJsBytes} bytes (budget ${budgets.appJsMaxBytes})`);
  if (appJsBytes > budgets.appJsMaxBytes) {
    errors.push(`app.js budget exceeded: ${appJsBytes} > ${budgets.appJsMaxBytes}`);
  }

  const indexHtml = readText('index.html');
  const scriptSources = parseLocalScriptSources(indexHtml);
  const initialScriptFiles = scriptSources
    .filter((src) => src !== '/lib/app/advisor.js' && src !== '/lib/app/labs-overlays.js');
  const initialBytes = initialScriptFiles.reduce((sum, src) => {
    const localPath = src.replace(/^\//, '');
    try {
      return sum + fileSize(localPath);
    } catch {
      return sum;
    }
  }, 0);

  results.push(`initial JS = ${initialBytes} bytes (budget ${budgets.initialJsMaxBytes})`);
  if (initialBytes > budgets.initialJsMaxBytes) {
    errors.push(`initial JS budget exceeded: ${initialBytes} > ${budgets.initialJsMaxBytes}`);
  }

  const [health, wardrobeHealth, feedHealth] = await Promise.all([
    getJson('/api/health'),
    getJson('/api/wardrobe-health'),
    getJson('/api/feed-health'),
  ]);

  const healthReady = health?.data?.ready === true;
  const wardrobeReady = wardrobeHealth?.data?.ready === true;
  const feedReady = feedHealth?.data?.ready === true;
  const sentryReady = health?.data?.checks?.sentryConfigured === true;

  results.push(`/api/health status=${health.status} ready=${String(healthReady)} sentry=${String(sentryReady)}`);
  results.push(`/api/wardrobe-health status=${wardrobeHealth.status} ready=${String(wardrobeReady)}`);
  results.push(`/api/feed-health status=${feedHealth.status} ready=${String(feedReady)}`);

  if (!health.ok || !healthReady) errors.push('/api/health failed readiness gate');
  if (!wardrobeHealth.ok || !wardrobeReady) errors.push('/api/wardrobe-health failed readiness gate');
  if (!feedHealth.ok || !feedReady) errors.push('/api/feed-health failed readiness gate');
  if (!sentryReady) errors.push('Sentry not configured in production health checks');

  console.log('Launch guardrail report');
  console.log('-----------------------');
  results.forEach((line) => console.log(line));

  if (errors.length > 0) {
    console.error('\nGuardrail blocked release:');
    errors.forEach((line) => console.error(`- ${line}`));
    process.exit(1);
  }

  console.log('\nAll launch guardrails passed.');
}

run().catch((error) => {
  console.error('Launch guardrail crashed:', error?.message || error);
  process.exit(1);
});
