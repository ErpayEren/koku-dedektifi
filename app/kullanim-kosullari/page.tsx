import type { Metadata } from 'next';
import { PageShell } from '@/components/ui/PageShell';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları — Koku Dedektifi',
};

export default function KullanimKosullariPage() {
  return (
    <PageShell title="Kullanım Koşulları" date="29 Mart 2026">
      <h2>Hizmet Kapsamı</h2>
      <p>Koku Dedektifi, fotoğraf ve metin girdilerinden AI destekli koku analizi üretir. Sonuçlar tavsiye niteliğindedir.</p>

      <h2>Kullanıcı Sorumluluğu</h2>
      <ul>
        <li>Sistemi kötüye kullanma, otomasyonla suistimal etme veya spam üretme yasaktır.</li>
        <li>Hesap güvenliği kullanıcı sorumluluğundadır.</li>
      </ul>

      <h2>Sorumluluk Sınırı</h2>
      <p>AI çıktıları hata içerebilir. Satın alma ve kullanım kararları kullanıcının sorumluluğundadır.</p>

      <h2>Güncellemeler</h2>
      <p>Koşullar güncellenebilir. Güncel sürüm bu sayfada yayımlanır.</p>

      <hr />
      <p>
        <a href="/gizlilik">Gizlilik Politikası</a> · <a href="/iade-politikasi">İade Politikası</a> · <a href="/paketler">Paketler</a>
      </p>
    </PageShell>
  );
}
