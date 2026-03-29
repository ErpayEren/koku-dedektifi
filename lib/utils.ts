import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function intensityDots(value: number, max = 5) {
  return Array.from({ length: max }, (_, i) => i < value);
}

export function similarityColor(pct: number): string {
  if (pct >= 90) return 'var(--gold)';
  if (pct >= 75) return 'var(--sage)';
  return 'var(--muted)';
}

export function formatDateTR(date: Date | string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

