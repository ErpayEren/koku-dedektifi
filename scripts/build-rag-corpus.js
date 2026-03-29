/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { PERFUME_CATALOG } = require('../lib/server/perfume-knowledge');
const { NOTE_ONTOLOGY, normalizeText } = require('../lib/note-ontology');
const { loadDatabase } = require('../lib/server/molecule-db');

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSlug(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function listToText(list) {
  return (Array.isArray(list) ? list : [])
    .map((item) => cleanString(item))
    .filter(Boolean)
    .join(', ');
}

function splitTokens(items) {
  const tokens = [];
  (Array.isArray(items) ? items : []).forEach((item) => {
    const normalized = normalizeText(item);
    if (!normalized) return;
    normalized.split(' ').forEach((part) => {
      const token = cleanString(part).toLowerCase();
      if (!token || token.length < 3) return;
      tokens.push(token);
    });
  });
  return tokens;
}

function topTerms(items, limit = 10) {
  const count = new Map();
  splitTokens(items).forEach((token) => {
    count.set(token, (count.get(token) || 0) + 1);
  });
  return Array.from(count.entries())
    .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

function buildPerfumeContent(item) {
  const top = listToText(item?.pyramid?.top);
  const middle = listToText(item?.pyramid?.middle);
  const base = listToText(item?.pyramid?.base);
  const molecules = (Array.isArray(item?.representativeMolecules) ? item.representativeMolecules : [])
    .map((entry) => cleanString(entry?.name || entry))
    .filter(Boolean)
    .slice(0, 8)
    .join(', ');
  const tags = listToText(item?.tags);
  const season = listToText(item?.season);
  const aliases = listToText(item?.aliases);
  const priceBand = cleanString(item?.priceBand) || 'mid';

  return [
    `${cleanString(item?.canonicalName)} parfum profili.`,
    `Aile: ${cleanString(item?.family) || 'Aromatik'}.`,
    `Kullanim: ${cleanString(item?.occasion) || 'Gunduz'}.`,
    season ? `Mevsim: ${season}.` : '',
    aliases ? `Alias: ${aliases}.` : '',
    tags ? `Etiketler: ${tags}.` : '',
    `Fiyat bandi: ${priceBand}.`,
    top ? `Ust notalar: ${top}.` : '',
    middle ? `Kalp notalar: ${middle}.` : '',
    base ? `Alt notalar: ${base}.` : '',
    molecules ? `Temsilci molekuller: ${molecules}.` : '',
  ].filter(Boolean).join(' ');
}

function buildPerfumeAliasContent(item, alias) {
  const title = cleanString(item?.canonicalName);
  const family = cleanString(item?.family) || 'Aromatik';
  const occasion = cleanString(item?.occasion) || 'Gunduz';
  const season = listToText(item?.season);
  const top = listToText(item?.pyramid?.top);
  const middle = listToText(item?.pyramid?.middle);
  const base = listToText(item?.pyramid?.base);
  const tags = listToText(item?.tags);

  return [
    `"${alias}" ifadesi genellikle "${title}" parfumunu isaret eder.`,
    `Aile: ${family}.`,
    `Kullanim: ${occasion}.`,
    season ? `Mevsim: ${season}.` : '',
    top ? `Ust notalar: ${top}.` : '',
    middle ? `Kalp notalar: ${middle}.` : '',
    base ? `Alt notalar: ${base}.` : '',
    tags ? `Etiketler: ${tags}.` : '',
    'Not: Marka karsilastirmalarinda resmi baglilik iddiasi kurulmaz; benzer profil dili kullanilir.',
  ].filter(Boolean).join(' ');
}

function buildPerfumeQueryPatternContent(item, pattern) {
  const title = cleanString(item?.canonicalName);
  const family = cleanString(item?.family) || 'Aromatik';
  const occasion = cleanString(item?.occasion) || 'Gunduz';
  const season = listToText(item?.season);
  return [
    `"${pattern}" sorgu paterni "${title}" ile eslestirilmelidir.`,
    `Aile: ${family}.`,
    `Kullanim: ${occasion}.`,
    season ? `Mevsim: ${season}.` : '',
    'Bu kayit, kisa/yazim varyasyonlu aramalarda yuksek geri cagirimi korumak icin vardir.',
  ].filter(Boolean).join(' ');
}

function buildOntologyContent(entry) {
  const canonical = cleanString(entry?.canonical);
  const display = cleanString(entry?.display);
  const family = cleanString(entry?.family);
  const cluster = cleanString(entry?.cluster);
  const layerHint = cleanString(entry?.layerHint);
  const synonyms = listToText(entry?.synonyms);

  return [
    `${display || canonical} nota ontolojisi girdisi.`,
    canonical ? `Canonical: ${canonical}.` : '',
    family ? `Aile: ${family}.` : '',
    cluster ? `Kume: ${cluster}.` : '',
    layerHint ? `Katman ipucu: ${layerHint}.` : '',
    synonyms ? `Es anlamli/alias: ${synonyms}.` : '',
  ].filter(Boolean).join(' ');
}

function buildOntologyAliasContent(entry, alias) {
  const canonical = cleanString(entry?.canonical);
  const display = cleanString(entry?.display || canonical);
  const family = cleanString(entry?.family);
  const cluster = cleanString(entry?.cluster);
  const layerHint = cleanString(entry?.layerHint);
  return [
    `"${alias}" ifadesi notalarda "${display}" anlamina gelir.`,
    canonical ? `Canonical: ${canonical}.` : '',
    family ? `Aile: ${family}.` : '',
    cluster ? `Kume: ${cluster}.` : '',
    layerHint ? `Katman: ${layerHint}.` : '',
    'Bu esleme, nota standardizasyonu ve benzerlik motoru icin kullanilir.',
  ].filter(Boolean).join(' ');
}

function buildMoleculeContent(name, info, noteHints = {}) {
  const formula = cleanString(info?.formula);
  const family = cleanString(info?.family);
  const origin = cleanString(info?.origin);
  const smiles = cleanString(info?.smiles);
  const hints = Array.isArray(noteHints?.[name]) ? noteHints[name] : [];

  return [
    `${name} parfum molekulu.`,
    formula ? `Formula: ${formula}.` : '',
    family ? `Kimyasal aile: ${family}.` : '',
    origin ? `Yaygin kaynak: ${origin}.` : '',
    smiles ? `Canonical smiles: ${smiles}.` : '',
    hints.length ? `Nota ipuclari: ${hints.map((h) => cleanString(h?.note || h)).filter(Boolean).join(', ')}.` : '',
  ].filter(Boolean).join(' ');
}

function toRagDocFromPerfume(item, index) {
  const title = cleanString(item?.canonicalName);
  const id = `perfume-${String(index + 1).padStart(4, '0')}-${normalizeSlug(title).slice(0, 64) || 'item'}`;
  const url = cleanString(item?.sources?.[0]?.url || '');
  const content = buildPerfumeContent(item);
  return {
    id,
    type: 'perfume',
    title,
    content,
    snippet: content.slice(0, 320),
    family: cleanString(item?.family),
    occasion: cleanString(item?.occasion),
    season: Array.isArray(item?.season) ? item.season : [],
    tags: Array.isArray(item?.tags) ? item.tags : [],
    priceBand: cleanString(item?.priceBand) || '',
    url,
  };
}

function toRagDocFromPerfumeAlias(item, alias, perfumeIndex, aliasIndex) {
  const safeAlias = cleanString(alias);
  if (!safeAlias) return null;
  const id = `perfume-alias-${String(perfumeIndex + 1).padStart(4, '0')}-${String(aliasIndex + 1).padStart(3, '0')}-${normalizeSlug(safeAlias).slice(0, 56) || 'alias'}`;
  const content = buildPerfumeAliasContent(item, safeAlias);
  return {
    id,
    type: 'perfume_alias',
    title: safeAlias,
    content,
    snippet: content.slice(0, 320),
    family: cleanString(item?.family),
    occasion: cleanString(item?.occasion),
    season: Array.isArray(item?.season) ? item.season : [],
    tags: ['alias', ...(Array.isArray(item?.tags) ? item.tags.slice(0, 6) : [])],
    priceBand: cleanString(item?.priceBand) || '',
    url: cleanString(item?.sources?.[0]?.url || ''),
  };
}

function toRagDocFromPerfumeQueryPattern(item, pattern, perfumeIndex, patternIndex) {
  const safePattern = cleanString(pattern);
  if (!safePattern) return null;
  const id = `perfume-pattern-${String(perfumeIndex + 1).padStart(4, '0')}-${String(patternIndex + 1).padStart(3, '0')}-${normalizeSlug(safePattern).slice(0, 56) || 'pattern'}`;
  const content = buildPerfumeQueryPatternContent(item, safePattern);
  return {
    id,
    type: 'perfume_query_pattern',
    title: safePattern,
    content,
    snippet: content.slice(0, 320),
    family: cleanString(item?.family),
    occasion: cleanString(item?.occasion),
    season: Array.isArray(item?.season) ? item.season : [],
    tags: ['query-pattern', ...(Array.isArray(item?.tags) ? item.tags.slice(0, 6) : [])],
    priceBand: cleanString(item?.priceBand) || '',
    url: cleanString(item?.sources?.[0]?.url || ''),
  };
}

function buildQueryPatterns(item) {
  const src = item && typeof item === 'object' ? item : {};
  const canonical = cleanString(src.canonicalName);
  const normalizedCanonical = normalizeText(canonical);
  const variants = new Set();
  const push = (value) => {
    const clean = cleanString(value);
    const normalized = normalizeText(clean);
    if (!clean || !normalized || normalized === normalizedCanonical) return;
    variants.add(clean);
  };

  (Array.isArray(src.aliases) ? src.aliases : []).forEach((alias) => push(alias));

  const stripped = canonical
    .replace(/\beau de parfum\b/gi, ' ')
    .replace(/\beau de toilette\b/gi, ' ')
    .replace(/\bedp\b/gi, ' ')
    .replace(/\bedt\b/gi, ' ')
    .replace(/\bextrait\b/gi, ' ')
    .replace(/\bintense\b/gi, ' ')
    .replace(/\belixir\b/gi, ' ')
    .replace(/\bparfum\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  push(stripped);

  const parts = normalizeText(canonical).split(' ').filter(Boolean);
  if (parts.length >= 2) {
    push(parts.slice(0, 2).join(' '));
    push(parts.slice(-2).join(' '));
  }
  if (parts.length >= 3) {
    push(parts.slice(0, 3).join(' '));
    push(parts.slice(-3).join(' '));
  }

  return Array.from(variants).slice(0, 12);
}

function toRagDocFromOntology(entry, index) {
  const canonical = cleanString(entry?.canonical);
  const title = cleanString(entry?.display || canonical);
  const id = `ontology-${String(index + 1).padStart(4, '0')}-${normalizeSlug(canonical || title)}`;
  const content = buildOntologyContent(entry);
  return {
    id,
    type: 'note_ontology',
    title,
    content,
    snippet: content.slice(0, 320),
    family: cleanString(entry?.family),
    occasion: '',
    season: [],
    tags: ['ontology', cleanString(entry?.cluster).toLowerCase()].filter(Boolean),
    priceBand: '',
    url: '',
  };
}

function toRagDocFromOntologyAlias(entry, alias, entryIndex, aliasIndex) {
  const safeAlias = cleanString(alias);
  if (!safeAlias) return null;
  const id = `note-alias-${String(entryIndex + 1).padStart(4, '0')}-${String(aliasIndex + 1).padStart(3, '0')}-${normalizeSlug(safeAlias).slice(0, 56) || 'alias'}`;
  const content = buildOntologyAliasContent(entry, safeAlias);
  return {
    id,
    type: 'note_alias',
    title: safeAlias,
    content,
    snippet: content.slice(0, 320),
    family: cleanString(entry?.family),
    occasion: '',
    season: [],
    tags: ['note-alias', cleanString(entry?.canonical)].filter(Boolean),
    priceBand: '',
    url: '',
  };
}

function toRagDocFromMolecule(name, info, noteHints, index) {
  const title = cleanString(name);
  const id = `molecule-${String(index + 1).padStart(4, '0')}-${normalizeSlug(title).slice(0, 64) || 'item'}`;
  const content = buildMoleculeContent(title, info, noteHints);
  return {
    id,
    type: 'molecule',
    title: `Molecule: ${title}`,
    content,
    snippet: content.slice(0, 320),
    family: cleanString(info?.family),
    occasion: '',
    season: [],
    tags: ['molecule', cleanString(info?.origin).toLowerCase()].filter(Boolean),
    priceBand: '',
    url: '',
  };
}

function buildFamilyProfileDocs() {
  const grouped = new Map();
  PERFUME_CATALOG.forEach((item) => {
    const family = cleanString(item?.family) || 'Genel';
    if (!grouped.has(family)) grouped.set(family, []);
    grouped.get(family).push(item);
  });

  return Array.from(grouped.entries()).map(([family, items], index) => {
    const seasons = topTerms(items.flatMap((item) => item?.season || []), 6);
    const notes = topTerms(
      items.flatMap((item) => [
        ...(Array.isArray(item?.pyramid?.top) ? item.pyramid.top : []),
        ...(Array.isArray(item?.pyramid?.middle) ? item.pyramid.middle : []),
        ...(Array.isArray(item?.pyramid?.base) ? item.pyramid.base : []),
      ]),
      12,
    );
    const tags = topTerms(items.flatMap((item) => item?.tags || []), 10);
    const content = [
      `${family} ailesi icin pazar profili.`,
      `Toplam referans parfum: ${items.length}.`,
      seasons.length ? `Mevsim sinyalleri: ${seasons.join(', ')}.` : '',
      notes.length ? `Baskin nota izleri: ${notes.join(', ')}.` : '',
      tags.length ? `Yuksek frekans etiketler: ${tags.join(', ')}.` : '',
      'Bu kart, danisman ve benzerlik motoru tarafinda hizli aile baglami vermek icin kullanilir.',
    ].filter(Boolean).join(' ');

    return {
      id: `family-profile-${String(index + 1).padStart(3, '0')}-${normalizeSlug(family)}`,
      type: 'family_profile',
      title: `${family} profil rehberi`,
      content,
      snippet: content.slice(0, 320),
      family,
      occasion: '',
      season: [],
      tags: ['family-profile', normalizeSlug(family)].filter(Boolean),
      priceBand: '',
      url: '',
    };
  });
}

function buildSeasonProfileDocs() {
  const seasonBuckets = new Map();
  PERFUME_CATALOG.forEach((item) => {
    const family = cleanString(item?.family);
    const occasion = cleanString(item?.occasion);
    (Array.isArray(item?.season) ? item.season : []).forEach((season) => {
      const key = cleanString(season);
      if (!key) return;
      if (!seasonBuckets.has(key)) seasonBuckets.set(key, []);
      seasonBuckets.get(key).push({ family, occasion, item });
    });
  });

  return Array.from(seasonBuckets.entries()).map(([season, rows], index) => {
    const families = topTerms(rows.map((row) => row.family), 8);
    const occasions = topTerms(rows.map((row) => row.occasion), 8);
    const notes = topTerms(
      rows.flatMap((row) => [
        ...(Array.isArray(row.item?.pyramid?.top) ? row.item.pyramid.top : []),
        ...(Array.isArray(row.item?.pyramid?.middle) ? row.item.pyramid.middle : []),
        ...(Array.isArray(row.item?.pyramid?.base) ? row.item.pyramid.base : []),
      ]),
      14,
    );
    const content = [
      `${season} mevsimi icin koku tercih profili.`,
      `Referans parfum sayisi: ${rows.length}.`,
      families.length ? `Yuksek uyumlu aileler: ${families.join(', ')}.` : '',
      occasions.length ? `Kullanim baglamlari: ${occasions.join(', ')}.` : '',
      notes.length ? `One cikan nota sinyalleri: ${notes.join(', ')}.` : '',
      'Bu kart, mevsime gore oneriyi hizlandirmak ve ilk adim bilissel yuku azaltmak icin uretilmistir.',
    ].filter(Boolean).join(' ');

    return {
      id: `season-profile-${String(index + 1).padStart(3, '0')}-${normalizeSlug(season)}`,
      type: 'season_profile',
      title: `${season} sezon rehberi`,
      content,
      snippet: content.slice(0, 320),
      family: '',
      occasion: '',
      season: [season],
      tags: ['season-profile', normalizeSlug(season)].filter(Boolean),
      priceBand: '',
      url: '',
    };
  });
}

function dedupeDocs(docs) {
  const seen = new Set();
  const out = [];
  for (const doc of docs) {
    const key = `${cleanString(doc?.type)}::${normalizeSlug(doc?.title)}::${normalizeSlug(doc?.family)}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(doc);
  }
  return out;
}

function main() {
  const perfumeDocs = PERFUME_CATALOG
    .map((item, index) => toRagDocFromPerfume(item, index))
    .filter((item) => item?.title && item?.content);

  const perfumeAliasDocs = PERFUME_CATALOG
    .flatMap((item, perfumeIndex) => {
      const canonical = cleanString(item?.canonicalName);
      const canonicalNorm = normalizeText(canonical);
      const aliases = Array.from(new Set((Array.isArray(item?.aliases) ? item.aliases : []).map((value) => cleanString(value)).filter(Boolean)));
      return aliases
        .filter((alias) => normalizeText(alias) && normalizeText(alias) !== canonicalNorm)
        .map((alias, aliasIndex) => toRagDocFromPerfumeAlias(item, alias, perfumeIndex, aliasIndex))
        .filter(Boolean);
    });

  const perfumeQueryPatternDocs = PERFUME_CATALOG
    .flatMap((item, perfumeIndex) => buildQueryPatterns(item)
      .map((pattern, patternIndex) => toRagDocFromPerfumeQueryPattern(item, pattern, perfumeIndex, patternIndex))
      .filter(Boolean));

  const ontologyDocs = NOTE_ONTOLOGY
    .map((entry, index) => toRagDocFromOntology(entry, index))
    .filter((item) => item?.title && item?.content);

  const ontologyAliasDocs = NOTE_ONTOLOGY
    .flatMap((entry, entryIndex) => {
      const aliases = Array.from(new Set((Array.isArray(entry?.synonyms) ? entry.synonyms : []).map((value) => cleanString(value)).filter(Boolean)));
      const canonicalNorm = normalizeText(entry?.canonical || '');
      return aliases
        .filter((alias) => normalizeText(alias) && normalizeText(alias) !== canonicalNorm)
        .map((alias, aliasIndex) => toRagDocFromOntologyAlias(entry, alias, entryIndex, aliasIndex))
        .filter(Boolean);
    });

  const moleculeDb = loadDatabase();
  const smilesDb = moleculeDb?.smilesDb && typeof moleculeDb.smilesDb === 'object'
    ? moleculeDb.smilesDb
    : {};
  const noteHints = moleculeDb?.noteHints && typeof moleculeDb.noteHints === 'object'
    ? moleculeDb.noteHints
    : {};
  const moleculeDocs = Object.entries(smilesDb)
    .map(([name, info], index) => toRagDocFromMolecule(name, info || {}, noteHints, index))
    .filter((item) => item?.title && item?.content);

  const familyProfileDocs = buildFamilyProfileDocs();
  const seasonProfileDocs = buildSeasonProfileDocs();

  const docs = dedupeDocs([
    ...perfumeDocs,
    ...perfumeAliasDocs,
    ...perfumeQueryPatternDocs,
    ...ontologyDocs,
    ...ontologyAliasDocs,
    ...moleculeDocs,
    ...familyProfileDocs,
    ...seasonProfileDocs,
  ]);

  const outDir = path.resolve(__dirname, '..', 'docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'perfume_docs_seed.json');
  const ndjsonPath = path.join(outDir, 'perfume_docs_seed.ndjson');

  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    counts: {
      total: docs.length,
      perfumes: perfumeDocs.length,
      perfumeAliases: perfumeAliasDocs.length,
      perfumeQueryPatterns: perfumeQueryPatternDocs.length,
      ontology: ontologyDocs.length,
      ontologyAliases: ontologyAliasDocs.length,
      molecules: moleculeDocs.length,
      familyProfiles: familyProfileDocs.length,
      seasonProfiles: seasonProfileDocs.length,
    },
    docs,
  }, null, 2), 'utf8');

  const ndjson = docs.map((item) => JSON.stringify(item)).join('\n');
  fs.writeFileSync(ndjsonPath, ndjson, 'utf8');

  console.log(`[rag-corpus] docs generated: ${docs.length}`);
  console.log(`[rag-corpus] perfume docs: ${perfumeDocs.length}`);
  console.log(`[rag-corpus] perfume alias docs: ${perfumeAliasDocs.length}`);
  console.log(`[rag-corpus] perfume query pattern docs: ${perfumeQueryPatternDocs.length}`);
  console.log(`[rag-corpus] ontology docs: ${ontologyDocs.length}`);
  console.log(`[rag-corpus] ontology alias docs: ${ontologyAliasDocs.length}`);
  console.log(`[rag-corpus] molecule docs: ${moleculeDocs.length}`);
  console.log(`[rag-corpus] family profile docs: ${familyProfileDocs.length}`);
  console.log(`[rag-corpus] season profile docs: ${seasonProfileDocs.length}`);
  console.log(`[rag-corpus] json: ${jsonPath}`);
  console.log(`[rag-corpus] ndjson: ${ndjsonPath}`);
}

main();
