import HesapClient from './HesapClient';

export const metadata = {
  title: 'Hesap — Koku Dedektifi',
  description: 'Profil bilgilerini yönet, şifreni değiştir, hesabını düzenle.',
};

export default function HesapPage() {
  return <HesapClient />;
}
