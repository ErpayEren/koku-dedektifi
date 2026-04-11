'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { MoleculeData } from '@/components/MoleculeCard';
import { MoleculeVisual } from '@/components/MoleculeVisual';
import { ScentTimeline } from '@/components/ScentTimeline';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { ScentGlyph } from '@/components/ui/ScentGlyph';
import type { AnalysisResult } from '@/lib/client/types';
import { UI } from '@/lib/strings';
import {
  AnimatedPercent,
  ConfidenceRing,
  RadarWheel,
  SceneCell,
  SignalTelemetry,
  SimilarityArc,
  WheelMetricRail,
} from './primitives';
import { WHEEL_AXES, clampPercent, toList } from './utils';

interface PanelMotionProps {
  style: CSSProperties;
}

interface OverviewPanelProps extends PanelMotionProps {
  result: AnalysisResult;
  confidence: number;
  dataTrustBadge: {
    label: string;
    tone: 'verified' | 'database' | 'ai';
  };
  glowColor: string;
  season: string[];
  longevityScore: number;
  projectionScore: number;
  fitScore: number;
  signatureTags: string[];
  barsReady: boolean;
  shareBusy: boolean;
  onOpenShare: () => void;
}

export function OverviewPanel({
  result,
  confidence,
  dataTrustBadge,
  glowColor,
  season,
  longevityScore,
  projectionScore,
  fitScore,
  signatureTags,
  barsReady,
  shareBusy,
  onOpenShare,
  style,
}: OverviewPanelProps) {
  const badgeColor =
    dataTrustBadge.tone === 'verified' ? '#67d394' : dataTrustBadge.tone === 'database' ? '#7fb6ff' : '#9ca3af';
  const badgeIsAi = dataTrustBadge.tone === 'ai';

  return (
    <Card
      className="relative h-full overflow-hidden p-7 md:p-9"
      glow
      style={{
        ...style,
        backgroundImage: `radial-gradient(ellipse at top right, ${glowColor} 0%, transparent 60%)`,
      }}
    >
      <div className="absolute left-5 top-5">
        <button
          type="button"
          onClick={onOpenShare}
          disabled={shareBusy}
          className="rounded-full border border-white/[.08] bg-black/20 px-3 py-2 text-[10px] font-mono uppercase tracking-[.08em] text-muted transition-colors hover:border-[var(--gold-line)] hover:text-cream disabled:opacity-50"
        >
          {shareBusy ? 'Hazırlanıyor' : 'Paylaş'}
        </button>
      </div>

      <div className="absolute right-5 top-5">
        <ConfidenceRing pct={confidence} />
      </div>

      <CardTitle>{UI.detectedScent}</CardTitle>
      <div className="flex items-start gap-4 pr-20">
        <ScentGlyph
          token={result.iconToken}
          size={64}
          className="inline-flex items-center justify-center rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-[2rem] font-semibold leading-[1.02] text-cream md:text-[2.45rem]">{result.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[.12em] text-gold/85">
            {result.brand ? <span>{result.brand}</span> : null}
            {typeof result.year === 'number' ? <span>{result.year}</span> : null}
            {result.concentration ? <span>{result.concentration}</span> : null}
            <span className="text-gold">{result.family || 'Aromatik'}</span>
          </div>
          <div className="mt-2">
            <span
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] leading-none"
              style={{
                borderColor: 'var(--gold-line)',
                background: 'rgba(12,11,16,0.75)',
                color: badgeColor,
                fontStyle: badgeIsAi ? 'italic' : 'normal',
              }}
            >
              {dataTrustBadge.label}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-[.1em] text-muted">Yoğunluk</span>
          <span className="text-[12px] text-cream">{result.intensity}%</span>
        </div>
        <div className="h-[6px] overflow-hidden rounded-full bg-white/[.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#9f4f64] via-[#d97568] to-[#f0b267] transition-all duration-500 ease-out"
            style={{ width: `${result.intensity}%` }}
          />
        </div>
      </div>

      <div className="mt-6 border-t border-white/[.06] pt-5">
        <CardTitle>{UI.scentDescription}</CardTitle>
        <p className="text-[15px] leading-relaxed text-cream/95">
          {result.moodProfile || result.description || 'Açıklama şu an hazır değil.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {season.map((tag) => (
            <span key={tag} className="rounded-full border border-white/[.08] px-2.5 py-1.5 text-[10px] font-mono text-muted">
              {tag}
            </span>
          ))}
          {result.occasion ? (
            <span className="rounded-full border border-[var(--gold-line)] px-2.5 py-1.5 text-[10px] font-mono text-gold">
              {result.occasion}
            </span>
          ) : null}
        </div>
      </div>

      {result.expertComment ? (
        <div className="mt-5 rounded-[22px] border border-white/[.06] bg-black/10 px-5 py-4">
          <p className="text-[10px] font-mono uppercase tracking-[.14em] text-gold">Parfümör Yorumu</p>
          <p className="mt-3 text-[14px] leading-relaxed text-cream/90">{result.expertComment}</p>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-[20px] border border-white/[.06] bg-white/[.02] px-4 py-4">
          <p className="text-[10px] font-mono uppercase tracking-[.14em] text-gold">Katmanlama İpucu</p>
          <p className="mt-2 text-[13px] leading-relaxed text-cream/84">
            {result.layeringTip || 'Katmanlama önerisi şu an hazır değil.'}
          </p>
        </div>
        <div className="rounded-[20px] border border-white/[.06] bg-white/[.02] px-4 py-4">
          <p className="text-[10px] font-mono uppercase tracking-[.14em] text-gold">Uygulama İpucu</p>
          <p className="mt-2 text-[13px] leading-relaxed text-cream/84">
            {result.applicationTip || 'Uygulama önerisi şu an hazır değil.'}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-white/[.06] bg-black/10 p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <CardTitle>Koku Sahnesi</CardTitle>
          <span className="text-[10px] font-mono uppercase tracking-[.12em] text-gold">Canlı İz</span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[108px_minmax(0,1fr)] lg:items-center">
          <div className="relative z-10 mx-auto flex h-[108px] w-[108px] items-center justify-center overflow-hidden rounded-full border border-white/[.08] bg-white/[.02]">
            <div className="absolute inset-[22px] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,.24)_0%,rgba(167,139,250,.08)_54%,transparent_100%)]" />
            <div className="relative text-center">
              <p className="text-[9px] font-mono uppercase tracking-[.16em] text-muted">İz skoru</p>
              <p className="mt-2 text-[1.85rem] font-bold leading-none text-cream">
                <AnimatedPercent value={confidence} />
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SceneCell label="Duruş" value={result.persona?.vibe || 'Dengeli'} tone="#a78bfa" />
            <SceneCell label="An" value={result.occasion || 'Günlük'} tone="var(--gold)" />
            <SceneCell label="İz" value={season[0] || 'Dört mevsim'} tone="var(--sage)" />
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-white/[.06] pt-6">
        <CardTitle>İmza Sinyalleri</CardTitle>
        <SignalTelemetry
          longevity={longevityScore}
          projection={projectionScore}
          fit={fitScore}
          tags={signatureTags}
          barsReady={barsReady}
        />
      </div>
    </Card>
  );
}

