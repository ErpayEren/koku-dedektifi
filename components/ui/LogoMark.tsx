export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full border border-[var(--gold-line)] flex items-center justify-center flex-shrink-0 relative bg-[var(--bg-card)]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="w-[82%] h-[82%]">
        <g fill="none" stroke="var(--gold)" strokeLinecap="round" strokeWidth="2.1">
          <line x1="16" y1="24" x2="32" y2="15" />
          <line x1="32" y1="15" x2="48" y2="24" />
          <line x1="48" y1="24" x2="48" y2="40" />
          <line x1="48" y1="40" x2="32" y2="49" />
          <line x1="32" y1="49" x2="16" y2="40" />
          <line x1="16" y1="40" x2="16" y2="24" />
          <circle cx="32" cy="32" r="9" strokeDasharray="4.2 3.6" opacity=".35" />
        </g>
        <g fontFamily="var(--font-mono)" fontSize="6.5" textAnchor="middle">
          <circle cx="32" cy="15" r="5.5" fill="var(--bg-card)" stroke="var(--gold)" strokeWidth="1.8" />
          <text x="32" y="17.2" fill="var(--gold)">N</text>
          <circle cx="32" cy="49" r="5.5" fill="var(--bg-card)" stroke="var(--gold)" strokeWidth="1.8" />
          <text x="32" y="51.2" fill="var(--gold)">N</text>
          <circle cx="48" cy="24" r="4.2" fill="var(--bg-card)" stroke="var(--gold)" strokeWidth="1.2" opacity=".8" />
          <text x="48" y="25.8" fill="var(--gold)" opacity=".75">C</text>
          <circle cx="48" cy="40" r="4.2" fill="var(--bg-card)" stroke="var(--gold)" strokeWidth="1.2" opacity=".8" />
          <text x="48" y="41.8" fill="var(--gold)" opacity=".75">C</text>
          <circle cx="16" cy="24" r="4.2" fill="var(--bg-card)" stroke="var(--gold)" strokeWidth="1.2" opacity=".8" />
          <text x="16" y="25.8" fill="var(--gold)" opacity=".75">C</text>
          <circle cx="16" cy="40" r="4.2" fill="var(--bg-card)" stroke="var(--gold)" strokeWidth="1.2" opacity=".8" />
          <text x="16" y="41.8" fill="var(--gold)" opacity=".75">C</text>
        </g>
      </svg>
    </div>
  );
}
