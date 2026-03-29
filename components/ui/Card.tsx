import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className, glow }: CardProps) {
  return (
    <div className={cn('bg-[var(--bg-card)] border border-white/[.06] rounded-2xl relative overflow-hidden', className)}>
      {glow && (
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full
                     bg-gradient-to-br from-gold/[.05] to-transparent pointer-events-none"
        />
      )}
      {children}
    </div>
  );
}
