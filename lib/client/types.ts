export type InputMode = 'photo' | 'text' | 'notes';

export interface MoleculeItem {
  name: string;
  smiles: string;
  formula: string;
  family: string;
  origin: string;
  note: string;
  contribution: string;
}

export interface TechnicalItem {
  label: string;
  value: string;
  score: number | null;
}

export interface PersonaInfo {
  gender: string;
  age: string;
  vibe: string;
  occasions: string[];
  season: string;
}

export interface LayeringInfo {
  pair: string;
  result: string;
}

export interface AnalysisTimeline {
  t0: string;
  t1: string;
  t2: string;
  t3: string;
}

export interface AnalysisResult {
  id: string;
  iconToken: string;
  name: string;
  family: string;
  intensity: number;
  season: string[];
  occasion: string;
  description: string;
  pyramid: {
    top: string[];
    middle: string[];
    base: string[];
  } | null;
  similar: string[];
  scores: {
    freshness: number;
    sweetness: number;
    warmth: number;
  };
  persona: PersonaInfo | null;
  dupes: string[];
  layering: LayeringInfo | null;
  timeline: AnalysisTimeline | null;
  technical: TechnicalItem[];
  molecules: MoleculeItem[];
  confidence?: number;
  createdAt: string;
}

export interface FinderCandidate {
  name: string;
  family: string;
  score: number;
  sweetness: number;
  includeMatches: string[];
}

export interface FeedItem {
  id: string;
  event: string;
  detail: string;
  perfume: string;
  ts: string;
}

export interface WardrobeItem {
  key: string;
  name: string;
  family: string;
  status: 'wishlist' | 'owned' | 'tested' | 'rebuy' | 'skip';
  favorite: boolean;
  tags: string[];
  updatedAt: string;
  analysis: AnalysisResult | null;
}

export type OnboardingSeason = 'İlkbahar' | 'Yaz' | 'Sonbahar' | 'Kış';
export type OnboardingStance = 'Sakin' | 'Çarpıcı' | 'Sofistike';
export type OnboardingIntensity = 'Hafif' | 'Orta' | 'Yoğun';

export interface OnboardingPreferences {
  season: OnboardingSeason | '';
  stance: OnboardingStance | '';
  intensity: OnboardingIntensity | '';
  completedAt: string;
}
