/* Koku App Module: labs-overlays (lazy candidates) */
async function handleBarcodeLookup(code, options = {}) {
  const value = cleanPreferenceText(code, 24).replace(/[^0-9]/g, '');
  const msg = document.getElementById('barcode-msg');
  if (!value) {
    if (msg) msg.textContent = 'Gecerli barkod gir.';
    return;
  }
  if (msg) msg.textContent = 'Barkod aranıyor...';
  try {
    const data = await window.KokuLabs?.lookupBarcode?.(value);
    if (!data?.found || !data?.perfume) {
      if (msg) msg.textContent = 'Barkod katalogda yok. Manuel metin analizine gectim.';
      switchTab('text');
      reset();
      setTimeout(() => {
        const input = document.getElementById('text-input');
        if (input) input.value = value;
        checkReady();
      }, 90);
      if (!options.keepOpen) closeBarcodeOverlay();
      emitEvent('barcode_lookup_miss', { code_length: String(value.length) });
      return;
    }
    if (msg) msg.textContent = `${data.perfume} bulundu.`;
    switchTab('text');
    reset();
    setTimeout(() => {
      const input = document.getElementById('text-input');
      if (input) input.value = data.perfume;
      checkReady();
    }, 90);
    closeBarcodeOverlay();
    emitEvent('barcode_lookup_hit', { perfume: cleanPreferenceText(data.perfume, 90) });
    pushFeedEvent('analysis_done', {
      perfume: cleanPreferenceText(data.perfume, 120),
      detail: 'Barkod tarama ile bulundu',
    });
  } catch (error) {
    if (msg) msg.textContent = cleanPreferenceText(error?.message || 'Barkod arama hatasi', 120);
  }
}

async function startBarcodeScanner() {
  const video = document.getElementById('barcode-video');
  const msg = document.getElementById('barcode-msg');
  if (!video || !navigator.mediaDevices?.getUserMedia) {
    if (msg) msg.textContent = 'Kamera API desteklenmiyor. Manuel barkod gir.';
    return;
  }
  try {
    barcodeScannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });
    video.srcObject = barcodeScannerStream;
    await video.play();
  } catch (error) {
    if (msg) msg.textContent = 'Kamera izni gerekli. Izin verip tekrar dene.';
    return;
  }

  if (!('BarcodeDetector' in window)) {
    if (msg) msg.textContent = 'Bu cihazda otomatik barkod algilama yok. Manuel giris kullan.';
    return;
  }
  const detector = new window.BarcodeDetector({
    formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
  });
  if (barcodeScannerTimer) clearInterval(barcodeScannerTimer);
  barcodeScannerTimer = setInterval(async () => {
    if (!video || video.readyState < 2) return;
    try {
      const codes = await detector.detect(video);
      const value = cleanPreferenceText(codes?.[0]?.rawValue || '', 24);
      if (!value) return;
      stopBarcodeScanner();
      handleBarcodeLookup(value);
    } catch {
      // ignore transient detector errors
    }
  }, 500);
}

function stopBarcodeScanner() {
  if (barcodeScannerTimer) {
    clearInterval(barcodeScannerTimer);
    barcodeScannerTimer = null;
  }
  if (barcodeScannerStream) {
    barcodeScannerStream.getTracks().forEach((track) => track.stop());
    barcodeScannerStream = null;
  }
  const video = document.getElementById('barcode-video');
  if (video) {
    video.pause();
    video.srcObject = null;
  }
}

function openBarcodeOverlay() {
  const overlay = document.getElementById('barcode-overlay');
  const input = document.getElementById('barcode-input');
  const msg = document.getElementById('barcode-msg');
  if (!overlay) return;
  overlay.style.display = 'flex';
  if (input) input.value = '';
  if (msg) msg.textContent = 'Barkodu kameraya tut veya manuel gir.';
  startBarcodeScanner();
  emitEvent('barcode_overlay_opened');
}

function closeBarcodeOverlay(fromBackdrop = false) {
  const overlay = document.getElementById('barcode-overlay');
  if (!overlay || overlay.style.display === 'none') return;
  stopBarcodeScanner();
  overlay.style.display = 'none';
  emitEvent('barcode_overlay_closed', { source: fromBackdrop ? 'backdrop' : 'action' });
}

function submitBarcodeManual() {
  const input = document.getElementById('barcode-input');
  handleBarcodeLookup(cleanPreferenceText(input?.value || '', 24));
}

