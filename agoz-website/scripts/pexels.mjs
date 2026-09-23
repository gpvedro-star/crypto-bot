/**
 * Pexels integration.
 *
 *   npm run pexels:search   → queries photos AND videos, writes a shortlist
 *   npm run pexels:fetch    → downloads the picked assets and wires them in
 *
 * Two steps on purpose: taking whatever ranks first is what makes a page look
 * like stock. Step one gives you a pool per chapter with the photographer and
 * the Pexels page so you can pick for consistent light and palette; step two
 * downloads only what you picked.
 *
 * SECURITY — the key never reaches the browser. This is a static site with no
 * server, so the request happens at BUILD time in Node, and only the resulting
 * image files are shipped. Vite exposes only variables prefixed VITE_, so
 * PEXELS_API_KEY cannot leak into the bundle even by accident. Never rename it
 * to VITE_PEXELS_API_KEY.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const shortlistPath = resolve(root, 'pexels.shortlist.json')
const picksPath = resolve(root, 'pexels.picks.json')
const photoDir = resolve(root, 'public/photos')
const videoDir = resolve(root, 'public/videos')
const assetsPath = resolve(root, 'src/data/pexelsAssets.ts')

try {
  if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'))
} catch {
  /* no .env just means the key comes from the shell */
}

const KEY = process.env.PEXELS_API_KEY
if (!KEY || KEY.length < 20 || /^(your|<|המפתח)/i.test(KEY)) {
  console.error(
    '\nPEXELS_API_KEY is missing or is still a placeholder.\n\n' +
      'Get a free key at https://www.pexels.com/api/ then add it in ONE of these places:\n\n' +
      `  1. A .env file at ${resolve(root, '.env')}   ← recommended, already gitignored\n` +
      '       PEXELS_API_KEY=abc123...\n\n' +
      '  2. Your shell, for this session only:\n' +
      '       export PEXELS_API_KEY=abc123...\n\n' +
      'Do NOT name it VITE_PEXELS_API_KEY — that prefix would ship it to the browser.\n',
  )
  process.exit(1)
}

/** The search terms, in English — they return far better results than Hebrew. */
const QUERIES = [
  'luxury modern garden',
  'landscaping construction',
  'garden construction',
  'garden design',
  'landscape architecture',
  'planting garden',
  'garden landscaping',
  'modern backyard',
  'Mediterranean garden',
  'luxury backyard',
]

/**
 * Which of those queries feed each chapter of the scroll sequence, and whether
 * a moving asset suits it. Construction and planting read well as video.
 */
const CHAPTERS = [
  { id: 'empty', prefer: 'photo', queries: ['modern backyard', 'garden design'] },
  { id: 'planning', prefer: 'photo', queries: ['landscape architecture', 'garden design'] },
  { id: 'prepare', prefer: 'video', queries: ['landscaping construction', 'garden construction'] },
  { id: 'paving', prefer: 'video', queries: ['landscaping construction', 'garden landscaping'] },
  { id: 'planting', prefer: 'video', queries: ['planting garden', 'garden landscaping'] },
  { id: 'shape', prefer: 'photo', queries: ['modern backyard', 'Mediterranean garden'] },
  { id: 'finishing', prefer: 'photo', queries: ['luxury backyard', 'Mediterranean garden'] },
  { id: 'final', prefer: 'photo', queries: ['luxury modern garden', 'luxury backyard'] },
]

const call = async (url) => {
  const res = await fetch(url, { headers: { Authorization: KEY } })
  if (res.status === 401) throw new Error('Pexels rejected the key (401). Check PEXELS_API_KEY.')
  if (res.status === 429) throw new Error('Pexels rate limit reached (429). Wait, then re-run.')
  if (!res.ok) throw new Error(`Pexels returned HTTP ${res.status} for ${url}`)
  return res.json()
}

const searchPhotos = (q) =>
  call(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=landscape&size=large&per_page=8`)
const searchVideos = (q) =>
  call(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&orientation=landscape&size=medium&per_page=8`)

/** Largest MP4 rendition no wider than 1920 — bigger is wasted on the web. */
const pickVideoFile = (files) =>
  files
    .filter((f) => f.file_type === 'video/mp4' && (f.width ?? 0) <= 1920)
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0] ?? files[0]

