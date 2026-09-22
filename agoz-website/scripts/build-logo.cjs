/**
 * Rebuilds every brand asset in public/brand/ from one source image.
 *
 *   node scripts/build-logo.cjs [path-to-source] [left] [top] [width] [height]
 *
 * The defaults reproduce the current assets from the original screenshot the
 * logo was supplied in. Given a clean logo file (ideally SVG or a transparent
 * PNG), pass it as the first argument and a crop that tightly frames the mark.
 *
 * It emits the mark on black, a background-free version keyed off luminance
 * (the artwork is gold and green light on pure black, so the key is exact),
 * a WebP copy, and the favicons.
 */
const sharp = require('sharp');
const [srcArg, ...cropArgs] = process.argv.slice(2);
const SRC = srcArg || 'public/brand/agoz-logo-dark.png';
const [left, top, width, height] = cropArgs.length === 4 ? cropArgs.map(Number) : [];
const CROP = srcArg && cropArgs.length === 4 ? { left, top, width, height } : null;

(async () => {
  const base = CROP ? sharp(SRC).extract(CROP) : sharp(SRC);
  const sq = await base.clone().resize(1024, 1024, { fit: 'contain', background: '#000000' })
    .png({ compressionLevel: 9 }).toBuffer();
  await sharp(sq).toFile('public/brand/agoz-logo-dark.png');

  // luminance key -> transparent background, unpremultiplied so it reads on any surface
  const { data, info } = await sharp(sq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  const LO = 12, HI = 84; // soft ramp so the thin gold ring keeps its edge
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = Math.max(r, g, b);
    let a = (lum - LO) / (HI - LO);
    a = a < 0 ? 0 : a > 1 ? 1 : a;
    a = Math.pow(a, 0.72);
    const A = Math.round(a * 255);
    if (A === 0) { out[i] = out[i+1] = out[i+2] = out[i+3] = 0; continue; }
    const k = 255 / A;
    out[i]     = Math.min(255, Math.round(r * k));
    out[i + 1] = Math.min(255, Math.round(g * k));
    out[i + 2] = Math.min(255, Math.round(b * k));
    out[i + 3] = A;
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 }).toFile('public/brand/agoz-logo.png');

  await sharp('public/brand/agoz-logo.png').resize(512, 512).webp({ quality: 92 }).toFile('public/brand/agoz-logo.webp');
  await sharp(sq).resize(180, 180).png().toFile('public/brand/apple-touch-icon.png');
  await sharp(sq).resize(64, 64).png().toFile('public/brand/favicon-64.png');
  await sharp(sq).resize(32, 32).png().toFile('public/brand/favicon-32.png');
  console.log('logo assets written');
})();
