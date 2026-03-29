/* Koku App Module: auth */
function setAuthMessage(message, type = '') {
  const msgEl = document.getElementById('auth-msg');
  if (!msgEl) return;
  msgEl.textContent = message || '';
  msgEl.classList.remove('ok', 'error');
  if (type === 'ok' || type === 'error') {
    msgEl.classList.add(type);
  }
}

function readStoredAuthToken() {
  try {
    return String(localStorage.getItem(AUTH_TOKEN_KEY) || '').trim();
  } catch {
    return '';
  }
}

function writeStoredAuthToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {}
}

function applyAuthSession(nextToken, nextUser) {
  const prevToken = authToken;
  const prevUserId = getActiveAuthUserId();
  authToken = typeof nextToken === 'string' ? nextToken.trim() : '';
  authUser = nextUser && typeof nextUser === 'object' ? nextUser : null;
  window.KokuCore?.setErrorUser?.(
    authUser
      ? {
          id: authUser.id || '',
          email: authUser.email || '',
          username: authUser?.profile?.displayName || authUser?.name || '',
        }
      : null,
  );
  window.KokuCore?.setErrorTags?.({
    auth_state: authUser?.id ? 'authenticated' : 'guest',
  });
  writeStoredAuthToken(authToken);
  renderAuthState();
  refreshBillingState(true);
  if (!authToken || !authUser?.id) {
    wardrobeHydratedUserId = '';
    if (wardrobeSyncTimer) {
      clearTimeout(wardrobeSyncTimer);
      wardrobeSyncTimer = null;
    }
    feedHydratedUserId = '';
    if (feedSyncTimer) {
      clearTimeout(feedSyncTimer);
      feedSyncTimer = null;
    }
    return;
  }
  const nextUserId = getActiveAuthUserId();
  migrateGuestShelfToUser(nextUserId);
  renderShelf();
  renderHistory();
  renderCurrentResultShelfState();
  const shouldForcePull = prevToken !== authToken || prevUserId !== nextUserId || wardrobeHydratedUserId !== nextUserId;
  if (shouldForcePull) {
    pullWardrobeFromCloud({ force: true });
    pullFeedFromCloud({ force: true });
  } else {
    scheduleWardrobeSync('auth_session_refresh');
    scheduleFeedSync('auth_session_refresh');
  }
}

function updateAuthEntryButton() {
  const btn = document.getElementById('auth-entry-btn');
  if (!btn) return;

  if (!authUser) {
    btn.textContent = 'Giris Yap';
    btn.classList.remove('ready');
    btn.title = 'Giris Yap';
    return;
  }

  const rawName = authUser?.profile?.displayName || authUser?.name || authUser?.email || 'Hesabim';
  const shortName = String(rawName).trim().split(' ')[0].slice(0, 14) || 'Hesabim';
  btn.textContent = shortName;
  btn.classList.add('ready');
  btn.title = authUser?.email || shortName;
}

function updateBillingEntryButton() {
  const btn = document.getElementById('billing-entry-btn');
  if (!btn) return;

  const tier = String(billingState?.entitlement?.tier || 'free').toLowerCase();
  const status = String(billingState?.entitlement?.status || 'active').toLowerCase();
  const isActivePaid = tier !== 'free' && status === 'active';

  if (isActivePaid) {
    btn.textContent = 'Pro Aktif';
    btn.classList.add('active');
    btn.title = 'Pro plani aktif';
    return;
  }

  btn.textContent = 'Pro';
  btn.classList.remove('active');
  btn.title = 'Paketleri incele';
}

function hasActivePaidPlan() {
  const tier = String(billingState?.entitlement?.tier || 'free').toLowerCase();
  const status = String(billingState?.entitlement?.status || 'active').toLowerCase();
  return tier !== 'free' && status === 'active';
}

function setAuthMode(mode) {
  authMode = mode === 'register' ? 'register' : 'login';
  const loginTab = document.getElementById('auth-tab-login');
  const registerTab = document.getElementById('auth-tab-register');
  const nameWrap = document.getElementById('auth-name-wrap');
  const submitBtn = document.getElementById('auth-submit-btn');
  const passwordInput = document.getElementById('auth-password-input');

  if (loginTab) loginTab.classList.toggle('active', authMode === 'login');
  if (registerTab) registerTab.classList.toggle('active', authMode === 'register');
  if (nameWrap) nameWrap.style.display = authMode === 'register' ? '' : 'none';
  if (submitBtn) submitBtn.textContent = authMode === 'register' ? 'Kayit Ol' : 'Giris Yap';
  if (passwordInput) {
    passwordInput.setAttribute('autocomplete', authMode === 'register' ? 'new-password' : 'current-password');
  }
  setAuthMessage('');
}

function parseFavoriteFamilies(rawValue) {
  if (typeof rawValue !== 'string') return [];
  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function populateProfileForm(user) {
  const profile = user?.profile && typeof user.profile === 'object' ? user.profile : {};
  const displayName = document.getElementById('profile-display-name');
  const city = document.getElementById('profile-city');
  const budgetBand = document.getElementById('profile-budget-band');
  const gender = document.getElementById('profile-gender');
  const families = document.getElementById('profile-families');
  const userName = document.getElementById('auth-user-name');
  const userEmail = document.getElementById('auth-user-email');

  if (displayName) displayName.value = profile.displayName || user?.name || '';
  if (city) city.value = profile.city || '';
  if (budgetBand) budgetBand.value = profile.budgetBand || '';
  if (gender) gender.value = profile.gender || '';
  if (families) families.value = Array.isArray(profile.favoriteFamilies) ? profile.favoriteFamilies.join(', ') : '';
  if (userName) userName.textContent = profile.displayName || user?.name || 'Hesap';
  if (userEmail) userEmail.textContent = user?.email || '-';
}

function renderAuthState() {
  const overlay = document.getElementById('auth-overlay');
  const guestView = document.getElementById('auth-guest-view');
  const userView = document.getElementById('auth-user-view');
  const modeTabs = document.getElementById('auth-mode-tabs');

  if (!overlay || !guestView || !userView || !modeTabs) {
    updateAuthEntryButton();
    return;
  }

  if (authUser) {
    guestView.style.display = 'none';
    userView.style.display = '';
    modeTabs.style.display = 'none';
    populateProfileForm(authUser);
  } else {
    guestView.style.display = '';
    userView.style.display = 'none';
    modeTabs.style.display = '';
    setAuthMode(authMode);
  }

  updateAuthEntryButton();
  updateBillingEntryButton();
}

async function authFetch(method, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const init = { method, headers };
  if (body !== null) init.body = JSON.stringify(body);

  const res = await fetch('/api/auth', init);
  let data = {};
  try {
    data = await res.json();
  } catch {}

  return { ok: res.ok, status: res.status, data };
}

function setBillingMessage(message, type = '') {
  const msgEl = document.getElementById('billing-msg');
  if (!msgEl) return;
  msgEl.textContent = message || '';
  msgEl.classList.remove('ok', 'error');
  if (type === 'ok' || type === 'error') msgEl.classList.add(type);
}

function normalizeBillingError(data, fallback) {
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.error?.message === 'string' && data.error.message.trim()) return data.error.message;
  return fallback;
}

