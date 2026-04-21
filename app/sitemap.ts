import type { MetadataRoute } from 'next';

const BASE = 'https://koku-dedektifi.vercel.app';

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFreq: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/', priority: 1.0, changeFreq: 'daily' },
  { path: '/kesfet', priority: 0.9, changeFreq: 'daily' },
  { path: '/nasil-calisir', priority: 0.8, changeFreq: 'monthly' },
  { path: '/hakkinda', priority: 0.7, changeFreq: 'monthly' },
  { path: '/blog', priority: 0.7, changeFreq: 'weekly' },
  { path: '/paketler', priority: 0.6, changeFreq: 'monthly' },
  { path: '/molekuller', priority: 0.6, changeFreq: 'weekly' },
  { path: '/notalar', priority: 0.6, changeFreq: 'weekly' },
  { path: '/gizlilik', priority: 0.3, changeFreq: 'yearly' },
  { path: '/kullanim-kosullari', priority: 0.3, changeFreq: 'yearly' },
  { path: '/iade-politikasi', priority: 0.3, changeFreq: 'yearly' },
];

async function fetchPublicSlugs(): Promise<string[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return [];

    const res = await fetch(
      `${supabaseUrl}/rest/v1/analyses?select=slug&is_public=eq.true&slug=not.is.null&order=created_at.desc&limit=500`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ slug: string }>;
    return rows.map((r) => r.slug).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, priority, changeFreq }) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: changeFreq,
    priority,
  }));

  const slugs = await fetchPublicSlugs();
  const analysisEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE}/analiz/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }));

  return [...staticEntries, ...analysisEntries];
}
