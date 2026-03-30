import Link from 'next/link';
import { LogoMark } from './LogoMark';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 64 : 96;
  const textSize = size === 'sm' ? 'text-[2.2rem]' : 'text-[3.35rem]';
  const gap = size === 'sm' ? 'gap-[18px]' : 'gap-6';

  return (
    <Link href="/" className={`group flex items-center ${gap} no-underline`}>
      <LogoMark size={iconSize} />
      <span
        className={`font-display italic leading-[0.92] tracking-[-0.035em] text-cream transition-transform duration-200 group-hover:translate-x-[1px] ${textSize}`}
      >
        Koku <span className="text-gold">Dedektifi</span>
      </span>
    </Link>
  );
}
