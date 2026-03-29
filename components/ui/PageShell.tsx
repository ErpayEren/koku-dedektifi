import { LegalFooter } from '../LegalFooter';
import { Logo } from './Logo';

interface PageShellProps {
  children: React.ReactNode;
  title: string;
  date?: string;
}

export function PageShell({ children, title, date }: PageShellProps) {
  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="border-b border-white/[.06] px-6 md:px-12 py-5 bg-bg/80 backdrop-blur-xl sticky top-0 z-10">
        <Logo size="sm" />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 md:px-0 py-16 anim-up">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-5 h-px bg-[var(--gold-line)]" />
          <span className="text-[9px] font-mono tracking-[.16em] uppercase text-muted">Koku Dedektifi</span>
        </div>
        <h1 className="font-display italic text-cream text-[2.4rem] leading-[1.1] mb-2">{title}</h1>
        {date ? <p className="text-[11px] font-mono text-muted mb-12">Son güncelleme: {date}</p> : null}
        <div className="prose-kd">{children}</div>
      </main>

      <LegalFooter />
    </div>
  );
}

