/**
 * Single source of truth for everything business-specific.
 * Anything still marked PLACEHOLDER is waiting on real information
 * from the business owner — nothing here is invented.
 */

export const site = {
  name: 'אגוז',
  nameFull: 'אגוז · גינות יוקרה',
  latinName: 'Agoz Luxury Gardens',
  tagline: 'גינות יוקרה',
  disciplines: 'עיצוב · תכנון · ביצוע',

  /** Real number, supplied by the business owner. */
  phone: {
    display: '054-287-0949',
    href: 'tel:+972542870949',
    whatsapp: 'https://wa.me/972542870949',
    whatsappPrefill:
      'https://wa.me/972542870949?text=' +
      encodeURIComponent('היי, הגעתי דרך האתר ואשמח לשמוע על עיצוב גינה.'),
  },

  /** PLACEHOLDER — replace with the real mailbox. */
  email: {
    display: 'info@example.com',
    href: 'mailto:info@example.com',
    isPlaceholder: true,
  },

  /**
   * PLACEHOLDER — no service area has been supplied, so nothing is claimed.
   * Fill `areaServed` in and it will appear in the contact block automatically.
   */
  areaServed: null as string | null,

  /** PLACEHOLDER — set a URL to reveal the icon in the footer. */
  social: {
    facebook: null as string | null,
    instagram: null as string | null,
  },
} as const

export const nav = [
  { label: 'ראשי', href: '#top' },
  { label: 'אודות', href: '#about' },
  { label: 'שירותים', href: '#services' },
  { label: 'העבודות שלנו', href: '#portfolio' },
  { label: 'גלריה', href: '#gallery' },
  { label: 'צור קשר', href: '#contact' },
] as const

export const CTA_LABEL = 'לתיאום שיחה'
