type LogoMarkProps = {
  size?: number;
  glow?: boolean;
};

export function LogoMark({ size = 44, glow = true }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, overflow: 'visible' }}
    >
      <defs>
        <filter id="kd-logo-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0.79  0 1 0 0 0.66  0 0 1 0 0.43  0 0 0 0.2 0"
            result="warmGlow"
          />
          <feMerge>
            <feMergeNode in="warmGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={glow ? 'url(#kd-logo-glow)' : undefined}>
        <path
          d="M36 13 52 22 52 42 36 51 20 42 20 22Z"
          stroke="rgba(201,169,110,0.92)"
          strokeWidth="3.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <path
          d="M36 24 44.5 29 44.5 38.8 36 43.8 27.5 38.8 27.5 29Z"
          stroke="rgba(201,169,110,0.24)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="6 5"
        />

        <circle cx="36" cy="13" r="5.3" fill="#111014" stroke="rgba(201,169,110,0.95)" strokeWidth="2.3" />
        <circle cx="36" cy="51" r="5.3" fill="#111014" stroke="rgba(201,169,110,0.95)" strokeWidth="2.3" />
        <circle cx="20" cy="22" r="3.3" fill="#16151a" stroke="rgba(201,169,110,0.64)" strokeWidth="1.6" />
        <circle cx="20" cy="42" r="3.3" fill="#16151a" stroke="rgba(201,169,110,0.64)" strokeWidth="1.6" />
        <circle cx="52" cy="22" r="3.3" fill="#16151a" stroke="rgba(201,169,110,0.64)" strokeWidth="1.6" />
        <circle cx="52" cy="42" r="3.3" fill="#16151a" stroke="rgba(201,169,110,0.64)" strokeWidth="1.6" />

        <text
          x="36"
          y="16.2"
          textAnchor="middle"
          fontSize="8.6"
          fontWeight="700"
          fill="rgba(201,169,110,0.98)"
          fontFamily="Arial, sans-serif"
        >
          N
        </text>
        <text
          x="36"
          y="54.2"
          textAnchor="middle"
          fontSize="8.6"
          fontWeight="700"
          fill="rgba(201,169,110,0.98)"
          fontFamily="Arial, sans-serif"
        >
          N
        </text>

        <circle cx="24.5" cy="7" r="1.55" fill="rgba(126,184,164,0.9)" />
        <circle cx="47.5" cy="6.6" r="1.55" fill="rgba(170,138,209,0.9)" />
        <circle cx="57" cy="14" r="1.35" fill="rgba(201,169,110,0.8)" />
      </g>
    </svg>
  );
}
