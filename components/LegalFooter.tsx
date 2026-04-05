import type { Route } from 'next';
import Link from 'next/link';

const LINKS = [
  { href: '/gizlilik', label: 'Gizlilik' },
  { href: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
  { href: '/iade-politikasi', label: 'İade Politikası' },
  { href: '/paketler', label: 'Paketler' },
] as const;

export function LegalFooter() {
  return (
    <footer className="border-t border-white/[.06] px-6 py-8 md:px-12">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-[10px] font-mono text-hint">© 2026 Koku Dedektifi</span>
        <div className="flex-1" />
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href as Route}
            className="text-[11px] font-mono text-muted transition-colors no-underline hover:text-cream"
          >
            {label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
