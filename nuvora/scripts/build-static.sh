#!/usr/bin/env bash
# Builds a fully static export into out/ for hosts without a Node runtime.
# Server-only API routes are set aside for the duration of the build.
set -euo pipefail
cd "$(dirname "$0")/.."
# A static export is a snapshot: it has no server, so neither the editorial API
# nor the authenticated draft preview can exist in it. Both are set aside for
# the build and restored afterwards.
TMP="$(mktemp -d)"
API_DIR="src/app/api"
PREVIEW_DIR="src/app/preview"
restore() {
  [ -d "$TMP/api" ] && mv "$TMP/api" "$API_DIR" || true
  [ -d "$TMP/preview" ] && mv "$TMP/preview" "$PREVIEW_DIR" || true
  [ -d "$TMP/articles" ] && mv "$TMP/articles" "src/app/articles" || true
  i=0
  for f in ${DYNAMIC_PAGES:-}; do
    i=$((i + 1))
    [ -f "$TMP/pages/$i.tsx" ] && [ -f "$f" ] && cp "$TMP/pages/$i.tsx" "$f" || true
  done
}
trap restore EXIT
mv "$API_DIR" "$TMP/api"
mv "$PREVIEW_DIR" "$TMP/preview"

# `output: export` refuses a dynamic route whose generateStaticParams returns
# nothing. With every repository article currently unpublished pending
# verification, /articles/[slug] has no routes to emit, so it is set aside too
# and restored afterwards. It comes back as soon as one article is published.
# Route segment config must be a literal, so the on-demand rendering that lets
# live editorial records appear without a rebuild is switched off here by
# rewriting it — the export has no server to render an unknown path.
DYNAMIC_PAGES="src/app/[category]/page.tsx src/app/authors/[slug]/page.tsx src/app/articles/[slug]/page.tsx"
mkdir -p "$TMP/pages"
i=0
for f in $DYNAMIC_PAGES; do
  i=$((i + 1))
  cp "$f" "$TMP/pages/$i.tsx"
  sed -i 's/^export const dynamicParams = true;$/export const dynamicParams = false;/' "$f"
done

ARTICLES_DIR="src/app/articles"
if ! grep -rqs 'status: "published"' src/content/articles; then
  echo "No published repository articles — omitting /articles from the export."
  mv "$ARTICLES_DIR" "$TMP/articles"
  restore_articles=1
fi
rm -rf .next out
NUVORA_STATIC=1 npx next build

# Static hosts infer content types from extensions: give the generated
# Open Graph images a .png suffix and point the markup at the renamed files.
find out -type f -name "opengraph-image" | while read -r f; do mv "$f" "$f.png"; done
grep -rl "opengraph-image" out --include="*.html" --include="*.txt" | while read -r f; do
  sed -i 's#/opengraph-image\([^.a-z]\)#/opengraph-image.png\1#g; s#/opengraph-image$#/opengraph-image.png#g; s#/opengraph-image"#/opengraph-image.png"#g' "$f"
done
# NUVORA_STRIP_RSC=1 drops the per-route RSC payload files (smaller export for
# hosts that scan every committed text file); links then load the next page as
# a normal document.
[ "${NUVORA_STRIP_RSC:-0}" = "1" ] && find out -type f -name "*.txt" -delete || true

echo "Static export written to $(pwd)/out"
