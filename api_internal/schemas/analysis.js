'use strict';

const { z } = require('zod');

const EvidenceLevelSchema = z.enum([
  'verified_component',
  'signature_molecule',
  'accord_component',
  'note_match',
  'inferred',
  'unverified',
]);

const MoleculeSchema = z.object({
  name: z.string().min(1),
  smiles: z.string().nullable().optional(),
  formula: z.string().nullable().optional(),
  family: z.string().nullable().optional(),
  origin: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  contribution: z.string().nullable().optional(),
  effect: z.string().nullable().optional(),
  percentage: z.string().nullable().optional(),
  evidenceLevel: EvidenceLevelSchema.nullable().optional(),
  evidenceLabel: z.string().nullable().optional(),
  evidenceReason: z.string().nullable().optional(),
  matchedNotes: z.array(z.string()).nullable().optional(),
});

const SimilarFragranceSchema = z.object({
  name: z.string().min(1),
  brand: z.string(),
  reason: z.string(),
  priceRange: z.string(),
});

const LLMRawOutputSchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  family: z.string().nullable().optional(),
  concentration: z.string().nullable().optional(),
  topNotes: z.array(z.string()),
  heartNotes: z.array(z.string()),
  baseNotes: z.array(z.string()),
  keyMolecules: z.array(z.object({
    name: z.string(),
    effect: z.string(),
    percentage: z.string(),
  })),
  sillage: z.string(),
  longevityHours: z.object({
    min: z.number().int(),
    max: z.number().int().optional(),
  }).nullable().optional(),
  confidenceScore: z.number().int().min(0).max(100).optional(),
  seasons: z.array(z.string()),
  occasions: z.array(z.string()),
  ageProfile: z.string().nullable().optional(),
  genderProfile: z.string(),
  moodProfile: z.string(),
  expertComment: z.string(),
  layeringTip: z.string(),
  applicationTip: z.string(),
  similarFragrances: z.array(SimilarFragranceSchema),
  valueScore: z.number().int().min(0).max(10),
  uniquenessScore: z.number().int().min(0).max(10),
  wearabilityScore: z.number().int().min(0).max(10),
});

const AnalysisInputSchema = z.object({
  mode: z.enum(['text', 'notes', 'image']),
  input: z.string().optional(),
  imageBase64: z.string().optional(),
});

/** Validate LLM raw output. Returns { success, data, error }. */
function validateLLMOutput(raw) {
  return LLMRawOutputSchema.safeParse(raw);
}

/** Validate incoming analyze request body. */
function validateAnalysisInput(body) {
  return AnalysisInputSchema.safeParse(body);
}

/** Format Zod errors into a human-readable string. */
function formatZodError(zodError) {
  const issues = zodError.issues || [];
  return issues
    .map((e) => `${(e.path || []).join('.')}: ${e.message}`)
    .join(', ');
}

module.exports = {
  EvidenceLevelSchema,
  MoleculeSchema,
  SimilarFragranceSchema,
  LLMRawOutputSchema,
  AnalysisInputSchema,
  validateLLMOutput,
  validateAnalysisInput,
  formatZodError,
};
