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
    <footer className="border-t border-white/[.06] px-5 py-7 md:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <span className="text-[10px] font-mono tracking-[.08em] text-hint">© 2026 Koku Dedektifi</span>

        <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:flex sm:flex-wrap sm:justify-end sm:gap-x-6 sm:gap-y-2">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href as Route}
              className="text-[11px] font-mono leading-5 text-muted no-underline transition-colors hover:text-cream"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
