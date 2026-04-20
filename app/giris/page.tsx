import { Suspense } from 'react';
import GirisClient from './GirisClient';

export const metadata = {
  title: 'Giriş Yap — Koku Dedektifi',
  description: 'Hesabına giriş yap, analiz geçmişine ve dolabına eriş.',
};

export default function GirisPage() {
  return (
    <Suspense>
      <GirisClient />
    </Suspense>
  );
}
