interface EmptyStateProps {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div
        className="w-10 h-10 rounded-full border border-[var(--gold-line)]
                    flex items-center justify-center mb-5"
      >
        <div className="w-3 h-3 rounded-full bg-gold opacity-40" />
      </div>
      <p className="text-[15px] font-display italic text-cream mb-2">{title}</p>
      <p className="text-[12px] text-muted max-w-[260px]">{body}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2 text-[11px] font-mono tracking-[.08em] uppercase
                     border border-[var(--gold-line)] rounded text-gold
                     bg-[var(--gold-dim)] hover:bg-gold/20 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
