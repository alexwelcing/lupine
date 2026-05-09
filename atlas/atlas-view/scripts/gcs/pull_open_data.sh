#!/usr/bin/env bash
# Pull the >50 MB open-data trajectories from GCS to apps/web/public/gallery/open_data/
# for fast offline dev. Uses anonymous HTTPS (the bucket objects are public-read);
# no gcloud auth needed.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCAL_DIR="$REPO_ROOT/apps/web/public/gallery/open_data"
LIST="$LOCAL_DIR/.gcs-hosted.json"
BASE_URL="https://storage.googleapis.com/shed-489901-atlas-artifacts/atlas/open_data"

if ! command -v jq >/dev/null; then
  echo "ERROR: jq required (apt: sudo apt install jq, brew: brew install jq)" >&2
  exit 1
fi
mkdir -p "$LOCAL_DIR"

mapfile -t FILES < <(jq -r '.[]' "$LIST")
for rel in "${FILES[@]}"; do
  base=$(basename "$rel")
  dst="$LOCAL_DIR/$base"
  if [ -f "$dst" ]; then
    echo "  skip $base (already present, $(du -h "$dst" | cut -f1))"
    continue
  fi
  url="$BASE_URL/$base"
  printf "  fetching %-40s ... " "$base"
  if curl -sS -L -f -o "$dst" --max-time 300 "$url"; then
    echo "$(du -h "$dst" | cut -f1)"
  else
    echo "FAILED ($url)"
    rm -f "$dst"
  fi
done

echo "Done. ${#FILES[@]} files in $LOCAL_DIR"
