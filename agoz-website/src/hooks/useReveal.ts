import { useEffect, useRef, useState } from 'react'
import { observeReveal } from '../lib/revealScheduler'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Reveals an element the first time it scrolls into view.
 * Anyone who prefers reduced motion starts out revealed, so nothing animates
 * and nothing can be left hidden.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(prefersReducedMotion)

  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    return observeReveal(el, () => setShown(true))
  }, [shown])

  return { ref, shown }
}
