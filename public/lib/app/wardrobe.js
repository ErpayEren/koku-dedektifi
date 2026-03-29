/* Koku App Module: wardrobe */
function renderShelf() {
  const section = document.getElementById('shelf-section');
  const grid = document.getElementById('shelf-grid');
  const countLabel = document.getElementById('shelf-count-label');
  const filtersWrap = document.getElementById('shelf-filters');
  const wearSummary = document.getElementById('wear-summary');
  if (!section || !grid || !countLabel || !filtersWrap) return;

  const items = Object.values(readShelfState())
    .map((item) => normalizeShelfEntry(item))
    .filter((item) => item && item.name)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

  filtersWrap.innerHTML = Object.entries(SHELF_FILTER_META).map(([filterKey, label]) => `
    <button class="shelf-chip mini${shelfFilterState === filterKey ? ' active' : ''}" type="button" onclick="setShelfFilter('${filterKey}')">${safeText(label)}</button>
  `).join('');

  countLabel.textContent = `${items.length} kayit`;
  if (!items.length) {
    section.style.display = 'none';
    grid.innerHTML = '';
    if (wearSummary) wearSummary.textContent = 'Wear tracker hazir.';
    renderFeed();
    return;
  }

  if (wearSummary) {
    wearSummary.textContent = formatWearSummary(readShelfState());
  }

  const filteredItems = items.filter((item) => {
    if (shelfFilterState === 'all') return true;
    if (shelfFilterState === 'favorite') return item.favorite === true;
    return Array.isArray(item.tags) && item.tags.includes(shelfFilterState);
  });

  section.style.display = 'block';
  grid.innerHTML = filteredItems.length ? filteredItems.map((item, index) => `
    <div class="history-item" data-shelf-index="${index}">
      <div class="history-item-info">
        <div class="history-item-badge">${safeText(getShelfStatusLabel(item.status))}</div>
        <div class="history-item-name shelf-item-name">${iconMarkup(resolvePremiumIconToken(item, SCENT_TOKEN_FALLBACK), 'scent-badge-icon')} ${safeText(item.name)}</div>
        <div class="history-item-date">${safeText(item.family || 'Koku profili')} • Wear ${getEntryWearTotal(item)}</div>
        <div class="shelf-card-meta">
          ${item.favorite ? '<span class="history-item-badge star">Favori</span>' : ''}
          ${(item.tags || []).map((tag) => `<span class="history-item-badge muted">${safeText(SHELF_TAG_META[tag]?.label || tag)}</span>`).join('')}
        </div>
        <div class="decision-actions">
          <button class="decision-btn ghost" type="button" data-sotd-name="${safeText(item.name).replace(/"/g, '&quot;')}">Bugun bunu sikiyorum</button>
        </div>
      </div>
    </div>
  `).join('') : '<div class="history-empty" style="grid-column:1/-1">Bu filtrede kayit bulunamadi</div>';

  grid.querySelectorAll('[data-shelf-index]').forEach((node) => {
    node.addEventListener('click', () => {
      const index = Number(node.dataset.shelfIndex || -1);
      const item = filteredItems[index];
      if (!item?.name) return;
      switchTab('text');
      reset();
      setTimeout(() => {
        const input = document.getElementById('text-input');
        if (input) input.value = item.name;
        checkReady();
      }, 80);
      showToast(`${item.name} tekrar hazirlandi`);
    });
  });

  grid.querySelectorAll('[data-sotd-name]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      const perfumeName = cleanPreferenceText(btn.getAttribute('data-sotd-name') || '', 140);
      if (perfumeName) markSotd(perfumeName);
    });
  });

  renderFeed();
}

function setCurrentResultShelfState(status) {
  if (!currentResultData?.name || !SHELF_STATUS_META[status]) return;
  const key = normalizeScentKey(currentResultData.name);
  if (!key) return;

  const shelf = readShelfState();
  const prev = normalizeShelfEntry(shelf[key]) || {};
  shelf[key] = {
    ...prev,
    name: currentResultData.name,
    iconToken: resolvePremiumIconToken(currentResultData, SCENT_TOKEN_FALLBACK),
    emoji: resolvePremiumIconToken(currentResultData, SCENT_TOKEN_FALLBACK),
    family: currentResultData.family || '',
    status,
    analysis: getCurrentResultSnapshot(),
    updatedAt: new Date().toISOString(),
  };
  writeShelfState(shelf);
  renderCurrentResultShelfState();
  renderShelf();
  renderHistory();
  pushFeedEvent('analysis_done', {
    perfume: currentResultData.name,
    detail: `Durum -> ${getShelfStatusLabel(status)}`,
  });
  emitEvent('shelf_state_set', { status, family: currentResultData.family || 'unknown' });
  showToast(`${currentResultData.name} -> ${getShelfStatusLabel(status)}`);
}

