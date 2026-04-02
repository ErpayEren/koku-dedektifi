const { getMoleculeInfo } = require('./molecule-db');
const { EXTENDED_PERFUME_CATALOG } = require('./perfume-catalog-extended');
const {
  buildCanonicalSetFromPyramid,
  buildNoteOntologyV1,
  buildPyramidFromInputNotes,
} = require('../note-ontology');
const { resolvePremiumEmojiForResult } = require('./premium-emoji');

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanString(item)).filter(Boolean);
  }
  const single = cleanString(value);
  return single ? [single] : [];
}

function normalizeText(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function clampConfidence(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeEvidenceLevel(value) {
  const text = cleanString(value).toLowerCase();
  if (text === 'official' || text === 'mapped' || text === 'validated' || text === 'inferred') return text;
  return '';
}

function inferEvidenceMeta(definition) {
  const evidence = cleanString(definition?.evidence || '');
  const explicitLevel = normalizeEvidenceLevel(definition?.evidenceLevel || definition?.evidence_level);
  const explicitReason = cleanString(definition?.evidenceReason || definition?.evidence_reason || '');
  const matchedNotes = toList(definition?.matchedNotes || definition?.matched_notes);
  const explicitConfidence = clampConfidence(definition?.confidence, 0);

  if (explicitLevel) {
    return {
      level: explicitLevel,
      confidence: explicitConfidence || (explicitLevel === 'official' ? 96 : explicitLevel === 'mapped' ? 84 : explicitLevel === 'validated' ? 72 : 62),
      reason: explicitReason || evidence,
      matchedNotes,
    };
  }

  if (/resmi nota izi/i.test(evidence)) {
    return {
      level: 'official',
      confidence: explicitConfidence || 96,
      reason: explicitReason || 'Molekül, resmi nota izi ve katalog referansıyla doğrulandı.',
      matchedNotes,
    };
  }

  if (/nota\s*->\s*molekul esleme/i.test(evidence)) {
    return {
      level: 'mapped',
      confidence: explicitConfidence || 84,
      reason: explicitReason || evidence,
      matchedNotes,
    };
  }

  if (/yerel veritabani eslesmesi/i.test(evidence)) {
    return {
      level: 'validated',
      confidence: explicitConfidence || 72,
      reason: explicitReason || 'Molekül, yerel veritabanındaki doğrulanmış yapı kaydıyla eşleşti.',
      matchedNotes,
    };
  }

  return {
    level: 'inferred',
    confidence: explicitConfidence || 62,
    reason: explicitReason || evidence || 'Molekül yorumu, kompozisyon sinyallerinden türetildi.',
    matchedNotes,
  };
}

function makeSource(label, url, kind = 'official') {
  return { label, url, kind };
}

const BASE_PERFUME_CATALOG = [
  {
    canonicalName: 'Dior Sauvage Eau de Parfum',
    aliases: ['dior sauvage eau de parfum', 'dior sauvage edp', 'dior sauvage', 'sauvage eau de parfum', 'sauvage edp', 'sauvage'],
    family: 'Aromatik',
    season: ['Sonbahar', 'Kis', 'Ilkbahar'],
    occasion: 'Aksam',
    pyramid: {
      top: ['Calabrian bergamot'],
      middle: ['Lavender', 'Patchouli'],
      base: ['Vanilla accord', 'Ambroxan'],
    },
    representativeMolecules: [
      { name: 'Limonene', note: 'top', contribution: 'bergamot acilisina parlaklik verir', evidence: 'Resmi nota izi' },
      { name: 'Patchouli Alcohol', note: 'middle', contribution: 'patchouli omurgasini destekler', evidence: 'Resmi nota izi' },
      { name: 'Vanillin', note: 'base', contribution: 'vanilya sicakligini kurar', evidence: 'Resmi nota izi' },
      { name: 'Ambroxide', note: 'base', contribution: 'amberimsi derinlik ve iz verir', evidence: 'Resmi nota izi' },
    ],
    sources: [
      makeSource('Dior - Sauvage world', 'https://www.dior.com/en_us/beauty/fragrance/mens-fragrance/sauvage'),
    ],
  },
  {
    canonicalName: 'BLEU DE CHANEL Eau de Parfum',
    aliases: ['bleu de chanel eau de parfum', 'bleu de chanel edp', 'bleu de chanel', 'bdc edp'],
    family: 'Odunsu',
    season: ['Ilkbahar', 'Sonbahar', 'Kis'],
    occasion: 'Gunduz',
    pyramid: {
      top: ['Fresh citrus accord', 'Grapefruit'],
      middle: ['Ambery cedar'],
      base: ['Tonka bean', 'Vanilla', 'Sandalwood'],
    },
    representativeMolecules: [
      { name: 'Limonene', note: 'top', contribution: 'citrus acilisina ferah parlaklik verir', evidence: 'Resmi nota izi' },
      { name: 'Nootkatone', note: 'top', contribution: 'greyfurt benzeri kuru narenciye izi verir', evidence: 'Resmi nota izi' },
      { name: 'Cedrol', note: 'middle', contribution: 'sedir govdesini belirginlestirir', evidence: 'Resmi nota izi' },
      { name: 'Coumarin', note: 'base', contribution: 'tonka sicakligini tasir', evidence: 'Resmi nota izi' },
      { name: 'Alpha-Santalol', note: 'base', contribution: 'sandal agaci derinligi saglar', evidence: 'Resmi nota izi' },
    ],
    sources: [
      makeSource('CHANEL - Bleu de Chanel EDP', 'https://www.chanel.com/us/fragrance/p/107350/bleu-de-chanel-eau-de-parfum-spray/'),
    ],
  },
  {
    canonicalName: 'Baccarat Rouge 540 Eau de Parfum',
    aliases: ['baccarat rouge 540 eau de parfum', 'baccarat rouge 540', 'br540', 'mfk baccarat rouge 540', 'maison francis kurkdjian baccarat rouge 540'],
    family: 'Oryantal',
    season: ['Sonbahar', 'Kis'],
    occasion: 'Gece',
    pyramid: {
      top: ['Saffron'],
      middle: ['Jasmine'],
      base: ['Ambergris accord', 'Cedarwood'],
    },
    representativeMolecules: [
      { name: 'Safranal', note: 'top', contribution: 'safranin metalik ve sicak etkisini verir', evidence: 'Resmi nota izi' },
      { name: 'Hedione', note: 'middle', contribution: 'yasemin etkisini havadar ve isiltli tasir', evidence: 'Resmi nota izi' },
      { name: 'Ambroxide', note: 'base', contribution: 'ambergris benzeri mineral iz kurar', evidence: 'Resmi nota izi' },
      { name: 'Cedrol', note: 'base', contribution: 'taze kesilmis sedir tonunu destekler', evidence: 'Resmi nota izi' },
    ],
    sources: [
      makeSource('Maison Francis Kurkdjian - Baccarat Rouge 540', 'https://www.franciskurkdjian.com/int-en/p/baccarat-rouge-540-eau-de-parfum-RA12231.html'),
      makeSource('Maison Francis Kurkdjian - Baccarat Rouge 540 trio', 'https://www.franciskurkdjian.com/us-en/p/baccarat-rouge-540-eau-de-parfum--scented-body-oil-%3Cbr%3Eand-hair-mist-trio-RA1CM2338.html'),
    ],
  },
  {
    canonicalName: 'LIBRE Eau de Parfum',
    aliases: ['libre eau de parfum', 'ysl libre eau de parfum', 'ysl libre', 'libre edp', 'libre'],
    family: 'Ciceksi',
    season: ['Ilkbahar', 'Sonbahar'],
    occasion: 'Gunduz',
    pyramid: {
      top: ['Lavender essence'],
      middle: ['Orange blossom'],
      base: ['Musk accord', 'Vanilla'],
    },
    representativeMolecules: [
      { name: 'Linalool', note: 'top', contribution: 'lavanta acilisini taze tutar', evidence: 'Resmi nota izi' },
      { name: 'Linalyl Acetate', note: 'top', contribution: 'lavantaya yumusak aromatik akis verir', evidence: 'Resmi nota izi' },
      { name: 'Benzyl Acetate', note: 'middle', contribution: 'portakal cicegi cekirdegini yansitir', evidence: 'Resmi nota izi' },
      { name: 'Galaxolide', note: 'base', contribution: 'misk etkisini yuvarlar', evidence: 'Resmi nota izi' },
      { name: 'Vanillin', note: 'base', contribution: 'sicak vanilya izini tamamlar', evidence: 'Resmi nota izi' },
    ],
    sources: [
      makeSource('YSL Beauty - Libre Eau de Parfum', 'https://www.yslbeautyus.com/refillable-fragrance/libre-eau-de-parfum/3614273941136.html'),
    ],
  },
  {
    canonicalName: 'Creed Aventus',
    aliases: ['creed aventus', 'aventus creed', 'aventus'],
    family: 'Odunsu',
    season: ['Ilkbahar', 'Yaz', 'Sonbahar'],
    occasion: 'Gunduz',
    pyramid: {
      top: ['Lemon', 'Pink pepper', 'Apple', 'Bergamot', 'Blackcurrant'],
      middle: ['Pineapple', 'Jasmine', 'Patchouli'],
      base: ['Birch', 'Ambroxan', 'Cedarwood', 'Oakmoss', 'Musk'],
    },
    representativeMolecules: [
      { name: 'Limonene', note: 'top', contribution: 'narenciye ve bergamot tazeligini acik tutar', evidence: 'Resmi nota izi' },
      { name: 'Nootkatone', note: 'middle', contribution: 'meyvemsi kuru greyfurt-pineapple hissini guclendirir', evidence: 'Resmi nota izi' },
      { name: 'Patchouli Alcohol', note: 'middle', contribution: 'karaktere topraksi derinlik ekler', evidence: 'Resmi nota izi' },
      { name: 'Ambroxide', note: 'base', contribution: 'ambroxan etkisiyle modern yayilim verir', evidence: 'Resmi nota izi' },
      { name: 'Cedrol', note: 'base', contribution: 'sedir bazini dengeler', evidence: 'Resmi nota izi' },
    ],
    sources: [
      makeSource('Creed Boutique - Aventus soap', 'https://creedboutique.com/products/aventus-perfumed-soap'),
      makeSource('Creed Boutique - All fragrances', 'https://creedboutique.com/pages/all-fragrances'),
    ],
  },
  {
    canonicalName: 'Dior Homme Intense',
    aliases: ['dior homme intense', 'dior homme intense edp'],
    family: 'Odunsu',
    season: ['Sonbahar', 'Kis'],
    occasion: 'Aksam',
    pyramid: {
      top: ['Iris'],
      middle: ['Ambery facet'],
      base: ['Precious woods'],
    },
    representativeMolecules: [
      { name: 'Irone', note: 'top', contribution: 'iris dokusunu pudramsi ve luks kilar', evidence: 'Resmi nota izi' },
      { name: 'Methyl Ionone', note: 'top', contribution: 'meneksemsi iris etkisini destekler', evidence: 'Resmi nota izi' },
      { name: 'Ambroxide', note: 'middle', contribution: 'amberimsi sicakligi tasir', evidence: 'Resmi nota izi' },
      { name: 'Cedrol', note: 'base', contribution: 'odunsu izi kalinlastirir', evidence: 'Resmi nota izi' },
    ],
    sources: [
      makeSource('Dior - Dior Homme Intense', 'https://www.dior.com/en_int/beauty/products/dior-homme-intense-Y0479201.html'),
    ],
  },
  {
    canonicalName: 'N°5 Eau de Parfum',
    aliases: ['chanel no 5', 'n 5 eau de parfum', 'no 5 eau de parfum', 'numero 5 chanel', 'n5 eau de parfum', 'n5'],
    family: 'Ciceksi',
    season: ['Ilkbahar', 'Sonbahar'],
    occasion: 'Aksam',
    pyramid: {
      top: ['Bright citrus', 'Aldehydes'],
      middle: ['May Rose', 'Jasmine'],
      base: ['Vanilla'],
    },
    representativeMolecules: [
      { name: '2-Methylundecanal', note: 'top', contribution: 'aldehidik acilisi imza gibi parlatir', evidence: 'Resmi nota izi' },
      { name: 'Citral', note: 'top', contribution: 'narenciye isiltisini destekler', evidence: 'Resmi nota izi' },
      { name: 'Phenylethanol', note: 'middle', contribution: 'gul-yasemin yumusakligini tasir', evidence: 'Resmi nota izi' },
      { name: 'Vanillin', note: 'base', contribution: 'duzgun ve duyusal vanilya izi birakir', evidence: 'Resmi nota izi' },
    ],
    sources: [
      makeSource('CHANEL - N°5 Eau de Parfum', 'https://www.chanel.com/il-en/fragrance/p/125530/n5-eau-de-parfum-spray/'),
    ],
  },
  {
    canonicalName: 'TOM FORD Black Orchid Eau de Parfum',
    aliases: ['tom ford black orchid', 'black orchid eau de parfum', 'black orchid edp', 'black orchid'],
    family: 'Oryantal',
    season: ['Sonbahar', 'Kis'],
    occasion: 'Gece',
    pyramid: {
      top: ['Black truffle', 'Ylang ylang'],
      middle: ['Black orchid', 'Black plum'],
      base: ['Rum absolute', 'Patchouli'],
    },
    representativeMolecules: [
      { name: 'Guaiacol', note: 'top', contribution: 'truffle tarafina karanlik ve topraksi bir duman verir', evidence: 'Resmi nota izi' },
      { name: 'Geranyl Acetate', note: 'top', contribution: 'ylang ylang hissine yumusak ciceksi akis verir', evidence: 'Resmi nota izi' },
      { name: 'Benzaldehyde', note: 'middle', contribution: 'eriksi koyu meyve hissini destekler', evidence: 'Resmi nota izi' },
      { name: 'Eugenol', note: 'base', contribution: 'rom ve baharatimsi golgeyi belirginlestirir', evidence: 'Resmi nota izi' },
      { name: 'Patchouli Alcohol', note: 'base', contribution: 'patchouli temelini kurar', evidence: 'Resmi nota izi' },
    ],
    sources: [
      makeSource('TOM FORD - Black Orchid collection', 'https://www.tomfordbeauty.com/product/black-orchid-all-over-body-spray'),
    ],
  },
  {
    canonicalName: 'Acqua di Giò Eau de Parfum',
    aliases: ['acqua di gio eau de parfum', 'acqua di gio edp', 'armani acqua di gio eau de parfum', 'acqua di gio'],
    family: 'Aromatik',
    season: ['Ilkbahar', 'Yaz'],
    occasion: 'Gunduz',
    pyramid: {
      top: ['Marine notes', 'Green mandarin'],
      middle: ['Sage'],
      base: ['Vetiver', 'Patchouli'],
    },
    representativeMolecules: [
      { name: 'Calone', note: 'top', contribution: 'deniz etkisini ozonlu ve ferah bir omurgaya tasir', evidence: 'Resmi nota izi' },
      { name: 'Limonene', note: 'top', contribution: 'mandalina-acilisina taze isik verir', evidence: 'Resmi nota izi' },
      { name: 'Alpha-Terpineol', note: 'middle', contribution: 'sage tarafina yesil-aromatik nefes ekler', evidence: 'Resmi nota izi' },
      { name: 'Vetiverol', note: 'base', contribution: 'vetiver kuru dip izini kurar', evidence: 'Resmi nota izi' },
      { name: 'Patchouli Alcohol', note: 'base', contribution: 'patchouli ile kaliciligi yuvarlar', evidence: 'Resmi nota izi' },
    ],
    sources: [
      makeSource('Armani Beauty - Acqua di Giò EDP', 'https://www.giorgioarmanibeauty-usa.com/fragrances/mens-cologne/acqua-di-gio-eau-de-parfum----refillable/ww-00631-arm.html'),
    ],
  },
];

function normalizeCatalogEntry(entry) {
  const src = entry && typeof entry === 'object' ? entry : {};
  return {
    canonicalName: cleanString(src.canonicalName),
    aliases: toList(src.aliases),
    family: cleanString(src.family) || 'Aromatik',
    season: toList(src.season),
    occasion: cleanString(src.occasion) || 'Gunduz',
    pyramid: normalizePyramid(src.pyramid),
    representativeMolecules: Array.isArray(src.representativeMolecules) ? src.representativeMolecules : [],
    sources: Array.isArray(src.sources) ? src.sources.filter((item) => cleanString(item?.url) || cleanString(item?.label)) : [],
    tags: toList(src.tags),
    priceBand: cleanString(src.priceBand),
  };
}

function mergeCatalog(...groups) {
  const byName = new Map();
  for (const group of groups) {
    for (const item of Array.isArray(group) ? group : []) {
      const normalized = normalizeCatalogEntry(item);
      if (!normalized.canonicalName) continue;
      const key = normalizeText(normalized.canonicalName);
      if (!key) continue;
      if (!byName.has(key)) {
        byName.set(key, normalized);
        continue;
      }
      const prev = byName.get(key);
      byName.set(key, {
        ...prev,
        ...normalized,
        aliases: Array.from(new Set([...(prev.aliases || []), ...(normalized.aliases || [])])),
        season: Array.from(new Set([...(prev.season || []), ...(normalized.season || [])])),
        representativeMolecules: (normalized.representativeMolecules || []).length
          ? normalized.representativeMolecules
          : prev.representativeMolecules,
        pyramid: normalized.pyramid || prev.pyramid,
        sources: [...(prev.sources || []), ...(normalized.sources || [])].slice(0, 6),
        tags: Array.from(new Set([...(prev.tags || []), ...(normalized.tags || [])])),
        priceBand: normalized.priceBand || prev.priceBand || '',
      });
    }
  }

  return Array.from(byName.values());
}

const PERFUME_CATALOG = mergeCatalog(BASE_PERFUME_CATALOG, EXTENDED_PERFUME_CATALOG);

const NOTE_MOLECULE_RULES = [
  { keywords: ['bergamot', 'citrus', 'lemon', 'mandarin', 'orange', 'grapefruit'], molecules: ['Limonene', 'Citral', 'Linalool'] },
  { keywords: ['grapefruit'], molecules: ['Nootkatone', 'Limonene'] },
  { keywords: ['lavender'], molecules: ['Linalool', 'Linalyl Acetate'] },
  { keywords: ['orange blossom', 'neroli'], molecules: ['Benzyl Acetate', 'Linalool', 'Nerolidol'] },
  { keywords: ['jasmine'], molecules: ['Hedione', 'Benzyl Acetate', 'Indole'] },
  { keywords: ['rose'], molecules: ['Phenylethanol', 'Citronellol', 'Geraniol', 'Damascenone'] },
  { keywords: ['iris'], molecules: ['Irone', 'Methyl Ionone', 'Ionone'] },
  { keywords: ['patchouli'], molecules: ['Patchouli Alcohol'] },
  { keywords: ['cedar', 'cedarwood'], molecules: ['Cedrol', 'Cedrene'] },
  { keywords: ['sandalwood', 'sandal'], molecules: ['Alpha-Santalol'] },
  { keywords: ['vanilla'], molecules: ['Vanillin', 'Ethyl Vanillin'] },
  { keywords: ['tonka'], molecules: ['Coumarin'] },
  { keywords: ['musk'], molecules: ['Galaxolide', 'Muscone'] },
  { keywords: ['ambergris', 'amberwood', 'ambroxan', 'amber'], molecules: ['Ambroxide'] },
  { keywords: ['saffron'], molecules: ['Safranal'] },
  { keywords: ['pineapple'], molecules: ['Nootkatone'] },
  { keywords: ['apple'], molecules: ['Hexenol'] },
  { keywords: ['oakmoss', 'moss'], molecules: ['Coumarin'] },
  { keywords: ['ylang'], molecules: ['Geranyl Acetate', 'Linalool'] },
  { keywords: ['truffle', 'smoky', 'birch'], molecules: ['Guaiacol'] },
  { keywords: ['plum', 'almond'], molecules: ['Benzaldehyde'] },
  { keywords: ['rum', 'spice', 'clove'], molecules: ['Eugenol'] },
];

const LEGAL_TEXT_REPLACEMENTS = [
  { pattern: /\bmuadil\b/gi, replacement: 'benzer profil' },
  { pattern: /\bdupe\b/gi, replacement: 'benzer profil' },
  { pattern: /\bklon\b/gi, replacement: 'benzer profil' },
  { pattern: /\b1\s*:\s*1\b/gi, replacement: 'benzer karakter' },
  { pattern: /\bbirebir ayni\b/gi, replacement: 'benzer karakterde' },
  { pattern: /\b(orijinal(inin)?\s+ayni(si)?)\b/gi, replacement: 'orijinale yakin karakterde' },
  { pattern: /\b%?\s*100\s+ayni\b/gi, replacement: 'yaklasik olarak benzer' },
];

const LEGAL_RISKY_PATTERNS = [
  /\bkesin\b.{0,16}\borijinal\b/i,
  /\bresmi\s+ortak\b/i,
  /\byetkili\s+satici\b/i,
  /\bsahteye\s+gerek\s+yok\b/i,
];

function clonePyramid(pyramid) {
  return {
    top: toList(pyramid?.top),
    middle: toList(pyramid?.middle),
    base: toList(pyramid?.base),
  };
}

function normalizePyramid(pyramid) {
  const cloned = clonePyramid(pyramid);
  return (cloned.top.length || cloned.middle.length || cloned.base.length) ? cloned : null;
}

function hydrateMolecule(definition, fallbackNote = 'heart') {
  const name = cleanString(definition?.name || definition);
  if (!name) return null;
  const info = getMoleculeInfo(name);
  if (!info) return null;
  const evidenceMeta = inferEvidenceMeta(definition);
  return {
    name: info.name || name,
    smiles: info.smiles || null,
    formula: info.formula || '',
    family: info.family || '',
    origin: info.origin || '',
    note: cleanString(definition?.note || fallbackNote) || fallbackNote,
    contribution: cleanString(definition?.contribution || ''),
    evidence: cleanString(definition?.evidence || ''),
    evidence_level: evidenceMeta.level,
    confidence: evidenceMeta.confidence,
    evidence_reason: evidenceMeta.reason,
    matched_notes: evidenceMeta.matchedNotes,
  };
}

function dedupeMolecules(items, limit = 6) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item?.name) continue;
    const key = normalizeText(item.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

function validateExistingMolecules(molecules) {
  return dedupeMolecules((Array.isArray(molecules) ? molecules : []).map((item) => {
    const hydrated = hydrateMolecule(item, item?.note || 'heart');
    if (!hydrated) return null;
    const evidenceMeta = inferEvidenceMeta(item);
    return {
      ...hydrated,
      contribution: cleanString(item?.contribution || hydrated.contribution || ''),
      note: cleanString(item?.note || hydrated.note || 'heart') || 'heart',
      evidence: cleanString(item?.evidence || hydrated.evidence || 'AI + yerel veritabani eslesmesi'),
      evidence_level: normalizeEvidenceLevel(item?.evidenceLevel || item?.evidence_level) || hydrated.evidence_level || evidenceMeta.level,
      confidence: clampConfidence(item?.confidence, hydrated.confidence || evidenceMeta.confidence),
      evidence_reason: cleanString(item?.evidenceReason || item?.evidence_reason || hydrated.evidence_reason || evidenceMeta.reason),
      matched_notes: toList(item?.matchedNotes || item?.matched_notes || hydrated.matched_notes || evidenceMeta.matchedNotes),
    };
  }).filter(Boolean), 6);
}

function deriveMoleculesFromPyramid(pyramid, limit = 6) {
  const normalized = normalizePyramid(pyramid);
  if (!normalized) return [];

  const primaryMatches = [];
  const secondaryMatches = [];
  for (const [noteLayer, notes] of Object.entries(normalized)) {
    for (const originalNote of notes) {
      const normalizedNote = normalizeText(originalNote);
      if (!normalizedNote) continue;
      const noteMatches = [];
      for (const rule of NOTE_MOLECULE_RULES) {
        if (!rule.keywords.some((keyword) => normalizedNote.includes(keyword))) continue;
        const exactKeyword = rule.keywords.find((keyword) => normalizedNote === normalizeText(keyword));
        const matchedKeyword = rule.keywords.find((keyword) => normalizedNote.includes(normalizeText(keyword)));
        for (const moleculeName of rule.molecules) {
          const molecule = hydrateMolecule({
            name: moleculeName,
            note: noteLayer,
            contribution: `${cleanString(originalNote)} notasinin molekuler izi`,
            evidence: `Nota -> molekul esleme (${cleanString(originalNote)})`,
            evidence_level: 'mapped',
            confidence: exactKeyword ? 88 : matchedKeyword ? 82 : 76,
            evidence_reason: `${cleanString(originalNote)} notası, kural tabanlı note → molecule eşleme ile ${moleculeName} adayını destekliyor.`,
            matched_notes: [cleanString(originalNote)],
          }, noteLayer);
          if (molecule) noteMatches.push(molecule);
        }
      }
      if (noteMatches[0]) primaryMatches.push(noteMatches[0]);
      if (noteMatches.length > 1) secondaryMatches.push(...noteMatches.slice(1));
    }
  }

  return dedupeMolecules([...primaryMatches, ...secondaryMatches], limit);
}

function sanitizeLegalText(value, state) {
  const original = cleanString(value);
  if (!original) return '';
  let next = original;

  LEGAL_TEXT_REPLACEMENTS.forEach(({ pattern, replacement }) => {
    next = next.replace(pattern, replacement);
  });

  LEGAL_RISKY_PATTERNS.forEach((pattern) => {
    if (pattern.test(next)) {
      state.filtered += 1;
      next = next.replace(pattern, 'karsilastirma amacli');
    }
  });

  if (next !== original) state.filtered += 1;
  return cleanString(next);
}

function sanitizeLegalList(values, state, limit = 8) {
  const seen = new Set();
  const result = [];
  (Array.isArray(values) ? values : []).forEach((item) => {
    const cleaned = sanitizeLegalText(item, state);
    const key = normalizeText(cleaned);
    if (!cleaned || !key || seen.has(key)) return;
    seen.add(key);
    result.push(cleaned);
  });
  return result.slice(0, limit);
}

function setFromNames(items) {
  const set = new Set();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = normalizeText(item?.name || item);
    if (key) set.add(key);
  });
  return set;
}