// ── connection test ─────────────────────────────────────────────────────────
async function verify() {
  process.stdout.write('Testing the Pexels connection … ')
  const p = await searchPhotos('garden design')
  const v = await searchVideos('garden landscaping')
  console.log('ok')
  console.log(`  photos endpoint: ${p.photos?.length ?? 0} results`)
  console.log(`  videos endpoint: ${v.videos?.length ?? 0} results`)
  if (!p.photos?.length) throw new Error('The photos endpoint returned nothing.')
  if (!v.videos?.length) throw new Error('The videos endpoint returned nothing.')
}

// ── search ──────────────────────────────────────────────────────────────────
async function search() {
  await verify()
  console.log(`\nQuerying ${QUERIES.length} terms across ${CHAPTERS.length} chapters.\n`)

  const shortlist = {}
  for (const { id, prefer, queries } of CHAPTERS) {
    const pool = new Map()

    for (const q of queries) {
      for (const ph of (await searchPhotos(q)).photos ?? []) {
        pool.set(`photo-${ph.id}`, {
          type: 'photo',
          pexelsId: ph.id,
          query: q,
          src: ph.src.original,
          width: ph.width,
          height: ph.height,
          tint: ph.avg_color,
          alt: ph.alt,
          photographer: ph.photographer,
          pexelsUrl: ph.url,
        })
      }
      for (const vi of (await searchVideos(q)).videos ?? []) {
        const file = pickVideoFile(vi.video_files ?? [])
        if (!file) continue
        pool.set(`video-${vi.id}`, {
          type: 'video',
          pexelsId: vi.id,
          query: q,
          src: file.link,
          poster: vi.image,
          width: file.width,
          height: file.height,
          duration: vi.duration,
          tint: vi.avg_color ?? null,
          alt: `${vi.user?.name ?? ''} — ${q}`.trim(),
          photographer: vi.user?.name ?? 'Unknown',
          pexelsUrl: vi.url,
        })
      }
    }

    // Show the preferred medium first, since that is what the chapter wants.
    const items = [...pool.values()].sort((a, b) =>
      a.type === b.type ? 0 : a.type === prefer ? -1 : 1,
    )
    shortlist[id] = items

    console.log(`── ${id}  (prefers ${prefer}) — ${items.length} candidates`)
    for (const c of items.slice(0, 10)) {
      const dims = `${c.width}×${c.height}`
      console.log(
        `   ${c.type.padEnd(5)} ${String(c.pexelsId).padEnd(9)} ${dims.padEnd(11)} ${(c.photographer ?? '').padEnd(22)} ${c.pexelsUrl}`,
      )
    }
    console.log()
  }

  await writeFile(shortlistPath, JSON.stringify(shortlist, null, 2))
  if (!existsSync(picksPath)) {
    const seed = Object.fromEntries(
      Object.entries(shortlist).map(([k, v]) => [k, v[0] ? { type: v[0].type, pexelsId: v[0].pexelsId } : null]),
    )
    await writeFile(picksPath, JSON.stringify(seed, null, 2))
  }
  console.log(
    `✔ shortlist → pexels.shortlist.json\n` +
      `✔ picks     → pexels.picks.json\n\n` +
      `Open the Pexels pages above, choose assets that share lighting and palette,\n` +
      `set their ids in pexels.picks.json, then run:  npm run pexels:fetch`,
  )
}

// ── fetch ───────────────────────────────────────────────────────────────────
const WIDTHS = [640, 1024, 1600, 2000]

