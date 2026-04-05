import { Card } from './Card';

export function SkeletonCard({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <Card className={`animate-pulse p-5 md:p-6 ${className}`}>
      <div className="h-3 w-28 rounded-full bg-white/[.08]" />
      <div className="mt-4 h-8 w-3/4 rounded-full bg-white/[.08]" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={`skeleton-line-${index}`}
            className="h-3 rounded-full bg-white/[.07]"
            style={{ width: `${Math.max(45, 100 - index * 12)}%` }}
          />
        ))}
      </div>
    </Card>
  );
}
