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
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
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

console.log('· building with relative asset paths')
execSync('npx vite build --base=./', { cwd: root, stdio: 'pipe' })

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
if (js.includes('</script')) {
  // Only escape when the payload really could close its own tag; `<\/script`
  // is valid JS inside a string or regex, which is the only place it can occur.
  js = js.split('</script').join('<\\/script')
  console.log('· escaped a literal </script in the bundle')
}
html = html.replace(jsSrc[0], () => `<script type="module">${js}</script>`)

// ── icons: one inline favicon replaces the three linked files ───────────────
html = html
  .replace(/\s*<link rel="icon"[^>]*>/g, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, '')
  .replace(/\s*<link rel="preload" as="font"[^>]*>/g, '')
  .replace('</head>', () => `  <link rel="icon" type="image/png" href="${dataUri(resolve(root, 'public/brand/favicon-64.png'))}" />\n  </head>`)

const file = resolve(out, 'agoz-website.html')
writeFileSync(file, html, 'utf8')

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
console.log(`\n✔ ${file}\n  ${kb(Buffer.byteLength(html))} — opens with no server, nothing left to fetch but the photographs.`)
if (!existsSync(resolve(root, 'public/photos'))) {
  console.log('  Tip: run `npm run photos` first to serve the photographs from this file too.')
}
