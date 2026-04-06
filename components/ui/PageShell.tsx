import { AppShell } from '../AppShell';
import { LegalFooter } from '../LegalFooter';
import { TopBar } from '../TopBar';

interface PageShellProps {
  children: React.ReactNode;
  title: string;
  date?: string;
}

export function PageShell({ children, title, date }: PageShellProps) {
  return (
    <AppShell hideSidebar>
      <TopBar title={title} />
      <main className="px-4 py-4 pb-24 sm:px-6 sm:py-5 md:px-8 md:py-6 md:pb-10">
        <div className="anim-up mx-auto w-full max-w-3xl">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="h-px w-5 bg-[var(--gold-line)]" />
            <span className="text-[9px] font-mono uppercase tracking-[.16em] text-muted">Koku Dedektifi</span>
          </div>
          <h1 className="mb-2 text-[2.2rem] font-semibold leading-[1.1] text-cream">{title}</h1>
          {date ? <p className="mb-12 text-[11px] font-mono text-muted">Son güncelleme: {date}</p> : null}
          <div className="prose-kd">{children}</div>
        </div>
      </main>
      <LegalFooter />
    </AppShell>
  );
}
