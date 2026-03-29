import type { Route } from 'next';
import Link from 'next/link';

const LINKS = [
  { href: '/gizlilik', label: 'Gizlilik' },
  { href: '/kullanim-kosullari', label: 'Kullanim Kosullari' },
  { href: '/iade-politikasi', label: 'Iade Politikasi' },
  { href: '/paketler', label: 'Paketler' },
] as const;

export function LegalFooter() {
  return (
    <footer className="border-t border-white/[.06] px-6 md:px-12 py-8">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-[10px] font-mono text-hint">© 2026 Koku Dedektifi</span>
        <div className="flex-1" />
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href as Route}
            className="text-[11px] font-mono text-muted hover:text-cream transition-colors no-underline"
          >
            {label}
          </Link>
        ))}
      </div>
    </footer>
  );
}

