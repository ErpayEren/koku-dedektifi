export function LogoMark({ size = 52 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.9)}
      viewBox="0 0 76 72"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, overflow: 'visible' }}
    >
      <defs>
        <filter id="logo-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g stroke="var(--gold)" strokeLinecap="round" strokeLinejoin="round" filter="url(#logo-soft-glow)">
        <path d="M22 22.5 38 13l16 9.5v18L38 50l-16-9.5v-18Z" strokeWidth="2.75" />
      </g>

      <g fill="var(--bg)" stroke="var(--gold)" textAnchor="middle">
        <circle cx="38" cy="13" r="5.9" strokeWidth="1.7" />
        <text x="38" y="16" fill="var(--gold)" fontFamily="var(--font-mono)" fontSize="6.9">
          N
        </text>

        <circle cx="38" cy="50" r="5.9" strokeWidth="1.7" />
        <text x="38" y="53" fill="var(--gold)" fontFamily="var(--font-mono)" fontSize="6.9">
          N
        </text>
      </g>

      <g fill="var(--gold)" opacity="0.94">
        <circle cx="22" cy="22.5" r="2.2" />
        <circle cx="22" cy="40.5" r="2.2" />
        <circle cx="54" cy="22.5" r="2.2" />
        <circle cx="54" cy="40.5" r="2.2" />
      </g>
    </svg>
  );
}
