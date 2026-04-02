'use client';

import { FLAVOR_NOTE_GROUPS } from '@/lib/brewno';

interface FlavorNoteTagProps {
  note: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  onClick?: () => void;
}

// Determine color group for a note
function getNoteColor(note: string): string {
  const lowerNote = note.toLowerCase();
  for (const [group, notes] of Object.entries(FLAVOR_NOTE_GROUPS)) {
    if (notes.includes(lowerNote)) {
      const colorMap: Record<string, string> = {
        Fruity:    'rgba(245,158,11,0.15)',
        Floral:    'rgba(167,139,250,0.15)',
        Chocolate: 'rgba(120,53,15,0.3)',
        Nutty:     'rgba(180,120,60,0.2)',
        Sweet:     'rgba(201,169,110,0.2)',
        Spiced:    'rgba(239,68,68,0.15)',
        'Tea-like': 'rgba(126,184,164,0.15)',
        Savory:    'rgba(107,114,128,0.2)',
      };
      return colorMap[group] ?? 'rgba(255,255,255,0.07)';
    }
  }
  return 'rgba(255,255,255,0.07)';
}

function getNoteTextColor(note: string): string {
  const lowerNote = note.toLowerCase();
  for (const [group, notes] of Object.entries(FLAVOR_NOTE_GROUPS)) {
    if (notes.includes(lowerNote)) {
      const colorMap: Record<string, string> = {
        Fruity:    '#f59e0b',
        Floral:    '#a78bfa',
        Chocolate: '#a16207',
        Nutty:     '#d97706',
        Sweet:     '#c9a96e',
        Spiced:    '#ef4444',
        'Tea-like': '#7eb8a4',
        Savory:    '#9ca3af',
      };
      return colorMap[group] ?? 'rgba(255,255,255,0.6)';
    }
  }
  return 'rgba(255,255,255,0.6)';
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function FlavorNoteTag({ note, size = 'md', active = false, onClick }: FlavorNoteTagProps) {
  const bg = getNoteColor(note);
  const textColor = getNoteTextColor(note);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center rounded-full capitalize transition-all duration-200
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default'}
        ${active ? 'ring-1' : ''}
      `}
      style={{
        background: active ? `${bg.replace('0.15', '0.35').replace('0.2', '0.4')}` : bg,
        color: textColor,
        border: `1px solid ${textColor}22`,
      }}
    >
      {note}
    </button>
  );
}
