#!/bin/bash
# Startup script for a GCP burst node that computes all-electron elastic
# constants with FHI-aims. Intended machine type: c2-standard-30 (us-central1-a).
# This script self-deletes the instance when finished.
set -euo pipefail

export HOME=/root
PROJECT="shed-489901"
ZONE="us-central1-a"
AIMS_BUCKET="gs://shed-489901-dft/aims"
OUT_BUCKET="gs://shed-489901-omol25/elastic-ae"
REPO_URL="https://github.com/lupinesci/lupine.git"
REPO_DIR="/opt/lupine"

echo "=== AIMS elastic startup: $(date -Iseconds) ==="

# Install dependencies.
apt-get update -y
apt-get install -y python3-pip python3-venv git curl jq

# Ensure gsutil is available (ships with Debian cloud images; install if not).
command -v gsutil >/dev/null 2>&1 || apt-get install -y google-cloud-sdk

# Download the licensed FHI-aims binary and species defaults.
mkdir -p /opt/aims
gsutil -m cp -r "${AIMS_BUCKET}/*" /opt/aims/
export AIMS_COMMAND="/opt/aims/aims.x"
export AIMS_SPECIES_DEFAULTS="/opt/aims/species_defaults/tight"
chmod +x "${AIMS_COMMAND}"

# Clone or refresh the repo so the runner is available.
if [ -d "${REPO_DIR}" ]; then
  cd "${REPO_DIR}" && git pull
else
  git clone "${REPO_URL}" "${REPO_DIR}"
  cd "${REPO_DIR}"
fi

# Install Python environment.
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt || .venv/bin/pip install ase numpy scipy

# Run the elastic-constant workflow for both functionals.
mkdir -p replication/error-geometry/data/anchors/dft_ae
.venv/bin/python scripts/run_aims_elastic.py \
  --functional pbe \
  --aims-command "${AIMS_COMMAND}" \
  --species-defaults "${AIMS_SPECIES_DEFAULTS}" \
  --output replication/error-geometry/data/anchors/dft_ae/results-elastic-AE-pbe-v1.json

.venv/bin/python scripts/run_aims_elastic.py \
  --functional r2scan \
  --aims-command "${AIMS_COMMAND}" \
  --species-defaults "${AIMS_SPECIES_DEFAULTS}" \
  --output replication/error-geometry/data/anchors/dft_ae/results-elastic-AE-r2scan-v1.json

# Upload results and logs.
gsutil -m cp replication/error-geometry/data/anchors/dft_ae/*.json "${OUT_BUCKET}/"
gsutil -m cp /var/log/syslog "${OUT_BUCKET}/startup-syslog-$(date +%Y%m%d-%H%M%S).txt" || true

# Self-delete the instance.
INSTANCE_NAME=$(curl -sf "http://metadata.google.internal/computeMetadata/v1/instance/name" -H "Metadata-Flavor: Google")
INSTANCE_ZONE=$(curl -sf "http://metadata.google.internal/computeMetadata/v1/instance/zone" -H "Metadata-Flavor: Google" | cut -d/ -f4)
echo "Shutting down ${INSTANCE_NAME} in ${INSTANCE_ZONE}"
gcloud compute instances delete "${INSTANCE_NAME}" --zone="${INSTANCE_ZONE}" --project="${PROJECT}" --quiet
