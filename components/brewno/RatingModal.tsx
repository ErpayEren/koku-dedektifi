'use client';

import { useState } from 'react';
import type { CoffeeRating } from '@/lib/brewno';

interface RatingModalProps {
  coffeeName: string;
  coffeeSlug: string;
  existingRating?: CoffeeRating | null;
  onClose: () => void;
  onSaved: (rating: CoffeeRating) => void;
}

const BREW_METHODS = [
  { value: 'v60', label: 'V60' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'aeropress', label: 'AeroPress' },
  { value: 'french-press', label: 'French Press' },
  { value: 'chemex', label: 'Chemex' },
  { value: 'moka-pot', label: 'Moka Pot' },
  { value: 'cold-brew', label: 'Cold Brew' },
  { value: 'other', label: 'Other' },
];

function SliderInput({
  value,
  onChange,
  label,
  color = '#f59e0b',
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  color?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs font-medium" style={{ color }}>{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08]"
        style={{ accentColor: color }}
      />
    </div>
  );
}

export function RatingModal({
  coffeeName,
  coffeeSlug,
  existingRating,
  onClose,
  onSaved,
}: RatingModalProps) {
  const [overall, setOverall] = useState(existingRating?.overall_score ?? 4);
  const [acidity, setAcidity] = useState(existingRating?.acidity_score ?? 5);
  const [sweetness, setSweetness] = useState(existingRating?.sweetness_score ?? 5);
  const [body, setBody] = useState(existingRating?.body_score ?? 5);
  const [bitterness, setBitterness] = useState(existingRating?.bitterness_score ?? 5);
  const [aroma, setAroma] = useState(existingRating?.aroma_score ?? 5);
  const [brewMethod, setBrewMethod] = useState(existingRating?.brew_method ?? '');
  const [reviewText, setReviewText] = useState(existingRating?.review_text ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/brewno/coffees/${coffeeSlug}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: in a real app, pass the supabase session token
        },
        body: JSON.stringify({
          overall_score: overall,
          acidity_score: acidity,
          sweetness_score: sweetness,
          body_score: body,
          bitterness_score: bitterness,
          aroma_score: aroma,
          brew_method: brewMethod || null,
          review_text: reviewText || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to save rating');
        return;
      }
      const data = await res.json();
      onSaved(data.rating);
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label={`Rate ${coffeeName}`}
      >
        <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#13111a] shadow-2xl animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-amber-400/70">Rate this coffee</p>
              <h2 className="mt-0.5 font-display text-lg font-medium text-cream">{coffeeName}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-white/40 hover:bg-white/[0.1] hover:text-white/70 transition-colors"
            >
              ×
            </button>
          </div>

          <div className="space-y-6 px-6 py-5">
            {/* Overall rating */}
            <div>
              <p className="mb-3 text-sm font-medium text-cream/80">Overall Rating</p>
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="text-3xl transition-transform hover:scale-110 active:scale-95"
                      onClick={() => setOverall(star)}
                    >
                      <span className={overall >= star ? 'text-amber-400' : 'text-white/15'}>★</span>
                    </button>
                  ))}
                </div>
                <span className="text-2xl font-bold text-amber-400">{overall}.0</span>
              </div>
            </div>

            {/* Brew method */}
            <div>
              <p className="mb-2.5 text-sm font-medium text-cream/80">Brew Method</p>
              <div className="grid grid-cols-4 gap-2">
                {BREW_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setBrewMethod(m.value)}
                    className={`rounded-xl px-2 py-2.5 text-[11px] font-medium transition-all ${
                      brewMethod === m.value
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.07]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Attribute sliders */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-cream/80">Taste Attributes</p>
              <SliderInput value={aroma} onChange={setAroma} label="Aroma" color="#f59e0b" />
              <SliderInput value={acidity} onChange={setAcidity} label="Acidity" color="#7eb8a4" />
              <SliderInput value={sweetness} onChange={setSweetness} label="Sweetness" color="#c9a96e" />
              <SliderInput value={body} onChange={setBody} label="Body" color="#a78bfa" />
              <SliderInput value={bitterness} onChange={setBitterness} label="Bitterness" color="#e05252" />
            </div>

            {/* Review text */}
            <div>
              <p className="mb-2 text-sm font-medium text-cream/80">Your Notes</p>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Describe your experience — the aroma, flavors you noticed, how you'd brew it differently..."
                rows={4}
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 focus:bg-white/[0.06] transition-all"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 py-4 text-sm font-bold tracking-wider text-black shadow-[0_4px_20px_rgba(217,119,6,0.35)] transition-all hover:shadow-[0_4px_24px_rgba(245,158,11,0.4)] disabled:opacity-50 active:scale-[0.98]"
            >
              {saving ? 'Saving...' : existingRating ? 'Update Rating' : 'Save Rating'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
