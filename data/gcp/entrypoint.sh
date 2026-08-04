#!/bin/bash
set -euo pipefail

# Cloud Run job array entrypoint for the Layer 2 3x3x3 benchmark grid.
# Maps CLOUD_RUN_TASK_INDEX to one (element, model) pair, then runs both
# PBE and r2SCAN functionals sequentially for that pair.

ELEMENTS=(Ag Al Au Ca Cr Cu Fe Mo Nb Ni Pd Pt Sr Ta V W)
MODELS=(M3GNet CHGNet TensorNet QET)

TOTAL_ELEMENT_MODEL=$(( ${#ELEMENTS[@]} * ${#MODELS[@]} ))
INDEX=${CLOUD_RUN_TASK_INDEX:-0}

if (( INDEX < 0 || INDEX >= TOTAL_ELEMENT_MODEL )); then
  echo "Invalid task index ${INDEX}; expected [0, ${TOTAL_ELEMENT_MODEL})" >&2
  exit 1
fi

MODEL_IDX=$(( INDEX % ${#MODELS[@]} ))
ELEMENT_IDX=$(( INDEX / ${#MODELS[@]} ))
ELEMENT=${ELEMENTS[$ELEMENT_IDX]}
MODEL=${MODELS[$MODEL_IDX]}
SUPERCELL=${SUPERCELL:-3}
OUTPUT_BUCKET=${OUTPUT_BUCKET:-lupine-benchmark-witching-606c6}

OUT_DIR="/tmp/layer2_${SUPERCELL}x${SUPERCELL}x${SUPERCELL}"
mkdir -p "$OUT_DIR"

echo "[layer2-job] Task ${INDEX}/${TOTAL_ELEMENT_MODEL}: ${ELEMENT} ${MODEL} ${SUPERCELL}x${SUPERCELL}x${SUPERCELL}"

for FUNCTIONAL in PBE r2SCAN; do
  OUT_FILE="${OUT_DIR}/${ELEMENT}_${MODEL}_${FUNCTIONAL}.json"
  echo "[layer2-job] Running ${ELEMENT} ${MODEL} ${FUNCTIONAL}"
  /app/.venv/bin/python /app/data/layer2_benchmark_task.py \
    --element "$ELEMENT" \
    --model "$MODEL" \
    --functional "$FUNCTIONAL" \
    --supercell "$SUPERCELL" \
    --output "$OUT_FILE"

  echo "[layer2-job] Uploading ${OUT_FILE} to gs://${OUTPUT_BUCKET}/layer2_${SUPERCELL}x${SUPERCELL}x${SUPERCELL}/"
  /app/.venv/bin/python - <<PY
from google.cloud import storage
import os
bucket = os.environ["OUTPUT_BUCKET"]
blob = f"layer2_${SUPERCELL}x${SUPERCELL}x${SUPERCELL}/${ELEMENT}_${MODEL}_${FUNCTIONAL}.json"
client = storage.Client()
client.bucket(bucket).blob(blob).upload_from_filename("${OUT_FILE}")
print(f"uploaded gs://{bucket}/{blob}")
PY
done

echo "[layer2-job] Task ${INDEX} complete"
