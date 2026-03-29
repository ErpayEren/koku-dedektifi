(function initKokuEmoji(global) {
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

  const ICON_TOKEN = {
    signature: 'signature',
    floral: 'floral',
    citrus: 'citrus',
    aquatic: 'aquatic',
    herb: 'herb',
    fruit: 'fruit',
    gourmand: 'gourmand',
    woody: 'woody',
    amber: 'amber',
    spicy: 'spicy',
    leather: 'leather',
    fresh: 'fresh',
    moss: 'moss',
    aromatic: 'aromatic',
  };

  const NOTE_ICON_RULES = [
    { keys: ['magnolia', 'manolya', 'sakura', 'cherry blossom', 'jasmine', 'yasemin', 'rose', 'gul', 'lavender', 'lavanta', 'iris', 'orris'], icon: ICON_TOKEN.floral },
    { keys: ['bergamot', 'lemon', 'limon', 'citrus', 'narenciye', 'mandarin', 'portakal', 'orange', 'grapefruit', 'greyfurt'], icon: ICON_TOKEN.citrus },
    { keys: ['marine', 'aquatic', 'deniz', 'ozonic'], icon: ICON_TOKEN.aquatic },
    { keys: ['mint', 'nane', 'sage', 'ada cayi'], icon: ICON_TOKEN.herb },
    { keys: ['pineapple', 'ananas', 'apple', 'elma', 'plum', 'erik', 'blackcurrant', 'cassis'], icon: ICON_TOKEN.fruit },
    { keys: ['vanilla', 'vanilya', 'tonka', 'caramel', 'karamel', 'praline', 'chocolate', 'cacao', 'coffee', 'kahve', 'whisky', 'cognac', 'rum', 'rom'], icon: ICON_TOKEN.gourmand },
    { keys: ['oud', 'agarwood', 'patchouli', 'cedar', 'sedir', 'sandal', 'vetiver', 'oakmoss'], icon: ICON_TOKEN.woody },
    { keys: ['amber', 'ambroxan', 'ambergris', 'musk', 'misk'], icon: ICON_TOKEN.amber },
    { keys: ['saffron', 'safran', 'pepper', 'biber', 'clove', 'karanfil', 'spice', 'baharat'], icon: ICON_TOKEN.spicy },
    { keys: ['tobacco', 'leder', 'leather', 'suede'], icon: ICON_TOKEN.leather },
  ];

  const FAMILY_ICON_MAP = {
    ciceksi: ICON_TOKEN.floral,
    odunsu: ICON_TOKEN.woody,
    oryantal: ICON_TOKEN.spicy,
    taze: ICON_TOKEN.fresh,
    fougere: ICON_TOKEN.herb,
    chypre: ICON_TOKEN.moss,
    gourmand: ICON_TOKEN.gourmand,
    aromatik: ICON_TOKEN.aromatic,
  };

  function collectNotes(resultLike) {
    const notes = [];
    const src = resultLike && typeof resultLike === 'object' ? resultLike : {};
    ['top', 'middle', 'base'].forEach((layer) => {
      const layerNotes = Array.isArray(src?.pyramid?.[layer]) ? src.pyramid[layer] : [];
      layerNotes.forEach((note) => {
        const normalized = normalizeText(note);
        if (normalized) notes.push(normalized);
      });
    });
    (Array.isArray(src?.noteOntology?.mapped) ? src.noteOntology.mapped : []).forEach((entry) => {
      const canonical = normalizeText(entry?.canonical);
      const display = normalizeText(entry?.display);
      if (canonical) notes.push(canonical);
      if (display) notes.push(display);
    });
    return Array.from(new Set(notes));
  }

  function resolveByNotes(resultLike) {
    const notes = collectNotes(resultLike);
    if (!notes.length) return null;

    for (const rule of NOTE_ICON_RULES) {
      for (const key of rule.keys) {
        const normalizedKey = normalizeText(key);
        if (!normalizedKey) continue;
        if (notes.some((note) => note.includes(normalizedKey))) return rule.icon;
      }
    }
    return null;
  }

  function resolveByFamily(resultLike) {
    const family = normalizeText(resultLike?.family || '');
    if (!family) return '';
    return FAMILY_ICON_MAP[family] || '';
  }

  function resolve(resultLike) {
    const noteIcon = resolveByNotes(resultLike);
    if (noteIcon) return noteIcon;

    const familyIcon = resolveByFamily(resultLike);
    if (familyIcon) return familyIcon;

    const raw = normalizeText(resultLike?.emoji || resultLike?.iconToken || '');
    if (raw && ICON_TOKEN[raw]) return ICON_TOKEN[raw];
    return ICON_TOKEN.signature;
  }

  global.KokuEmoji = { resolve };
})(window);
