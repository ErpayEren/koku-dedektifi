export interface ScentBadge {
  key: 'rookie' | 'adept' | 'expert' | 'perfumer';
  label: string;
  subtitle: string;
  threshold: number;
  tone: string;
}

const BADGES: ScentBadge[] = [
  {
    key: 'rookie',
    label: 'Koku Dedektifi Çırak',
    subtitle: 'İlk izleri toplamaya başladın.',
    threshold: 0,
    tone: 'var(--gold)',
  },
  {
    key: 'adept',
    label: 'Koku Dedektifi Uzman',
    subtitle: 'Koku dilin netleşiyor, seçimlerin keskinleşiyor.',
    threshold: 10,
    tone: '#a78bfa',
  },
  {
    key: 'expert',
    label: 'Parfümör Gözü',
    subtitle: 'Aromatik örüntüleri ayırt eden güçlü bir profil oluştu.',
    threshold: 25,
    tone: 'var(--sage)',
  },
  {
    key: 'perfumer',
    label: 'Parfümör Burnu',
    subtitle: 'Moleküler seviyede okuma yapabilen üst seviye kullanıcı.',
    threshold: 50,
    tone: '#f97316',
  },
];

export function resolveScentBadge(totalAnalyses: number): {
  badge: ScentBadge;
  nextBadge: ScentBadge | null;
  progressPct: number;
} {
  const total = Number.isFinite(totalAnalyses) ? Math.max(0, totalAnalyses) : 0;
  const badge = [...BADGES].reverse().find((item) => total >= item.threshold) ?? BADGES[0];
  const currentIndex = BADGES.findIndex((item) => item.key === badge.key);
  const nextBadge = BADGES[currentIndex + 1] ?? null;

  if (!nextBadge) {
    return { badge, nextBadge: null, progressPct: 100 };
  }

  const range = nextBadge.threshold - badge.threshold;
  const current = total - badge.threshold;
  const progressPct = Math.max(0, Math.min(100, Math.round((current / Math.max(1, range)) * 100)));

  return { badge, nextBadge, progressPct };
}
