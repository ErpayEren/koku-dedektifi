'use client';

import { useMemo, useRef } from 'react';
import { UI } from '@/lib/strings';
import type { InputMode } from '@/lib/client/types';

const QUICK_CHIPS = [
  'Dior Sauvage',
  'Creed Aventus',
  'By the Fireplace',
  'Oud + Gül',
  'Temiz Deniz',
  'Vanilya + Amber',
];

interface HeroInputProps {
  mode: InputMode;
  textValue: string;
  notesValue: string;
  imagePreview: string;
  isAnalyzing: boolean;
  onModeChange: (mode: InputMode) => void;
  onTextChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onImageChange: (file: File) => void;
  onAnalyze: () => void;
  onChipPick: (chip: string) => void;
}

function ModeIcon({ mode }: { mode: InputMode }) {
  if (mode === 'photo') {
    return (
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 6.5h3l1.3-2h5.4l1.3 2h3v9.5H3z" />
        <circle cx="10" cy="11.2" r="2.8" />
      </svg>
    );
  }
  if (mode === 'notes') {
    return (
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 5.5h12M4 10h12M4 14.5h8" />
        <circle cx="15.5" cy="14.5" r="1.3" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 14.5l3.4-.8 7.7-7.7a1.8 1.8 0 1 0-2.5-2.5L4.9 11.2z" />
      <path d="M11.7 4.4l3.9 3.9" />
    </svg>
  );
}

function ModeHint({ mode }: { mode: InputMode }) {
  if (mode === 'photo') {
    return <p className="text-[11px] text-muted">Şişe, kutu veya ortam fotoğrafı yükle. Sistem görselden profil çıkarır.</p>;
  }
  if (mode === 'notes') {
    return <p className="text-[11px] text-muted">Notaları virgülle gir. Örnek: tütün, vanilya, bergamot, paçuli.</p>;
  }
  return <p className="text-[11px] text-muted">Kısa bir metin de yeterli: “odunsu ama çok ağır değil” gibi.</p>;
}

function TabButton({
  tabMode,
  activeMode,
  onClick,
  label,
}: {
  tabMode: InputMode;
  activeMode: InputMode;
  onClick: () => void;
  label: string;
}) {
  const active = tabMode === activeMode;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 min-h-[60px] px-2.5 flex items-center justify-center gap-2 transition-colors
      ${active ? 'text-cream' : 'text-muted hover:text-cream'}`}
    >
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors shrink-0
        ${active ? 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold' : 'border-white/[.08] text-muted'}`}
      >
        <ModeIcon mode={tabMode} />
      </span>
      <span className="text-center text-[10px] md:text-[12px] font-mono tracking-[.08em] uppercase leading-[1.15] min-w-0">
        {label}
      </span>
      <span
        className={`absolute left-3 right-3 bottom-0 h-px transition-opacity
        ${active ? 'bg-[var(--gold-line)] opacity-100' : 'bg-transparent opacity-0'}`}
      />
    </button>
  );
}

