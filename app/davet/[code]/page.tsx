import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';

interface Props {
  params: { code: string };
}

export function generateMetadata({ params }: Props): Metadata {
  return {
    title: 'Davet Linki — Koku Dedektifi',
    description: `Seni Koku Dedektifi'ne davet ettiler! Ücretsiz hesap oluştur, parfüm kimyasını keşfet.`,
    robots: { index: false, follow: false },
  };
}

export default function DavetPage({ params }: Props) {
  const { code } = params;

  return (
    <AppShell hideSidebar>
      <TopBar title="Davet" />
      <main className="flex min-h-[70vh] items-center justify-center px-5 py-12">
        <div className="anim-up mx-auto w-full max-w-md text-center">
          {/* Decorative ring */}
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-[var(--gold-line)]/50 bg-[var(--gold-dim)]/10">
            <span className="text-4xl" aria-hidden="true">🎁</span>
          </div>

          <div className="mb-3 flex justify-center">
            <span className="rounded-full border border-[var(--gold-line)]/40 bg-[var(--gold-dim)]/10 px-3 py-1 text-[9px] font-mono uppercase tracking-[.14em] text-gold">
              Davet Kodu: {code}
            </span>
          </div>

          <h1 className="mb-4 text-[2rem] font-semibold leading-[1.1] text-cream">
            Seni Koku Dedektifi&apos;ne
            <br />
            <span className="text-gold">davet ettiler!</span>
          </h1>

          <p className="mb-8 text-[13px] leading-relaxed text-muted">
            Parfümünü fotoğrafla ya da tarif et; yapay zekâ saniyeler içinde
            koku piramidini, moleküllerini ve benzer parfümleri çözümlesin.
          </p>

          <div className="space-y-3">
            <Link
              href={`/kayit?ref=${code}`}
              className="flex w-full items-center justify-center rounded-2xl bg-gold py-4 text-[11px] font-mono uppercase tracking-[.12em] text-bg transition-colors hover:bg-[#d8b676]"
            >
              Ücretsiz Hesap Oluştur
            </Link>
            <Link
              href="/"
              className="flex w-full items-center justify-center rounded-2xl border border-white/[.08] bg-white/[.03] py-4 text-[11px] font-mono uppercase tracking-[.12em] text-muted transition-colors hover:border-white/[.15] hover:text-cream"
            >
              Önce Dene, Sonra Kayıt Ol
            </Link>
          </div>

          {/* TODO_BILLING: When reward system is active, display "X gün ücretsiz Pro" banner here */}
          <p className="mt-6 text-[11px] text-muted/50">
            Ödül sistemi yakında aktif olacak.
          </p>
        </div>
      </main>
    </AppShell>
  );
}
