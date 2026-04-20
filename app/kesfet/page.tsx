import type { Metadata } from 'next';
import { KesfetClient } from './KesfetClient';

export const metadata: Metadata = {
  title: 'Keşfet — Koku Dedektifi',
  description: 'Parfümleri keşfet: trend kokular, marka araması ve kişisel öneriler.',
  openGraph: {
    title: 'Keşfet — Koku Dedektifi',
    description: 'Parfümleri keşfet: trend kokular, marka araması ve kişisel öneriler.',
  },
};

export default function KesfetPage() {
  return <KesfetClient />;
}
