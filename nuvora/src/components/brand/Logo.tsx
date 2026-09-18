import { COLORS, MARK, TAGLINE, WORDMARK } from "./logo-paths";

type Variant = "full" | "wordmark" | "mark";

interface LogoProps {
  variant?: Variant;
  /** Inherits text color for stems and wordmark; swoosh stays brand blue. */
  className?: string;
  height?: number;
  title?: string;
  /** Use on navy backgrounds so the shadow band reads correctly. */
  onDark?: boolean;
}

function Mark({ onDark }: { onDark?: boolean }) {
  return (
    <>
      <path d={MARK.stemL} fill="currentColor" />
      <path d={MARK.stemR} fill="currentColor" />
      <path d={MARK.shadow} fill={onDark ? COLORS.mid : COLORS.mid} opacity={onDark ? 0.85 : 1} />
      <path d={MARK.swoosh} fill={COLORS.sky} />
    </>
  );
}

/**
 * The official NUVORA logo. Stems and wordmark inherit `currentColor`
 * (navy on light backgrounds, white on navy), the swoosh is always brand blue.
 */
export function Logo({ variant = "full", className, height = 40, title = "NUVORA — AI for Normal People", onDark }: LogoProps) {
  if (variant === "mark") {
    return (
      <svg viewBox="0 0 100 100" height={height} width={height} className={className} role="img" aria-label="NUVORA">
        <title>{title}</title>
        <Mark onDark={onDark} />
      </svg>
    );
  }
  if (variant === "wordmark") {
    const w = WORDMARK.width;
    return (
      <svg viewBox={`0 0 ${w} 100`} height={height} width={(height * w) / 100} className={className} role="img" aria-label="NUVORA">
        <title>NUVORA</title>
        <Mark onDark={onDark} />
        <path d={WORDMARK.d} fill="currentColor" />
        <path d={WORDMARK.tm} fill="currentColor" opacity={0.7} />
      </svg>
    );
  }
  const w = Math.max(WORDMARK.width, TAGLINE.width);
  return (
    <svg viewBox={`0 0 ${w} 112`} height={height} width={(height * w) / 112} className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <Mark onDark={onDark} />
      <path d={WORDMARK.d} fill="currentColor" />
      <path d={WORDMARK.tm} fill="currentColor" opacity={0.7} />
      <path d={TAGLINE.d} fill="currentColor" opacity={0.92} />
    </svg>
  );
}
