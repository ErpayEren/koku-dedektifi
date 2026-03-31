import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className, glow, style }: CardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm transition-all duration-200',
        className,
      )}
      style={style}
    >
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
