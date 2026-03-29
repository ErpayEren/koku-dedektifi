/* Koku App Module: advisor */
let advisorHistory = [];
let suggestedPerfumes = [];

function toggleAdvisor() {
  const overlay = document.getElementById('advisor-overlay');
  const isOpen = overlay.style.display !== 'none';
  overlay.style.display = isOpen ? 'none' : 'flex';
  emitEvent(isOpen ? 'advisor_closed' : 'advisor_opened');
  if (isOpen) {
    advisorHistory = [];
    suggestedPerfumes = [];
    const msgs = document.getElementById('advisor-messages');
    if (msgs) msgs.innerHTML = `<div class="advisor-msg bot">Hedefi net yaz, en iyi secenekleri cikarayim.
      <div class="advisor-chips">
        <button class="advisor-chip" onclick="chipSend('1000-2000 TL araliginda, ofiste rahatsiz etmeyen ama kalici bir imza koku oner.')">Ofis + Kalici</button>
        <button class="advisor-chip" onclick="chipSend('Yaz icin ferah, temiz ve gunluk kullanima uygun 3 secenek oner.')">Yazlik Ferah</button>
        <button class="advisor-chip" onclick="chipSend('Dior Sauvage benzer profilinde ama daha uygun fiyatli 3 alternatif bul.')">Sauvage Benzer Profil</button>
        <button class="advisor-chip" onclick="chipSend('Aksam icin daha cekici ve iz birakan 3 parfum oner.')">Aksam Rotasi</button>
      </div></div>`;
  } else {
    setTimeout(() => document.getElementById('advisor-input')?.focus(), 300);
  }
}

function advisorKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAdvisorMessage();
  }
}

function chipSend(text) {
  document.querySelectorAll('.advisor-chip').forEach(c => c.disabled = true);
  sendAdvisorMessage(text);
}

function extractChips(reply) {
  const r = reply.toLowerCase();

  if (/bütçe\s*(nedir|ne kadar|ne|var mı|\?)|kaç tl|fiyat aralığ/i.test(reply)) {
    return ['300 TL altı', '300–800 TL', '800–2000 TL', '2000–5000 TL'];
  }
  if (/ortam|ne zaman|nerede kullan|hangi ortam/i.test(reply)) {
    return ['🌸 Günlük', '👔 İş', '🌙 Gece/özel', '🔥 Romantik'];
  }
  if (/koku (tercihin|ailen|profil)|hangi koku|ne tür koku|nasıl bir koku/i.test(reply)) {
    return ['🍋 Taze/narenciye', '🌸 Çiçeksi', '🍫 Tatlı/gourmand', '🌲 Odunsu/derin'];
  }
  if (/hangisini|hangi seçenek|devam|başka öneri/i.test(reply)) {
    return ['Devam et', 'Başka öneriler', 'Daha uygun fiyatlı', 'Farklı koku ailesi'];
  }
  return [];
}

async function sendAdvisorMessage(msgOverride) {
  const input = document.getElementById('advisor-input');
  const text = (msgOverride || input.value).trim();
  if (!text) return;

  if (!msgOverride) input.value = '';
  addAdvisorMsg('user', text);
  emitEvent('advisor_message_sent', { len: String(text.length) });
  const loading = addAdvisorMsg('loading', 'Düşünüyorum…');

  advisorHistory.push({ role: 'user', content: text });

  const noRepeat = suggestedPerfumes.length > 0
    ? `\n\nBU KONUŞMADA ZATEN ÖNERİLMİŞ (TEKRAR ÖNERME): ${suggestedPerfumes.join(', ')}`
    : '';

  const profilePromptExtra = buildProfilePromptExtra('advisor');
  const promptExtra = mergePromptExtras([noRepeat, profilePromptExtra]);

  try {
    if (profilePromptExtra) emitEvent('advisor_personalized_request');
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promptType: 'advisor',
        promptExtra,
        messages: advisorHistory.slice(-18),
        useWebSearch: true
      })
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const waitSec = retryAfter ? parseInt(retryAfter) : 60;
      loading.remove();
      addAdvisorMsg('bot', `⏳ Çok hızlı mesaj gönderiyorsun. ${waitSec} saniye bekle ve tekrar dene.`);
      advisorHistory.pop(); 
      return;
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || data.error);

    const reply = data.content?.map(b => b.text || '').join('') || '—';
    const provider = res.headers.get('X-AI-Provider') || 'ai';
    const ragMeta = data?.annotations?.rag || null;
    const sources = extractAdvisorSources(data.annotations);
    const grounded = (data.annotations?.groundingChunks?.length || 0) > 0
      || (data.annotations?.webSearchQueries?.length || 0) > 0;
    const ragEnabled = ragMeta?.enabled === true;
    advisorHistory.push({ role: 'assistant', content: reply });

    (reply.match(/\*\*([^*]+?)\*\*/g) || []).forEach(m => {
      const name = m.replace(/\*\*/g, '').trim();
      if (!suggestedPerfumes.includes(name)) suggestedPerfumes.push(name);
    });

    if (advisorHistory.length > 18) {
      advisorHistory = advisorHistory.slice(-16);
    }

    loading.remove();
    const botEl = addAdvisorMsg('bot', reply, { provider, grounded, sources, requestedWeb: true, ragEnabled });
    emitEvent('advisor_reply_ok', {
      provider,
      grounded: grounded ? 'yes' : 'no',
      rag: ragEnabled ? 'yes' : 'no',
    });
    recordRetentionEvent('advisor_reply_ok');

    if (/\?/.test(reply)) {
      const chips = extractChips(reply);
      if (chips.length > 0) {
      const chipDiv = document.createElement('div');
      chipDiv.className = 'advisor-chips';
      chips.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'advisor-chip';
        btn.textContent = c;
        btn.addEventListener('click', () => chipSend(c));
        chipDiv.appendChild(btn);
      });
      botEl.appendChild(chipDiv);
      }
    }
  } catch (e) {
    loading.remove();
    advisorHistory.pop(); 
    emitEvent('advisor_reply_error');
    const errMsg = e.message?.includes('fetch') ? 'Baglanti hatasi. Internet baglantini kontrol et.' : 'Bir hata olustu, tekrar dene.';
    addAdvisorMsg('bot', errMsg);
  }
}

