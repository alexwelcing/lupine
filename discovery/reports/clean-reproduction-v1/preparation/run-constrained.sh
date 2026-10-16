set -eu
. .cache/reproduction-attempt.env
. "$LUPINE_VENV/bin/activate"
export LUPINE_CONSTRAINED_WORKDIR=".cache/reproduce-jarvis-${LUPINE_REPRO_ATTEMPT:?Set a fresh attempt token}"
export LUPINE_RAW_SOURCE_CACHE=".cache/reproduction-raw-source/${LUPINE_REPRO_ATTEMPT}"
python scripts/reproduce_constrained.py \
  --workdir "$LUPINE_CONSTRAINED_WORKDIR" \
  --source-cache "$LUPINE_RAW_SOURCE_CACHE" \
  --expected-scientific-digest cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900 \
  --project-dashboard
