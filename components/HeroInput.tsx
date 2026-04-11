'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { UI } from '@/lib/strings';
import type { InputMode } from '@/lib/client/types';

const QUICK_CHIPS = [
  UI.chipSauvage,
  UI.chipAventus,
  UI.chipFireplace,
  UI.chipOudRose,
  UI.chipCleanSea,
  UI.chipVanillaAmber,
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
  onImageChange: (dataUrl: string) => void;
  onAnalyze: () => void;
  onChipPick: (chip: string) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Görsel okunamadı.'));
    reader.readAsDataURL(file);
  });
}

export async function compressImage(
  dataUrl: string,
  maxPx = 1024,
  quality = 0.82,
): Promise<{ dataUrl: string; sizeKb: number }> {
  const image = new window.Image();
  image.decoding = 'async';
  image.src = dataUrl;
  await image.decode();

  const scale = Math.min(1, maxPx / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    const roughKb = Math.max(1, Math.round((dataUrl.length * 3) / 4 / 1024));
    return { dataUrl, sizeKb: roughKb };
  }

  context.drawImage(image, 0, 0, width, height);
  const output = canvas.toDataURL('image/jpeg', quality);
  const base64 = output.split(',')[1] || '';
  const sizeKb = Math.max(1, Math.round((base64.length * 3) / 4 / 1024));
  return { dataUrl: output, sizeKb };
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
    return <p className="text-[11px] text-muted">{UI.photoHelper}</p>;
  }

  if (mode === 'notes') {
    return <p className="text-[11px] text-muted">{UI.notesHelper}</p>;
  }

  return <p className="text-[11px] text-muted">Kısa bir tarif de yeterli: “odunsu ama çok ağır değil” gibi.</p>;
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
      className={`relative flex min-h-[72px] w-[44%] min-w-[132px] shrink-0 flex-col items-center justify-center gap-1.5 px-2 py-2 text-center transition-colors md:min-h-[62px] md:w-auto md:min-w-0 md:flex-1 md:flex-row md:gap-2 ${
        active ? 'text-cream' : 'text-muted hover:text-cream'
      }`}
    >
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors md:h-8 md:w-8 ${
          active ? 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold' : 'border-white/[.08] text-muted'
        }`}
      >
        <ModeIcon mode={tabMode} />
      </span>
      <span className="min-w-0 max-w-[80px] text-center text-[9.5px] font-mono uppercase leading-[1.25] tracking-[.08em] md:max-w-none md:text-[11px]">
        {label}
      </span>
      <span
        className={`absolute bottom-0 left-3 right-3 h-px transition-opacity ${
          active ? 'bg-[var(--gold-line)] opacity-100' : 'bg-transparent opacity-0'
        }`}
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
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const notesAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [compressedKb, setCompressedKb] = useState<number | null>(null);

  const canAnalyze = useMemo(() => {
    if (isAnalyzing) return false;
    if (mode === 'photo') return imagePreview.length > 0;
    if (mode === 'notes') return notesValue.trim().length > 2;
    return textValue.trim().length > 2;
  }, [imagePreview, isAnalyzing, mode, notesValue, textValue]);

  async function processImageFile(file: File): Promise<void> {
    const rawDataUrl = await readFileAsDataUrl(file);
    const compressed = await compressImage(rawDataUrl);
    setCompressedKb(compressed.sizeKb);
    onImageChange(compressed.dataUrl);
  }

  const activeCharCount = mode === 'notes' ? notesValue.length : textValue.length;

  return (
    <section id="hero-analysis" className="anim-up relative mx-auto w-full max-w-[920px] overflow-x-clip px-5 pb-8 pt-8 md:px-12 md:pt-12">
      <div className="pointer-events-none absolute left-1/2 top-[12rem] h-64 w-[20rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.15)_0%,_transparent_70%)] sm:w-[28rem] md:w-[36rem]" />
      <div className="mb-5 flex items-center gap-2.5">
        <div className="h-px w-7 bg-[var(--gold-line)]" />
        <span className="text-[10px] font-mono uppercase tracking-[.16em] text-muted">{UI.heroEyebrow}</span>
      </div>

      <h1 className="mb-3 text-[2rem] font-semibold leading-[1.06] tracking-[-0.01em] text-cream md:text-[3rem]">
        {UI.heroTitle}
        <br />
        <span className="text-gold">{UI.heroTitleItalic}</span>
      </h1>
      <p className="mb-8 max-w-[620px] text-[13px] text-muted">{UI.heroSubtitle}</p>

      <div className="glass-panel input-card overflow-hidden rounded-2xl shadow-[0_26px_54px_rgba(0,0,0,.44)]">
        <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-white/[.06] bg-black/10 px-2 md:grid md:grid-cols-3 md:gap-0 md:px-0">
          <TabButton tabMode="photo" activeMode={mode} onClick={() => onModeChange('photo')} label={UI.photoTab} />
          <TabButton tabMode="text" activeMode={mode} onClick={() => onModeChange('text')} label={UI.textTab} />
          <TabButton tabMode="notes" activeMode={mode} onClick={() => onModeChange('notes')} label={UI.notesTab} />
        </div>

        <div className="min-h-[230px] p-5 md:p-6">
          {mode === 'photo' ? (
            <div
              role="region"
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setIsDragOver(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                const file = event.dataTransfer.files?.[0];
                if (!file) return;
                void processImageFile(file);
              }}
              className={`flex h-full flex-col items-center justify-center gap-4 rounded-2xl border p-4 transition-colors ${
                isDragOver
                  ? 'border-dashed border-[var(--gold-line)] bg-[var(--gold-dim)]/30'
                  : 'border-white/[.04] bg-white/[.01]'
              }`}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-[98px] w-[98px] items-center justify-center rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold transition-colors hover:bg-gold/20"
                aria-label="Fotoğraf seç"
              >
                <svg width="30" height="30" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.45">
                  <path d="M3 6.5h3l1.3-2h5.4l1.3 2h3v9.5H3z" />
                  <circle cx="10" cy="11.2" r="2.8" />
                </svg>
              </button>
              <p className="text-center text-[13px] text-muted">{UI.photoPlaceholder}</p>

              {imagePreview ? (
                <div className="relative w-full max-w-[420px]">
                  <Image
                    src={imagePreview}
                    alt="Seçilen görsel"
                    width={840}
                    height={328}
                    unoptimized
                    className="h-[164px] w-full rounded-xl border border-white/[.08] object-cover shadow-[0_16px_30px_rgba(0,0,0,.32)]"
                  />
                  {compressedKb ? (
                    <span className="absolute left-3 top-3 rounded-full border border-[var(--gold-line)] bg-black/55 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.06em] text-gold">
                      Sıkıştırıldı: {compressedKb} KB
                    </span>
                  ) : null}
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void processImageFile(file);
                }}
              />
            </div>
          ) : null}

          {mode === 'text' ? (
            <div>
              <textarea
                ref={textAreaRef}
                value={textValue}
                maxLength={500}
                onChange={(event) => onTextChange(event.target.value)}
                className="min-h-[164px] w-full resize-none rounded-xl border border-white/[.07] bg-transparent p-4 text-[1rem] text-cream outline-none placeholder:text-hint focus:border-[var(--gold-line)] md:p-5"
                placeholder={UI.textPlaceholder}
              />
              <div className="mt-2 text-right text-[10px] font-mono text-hint">{activeCharCount} / 500</div>
            </div>
          ) : null}

          {mode === 'notes' ? (
            <div>
              <textarea
                ref={notesAreaRef}
                value={notesValue}
                maxLength={500}
                onChange={(event) => onNotesChange(event.target.value)}
                className="min-h-[164px] w-full resize-none rounded-xl border border-white/[.07] bg-transparent p-4 text-[1rem] text-cream outline-none placeholder:text-hint focus:border-[var(--gold-line)] md:p-5"
                placeholder={UI.notesPlaceholder}
              />
              <div className="mt-2 text-right text-[10px] font-mono text-hint">{activeCharCount} / 500</div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 border-t border-white/[.06] px-5 py-4 md:px-6">
          <ModeHint mode={mode} />

          <div className="flex items-center gap-2.5">
            <div className="h-px w-5 bg-[var(--gold-line)]" />
            <span className="text-[10px] font-mono uppercase tracking-[.14em] text-muted">{UI.chipSectionLabel}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  onChipPick(chip);
                  window.requestAnimationFrame(() => {
                    if (mode === 'notes') {
                      notesAreaRef.current?.focus();
                      return;
                    }
                    textAreaRef.current?.focus();
                  });
                }}
                className="suggestion-chip rounded-full border border-white/[.08] px-3 py-1.5 text-[10px] font-mono tracking-[.06em] text-muted transition-colors hover:border-[var(--gold-line)] hover:text-cream"
              >
                {chip}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={!canAnalyze}
            aria-busy={isAnalyzing}
            aria-label={isAnalyzing ? 'Analiz yapılıyor, lütfen bekleyin' : 'Kokuyu analiz et'}
            className={`analyze-btn ${isAnalyzing ? 'loading' : ''} flex w-full items-center justify-center gap-2 rounded-[10px] px-6 py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-all md:ml-auto md:w-auto md:self-end ${
              canAnalyze
                ? 'btn-primary-pulse bg-gold text-bg shadow-[0_10px_30px_rgba(201,169,110,.28)] hover:bg-[#d4b478]'
                : 'cursor-not-allowed border border-white/[.08] bg-white/[.04] text-muted'
            }`}
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 24" strokeLinecap="round" />
                </svg>
                <span>Analiz ediliyor...</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" />
                  <circle cx="6" cy="6" r="2" fill="currentColor" />
                </svg>
                <span>{UI.analyzeBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
