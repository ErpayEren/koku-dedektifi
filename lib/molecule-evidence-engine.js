const ICONIC_MOLECULE_SLUGS = new Set([
  'ambroxide',
  'iso-e-super',
  'hedione',
  'vanillin',
  'coumarin',
  'muscone',
  'calone',
  'limonene',
  'linalool',
  'geraniol',
  'citral',
  'safranal',
  'patchouli-alcohol',
]);

const EVIDENCE_META = {
  verified_component: {
    label: 'Doğrulanmış Bileşen',
    rank: 4,
    color: 'gold',
  },
  signature_molecule: {
    label: 'İmza Molekül',
    rank: 5,
    color: 'purple',
  },
  accord_component: {
    label: 'Muhtemel Akor Bileşeni',
    rank: 3,
    color: 'teal',
  },
  note_match: {
    label: 'Nota Eşleşmesi',
    rank: 2,
    color: 'cream',
  },
  unmatched: {
    label: 'Henüz Eşleşmedi',
    rank: 1,
    color: 'muted',
  },
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function canonicalizeName(value) {
  return normalizeText(value)
    .replace(/^(alpha|beta|gamma|delta|cis|trans|d|l)\s+/g, '')
    .replace(/\b(alpha|beta|gamma|delta)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreMoleculeRecord(record) {
  return [
    record.cas_number || record.casNumber,
    record.smiles,
    record.iupac_name || record.iupacName,
    record.odor_description || record.odorDescription,
    record.natural_source || record.naturalSource,
    record.discovery_year || record.discoveryYear,
  ].filter(Boolean).length;
}

function chooseBetterRecord(left, right) {
  if (!left) return right;
  if (!right) return left;

  const leftScore = scoreMoleculeRecord(left);
  const rightScore = scoreMoleculeRecord(right);
  if (rightScore !== leftScore) return rightScore > leftScore ? right : left;

  if (ICONIC_MOLECULE_SLUGS.has(right.slug) && !ICONIC_MOLECULE_SLUGS.has(left.slug)) return right;
  return left;
}

function buildCanonicalMolecules(molecules) {
  const canonicalMap = new Map();
  const aliasToCanonical = new Map();

  molecules.forEach((record) => {
    const casKey = normalizeText(record.cas_number || record.casNumber);
    const smilesKey = String(record.smiles || '').trim();
    const nameKey = canonicalizeName(record.name || '');
    const key = casKey ? `cas:${casKey}` : smilesKey ? `smiles:${smilesKey}` : `name:${nameKey}`;
    const existing = canonicalMap.get(key);
    canonicalMap.set(key, chooseBetterRecord(existing, record));
  });

  molecules.forEach((record) => {
    const casKey = normalizeText(record.cas_number || record.casNumber);
    const smilesKey = String(record.smiles || '').trim();
    const nameKey = canonicalizeName(record.name || '');
    const key = casKey ? `cas:${casKey}` : smilesKey ? `smiles:${smilesKey}` : `name:${nameKey}`;
    const canonical = canonicalMap.get(key);
    if (!canonical) return;
    aliasToCanonical.set(record.slug, canonical.slug);
    aliasToCanonical.set(canonicalizeName(record.name), canonical.slug);
    if (record.cas_number || record.casNumber) {
      aliasToCanonical.set(normalizeText(record.cas_number || record.casNumber), canonical.slug);
    }
  });

  const canonicalMolecules = Array.from(new Set(canonicalMap.values()))
    .map((record) => ({
      ...record,
      is_iconic: ICONIC_MOLECULE_SLUGS.has(record.slug),
    }))
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));

  return { canonicalMolecules, aliasToCanonical };
}

function resolveEvidence(level) {
  return EVIDENCE_META[level] || EVIDENCE_META.unmatched;
}

function buildMatchedReason(moleculeName, level, matchedNotes, fragranceName) {
  if (level === 'signature_molecule') {
    return `${moleculeName}, ${fragranceName} için küratörlü katalogda imza molekül olarak işaretlendi.`;
  }
  if (level === 'verified_component') {
    return `${moleculeName}, ${fragranceName} için küratörlü kaynakta doğrulanmış bileşen olarak yer alıyor.`;
  }
  if (level === 'accord_component') {
    return `${matchedNotes.slice(0, 3).join(', ')} notaları ${moleculeName} etrafında savunulabilir bir akor izine dönüşüyor.`;
  }
  if (level === 'note_match') {
    return `${matchedNotes.slice(0, 2).join(', ')} notası ${moleculeName} ile güvenilir bir eşleşme kuruyor.`;
  }
  return `${moleculeName} henüz savunulabilir bir parfüm eşleşmesine ulaşmadı.`;
}

function deriveTraceStrength(level, explicitPercentage, molecule, matchedCount) {
  if (Number.isFinite(Number(explicitPercentage))) {
    const value = Math.max(26, Math.min(86, Math.round(Number(explicitPercentage))));
    return value;
  }

  const usage = Number(molecule.usage_percentage_typical || 0);
  const usageBoost = usage > 0 ? Math.min(16, Math.round(usage * 1.8)) : 0;
  const base =
    level === 'signature_molecule'
      ? 78
      : level === 'verified_component'
        ? 68
        : level === 'accord_component'
          ? 56
          : level === 'note_match'
            ? 42
            : 28;
  return Math.max(24, Math.min(84, base + usageBoost + matchedCount * 4));
}

function buildCuratedEvidence(curatedSeed, aliasToCanonical, moleculeBySlug) {
  const relationMap = new Map();
  const curatedFragranceSlugs = new Set();

  (curatedSeed.fragrances || []).forEach((fragrance) => {
    curatedFragranceSlugs.add(fragrance.slug);
    const sorted = [...(fragrance.key_molecules || [])].sort((left, right) => Number(right.percentage || 0) - Number(left.percentage || 0));
    sorted.forEach((entry, index) => {
      const canonicalSlug = aliasToCanonical.get(entry.molecule_slug) || entry.molecule_slug;
      const molecule = moleculeBySlug.get(canonicalSlug);
      if (!molecule) return;
      const key = `${fragrance.slug}:${canonicalSlug}`;
      const matchedNotes =
        entry.role === 'top'
          ? (fragrance.top_notes || []).slice(0, 2)
          : entry.role === 'heart'
            ? (fragrance.heart_notes || []).slice(0, 2)
            : (fragrance.base_notes || []).slice(0, 2);
      const evidence_level = index === 0 ? 'signature_molecule' : 'verified_component';
      relationMap.set(key, {
        fragrance_id: fragrance.id,
        fragrance_slug: fragrance.slug,
        fragrance_name: fragrance.name,
        molecule_id: molecule.id,
        molecule_slug: molecule.slug,
        evidence_level,
        evidence_label: resolveEvidence(evidence_level).label,
        evidence_reason: buildMatchedReason(molecule.name, evidence_level, matchedNotes, fragrance.name),
        matched_notes: matchedNotes,
        note_roles: [entry.role],
        is_iconic: Boolean(molecule.is_iconic),
        percentage: Number(entry.percentage || 0) || null,
      });
    });
  });

  return { relationMap, curatedFragranceSlugs };
}

function relationKey(fragranceSlug, moleculeSlug) {
  return `${fragranceSlug}:${moleculeSlug}`;
}

function buildEvidenceGraph({ fragrances, molecules, noteMap, curatedSeed }) {
  const { canonicalMolecules, aliasToCanonical } = buildCanonicalMolecules(molecules || []);
  const moleculeBySlug = new Map(canonicalMolecules.map((item) => [item.slug, item]));
  const fragranceById = new Map((fragrances || []).map((item) => [item.id, item]));
  const { relationMap: curatedRelations } = buildCuratedEvidence(curatedSeed || { fragrances: [] }, aliasToCanonical, moleculeBySlug);

  (fragrances || []).forEach((fragrance) => {
    const noteEntries = [
      ...((fragrance.top_notes || []).map((note) => ({ note, role: 'top' }))),
      ...((fragrance.heart_notes || []).map((note) => ({ note, role: 'heart' }))),
      ...((fragrance.base_notes || []).map((note) => ({ note, role: 'base' }))),
    ];

    noteEntries.forEach((entry) => {
      const normalizedNote = normalizeText(entry.note);
      if (!normalizedNote) return;
      Object.entries(noteMap || {}).forEach(([noteKey, mappedMolecules]) => {
        if (!normalizedNote.includes(normalizeText(noteKey))) return;
        mappedMolecules.forEach((mappedSlug) => {
          const canonicalSlug = aliasToCanonical.get(mappedSlug) || mappedSlug;
          const molecule = moleculeBySlug.get(canonicalSlug);
          if (!molecule) return;
          const key = relationKey(fragrance.slug, canonicalSlug);
          const existing = curatedRelations.get(key) || {
            fragrance_id: fragrance.id,
            fragrance_slug: fragrance.slug,
            fragrance_name: fragrance.name,
            molecule_id: molecule.id,
            molecule_slug: canonicalSlug,
            evidence_level: 'note_match',
            evidence_label: resolveEvidence('note_match').label,
            evidence_reason: '',
            matched_notes: [],
            note_roles: [],
            matched_note_keys: [],
            is_iconic: Boolean(molecule.is_iconic),
            percentage: null,
          };

          if (!Array.isArray(existing.matched_notes)) existing.matched_notes = [];
          if (!Array.isArray(existing.note_roles)) existing.note_roles = [];
          if (!Array.isArray(existing.matched_note_keys)) existing.matched_note_keys = [];

          if (!existing.matched_notes.includes(entry.note)) {
            existing.matched_notes.push(entry.note);
          }
          if (!existing.note_roles.includes(entry.role)) {
            existing.note_roles.push(entry.role);
          }
          if (!existing.matched_note_keys.includes(noteKey)) {
            existing.matched_note_keys.push(noteKey);
          }
          curatedRelations.set(key, existing);
        });
      });
    });
  });

  const relations = Array.from(curatedRelations.values())
    .map((relation) => {
      const molecule = moleculeBySlug.get(relation.molecule_slug);
      if (!molecule) return null;

      let evidence_level = relation.evidence_level;
      if (evidence_level !== 'signature_molecule' && evidence_level !== 'verified_component') {
        evidence_level =
          relation.matched_notes.length >= 2 || relation.matched_note_keys?.length >= 2 || relation.note_roles.length >= 2
            ? 'accord_component'
            : relation.matched_notes.length > 0
              ? 'note_match'
              : 'unmatched';
      }

      const evidence = resolveEvidence(evidence_level);
      return {
        id: `${relation.fragrance_id}:${relation.molecule_id}`,
        fragrance_id: relation.fragrance_id,
        fragrance_slug: relation.fragrance_slug,
        fragrance_name: relation.fragrance_name,
        molecule_id: relation.molecule_id,
        molecule_slug: relation.molecule_slug,
        evidence_level,
        evidence_label: evidence.label,
        evidence_color: evidence.color,
        evidence_rank: evidence.rank,
        evidence_reason: relation.evidence_reason || buildMatchedReason(molecule.name, evidence_level, relation.matched_notes, relation.fragrance_name),
        matched_notes: relation.matched_notes,
        note_roles: relation.note_roles,
        is_iconic: Boolean(relation.is_iconic || molecule.is_iconic),
        percentage: deriveTraceStrength(evidence_level, relation.percentage, molecule, relation.matched_notes.length),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.fragrance_slug !== right.fragrance_slug) return left.fragrance_slug.localeCompare(right.fragrance_slug);
      if (right.evidence_rank !== left.evidence_rank) return right.evidence_rank - left.evidence_rank;
      if (right.matched_notes.length !== left.matched_notes.length) return right.matched_notes.length - left.matched_notes.length;
      return left.molecule_slug.localeCompare(right.molecule_slug);
    });

  const relationsByFragrance = new Map();
  const relationsByMolecule = new Map();
  relations.forEach((relation) => {
    if (!relationsByFragrance.has(relation.fragrance_id)) relationsByFragrance.set(relation.fragrance_id, []);
    relationsByFragrance.get(relation.fragrance_id).push(relation);
    if (!relationsByMolecule.has(relation.molecule_id)) relationsByMolecule.set(relation.molecule_id, []);
    relationsByMolecule.get(relation.molecule_id).push(relation);
  });

  const enrichedFragrances = (fragrances || []).map((fragrance) => {
    const linked = relationsByFragrance.get(fragrance.id) || [];
    return {
      ...fragrance,
      key_molecules: linked.slice(0, 6).map((relation) => {
        const molecule = moleculeBySlug.get(relation.molecule_slug);
        return {
          id: relation.molecule_id,
          slug: relation.molecule_slug,
          name: molecule?.name || relation.molecule_slug,
          smiles: molecule?.smiles || '',
          percentage: relation.percentage,
          role: relation.note_roles[0] || molecule?.longevity_contribution || 'structure',
          evidence_level: relation.evidence_level,
          evidence_label: relation.evidence_label,
          evidence_reason: relation.evidence_reason,
          matched_notes: relation.matched_notes,
        };
      }),
      molecule_preview_smiles:
        linked.length > 0 ? moleculeBySlug.get(linked[0].molecule_slug)?.smiles || fragrance.molecule_preview_smiles || '' : fragrance.molecule_preview_smiles || '',
    };
  });

  const enrichedMolecules = canonicalMolecules.map((molecule) => {
    const linked = relationsByMolecule.get(molecule.id) || [];
    const linkedFragranceIds = linked.map((relation) => relation.fragrance_id);
    const linkedFragranceNames = linked
      .map((relation) => {
        const fragrance = fragranceById.get(relation.fragrance_id);
        if (!fragrance) return relation.fragrance_name;
        return fragrance.brand ? `${fragrance.brand} ${fragrance.name}` : fragrance.name;
      })
      .filter(Boolean);
    const bestRelation = linked
      .slice()
      .sort((left, right) => {
        if (right.evidence_rank !== left.evidence_rank) return right.evidence_rank - left.evidence_rank;
        if (right.matched_notes.length !== left.matched_notes.length) return right.matched_notes.length - left.matched_notes.length;
        return right.percentage - left.percentage;
      })[0];

    return {
      ...molecule,
      found_in_fragrances: Array.from(new Set(linkedFragranceIds)),
      linked_fragrances_count: Array.from(new Set(linkedFragranceIds)).length,
      linked_fragrance_names: Array.from(new Set(linkedFragranceNames)).slice(0, 4),
      primary_evidence_level: bestRelation?.evidence_level || 'unmatched',
      primary_evidence_label: bestRelation?.evidence_label || resolveEvidence('unmatched').label,
      is_iconic: Boolean(molecule.is_iconic),
      canonical_slug: molecule.slug,
    };
  });

  const visibleMolecules = enrichedMolecules.filter(
    (molecule) => molecule.linked_fragrances_count > 0 || molecule.is_iconic,
  );

  return {
    molecules: visibleMolecules,
    allMolecules: enrichedMolecules,
    fragrances: enrichedFragrances,
    relations,
    aliasToCanonical: Object.fromEntries(aliasToCanonical.entries()),
    iconicMoleculeSlugs: Array.from(ICONIC_MOLECULES),
    stats: {
      fragranceCount: enrichedFragrances.length,
      visibleMoleculeCount: visibleMolecules.length,
      allMoleculeCount: enrichedMolecules.length,
      linkedRelationCount: relations.length,
      zeroLinkHiddenCount: enrichedMolecules.length - visibleMolecules.length,
    },
  };
}

const ICONIC_MOLECULES = new Set(Array.from(ICONIC_MOLECULE_SLUGS));

module.exports = {
  ICONIC_MOLECULES,
  EVIDENCE_META,
  normalizeText,
  buildEvidenceGraph,
  resolveEvidence,
};
