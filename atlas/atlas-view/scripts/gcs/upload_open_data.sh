#!/usr/bin/env bash
# Upload the >50 MB open-data trajectories to gs://shed-489901-atlas-artifacts/atlas/open_data/.
# Run from your workstation with `gcloud auth login` already configured for project shed-489901.
#
# Idempotent: gsutil cp will overwrite, but content is hash-stable so this is a no-op
# after the first successful run. Cache-Control is set immutable so the CDN keeps
# them forever (file contents are derived from immutable Zenodo / figshare records).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCAL_DIR="$REPO_ROOT/apps/web/public/gallery/open_data"
LIST="$LOCAL_DIR/.gcs-hosted.json"
BUCKET="gs://shed-489901-atlas-artifacts"
PREFIX="atlas/open_data"
PROJECT="shed-489901"

if ! command -v gsutil >/dev/null; then
  echo "ERROR: gsutil not on PATH. Install Google Cloud SDK first." >&2
  exit 1
fi
if ! command -v jq >/dev/null; then
  echo "ERROR: jq not found (used to read .gcs-hosted.json)." >&2
  exit 1
fi
if [ ! -f "$LIST" ]; then
  echo "ERROR: $LIST missing." >&2
  exit 1
fi

echo "==> Verifying gcloud project"
gcloud config set project "$PROJECT" >/dev/null

echo "==> Setting bucket CORS (lets the browser fetch + Range these files)"
gsutil cors set "$REPO_ROOT/scripts/gcs/cors.json" "$BUCKET"

echo "==> Uploading trajectories"
mapfile -t FILES < <(jq -r '.[]' "$LIST")
for rel in "${FILES[@]}"; do
  base=$(basename "$rel")
  src="$LOCAL_DIR/$base"
  dst="$BUCKET/$PREFIX/$base"
  if [ ! -f "$src" ]; then
    echo "  ! skip $base (not on disk; run pull_open_data.sh or scripts/convert_open_md_to_lammpstrj.py first)"
    continue
  fi
  size=$(stat -c '%s' "$src" 2>/dev/null || stat -f '%z' "$src")
  printf "  %-40s %10s bytes -> %s\n" "$base" "$size" "$dst"
  gsutil -q -h "Cache-Control:public, max-age=31536000, immutable" \
              -h "Content-Type:text/plain" \
              cp "$src" "$dst"
done

echo "==> Confirming CORS on a sample object"
sample=$(basename "${FILES[0]}")
echo "  sample: $sample"
curl -sS -I -H "Origin: https://atlas-viewer-350452481649.us-central1.run.app" \
  "https://storage.googleapis.com/shed-489901-atlas-artifacts/$PREFIX/$sample" \
  | grep -iE "access-control-allow-origin|cache-control|content-length" || true

echo "==> Done. Public URLs:"
for rel in "${FILES[@]}"; do
  echo "  https://storage.googleapis.com/shed-489901-atlas-artifacts/$PREFIX/$(basename "$rel")"
done
