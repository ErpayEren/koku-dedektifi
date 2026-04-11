export type InputMode = 'photo' | 'text' | 'notes';
export type AnalysisMode = 'text' | 'notes' | 'image';
export type MoleculeEvidenceLevel =
  | 'verified_component'
  | 'signature_molecule'
  | 'accord_component'
  | 'note_match'
  | 'unmatched';

export interface MoleculeItem {
  name: string;
  smiles: string;
  formula: string;
  family: string;
  origin: string;
  note: string;
  contribution: string;
  effect?: string;
  percentage?: string;
  evidence?: string;
  evidenceLevel?: MoleculeEvidenceLevel;
  evidenceLabel?: string;
  evidenceReason?: string;
  matchedNotes?: string[];
}

export interface SimilarFragranceItem {
  name: string;
  brand: string;
  reason: string;
  priceRange: string;
}

export interface LongevityHours {
  min: number;
  max: number;
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

export interface AnalysisDataConfidence {
  hasDbMatch: boolean;
  source: 'db' | 'ai';
}

export interface AnalysisVoteSummary {
  analysisId: string;
  total: number;
  accurate: number;
  partial: number;
  wrong: number;
  accuratePct: number;
  updatedAt?: string;
}

export interface AnalysisResult {
  id: string;
  iconToken: string;
  name: string;
  brand?: string | null;
  year?: number | null;
  family: string;
  concentration?: string | null;
  intensity: number;
  season: string[];
  occasion: string;
  occasions?: string[];
  description: string;
  moodProfile?: string;
  expertComment?: string;
  layeringTip?: string;
  applicationTip?: string;
  sillage?: 'yakın' | 'orta' | 'güçlü' | 'çok güçlü' | string;
  longevityHours?: LongevityHours | null;
  ageProfile?: string;
  genderProfile?: 'Feminen' | 'Maskülen' | 'Unisex' | string;
  pyramid: {
    top: string[];
    middle: string[];
    base: string[];
  } | null;
  similar: string[];
  similarFragrances?: SimilarFragranceItem[];
  scores: {
    freshness: number;
    sweetness: number;
    warmth: number;
  };
  scoreCards?: {
    value: number;
    uniqueness: number;
    wearability: number;
  } | null;
  persona: PersonaInfo | null;
  dupes: string[];
  layering: LayeringInfo | null;
  timeline: AnalysisTimeline | null;
  technical: TechnicalItem[];
  molecules: MoleculeItem[];
  confidence?: number;
  dataConfidence?: AnalysisDataConfidence;
  analysisMode?: AnalysisMode;
  inputText?: string;
  createdAt: string;
}

export interface FinderCandidate {
  name: string;
  brand?: string;
  family: string;
  score: number;
  sweetness: number;
  includeMatches: string[];
  excludeMatches?: string[];
  season?: string[];
  occasion?: string;
  priceBand?: string;
  reason?: string;
  sweetnessDistance?: number | null;
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
  brand?: string;
  family: string;
  status: 'wishlist' | 'owned' | 'tested' | 'rebuy' | 'skip';
  favorite: boolean;
  rating?: number;
  notes?: string;
  iconToken?: string;
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
