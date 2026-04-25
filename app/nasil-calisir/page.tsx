import type { Metadata } from 'next';
import { PageShell } from '@/components/ui/PageShell';

export const metadata: Metadata = {
  title: 'Nasil Calisir?',
  description:
    'Koku Dedektifi motoru nasil calisir? LLM analizi, vektor arama ve guven skoru hesabi.',
  openGraph: {
    title: 'Nasil Calisir? - Koku Dedektifi',
    description: 'Koku Dedektifi yapay zeka motorunun teknik akisi.',
  },
};

export default function NasilCalisirPage() {
  return (
    <PageShell title="Nasil Calisir?" date="Nisan 2026">
      <p>
        Koku Dedektifi teknolojisi uc katmandan olusur: giris isleme, yapay zeka analizi
        ve vektor eslestirme.
      </p>

      <h2>1. Giris Isleme</h2>
      <p>Fotograf, metin ya da nota piramidi ile uc farkli sekilde analiz baslatilabilir.</p>
      <ul>
        <li>
          <strong>Fotograf:</strong> Sise gorseli base64 olarak modele gonderilir; model marka,
          isim ve gorunur notalari tespit eder.
        </li>
        <li>
          <strong>Metin:</strong> Serbest metin olarak parfum adi veya aciklamasi girilir.
        </li>
        <li>
          <strong>Nota Piramidi:</strong> Ust, kalp ve dip notalar yapilandirilmis sekilde
          iletilir; model kimya duzeyinde yorumlar.
        </li>
        <li>
          <strong>Barkod (Pro):</strong> EAN-13 barkod {'>'} urun veritabani sorgusu {'>'} analiz.
        </li>
      </ul>

      <h2>2. LLM Analiz Motoru</h2>
      <p>
        Girdi, versiyonlu prompt sablonuna eklenerek once Gemini hattina, yogunluk aninda
        yedek saglayiciya yonlendirilir. Model su ciktilari uretir:
      </p>
      <ul>
        <li>Koku piramidi (ust, kalp ve dip notalar)</li>
        <li>Anahtar molekuller ve kanit seviyeleri</li>
        <li>Parfumor yorumu ve duygu haritasi</li>
        <li>Benzer parfum adaylari</li>
      </ul>
      <p>
        Tum ciktilar Zod semasindan gecirilir. Hata durumunda model tek sefer duzeltme
        istegi ile tekrar cagrilir.
      </p>

      <h2>3. Vektor Eslestirme (RAG)</h2>
      <p>
        LLM tarafindan onerilen benzer parfumler, Supabase pgvector ile 3.000+ parfum
        vektor veritabaninda dogrulanir. Cosine similarity &gt; 0.72 esiginin altindaki
        adaylar elenir; geri kalanlar guven skoruna gore siralanir.
      </p>

      <h2>Guven Skoru (0-100)</h2>
      <p>
        Sonuctaki <strong>guven skoru</strong> dort bilesenden olusur:
      </p>
      <ul>
        <li>
          <strong>Kimlik bonusu:</strong> Marka ve tam isim tespiti
        </li>
        <li>
          <strong>Piramit bonusu:</strong> Dolu nota piramidi
        </li>
        <li>
          <strong>Molekul bonusu:</strong> Kanit seviyesi agirlikli molekul sayisi
        </li>
        <li>
          <strong>Mod bonusu:</strong> Fotograf analizi daha yuksek baslar
        </li>
      </ul>
      <p>
        70 ve uzeri Yuksek Guven (altin), 40-69 Orta Guven (kehribar), 40 alti Dusuk Guven
        (kirmizi) olarak isaretlenir.
      </p>

      <h2>Onbellek ve Gizlilik</h2>
      <p>
        Ayni giris icin 7 gun boyunca onbellekten yanit doner (SHA-256 tabanli idempotency).
        Analizler varsayilan olarak ozel kalir; siz paylasmadiginiz surece baska kullanicilar
        goremez.
      </p>
    </PageShell>
  );
}
