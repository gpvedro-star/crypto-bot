/**
 * Central image registry.
 * ---------------------------------------------------------------------------
 * Every photograph on the site is declared here once, and nowhere else.
 * To swap in real project photography, drop the file into `public/photos/`
 * and change that entry's `local` path — no component needs to be touched.
 *
 * `remote` points at the originally generated asset. Run `npm run photos`
 * to download every remote file into `public/photos/` as optimised WebP and
 * flip USE_LOCAL_PHOTOS to true, so the site serves everything from its own
 * domain instead of an external CDN.
 */

/** Flipped to `true` by `npm run photos` once assets are vendored locally. */
export const USE_LOCAL_PHOTOS = false

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3HDy8S0ESwqlZLxFMMOyUNfSDLy'

export type Photo = {
  /** Path served from this site once the asset has been vendored. */
  local: string
  /** Origin the asset is fetched from until then. */
  remote: string
  /** Meaningful Hebrew alt text — required for every image. */
  alt: string
  /** Intrinsic ratio, used to reserve layout space and avoid CLS. */
  ratio: string
  /** Average colour, painted behind the image while it loads. */
  tint: string
}

const photo = (
  file: string,
  remoteFile: string,
  alt: string,
  ratio: string,
  tint: string,
): Photo => ({ local: `/photos/${file}.webp`, remote: `${CDN}/${remoteFile}.png`, alt, ratio, tint })

export const src = (p: Photo) => (USE_LOCAL_PHOTOS ? p.local : p.remote)

/** Widths emitted by `npm run photos`. */
export const PHOTO_WIDTHS = [640, 1024, 1600, 2000] as const

/**
 * Responsive candidates, but only once the assets are vendored — the CDN
 * originals exist at a single size, so advertising widths for them would lie.
 */
export const srcSet = (p: Photo) =>
  USE_LOCAL_PHOTOS
    ? PHOTO_WIDTHS.map((w) => `${p.local.replace(/\.webp$/, `-${w}.webp`)} ${w}w`).join(', ')
    : undefined

export const images = {
  hero: photo(
    'hero',
    'hf_20260922_122230_1cd0f5ee-2084-4ce0-8cde-c0297e35de38',
    'גינה ים-תיכונית מעוצבת בשעת בין הערביים, עם עץ זית בוגר, ריצוף אבן טבעית ותאורת גן חמה',
    '16 / 9',
    '#2c2f22',
  ),
  aboutMain: photo(
    'about-main',
    'hf_20260922_122230_4cc75ebd-3b05-488e-bc33-799d8181583b',
    'שביל אבן בגינה פרטית, משני צדיו לבנדר ורוזמרין בתאורת אחר צהריים רכה',
    '4 / 5',
    '#7c7358',
  ),
  aboutDetail: photo(
    'about-detail',
    'hf_20260922_122230_c831e043-5927-41c1-9a9e-219888bb0e36',
    'תקריב של עלי זית ורוזמרין עם טיפות טל באור בוקר חם',
    '1 / 1',
    '#59603c',
  ),
  desk: photo(
    'desk',
    'hf_20260922_122351_500b6dde-0168-4189-ae71-148e2f5dbb31',
    'שולחן עבודה של מעצב גינות — תכנית גינה משורטטת ביד, סרגל קנה מידה ודוגמיות אבן',
    '3 / 2',
    '#9c8e74',
  ),
  texture: photo(
    'texture',
    'hf_20260922_122350_dd1ac4f5-24d1-4984-8b84-a96453e1f8be',
    'מרקם של צמחייה ים-תיכונית ירוקה ועמוקה',
    '16 / 9',
    '#2a3320',
  ),
  ctaBackdrop: photo(
    'cta',
    'hf_20260922_122232_1faa053b-d955-4cba-906f-8f96d6b07873',
    'מרפסת גן יוקרתית ברגעים האחרונים של בין הערביים, עם אורות גן חמים',
    '16 / 9',
    '#23291f',
  ),
} as const

/**
 * Inspiration gallery.
 * These are reference images that convey the design language — they are NOT
 * photographs of completed client projects. The section is labelled "השראה"
 * accordingly. Replace each entry with a real project photograph and rename
 * the section heading in `src/sections/Portfolio.tsx` once real work is shot.
 */
