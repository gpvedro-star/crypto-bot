import { pexelsAssets } from '../data/pexelsAssets'

/**
 * Attribution for any Pexels assets in use.
 *
 * The Pexels licence does not demand credit, but naming the photographer and
 * linking the original is the decent thing to do — and it keeps it obvious
 * that these are library images rather than the company's own projects.
 *
 * Renders nothing until `npm run pexels:fetch` has populated the manifest.
 */
export function PexelsCredits() {
  const entries = Object.values(pexelsAssets)
  if (entries.length === 0) return null

  // One line per photographer, however many of their assets are used.
  const byPhotographer = new Map<string, string>()
  for (const a of entries) {
    if (!byPhotographer.has(a.photographer)) byPhotographer.set(a.photographer, a.pexelsUrl)
  }

  return (
    <p className="mt-6 text-[0.78rem] leading-relaxed text-cream/55">
      חלק מהתצלומים באתר מסופקים על ידי{' '}
      <a
        href="https://www.pexels.com"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4 transition-colors hover:text-gold"
      >
        Pexels
      </a>
      {' — '}
      {[...byPhotographer.entries()].map(([name, url], i, arr) => (
        <span key={name}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-gold"
          >
            {name}
          </a>
          {i < arr.length - 1 ? ', ' : '.'}
        </span>
      ))}
    </p>
  )
}
