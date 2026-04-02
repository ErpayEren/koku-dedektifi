'use client';

import { FLAVOR_NOTE_GROUPS } from '@/lib/brewno';

interface FlavorNoteTagProps {
  note: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  onClick?: () => void;
}

interface NoteTheme {
  bgInactive: string;
  bgActive: string;
  text: string;
}

const NOTE_THEMES: Record<string, NoteTheme> = {
  Fruity:     { bgInactive: 'rgba(245,158,11,0.15)',  bgActive: 'rgba(245,158,11,0.35)',  text: '#f59e0b' },
  Floral:     { bgInactive: 'rgba(167,139,250,0.15)', bgActive: 'rgba(167,139,250,0.35)', text: '#a78bfa' },
  Chocolate:  { bgInactive: 'rgba(120,53,15,0.30)',   bgActive: 'rgba(120,53,15,0.55)',   text: '#a16207' },
  Nutty:      { bgInactive: 'rgba(180,120,60,0.20)',  bgActive: 'rgba(180,120,60,0.45)',  text: '#d97706' },
  Sweet:      { bgInactive: 'rgba(201,169,110,0.20)', bgActive: 'rgba(201,169,110,0.45)', text: '#c9a96e' },
  Spiced:     { bgInactive: 'rgba(239,68,68,0.15)',   bgActive: 'rgba(239,68,68,0.35)',   text: '#ef4444' },
  'Tea-like': { bgInactive: 'rgba(126,184,164,0.15)', bgActive: 'rgba(126,184,164,0.35)', text: '#7eb8a4' },
  Savory:     { bgInactive: 'rgba(107,114,128,0.20)', bgActive: 'rgba(107,114,128,0.45)', text: '#9ca3af' },
};

const DEFAULT_THEME: NoteTheme = {
  bgInactive: 'rgba(255,255,255,0.07)',
  bgActive:   'rgba(255,255,255,0.15)',
  text:       'rgba(255,255,255,0.6)',
};

function getNoteTheme(note: string): NoteTheme {
  const lowerNote = note.toLowerCase();
  for (const [group, notes] of Object.entries(FLAVOR_NOTE_GROUPS)) {
    if (notes.includes(lowerNote)) {
      return NOTE_THEMES[group] ?? DEFAULT_THEME;
    }
  }
  return DEFAULT_THEME;
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function FlavorNoteTag({ note, size = 'md', active = false, onClick }: FlavorNoteTagProps) {
  const theme = getNoteTheme(note);

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
        background: active ? theme.bgActive : theme.bgInactive,
        color: theme.text,
        border: `1px solid ${theme.text}22`,
      }}
    >
      {note}
    </button>
  );
}
