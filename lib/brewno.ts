// ── Brewno Type Definitions ──────────────────────────────────

export interface Coffee {
  id: string;
  slug: string;
  name: string;
  roaster: string | null;
  origin_country: string | null;
  origin_region: string | null;
  farm: string | null;
  altitude_m: number | null;
  variety: string[];
  process: string | null;
  roast_level: string | null;
  flavor_notes: string[];
  acidity_score: number | null;
  sweetness_score: number | null;
  body_score: number | null;
  bitterness_score: number | null;
  aroma_score: number | null;
  brew_score: number | null;
  community_rating_count: number;
  community_rating_avg: number;
  cover_image_url: string | null;
  description: string | null;
  price_per_100g: number | null;
  bag_sizes: number[];
  available: boolean;
  certifications: string[];
  tags: string[];
  created_at: string;
}

export interface CoffeeRating {
  id: string;
  coffee_id: string;
  user_id: string;
  overall_score: number;
  acidity_score: number | null;
  sweetness_score: number | null;
  body_score: number | null;
  bitterness_score: number | null;
  aroma_score: number | null;
  review_text: string | null;
  brew_method: string | null;
  brew_recipe: Record<string, unknown>;
  liked_notes: string[];
  created_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface UserTasteProfile {
  id: string;
  user_id: string;
  preferred_roast: string[];
  preferred_process: string[];
  preferred_notes: string[];
  disliked_notes: string[];
  acidity_pref: number;
  sweetness_pref: number;
  body_pref: number;
  bitterness_pref: number;
  quiz_completed: boolean;
  updated_at: string;
}

export interface BrewGuideStep {
  step: number;
  duration: number;
  title: string;
  description: string;
  tip: string | null;
}

export interface BrewGuide {
  id: string;
  method: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  brew_time_seconds: number | null;
  steps: BrewGuideStep[];
  recommended_roast: string | null;
  recommended_grind: string | null;
  water_temp_c: number | null;
  coffee_to_water_ratio: string | null;
  yield_ml: number | null;
  cover_image_url: string | null;
  created_at: string;
}

export interface BrewnoProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  total_ratings: number;
  followers_count: number;
  following_count: number;
  created_at: string;
}

export interface RecommendedCoffee extends Coffee {
  match_score: number;
  match_reasons: string[];
}

// ── Helper constants ──────────────────────────────────────────

export const ROAST_LEVELS = ['light', 'medium-light', 'medium', 'medium-dark', 'dark'] as const;
export const PROCESSES = ['washed', 'natural', 'honey', 'anaerobic', 'wet-hulled'] as const;
export const BREW_METHODS = ['v60', 'espresso', 'aeropress', 'french-press', 'chemex', 'moka-pot', 'cold-brew'] as const;

export const ROAST_LABELS: Record<string, string> = {
  light: 'Light Roast',
  'medium-light': 'Medium-Light',
  medium: 'Medium Roast',
  'medium-dark': 'Medium-Dark',
  dark: 'Dark Roast',
};

export const PROCESS_LABELS: Record<string, string> = {
  washed: 'Washed',
  natural: 'Natural',
  honey: 'Honey',
  anaerobic: 'Anaerobic',
  'wet-hulled': 'Wet-Hulled',
};

export const BREW_METHOD_LABELS: Record<string, string> = {
  v60: 'V60 Pour-Over',
  espresso: 'Espresso',
  aeropress: 'AeroPress',
  'french-press': 'French Press',
  chemex: 'Chemex',
  'moka-pot': 'Moka Pot',
  'cold-brew': 'Cold Brew',
};

export const FLAVOR_NOTE_GROUPS: Record<string, string[]> = {
  Fruity: ['blueberry', 'strawberry', 'raspberry', 'cherry', 'dark cherry', 'dried blueberry', 'dried fig', 'dried cherry', 'peach', 'apricot', 'mango', 'passion fruit', 'tropical fruit', 'citrus', 'lemon', 'lime', 'orange peel', 'tangerine', 'grapefruit', 'mandarin', 'red apple', 'green grape', 'white grape', 'lychee', 'pineapple', 'plum', 'dark plum', 'black cherry'],
  Floral: ['jasmine', 'rose', 'lavender', 'hibiscus', 'bergamot', 'osmanthus flower', 'florals', 'rose water'],
  Chocolate: ['milk chocolate', 'dark chocolate', 'cocoa', 'cacao'],
  Nutty: ['hazelnut', 'walnut', 'almond', 'pecan', 'macadamia nut'],
  Sweet: ['caramel', 'toffee', 'brown sugar', 'honey', 'vanilla', 'praline', 'butterscotch', 'molasses', 'bubblegum'],
  Spiced: ['cardamom', 'cinnamon', 'clove', 'black pepper', 'light spice'],
  'Tea-like': ['black tea', 'earl grey', 'green tea', 'white peach'],
  Savory: ['tobacco', 'cedar', 'earth', 'wine', 'winey', 'brown butter', 'fresh cream', 'sweet corn'],
};

