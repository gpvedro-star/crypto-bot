import type { ReactNode } from 'react'

type Variant = 'gold' | 'outline' | 'ghost'

const shared =
  'group inline-flex items-center justify-center gap-2.5 rounded-sm px-7 py-3.5 text-[0.92rem] font-semibold tracking-wide transition-all duration-300 ease-brand focus-visible:outline-2 focus-visible:outline-offset-4'

const variants: Record<Variant, string> = {
  gold:
    'bg-gold text-ink shadow-[0_1px_0_0_rgb(var(--c-gold-light))_inset] hover:bg-gold-light hover:-translate-y-0.5 active:translate-y-0 motion-reduce:hover:translate-y-0',
  outline:
    'border border-cream/35 text-cream hover:border-gold hover:text-gold backdrop-blur-[2px]',
  ghost:
    'border border-charcoal/20 text-charcoal hover:border-gold-deep hover:text-gold-deep',
}

type Props = {
  href: string
  children: ReactNode
  variant?: Variant
  className?: string
  icon?: ReactNode
  external?: boolean
  ariaLabel?: string
}

export function Button({
  href,
  children,
  variant = 'gold',
  className = '',
  icon,
  external = false,
  ariaLabel,
}: Props) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`${shared} ${variants[variant]} ${className}`}
    >
      {children}
      {icon}
    </a>
  )
}