export function HeroInput({
  mode,
  textValue,
  notesValue,
  imagePreview,
  isAnalyzing,
  onModeChange,
  onTextChange,
  onNotesChange,
  onImageChange,
  onAnalyze,
  onChipPick,
}: HeroInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canAnalyze = useMemo(() => {
    if (isAnalyzing) return false;
    if (mode === 'photo') return imagePreview.length > 0;
    if (mode === 'notes') return notesValue.trim().length > 2;
    return textValue.trim().length > 2;
  }, [imagePreview, isAnalyzing, mode, notesValue, textValue]);

  return (
    <section className="max-w-[920px] mx-auto w-full px-5 md:px-12 pt-8 md:pt-12 pb-8 anim-up">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-px bg-[var(--gold-line)]" />
        <span className="text-[10px] font-mono tracking-[.16em] uppercase text-muted">Premium analiz modu</span>
      </div>

      <h1 className="font-display italic text-cream leading-[1.06] tracking-[-0.01em] text-[2rem] md:text-[3rem] mb-3">
        Kokuyu anlat,
        <br />
        <span className="text-gold not-italic">detayıyla çözümleyelim.</span>
      </h1>
      <p className="text-[13px] text-muted max-w-[620px] mb-8">
        Fotoğraf, metin veya nota listesiyle başla. Analiz tamamlanınca karşılaştırma, katmanlama ve dolap
        aksiyonları otomatik aktif olur.
      </p>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-[0_26px_54px_rgba(0,0,0,.44)]">
        <div className="grid grid-cols-3 border-b border-white/[.06] bg-black/10">
          <TabButton tabMode="photo" activeMode={mode} onClick={() => onModeChange('photo')} label={UI.photoTab} />
          <TabButton tabMode="text" activeMode={mode} onClick={() => onModeChange('text')} label={UI.textTab} />
          <TabButton tabMode="notes" activeMode={mode} onClick={() => onModeChange('notes')} label={UI.notesTab} />
        </div>

        <div className="p-5 md:p-6 min-h-[230px]">
          {mode === 'photo' ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-[98px] h-[98px] rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]
                           hover:bg-gold/20 transition-colors flex items-center justify-center text-gold"
                aria-label="Fotoğraf seç"
              >
                <svg width="30" height="30" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.45">
                  <path d="M3 6.5h3l1.3-2h5.4l1.3 2h3v9.5H3z" />
                  <circle cx="10" cy="11.2" r="2.8" />
                </svg>
              </button>
              <p className="text-[13px] text-muted text-center">{UI.photoPlaceholder}</p>

              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Seçilen görsel"
                  className="w-full max-w-[420px] h-[164px] object-cover rounded-xl border border-white/[.08] shadow-[0_16px_30px_rgba(0,0,0,.32)]"
                />
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onImageChange(file);
                }}
              />
            </div>
          ) : null}

          {mode === 'text' ? (
            <textarea
              value={textValue}
              onChange={(event) => onTextChange(event.target.value)}
              className="w-full bg-transparent border border-white/[.07] rounded-xl p-4 md:p-5 outline-none focus:border-[var(--gold-line)]
                         font-display italic text-[1.1rem] text-cream min-h-[164px] resize-none placeholder:text-hint"
              placeholder={UI.textPlaceholder}
            />
          ) : null}

          {mode === 'notes' ? (
            <textarea
              value={notesValue}
              onChange={(event) => onNotesChange(event.target.value)}
              className="w-full bg-transparent border border-white/[.07] rounded-xl p-4 md:p-5 outline-none focus:border-[var(--gold-line)]
                         font-display italic text-[1.08rem] text-cream min-h-[164px] resize-none placeholder:text-hint"
              placeholder={UI.notesPlaceholder}
            />
          ) : null}
        </div>

        <div className="border-t border-white/[.06] px-5 md:px-6 py-4 space-y-4">
          <ModeHint mode={mode} />

          <div className="flex flex-wrap gap-2">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onChipPick(chip)}
                className="text-[10px] font-mono tracking-[.06em] px-3 py-1.5 border border-white/[.08] rounded-full
                           text-muted hover:text-cream hover:border-[var(--gold-line)] transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={!canAnalyze}
            className={`w-full md:w-auto md:self-end md:ml-auto flex items-center justify-center gap-2 px-6 py-3 rounded-[10px]
                        text-[11px] font-mono tracking-[.1em] uppercase transition-all
            ${
              canAnalyze
                ? 'btn-primary-pulse bg-gold text-bg hover:bg-[#d4b478] shadow-[0_10px_30px_rgba(201,169,110,.28)]'
                : 'bg-white/[.04] text-muted cursor-not-allowed border border-white/[.08]'
            }`}
          >
            {isAnalyzing ? UI.analyzing : UI.analyzeBtn}
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 6h8M7 3l3 3-3 3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
