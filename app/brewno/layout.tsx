import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    default: 'Brewno — Coffee Discovery',
    template: '%s — Brewno',
  },
  description: 'Discover, rate, and explore specialty coffees from around the world.',
};

const NAV_ITEMS = [
  { href: '/brewno', label: 'Discover', icon: '✦' },
  { href: '/brewno/kesfet', label: 'Explore', icon: '⊕' },
  { href: '/brewno/demleme-rehberi', label: 'Brew Guides', icon: '◎' },
  { href: '/brewno/profil', label: 'Profile', icon: '◉' },
];

function BrewnoSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 md:block lg:w-72">
      <div className="sticky top-0 flex h-screen flex-col pt-8 pb-6 px-4">
        {/* Logo */}
        <Link href="/brewno" className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-xl shadow-[0_4px_16px_rgba(245,158,11,0.3)]">
            ☕
          </div>
          <div>
            <span className="font-display text-xl font-medium text-cream">Brewno</span>
            <p className="text-[10px] text-white/30 tracking-[0.1em] uppercase">Coffee Discovery</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 transition-all hover:bg-white/[0.06] hover:text-white/90"
            >
              <span className="text-base text-amber-400/70">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Back to main app */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-white/30 transition-colors hover:text-white/50"
        >
          ← Back to Koku Dedektifi
        </Link>
      </div>
    </aside>
  );
}

export default function BrewnoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] min-h-screen">
      <BrewnoSidebar />
      <main className="flex-1 min-w-0 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  );
}
