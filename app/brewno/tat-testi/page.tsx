'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FlavorNoteTag } from '@/components/brewno/FlavorNoteTag';

const ROAST_OPTIONS = [
  { value: 'light',         label: 'Light Roast',        desc: 'Bright, fruity, tea-like. Showcases origin character.', emoji: '☀️' },
  { value: 'medium-light',  label: 'Medium-Light',        desc: 'Balanced acidity with sweetness starting to develop.', emoji: '🌤' },
  { value: 'medium',        label: 'Medium Roast',        desc: 'Sweet, balanced, slightly nutty or chocolatey.', emoji: '⛅' },
  { value: 'medium-dark',   label: 'Medium-Dark',         desc: 'Rich, full-bodied with roast notes coming through.', emoji: '🌥' },
  { value: 'dark',          label: 'Dark Roast',          desc: 'Bold, bitter, smoky. Classic espresso character.', emoji: '🌑' },
];

const PROCESS_OPTIONS = [
  { value: 'washed',    label: 'Washed',    desc: 'Clean, transparent, bright. Let the origin shine.', emoji: '💧' },
  { value: 'natural',   label: 'Natural',   desc: 'Fruity, funky, complex. Wild fruit character.', emoji: '🌿' },
  { value: 'honey',     label: 'Honey',     desc: 'Sweet, balanced. Between washed and natural.', emoji: '🍯' },
  { value: 'anaerobic', label: 'Anaerobic', desc: 'Experimental, intense, polarising. Wild fermentation.', emoji: '🧪' },
];

const SLIDER_ATTRS = [
  { key: 'acidity_pref',    label: 'Acidity',    low: 'Low (smooth)', high: 'High (bright & citrusy)',  color: '#7eb8a4' },
  { key: 'sweetness_pref',  label: 'Sweetness',  low: 'Less sweet',   high: 'Very sweet (caramel, fruit)', color: '#c9a96e' },
  { key: 'body_pref',       label: 'Body',       low: 'Light & delicate', high: 'Full & heavy',           color: '#a78bfa' },
  { key: 'bitterness_pref', label: 'Bitterness', low: 'Very mild',    high: 'Strong & bold',              color: '#e05252' },
] as const;

const POPULAR_NOTES = {
  'Fruity & Sweet': ['blueberry', 'strawberry', 'peach', 'mango', 'apricot', 'cherry', 'caramel', 'honey', 'brown sugar'],
  'Floral & Tea-like': ['jasmine', 'rose', 'lavender', 'black tea', 'bergamot', 'hibiscus'],
  'Chocolate & Nutty': ['milk chocolate', 'dark chocolate', 'hazelnut', 'almond', 'walnut', 'toffee'],
  'Bold & Earthy': ['dark chocolate', 'tobacco', 'cedar', 'earth', 'molasses'],
};

type ProfileState = {
  preferred_roast: string[];
  preferred_process: string[];
  preferred_notes: string[];
  disliked_notes: string[];
  acidity_pref: number;
  sweetness_pref: number;
  body_pref: number;
  bitterness_pref: number;
};

const TOTAL_STEPS = 5;

