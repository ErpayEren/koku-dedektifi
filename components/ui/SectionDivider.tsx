export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 my-8">
      <div className="flex-1 h-px bg-white/[.06]" />
      <span className="text-[9px] font-mono tracking-[.18em] uppercase text-muted whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-white/[.06]" />
    </div>
  );
}
