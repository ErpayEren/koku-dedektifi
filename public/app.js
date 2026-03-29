// ── IndexedDB — görsel verileri için (localStorage yerine) ──────────────────
const IDB = window.KokuCore?.IDB || (() => {
  const DB_NAME = 'koku-dedektifi-db';
  const DB_VER  = 1;
  const STORE   = 'images';
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => e.target.result.createObjectStore(STORE);
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  async function set(key, value) {
    try {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror    = e => reject(e.target.error);
      });
    } catch(e) { console.warn('IDB.set failed', e); }
  }

  async function get(key) {
    try {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror   = e => reject(e.target.error);
      });
    } catch(e) { console.warn('IDB.get failed', e); return null; }
  }

  async function del(key) {
    try {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror    = e => reject(e.target.error);
      });
    } catch(e) { console.warn('IDB.del failed', e); }
  }

  async function clearAll() {
    try {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror    = e => reject(e.target.error);
      });
    } catch(e) { console.warn('IDB.clearAll failed', e); }
  }

  return { set, get, del, clearAll };
})();

// XSS koruması — AI çıktılarını sanitize et
function safe(str) {
  if (window.KokuCore?.safe) return window.KokuCore.safe(str);
  if (!str) return '';
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(String(str), { ALLOWED_TAGS: ['strong','em','br','sub','sup'], ALLOWED_ATTR: [] });
  }
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function safeText(str) {
  if (window.KokuCore?.safeText) return window.KokuCore.safeText(str);
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function emitEvent(eventName, props = {}) {
  if (window.KokuCore?.emitEvent) {
    return window.KokuCore.emitEvent(eventName, props);
  }
  try {
    if (!eventName || typeof eventName !== 'string') return;
    const payload = {
      event: eventName,
      props: props && typeof props === 'object' ? props : {},
    };
    fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((error) => {
      if (window.KokuCore?.emitClientError) {
        window.KokuCore.emitClientError('warn', 'event_emit_failed', {
          eventName,
          reason: String(error?.message || 'fetch_failed').slice(0, 120),
        });
      }
    });
  } catch (error) {
    if (window.KokuCore?.emitClientError) {
      window.KokuCore.emitClientError('warn', 'event_emit_exception', {
        eventName: String(eventName || '').slice(0, 80),
        reason: String(error?.message || 'unknown').slice(0, 120),
      });
    }
  }
}

const SCENT_TOKEN_FALLBACK = 'signature';

function sanitizeIconToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '');
}

function resolvePremiumIconToken(resultLike, fallback = SCENT_TOKEN_FALLBACK) {
  const raw = sanitizeIconToken(resultLike?.iconToken || resultLike?.emoji || '');
  if (raw) {
    return window.KokuIcons?.normalizeToken ? window.KokuIcons.normalizeToken(raw) : raw;
  }

  if (!resultLike || typeof resultLike !== 'object') {
    return window.KokuIcons?.normalizeToken ? window.KokuIcons.normalizeToken(fallback) : fallback;
  }

  const resolved = sanitizeIconToken(window.KokuEmoji?.resolve?.(resultLike) || '');
  if (resolved) {
    return window.KokuIcons?.normalizeToken ? window.KokuIcons.normalizeToken(resolved) : resolved;
  }

  return window.KokuIcons?.normalizeToken ? window.KokuIcons.normalizeToken(fallback) : fallback;
}

function iconMarkup(token, className = 'scent-badge-icon') {
  if (!window.KokuIcons?.markup) return '';
  return window.KokuIcons.markup(resolvePremiumIconToken({ iconToken: token }), className);
}

function renderIcon(target, token, className = 'scent-badge-icon') {
  if (!target) return;
  const resolved = resolvePremiumIconToken({ iconToken: token });
  const markup = iconMarkup(resolved, className);
  target.dataset.iconToken = resolved;
  target.innerHTML = markup;
}

const PERSONA_ICON_MAP = {
  gender: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="8.5" cy="8.5" r="4"/>
      <path d="M11.3 5.7L16 1m0 0h5m-5 0v5"/>
      <path d="M8.5 12.5v8.5M5.2 17.8h6.6"/>
    </svg>
  `,
  age: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="8"/>
      <path d="M12 7.4v4.9l3 1.8"/>
    </svg>
  `,
  vibe: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 21s7-4.7 7-11a4 4 0 0 0-7-2.5A4 4 0 0 0 5 10c0 6.3 7 11 7 11z"/>
    </svg>
  `,
  occasion: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="6" width="16" height="14" rx="2"/>
      <path d="M8 4v4M16 4v4M4 10h16"/>
    </svg>
  `,
  season: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
  `,
};

function personaIconMarkup(token) {
  const svg = PERSONA_ICON_MAP[token] || PERSONA_ICON_MAP.vibe;
  return `<span class="persona-inline-icon" data-icon="${safeText(token)}" aria-hidden="true">${svg}</span>`;
}

function getHistoryMonogram(name) {
  const cleaned = cleanPreferenceText(name || '', 120);
  if (!cleaned) return 'KD';
  const words = cleaned
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return cleaned.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}


let imageBase64 = null;
let imageMimeType = 'image/jpeg';
let activeTab = 'photo'; // 'photo' | 'text' | 'notes'
let deferredInstallPrompt = null;
let toastTimeout = null;
const AUTH_TOKEN_KEY = 'koku-auth-token';
const ONBOARDING_PROFILE_KEY = 'koku-onboarding-profile-v1';
const ONBOARDING_DONE_KEY = 'koku-onboarding-done-v1';
const RETENTION_STATE_KEY = 'koku-retention-state-v1';
const BILLING_HINT_KEY = 'koku-billing-last-open-v1';
const SHELF_STATE_KEY = 'koku-shelf-v1';
const SHELF_STATE_KEY_PREFIX = 'koku-shelf-v2';
const SHELF_STATE_KEY_GUEST = `${SHELF_STATE_KEY_PREFIX}:guest`;
const FEEDBACK_STATE_KEY = 'koku-feedback-v1';
const MOLECULE_STABILITY_KEY = 'koku-molecule-stability-v1';
const BUILD_REVISION = '2026.03.29-r12';
const SW_BUILD_QUERY = `?v=${encodeURIComponent(BUILD_REVISION)}`;
const ANALYSIS_REQUEST_TIMEOUT_MS = 22000;
let authToken = '';
let authUser = null;
let authMode = 'login';
let currentResultData = null;
let deepDiveExpanded = false;
let shelfFilterState = 'all';
let compareResultState = null;
let billingState = {
  provider: 'manual',
  plans: [],
  entitlement: { tier: 'free', status: 'active', source: 'default' },
  devActivationAllowed: false,
};
let onboardingProfile = {
  purpose: '',
  budgetBand: '',
  favoriteFamilies: [],
};
let wardrobeSyncTimer = null;
let wardrobeSyncInFlight = false;
let wardrobeSyncQueued = false;
let wardrobeHydratedUserId = '';
let wardrobeLastPushAt = '';
let feedSyncTimer = null;
let feedSyncInFlight = false;
let feedSyncQueued = false;
let feedHydratedUserId = '';
let barcodeScannerStream = null;
let barcodeScannerTimer = null;
let retentionState = {
  openCount: 0,
  analysisCount: 0,
  advisorCount: 0,
  authCount: 0,
  profileSaveCount: 0,
  lastOpenAt: '',
  lastAnalysisAt: '',
  lastAdvisorAt: '',
  promptShownAt: {},
  lastSeenGapDays: null,
};
let retentionTimer = null;
let currentGrowthPromptId = '';
const lazyScriptLoads = Object.create(null);
let loadingWatchdogTimeout = null;
const usageQuotaState = {
  remaining: null,
  limit: null,
  updatedAt: 0,
};

if (typeof window.parseNoteListInput !== 'function') {
  window.parseNoteListInput = function parseNoteListInputFallback(raw) {
    const chunks = String(raw || '')
      .replace(/[•]/g, ',')
      .split(/[\n,;|/]+/)
      .map((item) => cleanPreferenceText(item, 40))
      .filter((item) => item.length >= 2);

    const seen = new Set();
    const notes = [];
    chunks.forEach((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      notes.push(item);
    });
    return notes.slice(0, 24);
  };
}

if (typeof window.fillSuggestion !== 'function') {
  window.fillSuggestion = function fillSuggestionFallback(text) {
    const input = document.getElementById('text-input');
    if (!input) return;
    input.value = text;
    checkReady();
  };
}

if (typeof window.fillNoteInput !== 'function') {
  window.fillNoteInput = function fillNoteInputFallback(text) {
    const input = document.getElementById('notes-input');
    if (!input) return;
    input.value = text;
    checkReady();
  };
}

if (typeof window.switchTab !== 'function') {
  window.switchTab = function switchTabFallback(tab) {
    activeTab = tab;
    document.getElementById('tab-photo')?.classList.toggle('active', tab === 'photo');
    document.getElementById('tab-text')?.classList.toggle('active', tab === 'text');
    document.getElementById('tab-notes')?.classList.toggle('active', tab === 'notes');
    document.getElementById('photo-panel')?.classList.toggle('hidden', tab !== 'photo');
    document.getElementById('text-panel')?.classList.toggle('active', tab === 'text');
    document.getElementById('notes-panel')?.classList.toggle('active', tab === 'notes');
    checkReady();
  };
}

function loadLazyScriptOnce(src, key) {
  const cacheKey = String(key || src || '').trim();
  if (!cacheKey) return Promise.resolve(false);
  if (lazyScriptLoads[cacheKey]) return lazyScriptLoads[cacheKey];

  lazyScriptLoads[cacheKey] = new Promise((resolve) => {
    if (document.querySelector(`script[data-koku-lazy="${cacheKey}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.kokuLazy = cacheKey;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return lazyScriptLoads[cacheKey];
}

document.addEventListener('DOMContentLoaded', () => {
  const runBootStep = (name, fn) => {
    try {
      const output = fn?.();
      if (output && typeof output.then === 'function') {
        output.catch((error) => {
          window.KokuCore?.emitClientError?.('error', 'boot_step_async_failed', {
            step: String(name || 'unknown').slice(0, 60),
            reason: String(error?.message || 'unknown').slice(0, 140),
          });
        });
      }
    } catch (error) {
      window.KokuCore?.emitClientError?.('error', 'boot_step_failed', {
        step: String(name || 'unknown').slice(0, 60),
        reason: String(error?.message || 'unknown').slice(0, 140),
      });
    }
  };

  if (typeof renderIcon === 'function') {
    renderIcon(document.getElementById('result-emoji'), SCENT_TOKEN_FALLBACK);
  }
  document.documentElement.dataset.kokuBuild = BUILD_REVISION;
  window.KokuCore?.setupErrorTracking?.({
    tag: 'koku-web',
    getUserId: () => getActiveAuthUserId(),
  });
  emitEvent('app_open', {
    standalone: isStandaloneApp() ? 'yes' : 'no',
  });
  const billingReturnHint = consumeBillingReturnFromUrl();
  document.querySelectorAll('.site-footer span').forEach((node) => {
    node.textContent = String.fromCharCode(8226);
  });
  runBootStep('renderHistory', () => renderHistory());
  runBootStep('renderShelf', () => renderShelf());
  runBootStep('setupInstallPrompt', () => setupInstallPrompt());
  runBootStep('initAuth', () => initAuth());
  runBootStep('initOnboarding', () => initOnboarding());
  runBootStep('initRetention', () => initRetention());
  runBootStep('refreshHealthChip', () => refreshHealthChipV2());
  setInterval(refreshHealthChipV2, 90 * 1000);
  if (billingReturnHint) {
    setTimeout(() => {
      applyBillingReturnHint(billingReturnHint);
    }, 900);
  }

  const mainCard = document.getElementById('main-card');
  const resultCard = document.getElementById('result-card');
  if (mainCard && mainCard.style.display === 'none' && !resultCard?.classList.contains('visible')) {
    mainCard.style.display = '';
  }

  // Enter ile analiz başlat (textarea'da)
  document.getElementById('text-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (document.getElementById('analyze-btn')?.disabled === false) analyze();
    }
  });

  // Upload zone klavye desteği — Enter/Space dosya seçiciyi açar
  document.getElementById('upload-zone')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('file-input')?.click();
    }
  });

  // PWA Service Worker — kayıt ve güncelleme
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`/sw.js${SW_BUILD_QUERY}`)
      .then(reg => reg.update())
      .catch(() => {});
  }
});

const loadingMessages = [
  "Yapay zeka analiz ediyor…",
  "Koku profili oluşturuluyor…",
  "Moleküler yapı belirleniyor…",
  "Benzer kokular eşleştiriliyor…",
  "Sonuçlar hazırlanıyor…",
  "Analiz tamamlanmak üzere…"
];
let loadingTimeout = null;

function startLoadingMessages() {
  const ltEl = document.getElementById('loading-text');
  let idx = 0;

  function showNext() {
    ltEl.style.transition = 'opacity 0.3s ease';
    ltEl.style.opacity = '0';
    loadingTimeout = setTimeout(() => {
      idx = (idx + 1) % loadingMessages.length;
      ltEl.textContent = loadingMessages[idx];
      ltEl.style.opacity = '1';
      loadingTimeout = setTimeout(showNext, 2800);
    }, 300);
  }

  ltEl.style.transition = 'none';
  ltEl.style.opacity = '1';
  ltEl.textContent = loadingMessages[0];
  loadingTimeout = setTimeout(showNext, 2800);
}

function stopLoadingMessages() {
  if (loadingTimeout) { clearTimeout(loadingTimeout); loadingTimeout = null; }
  const ltEl = document.getElementById('loading-text');
  if (ltEl) { ltEl.style.opacity = '1'; ltEl.style.transition = ''; }
}

function clearLoadingWatchdog() {
  if (loadingWatchdogTimeout) {
    clearTimeout(loadingWatchdogTimeout);
    loadingWatchdogTimeout = null;
  }
}

function armLoadingWatchdog() {
  clearLoadingWatchdog();
  loadingWatchdogTimeout = setTimeout(() => {
    const loadingEl = document.getElementById('loading-state');
    if (loadingEl?.classList?.contains('visible')) {
      stopLoadingMessages();
      showError('Analiz beklenenden uzun surdu. Baglantiyi kontrol edip tekrar dene.');
      emitEvent('analysis_loading_watchdog_triggered');
    }
  }, ANALYSIS_REQUEST_TIMEOUT_MS + 8000);
}

function renderFailSafeResultCard(resultLike) {
  const r = resultLike && typeof resultLike === 'object' ? resultLike : {};
  const loading = document.getElementById('loading-state');
  const mainCard = document.getElementById('main-card');
  const resultCard = document.getElementById('result-card');
  const resetBtn = document.getElementById('reset-btn');
  const nameEl = document.getElementById('result-name');
  const descEl = document.getElementById('desc-text');
  const intensityFill = document.getElementById('intensity-fill');
  const intensityValue = document.getElementById('intensity-value');
  const metaRow = document.getElementById('meta-row');

  if (loading) loading.classList.remove('visible');
  if (mainCard) mainCard.style.display = 'none';
  if (nameEl) nameEl.textContent = r.name || 'Koku Profili';
  if (descEl) {
    descEl.textContent = r.description
      || 'Sonuc karti tam cizilemedi. Temel analiz verisi goruntuleniyor.';
  }
  if (metaRow) {
    const metas = [r.family, r.occasion, ...(Array.isArray(r.season) ? r.season : [])]
      .filter(Boolean)
      .map((item) => `<span class="meta-pill">${safeText(item)}</span>`);
    metaRow.innerHTML = metas.join('');
  }
  if (intensityFill) intensityFill.style.width = `${Math.max(0, Math.min(100, Number(r.intensity || 62)))}%`;
  if (intensityValue) intensityValue.textContent = `${Math.max(0, Math.min(100, Number(r.intensity || 62)))}%`;

  const descriptionSection = document.getElementById('sec-description');
  if (descriptionSection) {
    descriptionSection.style.display = '';
    descriptionSection.classList.add('revealed');
  }

  const similarSection = document.getElementById('sec-similar');
  const similarPills = document.getElementById('similar-pills');
  const similarityInsight = document.getElementById('similarity-insight');
  const safeSimilar = Array.isArray(r.similar) ? r.similar.filter(Boolean).slice(0, 6) : [];
  if (similarSection && similarPills) {
    if (safeSimilar.length > 0) {
      similarSection.style.display = '';
      similarSection.classList.add('revealed');
      similarPills.innerHTML = safeSimilar.map((name, i) => {
        const className = ['pill-a', 'pill-b', 'pill-c', 'pill-a'][i % 4];
        return `<span class="pill ${className}">${safeText(name)}</span>`;
      }).join('');
      if (similarityInsight) {
        similarityInsight.style.display = 'block';
        similarityInsight.textContent = 'Bazi ileri moduller yuklenemedi. Benzer profil listesi temel modda gosteriliyor.';
      }
    } else {
      similarSection.style.display = 'none';
      similarPills.innerHTML = '';
      if (similarityInsight) {
        similarityInsight.style.display = 'none';
        similarityInsight.textContent = '';
      }
    }
  }

  ['sec-pyramid', 'sec-note-ontology', 'sec-fragrance-wheel', 'sec-technical', 'sec-scores', 'sec-community-pulse', 'sec-store-links', 'sec-layering', 'sec-persona', 'sec-dupe', 'sec-molecule']
    .forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = 'none';
        el.classList.remove('revealed');
      }
    });

  if (resultCard) resultCard.classList.add('visible');
  if (resetBtn) resetBtn.classList.add('visible');
}

function renderRecoveryResultCard(resultLike, reason = '') {
  const r = sanitizeAnalysisResultShape(resultLike);
  renderFailSafeResultCard(r);
  const message = cleanPreferenceText(reason || '', 140);
  if (message) {
    const similarityInsight = document.getElementById('similarity-insight');
    if (similarityInsight) {
      similarityInsight.style.display = 'block';
      similarityInsight.textContent = `Bazi detaylar yuklenemedi (${message}). Temel sonuc gosterimi aktif.`;
    }
  }
}

