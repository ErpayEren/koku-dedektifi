'use client';

import { brewScoreColor } from '@/lib/brewno';

interface BrewScoreRingProps {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export function BrewScoreRing({
  score,
  size = 56,
  strokeWidth = 3.5,
  showLabel = false,
  className = '',
}: BrewScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score != null ? Math.max(0, Math.min(100, score)) : 0;
  const offset = circumference - (pct / 100) * circumference;
  const color = brewScoreColor(score);
  const cx = size / 2;

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Track */}
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        {score != null && (
          <circle
            cx={cx}
            cy={cx}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.22,.68,0,1.2)' }}
          />
        )}
      </svg>

      {/* Score text in center */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ color }}
      >
        <span
          className="font-bold leading-none tabular-nums"
          style={{ fontSize: size * 0.28 }}
        >
          {score != null ? Math.round(score) : '—'}
        </span>
      </div>

      {showLabel && (
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
          BrewScore
        </p>
      )}
    </div>
  );
}
