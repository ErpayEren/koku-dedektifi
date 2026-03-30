'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActionBar } from './ActionBar';
import { AnalysisResults } from './AnalysisResults';
import { HeroInput } from './HeroInput';
import { TopBar } from './TopBar';
import { LegalFooter } from './LegalFooter';
import { analyzeImage, analyzeNotes, analyzeText, readableError } from '@/lib/client/api';
import { clearHistory, findHistoryById, pushFeed, saveHistoryRow, upsertWardrobe } from '@/lib/client/storage';
import type { AnalysisResult, InputMode, WardrobeItem } from '@/lib/client/types';
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

export function MainExperience() {
  const router = useRouter();
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
    if (requestedMode !== mode) {
      setMode(requestedMode);
    }

    const quickQuery = (query.get('q') || '').trim();
    if (quickQuery && requestedMode === 'text') {
      setTextValue(quickQuery);
    }

    const replayId = query.get('replay');
    if (replayId) {
      const row = findHistoryById(replayId);
      if (row) {
        setResult(row);
        setNotice('Gecmis analiz yuklendi.');
        setError('');
      }
    }
  }, [mode]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const canReset = useMemo(
    () => Boolean(result || textValue || notesValue || imagePreview),
    [imagePreview, notesValue, result, textValue],
  );

  async function runAnalyze(): Promise<void> {
    setError('');
    setNotice('');
    setIsAnalyzing(true);
    try {
      let analysis: AnalysisResult;
      if (mode === 'photo') {
        if (!imagePreview) throw new Error('Once bir fotograf secmelisin.');
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
        detail: 'Yeni analiz tamamlandi',
        perfume: analysis.name,
      });
      setNotice('Analiz tamamlandi.');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function onAnalyzeSimilar(name: string): Promise<void> {
    setTextValue(name);
    setMode('text');
    router.replace('/?mode=text');
    setNotice(`"${name}" icin yeniden analiz calistiriliyor...`);
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
      setError(readableError(err));
    } finally {
      setIsAnalyzing(false);
    }
  }

  function resetAll(): void {
    setTextValue('');
    setNotesValue('');
    setImagePreview('');
    setResult(null);
    setError('');
    setNotice('');
  }

  function handleModeChange(next: InputMode): void {
    setMode(next);
    router.replace(`/?mode=${next}`);
  }

  function handleChipPick(chip: string): void {
    if (mode === 'photo') {
      setMode('text');
      router.replace('/?mode=text');
      const current = textValue.trim();
      setTextValue(current ? `${current}, ${chip}` : chip);
      return;
    }

    if (mode === 'notes') {
      const current = notesValue.trim();
      setNotesValue(current ? `${current}, ${chip}` : chip);
      return;
    }

    const current = textValue.trim();
    setTextValue(current ? `${current}, ${chip}` : chip);
  }

  function handleImageChange(dataUrl: string): void {
    setImagePreview(dataUrl);
    setMode('photo');
  }

  function addToWardrobe(): void {
    if (!result) {
      router.push('/dolap');
      return;
    }
    upsertWardrobe(toWardrobeItem(result));
    pushFeed({
      event: 'wardrobe',
      detail: 'Dolaba eklendi',
      perfume: result.name,
    });
    setNotice('Sonuc dolaba eklendi.');
  }

  function compareNow(): void {
    if (!result) {
      router.push('/karsilastir');
      return;
    }
    router.push(`/karsilastir?left=${encodeURIComponent(result.name)}`);
  }

  function openLayering(): void {
    if (!result) {
      router.push('/layering');
      return;
    }
    router.push(`/layering?left=${encodeURIComponent(result.name)}`);
  }

  async function saveResultFile(): Promise<void> {
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
    setNotice('Sonuc JSON olarak indirildi.');
  }

  return (
    <>
      <TopBar title="Yeni Analiz" />
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

      {error ? (
        <div className="px-5 md:px-12 pb-3">
          <div className="max-w-[920px] mx-auto text-[12px] text-[#f1a2a2] border border-[#623535] bg-[#2b1214] rounded-xl px-4 py-3">
            {error}
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="px-5 md:px-12 pb-3">
          <div className="max-w-[920px] mx-auto text-[12px] text-[#a6dfcf] border border-[#2e6f5e] bg-[#112520] rounded-xl px-4 py-3">
            {notice}
          </div>
        </div>
      ) : null}

      <AnalysisResults result={result} isAnalyzing={isAnalyzing} onAnalyzeSimilar={onAnalyzeSimilar} />

      <ActionBar
        disabled={isAnalyzing}
        onAddWardrobe={addToWardrobe}
        onCompare={compareNow}
        onLayer={openLayering}
        onSave={saveResultFile}
      />

      <div className="px-5 md:px-12 pb-4">
        <div className="max-w-[920px] mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={resetAll}
            disabled={!canReset}
            className="text-[11px] font-mono tracking-[.06em] uppercase text-muted hover:text-cream disabled:opacity-40 transition-colors"
          >
            {UI.newAnalysisBtn}
          </button>
          <button
            type="button"
            onClick={() => {
              clearHistory();
              setNotice('Gecmis temizlendi.');
            }}
            className="text-[11px] font-mono tracking-[.06em] uppercase text-muted hover:text-cream transition-colors"
          >
            {UI.clearHistory}
          </button>
        </div>
      </div>

      <LegalFooter />
    </>
  );
}
