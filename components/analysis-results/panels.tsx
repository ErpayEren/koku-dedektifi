'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { MoleculeData } from '@/components/MoleculeCard';
import { MoleculeVisual } from '@/components/MoleculeVisual';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { ScentGlyph } from '@/components/ui/ScentGlyph';
import type { AnalysisResult } from '@/lib/client/types';
import { UI } from '@/lib/strings';
import { ScentTimeline } from '@/components/ScentTimeline';
import {
  AnimatedPercent,
  ConfidenceRing,
  InfoLine,
  MetricPill,
  PyramidRow,
  RadarWheel,
  SceneCell,
  SignalTelemetry,
  SimilarityArc,
} from './primitives';
import { WHEEL_AXES, clampPercent, toList } from './utils';

interface PanelMotionProps {
  style: CSSProperties;
}

interface OverviewPanelProps extends PanelMotionProps {
  result: AnalysisResult;
  confidence: number;
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
  return (
    <Card
      className="relative self-start overflow-hidden p-7 md:p-9"
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
          <p className="mt-2 text-[11px] font-mono uppercase tracking-[.12em] text-gold">{result.family || 'Aromatik'}</p>
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
        <p className="text-[15px] leading-relaxed text-cream/95">{result.description || 'Açıklama şu an hazır değil.'}</p>
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

      <div className="mt-4 rounded-[24px] border border-white/[.06] bg-black/10 p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <CardTitle>Koku Sahnesi</CardTitle>
          <span className="text-[10px] font-mono uppercase tracking-[.12em] text-gold">Canlı iz</span>
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
  season: string[];
  occasionList: string[];
  onboardingSummary: string;
  hasOnboardingPreferences: boolean;
}

export function DetailPanel({
  result,
  heartNotes,
  season,
  occasionList,
  onboardingSummary,
  hasOnboardingPreferences,
  style,
}: DetailPanelProps) {
  return (
    <Card className="self-start p-6 content-auto-panel" style={style}>
      <CardTitle>{UI.pyramid}</CardTitle>
      <div className="space-y-4">
        <PyramidRow label={UI.topNote} items={toList(result.pyramid?.top, 6)} />
        <PyramidRow label={UI.heartNote} items={toList(heartNotes, 8)} />
        <PyramidRow label={UI.baseNote} items={toList(result.pyramid?.base, 8)} />
      </div>

      <div className="mt-6 border-t border-white/[.06] pt-6">
        <ScentTimeline
          topNotes={toList(result.pyramid?.top, 6)}
          heartNotes={toList(heartNotes, 8)}
          baseNotes={toList(result.pyramid?.base, 8)}
          timeline={result.timeline}
        />
      </div>

      <div className="mt-6 border-t border-white/[.06] pt-5">
        <CardTitle>{UI.suitability}</CardTitle>
        {hasOnboardingPreferences ? (
          <div className="mb-3 rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-dim)]/10 px-3.5 py-3">
            <p className="text-[10px] font-mono uppercase tracking-[.12em] text-gold">Sana uyum skoru</p>
            <p className="mt-2 text-[13px] leading-relaxed text-cream/92">{onboardingSummary}</p>
          </div>
        ) : null}
        {result.persona ? (
          <div className="space-y-2 text-[12px] text-muted">
            <InfoLine label="Koku duruşu" value={result.persona.vibe || 'Dengeli'} />
            <InfoLine
              label="Kullanım sahnesi"
              value={occasionList.join(', ') || result.occasion || 'Genel kullanım'}
            />
            <InfoLine label="Cinsiyet dengesi" value={result.persona.gender || 'Unisex'} />
            <InfoLine label="Sezon eğilimi" value={season.join(', ') || result.persona.season || 'Dört mevsim'} />
          </div>
        ) : (
          <p className="text-[12px] text-muted">Bu kokuda persona sinyali sınırlı; genel kullanım sahnesine açık.</p>
        )}
      </div>
    </Card>
  );
}

interface SimilarPanelProps extends PanelMotionProps {
  similarItems: Array<{ name: string; similarity: number }>;
  hiddenSimilarCount: number;
  similarLimit: number;
  dupes: string[];
  onAnalyzeSimilar: (name: string) => void;
}

export function SimilarPanel({
  similarItems,
  hiddenSimilarCount,
  similarLimit,
  dupes,
  onAnalyzeSimilar,
  style,
}: SimilarPanelProps) {
  return (
    <Card className="self-start p-6 content-auto-panel" style={style}>
      <CardTitle>{UI.similarScents}</CardTitle>
      <div className="flex flex-col gap-2">
        {similarItems.length > 0 ? (
          similarItems.map((item) => (
            <button
              key={`${item.name}-${item.similarity}`}
              type="button"
              onClick={() => onAnalyzeSimilar(item.name)}
              className="similar-item w-full rounded-xl border border-white/[.08] px-3.5 py-3 text-left transition-all hover:border-[var(--gold-line)] hover:bg-[var(--gold-dim)]/45"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block truncate text-[14px] text-cream">{item.name}</span>
                  <span className="mt-1 block text-[11px] text-muted">Bu profile göre yeniden analiz çalıştır.</span>
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

      {dupes.length > 0 ? (
        <div className="mt-5 border-t border-white/[.06] pt-5">
          <CardTitle className="mb-3">Benzer Profil Alternatifleri</CardTitle>
          <div className="flex flex-wrap gap-2">
            {dupes.map((item) => (
              <span key={item} className="rounded-full border border-[var(--gold-line)] px-2.5 py-1.5 text-[10px] text-gold">
                {item}
              </span>
            ))}
          </div>
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
}

export function WheelPanel({ wheelValues, scores, intensity, style }: WheelPanelProps) {
  return (
    <Card className="self-start p-6 content-auto-panel" style={style}>
      <CardTitle>{UI.wheel}</CardTitle>
      <div className="flex items-center justify-center py-2">
        <RadarWheel values={wheelValues} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
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
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricPill label="Tazelik" value={scores.freshness} tone="var(--sage)" />
        <MetricPill label="Tatlılık" value={scores.sweetness} tone="#d58ebb" />
        <MetricPill label="Sıcaklık" value={scores.warmth} tone="#d3a36a" />
        <MetricPill label="Yoğunluk" value={clampPercent(intensity, 65)} tone="#8ab8c0" />
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
    <Card className="self-start p-6 content-auto-panel" style={style}>
      <CardTitle className="mb-4">{UI.keyMolecules}</CardTitle>
      {molecule ? (
        <div>
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
                  className="block break-words text-[clamp(1.75rem,4.5vw,3rem)] font-semibold leading-[0.94] text-cream transition-colors hover:text-gold"
                >
                  {molecule.name}
                </Link>
              ) : (
                <p className="break-words text-[clamp(1.75rem,4.5vw,3rem)] font-semibold leading-[0.94] text-cream">{molecule.name}</p>
              )}
              <p className="mt-2 break-words text-[12px] text-muted">
                {molecule.formula || 'Doğrulanmış formül yok'}
                {molecule.casNumber ? ` · CAS ${molecule.casNumber}` : ''}
              </p>
              <p className="mt-1 text-[11px] text-sage">{molecule.type || 'Molekül ailesi'}</p>
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

              <div className="mt-4 max-h-[180px] space-y-2 overflow-auto pr-1">
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
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {item.evidenceLabel ? (
                              <span className="rounded-full border border-white/[.08] px-2 py-1 text-[9px] font-mono uppercase tracking-[.1em] text-muted">
                                {item.evidenceLabel}
                              </span>
                            ) : null}
                            {typeof item.confidence === 'number' ? (
                              <span className="text-[10px] font-mono text-sage">{item.confidence}% güven</span>
                            ) : null}
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-gold">{pct}%</span>
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
                <p className="text-[10px] font-mono uppercase tracking-[.16em] text-gold/80">PRO duvarı</p>
                <p className="mt-2 text-[15px] font-semibold text-cream">{hiddenMoleculeCount} molekül daha gizli</p>
                <p className="mt-2 text-[13px] leading-relaxed text-cream/78">
                  Ücretsiz katmanda ilk iki molekül görünür. Tam molekül analizi ve detay sayfaları Pro ile açılır.
                </p>
                <Link
                  href="/paketler"
                  className="mt-4 inline-flex rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/20 px-3.5 py-2 text-[10px] font-mono uppercase tracking-[.12em] text-gold transition-colors hover:bg-[var(--gold-dim)]/35"
                >
                  PRO ile gör
                </Link>
              </div>
              <div className="pointer-events-none border-t border-white/[.06] bg-black/30 px-4 py-3 blur-[1.5px]">
                {allMoleculeData.slice(visibleMoleculeCount, visibleMoleculeCount + 2).map((item) => (
                  <div key={`${item.name}-locked`} className="flex items-center justify-between py-2 text-[12px] text-white/40">
                    <span>{item.name}</span>
                    <span>{clampPercent(item.pct, 50)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {molecule.explanation ? (
            <div className="mt-4 rounded-2xl border border-white/[.08] bg-white/[.03] px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[.12em] text-gold">Molekül Yorumu</p>
              <p className="mt-2 text-[13px] leading-relaxed text-cream/92">{molecule.explanation}</p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_112px]">
            <div className="rounded-2xl border border-white/[.08] bg-white/[.03] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                {molecule.evidenceLabel ? (
                  <span className="rounded-full border border-white/[.08] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.1em] text-gold">
                    {molecule.evidenceLabel}
                  </span>
                ) : null}
                {molecule.matchedNotes && molecule.matchedNotes.length > 0 ? (
                  <span className="rounded-full border border-white/[.08] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.1em] text-muted">
                    {molecule.matchedNotes.slice(0, 2).join(' • ')}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-cream/86">
                {molecule.presenceCopy || molecule.evidenceReason || 'Bu molekül kompozisyon sinyalleriyle destekleniyor.'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[.08] bg-white/[.03] px-4 py-3 text-center">
              <p className="text-[10px] font-mono uppercase tracking-[.12em] text-muted">Güven</p>
              <p className="mt-2 text-[1.25rem] font-semibold leading-none text-cream">
                <AnimatedPercent value={molecule.confidence ?? 0} />
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.08]">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${molecule.confidence ?? 0}%`, background: 'var(--sage)' }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {molecule.profileTags?.slice(0, 3).map((tag) => (
              <span
                key={`${molecule.name}-${tag}`}
                className="rounded-full border border-white/[.08] px-2.5 py-1.5 text-[10px] font-mono text-muted"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {molecule.slug ? (
              <Link
                href={`/molekuller/${molecule.slug}`}
                className="rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/20 px-3.5 py-2 text-[10px] font-mono uppercase tracking-[.08em] text-gold transition-colors hover:bg-[var(--gold-dim)]/35"
              >
                Detay sayfasına git
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void onShare()}
              disabled={moleculeShareBusy}
              className="rounded-full border border-white/[.08] bg-black/20 px-3.5 py-2 text-[10px] font-mono uppercase tracking-[.08em] text-muted transition-colors hover:border-[var(--gold-line)] hover:text-cream disabled:opacity-50"
            >
              {moleculeShareBusy ? 'Hazırlanıyor' : 'Bu Molekülleri Paylaş'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-muted">Bu analizde doğrulanmış molekül izi bulunamadı.</p>
      )}
    </Card>
  );
}