export type GalleryItem = Photo & {
  id: string
  title: string
  caption: string
  /** Grid emphasis: `tall` items span two rows on desktop. */
  span: 'tall' | 'normal' | 'wide'
}

export const gallery: GalleryItem[] = [
  {
    ...photo(
      'gallery-path',
      'hf_20260922_122230_714fae88-afa9-41b4-90ae-e236c16382f2',
      'שביל אבן מתפתל בין שכבות צמחייה ים-תיכונית בגינה פרטית',
      '4 / 5',
      '#6a6c46',
    ),
    id: 'path',
    title: 'שבילי אבן',
    caption: 'מעבר בין שכבות צמחייה',
    span: 'tall',
  },
  {
    ...photo(
      'gallery-lounge',
      'hf_20260922_122352_ead3a7a5-9ee7-4b0e-b46d-6656b16d357a',
      'פינת ישיבה מקורה בפרגולת עץ עם ריפוד פשתן בהיר ותאורה חמה בשעת ערב',
      '1 / 1',
      '#3b3b2e',
    ),
    id: 'lounge',
    title: 'פינות ישיבה',
    caption: 'חדר נוסף מתחת לשמיים',
    span: 'normal',
  },
  {
    ...photo(
      'gallery-pool',
      'hf_20260922_122231_08c69f09-6515-4c04-8a24-d1bcc4c5fb27',
      'בריכה פרטית בגמר אבן מלוטשת, מוקפת דקלים, עצי זית וצמחייה נמוכה',
      '4 / 5',
      '#5f6a5a',
    ),
    id: 'pool',
    title: 'גינון סביב בריכה',
    caption: 'קו מים וקו אבן',
    span: 'tall',
  },
  {
    ...photo(
      'gallery-courtyard',
      'hf_20260922_122230_37304a34-ad3a-40b6-9cc9-a085f84ac693',
      'חצר פנימית מינימליסטית עם חצץ בהיר, עץ זית פיסולי ואגן מים מאבן',
      '1 / 1',
      '#8e8874',
    ),
    id: 'courtyard',
    title: 'חצרות פנימיות',
    caption: 'שקט ארכיטקטוני',
    span: 'normal',
  },
  {
    ...photo(
      'gallery-night',
      'hf_20260922_122230_e51e1c41-49c7-4ccb-a926-0a5c7df87d8f',
      'גינה פרטית בלילה עם תאורת גן מקצועית שמדגישה עץ זית ושביל אבן',
      '16 / 9',
      '#1d2018',
    ),
    id: 'night',
    title: 'תאורת גן',
    caption: 'הגינה ממשיכה אחרי השקיעה',
    span: 'wide',
  },
  {
    ...photo(
      'gallery-entrance',
      'hf_20260922_122230_e616d8a8-98af-487f-b585-3c006a16c056',
      'כניסה לבית פרטי עם מדרגות אבן, ברושים תמירים וגדר חיה מעוצבת',
      '4 / 5',
      '#6e6a52',
    ),
    id: 'entrance',
    title: 'כניסות לבית',
    caption: 'הרושם הראשון',
    span: 'normal',
  },
]

/**
 * Before / after.
 * PLACEHOLDER PAIR — a reference illustration of a transformation, not a real
 * client project. Swap both entries for a genuine matched pair from one job
 * and remove the `isPlaceholder` flag to drop the disclaimer.
 */
export const beforeAfter = {
  isPlaceholder: true,
  before: photo(
    'before',
    'hf_20260922_122231_31bacdab-37ba-4e68-882c-86cd084f36b7',
    'חצר אחורית מוזנחת לפני שיפוץ — דשא יבש, אדמה חשופה וריצוף סדוק',
    '3 / 2',
    '#8a8577',
  ),
  after: photo(
    'after',
    'hf_20260922_122230_661472b1-77b8-4f28-9465-bab0dabd971d',
    'אותה חצר אחורית אחרי עיצוב — מרפסת אבן, מדשאה מוקפדת, ערוגות שתולות ותאורה',
    '3 / 2',
    '#6f7a4e',
  ),
}