function formatBillingPrice(plan) {
  const price = Number(plan?.price || 0);
  const currency = String(plan?.currency || 'TRY').toUpperCase();
  if (!Number.isFinite(price) || price <= 0) return 'Ucretsiz';

  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

async function billingFetch(method, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const init = { method, headers };
  if (body !== null) init.body = JSON.stringify(body);

  const res = await fetch('/api/billing', init);
  let data = {};
  try {
    data = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, data };
}

function consumeBillingReturnFromUrl() {
  try {
    const url = new URL(window.location.href);
    const billing = String(url.searchParams.get('billing') || '').trim().toLowerCase();
    if (!billing) return null;

    const allowed = new Set(['success', 'cancel', 'error']);
    const result = allowed.has(billing) ? billing : 'error';
    const reason = String(url.searchParams.get('reason') || '').trim().slice(0, 120);
    const sessionId = String(url.searchParams.get('session_id') || '').trim().slice(0, 120);

    url.searchParams.delete('billing');
    url.searchParams.delete('reason');
    url.searchParams.delete('session_id');
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);

    return { result, reason, sessionId };
  } catch {
    return null;
  }
}

async function applyBillingReturnHint(hint) {
  if (!hint || !hint.result) return;

  if (hint.result === 'success') {
    showToast('Odeme tamamlandi, plan bilgisi guncelleniyor...');
    emitEvent('billing_return_success', {
      has_session_id: hint.sessionId ? 'yes' : 'no',
    });
    await refreshBillingState(true);
    if (hasActivePaidPlan()) {
      showToast('Planin aktif gorunuyor. Tebrikler!');
    } else {
      showToast('Odeme alindi, plan guncellemesi kisa sure icinde yansiyabilir.');
    }
    return;
  }

  if (hint.result === 'cancel') {
    showToast('Odeme iptal edildi. Paketleri incelemeye devam edebilirsin.');
    emitEvent('billing_return_cancel');
    return;
  }

  showToast(hint.reason || 'Odeme sirasinda bir sorun olustu. Tekrar deneyebilirsin.');
  emitEvent('billing_return_error', {
    reason: hint.reason ? 'provided' : 'missing',
  });
}

function renderBillingPanelLegacy_UNUSED() {
  // Legacy renderer removed; kept as no-op to avoid stale window references.
  return;
  /*
  const listEl = document.getElementById('billing-plan-list');
  const entitlementEl = document.getElementById('billing-entitlement');
  if (!listEl || !entitlementEl) return;

  const entitlement = billingState?.entitlement || { tier: 'free', status: 'active' };
  const tier = String(entitlement.tier || 'free').toLowerCase();
  const status = String(entitlement.status || 'active').toLowerCase();
  const provider = String(billingState?.provider || 'manual');

  const labelMap = { free: 'Free', pro: 'Pro' };
  const tierLabel = labelMap[tier] || tier;
  const statusLabel = status === 'active' ? 'aktif' : status === 'canceled' ? 'iptal bekliyor' : status;
  entitlementEl.textContent = `Mevcut plan: ${tierLabel} (${statusLabel}) • provider: ${provider}`;

  entitlementEl.textContent = `Mevcut plan: ${tierLabel} (${statusLabel}) - provider: ${provider}`;

  const plans = Array.isArray(billingState?.plans) ? billingState.plans : [];
  if (!plans.length) {
    listEl.innerHTML = '<div class="billing-plan-card"><div class="billing-plan-name">Plan bulunamadi</div></div>';
    return;
  }

  listEl.innerHTML = plans.map((plan) => {
    const planId = String(plan.id || '').toLowerCase();
    const isActive = tier === planId && status === 'active';
    const isCurrentCanceled = tier === planId && status === 'canceled';
    const isFree = planId === 'free';
    const isPaidPlan = !isFree;
    const showCancelButton = isActive && isPaidPlan;
    const buttonDisabled = isActive || isFree;
    const buttonLabel = isActive
      ? 'Aktif'
      : isFree
        ? 'Dahil'
        : (isCurrentCanceled ? 'Yeniden Etkinlestir' : 'Yukselt');
    const featureHtml = (Array.isArray(plan.features) ? plan.features : [])
      .slice(0, 6)
      .map((feature) => `<div class="billing-plan-feature">- ${safeText(feature)}</div>`)
      .join('');
    const price = formatBillingPrice(plan);
    const intervalText = plan.interval ? `<small> / ${safeText(plan.interval)}</small>` : '';
    const featuredClass = plan.featured ? ' featured' : '';
    const actionClass = plan.featured ? 'billing-plan-action alt' : 'billing-plan-action';
    const disabledAttr = buttonDisabled ? 'disabled' : '';
    const cancelButtonHtml = showCancelButton
      ? '<button type="button" class="billing-plan-action secondary" onclick="cancelBillingSubscription()">Aboneligi Iptal Et</button>'
      : '';
    return `
      <div class="billing-plan-card${featuredClass}">
        <div class="billing-plan-top">
          <div class="billing-plan-name">${safeText(plan.name || planId || 'Plan')}</div>
          <div class="billing-plan-price">${safeText(price)}${intervalText}</div>
        </div>
        <div class="billing-plan-features">${featureHtml}</div>
        <button type="button" class="${actionClass}" ${disabledAttr} onclick="startBillingCheckout('${safeText(planId)}')">${safeText(buttonLabel)}</button>
        ${cancelButtonHtml}
      </div>
    `;
  }).join('');
  */
}

