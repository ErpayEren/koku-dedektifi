import { getPublicMolecules } from '@/lib/catalog-public';

export function getWeekIndex(date = new Date()): number {
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor(utc / (7 * 24 * 60 * 60 * 1000));
}

export function getWeeklyMolecule(date = new Date()) {
  const molecules = getPublicMolecules();
  if (molecules.length === 0) return null;
  const index = Math.abs(getWeekIndex(date)) % molecules.length;
  return molecules[index];
}
