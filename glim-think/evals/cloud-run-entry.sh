#!/usr/bin/env bash
# Hourly glim-think eval pass — Cloud Run Job entrypoint.
# Mirrors .github/workflows/glim-think-evals.yml (now schedule-disabled).
# Informational steps are tolerant; only a hard infra failure fails the job.
set -uo pipefail

WORKER="${WORKER_URL:-https://glim-think-v1.aw-ab5.workers.dev}"

echo "[eval-job] $(date -u +%FT%TZ) seeding a deterministic LLM span"
curl -fsS --max-time 30 "$WORKER/ops/llm-selftest" >/dev/null 2>&1 \
  && echo "  seeded" || echo "  seed skipped (non-fatal)"
sleep 20

echo "[eval-job] run-evals.ts"
npx tsx run-evals.ts
RUN_RC=$?
echo "  run-evals exit=$RUN_RC"

echo "[eval-job] verify-openinference.ts (health signal, informational)"
npx tsx verify-openinference.ts || echo "  verify non-fatal"

echo "[eval-job] regression-gate.ts (warn-only rollout iteration)"
npx tsx regression-gate.ts || echo "  regression-gate flagged (non-fatal for now)"

echo "[eval-job] $(date -u +%FT%TZ) done"
# Fail the job only if the core eval pass itself errored.
exit "$RUN_RC"
