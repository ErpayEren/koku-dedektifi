import { Suspense } from 'react';
import KayitClient from './KayitClient';

export const metadata = {
  title: 'Kayıt Ol — Koku Dedektifi',
  description: 'Ücretsiz hesap oluştur, parfüm geçmişini kaydet ve dolabını yönet.',
};

export default function KayitPage() {
  return (
    <Suspense>
      <KayitClient />
    </Suspense>
  );
}