async function safeShowResult(resultLike, save = false, isImage = false, context = 'runtime') {
  const sanitizedResult = sanitizeAnalysisResultShape(resultLike);
  try {
    await showResult(sanitizedResult, save, isImage);
    return true;
  } catch (error) {
    console.error(`safeShowResult(${context})`, error);
    window.KokuCore?.emitClientError?.('error', 'show_result_failed', {
      context: cleanPreferenceText(context, 48),
      reason: cleanPreferenceText(error?.message || 'unknown', 140),
    });
    renderFailSafeResultCard(sanitizedResult);
    showToast('Sonuc karti guvenli modda acildi.');
    return false;
  } finally {
    stopLoadingMessages();
    clearLoadingWatchdog();
  }
}

function isStandaloneApp() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}

function isIOSInstallHintNeeded() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

function resolveOfficialProductUrlSafe(result) {
  try {
    if (typeof resolveOfficialProductUrl === 'function') {
      return resolveOfficialProductUrl(result);
    }
  } catch {}
  try {
    const candidateName = cleanPreferenceText(result?.name || '', 140);
    return window.KokuOfficialLinks?.getProductUrl?.(candidateName) || null;
  } catch {}
  return null;
}

function formatPersonaTone(personaLike) {
  const persona = personaLike && typeof personaLike === 'object' ? personaLike : {};
  const vibe = cleanPreferenceText(persona.vibe || '', 80);
  if (vibe) {
    const normalized = normalizeScentKey(vibe)
      .replace(/[ıİ]/g, 'i')
      .replace(/[şŞ]/g, 's')
      .replace(/[çÇ]/g, 'c')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[öÖ]/g, 'o')
      .replace(/[üÜ]/g, 'u');
    if (normalized.includes('zamansiz')) return 'Klasik ve dengeli';
    if (normalized.includes('modern')) return 'Modern ve net';
    if (normalized.includes('romantik')) return 'Romantik ve yumuşak';
    return vibe;
  }

  const occasion = Array.isArray(persona.occasions) ? cleanPreferenceText(persona.occasions[0] || '', 48) : '';
  if (occasion) return `${occasion} odaklı`;

  const season = cleanPreferenceText(persona.season || '', 48);
  if (season) return `${season} uyumu`;

  return 'Geniş uyum';
}

function safePushFeedEvent(eventType, payload = {}) {
  try {
    if (typeof pushFeedEvent === 'function') {
      pushFeedEvent(eventType, payload);
      return true;
    }
  } catch (error) {
    console.warn('pushFeedEvent failed:', error);
  }
  return false;
}

function safeQueueGrowthPromptEvaluation(delayMs = 260) {
  try {
    if (typeof queueGrowthPromptEvaluation === 'function') {
      queueGrowthPromptEvaluation(delayMs);
      return true;
    }
  } catch (error) {
    console.warn('queueGrowthPromptEvaluation failed:', error);
  }
  return false;
}

function showToast(message) {
  const toast = document.getElementById('app-toast');
  if (!toast || !message) return;
  toast.textContent = message;
  toast.classList.add('visible');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2600);
}

const ADVANCED_RESULT_SECTION_IDS = [
  'sec-technical',
  'sec-scores',
  'sec-note-ontology',
  'sec-fragrance-wheel',
  'sec-layering',
  'sec-persona',
  'sec-dupe',
];

const SHELF_STATUS_META = {
  wishlist: { label: 'Wishlist', helper: 'Tekrar bakmak istedigin kokular.' },
  owned: { label: 'Sahibim', helper: 'Elinde olan veya aktif kullandigin kokular.' },
  tested: { label: 'Denedim', helper: 'Teninde test ettigin veya kisa sureli deneyimledigin kokular.' },
  rebuy: { label: 'Tekrar Alirim', helper: 'Sana iyi oturan ve geri donecegin kokular.' },
  skip: { label: 'Bana Gore Degil', helper: 'Bir daha onceliklendirmek istemedigin kokular.' },
};

const FEEDBACK_META = {
  accurate: { label: 'Isabetli', toast: 'Bu sonucu isabetli olarak kaydettin.' },
  not_for_me: { label: 'Genel uyum zayif', toast: 'Bu sonucu sana uzak olarak kaydettim.' },
  too_sweet: { label: 'Fazla tatli', toast: 'Daha az tatli onerilere agirlik verecegim.' },
  too_heavy: { label: 'Fazla agir', toast: 'Daha hafif profillere yoneliyorum.' },
};
const ENABLE_QUICK_FEEDBACK = false;

const SHELF_TAG_META = {
  office: { label: 'Ofis' },
  night: { label: 'Gece' },
  spring: { label: 'Ilkbahar' },
  summer: { label: 'Yaz' },
  autumn: { label: 'Sonbahar' },
  winter: { label: 'Kis' },
};

const SHELF_FILTER_META = {
  all: 'Tum Kayitlar',
  favorite: 'Favoriler',
  office: 'Ofis',
  night: 'Gece',
  spring: 'Ilkbahar',
  summer: 'Yaz',
  autumn: 'Sonbahar',
  winter: 'Kis',
};

const WEAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanPreferenceText(value, maxLen = 120) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

function normalizeScentKey(name) {
  return cleanPreferenceText(name, 140).toLowerCase();
}

function readStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function getActiveAuthUserId() {
  return cleanPreferenceText(authUser?.id || '', 80);
}

function getShelfStorageKey(userId = getActiveAuthUserId()) {
  const safeUserId = cleanPreferenceText(userId || '', 80);
  return safeUserId ? `${SHELF_STATE_KEY_PREFIX}:${safeUserId}` : SHELF_STATE_KEY_GUEST;
}

function readShelfState() {
  const storageKey = getShelfStorageKey();
  const state = readStoredJson(storageKey, null);
  if (state && typeof state === 'object') return state;

  const legacyState = readStoredJson(SHELF_STATE_KEY, null);
  if (legacyState && typeof legacyState === 'object') {
    try {
      localStorage.setItem(storageKey, JSON.stringify(legacyState));
    } catch {}
    return legacyState;
  }

  return {};
}

function writeShelfState(next, options = {}) {
  const normalized = next && typeof next === 'object' ? next : {};
  localStorage.setItem(getShelfStorageKey(), JSON.stringify(normalized));
  if (options.skipSync === true) return;
  scheduleWardrobeSync(options.reason || 'local_change');
}

function readFeedbackState() {
  return readStoredJson(FEEDBACK_STATE_KEY, {});
}

function writeFeedbackState(next) {
  localStorage.setItem(FEEDBACK_STATE_KEY, JSON.stringify(next || {}));
}

function mergeShelfStates(localState, remoteState) {
  const local = localState && typeof localState === 'object' ? localState : {};
  const remote = remoteState && typeof remoteState === 'object' ? remoteState : {};
  const merged = { ...local };

  Object.entries(remote).forEach(([key, remoteItem]) => {
    const localItem = local[key];
    const localUpdated = Date.parse(localItem?.updatedAt || '');
    const remoteUpdated = Date.parse(remoteItem?.updatedAt || '');
    if (!localItem || remoteUpdated > localUpdated) {
      merged[key] = remoteItem;
    }
  });

  return merged;
}

function hasShelfDelta(leftState, rightState) {
  const left = leftState && typeof leftState === 'object' ? leftState : {};
  const right = rightState && typeof rightState === 'object' ? rightState : {};
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return true;
  for (let i = 0; i < leftKeys.length; i += 1) {
    if (leftKeys[i] !== rightKeys[i]) return true;
    const l = JSON.stringify(left[leftKeys[i]] || {});
    const r = JSON.stringify(right[rightKeys[i]] || {});
    if (l !== r) return true;
  }
  return false;
}

function migrateGuestShelfToUser(userId) {
  const safeUserId = cleanPreferenceText(userId || '', 80);
  if (!safeUserId) return;

  const guestState = readStoredJson(SHELF_STATE_KEY_GUEST, {});
  const hasGuestEntries = Object.keys(guestState || {}).length > 0;
  if (!hasGuestEntries) return;

  const userStorageKey = getShelfStorageKey(safeUserId);
  const userState = readStoredJson(userStorageKey, {});
  const merged = mergeShelfStates(guestState, userState);

  try {
    localStorage.setItem(userStorageKey, JSON.stringify(merged));
    localStorage.removeItem(SHELF_STATE_KEY_GUEST);
  } catch {}
}

