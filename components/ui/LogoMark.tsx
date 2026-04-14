type LogoMarkProps = {
  size?: number;
  glow?: boolean;
};

export function LogoMark({ size = 44, glow = true }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
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
        <rect width="96" height="96" rx="24" fill="#09080A" fillOpacity="0.01" />
        <path
          d="M30 35 48 24l18 11v26L48 72 30 61V35Z"
          stroke="#C9A96E"
          strokeWidth="3.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <circle cx="48" cy="24" r="6" fill="#C9A96E" />
        <circle cx="48" cy="72" r="6" fill="#C9A96E" />
        <circle cx="30" cy="35" r="3.3" fill="#C9A96E" />
        <circle cx="30" cy="61" r="3.3" fill="#C9A96E" />
        <circle cx="66" cy="35" r="3.3" fill="#C9A96E" />
        <circle cx="66" cy="61" r="3.3" fill="#C9A96E" />
      </g>
    </svg>
  );
}
