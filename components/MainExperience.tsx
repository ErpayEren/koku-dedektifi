'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ActionBar } from './ActionBar';
import { AnalysisResults } from './AnalysisResults';
import { HeroInput } from './HeroInput';
import { LegalFooter } from './LegalFooter';
import { MoleculePreviewStrip } from './MoleculePreviewStrip';
import { TopBar } from './TopBar';
import { UpgradePromptModal } from './UpgradePromptModal';
import { ApiError, analyzeImage, analyzeNotes, analyzeText, readableError } from '@/lib/client/api';
import { getWardrobe, pushFeed, saveHistoryRow, findHistoryById, upsertWardrobe } from '@/lib/client/storage';
import type { AnalysisResult, InputMode, WardrobeItem } from '@/lib/client/types';
import { useBillingEntitlement } from '@/lib/client/useBillingEntitlement';
import { UI } from '@/lib/strings';

function toWardrobeItem(result: AnalysisResult): WardrobeItem {
  const key = result.name.toLowerCase().replace(/\s+/g, '-');
  return {
    key,
    name: result.name,
    family: result.family,
    status: 'owned',
    favorite: false,
    tags: [result.family.toLowerCase(), ...result.season.map((item) => item.toLowerCase())].slice(0, 8),
    updatedAt: new Date().toISOString(),
    analysis: result,
  };
}

function parseMode(value: string | null): InputMode {
  if (value === 'photo' || value === 'text' || value === 'notes') return value;
  return 'photo';
}

function replaceModeInUrl(nextMode: InputMode): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('mode', nextMode);
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

interface UpgradeState {
  open: boolean;
  title: string;
  body: string;
  featureBullets: string[];
}

const DEFAULT_UPGRADE_STATE: UpgradeState = {
  open: false,
  title: '',
  body: '',
  featureBullets: [],
};