function renderAdvisorMarkdown(text) {
  const rendered = String(text || '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
  return typeof DOMPurify !== 'undefined'
    ? DOMPurify.sanitize(rendered, { ALLOWED_TAGS: ['strong','em','br','a'], ALLOWED_ATTR: ['href','target','class','title','rel'] })
    : rendered;
}

function formatProviderLabel(provider) {
  const map = {
    gemini: 'Gemini',
    openrouter: 'OpenRouter',
    anthropic: 'Anthropic',
  };
  return map[String(provider || '').toLowerCase()] || 'AI';
}

function extractAdvisorSources(annotations) {
  const chunks = Array.isArray(annotations?.groundingChunks) ? annotations.groundingChunks : [];
  const ragSources = Array.isArray(annotations?.rag?.sources) ? annotations.rag.sources : [];
  const seen = new Set();
  const sources = [];

  chunks.forEach((chunk) => {
    const web = chunk?.web || chunk?.source || null;
    const url = web?.uri || web?.url || null;
    if (!url || seen.has(url)) return;
    seen.add(url);

    let title = web?.title || '';
    if (!title) {
      try {
        title = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        title = 'Kaynak';
      }
    }

    sources.push({ url, title });
  });

  ragSources.forEach((source) => {
    const url = source?.url || '';
    const key = cleanPreferenceText(url || source?.title || '', 240);
    if (!key || seen.has(key)) return;
    seen.add(key);

    let title = cleanPreferenceText(source?.title || '', 80);
    if (!title && url) {
      try {
        title = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        title = 'RAG kaynak';
      }
    }
    if (!title) title = 'RAG kaynak';

    sources.push({
      url: cleanPreferenceText(url, 220),
      title,
      kind: 'rag',
    });
  });

  return sources.slice(0, 4);
}

function appendAdvisorMeta(container, meta = {}) {
  if (!container) return;

  const labels = [formatProviderLabel(meta.provider)];
  if (meta.grounded) labels.push('Canli Arama');
  if (meta.ragEnabled) labels.push('RAG');
  if (meta.requestedWeb && !meta.grounded) labels.push('Tahmini Fiyat');

  if (labels.length > 0) {
    const metaRow = document.createElement('div');
    metaRow.className = 'advisor-meta';
    labels.forEach(label => {
      const pill = document.createElement('span');
      pill.className = 'advisor-meta-pill';
      pill.textContent = label;
      metaRow.appendChild(pill);
    });
    container.appendChild(metaRow);
  }

  if (Array.isArray(meta.sources) && meta.sources.length > 0) {
    const sourcesWrap = document.createElement('div');
    sourcesWrap.className = 'advisor-sources';
    meta.sources.forEach((source, index) => {
      const link = document.createElement('a');
      link.className = 'advisor-source-link';
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `${index + 1}. ${source.title}`;
      sourcesWrap.appendChild(link);
    });
    container.appendChild(sourcesWrap);
  }
}

function getBrandSiteUrl(perfumeName) {
  return window.KokuOfficialLinks?.getProductUrl?.(perfumeName) || null;
}

function resolveOfficialProductUrl(result) {
  const sourceTrace = Array.isArray(result?.sourceTrace) ? result.sourceTrace : [];
  const preferred = sourceTrace.find((item) => item?.url && item?.kind === 'official');
  if (preferred?.url) return preferred.url;

  return getBrandSiteUrl(result?.verification?.matchedPerfume || result?.name || '');
}
function makeBuyLinks(text) {
  const perfumePattern = /\*\*([^*]+?)\*\*/g;
  return text.replace(perfumePattern, (match, name) => {
    const officialUrl = getBrandSiteUrl(name);
    
    let links = '';
    if (officialUrl) {
      links += `<a href="${officialUrl}" target="_blank" rel="noopener noreferrer" class="buy-link buy-link-icon" title="Resmi site" aria-label="Resmi site">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="8"></circle>
          <path d="M4 12h16"></path>
          <path d="M12 4a13 13 0 0 1 0 16"></path>
          <path d="M12 4a13 13 0 0 0 0 16"></path>
        </svg>
      </a>`;
    }
    
    return `<strong>${name}</strong>${links ? ' ' + links : ''}`;
  });
}

function addAdvisorMsg(type, text, meta = null) {
  const msgs = document.getElementById('advisor-messages');
  const div = document.createElement('div');
  div.className = `advisor-msg ${type}`;
  if (type === 'bot') {
    const withLinks = makeBuyLinks(text);
    div.innerHTML = typeof DOMPurify !== 'undefined'
      ? DOMPurify.sanitize(renderAdvisorMarkdown(withLinks), {
          ALLOWED_TAGS: ['strong','em','br','a'],
          ALLOWED_ATTR: ['href','target','class','title','rel']
        })
      : renderAdvisorMarkdown(withLinks);
  } else {
    div.textContent = text;
  }
  if (type === 'bot' && meta) appendAdvisorMeta(div, meta);
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

window.KokuAdvisor = {
  toggleAdvisor,
  advisorKeydown,
  chipSend,
  sendAdvisorMessage,
};

window.KokuAdvisorLoaded = true;
