import type {
  FragranceCatalogRow,
  FragranceMoleculeEvidenceRow,
  MoleculeCatalogRow,
  MoleculeEvidenceLevel,
} from '@/lib/server/catalog-types';

export interface EvidenceGraphStats {
  fragranceCount: number;
  visibleMoleculeCount: number;
  allMoleculeCount: number;
  linkedRelationCount: number;
  zeroLinkHiddenCount: number;
}

export interface EvidenceMetaEntry {
  label: string;
  rank: number;
  color: string;
}

export interface BuildEvidenceGraphArgs {
  fragrances: unknown[];
  molecules: unknown[];
  noteMap: Record<string, string[]>;
  curatedSeed: unknown;
}

export interface EvidenceGraphResult {
  molecules: MoleculeCatalogRow[];
  allMolecules: MoleculeCatalogRow[];
  fragrances: FragranceCatalogRow[];
  relations: FragranceMoleculeEvidenceRow[];
  aliasToCanonical: Record<string, string>;
  iconicMoleculeSlugs: string[];
  stats: EvidenceGraphStats;
}

export const ICONIC_MOLECULES: Set<string>;
export const EVIDENCE_META: Record<MoleculeEvidenceLevel, EvidenceMetaEntry>;
export function normalizeText(value: string): string;
export function buildEvidenceGraph(args: BuildEvidenceGraphArgs): EvidenceGraphResult;
export function resolveEvidence(level: MoleculeEvidenceLevel): EvidenceMetaEntry;
