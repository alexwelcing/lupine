set -eu
. .cache/reproduction-attempt.env
. "$LUPINE_VENV/bin/activate"
export LUPINE_CONSTRAINED_WORKDIR=".cache/reproduce-jarvis-${LUPINE_REPRO_ATTEMPT:?Set a fresh attempt token}"
export LUPINE_TRAINING_INPUT_CACHE="${LUPINE_CONSTRAINED_WORKDIR:?Complete the fresh constrained workflow first}/artifacts"
export LUPINE_TRAINING_WORKDIR=".cache/training-tail/jarvis-training-tail-v1-${LUPINE_REPRO_ATTEMPT:?Set a fresh attempt token}"
python scripts/training_tail.py run \
  --input-cache "$LUPINE_TRAINING_INPUT_CACHE" \
  --output-dir "$LUPINE_TRAINING_WORKDIR" \
  --engineering-validation "reports/training-tail-engineering-validation-${LUPINE_REPRO_ATTEMPT}.json"
