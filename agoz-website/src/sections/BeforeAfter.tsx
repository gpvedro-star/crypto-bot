import { useRef, useState } from 'react'
import { MoveHorizontal } from 'lucide-react'
import { Photo } from '../components/Photo'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { beforeAfter } from '../data/images'

/**
 * Interactive before/after wipe.
 * The handle is driven by a visually-hidden range input, so it is operable with
 * a keyboard and announced correctly, while pointer drag updates the same value.
 * The input is forced to LTR so its value maps to the visual wipe position
 * regardless of the page's RTL direction.
 */
export function BeforeAfter() {
  const [pos, setPos] = useState(50)
  const frame = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const setFromClientX = (clientX: number) => {
    const box = frame.current?.getBoundingClientRect()
    if (!box || box.width === 0) return
    const next = ((clientX - box.left) / box.width) * 100
    setPos(Math.min(100, Math.max(0, next)))
  }

  return (
    <section
      id="before-after"
      className="relative overflow-hidden bg-ink py-24 text-cream md:py-32 lg:py-40"
    >
      <div className="shell">
        <SectionHeading
          eyebrow="לפני · אחרי"
          tone="light"
          align="center"
          title={
            <>
              אותו שטח בדיוק.
              <br />
              <span className="text-gilded">תכנון אחר לגמרי.</span>
            </>
          }
          intro="גררו את הידית כדי לראות את השינוי."
        />

        <Reveal variant="mask" className="mt-14 md:mt-16">
          <div
            ref={frame}
            onPointerDown={(e) => {
              dragging.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              setFromClientX(e.clientX)
            }}
            onPointerMove={(e) => dragging.current && setFromClientX(e.clientX)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
            className="relative isolate w-full cursor-ew-resize touch-pan-y select-none overflow-hidden"
            style={{ aspectRatio: '3 / 2' }}
          >
            {/* BEFORE — the full frame underneath */}
            <Photo
              photo={beforeAfter.before}
              sizes="(max-width: 1024px) 92vw, 88vw"
              className="absolute inset-0 h-full w-full"
            />

            {/* AFTER — revealed from the left up to the handle */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
            >
              <Photo
                photo={beforeAfter.after}
                sizes="(max-width: 1024px) 92vw, 88vw"
                className="absolute inset-0 h-full w-full"
              />
            </div>

            {/* Corner labels, pinned to visual sides so they track the images */}
            <span className="pointer-events-none absolute bottom-4 left-4 z-20 bg-ink/75 px-3 py-1.5 font-sans text-[0.68rem] font-semibold tracking-[0.24em] text-gold backdrop-blur-sm md:bottom-6 md:left-6">
              אחרי
            </span>
            <span className="pointer-events-none absolute bottom-4 right-4 z-20 bg-ink/75 px-3 py-1.5 font-sans text-[0.68rem] font-semibold tracking-[0.24em] text-cream/70 backdrop-blur-sm md:bottom-6 md:right-6">
              לפני
            </span>

            {/* Handle */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-20 w-px bg-gold/90 shadow-[0_0_18px_rgb(var(--c-gold)/0.55)]"
              style={{ left: `${pos}%` }}
            >
              <span className="absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gold/70 bg-ink/85 text-gold backdrop-blur-sm">
                <MoveHorizontal size={18} strokeWidth={1.75} />
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              dir="ltr"
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              aria-label="מחוון השוואה בין לפני לאחרי"
              className="absolute inset-0 z-30 h-full w-full cursor-ew-resize opacity-0"
            />
          </div>
        </Reveal>

        {beforeAfter.isPlaceholder && (
          <Reveal delay={120}>
            <p className="mx-auto mt-5 max-w-2xl text-center text-[0.85rem] leading-relaxed text-cream/55">
              תצוגה להמחשת עקרון השינוי בלבד — אלו אינן תמונות של פרויקט לקוח.
              צמד לפני/אחרי אמיתי יוחלף כאן ברגע שיצולם.
            </p>
          </Reveal>
        )}
      </div>
    </section>
  )
}
