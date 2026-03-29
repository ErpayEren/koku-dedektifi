import { cn } from '@/lib/utils';

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <div className={cn('relative mb-5', className)}>
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/[.06]" />
      <div className="relative inline-flex items-center gap-2.5 pr-3 bg-[var(--bg-card)]">
        <div className="w-3 h-px bg-gold" />
        <span className="text-[9px] font-mono tracking-[.16em] uppercase text-muted">{children}</span>
      </div>
    </div>
  );
}
