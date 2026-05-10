#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# setup-gcs-bucket.sh — Create and configure GCS bucket for streaming
#
# Prerequisites:
#   - gcloud CLI authenticated
#   - gsutil available
#
# Usage:
#   bash infra/setup-gcs-bucket.sh
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

BUCKET_NAME="glim-datasets"
REGION="us-central1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "═══════════════════════════════════════════════════════"
echo "  Setting up GCS bucket: gs://${BUCKET_NAME}"
echo "  Region: ${REGION}"
echo "═══════════════════════════════════════════════════════"

# 1. Create bucket (regional, standard storage)
echo ""
echo "→ Creating bucket..."
gsutil mb -l "${REGION}" -c STANDARD "gs://${BUCKET_NAME}" 2>/dev/null || echo "  Bucket already exists"

# 2. Set CORS for Range Request support
echo "→ Setting CORS policy..."
gsutil cors set "${SCRIPT_DIR}/gcs-cors.json" "gs://${BUCKET_NAME}"

# 3. Set uniform bucket-level access (recommended for CDN)
echo "→ Enabling uniform bucket-level access..."
gsutil uniformbucketlevelaccess set on "gs://${BUCKET_NAME}"

# 4. Make bucket publicly readable (for CDN)
echo "→ Setting public read access..."
gsutil iam ch allUsers:objectViewer "gs://${BUCKET_NAME}"

# 5. Set default cache-control for new objects
echo "→ Setting default metadata..."
# Note: per-object cache-control is set during upload by glimbin_convert.py.
# This is just documentation for manual uploads.

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✓ Bucket ready: gs://${BUCKET_NAME}"
echo ""
echo "  Upload datasets:"
echo "    python tools/glimbin_convert.py input.lammpstrj \\"
echo "      --upload gs://${BUCKET_NAME}/datasets/"
echo ""
echo "  Access via Cloudflare:"
echo "    https://datasets.glim.lupine.dev/datasets/file.glimbin"
echo ""
echo "  Direct GCS (fallback):"
echo "    https://storage.googleapis.com/${BUCKET_NAME}/datasets/file.glimbin"
echo "═══════════════════════════════════════════════════════"
