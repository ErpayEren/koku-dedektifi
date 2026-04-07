import type { Metadata } from 'next';
import { WearPageClient } from './WearPageClient';

export const metadata: Metadata = {
  title: 'Koku Rutinim — Koku Dedektifi',
};

export default function WearPage() {
  return <WearPageClient />;
}
