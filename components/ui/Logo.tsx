import Link from 'next/link';
import { LogoMark } from './LogoMark';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const textSize = size === 'sm' ? 'text-[15px]' : 'text-[18px]';

  return (
    <Link href="/" className="flex items-center gap-2.5 no-underline">
      <LogoMark size={size === 'sm' ? 30 : 34} />
      <span className={`font-display italic text-cream leading-none ${textSize}`}>
        Koku <span className="text-gold">Dedektifi</span>
      </span>
    </Link>
  );
}
