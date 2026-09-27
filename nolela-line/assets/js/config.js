/*
 * Nolela LINE — business settings.
 * Everything the site says about contact, shipping and the business comes from here.
 */
window.NOLELA_CONFIG = {
  brand: 'Nolela LINE',

  // WhatsApp number for orders, international format without "+" or dashes, e.g. '972501234567'.
  // While it is empty, orders are copied to the clipboard and sent through Instagram direct messages.
  whatsapp: '',

  instagram: 'nolela_line',
  facebook: 'NolelaLINE',

  city: { he: 'חיפה', ar: 'حيفا' },

  // Social proof shown on the site (from the public Facebook and Instagram pages).
  followers: '18K',
  fbRecommendPercent: 98,
  fbReviews: 85,

  shipping: {
    free: true,
    days: '2–5' // business days
  },

  // Details for the terms of sale page. Fill in before going live.
  business: {
    legalName: '',
    registration: '', // ע.מ / ח.פ
    address: '',
    email: '',
    accessibilityContact: ''
  },

  // The lens a first-time visitor sees in the hero.
  defaultShade: 'green-honey'
};