interface DetailPanelProps extends PanelMotionProps {
  result: AnalysisResult;
  heartNotes: string[];
}

export function DetailPanel({ result, heartNotes, style }: DetailPanelProps) {
  return (
    <Card className="h-full p-6 content-auto-panel" style={style}>
      <ScentTimeline
        topNotes={toList(result.pyramid?.top, 6)}
        heartNotes={toList(heartNotes, 8)}
        baseNotes={toList(result.pyramid?.base, 8)}
        timeline={result.timeline}
      />
    </Card>
  );
}

interface SimilarPanelProps extends PanelMotionProps {
  similarItems: Array<{ name: string; similarity: number; brand?: string; reason?: string; priceRange?: string }>;
  hiddenSimilarCount: number;
  similarLimit: number;
  onAnalyzeSimilar: (name: string) => void;
}

export function SimilarPanel({
  similarItems,
  hiddenSimilarCount,
  similarLimit,
  onAnalyzeSimilar,
  style,
}: SimilarPanelProps) {
  return (
    <Card className="h-full p-6 content-auto-panel" style={style}>
      <CardTitle>{UI.similarScents}</CardTitle>
      <div className="flex flex-col gap-2">
        {similarItems.length > 0 ? (
          similarItems.map((item) => (
            <button
              key={`${item.name}-${item.similarity}`}
              type="button"
              onClick={() => onAnalyzeSimilar(item.brand ? `${item.brand} ${item.name}` : item.name)}
              className="similar-item w-full rounded-xl border border-white/[.08] px-3.5 py-3 text-left transition-all hover:border-[var(--gold-line)] hover:bg-[var(--gold-dim)]/45"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block truncate text-[14px] text-cream">
                    {item.brand ? `${item.brand} ${item.name}` : item.name}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted">
                    {item.reason || 'Bu profile göre yeniden analiz çalıştır.'}
                  </span>
                  {item.priceRange ? <span className="mt-1 block text-[10px] text-gold/75">{item.priceRange}</span> : null}
                </div>
                <SimilarityArc pct={item.similarity} />
              </div>
            </button>
          ))
        ) : (
          <p className="text-[12px] text-muted">Bu koku için benzer profil önerisi çıkmadı.</p>
        )}
      </div>

      {hiddenSimilarCount > 0 ? (
        <div className="mt-4 rounded-2xl border border-[var(--gold-line)]/35 bg-[var(--gold-dim)]/10 px-4 py-3">
          <p className="text-[10px] font-mono uppercase tracking-[.14em] text-gold">Pro ile Top 10</p>
          <p className="mt-2 text-[13px] leading-relaxed text-cream/82">
            {hiddenSimilarCount} benzer koku daha bulundu. Ücretsiz katmanda ilk {similarLimit} sonuç görünür.
          </p>
          <Link
            href="/paketler"
            className="mt-3 inline-flex rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/20 px-3 py-2 text-[10px] font-mono uppercase tracking-[.12em] text-gold transition-colors hover:bg-[var(--gold-dim)]/35"
          >
            Top 10&apos;u aç
          </Link>
        </div>
      ) : null}

    </Card>
  );
}

