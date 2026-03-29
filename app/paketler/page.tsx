import Link from 'next/link';
import { LegalFooter } from '@/components/LegalFooter';
import { Logo } from '@/components/ui/Logo';

export const metadata = { title: 'Paketler - Koku Dedektifi' };

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="border-b border-white/[.06] px-6 md:px-12 py-5 bg-bg/80 backdrop-blur-xl sticky top-0 z-10">
        <Logo size="sm" />
      </header>

      <main className="flex-1 px-5 md:px-12 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-6 h-px bg-[var(--gold-line)]" />
            <span className="text-[9px] font-mono tracking-[.16em] uppercase text-muted">Paketler ve Fiyatlandırma</span>
          </div>
          <h1 className="font-display italic text-cream text-[2.4rem] md:text-[3rem] leading-[1.08] mb-3">
            İhtiyacın kadar güçlü,
            <br />
            <span className="text-gold not-italic">gerektiğinde Pro.</span>
          </h1>
          <p className="text-[13px] text-muted mb-10">Tüm fiyatlar TRY cinsindendir. Vergiler ödeme adımında hesaplanır.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-white/[.06] bg-[var(--bg-card)] p-7">
              <p className="text-[10px] uppercase tracking-[.12em] font-mono text-muted mb-4">Ücretsiz</p>
              <p className="font-display italic text-cream text-[3rem] leading-none mb-1">0 TL</p>
              <p className="text-[11px] text-muted mb-6">Günlük 3 analiz</p>
              <ul className="space-y-2 text-[13px] text-muted mb-7">
                <li>• Fotoğraf / metin / nota analizi</li>
                <li>• Temel koku piramidi</li>
                <li>• Geçmiş ve dolap başlangıç paketi</li>
              </ul>
              <Link href="/" className="block text-center py-2.5 rounded-lg border border-white/[.08] text-muted hover:text-cream transition-colors no-underline">
                Ücretsiz Başla
              </Link>
            </div>

            <div className="rounded-2xl border border-[var(--gold-line)] bg-[var(--bg-card)] p-7 relative overflow-hidden">
              <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-gradient-to-br from-gold/[.12] to-transparent" />
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] uppercase tracking-[.12em] font-mono text-gold">Pro</p>
                <span className="text-[9px] px-2 py-1 rounded-full border border-[var(--gold-line)] text-gold">En Popüler</span>
              </div>
              <p className="font-display italic text-cream text-[3rem] leading-none mb-1">49 TL</p>
              <p className="text-[11px] text-muted mb-6">Aylık abonelik</p>
              <ul className="space-y-2 text-[13px] text-cream mb-7">
                <li>• Sınırsız analiz</li>
                <li>• Molekül, çark ve teknik katman</li>
                <li>• Layering Lab ve karşılaştırma</li>
                <li>• Öncelikli işlem hızı</li>
              </ul>
              <Link href="/" className="block text-center py-2.5 rounded-lg bg-gold text-bg hover:bg-[#d7b576] transition-colors no-underline">
                Pro'ya Geç
              </Link>
            </div>
          </div>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}

