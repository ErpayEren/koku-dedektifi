import type { Metadata } from 'next';
import { GecmisPageClient } from './GecmisPageClient';

export const metadata: Metadata = {
  title: 'Koku Geçmişi — Koku Dedektifi',
};

export default function GecmisPage() {
  return <GecmisPageClient />;
}
