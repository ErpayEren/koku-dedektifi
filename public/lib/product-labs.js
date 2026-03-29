(function initKokuLabs(global) {
  const FEED_KEY = 'koku-community-feed-v1';
  const FEED_MAX = 120;

  function cleanString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeText(value) {
    return cleanString(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function readFeed() {
    try {
      const raw = localStorage.getItem(FEED_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeFeed(rows) {
    try {
      localStorage.setItem(FEED_KEY, JSON.stringify(rows.slice(0, FEED_MAX)));
    } catch {}
  }

  function replaceFeed(rows) {
    const next = Array.isArray(rows) ? rows.slice(0, FEED_MAX) : [];
    writeFeed(next);
    return next;
  }

  function mergeFeed(remoteRows) {
    const localRows = readFeed();
    const seen = new Set();
    const out = [];
    [...(Array.isArray(remoteRows) ? remoteRows : []), ...localRows].forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const id = cleanString(row.id) || `${cleanString(row.event)}:${cleanString(row.ts)}`;
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push({
        id,
        event: cleanString(row.event).slice(0, 40),
        payload: row.payload && typeof row.payload === 'object' ? row.payload : {},
        ts: cleanString(row.ts) || new Date().toISOString(),
      });
    });
    out.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
    return replaceFeed(out.slice(0, FEED_MAX));
  }

  function pushFeed(eventType, payload = {}) {
    const row = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      event: cleanString(eventType).slice(0, 40),
      payload: payload && typeof payload === 'object' ? payload : {},
      ts: new Date().toISOString(),
    };
    const next = [row, ...readFeed()].slice(0, FEED_MAX);
    writeFeed(next);
    return row;
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(cleanString(data?.error) || `HTTP ${response.status}`);
    }
    return data;
  }

  async function getCommunityPulse(perfumeName) {
    const name = cleanString(perfumeName).slice(0, 140);
    if (!name) return null;
    return fetchJson(`/api/perfume-vote?perfume=${encodeURIComponent(name)}`, { method: 'GET' });
  }

  async function sendCommunityVote(payload) {
    const body = payload && typeof payload === 'object' ? payload : {};
    return fetchJson('/api/perfume-vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async function runFinder(filters) {
    const body = filters && typeof filters === 'object' ? filters : {};
    return fetchJson('/api/perfume-finder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async function runLayeringLab(left, right, context = {}) {
    const payload = {
      left: cleanString(left).slice(0, 140),
      right: cleanString(right).slice(0, 140),
    };
    if (context && typeof context === 'object') {
      if (context.leftProfile && typeof context.leftProfile === 'object') {
        payload.leftProfile = context.leftProfile;
      }
      if (context.rightProfile && typeof context.rightProfile === 'object') {
        payload.rightProfile = context.rightProfile;
      }
    }

    return fetchJson('/api/layering-lab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async function fetchCloudFeed(token) {
    const authToken = cleanString(token);
    if (!authToken) return null;
    return fetchJson('/api/feed', {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
  }

  async function saveCloudFeed(token, rows) {
    const authToken = cleanString(token);
    if (!authToken) return null;
    return fetchJson('/api/feed', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ feed: Array.isArray(rows) ? rows : [] }),
    });
  }

  async function lookupBarcode(code) {
    const value = cleanString(code);
    if (!value) throw new Error('barcode gerekli');
    return fetchJson(`/api/barcode-lookup?code=${encodeURIComponent(value)}`, { method: 'GET' });
  }

  function getStoreLinks(perfumeName) {
    return global.KokuOfficialLinks?.getStoreLinks?.(perfumeName) || [];
  }

  function summarizeWear(shelfState) {
    const src = shelfState && typeof shelfState === 'object' ? shelfState : {};
    const totals = {};
    Object.values(src).forEach((entry) => {
      const wear = entry?.wear && typeof entry.wear === 'object' ? entry.wear : {};
      Object.entries(wear).forEach(([date, count]) => {
        const normalizedDate = cleanString(date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) return;
        totals[normalizedDate] = Number(totals[normalizedDate] || 0) + Number(count || 0);
      });
    });
    const days = Object.keys(totals).sort().reverse();
    return {
      activeDays: days.length,
      totalSprays: Object.values(totals).reduce((sum, count) => sum + Number(count || 0), 0),
      latestDays: days.slice(0, 14).map((day) => ({ day, count: totals[day] })),
    };
  }

  global.KokuLabs = {
    normalizeText,
    readFeed,
    writeFeed: replaceFeed,
    mergeFeed,
    pushFeed,
    fetchCloudFeed,
    saveCloudFeed,
    lookupBarcode,
    getCommunityPulse,
    sendCommunityVote,
    runFinder,
    runLayeringLab,
    getStoreLinks,
    summarizeWear,
  };
})(window);