async function wardrobeFetch(method, body = null) {
  if (!authToken) {
    return { ok: false, status: 401, data: { error: 'Giris gerekli' } };
  }
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` };
  const init = { method, headers };
  if (body !== null) init.body = JSON.stringify(body);

  const res = await fetch('/api/wardrobe', init);
  let data = {};
  try {
    data = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, data };
}

async function pullWardrobeFromCloud(options = {}) {
  const userId = getActiveAuthUserId();
  if (!authToken || !userId) return false;
  if (!options.force && wardrobeHydratedUserId === userId) return true;

  try {
    const { ok, data } = await wardrobeFetch('GET');
    if (!ok || !data?.shelf || typeof data.shelf !== 'object') return false;

    const localState = readShelfState();
    const merged = mergeShelfStates(localState, data.shelf);
    const needsCloudReconcile = hasShelfDelta(merged, data.shelf);
    writeShelfState(merged, { skipSync: true });
    wardrobeHydratedUserId = userId;
    renderShelf();
    renderHistory();
    renderCurrentResultShelfState();
    emitEvent('wardrobe_sync_pull_ok', {
      storage: cleanPreferenceText(data.storage || 'unknown', 24),
    });
    if (cleanPreferenceText(data.storage || '', 24) === 'runtime-store') {
      emitEvent('wardrobe_runtime_fallback_detected', { phase: 'pull' });
    }
    if (needsCloudReconcile) {
      scheduleWardrobeSync('post_pull_reconcile');
    }
    return true;
  } catch {
    emitEvent('wardrobe_sync_pull_error');
    return false;
  }
}

async function pushWardrobeToCloud(reason = 'local_change') {
  const userId = getActiveAuthUserId();
  if (!authToken || !userId) return false;
  if (wardrobeSyncInFlight) {
    wardrobeSyncQueued = true;
    return false;
  }

  wardrobeSyncInFlight = true;
  try {
    const shelf = readShelfState();
    const { ok, data } = await wardrobeFetch('PUT', { shelf, reason });
    if (!ok || !data?.ok) {
      emitEvent('wardrobe_sync_push_error', { reason: cleanPreferenceText(reason, 24) || 'unknown' });
      return false;
    }
    wardrobeLastPushAt = cleanPreferenceText(data.updatedAt || '', 40);
    emitEvent('wardrobe_sync_push_ok', {
      reason: cleanPreferenceText(reason, 24) || 'unknown',
      storage: cleanPreferenceText(data.storage || 'unknown', 24),
    });
    if (cleanPreferenceText(data.storage || '', 24) === 'runtime-store') {
      emitEvent('wardrobe_runtime_fallback_detected', { phase: 'push' });
    }
    return true;
  } catch {
    emitEvent('wardrobe_sync_push_error', { reason: cleanPreferenceText(reason, 24) || 'unknown' });
    return false;
  } finally {
    wardrobeSyncInFlight = false;
    if (wardrobeSyncQueued) {
      wardrobeSyncQueued = false;
      scheduleWardrobeSync('queued_retry');
    }
  }
}

function scheduleWardrobeSync(reason = 'local_change') {
  if (!authToken || !getActiveAuthUserId()) return;
  if (wardrobeSyncTimer) clearTimeout(wardrobeSyncTimer);
  wardrobeSyncTimer = setTimeout(() => {
    wardrobeSyncTimer = null;
    pushWardrobeToCloud(reason);
  }, 1000);
}

function getShelfEntry(name) {
  const key = normalizeScentKey(name);
  if (!key) return null;
  return readShelfState()[key] || null;
}

function getFeedbackEntry(name) {
  const key = normalizeScentKey(name);
  if (!key) return null;
  return readFeedbackState()[key] || null;
}

function normalizeTagList(tags) {
  return Array.isArray(tags)
    ? Array.from(new Set(tags.map((tag) => cleanPreferenceText(tag, 24).toLowerCase()).filter((tag) => SHELF_TAG_META[tag])))
    : [];
}

function normalizeShelfEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    ...entry,
    favorite: entry.favorite === true,
    tags: normalizeTagList(entry.tags),
  };
}

function readHistoryListSafe() {
  if (typeof window.KokuAuth?.readHistoryListSafe === 'function') {
    const list = window.KokuAuth.readHistoryListSafe();
    return Array.isArray(list) ? list : [];
  }
  try {
    const parsed = JSON.parse(localStorage.getItem('koku-gecmis') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getStoredAnalysisByName(name) {
  const key = normalizeScentKey(name);
  if (!key) return null;

  const shelfMatch = normalizeShelfEntry(readShelfState()[key]);
  if (shelfMatch?.analysis && typeof shelfMatch.analysis === 'object') {
    return shelfMatch.analysis;
  }

  const history = readHistoryListSafe();
  return history.find((item) => normalizeScentKey(item?.name) === key) || null;
}

function findResultSnapshotByName(name) {
  return getStoredAnalysisByName(name);
}

function getCurrentResultSnapshot() {
  if (!currentResultData?.name) return null;
  const currentShelf = normalizeShelfEntry(getShelfEntry(currentResultData.name));
  return {
    ...currentResultData,
    favorite: currentShelf?.favorite === true,
    tags: Array.isArray(currentShelf?.tags) ? currentShelf.tags.slice() : [],
  };
}

function getCompareDisplayNotes(result) {
  const pyramid = result?.pyramid || {};
  const notes = []
    .concat(Array.isArray(pyramid.top) ? pyramid.top : [])
    .concat(Array.isArray(pyramid.middle) ? pyramid.middle : [])
    .concat(Array.isArray(pyramid.base) ? pyramid.base : []);
  return notes.filter(Boolean).slice(0, 4);
}

function buildCompareSummary(left, right) {
  const leftIntensity = Number(left?.intensity || 0);
  const rightIntensity = Number(right?.intensity || 0);
  const morePresent = leftIntensity === rightIntensity
    ? 'iki koku da benzer yogunlukta duruyor'
    : leftIntensity > rightIntensity
      ? `${left.name} daha guclu iz birakiyor`
      : `${right.name} daha guclu iz birakiyor`;

  const leftOffice = Array.isArray(left?.tags) && left.tags.includes('office');
  const rightOffice = Array.isArray(right?.tags) && right.tags.includes('office');
  const leftNight = Array.isArray(left?.tags) && left.tags.includes('night');
  const rightNight = Array.isArray(right?.tags) && right.tags.includes('night');
  const officeHint = leftOffice === rightOffice
    ? 'ofis tarafi icin ekstra bir ustunluk sinyali yok'
    : leftOffice
      ? `${left.name} ofis rotasyonuna daha yakin`
      : `${right.name} ofis rotasyonuna daha yakin`;
  const nightHint = leftNight === rightNight
    ? 'gece tarafi daha cok karakter farkiyla ayrisiyor'
    : leftNight
      ? `${left.name} gece senaryosunda daha uygun`
      : `${right.name} gece senaryosunda daha uygun`;

  const profile = getActivePreferenceProfile();
  const favoriteFamilies = Array.isArray(profile.favoriteFamilies) ? profile.favoriteFamilies : [];
  const profilePick = favoriteFamilies.length
    ? [left, right]
      .map((item) => ({
        item,
        score: favoriteFamilies.includes(cleanPreferenceText(item?.family, 24).toLowerCase()) ? 1 : 0,
      }))
      .sort((a, b) => b.score - a.score)[0]
    : null;

  return [
    morePresent,
    officeHint,
    nightHint,
    profilePick?.score
      ? `mevcut tercih sinyaline gore ${profilePick.item.name} sana biraz daha yakin duruyor`
      : 'son karari ten denemesi ve kullanim senaryosu belirler',
  ].join('. ') + '.';
}

function setSectionHasContent(sectionId, hasContent) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.dataset.hasContent = hasContent ? 'true' : 'false';
}

function syncAdvancedSectionsVisibility() {
  ADVANCED_RESULT_SECTION_IDS.forEach((sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const hasContent = el.dataset.hasContent === 'true';
    if (!hasContent) {
      el.style.display = 'none';
      el.classList.remove('revealed');
      return;
    }
    el.style.display = 'block';
    el.classList.add('revealed');
  });

  const toggle = document.getElementById('deep-dive-toggle');
  if (toggle) {
    toggle.style.display = 'none';
  }
}

function toggleDeepDive() {
  deepDiveExpanded = !deepDiveExpanded;
  syncAdvancedSectionsVisibility();
  if (deepDiveExpanded) {
    ADVANCED_RESULT_SECTION_IDS.forEach((sectionId) => {
      const el = document.getElementById(sectionId);
      if (el && el.dataset.hasContent === 'true') {
        el.classList.add('revealed');
      }
    });
  }
  emitEvent('deep_dive_toggled', { state: deepDiveExpanded ? 'open' : 'closed' });
}

function getShelfStatusLabel(status) {
  return SHELF_STATUS_META[status]?.label || 'Kayitli';
}

function similarityFeedbackBoost(candidateName, candidateFamily = '') {
  const key = normalizeScentKey(candidateName);
  const feedbackState = readFeedbackState();
  const shelfState = readShelfState();
  const feedback = key ? feedbackState[key] : null;
  const shelf = key ? normalizeShelfEntry(shelfState[key]) : null;
  let boost = 0;

  if (feedback?.type === 'accurate') boost += 14;
  if (feedback?.type === 'not_for_me') boost -= 16;
  if (feedback?.type === 'too_sweet') boost -= 9;
  if (feedback?.type === 'too_heavy') boost -= 9;

  if (shelf?.favorite) boost += 8;
  if (shelf?.status === 'owned') boost += 5;
  if (shelf?.status === 'rebuy') boost += 7;
  if (shelf?.status === 'skip') boost -= 10;

  const normalizedFamily = cleanPreferenceText(candidateFamily, 30);
  if (normalizedFamily) {
    const familyFeedback = Object.values(feedbackState).filter((entry) => (
      cleanPreferenceText(entry?.family, 30) === normalizedFamily
    ));
    familyFeedback.forEach((entry) => {
      if (entry.type === 'accurate') boost += 1.5;
      if (entry.type === 'not_for_me') boost -= 2.2;
      if (entry.type === 'too_sweet' || entry.type === 'too_heavy') boost -= 1.2;
    });
  }

  return Math.max(-24, Math.min(24, Number(boost.toFixed(1))));
}

function rankSimilarityForUser(result) {
  const backendCandidates = Array.isArray(result?.similarity?.candidates)
    ? result.similarity.candidates
    : [];
  const fallbackCandidates = Array.isArray(result?.similar)
    ? result.similar.map((name, index) => ({
      name,
      family: result?.family || '',
      score: Math.max(26, 58 - (index * 6)),
      reason: 'metin benzerligi',
    }))
    : [];

  const merged = [];
  const seen = new Set();
  [...backendCandidates, ...fallbackCandidates].forEach((item) => {
    const name = cleanPreferenceText(item?.name || item, 140);
    const key = normalizeScentKey(name);
    if (!name || !key || seen.has(key)) return;
    seen.add(key);
    const baseScore = Number(item?.score || 0);
    const userBoost = similarityFeedbackBoost(name, item?.family || '');
    merged.push({
      name,
      family: cleanPreferenceText(item?.family || '', 40),
      baseScore,
      userBoost,
      finalScore: Math.max(0, Math.min(100, Number((baseScore + userBoost).toFixed(1)))),
      reason: cleanPreferenceText(item?.reason || '', 120),
    });
  });

  return merged
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 6);
}

function renderNoteOntology(result) {
  const section = document.getElementById('sec-note-ontology');
  const summaryEl = document.getElementById('note-ontology-summary');
  const tagsEl = document.getElementById('note-ontology-tags');
  if (!section || !summaryEl || !tagsEl) return;

  const ontology = result?.noteOntology;
  const mappedCount = Number(ontology?.totals?.mapped || 0);
  if (!ontology || mappedCount < 2) {
    setSectionHasContent('sec-note-ontology', false);
    summaryEl.textContent = '';
    tagsEl.innerHTML = '';
    return;
  }

  setSectionHasContent('sec-note-ontology', true);
  const sourceConfidence = Number(ontology?.sourceConfidence || 0);
  const coverage = Number(ontology?.totals?.coverage || 0);
  const familyList = Array.isArray(ontology?.families) ? ontology.families : [];
  const sourceLabel = cleanPreferenceText(ontology?.noteSource || 'model', 20);
  summaryEl.textContent = `Eslenen nota: ${mappedCount}/${ontology.totals.notes}. Kapsama: %${coverage}. Kaynak guveni: ${(sourceConfidence * 100).toFixed(0)}/100 (${sourceLabel}).`;
  tagsEl.innerHTML = familyList.slice(0, 6).map((item) => (
    `<span class="ontology-tag">${safeText(item.family)} (${Number(item.count || 0)})</span>`
  )).join('');
}

function getCompareCandidates(limit = 6) {
  const seen = new Set();
  const currentKey = normalizeScentKey(currentResultData?.name);
  if (currentKey) seen.add(currentKey);

  const sources = [
    ...Object.values(readShelfState()).map((item) => item?.name),
    ...readHistoryListSafe().map((item) => item?.name),
    ...(Array.isArray(currentResultData?.similar) ? currentResultData.similar : []),
  ];

  const result = [];
  sources.forEach((name) => {
    const key = normalizeScentKey(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(cleanPreferenceText(name, 120));
  });
  return result.slice(0, limit);
}

function renderCompareSuggestions() {
  const wrap = document.getElementById('compare-suggestions');
  if (!wrap) return;
  const candidates = getCompareCandidates();
  wrap.innerHTML = candidates.map((name) => `
    <button class="compare-chip" type="button" onclick="pickCompareCandidate('${name.replace(/'/g, "\\'")}')">${safeText(name)}</button>
  `).join('');
}

function buildCompareCard(result, sideLabel) {
  const notes = getCompareDisplayNotes(result);
  const tags = normalizeTagList(result?.tags);
  const season = Array.isArray(result?.season) ? result.season.filter(Boolean).slice(0, 1) : [];
  const iconToken = resolvePremiumIconToken(result, SCENT_TOKEN_FALLBACK);
  const icon = iconMarkup(iconToken, 'compare-result-icon');
  const pills = [
    cleanPreferenceText(result?.family || '', 30),
    cleanPreferenceText(result?.occasion || '', 30),
    ...season.map((item) => cleanPreferenceText(item, 20)),
    ...tags.map((tag) => SHELF_TAG_META[tag]?.label || tag),
  ].filter(Boolean).slice(0, 4);

  return `
    <div class="compare-result-card">
      <div class="compare-result-label">${safeText(sideLabel)}</div>
      <div class="compare-result-title">${icon}<span>${safeText(result?.name || 'Bilinmeyen koku')}</span></div>
      <div class="compare-result-meta">
        <span>${Number(result?.intensity || 0)}/100 yogunluk</span>
      </div>
      <div class="compare-result-pills">
        ${pills.map((item) => `<span class="compare-result-pill">${safeText(item)}</span>`).join('')}
      </div>
      <p class="compare-result-notes">${notes.length ? safeText(notes.join(' | ')) : 'Nota izi henuz sinirli.'}</p>
    </div>
  `;
}

function renderCompareResult(left, right) {
  const section = document.getElementById('sec-compare');
  const grid = document.getElementById('compare-result-grid');
  const verdict = document.getElementById('compare-result-summary');
  const sourceButton = document.getElementById('compare-open-source');
  const targetButton = document.getElementById('compare-open-target');
  if (!section || !grid || !verdict || !sourceButton || !targetButton) return;

  compareResultState = { left, right };
  section.style.display = 'block';
  section.classList.add('revealed');
  grid.innerHTML = buildCompareCard(left, 'Mevcut Sonuc') + buildCompareCard(right, 'Karsilastirilan');
  verdict.textContent = buildCompareSummary(left, right);
  sourceButton.textContent = `${left.name} ekranini ac`;
  targetButton.textContent = `${right.name} ekranini ac`;
  sourceButton.onclick = () => {
    void safeShowResult(left, false, false, 'compare-source');
    emitEvent('compare_result_opened', { side: 'source' });
  };
  targetButton.onclick = () => {
    void safeShowResult(right, false, false, 'compare-target');
    emitEvent('compare_result_opened', { side: 'target' });
  };
  setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}

function hideCompareResult() {
  const section = document.getElementById('sec-compare');
  const grid = document.getElementById('compare-result-grid');
  const verdict = document.getElementById('compare-result-summary');
  if (section) {
    section.style.display = 'none';
    section.classList.remove('revealed');
  }
  if (grid) grid.innerHTML = '';
  if (verdict) verdict.textContent = '';
  compareResultState = null;
}

function openCompareOverlay() {
  if (!currentResultData?.name) return;
  const overlay = document.getElementById('compare-overlay');
  const label = document.getElementById('compare-source-label');
  const input = document.getElementById('compare-target-input');
  const msg = document.getElementById('compare-msg');
  if (!overlay || !label || !input || !msg) return;

  label.textContent = `"${currentResultData.name}" sonucunu ikinci bir kokuyla yan yana degerlendir.`;
  msg.textContent = 'Hizli secimlerden birini kullanabilir veya yeni bir parfum yazabilirsin.';
  input.value = '';
  renderCompareSuggestions();
  overlay.style.display = 'flex';
  setTimeout(() => input.focus(), 80);
  emitEvent('compare_overlay_opened', { source: currentResultData.family || 'unknown' });
}

function closeCompareOverlay(fromBackdrop = false) {
  const overlay = document.getElementById('compare-overlay');
  const msg = document.getElementById('compare-msg');
  const input = document.getElementById('compare-target-input');
  if (!overlay || overlay.style.display === 'none') return;
  overlay.style.display = 'none';
  if (msg) msg.textContent = '';
  if (input) input.value = '';
  emitEvent('compare_overlay_closed', { source: fromBackdrop ? 'backdrop' : 'action' });
}

function pickCompareCandidate(name) {
  const input = document.getElementById('compare-target-input');
  const msg = document.getElementById('compare-msg');
  if (input) input.value = name;
  if (msg) msg.textContent = `"${name}" secildi. Istersen dogrudan karsilastirmayi acabilirsin.`;
}

function parseAnalysisPayload(data) {
  const raw = data?.content?.map((block) => block?.text || '').join('') || '';
  if (!raw) throw new Error('Bos analiz cevabi alindi.');

  const start = raw.indexOf('{');
  if (start === -1) throw new Error('Analiz JSON olarak okunamadi.');

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = start; i < raw.length; i++) {
    const char = raw[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const jsonStr = end !== -1 ? raw.slice(start, end + 1) : raw.slice(start);
  return JSON.parse(jsonStr);
}

function normalizeStringList(value, max = 8) {
  const src = Array.isArray(value) ? value : [];
  const seen = new Set();
  const out = [];
  src.forEach((item) => {
    const clean = cleanPreferenceText(item, 80);
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(clean);
  });
  return out.slice(0, max);
}

function clampScore(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function sanitizeAnalysisResultShape(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const pyramidSrc = src.pyramid && typeof src.pyramid === 'object' ? src.pyramid : null;
  const scoresSrc = src.scores && typeof src.scores === 'object' ? src.scores : null;
  const personaSrc = src.persona && typeof src.persona === 'object' ? src.persona : null;
  const layeringSrc = src.layering && typeof src.layering === 'object' ? src.layering : null;
  const technicalSrc = Array.isArray(src.technical) ? src.technical : [];
  const moleculesSrc = Array.isArray(src.molecules) ? src.molecules : [];

  return {
    ...src,
    name: cleanPreferenceText(src.name || 'Koku Profili', 140),
    family: cleanPreferenceText(src.family || 'Aromatik', 30),
    description: cleanPreferenceText(src.description || '', 1200),
    intensity: clampScore(src.intensity, 62),
    season: normalizeStringList(src.season, 4),
    occasion: cleanPreferenceText(src.occasion || '', 40),
    similar: normalizeStringList(src.similar, 8),
    dupes: normalizeStringList(src.dupes, 6),
    pyramid: pyramidSrc ? {
      top: normalizeStringList(pyramidSrc.top, 8),
      middle: normalizeStringList(pyramidSrc.middle, 8),
      base: normalizeStringList(pyramidSrc.base, 8),
    } : null,
    scores: scoresSrc ? {
      freshness: clampScore(scoresSrc.freshness, 50),
      sweetness: clampScore(scoresSrc.sweetness, 50),
      warmth: clampScore(scoresSrc.warmth, 50),
    } : null,
    persona: personaSrc ? {
      gender: cleanPreferenceText(personaSrc.gender || '', 24),
      age: cleanPreferenceText(personaSrc.age || '', 24),
      vibe: cleanPreferenceText(personaSrc.vibe || '', 120),
      occasions: normalizeStringList(personaSrc.occasions, 6),
      season: cleanPreferenceText(personaSrc.season || '', 24),
    } : null,
    layering: layeringSrc ? {
      pair: cleanPreferenceText(layeringSrc.pair || '', 140),
      result: cleanPreferenceText(layeringSrc.result || '', 300),
    } : null,
    technical: technicalSrc
      .filter((row) => row && typeof row === 'object')
      .map((row) => ({
        label: cleanPreferenceText(row.label || '', 40),
        value: cleanPreferenceText(row.value || '', 80),
        score: row.score === null || row.score === undefined ? undefined : clampScore(row.score, 50),
      }))
      .filter((row) => row.label && row.value)
      .slice(0, 8),
    molecules: moleculesSrc
      .filter((mol) => mol && typeof mol === 'object')
      .map((mol) => ({
        ...mol,
        name: cleanPreferenceText(mol.name || '', 80),
        note: cleanPreferenceText(mol.note || 'single', 12),
        contribution: cleanPreferenceText(mol.contribution || '', 140),
        smiles: cleanPreferenceText(mol.smiles || '', 220) || null,
        formula: cleanPreferenceText(mol.formula || '', 60),
        family: cleanPreferenceText(mol.family || '', 60),
        origin: cleanPreferenceText(mol.origin || '', 80),
      }))
      .filter((mol) => mol.name)
      .slice(0, 6),
  };
}

function extractUserTextFromMessages(messages) {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== 'user') continue;
    if (typeof message.content === 'string') {
      const text = cleanPreferenceText(message.content, 600);
      if (text) return text;
      continue;
    }
    if (!Array.isArray(message.content)) continue;
    const combined = message.content
      .filter((part) => part?.type === 'text' && typeof part.text === 'string')
      .map((part) => cleanPreferenceText(part.text, 400))
      .filter(Boolean)
      .join(' ');
    if (combined) return combined;
  }
  return '';
}

function extractEmergencyName(rawText, isImage) {
  const clean = cleanPreferenceText(rawText, 180);
  if (!clean) return isImage ? 'Gorsel Koku Profili' : 'Koku Profili';

  const quoted = /"([^"]{2,90})"/.exec(clean)?.[1];
  if (quoted) return cleanPreferenceText(quoted, 90);

  if (/dior|chanel|tom ford|maison|zara|armani|ysl|creed|parfum|perfume/i.test(clean)) {
    return clean.split('\n')[0].replace(/^asagidaki\s+/i, '').slice(0, 90);
  }

  const head = clean.split(',')[0].split('\n')[0].trim();
  return cleanPreferenceText(head || clean, 90) || (isImage ? 'Gorsel Koku Profili' : 'Koku Profili');
}

function fallbackMoleculeFromNote(note) {
  const normalized = normalizeScentKey(note);
  const rules = [
    { keys: ['vanilya', 'vanilla', 'tonka', 'karamel', 'caramel'], molecule: 'Vanillin' },
    { keys: ['lavanta', 'lavender'], molecule: 'Linalool' },
    { keys: ['gül', 'rose', 'yasemin', 'jasmine'], molecule: 'Geraniol' },
    { keys: ['bergamot', 'limon', 'narenciye', 'citrus'], molecule: 'Limonene' },
    { keys: ['odun', 'wood', 'sedir', 'cedar', 'sandal'], molecule: 'Cedrene' },
    { keys: ['amber', 'ambrox', 'ambergris'], molecule: 'Ambroxide' },
    { keys: ['misk', 'musk'], molecule: 'Muscone' },
  ];
  for (const rule of rules) {
    if (rule.keys.some((key) => normalized.includes(normalizeScentKey(key)))) return rule.molecule;
  }
  return 'Linalool';
}

function buildEmergencyAnalysisResult(messages, isImage, reason = '') {
  const rawText = extractUserTextFromMessages(messages);
  const guessedName = extractEmergencyName(rawText, isImage);
  const parsedNotes = parseNoteListInput(rawText);
  const notes = parsedNotes.length
    ? parsedNotes
    : ['bergamot', 'lavanta', 'sedir', 'amber'].slice(0, isImage ? 3 : 4);

  const top = notes.slice(0, Math.min(2, notes.length));
  const middle = notes.slice(Math.min(2, notes.length), Math.min(4, notes.length));
  const base = notes.slice(Math.min(4, notes.length));
  const pyramid = {
    top: top.length ? top : ['bergamot'],
    middle: middle.length ? middle : ['lavanta'],
    base: base.length ? base : ['amber'],
  };

  const molecules = [...new Set(notes.map((note) => fallbackMoleculeFromNote(note)))]
    .slice(0, 4)
    .map((name, idx) => {
      const db = typeof getMoleculeInfo === 'function' ? (getMoleculeInfo(name) || {}) : {};
      return {
        name,
        note: idx === 0 ? 'top' : idx === 1 ? 'middle' : 'base',
        contribution: '',
        evidence: 'yedek-mod',
        smiles: db.smiles || null,
        formula: db.formula || '',
        family: db.family || '',
        origin: db.origin || '',
      };
    });

  const statusHint = cleanPreferenceText(reason || 'AI servisi gecici olarak yanit veremedi.', 180);
  return {
    iconToken: resolvePremiumIconToken({ name: guessedName, family: 'Aromatik' }, SCENT_TOKEN_FALLBACK),
    name: guessedName,
    family: 'Aromatik',
    intensity: 64,
    season: ['Ilkbahar', 'Sonbahar'],
    occasion: 'Gunluk',
    description: `Yedek analiz modu aktif. ${statusHint} Bu sonuc, girdine dayali hizli bir profil olarak uretildi.`,
    pyramid,
    molecules,
    similar: ['Benzer profil kesfi', 'Notalara gore alternatif'],
    scores: { freshness: 54, sweetness: 46, warmth: 58 },
    technical: [
      { label: 'Analiz Modu', value: 'Yedek' },
      { label: 'Durum', value: 'Servis gecici yogun' },
      { label: 'Kaynak', value: 'Girdi tabanli tahmin' },
    ],
    layering: {
      pair: guessedName,
      result: 'Tam katmanlama analizi icin servis normale dondugunde yeniden dene.',
    },
    confidence: {
      score: 42,
      level: 'Kesif',
      toneClass: 'low',
      summary: 'Bu sonuc AI yedek modunda uretildi. Satin alma karari oncesi ten denemesi onerilir.',
      points: ['Servis yogunlugunda kesinti yasandi', 'Girdi tabanli hizli profil olusturuldu'],
      noteSource: 'input-fallback',
      moleculeSource: 'fallback',
    },
    verification: {
      matchedPerfume: null,
      noteSource: 'input-fallback',
      moleculeSource: 'fallback',
    },
    moleculeMeta: {
      count: molecules.length,
      source: 'fallback',
      matchedPerfume: null,
    },
  };
}

async function fetchAnalysisByText(text) {
  const cached = getFromCache(text);
  if (cached) {
    return { result: cached, source: 'cache' };
  }

  const profilePromptExtra = buildProfilePromptExtra('analysis');
  const payload = {
    promptType: 'analysis',
    messages: [{
      role: 'user',
      content: `Asagidaki parfum veya koku adini gercek notalariyla analiz et ve sadece JSON don:\n\n"${text}"`,
    }],
  };
  if (profilePromptExtra) payload.promptExtra = profilePromptExtra;

  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new Error(typeof data?.error === 'string' ? data.error : `HTTP ${response.status}`);
  }

  const result = parseAnalysisPayload(data);
  saveToCache(text, result);
  return { result, source: 'network' };
}

async function submitCompareRequest() {
  if (!currentResultData?.name) return;
  const input = document.getElementById('compare-target-input');
  const msg = document.getElementById('compare-msg');
  const target = cleanPreferenceText(input?.value || '', 120);
  const source = cleanPreferenceText(currentResultData.name, 120);
  if (!target) {
    if (msg) msg.textContent = 'Karsilastirmak istedigin ikinci kokuyu yaz.';
    return;
  }
  if (normalizeScentKey(target) === normalizeScentKey(source)) {
    if (msg) msg.textContent = 'Ayni kokuyu kendiyle karsilastirmaya gerek yok. Ikinci bir secim gir.';
    return;
  }

  const submitButton = document.querySelector('.compare-submit');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Karsilastirma hazirlaniyor...';
  }

  try {
    const stored = getStoredAnalysisByName(target);
    const sourceSnapshot = getCurrentResultSnapshot();
    const targetPayload = stored
      ? { result: stored, source: 'stored' }
      : await fetchAnalysisByText(target);

    closeCompareOverlay();
    renderCompareResult(sourceSnapshot || currentResultData, targetPayload.result);
    emitEvent('compare_completed', {
      source: targetPayload.source,
      family: currentResultData.family || 'unknown',
    });
    showToast(`${source} ile ${targetPayload.result?.name || target} karsilastirildi`);
  } catch (error) {
    if (msg) msg.textContent = error?.message || 'Karsilastirma su an hazirlanamadi.';
    emitEvent('compare_failed', { reason: 'fetch_error' });
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Yan Yana Karsilastir';
    }
  }
}

function renderCurrentResultShelfState() {
  const section = document.getElementById('sec-shelf');
  const text = document.getElementById('shelf-status-text');
  const helper = document.getElementById('shelf-helper');
  const favoriteBtn = document.getElementById('shelf-favorite-btn');
  const tagsWrap = document.getElementById('shelf-tag-actions');
  if (!section || !text || !helper) return;
  if (!currentResultData?.name) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  const entry = normalizeShelfEntry(getShelfEntry(currentResultData.name)) || {};
  document.querySelectorAll('#shelf-actions .shelf-chip').forEach((node) => {
    node.classList.toggle('active', node.textContent === getShelfStatusLabel(entry?.status));
  });
  if (favoriteBtn) {
    favoriteBtn.classList.toggle('active', entry.favorite === true);
    favoriteBtn.textContent = entry.favorite ? 'Favoriden Cikar' : 'Favori Yap';
  }
  if (tagsWrap) {
    tagsWrap.innerHTML = Object.entries(SHELF_TAG_META).map(([tag, meta]) => `
      <button class="shelf-chip mini${entry.tags?.includes(tag) ? ' active' : ''}" type="button" onclick="toggleCurrentResultTag('${tag}')">${safeText(meta.label)}</button>
    `).join('');
  }

  if (entry?.status) {
    const extras = [];
    if (entry.favorite) extras.push('favorilerde');
    if (entry.tags?.length) extras.push(`etiketler: ${entry.tags.map((tag) => SHELF_TAG_META[tag]?.label || tag).join(', ')}`);
    text.textContent = `Durum: ${getShelfStatusLabel(entry.status)}. ${SHELF_STATUS_META[entry.status]?.helper || ''}${extras.length ? ` Ayrica ${extras.join(' | ')}.` : ''}`;
  } else {
    text.textContent = 'Henuz bir durum secmedin. En kucuk kayit bile tavsiye motorunu guclendirir.';
  }
}

function renderCurrentResultFeedbackState() {
  const section = document.getElementById('sec-feedback');
  const text = document.getElementById('feedback-status-text');
  const reasonsWrap = document.getElementById('feedback-v1-reasons');
  const likeBtn = document.getElementById('feedback-like-btn');
  const dislikeBtn = document.getElementById('feedback-dislike-btn');
  if (!section || !text) return;
  if (!ENABLE_QUICK_FEEDBACK) {
    section.style.display = 'none';
    return;
  }
  if (!currentResultData?.name) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  const entry = getFeedbackEntry(currentResultData.name);
  const isPositive = entry?.type === 'accurate';
  const isNegative = Boolean(entry?.type && entry.type !== 'accurate');
  const forceReasonOpen = section.dataset.reasonOpen === 'true';
  const showReasons = forceReasonOpen || isNegative;

  if (likeBtn) likeBtn.classList.toggle('active', isPositive);
  if (dislikeBtn) dislikeBtn.classList.toggle('active', isNegative || forceReasonOpen);

  if (reasonsWrap) {
    reasonsWrap.style.display = showReasons ? 'block' : 'none';
  }

  document.querySelectorAll('#feedback-actions [data-feedback]').forEach((node) => {
    const type = node.getAttribute('data-feedback');
    node.classList.toggle('active', Boolean(type && entry?.type === type));
  });

  if (!entry?.type) {
    text.textContent = 'Bu sonucun sende nasil hissettirdigini tek dokunusla paylasabilirsin.';
  } else if (entry.type === 'accurate') {
    text.textContent = 'Kaydedildi: Isabetli. Bu sinyal benzerlik motorunu guclendirir.';
  } else {
    text.textContent = `Kaydedildi: ${FEEDBACK_META[entry.type]?.label || 'Negatif geri bildirim'}.`;
  }
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getEntryWearTotal(entry) {
  const wear = entry?.wear && typeof entry.wear === 'object' ? entry.wear : {};
  return Object.values(wear).reduce((sum, value) => sum + Number(value || 0), 0);
}

/* [split] labs-core moved to /lib/app/labs-core.js */

/* [split] labs-overlays moved to /lib/app/labs-overlays.js */
function ensureLabsOverlaysReady() {
  if (window.KokuLabsOverlaysLoaded === true && window.KokuLabsOverlays) {
    return Promise.resolve(true);
  }
  return loadLazyScriptOnce(`/lib/app/labs-overlays.js${SW_BUILD_QUERY}`, 'labs-overlays').then((ok) => {
    if (ok) window.KokuLabsOverlaysLoaded = true;
    return ok;
  });
}

async function openBarcodeOverlay() {
  const ok = await ensureLabsOverlaysReady();
  if (!ok || !window.KokuLabsOverlays?.openBarcodeOverlay) return;
  return window.KokuLabsOverlays.openBarcodeOverlay();
}

function closeBarcodeOverlay(fromBackdrop = false) {
  if (!window.KokuLabsOverlays?.closeBarcodeOverlay) return;
  return window.KokuLabsOverlays.closeBarcodeOverlay(fromBackdrop);
}

async function submitBarcodeManual() {
  const ok = await ensureLabsOverlaysReady();
  if (!ok || !window.KokuLabsOverlays?.submitBarcodeManual) return;
  return window.KokuLabsOverlays.submitBarcodeManual();
}

async function openFinderOverlay() {
  const ok = await ensureLabsOverlaysReady();
  if (!ok || !window.KokuLabsOverlays?.openFinderOverlay) return;
  return window.KokuLabsOverlays.openFinderOverlay();
}

function closeFinderOverlay(fromBackdrop = false) {
  if (!window.KokuLabsOverlays?.closeFinderOverlay) return;
  return window.KokuLabsOverlays.closeFinderOverlay(fromBackdrop);
}

async function runPerfumeFinder() {
  const ok = await ensureLabsOverlaysReady();
  if (!ok || !window.KokuLabsOverlays?.runPerfumeFinder) return;
  return window.KokuLabsOverlays.runPerfumeFinder();
}

async function openLayeringLabOverlay() {
  const ok = await ensureLabsOverlaysReady();
  if (!ok || !window.KokuLabsOverlays?.openLayeringLabOverlay) return;
  return window.KokuLabsOverlays.openLayeringLabOverlay();
}

function closeLayeringLabOverlay(fromBackdrop = false) {
  if (!window.KokuLabsOverlays?.closeLayeringLabOverlay) return;
  return window.KokuLabsOverlays.closeLayeringLabOverlay(fromBackdrop);
}

async function runLayeringLab() {
  const ok = await ensureLabsOverlaysReady();
  if (!ok || !window.KokuLabsOverlays?.runLayeringLab) return;
  return window.KokuLabsOverlays.runLayeringLab();
}

/* [split] wardrobe moved to /lib/app/wardrobe.js */

function buildBehaviorPromptExtra() {
  const shelfItems = Object.values(readShelfState()).map((item) => normalizeShelfEntry(item)).filter(Boolean);
  const feedbackItems = Object.values(readFeedbackState()).filter(Boolean);

  const likedFamilies = shelfItems
    .filter((item) => item.status === 'owned' || item.status === 'rebuy' || item.status === 'wishlist')
    .map((item) => cleanPreferenceText(item.family, 24))
    .filter(Boolean);

  const skippedFamilies = shelfItems
    .filter((item) => item.status === 'skip')
    .map((item) => cleanPreferenceText(item.family, 24))
    .filter(Boolean);

  const favoriteItems = shelfItems.filter((item) => item.favorite === true);
  const taggedOffice = shelfItems.filter((item) => Array.isArray(item.tags) && item.tags.includes('office')).map((item) => item.name);
  const taggedNight = shelfItems.filter((item) => Array.isArray(item.tags) && item.tags.includes('night')).map((item) => item.name);

  const tooSweetCount = feedbackItems.filter((item) => item.type === 'too_sweet').length;
  const tooHeavyCount = feedbackItems.filter((item) => item.type === 'too_heavy').length;
  const parts = [];

  if (likedFamilies.length) {
    parts.push(`- kaydedilen guclu aile sinyalleri: ${Array.from(new Set(likedFamilies)).slice(0, 4).join(', ')}`);
  }
  if (skippedFamilies.length) {
    parts.push(`- temkinli olunan aileler: ${Array.from(new Set(skippedFamilies)).slice(0, 3).join(', ')}`);
  }
  if (favoriteItems.length) {
    parts.push(`- favori olarak isaretlenen kokular: ${favoriteItems.slice(0, 4).map((item) => item.name).join(', ')}`);
  }
  if (taggedOffice.length) {
    parts.push(`- ofis icin ayrilan kokular: ${taggedOffice.slice(0, 3).join(', ')}`);
  }
  if (taggedNight.length) {
    parts.push(`- gece icin ayrilan kokular: ${taggedNight.slice(0, 3).join(', ')}`);
  }
  if (tooSweetCount >= 1) {
    parts.push('- kullanici daha az tatli seceneklere yoneliyor');
  }
  if (tooHeavyCount >= 1) {
    parts.push('- kullanici daha hafif ve daha hava alan profilleri seviyor');
  }

  if (!parts.length) return '';
  return mergePromptExtras([
    'KULLANICI DAVRANIS SINYALLERI:',
    ...parts,
    'Bunlari yonlendirme olarak kullan ama kullanici istegini her zaman ana kaynak kabul et.',
  ]);
}

function updateInstallUI() {
  const btn = document.getElementById('install-app-btn');
  const note = document.getElementById('install-note');
  if (!btn || !note) return;

  if (isStandaloneApp()) {
    btn.style.display = 'none';
    note.style.display = 'none';
    return;
  }

  if (deferredInstallPrompt) {
    btn.style.display = 'inline-flex';
    btn.textContent = '↳ Uygulama Olarak Yukle';
    note.style.display = 'block';
    note.textContent = 'Ana ekrana ekle, tam ekran ve daha hizli acilis sagla.';
    return;
  }

  if (isIOSInstallHintNeeded()) {
    btn.style.display = 'inline-flex';
    btn.textContent = '↳ Ana Ekrana Ekle';
    note.style.display = 'block';
    note.textContent = 'Safari paylas menusunden "Ana Ekrana Ekle" sec.';
    return;
  }

  btn.style.display = 'none';
  note.style.display = 'none';
}

function setupInstallPrompt() {
  updateInstallUI();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallUI();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallUI();
    showToast('Koku Dedektifi yuklendi');
    emitEvent('pwa_installed');
  });
}

async function installApp() {
  if (isStandaloneApp()) return;

  if (deferredInstallPrompt) {
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    updateInstallUI();
    showToast(choice?.outcome === 'accepted' ? 'Kurulum baslatildi' : 'Kurulum iptal edildi');
    emitEvent('pwa_install_prompt', {
      outcome: choice?.outcome || 'unknown',
    });
    return;
  }

  if (isIOSInstallHintNeeded()) {
    showToast('Safari > Paylas > Ana Ekrana Ekle');
    emitEvent('pwa_install_hint_ios');
    return;
  }

  showToast('Bu cihaz su an kurulum istemi sunmuyor');
  emitEvent('pwa_install_unavailable');
}

function buildQuotaSuffix() {
  if (!Number.isFinite(usageQuotaState.remaining)) return '';
  if (Number.isFinite(usageQuotaState.limit)) {
    return ` • Kalan analiz ${usageQuotaState.remaining}/${usageQuotaState.limit}`;
  }
  return ` • Kalan analiz ${usageQuotaState.remaining}`;
}

function buildHealthChipText(providerOk, kvOk, store) {
  if (providerOk && kvOk) {
    return `Sistem aktif • AI + KV hazır (${store})${buildQuotaSuffix()}`;
  }
  return `Sistem sınırlı • ${providerOk ? 'AI hazır' : 'AI eksik'} / ${kvOk ? 'KV hazır' : 'KV eksik'}`;
}

function syncUsageQuotaFromHeaders(response) {
  const headers = response?.headers;
  if (!headers) return;

  const remaining = Number.parseInt(headers.get('X-RateLimit-Remaining') || '', 10);
  if (!Number.isFinite(remaining)) return;

  const limit = Number.parseInt(headers.get('X-RateLimit-Limit') || '', 10);
  usageQuotaState.remaining = Math.max(0, remaining);
  usageQuotaState.limit = Number.isFinite(limit) ? Math.max(0, limit) : null;
  usageQuotaState.updatedAt = Date.now();
}

function classifyApiErrorForUser(error, isImage = false) {
  const message = cleanPreferenceText(error?.message || '', 240);
  const normalized = message.toLowerCase();

  if (error?.name === 'AbortError' || /zaman a[sş]imi|timeout/.test(normalized)) {
    return 'Bağlantı gecikmesi yaşandı. İnternetini kontrol edip tekrar dene.';
  }
  if (/cok fazla istek|çok fazla istek|rate limit|limit/.test(normalized)) {
    const quota = buildQuotaSuffix().replace(' • ', '');
    return quota
      ? `Analiz sınırına yaklaştın. ${quota}.`
      : 'Analiz sınırına ulaşıldı. Lütfen kısa süre sonra tekrar dene.';
  }
  if (isImage && /gorsel|görsel|image|foto/.test(normalized)) {
    return 'Görsel okunamadı. Daha net veya farklı bir fotoğrafla tekrar dene.';
  }
  if (/sunucu|provider|sa[gğ]layici|gateway|502|503|504/.test(normalized)) {
    return 'Analiz servisi şu an yoğun. Birkaç dakika sonra yeniden dene.';
  }
  return message || 'Beklenmedik bir hata oluştu. Tekrar dene.';
}

async function refreshHealthChip() {
  const chip = document.getElementById('status-chip');
  if (!chip) return;

  try {
    let res = await fetch('/api/health', { cache: 'no-store' });
    if (res.status === 404) {
      res = await fetch('/api/ops?r=health', { cache: 'no-store' });
    }
    if (!res.ok) throw new Error('health-not-ok');
    const data = await res.json();
    const checks = data?.checks || {};

    const providerOk = checks.providerConfigured === true;
    const kvOk = checks.kvConfigured === true;
    const store = checks.storeBackend || 'unknown';

    chip.classList.remove('ok', 'warn');
    chip.classList.add(providerOk && kvOk ? 'ok' : 'warn');
    chip.textContent = buildHealthChipText(providerOk, kvOk, store);
  } catch {
    chip.classList.remove('ok');
    chip.classList.add('warn');
    chip.textContent = 'Sistem geçici bağlantı sorunu yaşıyor';
  }
}

/* ── TAB SWITCHING ── */
/* [split] auth moved to /lib/app/auth.js */

async function refreshHealthChipV2() {
  const chip = document.getElementById('status-chip');
  if (!chip) return;

  const healthTimeout = setTimeout(() => {
    if (chip.textContent === 'Sistem kontrol ediliyor...') {
      chip.classList.remove('ok');
      chip.classList.add('warn');
      chip.textContent = 'Sistem yanıt vermekte gecikiyor, tekrar deneniyor';
    }
  }, 3600);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    let res = await fetch('/api/health', { cache: 'no-store', signal: controller.signal });
    if (res.status === 404) {
      res = await fetch('/api/ops?r=health', { cache: 'no-store', signal: controller.signal });
    }
    clearTimeout(timer);
    if (!res.ok) throw new Error('health-not-ok');
    const data = await res.json();
    const checks = data?.checks || {};

    const providerOk = checks.providerConfigured === true;
    const kvOk = checks.kvConfigured === true;
    const store = checks.storeBackend || 'unknown';

    chip.classList.remove('ok', 'warn');
    chip.classList.add(providerOk && kvOk ? 'ok' : 'warn');
    chip.textContent = buildHealthChipText(providerOk, kvOk, store);
  } catch {
    chip.classList.remove('ok');
    chip.classList.add('warn');
    chip.textContent = 'Sistem geçici bağlantı sorunu yaşıyor';
  } finally {
    clearTimeout(healthTimeout);
  }
}

function compressAndSet(dataUrl, originalMime) {
  const img = new Image();
  img.onload = function() {
    const MAX = 1024;
    const MAX_INLINE_IMAGE_BYTES = 2.6 * 1024 * 1024;
    let w = img.naturalWidth, h = img.naturalHeight;
    if (w > MAX || h > MAX) {
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else { w = Math.round(w * MAX / h); h = MAX; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      imageBase64 = img.src.split(',')[1];
      imageMimeType = 'image/jpeg';
      document.getElementById('preview-img').src = img.src;
      document.getElementById('preview-img').classList.add('visible');
      document.getElementById('upload-placeholder').classList.add('hidden');
      checkReady();
      return;
    }
    ctx.drawImage(img, 0, 0, w, h);
    let quality = 0.86;
    let finalUrl = canvas.toDataURL('image/jpeg', quality);
    while (((finalUrl.length * 0.75) > MAX_INLINE_IMAGE_BYTES) && quality > 0.45) {
      quality = Number((quality - 0.08).toFixed(2));
      finalUrl = canvas.toDataURL('image/jpeg', quality);
    }

    if ((finalUrl.length * 0.75) > MAX_INLINE_IMAGE_BYTES) {
      showError('Gorsel cok buyuk. Lutfen daha yakin veya kirpilmis bir kare sec.');
      return;
    }
    imageBase64 = finalUrl.split(',')[1];
    imageMimeType = 'image/jpeg';
    const previewImg = document.getElementById('preview-img');
    previewImg.src = finalUrl;
    previewImg.classList.add('visible');
    document.getElementById('upload-placeholder').classList.add('hidden');
    checkReady();
  };
  img.onerror = function() {
    imageBase64 = dataUrl.split(',')[1];
    imageMimeType = originalMime || 'image/jpeg';
    const previewImg = document.getElementById('preview-img');
    previewImg.src = dataUrl;
    previewImg.classList.add('visible');
    document.getElementById('upload-placeholder').classList.add('hidden');
    checkReady();
  };
  img.src = dataUrl;
}

document.getElementById('file-input').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const MAX_FILE_MB = 20;
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    showError(`Dosya çok büyük (${(file.size/1024/1024).toFixed(1)} MB). Lütfen ${MAX_FILE_MB} MB'dan küçük bir görsel seç.`);
    e.target.value = '';
    return;
  }

  if (!file.type.startsWith('image/')) {
    showError('Lütfen bir görsel dosyası seç (JPG, PNG, WEBP, HEIC).');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(ev) {
    compressAndSet(ev.target.result, file.type);
  };
  reader.onerror = function() {
    showError('Dosya okunamadı. Farklı bir görsel dene.');
  };
  reader.readAsDataURL(file);
});