interface WheelPanelProps extends PanelMotionProps {
  wheelValues: number[];
  scores: {
    freshness: number;
    sweetness: number;
    warmth: number;
  };
  intensity: number;
  genderProfile?: string | null;
  occasionList?: string[];
  styleSuggestion?: string | null;
}

export function WheelPanel({
  wheelValues,
  scores,
  intensity,
  genderProfile,
  occasionList,
  styleSuggestion,
  style,
}: WheelPanelProps) {
  const normalizedGender = String(genderProfile || '')
    .toLocaleLowerCase('tr-TR')
    .trim();
  const genderRecommendation = normalizedGender.includes('mask')
    ? 'Erkek'
    : normalizedGender.includes('fem')
      ? 'Kadın'
      : 'Unisex';
  const suggestedOccasions = Array.isArray(occasionList) && occasionList.length > 0 ? occasionList.slice(0, 4) : ['Günlük'];
  const styleLine = (styleSuggestion || '').trim() || 'Kendine güvenli, modern ve dengeli bir karakter.';
  const metricRows = [
    { label: 'Tazelik', value: scores.freshness, tone: 'var(--sage)', note: scores.freshness >= 70 ? 'Canlı ve ferah' : 'Daha sakin ve yumuşak' },
    { label: 'Tatlılık', value: scores.sweetness, tone: '#d58ebb', note: scores.sweetness >= 60 ? 'Tatlı akor belirgin' : 'Tatlılık geri planda' },
    { label: 'Sıcaklık', value: scores.warmth, tone: '#d3a36a', note: scores.warmth >= 60 ? 'Sıcak ve sarmalayıcı' : 'Daha serin karakter' },
    { label: 'Yoğunluk', value: clampPercent(intensity, 65), tone: '#8ab8c0', note: intensity >= 70 ? 'Dolu ve hissedilir' : 'Daha havadar yoğunluk' },
  ];

  return (
    <Card className="flex h-full flex-col p-6 content-auto-panel" style={style}>
      <CardTitle>{UI.wheel}</CardTitle>
      <div className="mt-4 grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[176px_minmax(0,1fr)] xl:items-start">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center py-2">
            <RadarWheel values={wheelValues} />
          </div>
          <div className="mt-3 grid w-full grid-cols-2 gap-2">
            {WHEEL_AXES.map((axis) => (
              <div
                key={axis.label}
                className="flex items-center gap-2 rounded-full border border-white/[.07] px-3 py-2 text-[10px] font-mono uppercase tracking-[.08em] text-muted"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: axis.color }} />
                <span>{axis.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {metricRows.map((metric) => (
            <WheelMetricRail
              key={metric.label}
              label={metric.label}
              value={metric.value}
              tone={metric.tone}
              note={metric.note}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-white/[.06] pt-5">
          <CardTitle className="mb-3">Sana Yakışır mı?</CardTitle>
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-[16px] border border-white/[.07] bg-white/[.02] px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[.12em] text-muted">Cinsiyet önerisi</p>
              <p className="mt-2 text-[18px] font-semibold text-cream">{genderRecommendation}</p>
              <p className="mt-1 text-[12px] text-cream/76">Koku profilinde en doğal oturan kullanım yönü.</p>
            </div>

            <div className="rounded-[16px] border border-white/[.07] bg-white/[.02] px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[.12em] text-muted">Ortam önerisi</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestedOccasions.map((occasion) => (
                  <span
                    key={occasion}
                    className="rounded-full border border-[var(--gold-line)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.1em] text-gold"
                  >
                    {occasion}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[16px] border border-white/[.07] bg-white/[.02] px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[.12em] text-muted">Stil önerisi</p>
              <p className="mt-2 text-[13px] leading-relaxed text-cream/84">{styleLine}</p>
            </div>

          </div>
        </div>
    </Card>
  );
}

interface MoleculePanelProps extends PanelMotionProps {
  molecule: MoleculeData | null;
  moleculeData: MoleculeData[];
  moleculeSafeIndex: number;
  hiddenMoleculeCount: number;
  visibleMoleculeCount: number;
  allMoleculeData: MoleculeData[];
  barsReady: boolean;
  onSelectMolecule: (index: number) => void;
  onOpenMolecule: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onShare: () => Promise<void>;
  moleculeShareBusy: boolean;
}

export function MoleculePanel({
  molecule,
  moleculeData,
  moleculeSafeIndex,
  hiddenMoleculeCount,
  visibleMoleculeCount,
  allMoleculeData,
  barsReady,
  onSelectMolecule,
  onOpenMolecule,
  onPrev,
  onNext,
  onShare,
  moleculeShareBusy,
  style,
}: MoleculePanelProps) {
  return (
    <Card className="h-full p-6 content-auto-panel" style={style}>
      <CardTitle className="mb-4">{UI.keyMolecules}</CardTitle>
      {molecule ? (
        <div className="flex h-full flex-col">
          <button
            type="button"
            className="w-full rounded-[28px] border border-white/[.08] bg-[#0c0b10] p-4 text-left transition-colors hover:border-[var(--gold-line)]"
            onClick={() => onOpenMolecule(moleculeSafeIndex)}
            aria-label={`${molecule.name} molekül kartını aç`}
          >
            <MoleculeVisual name={molecule.name} smiles={molecule.smiles} formula={molecule.formula} compact />
          </button>

          <div className="mt-4 grid grid-cols-[30px_minmax(0,1fr)_30px] items-start gap-3">
            <button type="button" onClick={onPrev} className="icon-btn" disabled={moleculeSafeIndex === 0} aria-label="Önceki molekül">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8.8 2.3 4.2 7l4.6 4.7" />
              </svg>
            </button>

            <div className="min-w-0 text-center">
              {molecule.slug ? (
                <Link
                  href={`/molekuller/${molecule.slug}`}
                  className="mx-auto block max-w-[14ch] break-words text-[clamp(1.85rem,2.8vw,2.55rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-cream transition-colors hover:text-gold"
                >
                  {molecule.name}
                </Link>
              ) : (
                <p className="mx-auto max-w-[14ch] break-words text-[clamp(1.85rem,2.8vw,2.55rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-cream">
                  {molecule.name}
                </p>
              )}
              <p className="mt-2 break-words text-[12px] text-muted">
                {molecule.formula || 'Doğrulanmış formül yok'}
                {molecule.casNumber ? ` · CAS ${molecule.casNumber}` : ''}
              </p>
              <p className="mt-1 text-[11px] text-sage">{molecule.type || 'Molekül ailesi'}</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {molecule.evidenceLabel ? (
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.1em]"
                    style={{
                      color: molecule.evidenceAccent || 'var(--gold)',
                      background: `${molecule.evidenceAccent || 'var(--gold)'}15`,
                      border: `1px solid ${molecule.evidenceAccent || 'var(--gold)'}30`,
                    }}
                  >
                    {molecule.evidenceLabel}
                  </span>
                ) : null}
                <span className="rounded-full border border-white/[.08] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.1em] text-gold">
                  {molecule.traceStrengthLabel || 'Belirgin iz'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onNext}
              className="icon-btn"
              disabled={moleculeSafeIndex >= moleculeData.length - 1}
              aria-label="Sonraki molekül"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5.2 2.3 9.8 7l-4.6 4.7" />
              </svg>
            </button>
          </div>

          {moleculeData.length > 1 ? (
            <>
              <div className="mt-3 flex items-center justify-center gap-2">
                {moleculeData.map((item, index) => (
                  <button
                    key={`${item.name}-${index}`}
                    type="button"
                    onClick={() => onSelectMolecule(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === moleculeSafeIndex ? 'w-8 bg-gold' : 'w-1.5 bg-white/[.25]'
                    }`}
                    aria-label={`${index + 1}. moleküle git`}
                  />
                ))}
              </div>

              <div className="mt-4 max-h-[148px] space-y-2 overflow-auto pr-1">
                {moleculeData.map((item, index) => {
                  const pct = clampPercent(item.pct, 50);
                  return (
                    <button
                      key={`${item.name}-${index}-row`}
                      type="button"
                      onClick={() => onOpenMolecule(index)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
                        index === moleculeSafeIndex
                          ? 'border-[var(--gold-line)] bg-[var(--gold-dim)]/30'
                          : 'border-white/[.07] hover:border-[var(--gold-line)]'
                      }`}
                      aria-label={`${item.name} detayını göster`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block truncate text-[12px] text-cream">{item.name}</span>
                          {item.evidenceLabel ? (
                            <span
                              className="mt-1 inline-flex rounded-full px-2 py-1 text-[9px] font-mono uppercase tracking-[.1em]"
                              style={{
                                color: item.evidenceAccent || 'var(--gold)',
                                background: `${item.evidenceAccent || 'var(--gold)'}15`,
                                border: `1px solid ${item.evidenceAccent || 'var(--gold)'}30`,
                              }}
                            >
                              {item.evidenceLabel}
                            </span>
                          ) : null}
                        </div>
                  <span className="text-[11px] font-mono text-gold">
                    {item.percentage || item.traceStrengthLabel || 'Belirgin iz'}
                  </span>
                </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[.08]">
                        <div
                          className="mol-bar h-full rounded-full bg-gold"
                          style={{
                            width: barsReady ? `${pct}%` : '0%',
                            transition: 'width .8s var(--ease)',
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {hiddenMoleculeCount > 0 ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--gold-line)]/50 bg-[linear-gradient(180deg,rgba(245,158,11,0.07),rgba(13,13,18,0.95))]">
              <div className="px-4 py-4">
                <p className="text-[10px] font-mono uppercase tracking-[.16em] text-gold/80">Pro duvarı</p>
                <p className="mt-2 text-[15px] font-semibold text-cream">{hiddenMoleculeCount} molekül daha gizli</p>
                <p className="mt-2 text-[13px] leading-relaxed text-cream/78">
                  Ücretsiz katmanda ilk molekül görünür. Tam molekül analizi ve detay sayfaları Pro ile açılır.
                </p>
                <Link
                  href="/paketler"
                  className="mt-4 inline-flex rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/20 px-3.5 py-2 text-[10px] font-mono uppercase tracking-[.12em] text-gold transition-colors hover:bg-[var(--gold-dim)]/35"
                >
                  Pro ile gör
                </Link>
              </div>
              <div className="pointer-events-none border-t border-white/[.06] bg-black/30 px-4 py-3 blur-[1.5px]">
                {allMoleculeData.slice(visibleMoleculeCount, visibleMoleculeCount + 2).map((item) => (
                  <div key={`${item.name}-locked`} className="flex items-center justify-between py-2 text-[12px] text-white/40">
                    <span>{item.name}</span>
                    <span>{item.traceStrengthLabel || 'Belirgin iz'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {molecule.explanation ? (
            <div className="mt-4 rounded-2xl border border-white/[.08] bg-white/[.03] px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[.12em] text-gold">Molekül yorumu</p>
              <p className="mt-2 text-[13px] leading-relaxed text-cream/92">{molecule.explanation}</p>
            </div>
          ) : null}

          <div className="mt-4 pb-2 pt-1 sm:pb-0 sm:pt-5">
            <div className="flex flex-col gap-2 overflow-hidden sm:flex-row sm:flex-wrap">
              {molecule.slug ? (
                <Link
                  href={`/molekuller/${molecule.slug}`}
                  className="inline-flex w-full max-w-full items-center justify-center overflow-hidden truncate rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/20 px-3.5 py-2 text-center text-[10px] font-mono uppercase tracking-[.08em] text-gold transition-colors hover:bg-[var(--gold-dim)]/35 sm:w-auto sm:max-w-none"
                >
                  Detay sayfasına git
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => void onShare()}
                disabled={moleculeShareBusy}
                className="inline-flex w-full max-w-full items-center justify-center overflow-hidden truncate rounded-full border border-white/[.08] bg-black/20 px-3.5 py-2 text-center text-[10px] font-mono uppercase tracking-[.08em] text-muted transition-colors hover:border-[var(--gold-line)] hover:text-cream disabled:opacity-50 sm:w-auto sm:max-w-none"
              >
                {moleculeShareBusy ? 'Hazırlanıyor' : 'Bu molekülleri paylaş'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-muted">Bu analizde savunulabilir molekül bağı bulunamadı.</p>
      )}
    </Card>
  );
}
