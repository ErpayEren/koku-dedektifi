interface ScentGlyphProps {
  token?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function Frame({
  size,
  className,
  children,
}: {
  size: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function renderPath(token: string) {
  switch (token) {
    case 'floral':
      return (
        <>
          <circle cx="12" cy="8" r="2.3" />
          <circle cx="16.8" cy="11.2" r="2.3" />
          <circle cx="15.2" cy="16.6" r="2.3" />
          <circle cx="8.8" cy="16.6" r="2.3" />
          <circle cx="7.2" cy="11.2" r="2.3" />
          <circle cx="12" cy="12.6" r="1.7" />
        </>
      );
    case 'woody':
      return (
        <>
          <path d="M6.8 16.8h10.4L12 7.2 6.8 16.8Z" />
          <path d="M12 7.2V4.2" />
        </>
      );
    case 'citrus':
      return (
        <>
          <circle cx="12" cy="12" r="6.8" />
          <path d="M12 5.2v13.6M5.2 12h13.6M7.7 7.7l8.6 8.6M16.3 7.7l-8.6 8.6" />
        </>
      );
    case 'aquatic':
      return (
        <>
          <path d="M6 13.8c1.2 1.1 2.4 1.6 3.6 1.6 1.1 0 2.2-.4 3.3-1.2 1.1-.8 2.1-1.2 3.1-1.2.8 0 1.7.3 2.6.8" />
          <path d="M4.6 10.8c1.3 1 2.5 1.5 3.7 1.5 1 0 2.1-.4 3.2-1.1 1.1-.8 2.2-1.2 3.3-1.2 1 0 2 .3 3.2.9" />
        </>
      );
    case 'amber':
      return (
        <>
          <path d="M12 3.8 18.2 7.4v7.2L12 18.2 5.8 14.6V7.4L12 3.8Z" />
          <path d="M12 7.4v7.2M8.8 9.2l6.4 3.6M15.2 9.2l-6.4 3.6" />
        </>
      );
    case 'spicy':
      return (
        <>
          <path d="M12 4.2c.9 1.8 1.3 3.2 1.3 4.2 0 1.7-1.1 2.6-2.4 3.5-1.6 1-2.9 2.1-2.9 4.1 0 2.3 1.9 3.8 4.1 3.8 2.4 0 4.2-1.5 4.2-3.8" />
          <path d="M9.4 5.8c.4 1 .5 1.9.3 2.8M15 8.2c-.6 1.1-1.5 1.8-2.8 2.2" />
        </>
      );
    case 'gourmand':
      return (
        <>
          <path d="M6.8 9.2c0-2.4 2.1-4.3 4.6-4.3 2.9 0 4.8 2.2 4.8 4.6 0 2.3-1.3 4.2-3.6 5.3v2.2a.8.8 0 0 1-.8.8H10a.8.8 0 0 1-.8-.8v-2.2c-1.6-.8-2.4-1.9-2.4-3.6Z" />
          <path d="M9.6 10.8h4.8" />
        </>
      );
    case 'fresh':
      return (
        <>
          <path d="M6.6 13.4c3.8 0 7.1-2.7 7.9-6.4-3.7 0-7 2.6-7.9 6.4Z" />
          <path d="M6.6 13.4c.3 2.1 1.8 3.8 3.7 4.4" />
          <path d="M8 12.1c1.8-.2 3.7.6 5 2" />
        </>
      );
    default:
      return (
        <>
          <circle cx="12" cy="12" r="7.2" />
          <circle cx="12" cy="12" r="2.4" />
          <path d="M12 4.8v2.2M19.2 12h-2.2M12 19.2V17M4.8 12H7" />
        </>
      );
  }
}

export function ScentGlyph({
  token = 'signature',
  size = 44,
  strokeWidth = 1.5,
  className,
}: ScentGlyphProps) {
  return (
    <Frame
      size={size}
      className={className ?? 'inline-flex items-center justify-center rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold'}
    >
      <svg
        width={Math.round(size * 0.56)}
        height={Math.round(size * 0.56)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {renderPath(token)}
      </svg>
    </Frame>
  );
}

