(function initKokuIcons(global) {
  const ICONS = {
    signature: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 5.5L12 3l5 2.5v5L12 13l-5-2.5z"/>
        <path d="M7 13.5L12 11l5 2.5v5L12 21l-5-2.5z" opacity="0.65"/>
        <circle cx="12" cy="12" r="1.4"/>
      </svg>
    `,
    floral: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="2.2"/>
        <circle cx="12" cy="7.4" r="2"/>
        <circle cx="16.2" cy="9.3" r="2"/>
        <circle cx="15.6" cy="14.1" r="2"/>
        <circle cx="8.4" cy="14.1" r="2"/>
        <circle cx="7.8" cy="9.3" r="2"/>
      </svg>
    `,
    citrus: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="7"/>
        <path d="M12 5v14M5 12h14M7.8 7.8l8.4 8.4M16.2 7.8l-8.4 8.4" opacity="0.75"/>
      </svg>
    `,
    aquatic: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 13c1.4 1 2.8 1.5 4.2 1.5S10 14 11.4 13c1.4-1 2.8-1.5 4.2-1.5S18.4 12 19.8 13c.4.3.8.5 1.2.7"/>
        <path d="M3 17c1.4 1 2.8 1.5 4.2 1.5S10 18 11.4 17c1.4-1 2.8-1.5 4.2-1.5S18.4 16 19.8 17c.4.3.8.5 1.2.7" opacity="0.72"/>
        <path d="M9 8.5c0-1.8 1.3-3.3 3-3.6 1.7.3 3 1.8 3 3.6 0 1.2-.6 2.2-1.5 2.9-.6.5-1 .9-1.5 1.8-.5-.9-.9-1.3-1.5-1.8A3.6 3.6 0 0 1 9 8.5z"/>
      </svg>
    `,
    herb: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 17c4.3 0 7.8-3.4 7.8-7.7v-2"/>
        <path d="M7 17c0-4.8 3.7-8.7 8.4-8.7h1.6"/>
        <path d="M7 17l-2.2 2.3" opacity="0.65"/>
      </svg>
    `,
    fruit: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8.5 9.5c0-2.6 1.8-4.5 4.4-4.5s4.6 1.9 4.6 4.5"/>
        <path d="M6 12.3c0-2.2 1.8-4 4-4h4c2.2 0 4 1.8 4 4V15c0 3.1-2.5 5.7-5.7 5.7h-.6A5.7 5.7 0 0 1 6 15z"/>
        <path d="M11.5 5.2c.5-1.5 1.6-2.5 3.4-2.9" opacity="0.7"/>
      </svg>
    `,
    gourmand: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 10.2h10v2.2c0 4-2.4 6.6-5 6.6s-5-2.6-5-6.6z"/>
        <path d="M6.5 10.2h11M9 7.4c0-1.3 1-2.3 2.3-2.3h1.4c1.3 0 2.3 1 2.3 2.3" opacity="0.74"/>
        <path d="M8.8 14h6.4" opacity="0.68"/>
      </svg>
    `,
    woody: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20V8"/>
        <path d="M12 8c0-2.8 2.1-5 4.7-5h.3v.3c0 3.1-2.5 5.7-5.7 5.7z"/>
        <path d="M12 11c0-2.3-1.8-4.1-4.1-4.1H7.7v.2c0 2.4 1.9 4.4 4.3 4.4z"/>
        <path d="M12 14c0-2.2 1.7-4 3.9-4h.2v.2c0 2.3-1.8 4.2-4.1 4.2z" opacity="0.72"/>
      </svg>
    `,
    amber: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8.6 5.4h6.8l2.4 4.2-5.8 10h-0.2l-5.8-10z"/>
        <path d="M8.6 5.4L12 9.8l3.4-4.4" opacity="0.75"/>
        <path d="M6.2 9.6h11.6" opacity="0.72"/>
      </svg>
    `,
    spicy: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 20.2c-2.7 0-4.7-2-4.7-4.8 0-4.3 3.5-7.6 6.5-10.4 2.2 2 4.9 4.6 4.9 8 0 4-2.7 7.2-6.7 7.2z"/>
        <path d="M14.2 3.8c1.4 1 2.2 2.1 2.4 3.6" opacity="0.68"/>
      </svg>
    `,
    leather: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 6.5h12l1 4.6-1 6.4H6l-1-6.4z"/>
        <path d="M8.4 9.4h7.2M8.4 13h7.2" opacity="0.72"/>
      </svg>
    `,
    fresh: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3.6c2.4 3.2 4.7 5.8 4.7 8.9 0 3-2.1 5-4.7 5s-4.7-2-4.7-5c0-3.1 2.3-5.7 4.7-8.9z"/>
        <path d="M12 11.1v8.2" opacity="0.68"/>
      </svg>
    `,
    moss: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 15.5c1.6-2.4 3.9-3.7 6.9-3.9 3.1-.2 5.6-1.5 7.1-3.8"/>
        <path d="M7 20c2.3-1.7 5.1-2.4 8.4-2.2" opacity="0.72"/>
      </svg>
    `,
    aromatic: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20V6"/>
        <path d="M7.5 10.5c1.8.7 3 .2 4.5-1.1"/>
        <path d="M16.5 13.5c-1.8.7-3 .2-4.5-1.1" opacity="0.78"/>
        <path d="M9.2 6.2c0-1.4 1.1-2.5 2.5-2.5h.6" opacity="0.7"/>
      </svg>
    `,
    blocked: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="7.2"/>
        <path d="M7.2 16.8l9.6-9.6"/>
      </svg>
    `,
    profile: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="3.5"/>
        <path d="M5 19c1.3-3 3.7-4.5 7-4.5s5.7 1.5 7 4.5"/>
      </svg>
    `,
    lens: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="6.5"/>
        <path d="M16 16l4.2 4.2"/>
      </svg>
    `,
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

  const TOKEN_ALIASES = {
    bubble: 'signature',
    magnolia: 'floral',
    sakura: 'floral',
    jasmine: 'floral',
    rose: 'floral',
    orange: 'citrus',
    pineapple: 'fruit',
    apple: 'fruit',
    blackcurrant: 'fruit',
    boozy: 'gourmand',
    heat: 'spicy',
    gender: 'gender',
    age: 'age',
    vibe: 'vibe',
    occasion: 'occasion',
    season: 'season',
  };

  function cleanToken(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '');
  }

  function normalizeToken(value) {
    const token = cleanToken(value);
    if (ICONS[token]) return token;
    const mapped = TOKEN_ALIASES[token];
    if (mapped && ICONS[mapped]) return mapped;
    return 'signature';
  }

  function svg(token) {
    const key = normalizeToken(token);
    return ICONS[key] || ICONS.signature;
  }

  function markup(token, className = 'ui-icon') {
    const key = normalizeToken(token);
    return `<span class="${className}" data-icon="${key}" aria-hidden="true">${svg(key)}</span>`;
  }

  global.KokuIcons = {
    normalizeToken,
    svg,
    markup,
  };
})(window);