function renderBillingPanel() {
  const listEl = document.getElementById('billing-plan-list');
  const entitlementEl = document.getElementById('billing-entitlement');
  if (!listEl || !entitlementEl) return;

  const entitlement = billingState?.entitlement || { tier: 'free', status: 'active' };
  const tier = String(entitlement.tier || 'free').toLowerCase();
  const status = String(entitlement.status || 'active').toLowerCase();
  const provider = String(billingState?.provider || 'manual');

  const labelMap = { free: 'Free', pro: 'Pro' };
  const tierLabel = labelMap[tier] || tier;
  const statusLabel = status === 'active' ? 'aktif' : status === 'canceled' ? 'iptal bekliyor' : status;
  entitlementEl.textContent = `Mevcut plan: ${tierLabel} (${statusLabel}) - provider: ${provider}`;

  const plans = Array.isArray(billingState?.plans) ? billingState.plans : [];
  if (!plans.length) {
    listEl.innerHTML = '<div class="billing-plan-card"><div class="billing-plan-name">Plan bulunamadi</div></div>';
    return;
  }

  listEl.innerHTML = plans.map((plan) => {
    const planId = String(plan.id || '').toLowerCase();
    const isActive = tier === planId && status === 'active';
    const isCurrentCanceled = tier === planId && status === 'canceled';
    const isFree = planId === 'free';
    const isPaidPlan = !isFree;
    const showCancelButton = isActive && isPaidPlan;
    const buttonDisabled = isActive || isFree;
    const buttonLabel = isActive
      ? 'Aktif'
      : isFree
        ? 'Dahil'
        : (isCurrentCanceled ? 'Yeniden Etkinlestir' : 'Yukselt');
    const featureHtml = (Array.isArray(plan.features) ? plan.features : [])
      .slice(0, 6)
      .map((feature) => `<div class="billing-plan-feature">- ${safeText(feature)}</div>`)
      .join('');
    const price = formatBillingPrice(plan);
    const intervalText = plan.interval ? `<small> / ${safeText(plan.interval)}</small>` : '';
    const featuredClass = plan.featured ? ' featured' : '';
    const actionClass = plan.featured ? 'billing-plan-action alt' : 'billing-plan-action';
    const disabledAttr = buttonDisabled ? 'disabled' : '';
    const cancelButtonHtml = showCancelButton
      ? '<button type="button" class="billing-plan-action secondary" onclick="cancelBillingSubscription()">Aboneligi Iptal Et</button>'
      : '';

    return `
      <div class="billing-plan-card${featuredClass}">
        <div class="billing-plan-top">
          <div class="billing-plan-name">${safeText(plan.name || planId || 'Plan')}</div>
          <div class="billing-plan-price">${safeText(price)}${intervalText}</div>
        </div>
        <div class="billing-plan-features">${featureHtml}</div>
        <button type="button" class="${actionClass}" ${disabledAttr} onclick="startBillingCheckout('${safeText(planId)}')">${safeText(buttonLabel)}</button>
        ${cancelButtonHtml}
      </div>
    `;
  }).join('');
}

async function refreshBillingState(silent = false) {
  try {
    const { ok, data } = await billingFetch('GET');
    if (!ok) {
      if (!silent) setBillingMessage(normalizeBillingError(data, 'Paket bilgisi alinamadi.'), 'error');
      return false;
    }

    billingState = {
      provider: String(data?.provider || 'manual'),
      plans: Array.isArray(data?.plans) ? data.plans : [],
      entitlement: data?.entitlement && typeof data.entitlement === 'object'
        ? data.entitlement
        : { tier: 'free', status: 'active', source: 'default' },
      devActivationAllowed: data?.devActivationAllowed === true,
    };

    renderBillingPanel();
    updateBillingEntryButton();
    window.KokuCore?.setErrorTags?.({
      billing_provider: cleanPreferenceText(billingState.provider, 24) || 'none',
      billing_tier: cleanPreferenceText(billingState?.entitlement?.tier || 'free', 24),
      billing_status: cleanPreferenceText(billingState?.entitlement?.status || 'unknown', 24),
    });
    if (!silent) emitEvent('billing_state_refreshed');
    return true;
  } catch {
    if (!silent) setBillingMessage('Paket servisinde gecici baglanti sorunu var.', 'error');
    return false;
  }
}

function toggleBillingPanel() {
  const overlay = document.getElementById('billing-overlay');
  if (!overlay) return;
  const isOpen = overlay.style.display !== 'none';
  if (isOpen) {
    closeBillingPanel();
    return;
  }

  overlay.style.display = 'flex';
  setGrowthPrompt(null);
  setBillingMessage('');
  renderBillingPanel();
  refreshBillingState(true);
  try {
    localStorage.setItem(BILLING_HINT_KEY, new Date().toISOString());
  } catch {}
  emitEvent('billing_panel_opened');
}

function closeBillingPanel(fromBackdrop = false) {
  const overlay = document.getElementById('billing-overlay');
  if (!overlay || overlay.style.display === 'none') return;
  overlay.style.display = 'none';
  if (fromBackdrop) haptic(8);
  emitEvent('billing_panel_closed');
}

function postMobileBridgeEvent(action, payload = {}) {
  try {
    if (!window.KokuMobileBridge?.postMessage) return false;
    const safeAction = cleanPreferenceText(action, 48).toLowerCase();
    if (!safeAction) return false;
    window.KokuMobileBridge.postMessage(JSON.stringify({
      action: safeAction,
      ...payload,
    }));
    return true;
  } catch {
    return false;
  }
}

async function activateDevBillingPlan(planId) {
  const { ok, data } = await billingFetch('POST', { action: 'activate_dev_plan', planId });
  if (!ok) {
    setBillingMessage(normalizeBillingError(data, 'Dev plan aktivasyonu basarisiz.'), 'error');
    emitEvent('billing_dev_activation_failed', { plan_id: String(planId || 'unknown') });
    return false;
  }

  await refreshBillingState(true);
  setBillingMessage('Plan dev modda aktif edildi.', 'ok');
  emitEvent('billing_dev_activated', { plan_id: String(planId || 'unknown') });
  return true;
}

