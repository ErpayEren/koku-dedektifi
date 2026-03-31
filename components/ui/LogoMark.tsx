export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="15" cy="15" r="13" stroke="rgba(201,169,110,0.45)" strokeWidth="1" />
      <circle cx="15" cy="15" r="5" fill="rgba(201,169,110,0.7)" />
      <line
        x1="15"
        y1="4"
        x2="15"
        y2="8"
        stroke="rgba(201,169,110,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
