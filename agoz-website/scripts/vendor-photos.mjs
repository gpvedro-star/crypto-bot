/**
 * Downloads every photograph declared in src/data/images.ts into public/photos/
 * as optimised WebP, then flips USE_LOCAL_PHOTOS so the site serves them from
 * its own domain instead of an external CDN.
 *
 *   npm run photos
 *
 * Safe to re-run: existing files are overwritten, and nothing else is touched.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const registry = resolve(root, 'src/data/images.ts')
const outDir = resolve(root, 'public/photos')

/** Widths emitted per photo — must match PHOTO_WIDTHS in src/data/images.ts. */
const WIDTHS = [640, 1024, 1600, 2000]
const QUALITY = 82

const source = await readFile(registry, 'utf8')

// Pull every photo(...) declaration: photo('name', 'remoteFile', ...)
const entries = [...source.matchAll(/photo\(\s*'([^']+)'\s*,\s*'([^']+)'/g)].map(
  ([, name, remoteFile]) => ({ name, remoteFile }),
)

const cdn = source.match(/const CDN = '([^']+)'/)?.[1]
if (!cdn) throw new Error('Could not find the CDN constant in src/data/images.ts')
if (entries.length === 0) throw new Error('No photo() declarations found in src/data/images.ts')

await mkdir(outDir, { recursive: true })

let ok = 0
let heroBuffer = null
for (const { name, remoteFile } of entries) {
  const url = `${cdn}/${remoteFile}.png`
  process.stdout.write(`· ${name} … `)
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (name === 'hero') heroBuffer = buf

    // The bare name is the default src; the -<w> files feed srcset.
    const base = await sharp(buf)
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(resolve(outDir, `${name}.webp`))

    let total = base.size
    for (const w of WIDTHS) {
      const v = await sharp(buf)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(resolve(outDir, `${name}-${w}.webp`))
      total += v.size
    }
    console.log(`${base.width}×${base.height} +${WIDTHS.length} widths, ${(total / 1024).toFixed(0)} KB total`)
    ok += 1
  } catch (err) {
    console.log(`FAILED — ${err.message}`)
  }
}

// A share card built from the real hero beats one built from the mark alone.
if (heroBuffer) {
  const card = await sharp(heroBuffer).resize(1200, 630, { fit: 'cover', position: 'attention' })
  const mark = await sharp(resolve(root, 'public/brand/agoz-logo.png')).resize(210, 210).toBuffer()
  await card
    .composite([
      { input: Buffer.from('<svg width="1200" height="630"><rect width="1200" height="630" fill="#101208" fill-opacity="0.45"/></svg>'), top: 0, left: 0 },
      { input: mark, gravity: 'center' },
    ])
    .jpeg({ quality: 86 })
    .toFile(resolve(root, 'public/brand/og-image.jpg'))
  console.log('· og-image.jpg rebuilt from the hero photograph')
}

if (ok === entries.length) {
  await writeFile(
    registry,
    source.replace('export const USE_LOCAL_PHOTOS = false', 'export const USE_LOCAL_PHOTOS = true'),
    'utf8',
  )
  console.log(`\n✔ ${ok} photos vendored into public/photos — now served locally.`)
} else {
  console.log(
    `\n! ${ok}/${entries.length} downloaded. USE_LOCAL_PHOTOS left as-is; fix the failures and re-run.`,
  )
  process.exitCode = 1
}
