import { LOGO_DIMENSIONS } from "./logo-dimensions";

type Variant = "full" | "wordmark" | "mark";

interface LogoProps {
  variant?: Variant;
  /** Inherits text color for stems and wordmark; swoosh stays brand blue. */
  className?: string;
  height?: number;
  title?: string;
  /** Kept for API compatibility; the sprite renders identically on dark backgrounds. */
  onDark?: boolean;
}

/**
 * The official NUVORA logo, referenced from a shared SVG sprite so the vector
 * data is downloaded once and cached rather than inlined into every page.
 * Stems and wordmark inherit `currentColor`; the swoosh is always brand blue.
 */
export function Logo({ variant = "full", className, height = 40, title = "NUVORA — AI for Normal People" }: LogoProps) {
  const dim = LOGO_DIMENSIONS[variant];
  const width = (height * dim.width) / dim.height;
  const label = variant === "full" ? title : "NUVORA";
  return (
    <svg viewBox={`0 0 ${dim.width} ${dim.height}`} height={height} width={width} className={className} role="img" aria-label={label}>
      <title>{label}</title>
      <use href={`/brand/sprite.svg#${variant}`} />
    </svg>
  );
}