function checkReady() {
  const btn = document.getElementById('analyze-btn');
  let disabled;
  if (activeTab === 'photo') {
    disabled = !imageBase64;
  } else if (activeTab === 'text') {
    const val = document.getElementById('text-input').value.trim();
    disabled = val.length < 2;
  } else {
    const notes = parseNoteListInput(document.getElementById('notes-input')?.value || '');
    disabled = notes.length < 2;
  }
  btn.disabled = disabled;
  btn.setAttribute('aria-disabled', String(disabled));
}

/* ── ANALYZE ── */
async function analyze() {
  emitEvent('analysis_triggered', { tab: activeTab });
  if (activeTab === 'photo') {
    if (!imageBase64) return;
    await analyzeImage();
  } else if (activeTab === 'text') {
    const text = document.getElementById('text-input').value.trim();
    if (!text) return;
    await analyzeText(text);
  } else {
    const notes = parseNoteListInput(document.getElementById('notes-input')?.value || '');
    if (notes.length < 2) {
      showError('Nota listesinde en az 2 nota girmen gerekiyor.');
      return;
    }
    await analyzeNotes(notes);
  }
}

function startLoading() {
  clearLoadingWatchdog();
  document.getElementById('controls').style.display = 'none';
  document.getElementById('loading-state').classList.add('visible');
  document.getElementById('result-card').classList.remove('visible');
  document.getElementById('error-box').classList.remove('visible');
  document.getElementById('reset-btn').classList.remove('visible');
  startLoadingMessages();
  armLoadingWatchdog();
}

