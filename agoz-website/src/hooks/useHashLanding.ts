import { useEffect } from 'react'

/**
 * Honours a #section in the URL on a cold load.
 * The browser tries to jump before React has rendered anything, finds no such
 * element, and gives up — so the jump has to be repeated once the sections
 * exist. `scroll-padding-top` on <html> keeps the sticky header clear.
 */
export function useHashLanding() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return

    const jump = () => {
      const target = document.getElementById(id)
      if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' })
    }

    const frame = requestAnimationFrame(jump)
    return () => cancelAnimationFrame(frame)
  }, [])
}
