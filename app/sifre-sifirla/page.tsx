import { Suspense } from 'react';
import SifreSifirlaClient from './SifreSifirlaClient';

export const metadata = {
  title: 'Şifre Sıfırla — Koku Dedektifi',
};

export default function SifreSifirlaPage() {
  return (
    <Suspense>
      <SifreSifirlaClient />
    </Suspense>
  );
}
