export function ParityLogo({
  showWordmark = true,
  className,
  wordmarkClassName,
}: {
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}) {
  if (!showWordmark) return null;

  return (
    <span className={`parity-logo ${className ?? ''}`}>
      <span className={`parity-wordmark ${wordmarkClassName ?? ''}`}>Parity</span>
    </span>
  );
}
