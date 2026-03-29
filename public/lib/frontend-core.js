(function initKokuCore(global) {
  const DB_NAME = 'koku-dedektifi-db';
  const DB_VERSION = 1;
  const STORE_NAME = 'images';
  const SENTRY_BUNDLE_URL = 'https://browser.sentry-cdn.com/7.120.4/bundle.min.js';
  let dbRef = null;
  let clientErrorCount = 0;
  let globalErrorHooked = false;
  let sentryRateCount = 0;
  let sentryBooted = false;
  let sentryScriptPromise = null;

  function safeText(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function safe(value) {
    if (!value) return '';
    if (typeof global.DOMPurify !== 'undefined') {
      return global.DOMPurify.sanitize(String(value), {
        ALLOWED_TAGS: ['strong', 'em', 'br', 'sub', 'sup'],
        ALLOWED_ATTR: [],
      });
    }
    return safeText(value).replace(/"/g, '&quot;');
  }

  function emitEvent(eventName, props) {
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
        emitClientError('warn', 'event_emit_failed', {
          eventName,
          reason: String(error?.message || 'fetch_failed').slice(0, 120),
        });
      });
    } catch (error) {
      emitClientError('warn', 'event_emit_exception', {
        eventName: String(eventName || '').slice(0, 80),
        reason: String(error?.message || 'unknown').slice(0, 120),
      });
    }
  }

  function safeContext(context) {
    const src = context && typeof context === 'object' ? context : {};
    const out = {};
    Object.entries(src).slice(0, 16).forEach(([key, value]) => {
      const cleanKey = String(key || '').trim().slice(0, 48);
      if (!cleanKey) return;
      if (typeof value === 'string') {
        out[cleanKey] = value.slice(0, 260);
        return;
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        out[cleanKey] = value;
        return;
      }
      if (typeof value === 'boolean') out[cleanKey] = value;
    });
    return out;
  }

  function emitClientError(level, message, context) {
    try {
      if (clientErrorCount >= 12) return;
      clientErrorCount += 1;
      const payload = {
        level: String(level || 'error').slice(0, 12),
        message: String(message || 'client_error').slice(0, 800),
        context: safeContext(context),
        userAgent: String(global.navigator?.userAgent || '').slice(0, 280),
        url: String(global.location?.href || '').slice(0, 300),
      };
      fetch('/api/error-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((error) => {
        if (global.console?.warn) {
          console.warn('[KokuCore] /api/error-log failed:', error?.message || error);
        }
      });

      if (global.Sentry?.captureMessage && sentryRateCount < 8) {
        sentryRateCount += 1;
        global.Sentry.captureMessage(payload.message, {
          level: payload.level,
          tags: {
            app: 'koku-web',
            source: 'frontend-core',
          },
          extra: {
            context: payload.context,
            url: payload.url,
            userAgent: payload.userAgent,
          },
        });
      }
    } catch {}
  }

  function parseNumberInRange(value, fallback, min, max) {
    const parsed = Number.parseFloat(String(value ?? '').trim());
    if (!Number.isFinite(parsed)) return fallback;
    if (parsed < min || parsed > max) return fallback;
    return parsed;
  }

  function loadScriptOnce(src, id) {
    if (id && global.document?.getElementById(id)) {
      return Promise.resolve(true);
    }
    if (sentryScriptPromise) return sentryScriptPromise;
    sentryScriptPromise = new Promise((resolve) => {
      try {
        const script = global.document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        if (id) script.id = id;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        global.document.head.appendChild(script);
      } catch {
        resolve(false);
      }
    });
    return sentryScriptPromise;
  }

  async function bootClientConfig() {
    try {
      const res = await fetch('/api/client-config', {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const errorTracking = data?.config?.errorTracking;
      const dsn = String(errorTracking?.sentryDsn || '').trim();
      if (!dsn || sentryBooted) return;

      const loaded = await loadScriptOnce(SENTRY_BUNDLE_URL, 'koku-sentry-sdk');
      if (!loaded || !global.Sentry?.init) return;

      const environment = String(errorTracking?.environment || 'production').trim() || 'production';
      const release = String(errorTracking?.release || '').trim();
      const tracesSampleRate = parseNumberInRange(errorTracking?.tracesSampleRate, 0, 0, 1);

      global.Sentry.init({
        dsn,
        environment,
        release: release || undefined,
        tracesSampleRate,
      });
      global.Sentry.setTag?.('app', 'koku-web');
      global.Sentry.setTag?.('source', 'frontend-core');
      sentryBooted = true;
    } catch (error) {
      emitClientError('warn', 'client_config_boot_failed', {
        reason: String(error?.message || 'unknown').slice(0, 120),
      });
    }
  }

  function setupErrorTracking(options = {}) {
    if (globalErrorHooked) return;
    globalErrorHooked = true;
    const getUserId = typeof options.getUserId === 'function' ? options.getUserId : () => '';
    const tag = String(options.tag || 'web').slice(0, 32);

    global.addEventListener('error', (event) => {
      const err = event?.error;
      emitClientError('error', err?.message || event?.message || 'window_error', {
        tag,
        userId: String(getUserId() || '').slice(0, 80),
        file: String(event?.filename || '').slice(0, 220),
        line: Number.isFinite(Number(event?.lineno)) ? Number(event.lineno) : 0,
        col: Number.isFinite(Number(event?.colno)) ? Number(event.colno) : 0,
      });
    });

    global.addEventListener('unhandledrejection', (event) => {
      const reason = event?.reason;
      emitClientError('error', reason?.message || String(reason || 'unhandled_rejection').slice(0, 500), {
        tag,
        userId: String(getUserId() || '').slice(0, 80),
      });
    });
  }

  function setErrorUser(userLike) {
    const src = userLike && typeof userLike === 'object' ? userLike : {};
    const id = String(src.id || '').trim().slice(0, 80);
    const email = String(src.email || '').trim().slice(0, 120);
    const username = String(src.username || src.name || '').trim().slice(0, 80);
    if (!global.Sentry?.setUser) return;

    if (!id && !email && !username) {
      global.Sentry.setUser(null);
      return;
    }

    global.Sentry.setUser({
      id: id || undefined,
      email: email || undefined,
      username: username || undefined,
    });
  }

  function setErrorTags(tagMap) {
    if (!global.Sentry?.setTag) return;
    const src = tagMap && typeof tagMap === 'object' ? tagMap : {};
    Object.entries(src).slice(0, 10).forEach(([key, value]) => {
      const cleanKey = String(key || '').trim().slice(0, 40);
      const cleanValue = String(value || '').trim().slice(0, 80);
      if (!cleanKey || !cleanValue) return;
      global.Sentry.setTag(cleanKey, cleanValue);
    });
  }

  function openDb() {
    if (dbRef) return Promise.resolve(dbRef);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event) => event.target.result.createObjectStore(STORE_NAME);
      req.onsuccess = (event) => {
        dbRef = event.target.result;
        resolve(dbRef);
      };
      req.onerror = (event) => reject(event.target.error);
    });
  }

  async function setImage(key, value) {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      console.warn('IDB.set failed', error);
      return null;
    }
  }

  async function getImage(key) {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      console.warn('IDB.get failed', error);
      return null;
    }
  }

  async function deleteImage(key) {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      console.warn('IDB.del failed', error);
      return null;
    }
  }

  async function clearImages() {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      console.warn('IDB.clearAll failed', error);
      return null;
    }
  }

  global.KokuCore = {
    IDB: {
      set: setImage,
      get: getImage,
      del: deleteImage,
      clearAll: clearImages,
    },
    safe,
    safeText,
    emitEvent,
    emitClientError,
    setupErrorTracking,
    setErrorUser,
    setErrorTags,
  };

  bootClientConfig();
})(window);
