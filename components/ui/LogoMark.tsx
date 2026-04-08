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
          <feGaussianBlur stdDeviation="2.8" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0.79  0 1 0 0 0.66  0 0 1 0 0.43  0 0 0 0.24 0"
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
          stroke="#C9A96E"
          strokeWidth="3.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <circle cx="36" cy="13" r="5.6" fill="#111014" stroke="#C9A96E" strokeWidth="2.5" />
        <circle cx="36" cy="51" r="5.6" fill="#111014" stroke="#C9A96E" strokeWidth="2.5" />
        <circle cx="20" cy="22" r="3.5" fill="#16151a" stroke="#C9A96E" strokeWidth="1.8" />
        <circle cx="20" cy="42" r="3.5" fill="#16151a" stroke="#C9A96E" strokeWidth="1.8" />
        <circle cx="52" cy="22" r="3.5" fill="#16151a" stroke="#C9A96E" strokeWidth="1.8" />
        <circle cx="52" cy="42" r="3.5" fill="#16151a" stroke="#C9A96E" strokeWidth="1.8" />

        <text
          x="36"
          y="16.2"
          textAnchor="middle"
          fontSize="8.6"
          fontWeight="700"
          fill="#C9A96E"
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
          fill="#C9A96E"
          fontFamily="Arial, sans-serif"
        >
          N
        </text>
      </g>
    </svg>
  );
}
