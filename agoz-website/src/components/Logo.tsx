import { site } from '../lib/siteConfig'

type Props = {
  /** Emblem height in px. */
  size?: number
  /** Hide the typographic lockup and show the medallion alone. */
  markOnly?: boolean
  className?: string
}

/**
 * The brand medallion, plus a typographic lockup beside it so the name stays
 * legible at sizes where the engraved lettering inside the mark cannot be read.
 */
export function Logo({ size = 52, markOnly = false, className = '' }: Props) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <img
        src="/brand/agoz-logo.png"
        width={size}
        height={size}
        alt={`${site.nameFull} — סמל המותג`}
        className="flex-none select-none"
        style={{ height: size, width: size }}
      />
      {!markOnly && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.32rem] font-medium tracking-[0.06em] text-gold-light">
            {site.name}
          </span>
          <span className="eyebrow mt-1.5 text-[0.55rem] text-cream/55">
            {site.tagline}
          </span>
        </span>
      )}
    </span>
  )
}