function toggleCurrentResultFavorite() {
  if (!currentResultData?.name) return;
  const key = normalizeScentKey(currentResultData.name);
  if (!key) return;

  const shelf = readShelfState();
  const prev = normalizeShelfEntry(shelf[key]) || {
    name: currentResultData.name,
    iconToken: resolvePremiumIconToken(currentResultData, SCENT_TOKEN_FALLBACK),
    emoji: resolvePremiumIconToken(currentResultData, SCENT_TOKEN_FALLBACK),
    family: currentResultData.family || '',
    status: 'wishlist',
    tags: [],
  };
  prev.favorite = !prev.favorite;
  prev.analysis = getCurrentResultSnapshot();
  prev.updatedAt = new Date().toISOString();
  shelf[key] = prev;
  writeShelfState(shelf);
  renderCurrentResultShelfState();
  renderShelf();
  renderHistory();
  pushFeedEvent('analysis_done', {
    perfume: currentResultData.name,
    detail: prev.favorite ? 'Favorilere eklendi' : 'Favoriden cikarildi',
  });
  emitEvent('shelf_favorite_toggled', { state: prev.favorite ? 'on' : 'off' });
  showToast(prev.favorite ? 'Favorilere eklendi' : 'Favoriden cikarildi');
}

function toggleCurrentResultTag(tag) {
  if (!currentResultData?.name || !SHELF_TAG_META[tag]) return;
  const key = normalizeScentKey(currentResultData.name);
  if (!key) return;

  const shelf = readShelfState();
  const prev = normalizeShelfEntry(shelf[key]) || {
    name: currentResultData.name,
    iconToken: resolvePremiumIconToken(currentResultData, SCENT_TOKEN_FALLBACK),
    emoji: resolvePremiumIconToken(currentResultData, SCENT_TOKEN_FALLBACK),
    family: currentResultData.family || '',
    status: 'wishlist',
    favorite: false,
    tags: [],
  };

  const nextTags = new Set(prev.tags || []);
  if (nextTags.has(tag)) nextTags.delete(tag);
  else nextTags.add(tag);

  prev.tags = Array.from(nextTags);
  prev.analysis = getCurrentResultSnapshot();
  prev.updatedAt = new Date().toISOString();
  shelf[key] = prev;
  writeShelfState(shelf);
  renderCurrentResultShelfState();
  renderShelf();
  pushFeedEvent('analysis_done', {
    perfume: currentResultData.name,
    detail: `Etiket: ${tag}`,
  });
  emitEvent('shelf_tag_toggled', { tag });
}

function setShelfFilter(filterKey = 'all') {
  if (!SHELF_FILTER_META[filterKey]) return;
  shelfFilterState = filterKey;
  renderShelf();
  emitEvent('shelf_filter_changed', { filter: filterKey });
}

function submitResultFeedback(type) {
  if (!currentResultData?.name || !FEEDBACK_META[type]) return;
  const key = normalizeScentKey(currentResultData.name);
  const state = readFeedbackState();
  state[key] = {
    name: currentResultData.name,
    family: currentResultData.family || '',
    type,
    updatedAt: new Date().toISOString(),
  };
  writeFeedbackState(state);
  renderCurrentResultFeedbackState();
  pushFeedEvent('analysis_done', {
    perfume: currentResultData.name,
    detail: `Geri bildirim: ${FEEDBACK_META[type]?.label || type}`,
  });
  emitEvent('result_feedback_set', { type, family: currentResultData.family || 'unknown' });
  showToast(FEEDBACK_META[type].toast);
}

function submitFeedbackQuick(type) {
  if (!FEEDBACK_META[type]) return;
  const section = document.getElementById('sec-feedback');
  if (section) {
    section.dataset.reasonOpen = type === 'accurate' ? 'false' : 'true';
  }
  submitResultFeedback(type);
  renderCurrentResultFeedbackState();
}

function submitFeedbackReason(type) {
  if (!FEEDBACK_META[type] || type === 'accurate') return;
  const section = document.getElementById('sec-feedback');
  if (section) section.dataset.reasonOpen = 'true';
  submitResultFeedback(type);
  renderCurrentResultFeedbackState();
}
