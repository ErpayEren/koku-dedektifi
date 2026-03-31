import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, subtitle, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6 gap-4',
        className,
      )}
      role="status"
      aria-label={title}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--muted)] mb-2">
          {icon}
        </div>
      )}
      <p className="text-xl font-semibold text-[var(--cream)]">{title}</p>
      {subtitle && (
        <p className="text-sm text-[var(--muted)] max-w-xs">{subtitle}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

