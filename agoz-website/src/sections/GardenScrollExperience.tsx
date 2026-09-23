import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, MoveDown } from 'lucide-react'
import { Button } from '../components/Button'
import { gardenStages, isPlaceholder } from '../data/gardenStages'
import { src, srcSet } from '../data/images'
import { smoothstep, useScrollProgress } from '../hooks/useScrollProgress'
import { CTA_LABEL } from '../lib/siteConfig'

/** Half-width of the crossfade between neighbouring chapters, in progress units. */
const FADE = 0.055
/** How far a backdrop drifts across its own life, as a scale delta. */
const DRIFT = 0.085

const last = gardenStages.length - 1

/**
 * The opening: one garden built chapter by chapter, driven entirely by scroll.
 *
 * Every chapter is a layer stacked in the same sticky frame. Scroll position
 * decides each layer's opacity, scale and drift, and those are written
 * straight to the DOM inside a rAF loop — React only re-renders when the
 * active chapter changes, which happens eight times in the whole section.
 */
export function GardenScrollExperience() {
  const sectionRef = useRef<HTMLElement>(null)
  const layerRefs = useRef<(HTMLDivElement | null)[]>([])
  const frontRefs = useRef<(HTMLDivElement | null)[]>([])
  const textRefs = useRef<(HTMLDivElement | null)[]>([])
  const railRef = useRef<HTMLSpanElement>(null)
  const cueRef = useRef<HTMLDivElement>(null)

  const [active, setActive] = useState(0)
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  /**
   * Which chapters may fetch their image: a window around the active one, so
   * the next backdrop is decoded before it is needed and distant ones never
   * compete for bandwidth. Only three layers are ever visible at once, so the
   * window is comfortably wider than what is on screen.
   */
  const isAwake = (i: number) => i >= active - 2 && i <= active + 2

  const onProgress = useCallback((p: number) => {
    let current = 0

    for (let i = 0; i < gardenStages.length; i += 1) {
      const [start, end] = gardenStages[i].range
      // A chapter fades up as it arrives and down as the next one lands on it.
      const enter = i === 0 ? 1 : smoothstep(start - FADE, start + FADE, p)
      const leave = i === last ? 1 : 1 - smoothstep(end - FADE, end + FADE, p)
      const alpha = Math.min(enter, leave)

      // Life runs 0 → 1 across the chapter's own window, driving the drift.
      const life = Math.min(1, Math.max(0, (p - start) / Math.max(0.0001, end - start)))

      const layer = layerRefs.current[i]
      if (layer) {
        layer.style.opacity = String(alpha)
        layer.style.transform = `scale(${1 + DRIFT * (1 - life)}) translate3d(0, ${(life - 0.5) * -1.6}%, 0)`
        layer.style.visibility = alpha < 0.002 ? 'hidden' : 'visible'
        if (gardenStages[i].reveal === 'wipe') {
          // A wipe suits the chapter where the stone is going down.
          layer.style.clipPath = `inset(0 0 ${(1 - enter) * 100}% 0)`
        }
      }

      const front = frontRefs.current[i]
      if (front) {
        front.style.opacity = String(alpha)
        front.style.transform = `translate3d(0, ${(0.5 - life) * 14}%, 0) scale(${1.02 - 0.02 * life})`
        front.style.visibility = alpha < 0.002 ? 'hidden' : 'visible'
      }

      const text = textRefs.current[i]
      if (text) {
        // Copy leads the image slightly, so it is readable before the frame settles.
        const tEnter = i === 0 ? 1 : smoothstep(start - FADE * 0.6, start + FADE * 0.6, p)
        const tLeave = i === last ? 1 : 1 - smoothstep(end - FADE * 1.4, end - FADE * 0.2, p)
        const tAlpha = Math.min(tEnter, tLeave)
        text.style.opacity = String(tAlpha)
        text.style.transform = `translate3d(0, ${(1 - tAlpha) * 14}px, 0)`
        text.style.pointerEvents = tAlpha > 0.9 ? 'auto' : 'none'
        text.style.visibility = tAlpha < 0.002 ? 'hidden' : 'visible'
      }

      if (p >= start) current = i
    }

    if (railRef.current) railRef.current.style.transform = `scaleY(${p})`
    if (cueRef.current) cueRef.current.style.opacity = String(1 - smoothstep(0, 0.06, p))

    setActive((prev) => (prev === current ? prev : current))
  }, [])

  const idle = useCallback(() => {}, [])
  useScrollProgress(sectionRef, reduced ? idle : onProgress)

  // ── Reduced motion: the same story, told as a static composition ──────────
  if (reduced) {
    const finale = gardenStages[last]
    return (
      <section id="top" className="relative isolate overflow-hidden bg-ink">
        <div className="absolute inset-0 -z-10">
          <img
            src={src(finale.image)}
            alt={finale.image.alt}
            className="h-full w-full object-cover"
            style={{ objectPosition: finale.position }}
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-ink/72" />
        <div className="shell py-28 md:py-36">
          <p className="eyebrow text-gold">{gardenStages[0].eyebrow}</p>
          <h1 className="mt-5 max-w-3xl text-[clamp(1.9rem,5.2vw,3.6rem)] font-medium text-cream">
            {gardenStages[0].title}
          </h1>
          <p className="mt-6 max-w-xl text-[1.05rem] leading-[1.85] text-cream/75">
            {finale.support}
          </p>
          <ol className="mt-10 grid max-w-3xl gap-x-10 gap-y-3 sm:grid-cols-2">
            {gardenStages.slice(0, last).map((stage, i) => (
              <li key={stage.id} className="flex items-baseline gap-3 text-cream/60">
                <span className="font-sans text-[0.68rem] font-semibold tracking-[0.2em] text-gold/85">
                  0{i + 1}
                </span>
                {stage.title}
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button href="#contact">{CTA_LABEL}</Button>
            <Button href="#portfolio" variant="outline">
              צפו בעבודות שלנו
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      id="top"
      ref={sectionRef}
      aria-label="מגינה ריקה לגינה גמורה"
      className="relative h-[520vh] bg-ink md:h-[600vh]"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-ink">
        {/* ── Backdrops ─────────────────────────────────────────────────── */}
        {gardenStages.map((stage, i) => (
          <div
            key={stage.id}
            ref={(el) => void (layerRefs.current[i] = el)}
            aria-hidden={i !== active}
            className="absolute inset-0 will-change-[opacity,transform]"
            style={{ opacity: i === 0 ? 1 : 0, backgroundColor: stage.image.tint }}
          >
            {isAwake(i) && !isPlaceholder(stage.image) && (
              <img
                src={src(stage.image)}
                srcSet={srcSet(stage.image)}
                sizes="100vw"
                alt={stage.image.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'low'}
                decoding="async"
                className="h-full w-full object-cover"
                style={{ objectPosition: stage.position }}
              />
            )}
          </div>
        ))}

        {/* ── Foreground plates, for depth ──────────────────────────────── */}
        {gardenStages.map((stage, i) =>
          stage.foreground ? (
            <div
              key={`${stage.id}-front`}
              ref={(el) => void (frontRefs.current[i] = el)}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[12%] left-[6%] z-10 hidden w-[22vw] max-w-[19rem] overflow-hidden border-[6px] border-cream/90 shadow-[0_28px_60px_-28px_rgb(0_0_0/0.8)] will-change-[opacity,transform] lg:block"
              style={{ opacity: 0, aspectRatio: stage.foreground.ratio }}
            >
              {isAwake(i) && (
                <img
                  src={src(stage.foreground)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          ) : null,
        )}

        {/* ── Scrims: keep the copy legible without flattening the image ── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-20 bg-[linear-gradient(to_top,rgb(var(--c-ink)/0.92)_0%,rgb(var(--c-ink)/0.55)_34%,rgb(var(--c-ink)/0.12)_62%,rgb(var(--c-ink)/0.5)_100%)]"
        />
        <div aria-hidden="true" className="grain absolute inset-0 z-20" />

        {/* ── Copy ──────────────────────────────────────────────────────── */}
        <div className="absolute inset-0 z-30 flex items-end pb-[max(3.5rem,env(safe-area-inset-bottom))] md:pb-20">
          <div className="shell relative w-full">
            {gardenStages.map((stage, i) => (
              <div
                key={`${stage.id}-copy`}
                ref={(el) => void (textRefs.current[i] = el)}
                className={`${i === 0 ? 'relative' : 'absolute inset-x-[var(--shell-gutter)] bottom-0'} max-w-2xl will-change-[opacity,transform]`}
                style={{ opacity: i === 0 ? 1 : 0 }}
              >
                <p className="eyebrow text-gold">{stage.eyebrow}</p>

                {i === 0 ? (
                  <h1 className="mt-4 text-[clamp(1.9rem,5.2vw,3.6rem)] font-medium leading-[1.12] text-cream">
                    {stage.title}
                  </h1>
                ) : i === last ? (
                  <p className="mt-4 font-display text-[clamp(2.1rem,6vw,4.4rem)] font-medium leading-[1.1] text-cream">
                    מהרעיון — <span className="text-gilded">לגינה.</span>
                  </p>
                ) : (
                  <p className="mt-4 font-display text-[clamp(1.7rem,4.6vw,3.2rem)] font-medium leading-[1.14] text-cream">
                    {stage.title}
                  </p>
                )}

                {stage.support && (
                  <p className="mt-5 max-w-lg text-[0.98rem] leading-[1.8] text-cream/75 md:text-[1.08rem]">
                    {stage.support}
                  </p>
                )}

                {i === 0 && (
                  <div className="mt-8">
                    <Button href="#contact">{CTA_LABEL}</Button>
                  </div>
                )}

                {i === last && (
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <Button href="#contact">{CTA_LABEL}</Button>
                    <Button
                      href="#portfolio"
                      variant="outline"
                      icon={
                        <ArrowLeft
                          size={17}
                          strokeWidth={1.75}
                          aria-hidden="true"
                          className="transition-transform duration-300 ease-brand group-hover:-translate-x-1"
                        />
                      }
                    >
                      צפו בעבודות שלנו
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── A hairline that fills as the garden is built ───────────────── */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-6 z-30 hidden w-px bg-cream/12 lg:block"
        >
          <span
            ref={railRef}
            className="block h-full w-full origin-top bg-gradient-to-b from-gold-light to-gold"
            style={{ transform: 'scaleY(0)' }}
          />
        </div>

        {/* ── Scroll cue, only while the visitor has not started ─────────── */}
        <div
          ref={cueRef}
          aria-hidden="true"
          className="absolute inset-x-0 bottom-6 z-30 hidden justify-center md:flex"
        >
          <span className="flex items-center gap-3 text-cream/45">
            <MoveDown size={15} strokeWidth={1.5} className="animate-[nudge_2.4s_ease-in-out_infinite]" />
            <span className="eyebrow text-[0.6rem]">גללו כדי לבנות את הגינה</span>
          </span>
        </div>
      </div>
    </section>
  )
}