async function analyzeImage() {
  if (!imageBase64 || (imageBase64.length * 0.75) > (2.9 * 1024 * 1024)) {
    showError('Gorsel boyutu limitin ustunde. Lutfen daha kucuk bir fotograf secip tekrar dene.');
    return;
  }
  startLoading();
  emitEvent('analysis_started', { input: 'image' });
  const userContent = [
    { type: "image", source: { type: "base64", media_type: imageMimeType, data: imageBase64 } },
    { type: "text", text: "Bu görseli analiz et. Eğer parfüm şişesi ise etiketteki adı oku ve o parfümün gerçek notalarını bilginden kullan. JSON formatında yanıtla." }
  ];
  await callAPIStable([{ role: "user", content: userContent }], true);
}

const FRONTEND_CACHE_TTL = 15 * 60 * 1000; 

function getCacheKey(text) {
  return 'koku_cache_v2_' + btoa(encodeURIComponent(text.trim().toLowerCase().slice(0, 100)));
}

function getFromCache(text) {
  try {
    const raw = localStorage.getItem(getCacheKey(text));
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) { localStorage.removeItem(getCacheKey(text)); return null; }
    return data;
  } catch { return null; }
}

function saveToCache(text, data) {
  try {
    localStorage.setItem(getCacheKey(text), JSON.stringify({
      data, expiresAt: Date.now() + FRONTEND_CACHE_TTL
    }));
  } catch {}
}

async function analyzeText(text) {
  const cached = getFromCache(text);
  if (cached) {
    startLoading();
    stopLoadingMessages();
    emitEvent('analysis_cache_hit', { input: 'text' });
    setTimeout(() => { void safeShowResult(cached, false, false, 'cache-text'); }, 300);
    return;
  }
  startLoading();
  emitEvent('analysis_started', {
    input: 'text',
    text_length: String(text.length),
  });
  const userContent = `Aşağıdaki koku tarifini veya parfüm adını analiz et ve JSON formatında yanıtla:\n\n"${text}"\n\nEğer bu bir parfüm adı ise (marka + isim), o parfümün gerçek formülasyonunu ve notalarını kullan. Eğer bir koku tarifi ise, o tarife uygun hayali ama gerçekçi bir parfüm profili oluştur.`;
  await callAPIStable([{ role: "user", content: userContent }], false, text);
}

