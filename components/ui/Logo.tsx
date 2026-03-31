import Link from 'next/link';
import { LogoMark } from './LogoMark';

type LogoSize = 'sm' | 'md' | 'sidebar';

const SIZE_MAP: Record<LogoSize, { icon: number; text: string; gap: string; max: string }> = {
  sm: {
    icon: 48,
    text: 'text-[18px]',
    gap: 'gap-[10px]',
    max: 'max-w-[164px]',
  },
  md: {
    icon: 60,
    text: 'text-[24px]',
    gap: 'gap-[12px]',
    max: 'max-w-[224px]',
  },
  sidebar: {
    icon: 72,
    text: 'text-[24px]',
    gap: 'gap-[12px]',
    max: 'max-w-[150px]',
  },
};

export function Logo({ size = 'md' }: { size?: LogoSize }) {
  const config = SIZE_MAP[size];

  return (
    <Link
      href="/"
      className={`group inline-flex max-w-full items-center ${config.gap} no-underline`}
      aria-label="Koku Dedektifi ana sayfa"
    >
      <LogoMark size={config.icon} />
      <span
        className={`min-w-0 ${config.max} whitespace-nowrap font-display italic leading-[0.96] tracking-[-0.02em] transition-transform duration-200 group-hover:translate-x-[1px] ${config.text}`}
      >
        <span className="text-cream">Koku </span>
        <span className="text-gold">Dedektifi</span>
      </span>
    </Link>
  );
}
