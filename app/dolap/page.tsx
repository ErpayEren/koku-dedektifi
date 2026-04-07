import type { Metadata } from 'next';
import { DolapPageClient } from './DolapPageClient';

export const metadata: Metadata = {
  title: 'Koku Dolabım — Koku Dedektifi',
};

export default function DolapPage() {
  return <DolapPageClient />;
}
