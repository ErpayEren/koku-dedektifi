/* Koku App Module: labs-core */
const COMMUNITY_VOTE_LOCK_KEY = 'koku-community-vote-lock-v1';
let communityVoteInFlight = false;

function readCommunityVoteLocks() {
  try {
    const raw = localStorage.getItem(COMMUNITY_VOTE_LOCK_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCommunityVoteLocks(next) {
  try {
    localStorage.setItem(COMMUNITY_VOTE_LOCK_KEY, JSON.stringify(next || {}));
  } catch {}
}

function getCommunityVoteLock(perfumeName) {
  const key = normalizeScentKey(perfumeName);
  if (!key) return '';
  const locks = readCommunityVoteLocks();
  const today = getTodayIsoDate();
  return cleanPreferenceText(locks[key] || '', 20) === today ? today : '';
}

function markCommunityVoteLock(perfumeName) {
  const key = normalizeScentKey(perfumeName);
  if (!key) return;
  const locks = readCommunityVoteLocks();
  locks[key] = getTodayIsoDate();
  writeCommunityVoteLocks(locks);
}

function applyCommunityVoteButtonState(perfumeName) {
  const section = document.getElementById('sec-community-pulse');
  if (!section) return false;
  const locked = Boolean(getCommunityVoteLock(perfumeName));
  section.querySelectorAll('.community-vote-grid .feedback-chip').forEach((btn) => {
    btn.disabled = locked || communityVoteInFlight;
  });
  return locked;
}

function formatWearSummary(shelfState) {
  const summary = window.KokuLabs?.summarizeWear?.(shelfState) || { activeDays: 0, totalSprays: 0 };
  if (!summary.activeDays) {
    return 'SOTD kaydi yok. Dolaptan bir koku secip "Bugun bunu sikiyorum" de.';
  }
  return `Son kayit: ${summary.activeDays} aktif gun, toplam ${summary.totalSprays} SOTD isareti.`;
}

function pushFeedEvent(eventType, payload = {}) {
  window.KokuLabs?.pushFeed?.(eventType, payload);
  renderFeed();
  scheduleFeedSync('new_event');
}

function renderFeed() {
  const section = document.getElementById('feed-section');
  const grid = document.getElementById('feed-grid');
  if (!section || !grid) return;

  const rows = window.KokuLabs?.readFeed?.() || [];
  if (!rows.length) {
    section.style.display = 'none';
    grid.innerHTML = '';
    return;
  }

  section.style.display = 'block';
  grid.innerHTML = rows.slice(0, 24).map((row) => {
    const ts = new Date(row.ts || Date.now());
    const dateLabel = Number.isFinite(ts.getTime())
      ? ts.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '-';
    const perfume = cleanPreferenceText(row?.payload?.perfume || row?.payload?.name || '', 90);
    const textMap = {
      analysis_done: `${perfume || 'Yeni koku'} analizi tamamlandi`,
      shelf_sotd: `${perfume || 'Bir koku'} bugunun kokusu secildi`,
      vote_sent: `${perfume || 'Bu koku'} icin topluluk oyu gonderildi`,
      finder_run: 'Nota Avcisi sorgusu calistirildi',
      layering_run: `${perfume || 'Layering'} sonucu olusturuldu`,
    };
    const text = textMap[row.event] || cleanPreferenceText(row.event || 'Etkinlik', 70);
    return `
      <div class="history-item">
        <div class="history-item-info">
          <div class="history-item-badge muted">${safeText(dateLabel)}</div>
          <div class="history-item-name">${safeText(text)}</div>
          <div class="history-item-date">${safeText(cleanPreferenceText(row?.payload?.detail || '', 120))}</div>
        </div>
      </div>
    `;
  }).join('');
}

function clearFeed() {
  try {
    localStorage.removeItem('koku-community-feed-v1');
  } catch {}
  renderFeed();
  scheduleFeedSync('clear');
}

function readFeedRows() {
  return Array.isArray(window.KokuLabs?.readFeed?.()) ? window.KokuLabs.readFeed() : [];
}

function writeFeedRows(rows) {
  if (typeof window.KokuLabs?.writeFeed === 'function') {
    window.KokuLabs.writeFeed(rows);
    return;
  }
  try {
    localStorage.setItem('koku-community-feed-v1', JSON.stringify(Array.isArray(rows) ? rows : []));
  } catch {}
}

async function pullFeedFromCloud(options = {}) {
  const userId = getActiveAuthUserId();
  if (!authToken || !userId) return false;
  if (!options.force && feedHydratedUserId === userId) return true;
  if (!window.KokuLabs?.fetchCloudFeed) return false;

  try {
    const data = await window.KokuLabs.fetchCloudFeed(authToken);
    const remoteRows = Array.isArray(data?.feed) ? data.feed : [];
    const merged = window.KokuLabs?.mergeFeed ? window.KokuLabs.mergeFeed(remoteRows) : remoteRows;
    if (!window.KokuLabs?.mergeFeed) {
      writeFeedRows(merged);
    }
    feedHydratedUserId = userId;
    renderFeed();
    emitEvent('feed_sync_pull_ok', {
      storage: cleanPreferenceText(data?.storage || 'unknown', 24),
    });
    if (cleanPreferenceText(data?.storage || '', 24) === 'runtime-store') {
      emitEvent('feed_runtime_fallback_detected', { phase: 'pull' });
    }
    scheduleFeedSync('post_pull_reconcile');
    return true;
  } catch {
    emitEvent('feed_sync_pull_error');
    return false;
  }
}

async function pushFeedToCloud(reason = 'local_change') {
  const userId = getActiveAuthUserId();
  if (!authToken || !userId) return false;
  if (!window.KokuLabs?.saveCloudFeed) return false;
  if (feedSyncInFlight) {
    feedSyncQueued = true;
    return false;
  }
  feedSyncInFlight = true;
  try {
    const rows = readFeedRows();
    const data = await window.KokuLabs.saveCloudFeed(authToken, rows);
    emitEvent('feed_sync_push_ok', {
      reason: cleanPreferenceText(reason, 24) || 'unknown',
      storage: cleanPreferenceText(data?.storage || 'unknown', 24),
    });
    if (cleanPreferenceText(data?.storage || '', 24) === 'runtime-store') {
      emitEvent('feed_runtime_fallback_detected', { phase: 'push' });
    }
    return true;
  } catch {
    emitEvent('feed_sync_push_error', { reason: cleanPreferenceText(reason, 24) || 'unknown' });
    return false;
  } finally {
    feedSyncInFlight = false;
    if (feedSyncQueued) {
      feedSyncQueued = false;
      scheduleFeedSync('queued_retry');
    }
  }
}

function scheduleFeedSync(reason = 'local_change') {
  if (!authToken || !getActiveAuthUserId()) return;
  if (feedSyncTimer) clearTimeout(feedSyncTimer);
  feedSyncTimer = setTimeout(() => {
    feedSyncTimer = null;
    pushFeedToCloud(reason);
  }, 1200);
}

function markSotd(name) {
  const key = normalizeScentKey(name);
  if (!key) return;
  const shelf = readShelfState();
  const prev = normalizeShelfEntry(shelf[key]) || null;
  if (!prev?.name) {
    showToast('Once bu kokuyu dolabina eklemelisin.');
    return;
  }
  const today = getTodayIsoDate();
  const wear = prev.wear && typeof prev.wear === 'object' ? { ...prev.wear } : {};
  wear[today] = Number(wear[today] || 0) + 1;
  const next = {
    ...prev,
    wear,
    lastWornAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  shelf[key] = next;
  writeShelfState(shelf);
  renderShelf();
  pushFeedEvent('shelf_sotd', { perfume: prev.name, detail: `${today} icin isaretlendi` });
  emitEvent('sotd_marked', { perfume: cleanPreferenceText(prev.name, 80) });
  showToast(`${prev.name} bugunun kokusu olarak kaydedildi`);
}

function renderCommunityPulseData(data) {
  const section = document.getElementById('sec-community-pulse');
  const summary = document.getElementById('community-pulse-summary');
  const longevityFill = document.getElementById('community-longevity-fill');
  const longevityValue = document.getElementById('community-longevity-value');
  const sillageFill = document.getElementById('community-sillage-fill');
  const sillageValue = document.getElementById('community-sillage-value');
  if (!section || !summary || !longevityFill || !longevityValue || !sillageFill || !sillageValue) return;
  const perfumeName = cleanPreferenceText(currentResultData?.name || data?.perfume || '', 140);
  const voteLocked = applyCommunityVoteButtonState(perfumeName);

  if (!data || !data.ok) {
    summary.textContent = 'Topluluk verisi henuz olusmadi. Ilk oyu sen ver.';
    longevityFill.style.width = '0%';
    sillageFill.style.width = '0%';
    longevityValue.textContent = '-';
    sillageValue.textContent = '-';
    section.style.display = '';
    return;
  }

  const strongPct = Number(data?.longevity?.pct?.strong || 0);
  const balancedLongevityPct = Number(data?.longevity?.pct?.balanced || 0);
  const weakLongevityPct = Number(data?.longevity?.pct?.weak || 0);
  const loudPct = Number(data?.sillage?.pct?.loud || 0);
  const moderateSillagePct = Number(data?.sillage?.pct?.moderate || 0);
  const softSillagePct = Number(data?.sillage?.pct?.soft || 0);
  longevityFill.style.width = `${Math.max(0, Math.min(100, strongPct))}%`;
  sillageFill.style.width = `${Math.max(0, Math.min(100, loudPct))}%`;
  longevityValue.textContent = `${strongPct}%`;
  sillageValue.textContent = `${loudPct}%`;
  summary.textContent = `${data.total || 0} topluluk oyu. Kalicilik: guclu ${strongPct}% • dengeli ${balancedLongevityPct}% • hafif ${weakLongevityPct}%. Yayilim: guclu ${loudPct}% • dengeli ${moderateSillagePct}% • hafif ${softSillagePct}%.`;
  if (voteLocked) {
    const status = document.getElementById('community-vote-status');
    if (status && !status.textContent) status.textContent = 'Bugun bu parfum icin oyunu kullandin.';
  }
  section.style.display = '';
}

async function loadCommunityPulse(perfumeName) {
  const section = document.getElementById('sec-community-pulse');
  if (!section || !perfumeName) return;
  section.style.display = '';
  try {
    const data = await window.KokuLabs?.getCommunityPulse?.(perfumeName);
    renderCommunityPulseData(data);
  } catch {
    renderCommunityPulseData(null);
  }
}

async function submitCommunityVote(longevity, sillage) {
  const status = document.getElementById('community-vote-status');
  if (!currentResultData?.name) return;
  if (communityVoteInFlight) return;
  if (getCommunityVoteLock(currentResultData.name)) {
    applyCommunityVoteButtonState(currentResultData.name);
    if (status) status.textContent = 'Bugun bu parfum icin oyunu zaten kullandin.';
    return;
  }

  communityVoteInFlight = true;
  applyCommunityVoteButtonState(currentResultData.name);
  if (status) status.textContent = 'Oy gonderiliyor...';
  try {
    const data = await window.KokuLabs?.sendCommunityVote?.({
      perfume: currentResultData.name,
      longevity,
      sillage,
    });
    if (data?.duplicate) {
      markCommunityVoteLock(currentResultData.name);
      applyCommunityVoteButtonState(currentResultData.name);
      renderCommunityPulseData(data);
      if (status) status.textContent = cleanPreferenceText(data.message || 'Bugun bu parfum icin oy verdin.', 120);
      return;
    }

    markCommunityVoteLock(currentResultData.name);
    applyCommunityVoteButtonState(currentResultData.name);
    renderCommunityPulseData(data);
    if (status) status.textContent = 'Tesekkurler, oyun kaydedildi.';
    pushFeedEvent('vote_sent', { perfume: currentResultData.name, detail: `${longevity}/${sillage}` });
    emitEvent('community_vote_sent', {
      longevity,
      sillage,
      perfume: cleanPreferenceText(currentResultData.name, 80),
    });
  } catch (error) {
    if (status) status.textContent = cleanPreferenceText(error?.message || 'Oy gonderilemedi.', 120);
  } finally {
    communityVoteInFlight = false;
    applyCommunityVoteButtonState(currentResultData.name);
  }
}

function renderStoreLinks(result) {
  const section = document.getElementById('sec-store-links');
  const wrap = document.getElementById('store-link-list');
  if (!section || !wrap) return;
  const name = cleanPreferenceText(result?.name || '', 140);
  const links = window.KokuLabs?.getStoreLinks?.(name) || [];
  if (!name || !links.length) {
    section.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  section.style.display = '';
  wrap.innerHTML = links.map((link) => {
    const encodedUrl = encodeURIComponent(cleanPreferenceText(link.url, 420));
    const encodedLabel = encodeURIComponent(cleanPreferenceText(link.label, 64));
    return `
    <button class="decision-btn store-link-btn" type="button" data-url="${encodedUrl}" data-label="${encodedLabel}">
      ${safeText(link.label)}'de Ara
    </button>
  `;
  }).join('') + `<button class="decision-btn ghost" type="button" onclick="openStoreLocator()">Yakin Magaza Ac</button>`;
  wrap.querySelectorAll('.store-link-btn').forEach((node) => {
    node.addEventListener('click', () => {
      const encodedUrl = cleanPreferenceText(node.getAttribute('data-url') || '', 460);
      const encodedLabel = cleanPreferenceText(node.getAttribute('data-label') || '', 90);
      let url = '';
      let label = '';
      try {
        url = decodeURIComponent(encodedUrl);
        label = decodeURIComponent(encodedLabel);
      } catch {
        url = encodedUrl;
        label = encodedLabel;
      }
      openStoreLink(url, label);
    });
  });
}

function openStoreLink(url, providerLabel = '') {
  const targetUrl = cleanPreferenceText(url, 420);
  if (!targetUrl) return;
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
  emitEvent('store_link_click', {
    provider: cleanPreferenceText(providerLabel, 40) || 'store',
    perfume: cleanPreferenceText(currentResultData?.name || '', 90),
  });
  pushFeedEvent('analysis_done', {
    perfume: cleanPreferenceText(currentResultData?.name || '', 120),
    detail: `${cleanPreferenceText(providerLabel, 40) || 'Magaza'} linki acildi`,
  });
}

function openStoreLocator() {
  const perfumeName = cleanPreferenceText(currentResultData?.name || '', 140);
  if (!perfumeName) return;
  const query = `${perfumeName} sephora beymen boyner parfum`;
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  emitEvent('store_locator_opened', { perfume: cleanPreferenceText(perfumeName, 90) });
}