function setFromTextList(items) {
  const set = new Set();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = normalizeText(item);
    if (key) set.add(key);
  });
  return set;
}

function jaccardScore(aSet, bSet) {
  if (!aSet?.size || !bSet?.size) return 0;
  let inter = 0;
  aSet.forEach((item) => {
    if (bSet.has(item)) inter += 1;
  });
  const union = aSet.size + bSet.size - inter;
  return union > 0 ? inter / union : 0;
}

function buildSimilarityCandidates(result, knownPerfume = null, limit = 6) {
  const baseNoteSet = buildCanonicalSetFromPyramid(result?.pyramid);
  const baseMoleculeSet = setFromNames(result?.molecules);
  const baseFamily = cleanString(result?.family);
  const baseSeasonSet = setFromTextList(result?.season);
  const baseTagSet = setFromTextList([
    ...(Array.isArray(knownPerfume?.tags) ? knownPerfume.tags : []),
    ...(Array.isArray(result?.tags) ? result.tags : []),
  ]);
  const basePriceBand = cleanString(knownPerfume?.priceBand || result?.priceBand || '');
  const baseOccasion = cleanString(result?.occasion);

  const candidates = [];
  PERFUME_CATALOG.forEach((item) => {
    if (knownPerfume?.canonicalName && knownPerfume.canonicalName === item.canonicalName) return;

    const candidateNoteSet = buildCanonicalSetFromPyramid(item.pyramid);
    const candidateMoleculeSet = setFromNames(item.representativeMolecules || []);
    const candidateSeasonSet = setFromTextList(item.season);
    const candidateTagSet = setFromTextList(item.tags);
    const noteScore = jaccardScore(baseNoteSet, candidateNoteSet);
    const moleculeScore = jaccardScore(baseMoleculeSet, candidateMoleculeSet);
    const familyScore = baseFamily && cleanString(item.family) === baseFamily ? 1 : 0;
    const seasonScore = jaccardScore(baseSeasonSet, candidateSeasonSet);
    const tagScore = jaccardScore(baseTagSet, candidateTagSet);
    const occasionScore = baseOccasion && cleanString(item.occasion) === baseOccasion ? 1 : 0;
    const priceBandScore = basePriceBand && cleanString(item.priceBand) === basePriceBand ? 1 : 0;

    const totalScore = Math.round((
      (noteScore * 0.48)
      + (moleculeScore * 0.30)
      + (familyScore * 0.10)
      + (seasonScore * 0.05)
      + (tagScore * 0.04)
      + (occasionScore * 0.02)
      + (priceBandScore * 0.01)
    ) * 100);
    if (totalScore < 18) return;

    const reasons = [];
    if (noteScore >= 0.35) reasons.push('nota izi yakin');
    if (moleculeScore >= 0.30) reasons.push('molekul omurgasi yakin');
    if (familyScore) reasons.push('aile uyumu');
    if (seasonScore >= 0.34) reasons.push('mevsim uyumu');
    if (tagScore >= 0.25) reasons.push('stil etiketi benzerligi');
    if (occasionScore) reasons.push('kullanim senaryosu benzer');
    if (priceBandScore) reasons.push('fiyat segmenti yakin');
    if (!reasons.length) reasons.push('profil benzerligi');

    candidates.push({
      name: item.canonicalName,
      family: item.family,
      score: totalScore,
      components: {
        note: Number((noteScore * 100).toFixed(1)),
        molecule: Number((moleculeScore * 100).toFixed(1)),
        family: familyScore ? 100 : 0,
        season: Number((seasonScore * 100).toFixed(1)),
        tag: Number((tagScore * 100).toFixed(1)),
        occasion: occasionScore ? 100 : 0,
        priceBand: priceBandScore ? 100 : 0,
      },
      reason: reasons.join(' + '),
      source: 'catalog',
      tags: Array.isArray(item.tags) ? item.tags.slice(0, 6) : [],
      priceBand: cleanString(item.priceBand) || '',
    });
  });

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function mergeSimilarNames(existingSimilar, candidates, limit = 6) {
  const merged = [];
  const seen = new Set();

  const pushItem = (name) => {
    const cleaned = cleanString(name);
    const key = normalizeText(cleaned);
    if (!cleaned || !key || seen.has(key)) return;
    seen.add(key);
    merged.push(cleaned);
  };

  (Array.isArray(candidates) ? candidates : []).forEach((item) => pushItem(item?.name));
  (Array.isArray(existingSimilar) ? existingSimilar : []).forEach((item) => pushItem(item));
  return merged.slice(0, limit);
}

function applyLegalSafety(result) {
  const state = { filtered: 0 };
  result.description = sanitizeLegalText(result.description, state);
  result.similar = sanitizeLegalList(result.similar, state, 8);
  result.dupes = sanitizeLegalList(result.dupes, state, 6);

  if (result?.layering?.pair) {
    result.layering.pair = sanitizeLegalText(result.layering.pair, state);
  }
  if (result?.layering?.result) {
    result.layering.result = sanitizeLegalText(result.layering.result, state);
  }

  if (result?.timeline && typeof result.timeline === 'object') {
    ['t0', 't1', 't2', 't3'].forEach((key) => {
      if (result.timeline[key]) {
        result.timeline[key] = sanitizeLegalText(result.timeline[key], state);
      }
    });
  }

  if (Array.isArray(result?.similarity?.candidates)) {
    result.similarity.candidates = result.similarity.candidates.map((item) => ({
      ...item,
      name: sanitizeLegalText(item?.name, state),
      reason: sanitizeLegalText(item?.reason, state),
    }));
  }

  result.legal = {
    version: 'v1',
    compareTerm: 'benzer profil',
    brandPolicy: 'Marka adlari yalnizca karsilastirma referansi icindir; resmi baglilik iddiasi kurulmaz.',
    riskyClaimsFiltered: state.filtered,
  };
}

function extractInputTexts(messages) {
  if (!Array.isArray(messages)) return [];
  const texts = [];
  messages.forEach((message) => {
    if (typeof message?.content === 'string') {
      texts.push(message.content);
      return;
    }
    if (!Array.isArray(message?.content)) return;
    message.content.forEach((block) => {
      if (block?.type === 'text' && typeof block.text === 'string') {
        texts.push(block.text);
      }
    });
  });
  return texts;
}

function matchKnownPerfume(...candidates) {
  const normalizedCandidates = candidates
    .flat()
    .map((value) => normalizeText(value))
    .filter(Boolean);

  for (const perfume of PERFUME_CATALOG) {
    const aliases = [perfume.canonicalName, ...(perfume.aliases || [])]
      .map((value) => normalizeText(value))
      .filter(Boolean);

    for (const alias of aliases) {
      const exact = normalizedCandidates.some((candidate) => candidate === alias);
      if (exact) return perfume;

      const partial = normalizedCandidates.some((candidate) => (
        alias.length >= 8 && (candidate.includes(alias) || alias.includes(candidate))
      ));
      if (partial) return perfume;
    }
  }

  return null;
}

function extractSourceTrace(annotations) {
  const sources = [];
  const seen = new Set();
  const chunks = Array.isArray(annotations?.groundingChunks) ? annotations.groundingChunks : [];
  chunks.forEach((chunk) => {
    const web = chunk?.web || chunk?.source || null;
    const url = cleanString(web?.uri || web?.url);
    if (!url || seen.has(url)) return;
    seen.add(url);
    let fallbackLabel = url;
    try {
      fallbackLabel = new URL(url).hostname.replace(/^www\./, '');
    } catch {}
    sources.push({
      label: cleanString(web?.title) || fallbackLabel,
      url,
      kind: 'grounding',
    });
  });
  return sources.slice(0, 4);
}

function mergeSourceTrace(...groups) {
  const seen = new Set();
  const result = [];
  groups.flat().forEach((item) => {
    const url = cleanString(item?.url);
    if (!url || seen.has(url)) return;
    seen.add(url);
    result.push({
      label: cleanString(item?.label) || url,
      url,
      kind: cleanString(item?.kind) || 'reference',
    });
  });
  return result.slice(0, 5);
}

function buildConfidence(result, meta = {}) {
  const points = [];
  let score = 24;

  if (meta.catalogMatch) {
    score += 34;
    points.push('Bilinen parfum resmi kaynakla eslesti');
  }
  if (meta.noteSource === 'official') {
    score += 18;
    points.push('Nota piramidi resmi kaynakla dogrulandi');
  } else if (meta.noteSource === 'inferred-input') {
    score += 12;
    points.push('Nota piramidi kullanici notalarindan kuralli sekilde olusturuldu');
  } else if (normalizePyramid(result?.pyramid)) {
    score += 10;
    points.push('Nota piramidi mevcut');
  }
  if (meta.moleculeSource === 'official-derived') {
    score += 18;
    points.push('Molekul seti resmi nota izinden turetildi');
  } else if (meta.moleculeSource === 'note-derived') {
    score += 14;
    points.push('Molekul seti nota -> molekul kuraliyla dogrulandi');
  } else if ((result?.molecules || []).length >= 2) {
    score += 9;
    points.push('Molekuller yerel veritabaniyla eslesti');
  }
  if ((meta.sourceTrace || []).length > 0) {
    score += Math.min(12, (meta.sourceTrace || []).length * 4);
    points.push('Kaynak izi goruntulenebilir');
  }
  if (Array.isArray(result?.technical) && result.technical.length >= 2) {
    score += 6;
    points.push('Teknik detaylar yeterli');
  }
  if (Array.isArray(result?.similar) && result.similar.length >= 3) {
    score += 4;
    points.push('Karsilastirma icin benzer rota var');
  }

  const finalScore = Math.max(18, Math.min(98, score));
  const level = finalScore >= 78 ? 'Guclu' : finalScore >= 54 ? 'Orta' : 'Kesif';
  const toneClass = finalScore >= 78 ? 'high' : finalScore >= 54 ? 'medium' : 'low';

  let summary = 'Bu sonuc hala yorum katmani tasiyor; ten denemesiyle teyit etmek en dogru yol.';
  if (meta.catalogMatch && meta.moleculeSource === 'official-derived') {
    summary = 'Bu sonuc resmi kaynak iziyle eslesen bir parfum profiline dayaniyor. Nota ve molekul omurgasi modelin ustunde dogrulandi.';
  } else if (meta.catalogMatch) {
    summary = 'Bu sonuc resmi kaynaklarla eslesen bir parfum profiline dayaniyor. Genel karar icin guvenli bir baslangic noktasi.';
  } else if (meta.noteSource === 'inferred-input') {
    summary = 'Piramit, girilen nota listesiyle ontoloji kurallari kullanilarak desteklendi; yine de ten denemesi en dogru kontroldur.';
  } else if (meta.moleculeSource === 'note-derived') {
    summary = 'Koku profili modelden geliyor ama molekul katmani nota izinden deterministik sekilde destekleniyor.';
  }

  return {
    score: finalScore,
    level,
    toneClass,
    summary,
    points: points.slice(0, 5),
    noteSource: meta.noteSource || 'model',
    moleculeSource: meta.moleculeSource || 'model',
  };
}

function enrichAnalysisResult(result, options = {}) {
  const cleanResult = result && typeof result === 'object' ? { ...result } : {};
  const inputTexts = extractInputTexts(options.messages || []);
  const knownPerfume = options.skipCatalogMatch
    ? null
    : matchKnownPerfume(cleanResult.name, ...inputTexts);
  const officialPyramid = knownPerfume ? normalizePyramid(knownPerfume.pyramid) : null;
  let noteSource = 'unknown';
  const sourceTrace = mergeSourceTrace(
    knownPerfume?.sources || [],
    extractSourceTrace(options.annotations),
  );

  if (knownPerfume) {
    cleanResult.name = knownPerfume.canonicalName;
    cleanResult.family = cleanString(cleanResult.family) || knownPerfume.family;
    cleanResult.season = Array.isArray(cleanResult.season) && cleanResult.season.length
      ? cleanResult.season
      : knownPerfume.season.slice();
    cleanResult.occasion = cleanString(cleanResult.occasion) || knownPerfume.occasion;
    cleanResult.pyramid = officialPyramid;
    noteSource = 'official';
  } else {
    cleanResult.pyramid = normalizePyramid(cleanResult.pyramid);
    if (!cleanResult.pyramid) {
      const inferredPyramid = buildPyramidFromInputNotes(inputTexts);
      if (inferredPyramid) {
        cleanResult.pyramid = inferredPyramid;
        noteSource = 'inferred-input';
      }
    }
    if (noteSource === 'unknown' && cleanResult.pyramid) {
      noteSource = 'model';
    }
  }

  const officialMolecules = knownPerfume
    ? dedupeMolecules((knownPerfume.representativeMolecules || [])
      .map((item) => hydrateMolecule(item, item.note || 'heart'))
      .filter(Boolean), 6)
    : [];

  const derivedMolecules = deriveMoleculesFromPyramid(cleanResult.pyramid, 6);
  const validatedMolecules = validateExistingMolecules(cleanResult.molecules);

  if (officialMolecules.length >= 3) {
    cleanResult.molecules = officialMolecules.slice(0, 6);
  } else if (officialMolecules.length > 0) {
    cleanResult.molecules = dedupeMolecules([
      ...officialMolecules,
      ...derivedMolecules,
    ], 6);
  } else {
    cleanResult.molecules = dedupeMolecules([
      ...derivedMolecules,
      ...validatedMolecules,
    ], 6);
  }

  const similarityCandidates = buildSimilarityCandidates(cleanResult, knownPerfume, 6);
  cleanResult.similarity = {
    version: 'v1',
    components: {
      noteWeight: 0.48,
      moleculeWeight: 0.30,
      familyWeight: 0.10,
      seasonWeight: 0.05,
      tagWeight: 0.04,
      occasionWeight: 0.02,
      priceBandWeight: 0.01,
    },
    candidates: similarityCandidates,
  };
  cleanResult.similar = mergeSimilarNames(cleanResult.similar, similarityCandidates, 6);

  cleanResult.sourceTrace = sourceTrace;
  cleanResult.verification = {
    matchedPerfume: knownPerfume?.canonicalName || null,
    noteSource: noteSource || (cleanResult.pyramid ? 'model' : 'unknown'),
    moleculeSource: officialMolecules.length
      ? 'official-derived'
      : derivedMolecules.length
        ? 'note-derived'
        : validatedMolecules.length
          ? 'validated-static'
          : 'model',
  };
  cleanResult.moleculeMeta = {
    count: cleanResult.molecules.length,
    source: cleanResult.verification.moleculeSource,
    matchedPerfume: knownPerfume?.canonicalName || null,
  };
  cleanResult.noteOntology = buildNoteOntologyV1({
    pyramid: cleanResult.pyramid,
    inputTexts,
    noteSource: cleanResult.verification.noteSource,
  });
  cleanResult.confidence = buildConfidence(cleanResult, {
    catalogMatch: Boolean(knownPerfume),
    noteSource: cleanResult.verification.noteSource,
    moleculeSource: cleanResult.verification.moleculeSource,
    sourceTrace,
  });
  applyLegalSafety(cleanResult);
  cleanResult.emoji = resolvePremiumEmojiForResult(cleanResult);

  return cleanResult;
}

module.exports = {
  PERFUME_CATALOG,
  deriveMoleculesFromPyramid,
  enrichAnalysisResult,
  extractInputTexts,
  matchKnownPerfume,
  normalizeText,
};
