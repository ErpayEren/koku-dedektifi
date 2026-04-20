import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AnalysisSlugClient } from './AnalysisSlugClient';
import { getAnalysisBySlug } from '@/lib/server/core-analysis';

export const revalidate = 3600;

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const analysis = await getAnalysisBySlug(params.slug).catch(() => null);
  if (!analysis) {
    return { title: 'Analiz bulunamadı — Koku Dedektifi' };
  }

  const title = analysis.brand
    ? `${analysis.brand} ${analysis.name} Analizi — Koku Dedektifi`
    : `${analysis.name} Analizi — Koku Dedektifi`;

  const description = analysis.description
    ? analysis.description.slice(0, 155)
    : `${analysis.name} parfümünün moleküler analizi: notalar, benzerler ve güven skoru.`;

  const ogImageUrl = `/api/analyses/${params.slug}/og`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function AnalysisSlugPage({ params }: Props) {
  const analysis = await getAnalysisBySlug(params.slug).catch(() => null);
  if (!analysis) notFound();

  return <AnalysisSlugClient analysis={analysis} slug={params.slug} />;
}
