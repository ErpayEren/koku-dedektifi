import Link from 'next/link';

export function ProBadge() {
  return (
    <Link
      href="/paketler"
      className="text-[9px] font-mono tracking-[.12em] uppercase
                 px-2.5 py-1 border border-[var(--gold-line)] rounded-[6px]
                 text-gold bg-[var(--gold-dim)] hover:bg-gold/20
                 transition-colors no-underline"
    >
      Pro
    </Link>
  );
}
