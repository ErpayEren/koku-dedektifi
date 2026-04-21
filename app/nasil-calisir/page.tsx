import type { Metadata } from 'next';
import { PageShell } from '@/components/ui/PageShell';

export const metadata: Metadata = {
  title: 'Nasıl Çalışır?',
  description: 'Koku Dedektifi yapay zekâ motoru nasıl çalışır? LLM analizi, vektör arama ve güven skoru hesabı.',
  openGraph: {
    title: 'Nasıl Çalışır? — Koku Dedektifi',
    description: 'Koku Dedektifi yapay zekâ motoru nasıl çalışır?',
  },
};

export default function NasilCalisirPage() {
  return (
    <PageShell title="Nasıl Çalışır?" date="Nisan 2026">
      <p>
        Koku Dedektifi'nin arkasındaki teknoloji üç katmandan oluşur:
        giriş işleme, yapay zekâ analizi ve vektör eşleştirme.
      </p>

      <h2>1. Giriş İşleme</h2>
      <p>
        Fotoğraf, metin ya da nota piramidi olarak üç farklı yolla analiz başlatabilirsiniz.
      </p>
      <ul>
        <li>
          <strong>Fotoğraf:</strong> Şişe görseli base64 olarak modele gönderilir;
          model marka, isim ve görünür notaları tespit eder.
        </li>
        <li>
          <strong>Metin:</strong> Serbest metin olarak parfüm adı veya açıklaması girilir.
        </li>
        <li>
          <strong>Nota Piramidi:</strong> Üst/kalp/dip notaları yapılandırılmış olarak
          iletilir; model kimya düzeyinde yorumlar.
        </li>
        <li>
          <strong>Barkod (Pro):</strong> EAN-13 barkod {'>'}  ürün veritabanı sorgusu {'>'}  analiz.
        </li>
      </ul>

      <h2>2. LLM Analiz Motoru</h2>
      <p>
        Girdi, versiyonlu bir prompt şablonuna (v3) eklenerek önce Gemini 1.5 Flash&apos;a,
        yük artışında OpenRouter üzerinden Anthropic Claude&apos;a yönlendirilir.
        Model şu çıktıları üretir:
      </p>
      <ul>
        <li>Koku piramidi (üst/kalp/dip notalar)</li>
        <li>Anahtar moleküller ve kanıt seviyeleri (Kesin / Muhtemel / Spekülatif)</li>
        <li>Parfümör yorumu ve duygu haritası</li>
        <li>Benzer parfüm adayları</li>
      </ul>
      <p>
        Tüm çıktılar Zod şemasından geçirilir. Hata durumunda model düzeltme
        promptuyla bir kez daha çağrılır.
      </p>

      <h2>3. Vektör Eşleştirme (RAG)</h2>
      <p>
        LLM'in önerdiği benzer parfümler, Supabase pgvector ile 3.000+ parfüm
        vektör veritabanında doğrulanır. Cosine similarity &gt; 0.72 eşiğinin altındaki
        adaylar elenir; geri kalanlar güven skoruna göre sıralanır.
      </p>

      <h2>Güven Skoru (0–100)</h2>
      <p>
        Sonuçtaki <strong>güven skoru</strong> dört bileşenden oluşur:
      </p>
      <ul>
        <li><strong>Kimlik bonusu:</strong> Marka ve tam isim tespiti</li>
        <li><strong>Piramit bonusu:</strong> Dolu nota piramidi (üst+kalp+dip)</li>
        <li><strong>Molekül bonusu:</strong> Kanıt seviyesi ağırlıklı molekül sayısı</li>
        <li><strong>Mod bonusu:</strong> Fotoğraf analizi daha yüksek başlar</li>
      </ul>
      <p>
        70 ve üzeri Yüksek Güven (altın), 40–69 Orta Güven (kehribar),
        40 altı Düşük Güven (kırmızı) olarak işaretlenir.
      </p>

      <h2>Önbellek &amp; Gizlilik</h2>
      <p>
        Aynı giriş için 7 gün boyunca önbellekten yanıt döner (SHA-256 tabanlı
        idempotency). Analizler varsayılan olarak özel kalır; siz paylaşmadığınız
        sürece kimse göremez.
      </p>
    </PageShell>
  );
}