async function analyzeNotes(notes) {
  const noteList = Array.isArray(notes) ? notes : [];
  const compact = noteList.join(', ');
  const cacheKey = `nota-listesi:${compact.toLowerCase()}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    startLoading();
    stopLoadingMessages();
    emitEvent('analysis_cache_hit', { input: 'notes' });
    setTimeout(() => { void safeShowResult(cached, false, false, 'cache-notes'); }, 300);
    return;
  }

  startLoading();
  emitEvent('analysis_started', {
    input: 'notes',
    notes_count: String(noteList.length),
  });
  const userContent = `Asagidaki nota listesine gore koku profili olustur ve sadece JSON don.\n\nNOTA LISTESI: ${compact}\n\nKurallar:\n- Girilen notalara sadik kal.\n- Pyramid null olmasin; top/middle/base dagitimi yap.\n- Molekul alaninda notalara dayali gercekci secimler ver.\n- Karsilastirma onerilerinde "benzer profil" dili kullan.`;
  await callAPIStable([{ role: 'user', content: userContent }], false, cacheKey);
}

async function callAPIStable(messages, isImage, cacheText = null) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_REQUEST_TIMEOUT_MS);
    const profilePromptExtra = buildProfilePromptExtra('analysis');
    const payload = { promptType: 'analysis', messages };
    if (profilePromptExtra) {
      payload.promptExtra = profilePromptExtra;
      emitEvent('analysis_personalized_request');
    }

    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    syncUsageQuotaFromHeaders(response);

    const data = await response.json().catch(() => ({}));
    stopLoadingMessages();

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitSec = retryAfter ? parseInt(retryAfter, 10) : 60;
      throw new Error(typeof data.error === 'string' ? data.error : `Cok fazla istek. ${waitSec} saniye sonra tekrar dene.`);
    }
    if (response.status === 504) throw new Error('Istek zaman asimina ugradi. Internet baglantini kontrol et ve tekrar dene.');
    if (response.status === 500) throw new Error('Sunucu hatasi olustu. Lutfen biraz sonra tekrar dene.');
    if (response.status === 400) {
      const isImagePayload = Array.isArray(messages?.[0]?.content);
      const fallback = isImagePayload
        ? 'Gorsel istegi dogrulanamadi. Daha kucuk/farkli bir fotografla tekrar dene.'
        : 'Gecersiz istek. Lutfen girdini kontrol et.';
      throw new Error(typeof data.error === 'string' ? data.error : fallback);
    }
    if (data.error) {
      const errMsg = typeof data.error === 'string'
        ? data.error
        : (data.error.message || JSON.stringify(data.error));
      throw new Error(errMsg);
    }

    let result;
    try {
      result = parseAnalysisPayload(data);
    } catch {
      throw new Error('Analiz formati hatali. Tekrar dene.');
    }

    if (!Array.isArray(result.molecules) || result.molecules.length === 0) {
      if (result.molecule?.name) {
        result.molecules = [{ name: result.molecule.name, note: 'single', contribution: '' }];
      }
    }

    if (cacheText && !isImage) saveToCache(cacheText, result);
    emitEvent('analysis_succeeded', {
      input: isImage ? 'image' : 'text',
      provider: response.headers.get('X-AI-Provider') || 'unknown',
      cache: response.headers.get('X-Cache') || 'none',
    });
    recordRetentionEvent('analysis_success');
    await safeShowResult(result, true, isImage, 'api-stable');
  } catch (err) {
    stopLoadingMessages();
    emitEvent('analysis_failed', {
      input: isImage ? 'image' : 'text',
      reason: err?.name === 'AbortError' ? 'timeout' : 'error',
    });
    const fallbackResult = buildEmergencyAnalysisResult(messages, isImage, err?.message || err?.name || '');
    if (fallbackResult) {
      showToast('AI gecici olarak yavas. Yedek analiz modu acildi.');
      emitEvent('analysis_emergency_fallback_used', {
        input: isImage ? 'image' : 'text',
      });
      await safeShowResult(fallbackResult, true, isImage, 'api-stable-fallback');
      return;
    }
    showError(classifyApiErrorForUser(err, isImage));
  }
}

async function callAPI(messages, isImage, cacheText = null) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_REQUEST_TIMEOUT_MS);
    const profilePromptExtra = buildProfilePromptExtra('analysis');
    const payload = { promptType: 'analysis', messages };
    if (profilePromptExtra) {
      payload.promptExtra = profilePromptExtra;
      emitEvent('analysis_personalized_request');
    }

    const response = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    syncUsageQuotaFromHeaders(response);

    const data = await response.json().catch(() => ({}));
    stopLoadingMessages();

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitSec = retryAfter ? parseInt(retryAfter) : 60;
      throw new Error(typeof data.error === 'string' ? data.error : `Çok fazla istek. ${waitSec} saniye sonra tekrar dene.`);
    }
    if (response.status === 504) throw new Error('İstek zaman aşımına uğradı. İnternet bağlantını kontrol et ve tekrar dene.');
    if (response.status === 500) throw new Error('Sunucu hatası oluştu. Lütfen biraz sonra tekrar dene.');
    if (response.status === 400) throw new Error(typeof data.error === 'string' ? data.error : 'Geçersiz istek. Lütfen girişini kontrol et.');
    if (data.error) { const errMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error)); throw new Error(errMsg); }

    let result;
    try {
      result = parseAnalysisPayload(data);
    } catch {
      throw new Error('Analiz formatı hatalı. Tekrar dene.');
    }

    if (!Array.isArray(result.molecules) || result.molecules.length === 0) {
      if (result.molecule?.name) {
        result.molecules = [{ name: result.molecule.name, note: 'single', contribution: '' }];
      }
    }

    if (cacheText && !isImage) saveToCache(cacheText, result);
    emitEvent('analysis_succeeded', {
      input: isImage ? 'image' : 'text',
      provider: response.headers.get('X-AI-Provider') || 'unknown',
      cache: response.headers.get('X-Cache') || 'none',
    });
    recordRetentionEvent('analysis_success');
    await safeShowResult(result, true, isImage, 'api-legacy');

  } catch (err) {
    stopLoadingMessages();
    emitEvent('analysis_failed', {
      input: isImage ? 'image' : 'text',
      reason: err?.name === 'AbortError' ? 'timeout' : 'error',
    });
    showError(classifyApiErrorForUser(err, isImage));
  }
}

async function showResult(r, save = false, isImage = true) {
  try {
    document.getElementById('loading-state').classList.remove('visible');
    document.getElementById('main-card').style.display = 'none';
    const sanitized = sanitizeAnalysisResultShape(r);
    const workingResult = stabilizeMoleculeSet({ ...sanitized });
    r = workingResult;
    currentResultData = workingResult || null;
    deepDiveExpanded = false;
    hideCompareResult();
    ADVANCED_RESULT_SECTION_IDS.forEach((sectionId) => setSectionHasContent(sectionId, false));
    const toStringList = (value, max = 8) => (
      Array.isArray(value)
        ? value
          .map((item) => cleanPreferenceText(item, 120))
          .filter(Boolean)
          .slice(0, max)
        : []
    );
    const safeSeason = toStringList(r?.season, 4);
    const safeOccasions = toStringList(r?.persona?.occasions, 6);
    const safeDupes = toStringList(r?.dupes, 6);
    const safeTechnical = Array.isArray(r?.technical)
      ? r.technical
        .filter((row) => row && typeof row === 'object')
        .map((row) => ({
          label: cleanPreferenceText(row.label || '', 48),
          value: cleanPreferenceText(row.value || '', 120),
          score: Number.isFinite(Number(row.score))
            ? Math.max(0, Math.min(100, Math.round(Number(row.score))))
            : undefined,
        }))
        .filter((row) => row.label && row.value)
      : [];
    const safePyramid = {
      top: toStringList(r?.pyramid?.top, 8),
      middle: toStringList(r?.pyramid?.middle, 8),
      base: toStringList(r?.pyramid?.base, 8),
    };
    r.season = safeSeason;
    if (r.persona && typeof r.persona === 'object') r.persona.occasions = safeOccasions;
    r.dupes = safeDupes;
    r.technical = safeTechnical;
    if (r.pyramid && typeof r.pyramid === 'object') r.pyramid = safePyramid;

  const resolvedIconToken = resolvePremiumIconToken(r, SCENT_TOKEN_FALLBACK);
  r.iconToken = resolvedIconToken;
  if (typeof renderIcon === 'function') {
    renderIcon(document.getElementById('result-emoji'), resolvedIconToken);
  }
  const resultNameEl = document.getElementById('result-name');
  if (resultNameEl) {
    resultNameEl.textContent = r.name || 'Bilinmeyen Koku';
    resultNameEl.classList.remove('is-lit');
    requestAnimationFrame(() => resultNameEl.classList.add('is-lit'));
  }
  document.getElementById('desc-text').textContent = r.description || '';

  const existingBuy = document.getElementById('result-buy-links');
  if (existingBuy) existingBuy.remove();
  const hasPyramid = !!(r.pyramid && (r.pyramid.top || r.pyramid.middle || r.pyramid.base));
  if (hasPyramid && r.name && r.name !== 'Geçersiz Görsel') {
    const officialUrl = resolveOfficialProductUrlSafe(r);
    const buyDiv = document.createElement('div');
    buyDiv.id = 'result-buy-links';
    buyDiv.style.cssText = 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;';
    let btns = '';
    if (officialUrl) {
      btns += `<a href="${officialUrl}" target="_blank" rel="noopener noreferrer" class="result-buy-btn">Resmi Site</a>`;
    }
    buyDiv.innerHTML = btns;
    if (btns) {
      document.getElementById('result-name').insertAdjacentElement('afterend', buyDiv);
    }
  }

  const isInvalid = (r.name === 'Geçersiz Görsel' || r.name === 'Bilinmeyen Koku' || r.intensity === 0);
  if (isInvalid) {
    currentResultData = null;
    deepDiveExpanded = false;
    renderIcon(document.getElementById('result-emoji'), 'blocked');
    document.getElementById('result-name').textContent = r.description || 'Bu görsel tanımlanamadı.';
    const scTitle = document.querySelector('.scent-title .label');
    if (scTitle) scTitle.style.display = 'none';
    ['sec-description','sec-pyramid','sec-note-ontology','sec-fragrance-wheel','sec-technical','sec-molecule','sec-similar',
     'sec-community-pulse','sec-store-links','sec-layering','sec-scores','sec-persona','sec-dupe'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.classList.remove('revealed'); }
    });
    syncAdvancedSectionsVisibility();
    const intBar = document.getElementById('intensity-track')?.closest('.intensity-bar');
    if (intBar) intBar.style.display = 'none';
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) shareBtn.style.display = 'none';
    document.getElementById('result-card').classList.add('visible');
    document.getElementById('reset-btn').classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (navigator.vibrate) navigator.vibrate(30);
    return;
  }

  const descriptionSection = document.getElementById('sec-description');
  if (descriptionSection) descriptionSection.style.display = r.description ? '' : 'none';
  const similarSection = document.getElementById('sec-similar');
  const hasSimilar = (Array.isArray(r.similar) && r.similar.length > 0)
    || (Array.isArray(r?.similarity?.candidates) && r.similarity.candidates.length > 0);
  if (similarSection) similarSection.style.display = hasSimilar ? '' : 'none';
  const feedbackSection = document.getElementById('sec-feedback');
  if (feedbackSection) {
    feedbackSection.style.display = ENABLE_QUICK_FEEDBACK ? '' : 'none';
    feedbackSection.dataset.reasonOpen = 'false';
  }
  renderCurrentResultFeedbackState();
  const scTitleLabel = document.querySelector('.scent-title .label');
  if (scTitleLabel) scTitleLabel.style.display = '';
  const intBarEl = document.getElementById('intensity-track')?.closest('.intensity-bar');
  if (intBarEl) intBarEl.style.display = '';
  // Karar merkezi kutusu kaldirildi; resmi site linki adin altinda gorunuyor.

  const metaRow = document.getElementById('meta-row');
  if (metaRow) {
    metaRow.innerHTML = '';
    const metas = [r.family, r.occasion, ...safeSeason]
      .map((item) => cleanPreferenceText(item, 60))
      .filter(Boolean);
    metas.forEach((m) => {
      const span = document.createElement('span');
      span.className = 'meta-pill';
      span.textContent = m;
      metaRow.appendChild(span);
    });
  }

  const secTech = document.getElementById('sec-technical');
  const techRows = document.getElementById('technical-rows');
  if (safeTechnical.length > 0 && techRows) {
    setSectionHasContent('sec-technical', true);
    const familyBarColor = {
      'Taze':'#6fb3a0', 'Aromatik':'#6fb3a0', 'Fougère':'#6fb3a0',
      'Çiçeksi':'#c89abe', 'Chypre':'#9b6fa0',
      'Odunsu':'#c8a97e', 'Gourmand':'#c8a97e',
      'Oryantal':'#e09860',
    };
    const barBase = familyBarColor[r.family] || 'var(--accent)';
    techRows.innerHTML = safeTechnical.map(t => {
      const row = { ...t, label: safeText(t.label), value: safeText(t.value) };
      if (row.score !== undefined) {
        return `<div class="tech-row">
          <span class="tech-label">${row.label}</span>
          <div class="tech-bar-wrap">
            <span class="tech-value" style="font-size:12px">${row.value}</span>
            <div class="tech-bar-track">
              <div class="tech-bar-fill" style="width:0%;background:${barBase}" data-score="${row.score}"></div>
            </div>
            <span class="tech-bar-label">${row.score}%</span>
          </div>
        </div>`;
      }
      return `<div class="tech-row">
        <span class="tech-label">${row.label}</span>
        <span class="tech-value">${row.value}</span>
      </div>`;
    }).join('');
    setTimeout(() => {
      techRows.querySelectorAll('.tech-bar-fill').forEach(el => {
        el.style.width = el.dataset.score + '%';
      });
    }, 400);
  } else {
    if (techRows) techRows.innerHTML = '';
    setSectionHasContent('sec-technical', false);
  }

  const pyramidSection = document.getElementById('sec-pyramid');
  const pyramidRows = document.getElementById('pyramid-rows');
  const hasPyramidData = safePyramid.top.length > 0 || safePyramid.middle.length > 0 || safePyramid.base.length > 0;
  if (hasPyramidData && pyramidRows) {
    setSectionHasContent('sec-pyramid', true);
    if (pyramidSection) pyramidSection.style.display = 'block';
    const pyramidEntries = [
      { label: 'Üst', notes: safePyramid.top },
      { label: 'Kalp', notes: safePyramid.middle },
      { label: 'Alt', notes: safePyramid.base },
    ].filter((entry) => Array.isArray(entry.notes) && entry.notes.length > 0);
    pyramidRows.innerHTML = pyramidEntries.map((entry) => `
      <div class="pyramid-row">
        <span class="pyramid-label">${entry.label}</span>
        <span class="pyramid-notes">${safeText(entry.notes.join(', ')).replace(/,([^\s])/g, ', $1').replace(/,\s*/g, ' • ')}</span>
      </div>
    `).join('');

    const pyrTimeline = document.getElementById('pyramid-timeline');
    if (pyrTimeline) {
      window._currentTimeline = null;
      const tl = r.timeline || {
        t0: safePyramid.top.length ? `Üst notalar öne çıkıyor: ${safePyramid.top.slice(0, 3).join(', ')}` : null,
        t1: 'Koku açılıyor, kalp notalar beliriyor',
        t2: safePyramid.middle.length ? `Kalp notalar hâkim: ${safePyramid.middle.slice(0, 3).join(', ')}` : 'Koku olgunlaşıyor',
        t3: safePyramid.base.length ? `Sadece baz notalar kalıyor: ${safePyramid.base.slice(0, 3).join(', ')}` : 'Derin iz bırakıyor',
      };
      window._currentTimeline = tl;
      pyrTimeline.style.display = 'block';
      const slider = document.getElementById('time-slider');
      if (slider) slider.value = 0;
      updateTimelineDisplay(0);
      setTimeout(() => startParticleAnimation(), 100);
    }
  } else {
    if (pyramidRows) pyramidRows.innerHTML = '';
    setSectionHasContent('sec-pyramid', false);
    if (pyramidSection) pyramidSection.style.display = 'none';
  }

  renderNoteOntology(r);
  const wheelHost = document.getElementById('fragrance-wheel');
  const hasWheelData = Boolean(
    (Array.isArray(r?.noteOntology?.families) && r.noteOntology.families.length >= 2)
    || (r?.scores && typeof r.scores === 'object')
  );
  setSectionHasContent('sec-fragrance-wheel', hasWheelData);
  if (wheelHost) {
    if (hasWheelData) {
      window.KokuFragranceWheel?.render?.(wheelHost, r);
    } else {
      wheelHost.innerHTML = '';
    }
  }

  const intensity = r.intensity || 70;
  const intensityFill = document.getElementById('intensity-fill');
  const intensityTrack = document.getElementById('intensity-track');
  const intensityValue = document.getElementById('intensity-value');
  const iColor = intensity >= 80 ? '#e05555' : intensity >= 60 ? '#c8a97e' : intensity >= 40 ? '#6fb3a0' : '#9b6fa0';
  if (intensityValue) intensityValue.textContent = intensity + '%';
  if (intensityFill && intensityTrack) {
    intensityFill.style.color = iColor;
    intensityFill.style.background = `linear-gradient(90deg, ${iColor}44, ${iColor}cc)`;
    intensityFill.classList.remove('ready');

    setTimeout(() => {
      intensityFill.style.width = intensity + '%';

      setTimeout(() => {
        intensityFill.classList.add('ready');
        if (!intensityTrack) return;

        const count = Math.floor(intensity / 14) + 4;
        for (let i = 0; i < count; i++) {
          setTimeout(() => {
            const p = document.createElement('div');
            p.className = 'scent-particle';
            const size = 2 + Math.random() * 3.5;
            const startX = (intensity - 5 + Math.random() * 10);
            const tx = (Math.random() - 0.5) * 30;
            const ty = -(14 + Math.random() * 22);
            const dur = 1.8 + Math.random() * 1.4;
            const op = 0.3 + Math.random() * 0.45;
            p.style.cssText = [
              `width:${size}px`, `height:${size}px`,
              `left:${startX}%`, `top:50%`,
              `background:${iColor}`,
              `--tx:${tx}px`, `--ty:${ty}px`,
              `--dur:${dur}s`, `--delay:0s`, `--op:${op}`,
              `box-shadow:0 0 ${size + 2}px ${iColor}88`,
            ].join(';');
            intensityTrack.appendChild(p);
            setTimeout(() => p.remove(), (dur + 0.2) * 1000);
          }, i * 160);
        }
      }, 1500);
    }, 300);
  }

  const similarityRanked = rankSimilarityForUser(r);
  if (similarityRanked.length) {
    r.similar = similarityRanked.map((item) => item.name).slice(0, 6);
    r.similarity = {
      ...(r.similarity || {}),
      ranked: similarityRanked,
    };
  }

  const pillsContainer = document.getElementById('similar-pills');
  if (pillsContainer) pillsContainer.innerHTML = '';
  const pillClasses = ['pill-a', 'pill-b', 'pill-c', 'pill-a'];
  similarityRanked.forEach((item, i) => {
    const s = item.name;
    const span = document.createElement('span');
    span.className = `pill ${pillClasses[i % pillClasses.length]}`;
    span.textContent = s;
    const scoreLabel = Number.isFinite(item.finalScore) ? `${item.finalScore}/100` : '-';
    span.title = `${s} analiz et (${scoreLabel})`;
    span.style.cursor = 'pointer';
    span.onclick = () => {
      switchTab('text');
      document.getElementById('text-input').value = s;
      document.getElementById('main-card').style.display = '';
      reset();
      setTimeout(() => {
        document.getElementById('text-input').value = s;
        checkReady();
      }, 100);
    };
    if (pillsContainer) pillsContainer.appendChild(span);
  });

  const similarityInsight = document.getElementById('similarity-insight');
  if (similarityInsight) {
    if (similarityRanked.length) {
      const best = similarityRanked[0];
      const hasFeedbackImpact = similarityRanked.some((item) => Math.abs(item.userBoost) >= 0.5);
      similarityInsight.style.display = 'block';
      similarityInsight.textContent = hasFeedbackImpact
        ? `Sıralama v1: nota + molekül + geri bildirim etkisiyle güncellendi. En yakın aday: ${best.name} (${best.finalScore}/100).`
        : `Sıralama v1: nota + molekül benzerliğiyle hesaplandı. En yakın aday: ${best.name} (${best.finalScore}/100).`;
    } else {
      similarityInsight.style.display = 'none';
      similarityInsight.textContent = '';
    }
  }

  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) shareBtn.style.display = 'flex';

  const molNote = document.getElementById('molecule-note');
  if (molNote) {
    const moleculeSource = cleanPreferenceText(r?.verification?.moleculeSource || r?.moleculeMeta?.source || '', 40);
    const matchedPerfume = cleanPreferenceText(r?.verification?.matchedPerfume || r?.moleculeMeta?.matchedPerfume || '', 140);
    const moleculeCount = Number(r?.moleculeMeta?.count || (Array.isArray(r?.molecules) ? r.molecules.length : 0));
    if (matchedPerfume && moleculeSource === 'official-derived') {
      molNote.textContent = `${moleculeCount} anahtar molekül, ${matchedPerfume} için resmi nota izinden türetildi. Bu alan artık model tahmininden daha güçlü bir veri omurgasına dayanıyor.`;
    } else if (moleculeSource === 'note-derived') {
      molNote.textContent = `${moleculeCount} molekül, nota piramidinden kurallı olarak türetildi. Bu yüzden kartlar koku profilini daha açıklanabilir hale getiriyor.`;
    } else if (r.molecule && r.molecule.name) {
      molNote.textContent = `Önerilen parfümler ${r.molecule.name} molekülünü içeren veya benzer kimyasal profili paylaşan seçimlerdir.`;
    } else {
      molNote.textContent = '';
    }
  }

  const secScores = document.getElementById('sec-scores');
  const normalizedScores = r.scores && typeof r.scores === 'object'
    ? {
      freshness: Math.max(0, Math.min(100, Number(r.scores.freshness || 0))),
      sweetness: Math.max(0, Math.min(100, Number(r.scores.sweetness || 0))),
      warmth: Math.max(0, Math.min(100, Number(r.scores.warmth || 0))),
    }
    : null;
  if (normalizedScores && secScores) {
    setSectionHasContent('sec-scores', true);
    const scoreItems = [
      { key:'freshness', label:'Tazelik',  color:'#6fb3a0' },
      { key:'sweetness', label:'Tatlılık', color:'#c89abe' },
      { key:'warmth',    label:'Sıcaklık', color:'#e09860' },
    ];
    const scoresWrap = document.getElementById('scores-wrap');
    if (scoresWrap) {
      scoresWrap.innerHTML = scoreItems.map((s) =>
        `<div class="score-row">
          <span class="score-label">${s.label}</span>
          <div class="score-track"><div class="score-fill" style="background:${s.color}" data-score="${normalizedScores[s.key] || 0}"></div></div>
          <span class="score-val">${normalizedScores[s.key] || 0}</span>
        </div>`
      ).join('');
    }
    setTimeout(() => {
      document.querySelectorAll('.score-fill').forEach(el => {
        el.style.width = (el.dataset.score || 0) + '%';
      });
    }, 350);
    const pw = document.getElementById('persona-wrap');
    if (r.persona && pw) {
      const personaTone = formatPersonaTone(r.persona);
      pw.innerHTML = [r.persona.vibe, r.persona.gender, personaTone].filter(Boolean)
        .map(t => `<span class="persona-tag">${t}</span>`).join('');
    }
  } else if (secScores) {
    setSectionHasContent('sec-scores', false);
  }

  const isPerfume = hasPyramidData;

  const secPersona = document.getElementById('sec-persona');
  if (isPerfume && r.persona && secPersona) {
    setSectionHasContent('sec-persona', true);
    const p = r.persona;
    const personaTone = formatPersonaTone(p);
    const rows = [
      { iconToken: 'gender', label: 'Kime daha çok uyar', val: p.gender || '' },
      { iconToken: 'profile', label: 'Stil', val: personaTone },
      { iconToken: 'vibe', label: 'Karakter', val: p.vibe || '' },
      { iconToken: 'occasion', label: 'En uygun ortam', val: safeOccasions.join(' • ') },
      { iconToken: 'season', label: 'Mevsim', val: p.season || '' },
    ].filter(r => r.val);
    const personaRows = document.getElementById('persona-rows');
    if (personaRows) {
      personaRows.innerHTML = rows.map(r =>
        `<div class="persona-row">
          <span class="persona-row-icon">${personaIconMarkup(r.iconToken)}</span>
          <span class="persona-row-label">${r.label}</span>
          <span class="persona-row-val">${safeText(String(r.val || '').replace(/\s{2,}/g, ' • '))}</span>
        </div>`
      ).join('');
    }
  } else if (secPersona) {
    setSectionHasContent('sec-persona', false);
  }

  const secDupe = document.getElementById('sec-dupe');
  const cheapBrands = ['zara','lidl','oriflame','avon','farmasi','koton','lc waikiki','flormar','rossman','de facto'];
  const isAlreadyCheap = cheapBrands.some(b => (r.name || '').toLowerCase().includes(b));
  
  if (isPerfume && !isAlreadyCheap && safeDupes.length > 0 && secDupe) {
    setSectionHasContent('sec-dupe', true);
    
    const dpills = document.getElementById('dupe-pills');
    const dupeNote = document.getElementById('dupe-note');
    if (dpills) {
      dpills.style.display = 'flex';
      dpills.style.flexWrap = 'wrap';
      dpills.style.gap = '8px';
      dpills.innerHTML = safeDupes.map((d) =>
        `<button class="dupe-pill" style="margin:0;" onclick="analyzeDupe('${d.replace(/'/g,"\\'")}')">
          <span>${d}</span><span class="dupe-pill-arrow">→</span>
        </button>`
      ).join('');
    }
    if (dupeNote) dupeNote.textContent = 'Benzer profil, daha ulaşılabilir fiyat. Analiz için dokun.';
  } else if (secDupe) {
    setSectionHasContent('sec-dupe', false);
  }

  const secLayering = document.getElementById('sec-layering');
  const layeringDesc = document.getElementById('layering-desc');
  const combo = document.getElementById('layering-combo');
  const layeringResult = document.getElementById('layering-result');
  if (r.layering && r.layering.pair && combo && layeringResult) {
    setSectionHasContent('sec-layering', true);
    if (layeringDesc) layeringDesc.textContent = 'En iyi kombinasyon:';
    combo.innerHTML = `<span class="layer-pill">${safeText(r.name || 'Bu koku')}</span><span class="layer-plus">+</span><span class="layer-pill">${safeText(r.layering.pair)}</span>`;
    layeringResult.textContent = r.layering.result || '';
  } else {
    setSectionHasContent('sec-layering', false);
  }

  syncAdvancedSectionsVisibility();
  window.scrollTo({ top: 0, behavior: 'auto' });
  document.getElementById('result-card').classList.add('visible');
  document.getElementById('reset-btn').classList.add('visible');

  if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

  activateAura(r.family);
  syncAdvancedSectionsVisibility();

  ['sec-description', 'sec-pyramid', 'sec-note-ontology', 'sec-fragrance-wheel', 'sec-similar', 'sec-community-pulse', 'sec-store-links', 'sec-molecule'].forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el && el.style.display !== 'none') el.classList.add('revealed');
    }, 200 + i * 160);
  });

  try {
    if (typeof renderStoreLinks === 'function') renderStoreLinks(r);
  } catch (storeError) {
    console.warn('renderStoreLinks failed:', storeError);
  }

  try {
    if (typeof loadCommunityPulse === 'function') {
      await loadCommunityPulse(r.name);
    }
  } catch (communityError) {
    console.warn('loadCommunityPulse failed:', communityError);
  }

  try {
    if (typeof renderMoleculeCards === 'function') {
      await renderMoleculeCards(r);
    }
  } catch (moleculeError) {
    console.warn('renderMoleculeCards failed:', moleculeError);
  }
  syncAdvancedSectionsVisibility();

  if (save) {
    try {
      const imgEl = document.getElementById('preview-img');
      const imgSrc = isImage && imgEl ? imgEl.src : null;
      await saveToHistory(r, imgSrc);
    } catch (historyError) {
      console.warn('saveToHistory failed:', historyError);
    }
    safePushFeedEvent('analysis_done', {
      perfume: cleanPreferenceText(r?.name || '', 120),
      detail: 'Analiz sonucu olusturuldu',
    });
  }
  } catch (error) {
    console.error('showResult runtime error:', error);
    window.KokuCore?.emitClientError?.('error', 'show_result_runtime', {
      reason: cleanPreferenceText(error?.message || 'unknown', 180),
      phase: 'render',
    });
    const resultVisible = document.getElementById('result-card')?.classList.contains('visible');
    if (!resultVisible) {
      renderRecoveryResultCard(r, error?.message || 'render');
      showToast('Detaylardan biri yuklenemedi. Temel kart gosteriliyor.');
    } else {
      showToast('Bazi moduller gecici olarak yuklenemedi.');
    }
    return false;
  }
}

/* ── KOKU PARTİKÜL SİSTEMİ ── */
let _particleAnim = null;
let _particles = [];
let _sliderVal = 0;

const STAGE_X = [0.06, 0.35, 0.65, 0.94];

const PARTICLE_PROFILES = [
  { size:1.2, op:0.9,  speed:1.4,  colors:['#ffd580','#e8c878','#ffe0a0'], count:14 }, 
  { size:1.4, op:0.75, speed:0.65, colors:['#d4a0cc','#b87ab0','#f0c0e0'], count:10 }, 
  { size:1.6, op:0.6,  speed:0.42, colors:['#7ec8b8','#6fb3a0','#a0d0c8'], count:7  }, 
  { size:1.8, op:0.38, speed:0.35, colors:['#b0a090','#c8a97e','#907880'], count:4  }, 
];

function getProfile(idx) {
  return PARTICLE_PROFILES[Math.max(0, Math.min(3, idx))];
}

function lerpProfile(val) {
  const t = Math.max(0, Math.min(3.0, parseFloat(val)));
  const lo = Math.min(3, Math.floor(t));
  const hi = Math.min(3, lo + 1);
  const f = t - lo;
  const a = PARTICLE_PROFILES[lo], b = PARTICLE_PROFILES[hi];
  return {
    size:   a.size  + (b.size  - a.size)  * f,
    op:     a.op    + (b.op    - a.op)    * f,
    speed:  a.speed + (b.speed - a.speed) * f,
    count:  Math.round(a.count + (b.count - a.count) * f),
    colorsA: a.colors, colorsB: b.colors, f,
  };
}

function pickColor(prof) {
  const cols = Math.random() < prof.f ? prof.colorsB : prof.colorsA;
  return cols[Math.floor(Math.random() * cols.length)];
}

function startParticleAnimation() {
  const canvas = document.getElementById('scent-particle-canvas');
  if (!canvas) return;
  if (_particleAnim) { cancelAnimationFrame(_particleAnim); _particleAnim = null; }
  _particles = [];
  _sliderVal = 0; 

  const ctx = canvas.getContext('2d');
  let frameCount = 0;

  function resize() {
    const W = canvas.offsetWidth || 280;
    const H = canvas.offsetHeight || 56;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
    }
  }

  function frame() {
    resize();
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    frameCount++;

    const t = Math.max(0, Math.min(3.0, _sliderVal));
    const activeIdx = Math.min(3, Math.round(t));
    const prof = PARTICLE_PROFILES[activeIdx];
    const spawnEvery = Math.max(2, Math.round(16 / prof.count));

    if (frameCount % spawnEvery === 0 && _particles.length < 20) {
      const xCenter = STAGE_X[activeIdx] * W;
      _particles.push({
        x:     xCenter + (Math.random() - 0.5) * W * 0.06,
        y:     H,
        vx:    (Math.random() - 0.5) * 0.4,
        vy:    -(prof.speed * (0.5 + Math.random() * 0.8)),
        r:     prof.size * (0.7 + Math.random() * 0.6),
        op:    prof.op,
        color: prof.colors[Math.floor(Math.random() * prof.colors.length)],
        life:  1.0,
        decay: 0.02 + Math.random() * 0.012,
      });
    }

    _particles = _particles.filter(p => p.life > 0 && p.y > -4);

    _particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      const topFade = Math.min(1, p.y / (H * 0.5));
      const alpha = Math.max(0, p.op * p.life * topFade);
      if (alpha < 0.015) return;

      const hex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      const innerHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.2);
      g.addColorStop(0,   p.color + innerHex);
      g.addColorStop(0.5, p.color + Math.round(alpha * 0.5 * 255).toString(16).padStart(2,'0'));
      g.addColorStop(1,   p.color + '00');
      ctx.beginPath();
      ctx.fillStyle = g;
      ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    _particleAnim = requestAnimationFrame(frame);
  }
  frame();
}

function updateParticleSlider(val) {
  _sliderVal = Math.max(0, Math.min(3.0, parseFloat(val)));
}

/* ── ZAMAN ÇİZELGESİ ── */
const TIME_STAGES = [
  { keys: ['t0','top','ust','üst','opening','acilis','açılış'],  label: 'İlk Buğu',  sub: '0–15 dk',   dot: '#c8a97e' },
  { keys: ['t1','heart1','gelisim','gelişim','development'],      label: 'Açılım',    sub: '15–60 dk',  dot: '#9b6fa0' },
  { keys: ['t2','heart','kalp','middle','orta'],                  label: 'Kalp',      sub: '1–4 saat',  dot: '#6fb3a0' },
  { keys: ['t3','base','derin iz','baz','iz','dry'],               label: 'Derin İz',   sub: '4+ saat',   dot: '#888888' },
];

function getTimelineText(tl, stage) {
  for (const k of stage.keys) {
    if (tl[k] && tl[k] !== '—') return tl[k];
  }
  return null;
}

function updateTimelineDisplay(val) {
  const tl = window._currentTimeline;
  if (!tl) return;

  updateParticleSlider(val);

  const t = parseFloat(val);
  const idx = Math.min(3, Math.floor(t + 0.5));
  const stage = TIME_STAGES[idx];

  const display = document.getElementById('time-display');
  if (display) display.textContent = `${stage.label} — ${stage.sub}`;

  const notes = document.getElementById('time-notes');
  if (!notes) return;

  if (notes.dataset.activeIdx === String(idx)) {
    notes.querySelectorAll('.time-note-row').forEach((row, i) => {
      row.classList.toggle('active', i === idx);
      const dot = row.querySelector('.time-note-dot');
      if (dot) {
        const s = TIME_STAGES[i];
        dot.style.boxShadow = i === idx ? `0 0 6px ${s.dot}` : '';
        dot.style.width = i === idx ? '8px' : '';
        dot.style.height = i === idx ? '8px' : '';
      }
    });
    return;
  }
  notes.dataset.activeIdx = String(idx);

  notes.innerHTML = TIME_STAGES.map((s, i) => {
    const txt = getTimelineText(tl, s) || '—';
    return `<div class="time-note-row ${i === idx ? 'active' : ''}">
      <div class="time-note-dot" style="background:${s.dot};${i===idx?'box-shadow:0 0 6px '+s.dot+';width:8px;height:8px':''}"></div>
      <span class="time-note-label">${s.label}</span>
      <span class="time-note-text">${txt}</span>
    </div>`;
  }).join('');
  notes.style.opacity = '1';
}




// ── GEÇMİŞ — metadata localStorage, görseller IndexedDB ─────────────────────

async function saveToHistory(r, imgDataUrl) {
  try {
    const history = JSON.parse(localStorage.getItem('koku-gecmis') || '[]');
    const idx = history.length; 
    const imgKey = imgDataUrl ? `koku-img-${Date.now()}` : null;

    if (imgDataUrl && imgKey) {
      await IDB.set(imgKey, imgDataUrl);
    }

    history.unshift({
      iconToken: resolvePremiumIconToken(r, SCENT_TOKEN_FALLBACK),
      name: r.name,
      family: r.family,
      description: r.description,
      funny: r.funny,
      similar: r.similar,
      intensity: r.intensity,
      molecule: r.molecule,
      molecules: r.molecules,
      pyramid: r.pyramid,
      timeline: r.timeline,
      layering: r.layering,
      technical: r.technical,
      scores: r.scores,
      persona: r.persona,
      dupes: r.dupes,
      confidence: r.confidence,
      sourceTrace: r.sourceTrace,
      verification: r.verification,
      similarity: r.similarity,
      noteOntology: r.noteOntology,
      legal: r.legal,
      quote: r.quote,
      quoteAuthor: r.quoteAuthor,
      season: r.season,
      occasion: r.occasion,
      imgKey: imgKey,   
      date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    });

    const trimmed = history.slice(0, 30);

    if (history.length > 30) {
      history.slice(30).forEach(item => {
        if (item.imgKey) IDB.del(item.imgKey);
      });
    }

    localStorage.setItem('koku-gecmis', JSON.stringify(trimmed));
    await renderHistory();
  } catch(e) { console.warn('saveToHistory error:', e); }
}

async function renderHistory() {
  const grid = document.getElementById('history-grid');
  const section = document.getElementById('history-section');
  safeQueueGrowthPromptEvaluation(220);
  try {
    const history = JSON.parse(localStorage.getItem('koku-gecmis') || '[]');
    const shelfState = readShelfState();
    if (history.length === 0) {
      section.style.display = 'none';
      grid.innerHTML = '<div class="history-empty" style="grid-column:1/-1">Henüz analiz yapılmadı</div>';
      return;
    }
    section.style.display = 'block';

    const imgs = await Promise.all(history.map(item => {
      if (item.imgKey) return IDB.get(item.imgKey);
      if (item.img)    return Promise.resolve(item.img); 
      return Promise.resolve(null);
    }));

    grid.innerHTML = history.map((item, i) => `
      <div class="history-item" onclick="haptic(10); showHistoryItem(${i})">
        ${imgs[i]
          ? `<img class="history-item-img" src="${imgs[i]}" alt="${safeText(item.name || 'Koku')}">`
          : `<div class="history-item-img-placeholder"><span class="history-item-monogram">${safeText(getHistoryMonogram(item.name || ''))}</span></div>`}
        <div class="history-item-info">
          ${shelfState[normalizeScentKey(item.name)]?.status ? `<div class="history-item-badge">${safeText(getShelfStatusLabel(shelfState[normalizeScentKey(item.name)].status))}</div>` : ''}
          <div class="history-item-name">${safeText(item.name || 'Koku')}</div>
          <div class="history-item-date">${safeText(item.date)}</div>
        </div>
      </div>
    `).join('');
  } catch(e) { console.warn('renderHistory error:', e); }
}

async function showHistoryItem(i) {
  try {
    const history = JSON.parse(localStorage.getItem('koku-gecmis') || '[]');
    const item = history[i];
    if (!item) return;
    item.iconToken = resolvePremiumIconToken(item, SCENT_TOKEN_FALLBACK);

    document.getElementById('loading-state').classList.remove('visible');
    document.getElementById('controls').style.display = '';

    let imgSrc = null;
    if (item.imgKey) imgSrc = await IDB.get(item.imgKey);
    else if (item.img) imgSrc = item.img; 

    if (!Array.isArray(item.molecules) || item.molecules.length === 0) {
      if (!item.molecule || !item.molecule.name) {
        const _fbMap = { 'Çiçeksi':'Geraniol','Odunsu':'Cedrene','Oryantal':'Vanillin','Taze':'Limonene','Gourmand':'Vanillin','Fougère':'Coumarin','Chypre':'Ambroxide','Aromatik':'Linalool' };
        item.molecule = { name: _fbMap[item.family] || 'Linalool' };
      }
    }
    if (!item.persona) item.persona = null;
    if (!item.dupes)   item.dupes   = null;
    if (!item.scores)  item.scores  = null;
    if (!item.similar) item.similar = [];
    if (!item.similarity) item.similarity = null;
    if (!item.noteOntology) item.noteOntology = null;

    window.scrollTo({ top: 0, behavior: 'auto' });

    document.getElementById('result-card').classList.remove('visible');
    document.getElementById('error-box').classList.remove('visible');
    document.getElementById('reset-btn').classList.remove('visible');
    deactivateAura();

    ['sec-description','sec-shelf','sec-pyramid','sec-note-ontology','sec-fragrance-wheel','sec-technical','sec-scores','sec-similar',
     'sec-community-pulse','sec-store-links','sec-layering','sec-persona','sec-dupe','sec-molecule'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('revealed');
    });

    document.getElementById('main-card').style.display = 'none';

    if (imgSrc) {
      const img = document.getElementById('preview-img');
      if (img) { img.src = imgSrc; img.classList.add('visible'); }
    }

    await safeShowResult(item, false, false, 'history-open');
  } catch(e) {
    console.error('showHistoryItem error:', e);
    showError('Gecmis kaydi acilirken hata olustu. Lutfen tekrar dene.');
  }
}

async function clearHistory() {
  try {
    const history = JSON.parse(localStorage.getItem('koku-gecmis') || '[]');
    await Promise.all(history.filter(item => item.imgKey).map(item => IDB.del(item.imgKey)));
    await IDB.clearAll(); 
  } catch(e) {}
  localStorage.removeItem('koku-gecmis');
  await renderHistory();
  emitEvent('history_cleared');
  safeQueueGrowthPromptEvaluation(240);
}

function showError(msg) {
  clearLoadingWatchdog();
  stopLoadingMessages();
  document.getElementById('loading-state').classList.remove('visible');
  document.getElementById('controls').style.display = '';
  const box = document.getElementById('error-box');
  box.textContent = msg;
  box.classList.add('visible');
  document.getElementById('reset-btn').classList.add('visible');
  window.KokuCore?.emitClientError?.('error', cleanPreferenceText(msg || 'ui_error', 260), {
    stage: 'show_error',
    hasAuth: Boolean(authToken),
  });
  emitEvent('ui_error_shown');
}

function reset() {
  deactivateAura();
  currentResultData = null;
  deepDiveExpanded = false;
  closeCompareOverlay();
  closeBarcodeOverlay();
  closeFinderOverlay();
  closeLayeringLabOverlay();
  hideCompareResult();
  imageBase64 = null;
  imageMimeType = 'image/jpeg';
  document.getElementById('main-card').style.display = '';
  document.getElementById('controls').style.display = '';
  document.getElementById('file-input').value = '';
  document.getElementById('preview-img').classList.remove('visible');
  document.getElementById('upload-placeholder').classList.remove('hidden');
  document.getElementById('loading-state').classList.remove('visible');
  document.getElementById('result-card').classList.remove('visible');
  document.getElementById('error-box').classList.remove('visible');
  document.getElementById('reset-btn').classList.remove('visible');
  document.getElementById('analyze-btn').disabled = true;
  document.getElementById('text-input').value = '';
  const notesInput = document.getElementById('notes-input');
  if (notesInput) notesInput.value = '';
  const _molCont = document.getElementById('mol-cards-container'); if (_molCont) _molCont.innerHTML = '';
  document.getElementById('sec-molecule').style.display = 'none';
  const _molArrow = document.getElementById('mol-arrow-next'); if (_molArrow) _molArrow.style.display = 'none';
  const _molArrowPrev = document.getElementById('mol-arrow-prev'); if (_molArrowPrev) _molArrowPrev.style.display = 'none';
  const _shelfSection = document.getElementById('sec-shelf'); if (_shelfSection) _shelfSection.style.display = 'none';
  const _feedbackSection = document.getElementById('sec-feedback'); if (_feedbackSection) { _feedbackSection.style.display = 'none'; _feedbackSection.dataset.reasonOpen = 'false'; }
  const _ontologySection = document.getElementById('sec-note-ontology'); if (_ontologySection) _ontologySection.style.display = 'none';
  document.getElementById('sec-technical').style.display = 'none';
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) shareBtn.style.display = 'none';
  document.getElementById('sec-layering').style.display = 'none';
  document.getElementById('sec-scores').style.display = 'none';
  const secCommunityPulse = document.getElementById('sec-community-pulse'); if (secCommunityPulse) secCommunityPulse.style.display = 'none';
  const secStoreLinks = document.getElementById('sec-store-links'); if (secStoreLinks) secStoreLinks.style.display = 'none';
  const wheelHost = document.getElementById('fragrance-wheel'); if (wheelHost) wheelHost.innerHTML = '';
  const sp = document.getElementById('sec-persona'); if(sp) sp.style.display='none';
  const sd = document.getElementById('sec-dupe'); if(sd) sd.style.display='none';
  if (_particleAnim) { cancelAnimationFrame(_particleAnim); _particleAnim = null; }
  _particles = [];
  const pt = document.getElementById('pyramid-timeline');
  if (pt) pt.style.display = 'none';
  const tn = document.getElementById('time-notes');
  if (tn) { tn.innerHTML = ''; delete tn.dataset.activeIdx; }
  window._currentTimeline = null;
  ADVANCED_RESULT_SECTION_IDS.forEach((sectionId) => setSectionHasContent(sectionId, false));
  syncAdvancedSectionsVisibility();
  ['sec-description', 'sec-shelf', 'sec-pyramid', 'sec-note-ontology', 'sec-fragrance-wheel', 'sec-technical', 'sec-scores', 'sec-similar', 'sec-community-pulse', 'sec-store-links', 'sec-layering', 'sec-persona', 'sec-dupe', 'sec-molecule'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('revealed');
  });
  const iF = document.getElementById('intensity-fill');
  iF.style.width = '0%'; iF.style.background = ''; iF.style.color = '';
  const iv = document.getElementById('intensity-value');
  if (iv) iv.textContent = '';
}

/* ── KOKU DANIŞMANI ── */

/* [split] advisor moved to /lib/app/advisor.js */
function ensureAdvisorReady() {
  if (window.KokuAdvisorLoaded === true && window.KokuAdvisor) {
    return Promise.resolve(true);
  }
  return loadLazyScriptOnce('/lib/app/advisor.js', 'advisor').then((ok) => {
    if (ok) window.KokuAdvisorLoaded = true;
    return ok;
  });
}

async function toggleAdvisor() {
  const ok = await ensureAdvisorReady();
  if (!ok || !window.KokuAdvisor?.toggleAdvisor) return;
  return window.KokuAdvisor.toggleAdvisor();
}

async function chipSend(text) {
  const ok = await ensureAdvisorReady();
  if (!ok || !window.KokuAdvisor?.chipSend) return;
  return window.KokuAdvisor.chipSend(text);
}

async function sendAdvisorMessage(msgOverride) {
  const ok = await ensureAdvisorReady();
  if (!ok || !window.KokuAdvisor?.sendAdvisorMessage) return;
  return window.KokuAdvisor.sendAdvisorMessage(msgOverride);
}

async function advisorKeydown(event) {
  const ok = await ensureAdvisorReady();
  if (!ok || !window.KokuAdvisor?.advisorKeydown) return;
  return window.KokuAdvisor.advisorKeydown(event);
}

const AURA_COLORS = {
  'Çiçeksi':  ['rgba(220,130,180,0.18)', 'rgba(255,180,200,0.12)'],
  'Odunsu':   ['rgba(140,90,50,0.2)',    'rgba(200,169,126,0.15)'],
  'Oryantal': ['rgba(160,80,40,0.2)',    'rgba(200,120,60,0.14)'],
  'Taze':     ['rgba(80,180,200,0.18)',  'rgba(111,179,160,0.14)'],
  'Gourmand': ['rgba(180,100,60,0.18)',  'rgba(220,160,80,0.13)'],
  'Fougère':  ['rgba(60,140,100,0.18)',  'rgba(111,179,160,0.13)'],
  'Chypre':   ['rgba(100,80,150,0.18)',  'rgba(155,111,160,0.14)'],
  'Aromatik': ['rgba(80,140,100,0.16)',  'rgba(140,180,120,0.12)'],
};

let auraActive = false;

function haptic(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern || 20);
}

async function shareResult() {
  const snapshot = getCurrentResultSnapshot() || {};
  const name = document.getElementById('result-name')?.textContent || snapshot.name || 'Koku';
  const iconToken = resolvePremiumIconToken({
    ...snapshot,
    iconToken: document.getElementById('result-emoji')?.dataset?.iconToken || snapshot.iconToken || snapshot.emoji || '',
  }, SCENT_TOKEN_FALLBACK);
  const desc = document.getElementById('desc-text')?.textContent || snapshot.description || '';
  const shareModule = window.KokuShare;
  let mode = 'none';

  try {
    if (shareModule?.shareResultCard) {
      const state = await shareModule.shareResultCard({
        name,
        iconToken,
        desc,
        family: snapshot.family || '',
        intensity: Number(snapshot.intensity || 0),
        notes: getCompareDisplayNotes(snapshot),
        url: 'https://koku-dedektifi.vercel.app',
      });
      mode = state?.mode || 'none';
    } else {
      const text = `${name}\n\n${desc.slice(0, 120)}${desc.length > 120 ? '...' : ''}\n\nKoku Dedektifi ile analiz edildi\nkoku-dedektifi.vercel.app`;
      if (navigator.share) {
        await navigator.share({
          title: `${name} - Koku Dedektifi`,
          text,
          url: 'https://koku-dedektifi.vercel.app',
        });
        mode = 'webshare-text';
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        mode = 'clipboard';
      }
    }
  } catch (error) {
    mode = error?.name === 'AbortError' ? 'cancelled' : 'error';
    if (mode === 'error') {
      showToast('Paylasim su an basarisiz, tekrar deneyebilirsin.');
    }
  }

  if (mode === 'clipboard') {
    const btn = document.getElementById('share-btn');
    if (btn) {
      btn.style.color = 'var(--accent3)';
      setTimeout(() => {
        btn.style.color = '';
      }, 1500);
    }
    showToast('Sonuc panoya kopyalandi');
  } else if (mode === 'download') {
    showToast('Paylasim karti indirildi');
  }

  if (mode !== 'cancelled') {
    emitEvent('result_share_used', { mode });
    haptic([10, 50, 10]);
  }
}

function analyzeDupe(name) {
  haptic(15);
  reset();
  setTimeout(() => {
    switchTab('text');
    document.getElementById('text-input').value = name;
    checkReady();
    setTimeout(() => analyze(), 150);
  }, 200);
}

function activateAura(family) {
  const layer = document.getElementById('aura-layer');
  if (!layer) return;
  const colors = AURA_COLORS[family] || ['rgba(200,169,126,0.15)', 'rgba(155,111,160,0.1)'];
  auraActive = true;
  layer.style.background = `
    radial-gradient(ellipse 70% 60% at 30% 40%, ${colors[0]}, transparent 70%),
    radial-gradient(ellipse 50% 40% at 75% 65%, ${colors[1]}, transparent 70%)
  `;
  layer.classList.add('active');
}

function deactivateAura() {
  auraActive = false;
  const layer = document.getElementById('aura-layer');
  layer.classList.remove('active');
  layer.style.background = '';
}
document.getElementById('analyze-btn').addEventListener('click', () => haptic(15));
document.getElementById('reset-btn').addEventListener('click', () => haptic(10));


/* ══════════════════════════════════════════════════════════════
   YENİ MOLEKÜL SİSTEMİ — SmilesDrawer v2
   ══════════════════════════════════════════════════════════════ */

const SD_OPTIONS = {
  width: 220, height: 150,
  bondThickness: 2.0, bondLength: 26,
  shortBondLength: 0.85, bondSpacing: 0.20 * 26,
  atomVisualization: 'default',
  isomeric: true, debug: false,
  terminalCarbons: true, explicitHydrogens: false,
  overlapSensitivity: 0.42, overlapResolutionIterations: 6,
  compactDrawing: false,
  fontFamily: 'Playfair Display, serif',
  fontSizeLarge: 10, fontSizeSmall: 7,
  padding: 18.0,
  themes: {
    dark: {
      C:'#d4b896', O:'#e8604a', N:'#7ec8c8',
      S:'#ddd04a', F:'#72c4a0', Cl:'#72c4a0',
      Br:'#d07855', P:'#c0a060', H:'#666666',
      BACKGROUND:'transparent',
    }
  },
};

const NOTE_LABELS = {
  top:    { tr: 'Üst Nota',  icon: '↑' },
  heart:  { tr: 'Kalp Nota', icon: '♥' },
  base:   { tr: 'Alt Nota',  icon: '↓' },
  single: { tr: 'Anahtar',   icon: '◆' },
};

const moleculeLookupCache = new Map();

function getMoleculeInfo(nameOrSmiles) {
  const query = String(nameOrSmiles || '').trim().toLowerCase();
  if (!query) return null;
  return moleculeLookupCache.get(query) || null;
}

function readMoleculeStabilityMap() {
  return readStoredJson(MOLECULE_STABILITY_KEY, {});
}

function writeMoleculeStabilityMap(next) {
  try {
    localStorage.setItem(MOLECULE_STABILITY_KEY, JSON.stringify(next || {}));
  } catch {}
}

function stabilizeMoleculeSet(resultLike) {
  const result = resultLike && typeof resultLike === 'object' ? resultLike : {};
  const perfumeName = cleanPreferenceText(result.name || '', 140);
  const key = normalizeScentKey(perfumeName);
  if (!key) return result;

  const stabilityMap = readMoleculeStabilityMap();
  const existing = stabilityMap[key] && typeof stabilityMap[key] === 'object' ? stabilityMap[key] : null;
  const molecules = Array.isArray(result.molecules) ? result.molecules.filter((item) => item && item.name) : [];
  const source = cleanPreferenceText(result?.verification?.moleculeSource || result?.moleculeMeta?.source || '', 40);
  const sourceIsStrong = source === 'official-derived' || source === 'note-derived';

  if (molecules.length >= 2) {
    if (!sourceIsStrong && Array.isArray(existing?.molecules) && existing.molecules.length >= 2) {
      result.molecules = existing.molecules.map((item) => ({ ...item }));
      result.moleculeMeta = {
        ...(result.moleculeMeta || {}),
        source: existing.source || source || 'history-stable',
        count: result.molecules.length,
        matchedPerfume: result?.moleculeMeta?.matchedPerfume || existing.matchedPerfume || null,
      };
      return result;
    }

    stabilityMap[key] = {
      molecules: molecules.map((item) => ({ ...item })),
      source: source || 'model',
      matchedPerfume: cleanPreferenceText(result?.moleculeMeta?.matchedPerfume || result?.verification?.matchedPerfume || '', 140) || null,
      updatedAt: new Date().toISOString(),
    };
    writeMoleculeStabilityMap(stabilityMap);
    return result;
  }

  if (Array.isArray(existing?.molecules) && existing.molecules.length >= 2) {
    result.molecules = existing.molecules.map((item) => ({ ...item }));
    result.moleculeMeta = {
      ...(result.moleculeMeta || {}),
      source: existing.source || source || 'history-stable',
      count: result.molecules.length,
      matchedPerfume: result?.moleculeMeta?.matchedPerfume || existing.matchedPerfume || null,
    };
  }

  return result;
}

function normalizeMolecules(r) {
  if (Array.isArray(r.molecules) && r.molecules.length > 0) {
    return r.molecules.slice(0, 4).map(m => {
      const db = getMoleculeInfo(m.name) || {};
      return {
        smiles: m.smiles || db.smiles || null,
        name: m.name || 'Bilinmeyen',
        formula: m.formula || db.formula || '',
        family: m.family || db.family || '',
        origin: m.origin || db.origin || '',
        note: m.note || 'single',
        contribution: m.contribution || '',
        evidence: m.evidence || '',
      };
    });
  }
  if (r.molecule?.name) {
    const db = getMoleculeInfo(r.molecule.name) || {};
    return [{ smiles: db.smiles || null, name: r.molecule.name, formula: db.formula || '', family: db.family || '', origin: db.origin || '', note: 'single', contribution: '', evidence: '' }];
  }
  const fallback = { 'Çiçeksi':'Geraniol','Odunsu':'Cedrene','Oryantal':'Vanillin','Taze':'Limonene','Gourmand':'Vanillin','Fougère':'Coumarin','Chypre':'Ambroxide','Aromatik':'Linalool' }[r.family] || 'Linalool';
  const db = getMoleculeInfo(fallback) || {};
  return [{ smiles: db.smiles || null, name: fallback, formula: db.formula || '', family: db.family || '', origin: db.origin || '', note: 'single', contribution: '', evidence: 'Aile fallback molekulu' }];
}

function drawSmiles(canvas, smiles, onSuccess, onError) {
  if (!window.SmilesDrawer || !smiles) { onError && onError('no-smiles'); return; }
  try {
    const ratio = Math.max(1, Math.min(Number(window.devicePixelRatio || 1), 3));
    const parentRect = canvas.parentElement?.getBoundingClientRect?.() || null;
    const cssWidth = Math.max(220, Math.round((parentRect?.width || canvas.clientWidth || 232) - 12));
    const cssHeight = Math.max(148, Math.round((parentRect?.height || canvas.clientHeight || 168) - 12));
    const pixelWidth = Math.round(cssWidth * ratio);
    const pixelHeight = Math.round(cssHeight * ratio);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const drawer = new SmilesDrawer.Drawer({
      ...SD_OPTIONS,
      width: pixelWidth,
      height: pixelHeight,
      bondThickness: Math.max(0.9, 1.2 * ratio),
    });
    SmilesDrawer.parse(smiles, function(tree) {
      drawer.draw(tree, canvas, 'dark', false);
      onSuccess && onSuccess();
    }, function(err) { onError && onError(err); });
  } catch(e) { onError && onError(e.message); }
}

function mergeMoleculeDetails(base, extra) {
  return {
    ...base,
    smiles: base.smiles || extra?.smiles || null,
    formula: base.formula || extra?.formula || '',
    family: base.family || extra?.family || '',
    origin: base.origin || extra?.origin || '',
  };
}

async function hydrateMoleculesFromApi(molecules) {
  const unresolvedNames = [...new Set(
    molecules
      .filter(m => m && m.name && (!m.smiles || !m.formula || !m.family || !m.origin))
      .map(m => String(m.name).trim())
      .filter(Boolean)
  )];

  if (!unresolvedNames.length) return;

  try {
    const res = await fetch('/api/molecule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: unresolvedNames.slice(0, 8) }),
    });
    if (!res.ok) return;

    const data = await res.json();
    const lookup = new Map();
    (data.molecules || []).forEach(entry => {
      const queryKey = String(entry?.query || '').trim().toLowerCase();
      const nameKey = String(entry?.name || '').trim().toLowerCase();
      if (queryKey) {
        lookup.set(queryKey, entry);
        moleculeLookupCache.set(queryKey, entry);
      }
      if (nameKey) {
        if (!lookup.has(nameKey)) lookup.set(nameKey, entry);
        moleculeLookupCache.set(nameKey, entry);
      }
    });

    molecules.forEach((mol, index) => {
      const key = String(mol?.name || '').trim().toLowerCase();
      const resolved = lookup.get(key);
      if (resolved) molecules[index] = mergeMoleculeDetails(mol, resolved);
    });
  } catch {}
}

function createMolCard(mol, index) {
  const noteInfo = NOTE_LABELS[mol.note] || NOTE_LABELS.single;
  const card = document.createElement('div');
  card.className = 'mol-card' + (index === 0 ? ' active' : '');
  card.dataset.index = index;
  
  const formulaHtml = mol.formula ? mol.formula.replace(/(\d+)/g, '<sub>$1</sub>') : '';
  const evidence = cleanPreferenceText(mol.evidence || '', 120);
  card.innerHTML = `
    <div class="mol-canvas-wrap" id="mol-cw-${index}">
      <div class="mol-loading" id="mol-loading-${index}">ÇÖZÜMLENIYOR…</div>
      <canvas id="mol-canvas-${index}" class="mol-structure-canvas" style="display:none"></canvas>
      <div class="mol-error" id="mol-error-${index}" style="display:none">
        <span style="font-size:24px;opacity:0.4">⬡</span>
        <span style="font-size:11px;color:var(--muted)">Yapı gösterilemiyor</span>
      </div>
    </div>
    <div class="mol-info">
      <div class="mol-badge-row">
        <span class="mol-note-badge ${mol.note}">${safeText(noteInfo.tr)}</span>
        ${evidence ? `<span class="mol-proof-badge">${safeText(evidence)}</span>` : ''}
      </div>
      <div class="mol-name">${safeText(mol.name)}</div>
      <div class="mol-formula">${formulaHtml}</div>
      ${mol.family ? `<div class="mol-family">${safeText(mol.family)}</div>` : ''}
      ${mol.contribution ? `<div class="mol-contribution">"${safeText(mol.contribution)}"</div>` : ''}
      <div class="mol-data-grid">
        ${mol.origin ? `<div class="mol-data-pill">Orijin: ${safeText(mol.origin)}</div>` : ''}
        ${mol.smiles ? `<div class="mol-data-pill">SMILES hazir</div>` : '<div class="mol-data-pill muted">SMILES yok</div>'}
      </div>
    </div>`;
  return card;
}

function molGetIdx() {
  const container = document.getElementById('mol-cards-container');
  if (!container) return 0;
  // Kaydırma matematiği CSS genişliğine göre: 240px kart + 12px boşluk = 252px
  const firstCard = container.querySelector('.mol-card');
  if (!firstCard) return 0;
  const style = window.getComputedStyle(container);
  const gap = Number.parseFloat(style.columnGap || style.gap || '0') || 0;
  const step = Math.max(1, Math.round(firstCard.getBoundingClientRect().width + gap));
  return Math.round(container.scrollLeft / step);
}

function molScrollTo(idx) {
  const container = document.getElementById('mol-cards-container');
  if (!container) return;
  const totalCards = container.querySelectorAll('.mol-card').length;
  const safeIdx = Math.max(0, Math.min(idx, totalCards - 1));
  const firstCard = container.querySelector('.mol-card');
  const style = window.getComputedStyle(container);
  const gap = Number.parseFloat(style.columnGap || style.gap || '0') || 0;
  const step = firstCard ? Math.max(1, Math.round(firstCard.getBoundingClientRect().width + gap)) : Math.max(1, container.clientWidth);
  container.scrollTo({ left: safeIdx * step, behavior: 'smooth' });
}

function molUpdateArrows(idx, total) {
  const prev = document.getElementById('mol-arrow-prev');
  const next = document.getElementById('mol-arrow-next');
  if (prev) prev.style.opacity = idx <= 0 ? '0.3' : '0.8';
  if (next) next.style.opacity = idx >= total - 1 ? '0.3' : '0.8';
}

function molScrollNext() {
  const container = document.getElementById('mol-cards-container');
  if (!container) return;
  const total = container.querySelectorAll('.mol-card').length;
  const idx = molGetIdx();
  molScrollTo(idx + 1 >= total ? 0 : idx + 1);
}

function molScrollPrev() {
  const container = document.getElementById('mol-cards-container');
  if (!container) return;
  const total = container.querySelectorAll('.mol-card').length;
  const idx = molGetIdx();
  molScrollTo(idx - 1 < 0 ? total - 1 : idx - 1);
}

async function renderMoleculeCards(r) {
  const secMol = document.getElementById('sec-molecule');
  const container = document.getElementById('mol-cards-container');
  const dotsContainer = document.getElementById('mol-dots');
  if (!secMol || !container) return;

  const molecules = normalizeMolecules(r);
  if (!molecules.length) {
    setSectionHasContent('sec-molecule', false);
    secMol.style.display = 'none';
    syncAdvancedSectionsVisibility();
    return;
  }

  await hydrateMoleculesFromApi(molecules);

  setSectionHasContent('sec-molecule', true);
  secMol.style.display = 'block';
  container.innerHTML = '';
  if (dotsContainer) dotsContainer.innerHTML = '';

  const molArrowNext = document.getElementById('mol-arrow-next');
  const molArrowPrev = document.getElementById('mol-arrow-prev');
  
  if (molArrowNext) {
    molArrowNext.innerHTML = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    molArrowNext.style.cssText = ''; 
    molArrowNext.style.display = molecules.length > 1 ? 'flex' : 'none';
  }
  if (molArrowPrev) {
    molArrowPrev.innerHTML = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
    molArrowPrev.style.cssText = ''; 
    molArrowPrev.style.display = molecules.length > 1 ? 'flex' : 'none';
    molArrowPrev.style.opacity = '0.3';
  }

  molecules.forEach((mol, i) => {
    container.appendChild(createMolCard(mol, i));
    if (dotsContainer) {
      const dot = document.createElement('div');
      dot.className = 'mol-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('role', 'button');
      dot.setAttribute('aria-label', `${i + 1}. molekül`);
      
      const _dotIdx = i;
      dot.addEventListener('click', () => molScrollTo(_dotIdx));
      dotsContainer.appendChild(dot);
    }
  });

  container.onscroll = () => {
    const idx = molGetIdx();
    const total = container.querySelectorAll('.mol-card').length;
    container.querySelectorAll('.mol-card').forEach((c, i) => c.classList.toggle('active', i === idx));
    
    if (dotsContainer) dotsContainer.querySelectorAll('.mol-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });
    
    molUpdateArrows(idx, total);
  };

  let wait = 0;
  while (!window.SmilesDrawer && wait < 50) { await new Promise(r => setTimeout(r, 100)); wait++; }

  for (let i = 0; i < molecules.length; i++) {
    const mol = molecules[i];
    const smiles = mol.smiles;

    const canvas = document.getElementById(`mol-canvas-${i}`);
    const loading = document.getElementById(`mol-loading-${i}`);
    const errDiv = document.getElementById(`mol-error-${i}`);
    if (!canvas) continue;

    const show = () => { if (loading) loading.style.display='none'; canvas.style.display='block'; };
    const fail = () => {
      if (loading) loading.style.display='none';
      if (errDiv) errDiv.style.display='flex';
    };

    if (smiles && window.SmilesDrawer) drawSmiles(canvas, smiles, show, fail);
    else { if (loading) loading.style.display='none'; if (errDiv) errDiv.style.display='flex'; }
  }
  molUpdateArrows(0, molecules.length);
  syncAdvancedSectionsVisibility();
}