// ── Recommendation Engine ─────────────────────────────────────

/**
 * Content-based recommendation score.
 * Returns 0-100 match percentage based on taste profile vs coffee attributes.
 */
export function contentBasedScore(
  coffee: Coffee,
  profile: UserTasteProfile,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 50; // baseline

  // Roast preference match
  if (profile.preferred_roast.length > 0) {
    if (coffee.roast_level && profile.preferred_roast.includes(coffee.roast_level)) {
      score += 15;
      reasons.push(`Your preferred ${ROAST_LABELS[coffee.roast_level] ?? coffee.roast_level} roast`);
    } else {
      score -= 10;
    }
  }

  // Process preference match
  if (profile.preferred_process.length > 0 && coffee.process) {
    if (profile.preferred_process.includes(coffee.process)) {
      score += 10;
      reasons.push(`${PROCESS_LABELS[coffee.process] ?? coffee.process} process you love`);
    }
  }

  // Flavor notes overlap
  if (profile.preferred_notes.length > 0 && coffee.flavor_notes.length > 0) {
    const matches = coffee.flavor_notes.filter((n) => profile.preferred_notes.includes(n));
    if (matches.length > 0) {
      const noteBonus = Math.min(20, matches.length * 7);
      score += noteBonus;
      if (matches.length === 1) {
        reasons.push(`Contains ${matches[0]} — a note you enjoy`);
      } else {
        reasons.push(`${matches.length} flavour notes match your profile`);
      }
    }
    // Disliked notes penalty
    const dislikedMatches = coffee.flavor_notes.filter((n) => profile.disliked_notes.includes(n));
    if (dislikedMatches.length > 0) {
      score -= dislikedMatches.length * 8;
    }
  }

  // Attribute proximity scoring
  if (coffee.acidity_score != null) {
    const diff = Math.abs(coffee.acidity_score - profile.acidity_pref);
    score += Math.max(0, 8 - diff * 2);
  }
  if (coffee.sweetness_score != null) {
    const diff = Math.abs(coffee.sweetness_score - profile.sweetness_pref);
    score += Math.max(0, 8 - diff * 2);
  }
  if (coffee.body_score != null) {
    const diff = Math.abs(coffee.body_score - profile.body_pref);
    score += Math.max(0, 6 - diff * 1.5);
  }

  // Community quality bonus
  if (coffee.community_rating_avg >= 4.5) {
    score += 5;
    reasons.push('Highly rated by the community');
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons: reasons.slice(0, 3),
  };
}

/**
 * Compute similarity between two coffees for "you might also like" section.
 * Returns 0-100 similarity score.
 */
export function coffeeSimilarityScore(a: Coffee, b: Coffee): number {
  let score = 0;

  if (a.roast_level === b.roast_level) score += 25;
  else if (
    Math.abs(ROAST_LEVELS.indexOf(a.roast_level as never) - ROAST_LEVELS.indexOf(b.roast_level as never)) === 1
  ) {
    score += 10;
  }

  if (a.process === b.process) score += 20;

  const noteOverlap = a.flavor_notes.filter((n) => b.flavor_notes.includes(n)).length;
  score += Math.min(30, noteOverlap * 8);

  if (a.origin_country === b.origin_country) score += 15;

  if (a.acidity_score != null && b.acidity_score != null) {
    score += Math.max(0, 5 - Math.abs(a.acidity_score - b.acidity_score));
  }
  if (a.body_score != null && b.body_score != null) {
    score += Math.max(0, 5 - Math.abs(a.body_score - b.body_score));
  }

  return Math.min(100, score);
}

// ── Formatting helpers ────────────────────────────────────────

export function formatBrewScore(score: number | null): string {
  if (score == null) return '—';
  return score.toFixed(1);
}

export function formatRating(rating: number | null): string {
  if (rating == null) return '—';
  return rating.toFixed(1);
}

export function formatAltitude(m: number | null): string {
  if (m == null) return '—';
  return `${m.toLocaleString()}m`;
}

export function brewScoreColor(score: number | null): string {
  if (score == null) return '#6b7280';
  if (score >= 90) return '#f59e0b';
  if (score >= 80) return '#7eb8a4';
  if (score >= 70) return '#c9a96e';
  return '#8a8480';
}

export function roastLevelEmoji(roastLevel: string | null): string {
  const map: Record<string, string> = {
    light: '☀️',
    'medium-light': '🌤',
    medium: '⛅',
    'medium-dark': '🌥',
    dark: '🌑',
  };
  return roastLevel ? (map[roastLevel] ?? '☕') : '☕';
}

export function processEmoji(process: string | null): string {
  const map: Record<string, string> = {
    washed: '💧',
    natural: '🌿',
    honey: '🍯',
    anaerobic: '🧪',
    'wet-hulled': '🌊',
  };
  return process ? (map[process] ?? '☕') : '☕';
}
