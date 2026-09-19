#!/usr/bin/env bash
# Builds a fully static export into out/ for hosts without a Node runtime.
# Server-only API routes are set aside for the duration of the build.
set -euo pipefail
cd "$(dirname "$0")/.."
API_DIR="src/app/api"
STASH="$(mktemp -d)/api"
restore() { [ -d "$STASH" ] && mv "$STASH" "$API_DIR" || true; }
trap restore EXIT
mv "$API_DIR" "$STASH"
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