async function cancelBillingSubscription() {
  if (!authToken) {
    setBillingMessage('Abonelik iptali icin giris yapman gerekiyor.', 'error');
    emitEvent('billing_cancel_requires_auth');
    return false;
  }

  setBillingMessage('Abonelik iptal talebi gonderiliyor...');
  emitEvent('billing_cancel_requested');

  try {
    const { ok, data } = await billingFetch('POST', { action: 'cancel_subscription' });
    if (!ok) {
      setBillingMessage(normalizeBillingError(data, 'Abonelik iptal edilemedi.'), 'error');
      emitEvent('billing_cancel_failed');
      return false;
    }

    await refreshBillingState(true);
    setBillingMessage('Abonelik donem sonunda iptal edilecek olarak isaretlendi.', 'ok');
    emitEvent('billing_cancel_succeeded');
    return true;
  } catch {
    setBillingMessage('Iptal islemi sirasinda baglanti sorunu olustu.', 'error');
    emitEvent('billing_cancel_failed');
    return false;
  }
}

async function startBillingCheckout(planId) {
  const selectedPlan = String(planId || '').toLowerCase();
  if (!selectedPlan || selectedPlan === 'free') return;

  if (!authToken) {
    setBillingMessage('Yukseltme icin once giris yapman gerekiyor.', 'error');
    setAuthMode('register');
    if (document.getElementById('auth-overlay')?.style.display === 'none') toggleAuthPanel();
    emitEvent('billing_requires_auth', { plan_id: selectedPlan });
    postMobileBridgeEvent('billing_requires_auth', { planId: selectedPlan });
    return;
  }

  setBillingMessage('Odeme baglantisi hazirlaniyor...');
  emitEvent('billing_checkout_started', { plan_id: selectedPlan });

  try {
    const { ok, data } = await billingFetch('POST', { action: 'start_checkout', planId: selectedPlan });
    if (!ok) {
      const code = String(data?.code || '');
      if (code === 'checkout_unavailable') {
        emitEvent('billing_checkout_unavailable', { plan_id: selectedPlan });
        if (billingState.devActivationAllowed) {
          const activated = await activateDevBillingPlan(selectedPlan);
          if (activated) return;
        }
      }
      setBillingMessage(normalizeBillingError(data, 'Checkout baslatilamadi.'), 'error');
      return;
    }

    const checkoutUrl = String(data?.checkoutUrl || '').trim();
    if (!checkoutUrl) {
      setBillingMessage('Checkout URL bos dondu.', 'error');
      return;
    }

    postMobileBridgeEvent('open_paywall', {
      planId: selectedPlan,
      checkoutUrl,
      provider: cleanPreferenceText(data?.provider || billingState?.provider || 'manual', 24),
    });

    const openedWindow = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    if (!openedWindow) {
      emitEvent('billing_checkout_redirected', { plan_id: selectedPlan });
      window.location.assign(checkoutUrl);
      return;
    }

    setBillingMessage('Odeme sayfasi yeni sekmede acildi.', 'ok');
    emitEvent('billing_checkout_opened', { plan_id: selectedPlan });
    closeBillingPanel();
  } catch {
    setBillingMessage('Checkout sirasinda baglanti sorunu olustu.', 'error');
  }
}

function normalizeAuthError(data, fallback) {
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.error?.message === 'string' && data.error.message.trim()) return data.error.message;
  return fallback;
}

async function hydrateAuthFromToken() {
  const storedToken = readStoredAuthToken();
  if (!storedToken) {
    renderAuthState();
    return;
  }

  authToken = storedToken;
  try {
    const { ok, data } = await authFetch('GET');
    if (!ok || !data?.user) {
      applyAuthSession('', null);
      return;
    }
    applyAuthSession(storedToken, data.user);
    emitEvent('auth_session_restored');
  } catch {
    applyAuthSession('', null);
  }
}

function initAuth() {
  setAuthMode('login');
  renderAuthState();
  updateBillingEntryButton();
  refreshBillingState(true);
  hydrateAuthFromToken();

  document.getElementById('auth-password-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitAuth();
    }
  });
  document.getElementById('auth-email-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitAuth();
    }
  });
  document.getElementById('auth-name-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitAuth();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAuthPanel();
      closeBillingPanel();
    }
  });
}

function toggleAuthPanel() {
  const overlay = document.getElementById('auth-overlay');
  if (!overlay) return;

  const isOpen = overlay.style.display !== 'none';
  if (isOpen) {
    closeAuthPanel();
    return;
  }

  overlay.style.display = 'flex';
  renderAuthState();
  setAuthMessage('');
  emitEvent('auth_panel_opened');

  setTimeout(() => {
    const focusId = authUser ? 'profile-display-name' : (authMode === 'register' ? 'auth-name-input' : 'auth-email-input');
    document.getElementById(focusId)?.focus();
  }, 120);
}

function closeAuthPanel(fromBackdrop = false) {
  const overlay = document.getElementById('auth-overlay');
  if (!overlay || overlay.style.display === 'none') return;
  overlay.style.display = 'none';
  if (fromBackdrop) haptic(8);
  emitEvent('auth_panel_closed');
}

