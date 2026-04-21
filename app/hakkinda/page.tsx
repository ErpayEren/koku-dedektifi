import type { Metadata } from 'next';
import { PageShell } from '@/components/ui/PageShell';

export const metadata: Metadata = {
  title: 'Hakkında',
  description: 'Koku Dedektifi nedir? Parfüm kimyasını herkes için erişilebilir kılmak üzere kurulmuş bir yapay zekâ projesi.',
  openGraph: {
    title: 'Hakkında — Koku Dedektifi',
    description: 'Parfüm kimyasını herkes için erişilebilir kılmak üzere kurulmuş bir yapay zekâ projesi.',
  },
};

export default function HakkindaPage() {
  return (
    <PageShell title="Hakkında" date="Nisan 2026">
      <p>
        Koku Dedektifi, bir parfümün şişesini gördüğünüzde ya da adını duyduğunuzda
        aklınıza takılan soruları cevaplamak için doğdu: <em>Bu koku ne içeriyor?
        Neden bu kadar kalıcı? Hangisi buna benziyor?</em>
      </p>

      <h2>Manifesto</h2>
      <p>
        Parfüm endüstrisi yüzyıllardır formüllerini gizledi. Molekül isimleri yalnızca
        parfümörlerin dilinde yaşadı; ortalama bir tüketici etiketteki &ldquo;floral-woody&rdquo;
        etiketinin ötesine geçemedi.
      </p>
      <p>
        Biz bunun değişmesi gerektiğine inanıyoruz. Bir parfümün kimyasını anlamak,
        onu daha iyi sevmek demektir. Doğru seçimler yapmak, gereksiz harcamaların
        önüne geçmek ve koku kültürüne gerçek anlamda katılmak demektir.
      </p>

      <h2>Nasıl Çalışır?</h2>
      <p>
        Fotoğraf yükleyin, parfüm adını yazın ya da nota piramidini paylaşın;
        büyük dil modelleri ve pgvector tabanlı RAG sistemimiz saniyeler içinde
        moleküler bir portre oluşturur. Her sonuç; kanıt seviyesi, güven skoru
        ve benzer profil önerileriyle birlikte gelir.
      </p>

      <h2>Teknoloji</h2>
      <ul>
        <li>Google Gemini &amp; Anthropic Claude — LLM analiz motoru</li>
        <li>pgvector (Supabase) — 3.000+ parfüm vektör veritabanı</li>
        <li>Next.js 14 App Router — web arayüzü</li>
        <li>Capacitor 8 — Android native uygulama</li>
      </ul>

      <h2>Ekip</h2>
      <p>
        Koku Dedektifi bağımsız bir proje olarak geliştirilmektedir.
        Geri bildirim ve iş birlikleri için{' '}
        <a href="mailto:destek@kokudedektifi.app">destek@kokudedektifi.app</a>{' '}
        adresine yazabilirsiniz.
      </p>
    </PageShell>
  );
}
