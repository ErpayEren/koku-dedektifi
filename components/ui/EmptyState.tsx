import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

function PerfumeBottleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M9 4.5h6" />
      <path d="M10 4.5V7l-3 2.5v8A2.5 2.5 0 0 0 9.5 20h5A2.5 2.5 0 0 0 17 17.5v-8L14 7V4.5" />
      <path d="M9 11h6" />
    </svg>
  );
}

export function EmptyState({ icon, title, subtitle, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-4 px-6 py-16 text-center', className)}
      role="status"
      aria-label={title}
    >
      <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full border border-white/[.08] bg-white/[.03] text-gold/80">
        {icon || <PerfumeBottleIcon />}
      </div>
      <p className="text-xl font-semibold text-[var(--cream)]">{title}</p>
      {subtitle ? <p className="max-w-sm text-sm leading-relaxed text-[var(--muted)]">{subtitle}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
