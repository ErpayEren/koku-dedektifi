'use strict';

const assert = require('node:assert/strict');
const {
  validateLLMOutput,
  validateAnalysisInput,
  formatZodError,
} = require('../api_internal/schemas/analysis');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function validLLMOutput(overrides = {}) {
  return {
    name: 'Sauvage',
    brand: 'Dior',
    year: 2015,
    family: 'Aromatik',
    concentration: 'EDP',
    topNotes: ['Bergamot', 'Karabiber'],
    heartNotes: ['Lavanta', 'Patchouli'],
    baseNotes: ['Ambroxan', 'Sedir'],
    keyMolecules: [
      { name: 'Ambroxan', effect: 'Odunsu kehribar aura.', percentage: 'Temel taşıyıcı' },
    ],
    sillage: 'güçlü',
    longevityHours: { min: 8, max: 14 },
    seasons: ['İlkbahar', 'Yaz'],
    occasions: ['Günlük', 'İş'],
    ageProfile: '25-45 yaş',
    genderProfile: 'Maskülen',
    moodProfile: 'Güçlü ve karizmatik koku.',
    expertComment: 'Modern erkek parfümcülüğünün referans noktası.',
    layeringTip: 'Silver Mountain Water ile katmanlayın.',
    applicationTip: 'Boyun ve bileğe 2-3 sıkım.',
    similarFragrances: [
      { name: 'Bleu de Chanel', brand: 'Chanel', reason: 'Odunsu karakter.', priceRange: 'luxury' },
    ],
    valueScore: 8,
    uniquenessScore: 6,
    wearabilityScore: 9,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateLLMOutput tests
// ---------------------------------------------------------------------------

test('validateLLMOutput: accepts a fully valid LLM response', () => {
  const result = validateLLMOutput(validLLMOutput());
  assert.equal(result.success, true);
  assert.equal(result.data.name, 'Sauvage');
});

test('validateLLMOutput: rejects missing required fields', () => {
  const result = validateLLMOutput({ name: 'Test' });
  assert.equal(result.success, false);
  assert.ok((result.error.issues || []).length > 0);
});

test('validateLLMOutput: rejects name as empty string', () => {
  const result = validateLLMOutput(validLLMOutput({ name: '' }));
  assert.equal(result.success, false);
});

test('validateLLMOutput: rejects valueScore out of range', () => {
  const result = validateLLMOutput(validLLMOutput({ valueScore: 15 }));
  assert.equal(result.success, false);
});

test('validateLLMOutput: accepts null optional fields (brand, year, concentration)', () => {
  const result = validateLLMOutput(validLLMOutput({ brand: null, year: null, concentration: null }));
  assert.equal(result.success, true);
});

test('validateLLMOutput: accepts empty arrays for notes (graceful)', () => {
  const result = validateLLMOutput(validLLMOutput({ topNotes: [], heartNotes: [], baseNotes: [] }));
  assert.equal(result.success, true);
});

test('validateLLMOutput: rejects non-array keyMolecules', () => {
  const result = validateLLMOutput(validLLMOutput({ keyMolecules: 'not an array' }));
  assert.equal(result.success, false);
});

test('validateLLMOutput: rejects keyMolecule missing name', () => {
  const result = validateLLMOutput(validLLMOutput({
    keyMolecules: [{ effect: 'test', percentage: '10%' }],
  }));
  assert.equal(result.success, false);
});

test('validateLLMOutput: rejects similarFragrance with empty name', () => {
  const result = validateLLMOutput(validLLMOutput({
    similarFragrances: [{ name: '', brand: 'Chanel', reason: 'test', priceRange: 'luxury' }],
  }));
  assert.equal(result.success, false);
});

test('validateLLMOutput: accepts wearabilityScore of 0 (boundary)', () => {
  const result = validateLLMOutput(validLLMOutput({ wearabilityScore: 0 }));
  assert.equal(result.success, true);
});

// ---------------------------------------------------------------------------
// validateAnalysisInput tests
// ---------------------------------------------------------------------------

test('validateAnalysisInput: accepts text mode with input', () => {
  const result = validateAnalysisInput({ mode: 'text', input: 'Creed Aventus' });
  assert.equal(result.success, true);
});

test('validateAnalysisInput: accepts notes mode', () => {
  const result = validateAnalysisInput({ mode: 'notes', input: 'Bergamot, Lavanta' });
  assert.equal(result.success, true);
});

test('validateAnalysisInput: accepts image mode with imageBase64', () => {
  const result = validateAnalysisInput({ mode: 'image', imageBase64: 'base64data...' });
  assert.equal(result.success, true);
});

test('validateAnalysisInput: rejects invalid mode', () => {
  const result = validateAnalysisInput({ mode: 'video', input: 'test' });
  assert.equal(result.success, false);
});

test('validateAnalysisInput: rejects missing mode', () => {
  const result = validateAnalysisInput({ input: 'Sauvage' });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// formatZodError tests
// ---------------------------------------------------------------------------

test('formatZodError: returns readable string for missing field', () => {
  const result = validateLLMOutput({ name: '' });
  assert.equal(result.success, false);
  const msg = formatZodError(result.error);
  assert.ok(typeof msg === 'string');
  assert.ok(msg.length > 0);
});
