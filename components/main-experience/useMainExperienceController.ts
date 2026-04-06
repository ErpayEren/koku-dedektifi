'use client';

import type { Route } from 'next';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { hydrateAnalysisResult } from '@/lib/client/analysis';
import { ApiError, analyzeImage, analyzeNotes, analyzeText, fetchAnalysisById, readableError } from '@/lib/client/api';
import { FLASH_NOTICE_KEY } from '@/lib/client/useInstantProUpgrade';
import { findHistoryById, getWardrobe, pushFeed, saveHistoryRow, upsertWardrobe } from '@/lib/client/storage';
import type { AnalysisResult, InputMode, WardrobeItem } from '@/lib/client/types';
import { useProGate } from '@/hooks/useProGate';
import { useUserStore } from '@/lib/store/userStore';

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

export function useMainExperienceController() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { requirePro } = useProGate();
  const dailyUsed = useUserStore((state) => state.dailyUsed);
  const dailyLimit = useUserStore((state) => state.dailyLimit);
  const wardrobeCount = useUserStore((state) => state.wardrobeCount);
  const wardrobeLimit = useUserStore((state) => state.wardrobeLimit);
  const incrementUsage = useUserStore((state) => state.incrementUsage);
  const isPro = useUserStore((state) => state.isPro);

  const [mode, setMode] = useState<InputMode>('photo');
  const [textValue, setTextValue] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

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
        const hydrated = hydrateAnalysisResult(row);
        if (hydrated) setResult(hydrated);
        setNotice('Geçmiş analiz yüklendi.');
        setError('');
      } else {
        void (async () => {
          try {
            const remote = await fetchAnalysisById(replayId);
            if (!remote) return;
            saveHistoryRow(remote);
            const hydrated = hydrateAnalysisResult(remote);
            if (hydrated) setResult(hydrated);
            setNotice('Paylaşılan analiz yüklendi.');
            setError('');
          } catch (requestError) {
            setError(readableError(requestError));
          }
        })();
      }
    }

    const flashNotice = window.sessionStorage.getItem(FLASH_NOTICE_KEY);
    if (flashNotice) {
      setNotice(flashNotice);
      window.sessionStorage.removeItem(FLASH_NOTICE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const runAnalyze = useCallback(async (): Promise<void> => {
    if (dailyLimit !== Number.POSITIVE_INFINITY && dailyUsed >= dailyLimit) {
      requirePro('Sınırsız günlük analiz');
      return;
    }

    setError('');
    setNotice('');
    setIsAnalyzing(true);

    try {
      let analysis: AnalysisResult;

      if (mode === 'photo') {
        if (!imagePreview) throw new Error('Önce bir fotoğraf seçmelisin.');
        analysis = await analyzeImage(imagePreview, isPro);
      } else if (mode === 'notes') {
        analysis = await analyzeNotes(notesValue, isPro);
      } else {
        analysis = await analyzeText(textValue, isPro);
      }

      setResult(analysis);
      saveHistoryRow(analysis);
      incrementUsage();
      pushFeed({
        event: 'analysis',
        detail: 'Yeni analiz tamamlandı',
        perfume: analysis.name,
      });
      setNotice('Analiz tamamlandı.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        requirePro('Sınırsız günlük analiz');
        setError('');
      } else {
        setError(readableError(err));
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [dailyLimit, dailyUsed, imagePreview, incrementUsage, isPro, mode, notesValue, requirePro, textValue]);

  const onAnalyzeSimilar = useCallback(
    async (name: string): Promise<void> => {
      if (dailyLimit !== Number.POSITIVE_INFINITY && dailyUsed >= dailyLimit) {
        requirePro('Sınırsız günlük analiz');
        return;
      }

      startTransition(() => {
        setTextValue(name);
        setMode('text');
        replaceModeInUrl('text');
        setNotice(`"${name}" için yeniden analiz çalıştırılıyor...`);
      });
      setIsAnalyzing(true);
      setError('');

      try {
        const analysis = await analyzeText(name, isPro);
        setResult(analysis);
        saveHistoryRow(analysis);
        incrementUsage();
        pushFeed({
          event: 'analysis',
          detail: 'Benzer profil analizi',
          perfume: analysis.name,
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) {
          requirePro('Sınırsız günlük analiz');
        } else {
          setError(readableError(err));
        }
      } finally {
        setIsAnalyzing(false);
      }
    },
    [dailyLimit, dailyUsed, incrementUsage, isPro, requirePro, startTransition],
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
    if (!alreadySaved && wardrobeLimit !== Number.POSITIVE_INFINITY && wardrobeCount >= wardrobeLimit) {
      requirePro('Sınırsız dolap');
      return;
    }

    upsertWardrobe(item);
    pushFeed({
      event: 'wardrobe',
      detail: 'Dolaba eklendi',
      perfume: result.name,
    });
    setNotice('Sonuç dolaba eklendi.');
  }, [requirePro, result, router, wardrobeCount, wardrobeLimit]);

  const compareNow = useCallback((): void => {
    if (!result) {
      router.push('/karsilastir');
      return;
    }

    router.push(`/karsilastir?left=${encodeURIComponent(result.name)}` as Route);
  }, [result, router]);

  const openLayering = useCallback((): void => {
    if (!result) {
      router.push('/layering');
      return;
    }

    router.push(`/layering?left=${encodeURIComponent(result.name)}` as Route);
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

  return {
    mode,
    textValue,
    notesValue,
    imagePreview,
    result,
    isAnalyzing,
    notice,
    error,
    setTextValue,
    setNotesValue,
    handleModeChange,
    handleChipPick,
    handleImageChange,
    runAnalyze,
    onAnalyzeSimilar,
    addToWardrobe,
    compareNow,
    openLayering,
    saveResultFile,
  };
}