async function submitAuth() {
  if (authUser) return;

  const email = (document.getElementById('auth-email-input')?.value || '').trim().toLowerCase();
  const password = document.getElementById('auth-password-input')?.value || '';
  const name = (document.getElementById('auth-name-input')?.value || '').trim();

  if (!email || !email.includes('@')) {
    setAuthMessage('Gecerli bir email gir.', 'error');
    return;
  }
  if (password.length < 8) {
    setAuthMessage('Sifre en az 8 karakter olmali.', 'error');
    return;
  }
  if (authMode === 'register' && (!name || name.length < 2)) {
    setAuthMessage('Kayit icin ad soyad gir.', 'error');
    return;
  }

  const submitBtn = document.getElementById('auth-submit-btn');
  if (submitBtn) submitBtn.disabled = true;
  setAuthMessage(authMode === 'register' ? 'Kayit yapiliyor...' : 'Giris yapiliyor...');

  try {
    const body = authMode === 'register'
      ? { action: 'register', name, email, password }
      : { action: 'login', email, password };
    const { ok, data } = await authFetch('POST', body);
    if (!ok || !data?.token || !data?.user) {
      setAuthMessage(normalizeAuthError(data, 'Giris basarisiz oldu.'), 'error');
      return;
    }

    applyAuthSession(data.token, data.user);
    syncOnboardingToAuth();
    setAuthMessage(authMode === 'register' ? 'Kayit tamamlandi.' : 'Giris basarili.', 'ok');
    document.getElementById('auth-password-input').value = '';
    emitEvent(authMode === 'register' ? 'auth_register_ok' : 'auth_login_ok');
    recordRetentionEvent('auth_success');
    showToast(authMode === 'register' ? 'Kayit tamamlandi' : 'Giris basarili');
    closeAuthPanel();
  } catch {
    setAuthMessage('Gecici baglanti sorunu. Tekrar dene.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function logoutAuth() {
  try {
    await authFetch('POST', { action: 'logout' });
  } catch {}

  applyAuthSession('', null);
  setAuthMode('login');
  setAuthMessage('Cikis yapildi.', 'ok');
  showToast('Cikis yapildi');
  emitEvent('auth_logout');
  queueGrowthPromptEvaluation(220);
}

async function saveProfile() {
  if (!authUser || !authToken) {
    setAuthMessage('Profil kaydi icin giris gerekli.', 'error');
    return;
  }

  const payload = {
    profile: {
      displayName: (document.getElementById('profile-display-name')?.value || '').trim(),
      city: (document.getElementById('profile-city')?.value || '').trim(),
      budgetBand: (document.getElementById('profile-budget-band')?.value || '').trim(),
      gender: (document.getElementById('profile-gender')?.value || '').trim(),
      favoriteFamilies: parseFavoriteFamilies(document.getElementById('profile-families')?.value || ''),
    },
  };

  setAuthMessage('Profil kaydediliyor...');
  try {
    const { ok, data } = await authFetch('PATCH', payload);
    if (!ok || !data?.user) {
      setAuthMessage(normalizeAuthError(data, 'Profil kaydedilemedi.'), 'error');
      return;
    }
    applyAuthSession(authToken, data.user);
    setAuthMessage('Profil guncellendi.', 'ok');
    showToast('Profil guncellendi');
    emitEvent('auth_profile_saved');
    recordRetentionEvent('profile_saved');
  } catch {
    setAuthMessage('Gecici baglanti sorunu. Tekrar dene.', 'error');
  }
}

function sanitizeOnboardingProfile(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const purposeRaw = compactProfileValue(src.purpose, 20).toLowerCase();
  const allowedPurposes = new Set(['self', 'rotation', 'explore']);
  const purpose = allowedPurposes.has(purposeRaw) ? purposeRaw : '';
  const budgetBand = compactProfileValue(src.budgetBand, 40);
  const favoriteFamilies = Array.isArray(src.favoriteFamilies)
    ? src.favoriteFamilies.map((item) => compactProfileValue(item, 24).toLowerCase()).filter(Boolean).slice(0, 3)
    : [];

  return { purpose, budgetBand, favoriteFamilies };
}

function readStoredOnboardingProfile() {
  try {
    const raw = localStorage.getItem(ONBOARDING_PROFILE_KEY);
    if (!raw) return sanitizeOnboardingProfile({});
    return sanitizeOnboardingProfile(JSON.parse(raw));
  } catch {
    return sanitizeOnboardingProfile({});
  }
}

function writeStoredOnboardingProfile(profile) {
  onboardingProfile = sanitizeOnboardingProfile(profile);
  try {
    localStorage.setItem(ONBOARDING_PROFILE_KEY, JSON.stringify(onboardingProfile));
  } catch {}
}

function markOnboardingDone(doneValue) {
  try {
    if (doneValue) localStorage.setItem(ONBOARDING_DONE_KEY, '1');
    else localStorage.removeItem(ONBOARDING_DONE_KEY);
  } catch {}
}

function isOnboardingDone() {
  try {
    return localStorage.getItem(ONBOARDING_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function setOnboardingMessage(message, type = '') {
  const msgEl = document.getElementById('onboarding-msg');
  if (!msgEl) return;
  msgEl.textContent = message || '';
  msgEl.classList.remove('ok', 'error');
  if (type === 'ok' || type === 'error') msgEl.classList.add(type);
}

function paintOnboardingSelection() {
  const purposeRoot = document.getElementById('onboarding-purpose');
  const budgetRoot = document.getElementById('onboarding-budget');
  const familyRoot = document.getElementById('onboarding-families');

  if (purposeRoot) {
    purposeRoot.querySelectorAll('.onboarding-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.value === onboardingProfile.purpose);
    });
  }
  if (budgetRoot) {
    budgetRoot.querySelectorAll('.onboarding-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.value === onboardingProfile.budgetBand);
    });
  }
  if (familyRoot) {
    familyRoot.querySelectorAll('.onboarding-chip').forEach((chip) => {
      chip.classList.toggle('active-alt', onboardingProfile.favoriteFamilies.includes((chip.dataset.value || '').toLowerCase()));
    });
  }
}

async function syncOnboardingToAuth() {
  if (!authUser || !authToken) return;

  const authProfile = authUser.profile && typeof authUser.profile === 'object' ? authUser.profile : {};
  const patch = {
    profile: {
      displayName: compactProfileValue(authProfile.displayName || authUser.name, 60),
      city: compactProfileValue(authProfile.city, 40),
      budgetBand: compactProfileValue(onboardingProfile.budgetBand || authProfile.budgetBand, 40),
      gender: compactProfileValue(authProfile.gender, 20),
      favoriteFamilies: onboardingProfile.favoriteFamilies.length
        ? onboardingProfile.favoriteFamilies
        : (Array.isArray(authProfile.favoriteFamilies) ? authProfile.favoriteFamilies.slice(0, 8) : []),
    },
  };

  try {
    const { ok, data } = await authFetch('PATCH', patch);
    if (ok && data?.user) {
      applyAuthSession(authToken, data.user);
      emitEvent('onboarding_synced_to_auth');
    }
  } catch {}
}

function onboardingSelectPurpose(value) {
  onboardingProfile.purpose = compactProfileValue(value, 20).toLowerCase();
  writeStoredOnboardingProfile(onboardingProfile);
  paintOnboardingSelection();
  emitEvent('onboarding_purpose_selected', { value: onboardingProfile.purpose || 'none' });
}

function onboardingSelectBudget(value) {
  onboardingProfile.budgetBand = compactProfileValue(value, 40);
  writeStoredOnboardingProfile(onboardingProfile);
  paintOnboardingSelection();
  emitEvent('onboarding_budget_selected', { value: onboardingProfile.budgetBand || 'none' });
}

function onboardingToggleFamily(value) {
  const family = compactProfileValue(value, 24).toLowerCase();
  if (!family) return;

  const idx = onboardingProfile.favoriteFamilies.indexOf(family);
  if (idx >= 0) {
    onboardingProfile.favoriteFamilies.splice(idx, 1);
  } else {
    if (onboardingProfile.favoriteFamilies.length >= 3) {
      setOnboardingMessage('En fazla 3 aile secilebilir.', 'error');
      return;
    }
    onboardingProfile.favoriteFamilies.push(family);
  }
  writeStoredOnboardingProfile(onboardingProfile);
  paintOnboardingSelection();
  setOnboardingMessage('');
  emitEvent('onboarding_family_toggled', {
    family,
    selected_count: String(onboardingProfile.favoriteFamilies.length),
  });
}

function hideOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
}

function showOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  closeBillingPanel();
  setGrowthPrompt(null);
  paintOnboardingSelection();
  setOnboardingMessage('');
  emitEvent('onboarding_viewed');
}

function buildOnboardingStarterPrompt() {
  const familyToPrompt = {
    fresh: 'Taze narenciye ve temiz his veren modern bir parfum oner',
    floral: 'Floral ve zarif notali bir parfum oner',
    woody: 'Odunsu, derin ve kalici bir parfum oner',
    gourmand: 'Gourmand, sicak ve tatli bir parfum oner',
    oriental: 'Oryantal ve etkileyici bir parfum oner',
  };

  const leadFamily = onboardingProfile.favoriteFamilies[0] || '';
  const purposePart = onboardingProfile.purpose === 'rotation'
    ? 'Koleksiyon rotasyonu icin '
    : onboardingProfile.purpose === 'explore'
      ? 'Yeni bir imza koku kesfi icin '
      : '';
  const budgetPart = onboardingProfile.budgetBand ? `, butce ${onboardingProfile.budgetBand}` : '';
  const core = familyToPrompt[leadFamily] || 'Tarzima uygun bir parfum oner';
  return `${purposePart}${core}${budgetPart}.`;
}

async function completeOnboarding(isFromStarter = false) {
  writeStoredOnboardingProfile(onboardingProfile);
  markOnboardingDone(true);
  await syncOnboardingToAuth();
  hideOnboarding();
  setOnboardingMessage('');
  emitEvent('onboarding_completed', {
    purpose: onboardingProfile.purpose || 'none',
    budget: onboardingProfile.budgetBand ? 'set' : 'none',
    family_count: String(onboardingProfile.favoriteFamilies.length),
  });
  queueGrowthPromptEvaluation(260);
  if (!isFromStarter) showToast('Onboarding tamamlandi');
}

function skipOnboarding() {
  markOnboardingDone(true);
  hideOnboarding();
  setOnboardingMessage('');
  emitEvent('onboarding_skipped');
  queueGrowthPromptEvaluation(260);
}

async function onboardingStartFirstAnalysis() {
  await completeOnboarding(true);
  const input = document.getElementById('text-input');
  if (!input) return;

  switchTab('text');
  input.value = buildOnboardingStarterPrompt();
  checkReady();
  input.focus();
  showToast('Ilk analiz metni hazirlandi');
  emitEvent('onboarding_first_analysis_ready');
}

function initOnboarding() {
  onboardingProfile = readStoredOnboardingProfile();
  paintOnboardingSelection();

  const hasHistory = (() => {
    try {
      const history = JSON.parse(localStorage.getItem('koku-gecmis') || '[]');
      return Array.isArray(history) && history.length > 0;
    } catch {
      return false;
    }
  })();

  if (!isOnboardingDone() && !hasHistory) {
    showOnboarding();
  }
}

function defaultRetentionState() {
  return {
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
}

function sanitizeRetentionState(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    openCount: Number.isFinite(Number(src.openCount)) ? Math.max(0, Number(src.openCount)) : 0,
    analysisCount: Number.isFinite(Number(src.analysisCount)) ? Math.max(0, Number(src.analysisCount)) : 0,
    advisorCount: Number.isFinite(Number(src.advisorCount)) ? Math.max(0, Number(src.advisorCount)) : 0,
    authCount: Number.isFinite(Number(src.authCount)) ? Math.max(0, Number(src.authCount)) : 0,
    profileSaveCount: Number.isFinite(Number(src.profileSaveCount)) ? Math.max(0, Number(src.profileSaveCount)) : 0,
    lastOpenAt: compactProfileValue(src.lastOpenAt, 40),
    lastAnalysisAt: compactProfileValue(src.lastAnalysisAt, 40),
    lastAdvisorAt: compactProfileValue(src.lastAdvisorAt, 40),
    promptShownAt: src.promptShownAt && typeof src.promptShownAt === 'object' ? src.promptShownAt : {},
    lastSeenGapDays: Number.isFinite(Number(src.lastSeenGapDays)) ? Number(src.lastSeenGapDays) : null,
  };
}

function readRetentionState() {
  try {
    const raw = localStorage.getItem(RETENTION_STATE_KEY);
    if (!raw) return defaultRetentionState();
    return sanitizeRetentionState(JSON.parse(raw));
  } catch {
    return defaultRetentionState();
  }
}

function writeRetentionState(nextState) {
  retentionState = sanitizeRetentionState(nextState);
  try {
    localStorage.setItem(RETENTION_STATE_KEY, JSON.stringify(retentionState));
  } catch {}
}

function toTimestamp(value) {
  const ts = Date.parse(String(value || ''));
  return Number.isFinite(ts) ? ts : null;
}

function daysSinceIso(value) {
  const ts = toTimestamp(value);
  if (!ts) return null;
  return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
}

function readHistoryListSafe() {
  try {
    const history = JSON.parse(localStorage.getItem('koku-gecmis') || '[]');
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function getLatestHistoryName() {
  const history = readHistoryListSafe();
  const latest = history[0];
  return compactProfileValue(latest?.name || '', 120);
}

function setGrowthPrompt(prompt) {
  const wrap = document.getElementById('growth-prompt');
  const titleEl = document.getElementById('growth-prompt-title');
  const textEl = document.getElementById('growth-prompt-text');
  const actionsEl = document.getElementById('growth-prompt-actions');
  if (!wrap || !titleEl || !textEl || !actionsEl) return;

  if (!prompt) {
    wrap.style.display = 'none';
    currentGrowthPromptId = '';
    titleEl.textContent = 'Koku Motoru';
    textEl.textContent = '';
    actionsEl.innerHTML = '';
    return;
  }

  wrap.style.display = 'block';
  currentGrowthPromptId = prompt.id || '';
  titleEl.textContent = prompt.title || 'Koku Motoru';
  textEl.textContent = prompt.text || '';
  actionsEl.innerHTML = '';

  const actions = Array.isArray(prompt.actions) ? prompt.actions : [];
  actions.forEach((action) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `growth-prompt-btn${action.alt ? ' alt' : ''}`;
    btn.textContent = action.label || 'Devam';
    btn.addEventListener('click', () => runGrowthPromptAction(prompt.id, action.id));
    actionsEl.appendChild(btn);
  });
}

function isGrowthPromptSuppressed() {
  const onboardingOpen = document.getElementById('onboarding-overlay')?.style.display !== 'none';
  const authOpen = document.getElementById('auth-overlay')?.style.display !== 'none';
  const billingOpen = document.getElementById('billing-overlay')?.style.display !== 'none';
  const loadingVisible = document.getElementById('loading-state')?.classList.contains('visible');
  return Boolean(onboardingOpen || authOpen || billingOpen || loadingVisible);
}

function canShowGrowthPrompt(promptId, cooldownHours) {
  if (!promptId) return false;
  const shownMap = retentionState.promptShownAt && typeof retentionState.promptShownAt === 'object'
    ? retentionState.promptShownAt
    : {};
  const lastShownTs = toTimestamp(shownMap[promptId]);
  if (!lastShownTs) return true;
  return (Date.now() - lastShownTs) >= (cooldownHours * 60 * 60 * 1000);
}

function markGrowthPromptShown(promptId) {
  if (!promptId) return;
  const next = {
    ...retentionState,
    promptShownAt: {
      ...(retentionState.promptShownAt || {}),
      [promptId]: new Date().toISOString(),
    },
  };
  writeRetentionState(next);
}

function buildAdvisorRetentionText() {
  const profile = getActivePreferenceProfile();
  const budget = profile.budgetBand ? `Butcem ${profile.budgetBand}. ` : '';
  const family = profile.favoriteFamilies[0] ? `Favorim ${profile.favoriteFamilies[0]}. ` : '';
  const purpose = profile.purpose ? `Amacim ${profile.purpose}. ` : '';
  return `${purpose}${budget}${family}Profilime gore 3 parfum oner.`;
}

function buildGrowthPromptCandidate() {
  if (isGrowthPromptSuppressed()) return null;

  const history = readHistoryListSafe();
  const hasHistory = history.length > 0;
  const latestName = compactProfileValue(history[0]?.name || '', 120);
  const daysSinceAnalysis = daysSinceIso(retentionState.lastAnalysisAt);

  if (!hasHistory && isOnboardingDone() && canShowGrowthPrompt('first_analysis_nudge', 12)) {
    return {
      id: 'first_analysis_nudge',
      title: 'Ilk Adimi At',
      text: 'Profilin hazir. Ilk analizle koku motorunu senin zevkine sabitleyelim.',
      actions: [
        { id: 'start_first_analysis', label: 'Ilk Analizi Hazirla' },
        { id: 'dismiss', label: 'Simdilik Gec', alt: true },
      ],
    };
  }

  if (hasHistory && daysSinceAnalysis !== null && daysSinceAnalysis >= 2 && canShowGrowthPrompt('comeback_nudge', 18)) {
    const suffix = latestName ? ` Son kokun: ${latestName}.` : '';
    return {
      id: 'comeback_nudge',
      title: 'Tekrar Hos Geldin',
      text: `Son analizinden ${daysSinceAnalysis} gun gecmis.${suffix}`,
      actions: [
        { id: 'analyze_last', label: 'Son Kokuyu Analiz Et' },
        { id: 'dismiss', label: 'Simdilik Gec', alt: true },
      ],
    };
  }

  if (!authUser && retentionState.analysisCount >= 3 && canShowGrowthPrompt('auth_nudge', 24)) {
    return {
      id: 'auth_nudge',
      title: 'Profili Kalici Yap',
      text: 'Birden fazla analiz yaptin. Giris yaparsan tercihlerin cihaz degistirsen de korunur.',
      actions: [
        { id: 'open_auth', label: 'Hesap Ac' },
        { id: 'dismiss', label: 'Daha Sonra', alt: true },
      ],
    };
  }

  return null;
}

function evaluateGrowthPrompt() {
  const prompt = buildGrowthPromptCandidate();
  if (!prompt) {
    setGrowthPrompt(null);
    return;
  }

  if (currentGrowthPromptId === prompt.id && document.getElementById('growth-prompt')?.style.display !== 'none') {
    return;
  }

  setGrowthPrompt(prompt);
  markGrowthPromptShown(prompt.id);
  emitEvent('retention_prompt_shown', { prompt_id: prompt.id });
}

function queueGrowthPromptEvaluation(delayMs = 280) {
  if (retentionTimer) clearTimeout(retentionTimer);
  retentionTimer = setTimeout(() => {
    evaluateGrowthPrompt();
  }, Math.max(0, Number(delayMs) || 0));
}

function recordRetentionEvent(eventName) {
  const nowIso = new Date().toISOString();
  const next = {
    ...retentionState,
  };

  if (eventName === 'analysis_success') {
    next.analysisCount = Number(next.analysisCount || 0) + 1;
    next.lastAnalysisAt = nowIso;
  } else if (eventName === 'advisor_reply_ok') {
    next.advisorCount = Number(next.advisorCount || 0) + 1;
    next.lastAdvisorAt = nowIso;
  } else if (eventName === 'auth_success') {
    next.authCount = Number(next.authCount || 0) + 1;
  } else if (eventName === 'profile_saved') {
    next.profileSaveCount = Number(next.profileSaveCount || 0) + 1;
  }

  writeRetentionState(next);
  queueGrowthPromptEvaluation(220);
}

function initRetention() {
  retentionState = readRetentionState();
  const nowIso = new Date().toISOString();
  const gapDays = daysSinceIso(retentionState.lastOpenAt);
  const next = {
    ...retentionState,
    openCount: Number(retentionState.openCount || 0) + 1,
    lastOpenAt: nowIso,
    lastSeenGapDays: Number.isFinite(gapDays) ? gapDays : null,
  };
  writeRetentionState(next);
  queueGrowthPromptEvaluation(700);
}

function dismissGrowthPrompt() {
  setGrowthPrompt(null);
  emitEvent('retention_prompt_dismissed');
}

function ensureAdvisorOpen() {
  const overlay = document.getElementById('advisor-overlay');
  if (!overlay) return;
  if (overlay.style.display === 'none') {
    toggleAdvisor();
  }
}

function runGrowthPromptAction(promptId, actionId) {
  emitEvent('retention_prompt_action', { prompt_id: promptId || 'unknown', action_id: actionId || 'unknown' });

  if (actionId === 'start_first_analysis') {
    onboardingStartFirstAnalysis();
    dismissGrowthPrompt();
    return;
  }

  if (actionId === 'analyze_last') {
    const latestName = getLatestHistoryName();
    if (latestName) {
      switchTab('text');
      const input = document.getElementById('text-input');
      if (input) input.value = latestName;
      checkReady();
      showToast('Son koku metni hazirlandi');
    }
    dismissGrowthPrompt();
    return;
  }

  if (actionId === 'open_auth') {
    setAuthMode('register');
    const overlay = document.getElementById('auth-overlay');
    if (overlay?.style.display === 'none') toggleAuthPanel();
    dismissGrowthPrompt();
    return;
  }

  if (actionId === 'open_advisor') {
    ensureAdvisorOpen();
    dismissGrowthPrompt();
    return;
  }

  if (actionId === 'open_advisor_seeded') {
    ensureAdvisorOpen();
    const text = buildAdvisorRetentionText();
    if (text) {
      setTimeout(() => {
        sendAdvisorMessage(text);
      }, 360);
    }
    dismissGrowthPrompt();
    return;
  }

  if (actionId === 'dismiss') {
    dismissGrowthPrompt();
  }
}

function compactProfileValue(value, maxLen = 80) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

function mergePromptExtras(parts) {
  return parts
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 1800);
}

function getActivePreferenceProfile() {
  const authProfile = authUser?.profile && typeof authUser.profile === 'object' ? authUser.profile : {};
  const onboarding = onboardingProfile && typeof onboardingProfile === 'object' ? onboardingProfile : {};

  const favoriteFamilies = Array.from(new Set([
    ...(Array.isArray(authProfile.favoriteFamilies) ? authProfile.favoriteFamilies : []),
    ...(Array.isArray(onboarding.favoriteFamilies) ? onboarding.favoriteFamilies : []),
  ].map((item) => compactProfileValue(item, 24).toLowerCase()).filter(Boolean))).slice(0, 8);

  return {
    displayName: compactProfileValue(authProfile.displayName || authUser?.name, 60),
    gender: compactProfileValue(authProfile.gender, 20),
    budgetBand: compactProfileValue(onboarding.budgetBand || authProfile.budgetBand, 40),
    city: compactProfileValue(authProfile.city, 40),
    purpose: compactProfileValue(onboarding.purpose, 20),
    favoriteFamilies,
  };
}

function buildProfilePromptExtra(mode = 'analysis') {
  const profile = getActivePreferenceProfile();
  const facts = [];
  const behaviorExtra = buildBehaviorPromptExtra();

  if (profile.displayName) facts.push(`ad: ${profile.displayName}`);
  if (profile.gender) facts.push(`cinsiyet tercihi: ${profile.gender}`);
  if (profile.budgetBand) facts.push(`butce bandi: ${profile.budgetBand}`);
  if (profile.city) facts.push(`sehir: ${profile.city}`);
  if (profile.purpose) facts.push(`kullanim amaci: ${profile.purpose}`);
  if (profile.favoriteFamilies.length) facts.push(`favori koku aileleri: ${profile.favoriteFamilies.join(', ')}`);

  if (!facts.length && !behaviorExtra) return '';

  const guidance = mode === 'advisor'
    ? 'Bu bilgileri kullan ama son kullanici mesajini ana kaynak olarak tut.'
    : 'Teknik dogruluk korunurken onerileri bu profile uyumlu sirala.';

  const sections = [];
  if (facts.length) {
    sections.push(mergePromptExtras([
      'KULLANICI PROFIL BAGLAMI:',
      ...facts.map((fact) => `- ${fact}`),
      guidance,
    ]));
  }
  if (behaviorExtra) sections.push(behaviorExtra);
  return mergePromptExtras(sections);
}

function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tab-photo').classList.toggle('active', tab === 'photo');
  document.getElementById('tab-text').classList.toggle('active', tab === 'text');
  document.getElementById('tab-notes')?.classList.toggle('active', tab === 'notes');
  document.getElementById('photo-panel').classList.toggle('hidden', tab !== 'photo');
  document.getElementById('text-panel').classList.toggle('active', tab === 'text');
  document.getElementById('notes-panel')?.classList.toggle('active', tab === 'notes');
  checkReady();
}

function fillSuggestion(text) {
  document.getElementById('text-input').value = text;
  checkReady();
}

function fillNoteInput(text) {
  const input = document.getElementById('notes-input');
  if (!input) return;
  input.value = text;
  checkReady();
}

function parseNoteListInput(raw) {
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
}

/* ── IMAGE UPLOAD — sıkıştırma + HEIC desteği ── */
