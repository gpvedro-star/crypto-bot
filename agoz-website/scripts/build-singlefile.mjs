/**
 * Bundles the production build into one self-contained .html file.
 *
 *   npm run singlefile   →  dist-single/agoz-website.html
 *
 * CSS, JavaScript, every font face, the logo and the favicon are inlined, so
 * the file opens straight from the filesystem with no server and can be sent
 * to anyone as a single attachment. The photographs still come from their
 * host — run `npm run photos` first if you want those inlined too.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const out = resolve(root, 'dist-single')

const mime = (f) =>
  f.endsWith('.woff2') ? 'font/woff2'
  : f.endsWith('.png') ? 'image/png'
  : f.endsWith('.webp') ? 'image/webp'
  : f.endsWith('.jpg') ? 'image/jpeg'
  : 'application/octet-stream'

const dataUri = (file) => `data:${mime(file)};base64,${readFileSync(file).toString('base64')}`

// The longest edge each photograph is inlined at. Lower it for a smaller file.
const PHOTO_EDGE = Number(process.env.PHOTO_EDGE || 1600)

console.log('· building with relative asset paths')
execSync('npx vite build --base=./', {
  cwd: root,
  stdio: 'pipe',
  env: { ...process.env, VITE_SINGLEFILE: '1' },
})

let html = readFileSync(resolve(dist, 'index.html'), 'utf8')

// ── stylesheet, with every @font-face payload folded in ─────────────────────
const cssHref = html.match(/<link rel="stylesheet" [^>]*href="\.\/([^"]+)"[^>]*>/)
if (!cssHref) throw new Error('No stylesheet link found in the build output')
let css = readFileSync(resolve(dist, cssHref[1]), 'utf8')
const fontRefs = [...new Set([...css.matchAll(/url\(\.\.\/fonts\/([^)]+)\)/g)].map((m) => m[1]))]
for (const f of fontRefs) {
  css = css.split(`../fonts/${f}`).join(dataUri(resolve(dist, 'fonts', f)))
}
console.log(`· inlined ${fontRefs.length} font files`)
// Replacer functions, not strings: a minified payload is full of `$&` and
// `` $` `` sequences that String.replace would otherwise expand.
html = html.replace(cssHref[0], () => `<style>${css}</style>`)

// ── script, with the brand mark folded in ───────────────────────────────────
const jsSrc = html.match(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/)
if (!jsSrc) throw new Error('No module script found in the build output')
let js = readFileSync(resolve(dist, jsSrc[1]), 'utf8')

// A 256px mark is ample for the 112px it is drawn at, and keeps the file small.
const markPath = resolve(out, 'mark.webp')
mkdirSync(out, { recursive: true })
await sharp(resolve(root, 'public/brand/agoz-logo.png')).resize(256, 256).webp({ quality: 92 }).toFile(markPath)
js = js.split('/brand/agoz-logo.png').join(dataUri(markPath))

// ── photographs, when they have been vendored ───────────────────────────────
const photoDir = resolve(root, 'public/photos')
let inlined = 0
let photoScript = ''
if (existsSync(photoDir)) {
  // The paths are built from a template at runtime, so there is no whole
  // string to swap. src() reads window.__AGOZ_PHOTOS first instead.
  const names = [...new Set(
    readdirSync(photoDir)
      .filter((f) => f.endsWith('.webp'))
      .map((f) => f.replace(/-\d+\.webp$/, '.webp').replace(/\.webp$/, '')),
  )]
  const map = {}
  for (const name of names) {
    const sized = resolve(out, `photo-${name}.webp`)
    await sharp(resolve(photoDir, `${name}.webp`))
      .resize({ width: PHOTO_EDGE, height: PHOTO_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(sized)
    map[name] = dataUri(sized)
    inlined += 1
  }
  if (inlined) {
    photoScript = `<script>window.__AGOZ_PHOTOS=${JSON.stringify(map)}</script>`
    console.log(`· inlined ${inlined} photographs at ${PHOTO_EDGE}px`)
  }
}
if (js.includes('</script')) {
  // Only escape when the payload really could close its own tag; `<\/script`
  // is valid JS inside a string or regex, which is the only place it can occur.
  js = js.split('</script').join('<\\/script')
  console.log('· escaped a literal </script in the bundle')
}
html = html.replace(jsSrc[0], () => `${photoScript}<script type="module">${js}</script>`)

// ── icons: one inline favicon replaces the three linked files ───────────────
html = html
  .replace(/\s*<link rel="icon"[^>]*>/g, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, '')
  .replace(/\s*<link rel="preload" as="font"[^>]*>/g, '')
  .replace('</head>', () => `  <link rel="icon" type="image/png" href="${dataUri(resolve(root, 'public/brand/favicon-64.png'))}" />\n  </head>`)

const file = resolve(out, 'agoz-website.html')
writeFileSync(file, html, 'utf8')

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
// Ignore the commented-out canonical tag when reporting what is still remote.
const live = html.replace(/<!--[\s\S]*?-->/g, '')
const external = [...live.matchAll(/(?:src|href)="(https?:)?\/\/[^"]+"/g)].length
console.log(`\n✔ ${file}\n  ${kb(Buffer.byteLength(html))}, ${external} external references`)
// The photo URLs are assembled at runtime inside the bundle, so the attribute
// scan above cannot see them — whether they are inlined is the real test.
console.log(
  inlined > 0 && external === 0
    ? '  Fully self-contained — it opens with no server and no connection.'
    : '  Opens with no server. The photographs are still fetched over the\n'
      + '  network — run `npm run photos`, then rebuild, to inline those too.',
)
