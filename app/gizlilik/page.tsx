import { PageShell } from '@/components/ui/PageShell';

export const metadata = { title: 'Gizlilik Politikası — Koku Dedektifi' };

export default function GizlilikPage() {
  return (
    <PageShell title="Gizlilik Politikası" date="29 Mart 2026">
      <h2>Veri Sorumlusu</h2>
      <p>
        Bu hizmet <strong>Koku Dedektifi</strong> tarafından işletilir. Gizlilik taleplerin için{' '}
        <a href="mailto:destek@kokudedektifi.com">destek@kokudedektifi.com</a> adresi kullanılabilir.
      </p>

      <h2>İşlenen Veriler</h2>
      <ul>
        <li>Hesap bilgileri (e-posta, ad)</li>
        <li>Analiz için yüklenen görsel veya metin girdileri</li>
        <li>Ürün kalitesini iyileştirmek için anonim kullanım metrikleri</li>
      </ul>

      <h2>Saklama Süresi</h2>
      <ul>
        <li>Hesap verileri: hesap silinene kadar</li>
        <li>Teknik loglar: 90 gün</li>
      </ul>

      <h2>Üçüncü Taraf Hizmetler</h2>
      <p>Altyapıda Vercel, Supabase, Redis ve Sentry; analiz üretiminde AI sağlayıcıları kullanılabilir.</p>

      <hr />
      <p>
        <a href="/kullanim-kosullari">Kullanım Koşulları</a> · <a href="/iade-politikasi">İade Politikası</a> ·{' '}
        <a href="/paketler">Paketler</a>
      </p>
    </PageShell>
  );
}
