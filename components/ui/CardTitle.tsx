import { cn } from '@/lib/utils';

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <div className={cn('section-kicker', className)}>
      <div className="relative inline-flex items-center">
        <span>{children}</span>
      </div>
    </div>
  );
}
