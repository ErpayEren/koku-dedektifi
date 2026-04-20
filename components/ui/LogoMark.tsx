type LogoMarkProps = {
  size?: number;
  glow?: boolean;
};

export function LogoMark({ size = 44, glow = true }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, overflow: 'visible' }}
    >
      <defs>
        <filter id="kd-logo-glow" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="3.6" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0.79  0 1 0 0 0.66  0 0 1 0 0.43  0 0 0 0.34 0"
            result="warmGlow"
          />
          <feMerge>
            <feMergeNode in="warmGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id="kd-logo-core" cx="50%" cy="48%" r="66%">
          <stop offset="0%" stopColor="rgba(214,181,121,0.26)" />
          <stop offset="100%" stopColor="rgba(201,169,110,0)" />
        </radialGradient>
      </defs>

      <g filter={glow ? 'url(#kd-logo-glow)' : undefined}>
        <rect width="100" height="100" rx="24" fill="#09080A" fillOpacity="0.01" />
        <rect width="100" height="100" rx="24" fill="url(#kd-logo-core)" />

        <line x1="34" y1="32" x2="50" y2="22" stroke="#D6B579" strokeWidth="6.8" strokeLinecap="round" />
        <line x1="66" y1="32" x2="50" y2="22" stroke="#D6B579" strokeWidth="6.8" strokeLinecap="round" />
        <line x1="28" y1="39" x2="28" y2="61" stroke="#D6B579" strokeWidth="6.8" strokeLinecap="round" />
        <line x1="72" y1="39" x2="72" y2="61" stroke="#D6B579" strokeWidth="6.8" strokeLinecap="round" />
        <line x1="34" y1="68" x2="50" y2="78" stroke="#D6B579" strokeWidth="6.8" strokeLinecap="round" />
        <line x1="66" y1="68" x2="50" y2="78" stroke="#D6B579" strokeWidth="6.8" strokeLinecap="round" />

        <circle cx="50" cy="20" r="11.8" fill="#09080A" stroke="#D6B579" strokeWidth="5.6" />
        <circle cx="50" cy="80" r="11.8" fill="#09080A" stroke="#D6B579" strokeWidth="5.6" />
        <circle cx="28" cy="35.5" r="8.8" fill="#09080A" stroke="#D6B579" strokeWidth="5.6" />
        <circle cx="72" cy="35.5" r="8.8" fill="#09080A" stroke="#D6B579" strokeWidth="5.6" />
        <circle cx="28" cy="64.5" r="8.8" fill="#09080A" stroke="#D6B579" strokeWidth="5.6" />
        <circle cx="72" cy="64.5" r="8.8" fill="#09080A" stroke="#D6B579" strokeWidth="5.6" />

        <text
          x="50"
          y="24.8"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fontFamily="DM Sans, Arial, sans-serif"
          fill="#D6B579"
        >
          N
        </text>
        <text
          x="50"
          y="84.8"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fontFamily="DM Sans, Arial, sans-serif"
          fill="#D6B579"
        >
          N
        </text>
      </g>
    </svg>
  );
}
