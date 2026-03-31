export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="my-8 flex items-center gap-4">
      <div className="flex-1 h-px bg-white/[.06]" />
      <span className="text-[11px] font-mono uppercase tracking-[.2em] text-amber-500/80 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-white/[.06]" />
    </div>
  );
}
