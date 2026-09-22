/**
 * DEV-ONLY. Generates neutral stand-in files in public/photos/ so the layout can
 * be reviewed without network access to the real photographs. Never commit the
 * output — public/photos is gitignored. Replace with `npm run photos`.
 */
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/photos')
const source = await readFile(resolve(root, 'src/data/images.ts'), 'utf8')

const entries = [
  ...source.matchAll(/photo\(\s*'([^']+)'[\s\S]{0,700}?'(\d+) \/ (\d+)',\s*'(#[0-9a-f]{6})'/g),
].map(([, name, w, h, tint]) => ({ name, w: +w, h: +h, tint }))

await mkdir(outDir, { recursive: true })
for (const { name, w, h, tint } of entries) {
  const W = 1400
  const H = Math.round((W * h) / w)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${tint}" stop-opacity="0.72"/>
      <stop offset="1" stop-color="${tint}"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <text x="${W / 2}" y="${H / 2}" fill="#ffffff" fill-opacity="0.32"
      font-family="sans-serif" font-size="34" text-anchor="middle">${name} · ${w}:${h}</text>
  </svg>`
  const png = Buffer.from(svg)
  await sharp(png).webp({ quality: 70 }).toFile(resolve(outDir, `${name}.webp`))
  for (const vw of [640, 1024, 1600, 2000]) {
    await sharp(png)
      .resize({ width: vw, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(resolve(outDir, `${name}-${vw}.webp`))
  }
}
console.log(`stand-ins: ${entries.length}`)
