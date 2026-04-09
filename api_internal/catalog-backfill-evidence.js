const noteMoleculeMap = require('../note-molecule-map.json');
const shortNoteMoleculeMap = require('../lib/nota_molecules.json');
const { cleanString, resolveSupabaseConfig } = require('../lib/server/supabase-config');
const { setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');

const DEFAULT_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 1000;

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body && typeof body === 'object' ? body : {};
}

function normalizeToken(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeNoteMaps() {
  const merged = new Map();

  for (const [key, list] of Object.entries(noteMoleculeMap || {})) {
    const normalizedKey = normalizeToken(key);
    if (!normalizedKey) continue;
    merged.set(normalizedKey, Array.from(new Set((Array.isArray(list) ? list : []).map((item) => normalizeToken(item)).filter(Boolean))));
  }

  for (const [key, entry] of Object.entries(shortNoteMoleculeMap || {})) {
    const normalizedKey = normalizeToken(key);
    if (!normalizedKey) continue;
    const existing = merged.get(normalizedKey) || [];
    const shortList = Array.isArray(entry?.molecules) ? entry.molecules : [];
    const values = Array.from(new Set([...existing, ...shortList.map((item) => normalizeToken(item)).filter(Boolean)]));
    merged.set(normalizedKey, values);
  }

  return merged;
}

const mergedNoteMap = mergeNoteMaps();
const noteKeys = Array.from(mergedNoteMap.keys());

function noteMatchesKey(note, key) {
  if (!note || !key) return false;
  if (note === key) return true;
  if (note.includes(key) && key.length >= 3) return true;
  if (key.includes(note) && note.length >= 4) return true;
  return false;
}

function matchedMapKeysForNote(note) {
  const normalized = normalizeToken(note);
  if (!normalized) return [];
  const direct = noteKeys.filter((key) => noteMatchesKey(normalized, key));
  return direct;
}

async function fetchMolecules(config, table) {
  const endpoint = `${config.url}/rest/v1/${encodeURIComponent(table)}?select=id,slug,name&limit=5000`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(cleanString(text) || `molecule_fetch_${response.status}`);
  }
  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

async function fetchFragranceBatch(config, table, offset, limit) {
  const endpoint = `${config.url}/rest/v1/${encodeURIComponent(table)}?select=id,slug,name,top_notes,heart_notes,base_notes&order=id.asc&offset=${offset}&limit=${limit}`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(cleanString(text) || `fragrance_fetch_${response.status}`);
  }
  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

function buildMoleculeLookup(molecules) {
  const lookup = new Map();
  for (const molecule of molecules) {
    const id = cleanString(molecule.id);
    if (!id) continue;
    const keys = [
      normalizeToken(molecule.slug),
      normalizeToken(molecule.name),
    ].filter(Boolean);
    for (const key of keys) {
      if (!lookup.has(key)) {
        lookup.set(key, { id, slug: cleanString(molecule.slug), name: cleanString(molecule.name) });
      }
    }
  }
  return lookup;
}

function pushNoteRole(set, role) {
  if (!role) return;
  set.add(role);
}

function buildEvidenceRows(fragrances, moleculeLookup) {
  const rows = [];

  for (const fragrance of fragrances) {
    const fragranceId = cleanString(fragrance.id);
    const fragranceSlug = cleanString(fragrance.slug);
    const fragranceName = cleanString(fragrance.name);
    if (!fragranceId || !fragranceSlug || !fragranceName) continue;

    const accumulator = new Map();
    const roleGroups = [
      { role: 'top', notes: Array.isArray(fragrance.top_notes) ? fragrance.top_notes : [] },
      { role: 'heart', notes: Array.isArray(fragrance.heart_notes) ? fragrance.heart_notes : [] },
      { role: 'base', notes: Array.isArray(fragrance.base_notes) ? fragrance.base_notes : [] },
    ];

    for (const group of roleGroups) {
      for (const rawNote of group.notes) {
        const note = cleanString(rawNote);
        if (!note) continue;
        const mapKeys = matchedMapKeysForNote(note);
        for (const mapKey of mapKeys) {
          const candidates = mergedNoteMap.get(mapKey) || [];
          for (const candidate of candidates) {
            const molecule = moleculeLookup.get(candidate);
            if (!molecule) continue;
            const pairKey = `${fragranceId}:${molecule.id}`;
            if (!accumulator.has(pairKey)) {
              accumulator.set(pairKey, {
                fragrance_id: fragranceId,
                fragrance_slug: fragranceSlug,
                fragrance_name: fragranceName,
                molecule_id: molecule.id,
                molecule_slug: molecule.slug,
                matched_notes: new Set(),
                note_roles: new Set(),
              });
            }
            const entry = accumulator.get(pairKey);
            entry.matched_notes.add(note);
            pushNoteRole(entry.note_roles, group.role);
          }
        }
      }
    }

    for (const entry of accumulator.values()) {
      const matchedNotes = Array.from(entry.matched_notes);
      const noteRoles = Array.from(entry.note_roles);
      rows.push({
        id: `${entry.fragrance_id}:${entry.molecule_id}`,
        fragrance_id: entry.fragrance_id,
        fragrance_slug: entry.fragrance_slug,
        fragrance_name: entry.fragrance_name,
        molecule_id: entry.molecule_id,
        molecule_slug: entry.molecule_slug,
        evidence_level: 'note_match',
        evidence_label: 'Nota Eşleşmesi',
        evidence_reason: `${entry.fragrance_name} notalariyla molekul eslesmesi bulundu.`,
        matched_notes: matchedNotes,
        note_roles: noteRoles,
        is_iconic: false,
        percentage: Math.max(10, Math.min(90, matchedNotes.length * 18)),
      });
    }
  }

  return rows;
}

async function upsertEvidenceRows(config, table, rows) {
  if (!rows.length) return;
  const endpoint = `${config.url}/rest/v1/${encodeURIComponent(table)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
      on_conflict: 'fragrance_id,molecule_id',
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(cleanString(text) || `evidence_upsert_${response.status}`);
  }
}

module.exports = async function catalogBackfillEvidenceHandler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type' })) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const config = resolveSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) {
    return res.status(503).json({ error: 'Supabase service config eksik.' });
  }

  const fragranceTable = cleanString(process.env.SUPABASE_FRAGRANCES_TABLE) || 'fragrances';
  const moleculeTable = cleanString(process.env.SUPABASE_MOLECULES_TABLE) || 'molecules';
  const evidenceTable = cleanString(process.env.SUPABASE_FRAGRANCE_MOLECULE_EVIDENCE_TABLE) || 'fragrance_molecule_evidence';
  const body = parseBody(req);
  const offset = Math.max(0, Number.parseInt(body.offset, 10) || 0);
  const limit = Math.max(1, Math.min(MAX_BATCH_SIZE, Number.parseInt(body.limit, 10) || DEFAULT_BATCH_SIZE));

  try {
    const [molecules, fragrances] = await Promise.all([
      fetchMolecules(config, moleculeTable),
      fetchFragranceBatch(config, fragranceTable, offset, limit),
    ]);
    const moleculeLookup = buildMoleculeLookup(molecules);
    const rows = buildEvidenceRows(fragrances, moleculeLookup);
    await upsertEvidenceRows(config, evidenceTable, rows);

    const nextOffset = offset + fragrances.length;
    const done = fragrances.length < limit;
    return res.status(200).json({
      ok: true,
      offset,
      limit,
      nextOffset,
      done,
      fragranceBatchCount: fragrances.length,
      matchedRows: rows.length,
      moleculeCount: molecules.length,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Backfill calisamadi.',
      detail: cleanString(error?.message) || 'unknown',
      offset,
      limit,
    });
  }
};
