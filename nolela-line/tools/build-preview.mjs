// Builds a single-file preview of the site (inline CSS + JS, body content only)
// for hosts that wrap the page in their own document skeleton.
//
//   node tools/build-preview.mjs [output-path]
//
// Default output: dist/preview.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(root, 'dist', 'preview.html'));
const html = readFileSync(join(root, 'index.html'), 'utf8');

const fonts = [...html.matchAll(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]+)">/g)].map((m) => m[1]);
const css = readFileSync(join(root, 'assets/css/styles.css'), 'utf8');
let body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));

body = body.replace(/<script src="(assets\/js\/[^"]+)"><\/script>/g, (_, src) => {
  const js = readFileSync(join(root, src), 'utf8');
  if (js.includes('</script')) throw new Error(`${src} contains a closing script tag`);
  return `<script>\n${js}\n</script>`;
});

const page = [
  '<title>Nolela LINE</title>',
  ...fonts.map((href) => `<link rel="stylesheet" href="${href}">`),
  '<script>document.documentElement.lang = "he"; document.documentElement.dir = "rtl";</script>',
  `<style>\n${css}\n</style>`,
  body.trim(),
  ''
].join('\n');

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`wrote ${out} (${(page.length / 1024).toFixed(0)} KB)`);
