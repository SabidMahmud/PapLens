interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className = 'h-7 w-7' }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <circle cx="16" cy="16" r="10" />
      <ellipse cx="16" cy="16" rx="5" ry="7" transform="rotate(35 16 16)" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
