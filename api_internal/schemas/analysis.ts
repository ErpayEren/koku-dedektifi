import { z } from 'zod';

export const EvidenceLevelSchema = z.enum([
  'verified_component',
  'signature_molecule',
  'accord_component',
  'note_match',
  'inferred',
  'unverified',
]);

export const MoleculeSchema = z.object({
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

export const SimilarFragranceSchema = z.object({
  name: z.string().min(1),
  brand: z.string(),
  reason: z.string(),
  priceRange: z.string(),
});

/** Shape LLM is asked to return (matches buildAnalysisResponseSchema) */
export const LLMRawOutputSchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  family: z.enum([
    'Odunsu', 'Çiçeksi', 'Oryantal', 'Aromatik', 'Fougère',
    'Chypre', 'Aquatik', 'Gourmand', 'Deri', 'Oud',
    'Ciceksi', 'Taze', 'Fougere',
  ]).nullable().optional(),
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
    max: z.number().int(),
  }).nullable().optional(),
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

export const AnalysisInputSchema = z.object({
  mode: z.enum(['text', 'notes', 'image']),
  input: z.string().optional(),
  imageBase64: z.string().optional(),
});

export const AnalysisResultSchema = z.object({
  name: z.string(),
  brand: z.string().nullable().optional(),
  family: z.string().nullable().optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
  molecules: z.array(MoleculeSchema),
  similarFragrances: z.array(SimilarFragranceSchema),
  dataConfidence: z.object({
    hasDbMatch: z.boolean(),
    source: z.enum(['db', 'ai', 'cache']),
  }).optional(),
  cached: z.boolean().optional(),
});

export type EvidenceLevel = z.infer<typeof EvidenceLevelSchema>;
export type Molecule = z.infer<typeof MoleculeSchema>;
export type LLMRawOutput = z.infer<typeof LLMRawOutputSchema>;
export type AnalysisInput = z.infer<typeof AnalysisInputSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
