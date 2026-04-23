'use client';

import { UI } from '@/lib/strings';

interface ActionBarProps {
  hasResult: boolean;
  disabled: boolean;
  wardrobeAdded: boolean;
  onAddWardrobe: () => void;
  onCompare: () => void;
  onLayer: () => void;
  onSave: () => void;
}

function ActionBtn({
  label,
  onClick,
  disabled,
  active = false,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  active?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-[9px] text-[12px] font-mono tracking-[.06em] whitespace-nowrap transition-all
      ${
        disabled
          ? 'text-muted border border-white/[.08] bg-white/[.02] cursor-not-allowed'
          : active
            ? 'border border-amber-500/35 bg-amber-500/18 text-gold shadow-[0_0_0_1px_rgba(201,169,110,.18),0_10px_24px_rgba(201,169,110,.16)]'
            : 'text-cream border border-white/[.1] hover:border-[var(--gold-line)] hover:bg-[var(--gold-dim)] hover:-translate-y-[1px] active:translate-y-0'
      }`}
    >
      <span className="inline-flex items-center justify-center w-[14px] h-[14px] text-current">{icon}</span>
      {label}
    </button>
  );
}

export function ActionBar({ hasResult, disabled, wardrobeAdded, onAddWardrobe, onCompare, onLayer, onSave }: ActionBarProps) {
  if (!hasResult) return null;

  return (
    <div
      className="sticky bottom-[var(--mobile-nav-h)] z-20 flex flex-wrap items-center gap-2 border-t border-white/[.06] bg-bg/90 px-5 py-3.5 backdrop-blur-xl md:bottom-0 md:px-12 anim-up-2"
    >
      <ActionBtn
        label={wardrobeAdded ? 'Dolaba Eklendi' : UI.addToWardrobe}
        onClick={onAddWardrobe}
        disabled={disabled}
        active={wardrobeAdded}
        icon={(
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7">
            {wardrobeAdded ? <path d="M2.2 6.4 4.8 9 9.8 3.6" /> : <path d="M6 2v8M2 6h8" />}
          </svg>
        )}
      />
      <ActionBtn
        label={UI.compareBtn}
        onClick={onCompare}
        disabled={disabled}
        icon={(
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M2 3h8M2 9h8M4 1v4M8 7v4" />
          </svg>
        )}
      />
      <ActionBtn
        label={UI.layerBtn}
        onClick={onLayer}
        disabled={disabled}
        icon={(
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M2 5.2 6 2l4 3.2L6 8.4 2 5.2Z" />
            <path d="M2 7.2 6 10l4-2.8" />
          </svg>
        )}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={onSave}
        className={`inline-flex items-center gap-2 rounded-md px-4 py-[9px] text-[12px] font-mono uppercase tracking-[.08em] whitespace-nowrap transition-all
        ${
          disabled
            ? 'text-muted border border-white/[.08] bg-white/[.02] cursor-not-allowed'
            : 'text-bg bg-gold hover:bg-[#d6b372] shadow-[0_10px_25px_rgba(201,169,110,.28)] hover:-translate-y-[1px] active:translate-y-0'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0">
          <path d="M6 2v6M3.5 5.5 6 8l2.5-2.5" />
          <path d="M2 10h8" />
        </svg>
        {UI.saveResult}
      </button>
    </div>
  );
}
