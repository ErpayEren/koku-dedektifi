'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { UI } from '@/lib/strings';
import type { InputMode } from '@/lib/client/types';
import { impactHaptic, pickNativeAnalysisPhoto } from '@/lib/mobile/capacitor';

const COACH_MARK_KEY = 'kd:coach-seen:v1';

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
  imagePreview: string;
  isAnalyzing: boolean;
  onModeChange: (mode: InputMode) => void;
  onTextChange: (value: string) => void;
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

  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 14.5l3.4-.8 7.7-7.7a1.8 1.8 0 1 0-2.5-2.5L4.9 11.2z" />
      <path d="M11.7 4.4l3.9 3.9" />
    </svg>
  );
}

function ModeHint({ mode }: { mode: InputMode }) {
  if (mode === 'photo') return <p className="text-[11px] text-muted">{UI.photoHelper}</p>;
  return <p className="text-[11px] text-muted">KÄ±sa bir tarif de yeterli: â€œodunsu ama Ã§ok aÄŸÄ±r deÄŸilâ€ gibi.</p>;
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
      className={`relative flex min-h-[72px] w-full min-w-0 shrink-0 items-center justify-center gap-2.5 px-4 py-3 text-center transition-colors md:min-h-[76px] md:gap-3 ${
        active ? 'text-cream' : 'text-muted hover:text-cream'
      }`}
    >
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border transition-colors md:h-11 md:w-11 ${
          active ? 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold' : 'border-white/[.08] text-muted'
        }`}
      >
        <ModeIcon mode={tabMode} />
      </span>
      <span className="min-w-0 text-center text-[10px] font-mono uppercase leading-[1.2] tracking-[.08em] md:text-[11px]">
        {label}
      </span>
      <span
        className={`absolute bottom-0 left-6 right-6 h-px transition-opacity md:left-8 md:right-8 ${
          active ? 'bg-[var(--gold-line)] opacity-100' : 'bg-transparent opacity-0'
        }`}
      />
    </button>
  );
}

function CoachMark({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="absolute -top-3 left-1/2 z-30 -translate-x-1/2 -translate-y-full"
      role="tooltip"
      aria-live="polite"
    >
      <div className="relative rounded-2xl border border-[var(--gold-line)] bg-[#1A1A0F] px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] max-w-[240px] text-center">
        <p className="text-[12px] font-medium text-cream leading-snug">
          ğŸ“¸ ÅiÅŸe fotoÄŸrafÄ±nÄ± Ã§ek,<br />hemen analiz edelim
        </p>
        <p className="mt-1 text-[10px] text-gold/70">En doÄŸru sonuÃ§ iÃ§in</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 text-[9px] font-mono uppercase tracking-wider text-white/30 hover:text-white/60 transition-colors"
          aria-label="Coach mark kapat"
        >
          Tamam, anladÄ±m
        </button>
        {/* Arrow */}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--gold-line)]" aria-hidden="true" />
      </div>
    </div>
  );
}

export function HeroInput({
  mode,
  textValue,
  imagePreview,
  isAnalyzing,
  onModeChange,
  onTextChange,
  onImageChange,
  onAnalyze,
  onChipPick,
}: HeroInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [compressedKb, setCompressedKb] = useState<number | null>(null);
  const [showCoachMark, setShowCoachMark] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(COACH_MARK_KEY);
      if (!seen) {
        const timer = setTimeout(() => setShowCoachMark(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  useEffect(() => {
    if (isAnalyzing) {
      textAreaRef.current?.blur();
    }
  }, [isAnalyzing]);

  function dismissCoachMark() {
    setShowCoachMark(false);
    try { localStorage.setItem(COACH_MARK_KEY, '1'); } catch { /* ignore */ }
  }

  const canAnalyze = useMemo(() => {
    if (isAnalyzing) return false;
    if (mode === 'photo') return imagePreview.length > 0;
    return textValue.trim().length > 2;
  }, [imagePreview, isAnalyzing, mode, textValue]);

  async function processImageData(dataUrl: string): Promise<void> {
    const compressed = await compressImage(dataUrl);
    setCompressedKb(compressed.sizeKb);
    onImageChange(compressed.dataUrl);
  }

  async function processImageFile(file: File): Promise<void> {
    const rawDataUrl = await readFileAsDataUrl(file);
    await processImageData(rawDataUrl);
  }

  async function handlePhotoTrigger(): Promise<void> {
    const nativeDataUrl = await pickNativeAnalysisPhoto();

    if (nativeDataUrl) {
      await processImageData(nativeDataUrl);
      return;
    }

    fileInputRef.current?.click();
  }

  const activeCharCount = textValue.length;

  const handleAnalyzeByEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canAnalyze) {
      void impactHaptic('medium');
      onAnalyze();
    }
  };

  return (
    <section id="hero-analysis" className="anim-up relative mx-auto w-full max-w-[920px] overflow-x-clip px-4 pb-7 pt-5 sm:px-5 md:px-12 md:pb-8 md:pt-12">
      <div className="pointer-events-none absolute left-1/2 top-[12rem] h-64 w-[20rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.15)_0%,_transparent_70%)] sm:w-[28rem] md:w-[36rem]" />

      <div className="mb-3 flex items-center gap-2.5 md:mb-5">
        <div className="h-px w-7 bg-[var(--gold-line)]" />
        <span className="text-[10px] font-mono uppercase tracking-[.16em] text-muted">{UI.heroEyebrow}</span>
      </div>

      <div className="md:hidden">
        <div className="mb-4 rounded-[24px] border border-white/[.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] px-4 py-4 shadow-[0_20px_40px_rgba(0,0,0,.24)]">
          <h1 className="text-[1.9rem] font-semibold leading-[1.02] tracking-[-0.02em] text-cream">
            {UI.heroTitle} <span className="text-gold">{UI.heroTitleItalic}</span>
          </h1>
          <p className="mt-3 max-w-[32ch] text-[13px] leading-relaxed text-muted">{UI.heroSubtitle}</p>
        </div>
      </div>

      <div className="hidden md:block">
        <h1 className="mb-3 text-[2rem] font-semibold leading-[1.06] tracking-[-0.01em] text-cream md:text-[3rem]">
          {UI.heroTitle}
          <br />
          <span className="text-gold">{UI.heroTitleItalic}</span>
        </h1>
        <p className="mb-8 max-w-[620px] text-[13px] text-muted">{UI.heroSubtitle}</p>
      </div>

      <div className="glass-panel input-card overflow-hidden rounded-2xl shadow-[0_26px_54px_rgba(0,0,0,.44)]">
        <div className="grid grid-cols-2 items-stretch border-b border-white/[.06] bg-black/10">
          <div className="relative border-r border-white/[.06]">
            {showCoachMark ? <CoachMark onDismiss={dismissCoachMark} /> : null}
            <TabButton tabMode="photo" activeMode={mode} onClick={() => { onModeChange('photo'); dismissCoachMark(); }} label={UI.photoTab} />
          </div>
          <div>
            <TabButton tabMode="text" activeMode={mode} onClick={() => { onModeChange('text'); dismissCoachMark(); }} label={UI.textTab} />
          </div>
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
                onClick={() => {
                  void impactHaptic('light');
                  void handlePhotoTrigger();
                }}
                className="flex h-[98px] w-[98px] items-center justify-center rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold transition-colors hover:bg-gold/20"
                aria-label="FotoÄŸraf seÃ§"
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
                    alt="SeÃ§ilen gÃ¶rsel"
                    width={840}
                    height={328}
                    unoptimized
                    className="h-[164px] w-full rounded-xl border border-white/[.08] object-cover shadow-[0_16px_30px_rgba(0,0,0,.32)]"
                  />
                  {compressedKb ? (
                    <span className="absolute left-3 top-3 rounded-full border border-[var(--gold-line)] bg-black/55 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.06em] text-gold">
                      SÄ±kÄ±ÅŸtÄ±rÄ±ldÄ±: {compressedKb} KB
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
                disabled={isAnalyzing}
                onChange={(event) => onTextChange(event.target.value)}
                onKeyDown={handleAnalyzeByEnter}
                className="min-h-[164px] w-full resize-none rounded-xl border border-white/[.07] bg-transparent p-4 text-[1rem] text-cream outline-none placeholder:text-hint focus:border-[var(--gold-line)] disabled:cursor-not-allowed disabled:opacity-60 md:p-5"
                placeholder={UI.textPlaceholder}
              />
              <div className="mt-2 text-right text-[10px] font-mono text-hint">{activeCharCount} / 500</div>
            </div>
          ) : null}

        </div>

        <div className="space-y-4 border-t border-white/[.06] px-4 py-4 md:px-6">
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
                    textAreaRef.current?.focus();
                  });
                }}
                className="suggestion-chip rounded-full border border-white/[.08] px-3 py-1.5 text-[10px] font-mono tracking-[.06em] text-muted transition-colors hover:border-[var(--gold-line)] hover:text-cream"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <div className="rounded-full border border-white/[.06] bg-white/[.02] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.12em] text-white/45 md:hidden">
              Enter ile hÄ±zlÄ± baÅŸlat
            </div>
            <button
              type="button"
              onClick={() => {
                void impactHaptic('medium');
                onAnalyze();
              }}
              disabled={!canAnalyze}
              aria-busy={isAnalyzing}
              aria-label={isAnalyzing ? 'Analiz yapÄ±lÄ±yor, lÃ¼tfen bekleyin' : 'Kokuyu analiz et'}
              className={`analyze-btn ${isAnalyzing ? 'loading' : ''} flex w-full items-center justify-center gap-2 rounded-[16px] px-6 py-3.5 text-[11px] font-mono uppercase tracking-[.1em] transition-all md:ml-auto md:w-auto md:self-end ${
                canAnalyze
                  ? 'btn-primary-pulse bg-gold text-bg shadow-[0_14px_34px_rgba(201,169,110,.24)] hover:bg-[#d4b478]'
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
      </div>
    </section>
  );
}
