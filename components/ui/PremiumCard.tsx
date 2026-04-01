'use client';

import { cn } from '@/lib/utils';

type PremiumGlow = 'amber' | 'purple' | 'teal' | false | undefined;

interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: PremiumGlow;
  style?: React.CSSProperties;
}

export function PremiumCard({ children, className, glow, style }: PremiumCardProps) {
  const glowClass =
    glow === 'amber'
      ? 'hover:shadow-[var(--glow-amber)]'
      : glow === 'purple'
        ? 'hover:shadow-[var(--glow-purple)]'
        : glow === 'teal'
          ? 'hover:shadow-[0_0_20px_rgba(45,212,191,0.2)]'
          : '';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-sm shadow-[var(--shadow-card)] transition-all duration-300 hover:border-[var(--color-border-active)] hover:bg-[var(--color-surface-hover)]',
        glowClass,
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
