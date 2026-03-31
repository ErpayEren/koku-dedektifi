import { PageShell } from '@/components/ui/PageShell';

export const metadata = { title: 'İade Politikası — Koku Dedektifi' };

export default function IadePolitikasiPage() {
  return (
    <PageShell title="İade Politikası" date="29 Mart 2026">
      <h2>İade Şartları</h2>
      <ul>
        <li>Çift çekim veya teknik arıza kaynaklı hizmet teslim edilememe durumları</li>
        <li>Satın alma sonrası 14 gün içinde açılan destek talepleri</li>
      </ul>

      <h2>Başvuru</h2>
      <p>
        Talebini <a href="mailto:destek@kokudedektifi.com">destek@kokudedektifi.com</a> üzerinden iletebilirsin.
      </p>

      <h2>İnceleme</h2>
      <p>Her başvuru kayıtlarla birlikte incelenir ve uygun olan talepler makul sürede sonuçlandırılır.</p>

      <hr />
      <p>
        <a href="/gizlilik">Gizlilik Politikası</a> · <a href="/kullanim-kosullari">Kullanım Koşulları</a> ·{' '}
        <a href="/paketler">Paketler</a>
      </p>
    </PageShell>
  );
}
