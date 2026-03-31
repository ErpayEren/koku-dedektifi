type LogoMarkProps = {
  size?: number;
  glow?: boolean;
};

const POINTS = {
  top: { x: 36, y: 11 },
  topRight: { x: 55, y: 22 },
  bottomRight: { x: 55, y: 50 },
  bottom: { x: 36, y: 61 },
  bottomLeft: { x: 17, y: 50 },
  topLeft: { x: 17, y: 22 },
} as const;

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
          <feGaussianBlur stdDeviation="2.1" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0.79  0 1 0 0 0.66  0 0 1 0 0.43  0 0 0 0.18 0"
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
          d="M36 11 55 22 55 50 36 61 17 50 17 22Z"
          stroke="rgba(201,169,110,0.92)"
          strokeWidth="3.7"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <path
          d="M36 23.5 46.8 29.7 46.8 42.3 36 48.5 25.2 42.3 25.2 29.7Z"
          stroke="rgba(201,169,110,0.28)"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="8 7"
        />

        <circle cx={POINTS.top.x} cy={POINTS.top.y} r="7.8" fill="#111014" stroke="rgba(201,169,110,0.95)" strokeWidth="2.5" />
        <circle cx={POINTS.bottom.x} cy={POINTS.bottom.y} r="7.8" fill="#111014" stroke="rgba(201,169,110,0.95)" strokeWidth="2.5" />

        <text
          x={POINTS.top.x}
          y={POINTS.top.y + 3}
          textAnchor="middle"
          fontSize="9.6"
          fontWeight="700"
          fill="rgba(201,169,110,0.98)"
          fontFamily="Arial, sans-serif"
        >
          N
        </text>
        <text
          x={POINTS.bottom.x}
          y={POINTS.bottom.y + 3}
          textAnchor="middle"
          fontSize="9.6"
          fontWeight="700"
          fill="rgba(201,169,110,0.98)"
          fontFamily="Arial, sans-serif"
        >
          N
        </text>

        <circle cx={POINTS.topLeft.x} cy={POINTS.topLeft.y} r="5.8" fill="#16151a" stroke="rgba(201,169,110,0.52)" strokeWidth="1.9" />
        <circle cx={POINTS.bottomLeft.x} cy={POINTS.bottomLeft.y} r="5.8" fill="#16151a" stroke="rgba(201,169,110,0.52)" strokeWidth="1.9" />
        <circle cx={POINTS.topRight.x} cy={POINTS.topRight.y} r="5.8" fill="#16151a" stroke="rgba(201,169,110,0.52)" strokeWidth="1.9" />
        <circle cx={POINTS.bottomRight.x} cy={POINTS.bottomRight.y} r="5.8" fill="#16151a" stroke="rgba(201,169,110,0.52)" strokeWidth="1.9" />

        <text x={POINTS.topLeft.x} y={POINTS.topLeft.y + 2.15} textAnchor="middle" fontSize="7.2" fill="rgba(201,169,110,0.72)" fontFamily="Arial, sans-serif">
          C
        </text>
        <text x={POINTS.bottomLeft.x} y={POINTS.bottomLeft.y + 2.15} textAnchor="middle" fontSize="7.2" fill="rgba(201,169,110,0.72)" fontFamily="Arial, sans-serif">
          C
        </text>
        <text x={POINTS.topRight.x} y={POINTS.topRight.y + 2.15} textAnchor="middle" fontSize="7.2" fill="rgba(201,169,110,0.72)" fontFamily="Arial, sans-serif">
          C
        </text>
        <text x={POINTS.bottomRight.x} y={POINTS.bottomRight.y + 2.15} textAnchor="middle" fontSize="7.2" fill="rgba(201,169,110,0.72)" fontFamily="Arial, sans-serif">
          C
        </text>

        <circle cx="24" cy="6" r="1.7" fill="rgba(126,184,164,0.9)" />
        <circle cx="46" cy="5.5" r="1.7" fill="rgba(170,138,209,0.9)" />
        <circle cx="58.5" cy="13" r="1.5" fill="rgba(201,169,110,0.8)" />
      </g>
    </svg>
  );
}
