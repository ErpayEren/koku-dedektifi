import Link from 'next/link';
import { LogoMark } from './LogoMark';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 30 : 30;
  const textSize = size === 'sm' ? 'text-[17px]' : 'text-[17px]';
  const gap = size === 'sm' ? 'gap-[10px]' : 'gap-[10px]';

  return (
    <Link href="/" className={`group flex items-center ${gap} no-underline`} aria-label="Koku Dedektifi ana sayfa">
      <LogoMark size={iconSize} />
      <span
        className={`font-display italic leading-none tracking-[-0.02em] text-cream transition-transform duration-200 group-hover:translate-x-[1px] ${textSize}`}
      >
        Koku <span className="text-gold">Dedektifi</span>
      </span>
    </Link>
  );
}