function openFinderOverlay() {
  const overlay = document.getElementById('finder-overlay');
  const includeInput = document.getElementById('finder-include');
  const msg = document.getElementById('finder-msg');
  const results = document.getElementById('finder-results');
  if (!overlay || !includeInput || !msg || !results) return;
  msg.textContent = '';
  results.innerHTML = '';
  if (!includeInput.value && currentResultData?.pyramid) {
    const notes = getCompareDisplayNotes(currentResultData);
    includeInput.value = notes.join(', ');
  }
  overlay.style.display = 'flex';
}

function closeFinderOverlay(fromBackdrop = false) {
  const overlay = document.getElementById('finder-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  emitEvent('finder_overlay_closed', { source: fromBackdrop ? 'backdrop' : 'action' });
}

async function runPerfumeFinder() {
  const includeInput = document.getElementById('finder-include');
  const excludeInput = document.getElementById('finder-exclude');
  const sweetnessInput = document.getElementById('finder-sweetness');
  const msg = document.getElementById('finder-msg');
  const results = document.getElementById('finder-results');
  if (!includeInput || !excludeInput || !sweetnessInput || !msg || !results) return;

  const include = includeInput.value.trim();
  if (!include) {
    msg.textContent = 'En az bir include note girmelisin.';
    return;
  }

  msg.textContent = 'Finder calisiyor...';
  results.innerHTML = '';
  try {
    const data = await window.KokuLabs?.runFinder?.({
      includeNotes: include,
      excludeNotes: excludeInput.value.trim(),
      maxSweetness: Number(sweetnessInput.value || 65),
      targetSweetness: Number(sweetnessInput.value || 65),
      limit: 8,
    });
    const list = Array.isArray(data?.candidates) ? data.candidates : [];
    if (!list.length) {
      msg.textContent = 'Bu filtrede birebir sonuc bulunamadi. Notalari biraz genisletip tekrar dene.';
      return;
    }
    msg.textContent = data?.fallbackApplied
      ? `${list.length} yakin aday bulundu (esnek arama modu).`
      : `${list.length} aday bulundu.`;
    results.innerHTML = list.map((item) => {
      const encodedName = encodeURIComponent(cleanPreferenceText(item?.name || '', 140));
      return `
      <button class="history-item finder-item-btn" type="button" data-finder-name="${encodedName}">
        <div class="history-item-info">
          <div class="history-item-badge">${safeText(item.score)}/100</div>
          <div class="history-item-name">${safeText(item.name)}</div>
          <div class="history-item-date">${safeText(item.family || '')} • tatlilik ${safeText(item.sweetness)}</div>
        </div>
      </button>
    `;
    }).join('');
    results.querySelectorAll('.finder-item-btn').forEach((node) => {
      node.addEventListener('click', () => {
        const encoded = cleanPreferenceText(node.getAttribute('data-finder-name') || '', 260);
        if (!encoded) return;
        try {
          pickFinderResult(decodeURIComponent(encoded));
        } catch {
          pickFinderResult(encoded);
        }
      });
    });
    pushFeedEvent('finder_run', { detail: `${include}` });
    emitEvent('finder_run', { include_count: String(include.split(',').length) });
  } catch (error) {
    msg.textContent = cleanPreferenceText(error?.message || 'Finder hatasi', 120);
  }
}

function pickFinderResult(name) {
  const perfumeName = cleanPreferenceText(name, 140);
  if (!perfumeName) return;
  closeFinderOverlay();
  switchTab('text');
  reset();
  setTimeout(() => {
    const input = document.getElementById('text-input');
    if (input) input.value = perfumeName;
    checkReady();
  }, 90);
}

function openLayeringLabOverlay() {
  const overlay = document.getElementById('layering-lab-overlay');
  const left = document.getElementById('layering-left');
  const right = document.getElementById('layering-right');
  const msg = document.getElementById('layering-lab-msg');
  if (!overlay || !left || !right || !msg) return;

  const shelfItems = Object.values(readShelfState())
    .map((item) => normalizeShelfEntry(item))
    .filter((item) => item?.name);
  const historyItems = readHistoryListSafe()
    .filter((item) => item?.name)
    .map((item) => ({ name: cleanPreferenceText(item.name, 140), updatedAt: item.updatedAt || item.date || '' }));

  const merged = [...shelfItems, ...historyItems];
  const seen = new Set();
  const layeringItems = merged
    .filter((item) => item?.name)
    .filter((item) => {
      const key = normalizeScentKey(item.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, 160);

  const options = layeringItems.map((item) => `<option value="${safeText(item.name)}">${safeText(item.name)}</option>`).join('');
  left.innerHTML = `<option value="">Sec...</option>${options}`;
  right.innerHTML = `<option value="">Sec...</option>${options}`;
  if (currentResultData?.name) {
    left.value = currentResultData.name;
  }
  msg.textContent = layeringItems.length < 2 ? 'Layering Lab icin en az 2 analiz veya dolap kaydi gerekli.' : '';
  overlay.style.display = 'flex';
}

function closeLayeringLabOverlay(fromBackdrop = false) {
  const overlay = document.getElementById('layering-lab-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  emitEvent('layering_overlay_closed', { source: fromBackdrop ? 'backdrop' : 'action' });
}

function getShelfProfileForLayering(perfumeName) {
  const snapshot = typeof findResultSnapshotByName === 'function'
    ? findResultSnapshotByName(perfumeName)
    : null;
  if (!snapshot || typeof snapshot !== 'object') return null;

  const profile = {
    name: cleanPreferenceText(snapshot.name || perfumeName, 140),
    family: cleanPreferenceText(snapshot.family || '', 48),
    occasion: cleanPreferenceText(snapshot.occasion || '', 48),
    season: Array.isArray(snapshot.season) ? snapshot.season.slice(0, 4) : [],
    pyramid: snapshot.pyramid && typeof snapshot.pyramid === 'object'
      ? {
          top: Array.isArray(snapshot.pyramid.top) ? snapshot.pyramid.top.slice(0, 8) : [],
          middle: Array.isArray(snapshot.pyramid.middle) ? snapshot.pyramid.middle.slice(0, 8) : [],
          base: Array.isArray(snapshot.pyramid.base) ? snapshot.pyramid.base.slice(0, 8) : [],
        }
      : null,
    molecules: Array.isArray(snapshot.molecules) ? snapshot.molecules.slice(0, 6) : [],
  };

  if (!profile.pyramid || (!profile.pyramid.top.length && !profile.pyramid.middle.length && !profile.pyramid.base.length)) {
    return null;
  }
  return profile;
}

async function runLayeringLab() {
  const left = document.getElementById('layering-left');
  const right = document.getElementById('layering-right');
  const msg = document.getElementById('layering-lab-msg');
  if (!left || !right || !msg) return;
  const leftName = cleanPreferenceText(left.value, 140);
  const rightName = cleanPreferenceText(right.value, 140);
  if (!leftName || !rightName) {
    msg.textContent = 'Iki parfum secmelisin.';
    return;
  }
  if (leftName === rightName) {
    msg.textContent = 'Ayni parfumu iki kez secemezsin.';
    return;
  }

  msg.textContent = 'Layering AI hesapliyor...';
  try {
    const leftProfile = getShelfProfileForLayering(leftName);
    const rightProfile = getShelfProfileForLayering(rightName);
    const data = await window.KokuLabs?.runLayeringLab?.(leftName, rightName, {
      leftProfile,
      rightProfile,
    });
    if (!data?.result) {
      msg.textContent = 'Layering sonucu olusturulamadi.';
      return;
    }
    closeLayeringLabOverlay();
    pushFeedEvent('layering_run', { perfume: `${leftName} + ${rightName}` });
    emitEvent('layering_lab_run', {
      left: cleanPreferenceText(leftName, 60),
      right: cleanPreferenceText(rightName, 60),
    });
    await showResult(data.result, false, false);
  } catch (error) {
    msg.textContent = cleanPreferenceText(error?.message || 'Layering Lab hatasi', 130);
  }
}

function renderFinderResultListV2(container, list) {
  if (!container) return;
  container.innerHTML = (Array.isArray(list) ? list : []).map((item) => {
    const encodedName = encodeURIComponent(cleanPreferenceText(item?.name || '', 140));
    return `
      <button class="history-item finder-item-btn" type="button" data-finder-name="${encodedName}">
        <div class="history-item-info">
          <div class="history-item-badge">${safeText(item.score)}/100</div>
          <div class="history-item-name">${safeText(item.name)}</div>
          <div class="history-item-date">${safeText(item.family || '')} • tatlilik ${safeText(item.sweetness)}</div>
        </div>
      </button>
    `;
  }).join('');
  container.querySelectorAll('.finder-item-btn').forEach((node) => {
    node.addEventListener('click', () => {
      const encoded = cleanPreferenceText(node.getAttribute('data-finder-name') || '', 260);
      if (!encoded) return;
      try {
        pickFinderResult(decodeURIComponent(encoded));
      } catch {
        pickFinderResult(encoded);
      }
    });
  });
}

function runLocalFinderFallbackV2(includeRaw, excludeRaw, maxSweetness) {
  const include = parseNoteListInput(includeRaw || '');
  const exclude = parseNoteListInput(excludeRaw || '');
  const maxSweet = Number.isFinite(Number(maxSweetness)) ? Number(maxSweetness) : 65;
  const history = readHistoryListSafe().filter((item) => item?.name);
  if (!history.length || !include.length) return [];

  const scored = history.map((item) => {
    const notes = getCompareDisplayNotes(item).map((note) => normalizeScentKey(note));
    const includeHits = include.filter((note) => notes.includes(normalizeScentKey(note))).length;
    const excludeHits = exclude.filter((note) => notes.includes(normalizeScentKey(note))).length;
    const sweetness = Number(item?.scores?.sweetness || 50);
    const sweetDistance = Math.abs(sweetness - maxSweet);
    const sweetFit = Math.max(0, 1 - (sweetDistance / 100));
    const sweetnessPenalty = sweetness > maxSweet ? (sweetness - maxSweet) / 100 : 0;
    const noteDensity = Math.min(1, notes.length / 8);
    const includeRatio = includeHits / Math.max(1, include.length);
    const includeDepth = includeHits / Math.max(1, Math.min(include.length, 4));
    const score = Math.max(0, Math.round(
      (includeRatio * 58)
      + (includeDepth * 14)
      + (sweetFit * 20)
      + (noteDensity * 6)
      - (excludeHits * 14)
      - (sweetnessPenalty * 36),
    ));
    return {
      name: cleanPreferenceText(item.name, 140),
      family: cleanPreferenceText(item.family || '', 40),
      sweetness: Math.max(0, Math.min(100, Math.round(sweetness))),
      sweetnessDistance: Math.round(sweetDistance),
      score,
    };
  });

  return scored
    .filter((item) => item.score > 16)
    .sort((a, b) => (
      b.score - a.score
      || a.sweetnessDistance - b.sweetnessDistance
      || a.name.localeCompare(b.name)
    ))
    .slice(0, 8);
}

async function runPerfumeFinderV2() {
  const includeInput = document.getElementById('finder-include');
  const excludeInput = document.getElementById('finder-exclude');
  const sweetnessInput = document.getElementById('finder-sweetness');
  const msg = document.getElementById('finder-msg');
  const results = document.getElementById('finder-results');
  if (!includeInput || !excludeInput || !sweetnessInput || !msg || !results) return;

  const include = includeInput.value.trim();
  const exclude = excludeInput.value.trim();
  const maxSweetness = Number(sweetnessInput.value || 65);
  if (!include) {
    msg.textContent = 'En az bir include note girmelisin.';
    return;
  }

  msg.textContent = 'Finder calisiyor...';
  results.innerHTML = '';
  try {
    const data = await window.KokuLabs?.runFinder?.({
      includeNotes: include,
      excludeNotes: exclude,
      maxSweetness,
      targetSweetness: maxSweetness,
      limit: 8,
    });
    const list = Array.isArray(data?.candidates) ? data.candidates : [];
    if (list.length) {
      msg.textContent = data?.fallbackApplied
        ? `${list.length} yakin aday bulundu (esnek arama modu).`
        : `${list.length} aday bulundu.`;
      renderFinderResultListV2(results, list);
      pushFeedEvent('finder_run', { detail: `${include}` });
      emitEvent('finder_run', { include_count: String(include.split(',').length) });
      return;
    }
  } catch {
    // fall through to local fallback
  }

  const localFallback = runLocalFinderFallbackV2(include, exclude, maxSweetness);
  if (!localFallback.length) {
    msg.textContent = 'Bu filtrede birebir sonuc bulunamadi. Notalari biraz genisletip tekrar dene.';
    return;
  }
  msg.textContent = `${localFallback.length} aday bulundu (yerel fallback).`;
  renderFinderResultListV2(results, localFallback);
}

function buildHeuristicLayerProfileV2(name) {
  const cleanName = cleanPreferenceText(name, 140);
  if (!cleanName) return null;
  const lowered = normalizeScentKey(cleanName);
  const notes = [];
  const add = (keys, note) => {
    if (keys.some((key) => lowered.includes(normalizeScentKey(key)))) notes.push(note);
  };

  add(['oud', 'odun', 'wood', 'sedir', 'sandal'], 'cedar');
  add(['vanilla', 'vanilya', 'tonka', 'amber'], 'vanilla');
  add(['rose', 'gul', 'yasemin', 'jasmine', 'floral'], 'rose');
  add(['fresh', 'aqua', 'marine', 'citrus', 'bergamot', 'limon'], 'bergamot');
  add(['smoke', 'fire', 'tabacco', 'tobacco', 'spice'], 'patchouli');
  add(['musk', 'misk', 'clean'], 'musk');

  const unique = [...new Set(notes)].slice(0, 6);
  if (!unique.length) unique.push('bergamot', 'lavender', 'amber');

  return {
    name: cleanName,
    family: 'Aromatik',
    occasion: 'Gunluk',
    season: ['Sonbahar', 'Kis'],
    pyramid: {
      top: unique.slice(0, 2),
      middle: unique.slice(2, 4).length ? unique.slice(2, 4) : ['lavender'],
      base: unique.slice(4, 6).length ? unique.slice(4, 6) : ['amber'],
    },
    molecules: [],
  };
}

function openLayeringLabOverlayV2() {
  const overlay = document.getElementById('layering-lab-overlay');
  const left = document.getElementById('layering-left');
  const right = document.getElementById('layering-right');
  const msg = document.getElementById('layering-lab-msg');
  if (!overlay || !left || !right || !msg) return;

  const shelfItems = Object.values(readShelfState())
    .map((item) => normalizeShelfEntry(item))
    .filter((item) => item?.name);
  const historyItems = readHistoryListSafe()
    .filter((item) => item?.name)
    .map((item) => ({ name: cleanPreferenceText(item.name, 140), updatedAt: item.updatedAt || item.date || '' }));

  const merged = [...shelfItems, ...historyItems];
  const seen = new Set();
  const layeringItems = merged
    .filter((item) => item?.name)
    .map((item) => ({ ...item, profile: getShelfProfileForLayering(item.name) || buildHeuristicLayerProfileV2(item.name) }))
    .filter((item) => Boolean(item.profile))
    .filter((item) => {
      const key = normalizeScentKey(item.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, 160);

  const options = layeringItems.map((item) => `<option value="${safeText(item.name)}">${safeText(item.name)}</option>`).join('');
  left.innerHTML = `<option value="">Sec...</option>${options}`;
  right.innerHTML = `<option value="">Sec...</option>${options}`;
  if (currentResultData?.name) {
    left.value = currentResultData.name;
  }
  msg.textContent = layeringItems.length < 2
    ? 'Katmanlama icin en az 2 analiz kaydi gerekli. Once ustteki "Kokuyu Analiz Et" adimiyla dolabini genislet.'
    : '';
  overlay.style.display = 'flex';
}

async function runLayeringLabV2() {
  const left = document.getElementById('layering-left');
  const right = document.getElementById('layering-right');
  const msg = document.getElementById('layering-lab-msg');
  if (!left || !right || !msg) return;
  const leftName = cleanPreferenceText(left.value, 140);
  const rightName = cleanPreferenceText(right.value, 140);
  if (!leftName || !rightName) {
    msg.textContent = 'Iki parfum secmelisin.';
    return;
  }
  if (leftName === rightName) {
    msg.textContent = 'Ayni parfumu iki kez secemezsin.';
    return;
  }

  msg.textContent = 'Layering AI hesapliyor...';
  try {
    const leftProfile = getShelfProfileForLayering(leftName) || buildHeuristicLayerProfileV2(leftName);
    const rightProfile = getShelfProfileForLayering(rightName) || buildHeuristicLayerProfileV2(rightName);
    const data = await window.KokuLabs?.runLayeringLab?.(leftName, rightName, {
      leftProfile,
      rightProfile,
    });
    if (!data?.result) {
      msg.textContent = 'Layering sonucu olusturulamadi.';
      return;
    }
    closeLayeringLabOverlay();
    pushFeedEvent('layering_run', { perfume: `${leftName} + ${rightName}` });
    emitEvent('layering_lab_run', {
      left: cleanPreferenceText(leftName, 60),
      right: cleanPreferenceText(rightName, 60),
    });
    await showResult(data.result, false, false);
  } catch (error) {
    msg.textContent = cleanPreferenceText(error?.message || 'Layering Lab hatasi', 130);
  }
}

window.KokuLabsOverlays = {
  openBarcodeOverlay,
  closeBarcodeOverlay,
  submitBarcodeManual,
  openFinderOverlay,
  closeFinderOverlay,
  runPerfumeFinder: runPerfumeFinderV2,
  pickFinderResult,
  openLayeringLabOverlay: openLayeringLabOverlayV2,
  closeLayeringLabOverlay,
  runLayeringLab: runLayeringLabV2,
};

window.KokuLabsOverlaysLoaded = true;
