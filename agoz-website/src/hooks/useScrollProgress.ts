import { useEffect, type RefObject } from 'react'

/**
 * Reports how far the viewport has travelled through a tall element, 0 → 1.
 *
 * The callback runs inside requestAnimationFrame and is expected to write
 * styles straight to the DOM: driving a scroll-linked animation through React
 * state would re-render the whole section on every frame.
 *
 * The loop only runs while the element is near the viewport, so the rest of
 * the page costs nothing.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let frame = 0
    let running = false
    let last = -1

    const measure = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      // How far the sticky stage can travel before the section is spent.
      const travel = rect.height - window.innerHeight
      const raw = travel > 0 ? -rect.top / travel : rect.top <= 0 ? 1 : 0
      const progress = raw < 0 ? 0 : raw > 1 ? 1 : raw
      // Skip sub-pixel churn, but never skip the exact ends.
      if (Math.abs(progress - last) > 0.0004 || progress === 0 || progress === 1) {
        last = progress
        onProgress(progress)
      }
      if (running) frame = requestAnimationFrame(measure)
    }

    const start = () => {
      if (running) return
      running = true
      frame = requestAnimationFrame(measure)
    }
    const stop = () => {
      running = false
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }

    // One last measure on the way out so the section settles at 0 or 1.
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : (stop(), measure())),
      { rootMargin: '10% 0px' },
    )
    io.observe(el)

    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    measure()

    return () => {
      io.disconnect()
      stop()
      window.removeEventListener('resize', onResize)
    }
  }, [ref, onProgress])
}

/** Hermite ease between two edges — the crossfade shape. */
export function smoothstep(edge0: number, edge1: number, x: number) {
  if (edge1 === edge0) return x < edge0 ? 0 : 1
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
