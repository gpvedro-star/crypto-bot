/**
 * PLACEHOLDER TESTIMONIALS.
 * ---------------------------------------------------------------------------
 * No real customer quotes have been supplied yet, so nothing here is presented
 * as a real person: the names are generic role labels, not invented identities,
 * and the section renders a visible disclaimer while `isPlaceholder` is true.
 *
 * To go live: replace the array with real quotes (with the customer's consent),
 * and set `isPlaceholder` to false to remove the disclaimer.
 */
export const isPlaceholder = true

export type Testimonial = {
  id: string
  quote: string
  author: string
  context: string
}

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    quote:
      'טקסט המלצה לדוגמה. כאן תופיע המלצה אמיתית של לקוח על תהליך העבודה, על הליווי ועל התוצאה הסופית בגינה.',
    author: 'שם הלקוח',
    context: 'סוג הפרויקט · שנה',
  },
  {
    id: 't2',
    quote:
      'טקסט המלצה לדוגמה. כאן תופיע המלצה אמיתית שמתארת את מה שהיה חשוב ללקוח — עמידה בלוחות זמנים, ירידה לפרטים או היחס האישי.',
    author: 'שם הלקוח',
    context: 'סוג הפרויקט · שנה',
  },
  {
    id: 't3',
    quote:
      'טקסט המלצה לדוגמה. כאן תופיע המלצה אמיתית על השינוי שהגינה עברה ועל איך המשפחה משתמשת בה היום.',
    author: 'שם הלקוח',
    context: 'סוג הפרויקט · שנה',
  },
]
