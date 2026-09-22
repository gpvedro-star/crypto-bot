import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

type Props = {
  eyebrow: string
  title: ReactNode
  intro?: ReactNode
  tone?: 'dark' | 'light'
  align?: 'start' | 'center'
  className?: string
  as?: 'h2' | 'h3'
}

/**
 * The recurring section opener: letterspaced label over a hairline rule,
 * then a large display heading. Keeps rhythm consistent across the page.
 */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  tone = 'dark',
  align = 'start',
  className = '',
  as: Tag = 'h2',
}: Props) {
  const muted = tone === 'light' ? 'text-cream/60' : 'text-charcoal/70'
  const strong = tone === 'light' ? 'text-cream' : 'text-charcoal'
  const accent = tone === 'light' ? 'text-gold' : 'text-gold-ink'

  return (
    <div
      className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''} ${className}`}
    >
      <Reveal>
        <div
          className={`flex items-center gap-4 ${align === 'center' ? 'justify-center' : ''}`}
        >
          <span className={`eyebrow ${accent}`}>{eyebrow}</span>
          <span
            aria-hidden="true"
            className="h-px w-12 flex-none bg-gradient-to-l from-gold/70 to-transparent"
          />
        </div>
      </Reveal>

      <Reveal delay={80}>
        <Tag
          className={`mt-5 text-[clamp(1.95rem,4.4vw,3.35rem)] ${strong}`}
        >
          {title}
        </Tag>
      </Reveal>

      {intro && (
        <Reveal delay={150}>
          <p className={`mt-6 text-[1.0625rem] leading-[1.85] ${muted}`}>{intro}</p>
        </Reveal>
      )}
    </div>
  )
}
