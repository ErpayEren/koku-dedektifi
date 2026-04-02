'use client';

interface TasteRadarProps {
  acidity?: number | null;
  sweetness?: number | null;
  body?: number | null;
  bitterness?: number | null;
  aroma?: number | null;
  size?: number;
  className?: string;
}

const ATTRS: Array<{ key: keyof Omit<TasteRadarProps, 'size' | 'className'>; label: string; color: string }> = [
  { key: 'aroma',      label: 'Aroma',     color: '#f59e0b' },
  { key: 'acidity',   label: 'Acidity',   color: '#7eb8a4' },
  { key: 'sweetness', label: 'Sweetness', color: '#c9a96e' },
  { key: 'body',      label: 'Body',      color: '#a78bfa' },
  { key: 'bitterness',label: 'Bitterness',color: '#e05252' },
];

export function TasteRadar({
  acidity,
  sweetness,
  body,
  bitterness,
  aroma,
  size = 200,
  className = '',
}: TasteRadarProps) {
  const props = { acidity, sweetness, body, bitterness, aroma };
  const n = ATTRS.length;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const levels = [2, 4, 6, 8, 10];

  function polarToCart(angleIndex: number, radius: number): [number, number] {
    const angle = (angleIndex / n) * 2 * Math.PI - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  }

  function valueToRadius(val: number | null | undefined): number {
    if (val == null) return 0;
    return (Math.max(0, Math.min(10, val)) / 10) * maxR;
  }

  const points = ATTRS.map((attr, i) => {
    const r = valueToRadius(props[attr.key]);
    return polarToCart(i, r);
  });

  const polygon = points.map(([x, y]) => `${x},${y}`).join(' ');

  const hasData = ATTRS.some((a) => props[a.key] != null);

  return (
    <div className={`relative ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {levels.map((level) => {
          const ringPoints = ATTRS.map((_, i) => {
            const r = (level / 10) * maxR;
            return polarToCart(i, r);
          });
          return (
            <polygon
              key={level}
              points={ringPoints.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis lines */}
        {ATTRS.map((_, i) => {
          const [x, y] = polarToCart(i, maxR);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon */}
        {hasData && (
          <>
            <polygon
              points={polygon}
              fill="rgba(245,158,11,0.12)"
              stroke="rgba(245,158,11,0.5)"
              strokeWidth="1.5"
            />
            {/* Data points */}
            {points.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={3}
                fill={ATTRS[i].color}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth="1"
              />
            ))}
          </>
        )}

        {/* Labels */}
        {ATTRS.map((attr, i) => {
          const [x, y] = polarToCart(i, maxR + 18);
          const textAnchor = x < cx - 5 ? 'end' : x > cx + 5 ? 'start' : 'middle';
          const val = props[attr.key];
          return (
            <g key={attr.key}>
              <text
                x={x}
                y={y - 4}
                textAnchor={textAnchor}
                fontSize={size * 0.055}
                fill="rgba(255,255,255,0.45)"
                fontFamily="var(--font-sans, DM Sans)"
              >
                {attr.label}
              </text>
              {val != null && (
                <text
                  x={x}
                  y={y + size * 0.055}
                  textAnchor={textAnchor}
                  fontSize={size * 0.06}
                  fill={attr.color}
                  fontWeight="600"
                  fontFamily="var(--font-sans, DM Sans)"
                >
                  {val}/10
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