export function MainExperience() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const entitlement = useBillingEntitlement();
  const [mode, setMode] = useState<InputMode>('photo');
  const [textValue, setTextValue] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [upgradeState, setUpgradeState] = useState<UpgradeState>(DEFAULT_UPGRADE_STATE);

  const wardrobeCount = getWardrobe().length;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const query = new URLSearchParams(window.location.search);
    const requestedMode = parseMode(query.get('mode'));
    setMode((current) => (current === requestedMode ? current : requestedMode));

    const quickQuery = (query.get('q') || '').trim();
    if (quickQuery && requestedMode === 'text') {
      setTextValue(quickQuery);
    }

    const replayId = query.get('replay');
    if (replayId) {
      const row = findHistoryById(replayId);
      if (row) {
        setResult(row);
        setNotice('Geçmiş analiz yüklendi.');
        setError('');
      }
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function openUpgradePrompt(input: Omit<UpgradeState, 'open'>): void {
    setUpgradeState({
      open: true,
      ...input,
    });
  }

  const runAnalyze = useCallback(async (): Promise<void> => {
    setError('');
    setNotice('');
    setIsAnalyzing(true);

    try {
      let analysis: AnalysisResult;

      if (mode === 'photo') {
        if (!imagePreview) throw new Error('Önce bir fotoğraf seçmelisin.');
        analysis = await analyzeImage(imagePreview);
      } else if (mode === 'notes') {
        analysis = await analyzeNotes(notesValue);
      } else {
        analysis = await analyzeText(textValue);
      }

      setResult(analysis);
      saveHistoryRow(analysis);
      pushFeed({
        event: 'analysis',
        detail: 'Yeni analiz tamamlandı',
        perfume: analysis.name,
      });
      setNotice('Analiz tamamlandı.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        openUpgradePrompt({
          title: 'Bugünkü limitine ulaştın',
          body:
            'Ücretsiz katmanda bugünkü moleküler analiz hakkını kullandın. Keşfetmeye devam etmek için Pro ile tam derinlik açılabilir.',
          featureBullets: [
            'Sınırsız analiz',
            'Tam molekül analizi ve detay sayfaları',
            'Top 10 benzer parfüm önerisi',
            'Parfümör gözüyle derin rapor',
          ],
        });
        setError('');
      } else {
        setError(readableError(err));
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [imagePreview, mode, notesValue, textValue]);

  const onAnalyzeSimilar = useCallback(
    async (name: string): Promise<void> => {
      startTransition(() => {
        setTextValue(name);
        setMode('text');
        replaceModeInUrl('text');
        setNotice(`“${name}” için yeniden analiz çalıştırılıyor...`);
      });
      setIsAnalyzing(true);
      setError('');

      try {
        const analysis = await analyzeText(name);
        setResult(analysis);
        saveHistoryRow(analysis);
        pushFeed({
          event: 'analysis',
          detail: 'Benzer profil analizi',
          perfume: analysis.name,
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) {
          openUpgradePrompt({
            title: 'Bugünkü limitine ulaştın',
            body: 'Benzer profil akışını sürdürmek için bugünkü ücretsiz kotan doldu. Pro ile keşfe kesintisiz devam edebilirsin.',
            featureBullets: [
              'Sınırsız analiz',
              'Benzer parfümlerde ilk 10 sonuç',
              'Tam molekül görünürlüğü',
            ],
          });
        } else {
          setError(readableError(err));
        }
      } finally {
        setIsAnalyzing(false);
      }
    },
    [startTransition],
  );

  const handleModeChange = useCallback(
    (next: InputMode): void => {
      startTransition(() => {
        setMode(next);
        replaceModeInUrl(next);
      });
    },
    [startTransition],
  );

  const handleChipPick = useCallback(
    (chip: string): void => {
      if (mode === 'photo') {
        startTransition(() => {
          setMode('text');
          replaceModeInUrl('text');
          const current = textValue.trim();
          setTextValue(current ? `${current}, ${chip}` : chip);
        });
        return;
      }

      if (mode === 'notes') {
        startTransition(() => {
          const current = notesValue.trim();
          setNotesValue(current ? `${current}, ${chip}` : chip);
        });
        return;
      }

      startTransition(() => {
        const current = textValue.trim();
        setTextValue(current ? `${current}, ${chip}` : chip);
      });
    },
    [mode, notesValue, startTransition, textValue],
  );

  const handleImageChange = useCallback(
    (dataUrl: string): void => {
      startTransition(() => {
        setImagePreview(dataUrl);
        setMode('photo');
        replaceModeInUrl('photo');
      });
    },
    [startTransition],
  );

  const addToWardrobe = useCallback((): void => {
    if (!result) {
      router.push('/dolap');
      return;
    }

    const item = toWardrobeItem(result);
    const alreadySaved = getWardrobe().some((row) => row.key === item.key);
    if (!alreadySaved && entitlement.wardrobeLimit !== null && wardrobeCount >= entitlement.wardrobeLimit) {
      openUpgradePrompt({
        title: 'Dolap limiti doldu',
        body: 'Ücretsiz dolapta en fazla 5 parfüm saklanabiliyor. Sınırsız koleksiyon için Pro katmanına geçebilirsin.',
        featureBullets: ['Sınırsız dolap', 'Cihazlar arası senkronizasyon', 'Koku profili kişiselleştirme'],
      });
      return;
    }

    upsertWardrobe(item);
    pushFeed({
      event: 'wardrobe',
      detail: 'Dolaba eklendi',
      perfume: result.name,
    });
    setNotice('Sonuç dolaba eklendi.');
  }, [entitlement.wardrobeLimit, result, router, wardrobeCount]);

  const compareNow = useCallback((): void => {
    if (!result) {
      router.push('/karsilastir');
      return;
    }

    router.push(`/karsilastir?left=${encodeURIComponent(result.name)}`);
  }, [result, router]);

  const openLayering = useCallback((): void => {
    if (!result) {
      router.push('/layering');
      return;
    }

    router.push(`/layering?left=${encodeURIComponent(result.name)}`);
  }, [result, router]);

  const saveResultFile = useCallback(async (): Promise<void> => {
    if (!result) {
      router.push('/gecmis');
      return;
    }

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `koku-analiz-${result.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    setNotice('Sonuç JSON olarak indirildi.');
  }, [result, router]);

  return (
    <>
      <TopBar title={UI.navNewAnalysis} />
      <HeroInput
        mode={mode}
        textValue={textValue}
        notesValue={notesValue}
        imagePreview={imagePreview}
        isAnalyzing={isAnalyzing}
        onModeChange={handleModeChange}
        onTextChange={setTextValue}
        onNotesChange={setNotesValue}
        onImageChange={handleImageChange}
        onAnalyze={runAnalyze}
        onChipPick={handleChipPick}
      />

      <MoleculePreviewStrip />

      {error ? (
        <div className="px-5 pb-3 md:px-12">
          <div className="mx-auto max-w-[920px] rounded-xl border border-[#623535] bg-[#2b1214] px-4 py-3 text-[12px] text-[#f1a2a2]">
            {error}
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="px-5 pb-3 md:px-12">
          <div className="mx-auto max-w-[920px] rounded-xl border border-[#2e6f5e] bg-[#112520] px-4 py-3 text-[12px] text-[#a6dfcf]">
            {notice}
          </div>
        </div>
      ) : null}

      <AnalysisResults result={result} isAnalyzing={isAnalyzing} onAnalyzeSimilar={onAnalyzeSimilar} />

      <ActionBar
        hasResult={Boolean(result)}
        disabled={isAnalyzing}
        onAddWardrobe={addToWardrobe}
        onCompare={compareNow}
        onLayer={openLayering}
        onSave={saveResultFile}
      />

      <LegalFooter />

      <UpgradePromptModal
        open={upgradeState.open}
        title={upgradeState.title}
        body={upgradeState.body}
        featureBullets={upgradeState.featureBullets}
        onClose={() => setUpgradeState(DEFAULT_UPGRADE_STATE)}
      />
    </>
  );
}