export default function TatTestiPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileState>({
    preferred_roast: [],
    preferred_process: [],
    preferred_notes: [],
    disliked_notes: [],
    acidity_pref: 5,
    sweetness_pref: 6,
    body_pref: 5,
    bitterness_pref: 4,
  });

  const toggleMulti = <K extends 'preferred_roast' | 'preferred_process' | 'preferred_notes' | 'disliked_notes'>(
    key: K,
    value: string,
  ) => {
    setProfile((p) => ({
      ...p,
      [key]: p[key].includes(value)
        ? p[key].filter((v) => v !== value)
        : [...p[key], value],
    }));
  };

  const setSlider = (key: keyof Pick<ProfileState, 'acidity_pref' | 'sweetness_pref' | 'body_pref' | 'bitterness_pref'>, value: number) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/brewno/taste-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, quiz_completed: true }),
      });
      router.push('/brewno');
    } finally {
      setSaving(false);
    }
  }, [profile, router]);

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/brewno" className="mb-4 inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors">
          ← Back
        </Link>
        <h1 className="font-display text-3xl font-medium text-cream">Taste Profile Quiz</h1>
        <p className="mt-1 text-sm text-white/50">2 minutes to unlock personalised coffee recommendations</p>

        {/* Progress bar */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-right text-xs text-white/30">{step} / {TOTAL_STEPS}</p>
      </div>

      {/* Step 1: Roast preference */}
      {step === 1 && (
        <div className="animate-fade-in space-y-4">
          <h2 className="font-display text-2xl text-cream">How do you like your roast?</h2>
          <p className="text-sm text-white/50">Select all that apply</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROAST_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleMulti('preferred_roast', opt.value)}
                className={`flex gap-4 rounded-2xl border p-4 text-left transition-all ${
                  profile.preferred_roast.includes(opt.value)
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-white/[0.07] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.05]'
                }`}
              >
                <span className="text-3xl">{opt.emoji}</span>
                <div>
                  <p className={`font-medium ${profile.preferred_roast.includes(opt.value) ? 'text-amber-300' : 'text-cream/80'}`}>
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-xs text-white/50">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Process preference */}
      {step === 2 && (
        <div className="animate-fade-in space-y-4">
          <h2 className="font-display text-2xl text-cream">Preferred processing method?</h2>
          <p className="text-sm text-white/50">How the cherry is processed affects the cup&apos;s character</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PROCESS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleMulti('preferred_process', opt.value)}
                className={`flex gap-4 rounded-2xl border p-5 text-left transition-all ${
                  profile.preferred_process.includes(opt.value)
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-white/[0.07] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.05]'
                }`}
              >
                <span className="text-3xl">{opt.emoji}</span>
                <div>
                  <p className={`font-medium ${profile.preferred_process.includes(opt.value) ? 'text-amber-300' : 'text-cream/80'}`}>
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-sm text-white/50">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Flavor notes */}
      {step === 3 && (
        <div className="animate-fade-in space-y-5">
          <h2 className="font-display text-2xl text-cream">Which flavors do you love?</h2>
          <p className="text-sm text-white/50">Select everything that sounds delicious to you</p>
          {Object.entries(POPULAR_NOTES).map(([group, notes]) => (
            <div key={group}>
              <p className="mb-2 text-xs uppercase tracking-[0.15em] text-white/30">{group}</p>
              <div className="flex flex-wrap gap-2">
                {notes.map((note) => (
                  <FlavorNoteTag
                    key={note}
                    note={note}
                    size="lg"
                    active={profile.preferred_notes.includes(note)}
                    onClick={() => toggleMulti('preferred_notes', note)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 4: Disliked notes */}
      {step === 4 && (
        <div className="animate-fade-in space-y-5">
          <h2 className="font-display text-2xl text-cream">Any flavors you&apos;d rather avoid?</h2>
          <p className="text-sm text-white/50">We&apos;ll filter these out from your recommendations</p>
          {Object.entries(POPULAR_NOTES).map(([group, notes]) => (
            <div key={group}>
              <p className="mb-2 text-xs uppercase tracking-[0.15em] text-white/30">{group}</p>
              <div className="flex flex-wrap gap-2">
                {notes.map((note) => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => toggleMulti('disliked_notes', note)}
                    className={`rounded-full px-3 py-1.5 text-sm capitalize transition-all ${
                      profile.disliked_notes.includes(note)
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'border border-white/[0.07] bg-white/[0.03] text-white/50 hover:bg-white/[0.06]'
                    }`}
                  >
                    {profile.disliked_notes.includes(note) ? '✕ ' : ''}{note}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 5: Sliders */}
      {step === 5 && (
        <div className="animate-fade-in space-y-6">
          <h2 className="font-display text-2xl text-cream">Fine-tune your palate</h2>
          <p className="text-sm text-white/50">Set your intensity preferences for each taste dimension</p>
          <div className="space-y-6">
            {SLIDER_ATTRS.map((attr) => (
              <div key={attr.key} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium text-cream/80">{attr.label}</span>
                  <span className="text-sm font-bold" style={{ color: attr.color }}>
                    {profile[attr.key]}/10
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={profile[attr.key]}
                  onChange={(e) => setSlider(attr.key, parseInt(e.target.value, 10))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: attr.color }}
                />
                <div className="mt-1.5 flex justify-between text-xs text-white/30">
                  <span>{attr.low}</span>
                  <span>{attr.high}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="rounded-xl border border-white/[0.08] px-5 py-3 text-sm text-white/50 transition-all hover:border-white/[0.15] hover:text-white/70 disabled:opacity-30"
        >
          ← Back
        </button>

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
            className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-3 text-sm font-bold text-black shadow-[0_4px_16px_rgba(217,119,6,0.3)] transition-all hover:shadow-[0_4px_20px_rgba(245,158,11,0.4)] active:scale-95"
          >
            Continue →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-3 text-sm font-bold text-black shadow-[0_4px_16px_rgba(217,119,6,0.3)] transition-all hover:shadow-[0_4px_20px_rgba(245,158,11,0.4)] disabled:opacity-50 active:scale-95"
          >
            {saving ? 'Saving…' : '✦ Get My Recommendations →'}
          </button>
        )}
      </div>
    </div>
  );
}
