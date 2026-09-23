import { beforeAfter, gallery, images, type Photo } from './images'

/**
 * The opening scroll experience: eight chapters of one garden coming to life.
 * ---------------------------------------------------------------------------
 * ASSET PROVENANCE — read before publishing.
 * These are storytelling images that convey the process and the design
 * language. They are NOT photographs of completed client projects, and the
 * section must never present them as such.
 *
 * To swap in real project photography (or Pexels assets), change only the
 * `image` / `foreground` fields below. No component code needs to be touched.
 * Each entry accepts either a Photo from `images.ts` or a plain object of the
 * same shape, so an asset can come from anywhere.
 *
 * `range` is the stage's share of the section's scroll, 0–1. Ranges must be
 * contiguous and cover 0 → 1; neighbours crossfade across their boundary.
 */

export type GardenStage = {
  id: string
  /** Scroll window this chapter owns, as [start, end] in 0–1. */
  range: [number, number]
  eyebrow: string
  title: string
  support?: string
  image: Photo
  /** Optional smaller plate that floats in front, for depth. */
  foreground?: Photo
  /** How the backdrop is framed; useful when a crop loses the subject. */
  position?: string
  /** A wipe instead of a crossfade, for the chapters where it suits. */
  reveal?: 'fade' | 'wipe'
}

/**
 * PLACEHOLDER — no photograph of this stage exists yet.
 * Drop one in and delete the flag.
 */
export const missing = (alt: string, ratio: string, tint: string): Photo => ({
  local: '',
  remote: '',
  alt,
  ratio,
  tint,
})

export const gardenStages: GardenStage[] = [
  {
    id: 'empty',
    range: [0, 0.12],
    eyebrow: 'מתחילים מאפס.',
    title: 'מהגינה שלכם — למקום שאוהבים לחיות בו.',
    support: 'כל גינה מתחילה כרעיון.',
    image: beforeAfter.before,
    position: '50% 62%',
  },
  {
    id: 'planning',
    range: [0.12, 0.25],
    eyebrow: 'שלב ראשון',
    title: 'מתכננים את החלל.',
    support: 'מתאימים את הגינה לבית, לסגנון ולחיים שלכם.',
    image: images.desk,
    position: '50% 50%',
  },
  {
    id: 'preparation',
    range: [0.25, 0.38],
    eyebrow: 'הכנה',
    title: 'בונים את הבסיס.',
    support: 'יישור הקרקע, ניקוז ותשתית — מה שלא רואים בסוף, אבל מרגישים.',
    image: images.prepare,
    position: '50% 55%',
  },
  {
    id: 'construction',
    range: [0.38, 0.52],
    eyebrow: 'הקמה',
    title: 'כל פרט מקבל מקום.',
    support: 'אבן טבעית, שבילים וגבולות — הקווים שיישארו שנים.',
    image: images.paving,
    foreground: gallery.find((g) => g.id === 'path'),
    position: '50% 58%',
    reveal: 'wipe',
  },
  {
    id: 'planting',
    range: [0.52, 0.67],
    eyebrow: 'שתילה',
    title: 'מתחילים להכניס חיים.',
    support: 'עצים, שיחים וצמחייה שנבחרו לאקלים ולקרקע שלכם.',
    image: images.planting,
    foreground: images.aboutDetail,
    position: '50% 55%',
  },
  {
    id: 'shape',
    range: [0.67, 0.82],
    eyebrow: 'הגינה מתגבשת',
    title: 'התמונה מתחילה להתחבר.',
    support: 'מדשאה, ערוגות, אבן ופינת ישיבה — הכול נופל למקום.',
    image: gallery.find((g) => g.id === 'lounge')!,
    position: '50% 50%',
  },
  {
    id: 'finishing',
    range: [0.82, 0.94],
    eyebrow: 'גימור',
    title: 'הפרטים הקטנים עושים את ההבדל.',
    support: 'תאורה, ריהוט חוץ והמגע האחרון — הגינה ממשיכה גם אחרי השקיעה.',
    image: gallery.find((g) => g.id === 'night')!,
    position: '50% 50%',
  },
  {
    id: 'final',
    range: [0.94, 1],
    eyebrow: 'התוצאה',
    title: 'מהרעיון — לגינה.',
    support: 'עיצוב, הקמה ותחזוקה בהתאמה אישית.',
    image: images.hero,
    position: '50% 58%',
  },
]

/** True while a stage is still waiting for a real photograph. */
export const isPlaceholder = (p: Photo) => p.remote === '' && p.local === ''

/** How many chapters still need an image, for the build-time notice. */
export const missingAssetCount = gardenStages.filter((s) => isPlaceholder(s.image)).length
