(function initKokuOfficialLinks(global) {
  function cleanString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeLookup(value) {
    return cleanString(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  const OFFICIAL_PRODUCT_PAGES = {
    'dior sauvage eau de parfum': 'https://www.dior.com/en_us/beauty/fragrance/mens-fragrance/sauvage',
    'dior sauvage': 'https://www.dior.com/en_us/beauty/fragrance/mens-fragrance/sauvage',
    'sauvage': 'https://www.dior.com/en_us/beauty/fragrance/mens-fragrance/sauvage',
    'bleu de chanel eau de parfum': 'https://www.chanel.com/us/fragrance/p/107350/bleu-de-chanel-eau-de-parfum-spray/',
    'bleu de chanel': 'https://www.chanel.com/us/fragrance/p/107350/bleu-de-chanel-eau-de-parfum-spray/',
    'baccarat rouge 540 eau de parfum': 'https://www.franciskurkdjian.com/int-en/p/baccarat-rouge-540-eau-de-parfum-RA12231.html',
    'baccarat rouge 540': 'https://www.franciskurkdjian.com/int-en/p/baccarat-rouge-540-eau-de-parfum-RA12231.html',
    'mfk baccarat rouge 540': 'https://www.franciskurkdjian.com/int-en/p/baccarat-rouge-540-eau-de-parfum-RA12231.html',
    'libre eau de parfum': 'https://www.yslbeautyus.com/refillable-fragrance/libre-eau-de-parfum/3614273941136.html',
    'ysl libre': 'https://www.yslbeautyus.com/refillable-fragrance/libre-eau-de-parfum/3614273941136.html',
    'creed aventus': 'https://creedboutique.com/products/aventus-perfumed-soap',
    'dior homme intense': 'https://www.dior.com/en_int/beauty/products/dior-homme-intense-Y0479201.html',
    'chanel no 5': 'https://www.chanel.com/il-en/fragrance/p/125530/n5-eau-de-parfum-spray/',
    'n5 eau de parfum': 'https://www.chanel.com/il-en/fragrance/p/125530/n5-eau-de-parfum-spray/',
    'tom ford black orchid': 'https://www.tomfordbeauty.com/product/black-orchid-all-over-body-spray',
    'black orchid eau de parfum': 'https://www.tomfordbeauty.com/product/black-orchid-all-over-body-spray',
    'acqua di gio eau de parfum': 'https://www.giorgioarmanibeauty-usa.com/fragrances/mens-cologne/acqua-di-gio-eau-de-parfum----refillable/ww-00631-arm.html',
    'acqua di gio': 'https://www.giorgioarmanibeauty-usa.com/fragrances/mens-cologne/acqua-di-gio-eau-de-parfum----refillable/ww-00631-arm.html',
  };

  const STORE_PROVIDERS = [
    {
      id: 'sephora-tr',
      label: 'Sephora',
      buildUrl: (query) => `https://www.sephora.com.tr/search?text=${encodeURIComponent(query)}`,
    },
    {
      id: 'beymen',
      label: 'Beymen',
      buildUrl: (query) => `https://www.beymen.com/tr/search?q=${encodeURIComponent(query)}`,
    },
    {
      id: 'boyner',
      label: 'Boyner',
      buildUrl: (query) => `https://www.boyner.com.tr/arama?q=${encodeURIComponent(query)}`,
    },
    {
      id: 'trendyol',
      label: 'Trendyol',
      buildUrl: (query) => `https://www.trendyol.com/sr?q=${encodeURIComponent(query)}`,
    },
  ];

  function getProductUrl(perfumeName) {
    const lookup = normalizeLookup(perfumeName);
    if (!lookup) return null;
    if (OFFICIAL_PRODUCT_PAGES[lookup]) return OFFICIAL_PRODUCT_PAGES[lookup];
    for (const [alias, url] of Object.entries(OFFICIAL_PRODUCT_PAGES)) {
      if (lookup.includes(alias) || alias.includes(lookup)) return url;
    }
    return null;
  }

  function getStoreLinks(perfumeName) {
    const cleanName = cleanString(perfumeName).slice(0, 140);
    if (!cleanName) return [];
    return STORE_PROVIDERS.map((provider) => ({
      id: provider.id,
      label: provider.label,
      url: provider.buildUrl(cleanName),
      kind: 'search',
    }));
  }

  global.KokuOfficialLinks = {
    getProductUrl,
    getStoreLinks,
  };
})(window);
