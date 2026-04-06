type LogoSize = 'sm' | 'md' | 'sidebar';

const SIZE_MAP: Record<LogoSize, { text: string; tracking: string }> = {
  sm: {
    text: 'text-[20px]',
    tracking: 'tracking-[-0.02em]',
  },
  md: {
    text: 'text-[24px]',
    tracking: 'tracking-[-0.02em]',
  },
  sidebar: {
    text: 'text-[24px]',
    tracking: 'tracking-[-0.022em]',
  },
};

export function Logo({
  size = 'md',
  asLink = true,
}: {
  size?: LogoSize;
  asLink?: boolean;
}) {
  const config = SIZE_MAP[size];
  const wordmark = (
    <span
      className={`whitespace-nowrap font-display italic leading-[0.96] transition-transform duration-200 group-hover:translate-x-[1px] ${config.text} ${config.tracking}`}
    >
      <span className="text-cream">Koku </span>
      <span className="text-gold">Dedektifi</span>
    </span>
  );

  if (!asLink) {
    return <span className="group inline-flex max-w-full items-center">{wordmark}</span>;
  }

  return (
    <a href="/" className="group inline-flex max-w-full items-center no-underline" aria-label="Koku Dedektifi ana sayfa">
      {wordmark}
    </a>
  );
}
