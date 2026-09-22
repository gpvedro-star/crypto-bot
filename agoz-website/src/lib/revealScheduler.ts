/**
 * Shared scroll scheduler for entrance animations.
 *
 * Deliberately not IntersectionObserver: Chromium factors an element's own
 * `clip-path` into the intersection rect, so a masked element reports itself as
 * never visible and would stay hidden forever. Measuring rects directly is
 * immune to that, and one rAF-throttled listener is cheaper than sixty
 * observers besides.
 */
type Entry = { el: HTMLElement; reveal: () => void }

const pending = new Set<Entry>()
let listening = false
let queued = false

/** Reveal anything whose top has reached 92% of the viewport height. */
const TRIGGER = 0.92

function measure() {
  queued = false
  const limit = window.innerHeight * TRIGGER
  for (const entry of pending) {
    if (entry.el.getBoundingClientRect().top < limit) {
      pending.delete(entry)
      entry.reveal()
    }
  }
  if (pending.size === 0) stop()
}

function schedule() {
  if (queued) return
  queued = true
  requestAnimationFrame(measure)
}

function start() {
  if (listening) return
  listening = true
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  // Landing on a #hash jumps the page without ever firing a scroll event, so
  // the arrival has to be measured on its own.
  window.addEventListener('hashchange', schedule)
  window.addEventListener('load', schedule)
  // Fonts and images settle after first paint and move everything; two late
  // passes cost nothing and stop content from being stranded below the fold.
  setTimeout(schedule, 120)
  setTimeout(schedule, 600)
}

function stop() {
  if (!listening) return
  listening = false
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  window.removeEventListener('hashchange', schedule)
  window.removeEventListener('load', schedule)
}

export function observeReveal(el: HTMLElement, reveal: () => void) {
  const entry: Entry = { el, reveal }
  pending.add(entry)
  start()
  schedule()
  return () => {
    pending.delete(entry)
    if (pending.size === 0) stop()
  }
}
