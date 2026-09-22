/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',
          soft: 'rgb(var(--c-ink-soft) / <alpha-value>)',
          raised: 'rgb(var(--c-ink-raised) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--c-gold) / <alpha-value>)',
          light: 'rgb(var(--c-gold-light) / <alpha-value>)',
          deep: 'rgb(var(--c-gold-deep) / <alpha-value>)',
          ink: 'rgb(var(--c-gold-ink) / <alpha-value>)',
        },
        leaf: {
          DEFAULT: 'rgb(var(--c-leaf) / <alpha-value>)',
          deep: 'rgb(var(--c-leaf-deep) / <alpha-value>)',
          shadow: 'rgb(var(--c-leaf-shadow) / <alpha-value>)',
        },
        cream: {
          DEFAULT: 'rgb(var(--c-cream) / <alpha-value>)',
          warm: 'rgb(var(--c-cream-warm) / <alpha-value>)',
        },
        stone: {
          DEFAULT: 'rgb(var(--c-stone) / <alpha-value>)',
          deep: 'rgb(var(--c-stone-deep) / <alpha-value>)',
        },
        charcoal: 'rgb(var(--c-charcoal) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Frank Ruhl Libre"', 'Georgia', 'serif'],
        sans: ['Assistant', 'system-ui', 'sans-serif'],
        latin: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      maxWidth: { shell: '96rem' },
      transitionTimingFunction: { brand: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
}
