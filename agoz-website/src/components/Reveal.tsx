import type { ElementType, ReactNode } from 'react'
import { useReveal } from '../hooks/useReveal'

type Props = {
  children: ReactNode
  /** `mask` wipes the element in from below — used for large imagery. */
  variant?: 'fade' | 'mask'
  delay?: number
  className?: string
  as?: ElementType
}

export function Reveal({ children, variant = 'fade', delay = 0, className = '', as }: Props) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  const Tag = (as ?? 'div') as ElementType
  const base = variant === 'mask' ? 'reveal-mask' : 'reveal'

  return (
    <Tag
      ref={ref}
      className={`${base} ${shown ? 'is-in' : ''} ${className}`}
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  )
}