async function fetchPicked() {
  await verify()
  if (!existsSync(picksPath)) {
    console.error('\nNo pexels.picks.json — run `npm run pexels:search` first.')
    process.exit(1)
  }
  const picks = JSON.parse(await readFile(picksPath, 'utf8'))
  const shortlist = existsSync(shortlistPath) ? JSON.parse(await readFile(shortlistPath, 'utf8')) : {}

  await mkdir(photoDir, { recursive: true })
  await mkdir(videoDir, { recursive: true })

  const assets = {}
  for (const [chapter, pick] of Object.entries(picks)) {
    if (!pick) { console.log(`· ${chapter} — no pick, skipped`); continue }

    let meta = (shortlist[chapter] ?? []).find(
      (c) => c.pexelsId === pick.pexelsId && c.type === pick.type,
    )
    if (!meta) {
      // The shortlist may be stale; ask Pexels for this exact asset.
      if (pick.type === 'photo') {
        const ph = await call(`https://api.pexels.com/v1/photos/${pick.pexelsId}`)
        meta = { type: 'photo', pexelsId: ph.id, src: ph.src.original, width: ph.width, height: ph.height, tint: ph.avg_color, alt: ph.alt, photographer: ph.photographer, pexelsUrl: ph.url }
      } else {
        const vi = await call(`https://api.pexels.com/videos/videos/${pick.pexelsId}`)
        const file = pickVideoFile(vi.video_files ?? [])
        meta = { type: 'video', pexelsId: vi.id, src: file.link, poster: vi.image, width: file.width, height: file.height, tint: vi.avg_color ?? null, alt: vi.user?.name ?? '', photographer: vi.user?.name ?? 'Unknown', pexelsUrl: vi.url }
      }
    }

    process.stdout.write(`· ${chapter} ← ${meta.type} ${meta.pexelsId} … `)
    const res = await fetch(meta.src)
    if (!res.ok) { console.log(`FAILED HTTP ${res.status}`); continue }
    const buf = Buffer.from(await res.arrayBuffer())

    if (meta.type === 'photo') {
      const base = await sharp(buf)
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(resolve(photoDir, `${chapter}.webp`))
      for (const w of WIDTHS) {
        await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 })
          .toFile(resolve(photoDir, `${chapter}-${w}.webp`))
      }
      console.log(`${base.width}×${base.height}, ${(base.size / 1024).toFixed(0)} KB`)
      assets[chapter] = {
        type: 'photo', pexelsId: meta.pexelsId, src: `/photos/${chapter}.webp`,
        ratio: `${meta.width} / ${meta.height}`, tint: meta.tint ?? '#2a2d22',
        alt: meta.alt || '', photographer: meta.photographer, pexelsUrl: meta.pexelsUrl,
      }
    } else {
      await writeFile(resolve(videoDir, `${chapter}.mp4`), buf)
      let posterOut = null
      if (meta.poster) {
        const pr = await fetch(meta.poster)
        if (pr.ok) {
          await sharp(Buffer.from(await pr.arrayBuffer()))
            .resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 })
            .toFile(resolve(photoDir, `${chapter}.webp`))
          posterOut = `/photos/${chapter}.webp`
        }
      }
      console.log(`${(buf.byteLength / 1024 / 1024).toFixed(1)} MB${posterOut ? ' + poster' : ''}`)
      assets[chapter] = {
        type: 'video', pexelsId: meta.pexelsId, src: `/videos/${chapter}.mp4`,
        poster: posterOut, ratio: `${meta.width} / ${meta.height}`,
        tint: meta.tint ?? '#2a2d22', alt: meta.alt || '',
        photographer: meta.photographer, pexelsUrl: meta.pexelsUrl,
      }
    }
  }

  await writeFile(
    assetsPath,
    `/* Generated by scripts/pexels.mjs — do not edit by hand. Re-run: npm run pexels:fetch */\n\n` +
      `export type PexelsAsset = {\n` +
      `  type: 'photo' | 'video'\n  pexelsId: number\n  src: string\n  poster?: string | null\n` +
      `  ratio: string\n  tint: string\n  alt: string\n  photographer: string\n  pexelsUrl: string\n}\n\n` +
      `/** Chapter id → the Pexels asset in use. Empty until \`npm run pexels:fetch\` runs. */\n` +
      `export const pexelsAssets: Record<string, PexelsAsset> = ${JSON.stringify(assets, null, 2)}\n`,
  )

  console.log(`\n✔ ${Object.keys(assets).length} assets in place, manifest → src/data/pexelsAssets.ts`)
  console.log('  The scroll experience picks them up automatically.')
  console.log('\n  Check each alt text reads well in Hebrew — Pexels supplies English.')
}

const mode = process.argv[2]
try {
  if (mode === 'search') await search()
  else if (mode === 'fetch') await fetchPicked()
  else if (mode === 'test') await verify()
  else { console.error('Usage: node scripts/pexels.mjs test|search|fetch'); process.exit(1) }
} catch (err) {
  console.error(`\n✖ ${err.message}`)
  process.exit(1)
}
