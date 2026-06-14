# glim-think

Durable research control plane that owns the agenda, ledger, feed, evals,
hypotheses, and agent workflows for the Lupine Science closed scientific loop.

## What lives inside

| Path | Purpose |
| --- | --- |
| `src/` | Cloudflare Worker / Durable Object source (OrchestratorThink, facets, workflows). |
| `migrations/` | D1 database migrations. |
| `evals/` | Evaluator definitions and prompts. |
| `otlp-relay/` | OpenInference / OTLP trace relay shared with tools and Python packages. |
| `scripts/` | One-off and maintenance scripts. |
| `package.json` / `wrangler.toml` | Node/pnpm package and Wrangler deployment config. |

## Install

```bash
cd glim-think
pnpm install
```

Full environment setup is in [`docs/ONBOARDING.md`](../docs/ONBOARDING.md).

## Build / test

```bash
# Fast focused checks
npm run lint
npm test

# Full local dev server
npx wrangler dev
```

On Windows, run Node/pnpm tasks through Git Bash or the root `justfile` to
avoid PowerShell process-tree hangs.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OrchestratorThink                         │
│  (Parent Think agent: model routing, agenda, dispatch)      │
└──────────────┬──────────────────────────────┬───────────────┘
               │ RPC                          │ RPC
    ┌──────────▼──────────┐        ┌──────────▼──────────┐
    │   ManifoldFacet     │        │    CausalFacet      │
    │   Durable Object    │        │   Durable Object    │
    │   SQLite + R2       │        │   SQLite + R2       │
    └──────────┬──────────┘        └──────────┬──────────┘
               │                              │
    ┌──────────▼──────────┐        ┌──────────▼──────────┐
    │   TheoristFacet     │        │   ExperimentFacet   │
    │   Durable Object    │        │   Durable Object    │
    │   Session fork/tree │        │   Tier-4 Sandbox    │
    └─────────────────────┘        │   (LAMMPS + git)    │
                                   └─────────────────────┘
```

## Mapping to atlas-distill

| atlas-distill (Rust) | glim-think (Project Think) | Primitive Used |
|---|---|---|
| `ManifoldAgent` | `ManifoldFacet` | `runFiber()` + `stash()` |
| `CausalAgent` | `CausalFacet` | SQLite dedup (survives eviction) |
| `TheoristAgent` | `TheoristFacet` | Session fork/tree + BYOM |
| `ExperimentAgent` | `ExperimentFacet` | Tier-4 Sandbox + workspace sync |
| `Orchestrator` | `OrchestratorThink` | Sub-agent RPC + AI Gateway |
| JSONL ledger | DO SQLite + R2 | Persistent state |
| In-memory dedup | SQL `INSERT` idempotency | Durable state |

## Multi-Provider Model Routing

The Orchestrator uses AI Gateway to route tasks to the cheapest capable model:

| Task | Preferred Model | Fallback |
|---|---|---|
| Ingestion / screening | `@cf/meta/llama-3.1-8b` | `@cf/mistral/mistral-7b` |
| Hypothesis generation | `@cf/moonshotai/kimi-k2.5` | `gpt-4.1` via gateway |
| Experiment design | `@cf/meta/llama-3.3-70b` | `claude-3-7-sonnet` via gateway |
| Code execution review | `@cf/deepseek/deepseek-r1` | Local fine-tuned model |

## Execution Ladder

| Tier | Environment | Use Case |
|---|---|---|
| 0 | Workspace (SQLite + R2) | Ledger queries, file grep, diff |
| 1 | Dynamic Worker | Lightweight data transforms |
| 2 | Dynamic Worker + npm | Analysis scripts with zod, mathjs |
| 3 | Browser Run | Scraping NIST, OpenKIM portals |
| 4 | Sandbox | `lmp`, `cargo test`, `git clone` |

## Model Geometry Distill

`POST /research/model-geometry` wires MLIP/model-to-model geometry into the
durable hypothesis loop:

1. The request names a `hypothesis_id` plus a `fixture_url` for a tidy
   model dump.
2. `glim-think` enqueues `model_geometry_distill`, records a Phoenix
   `hypothesis.compute_dispatch` span, and writes a dispatch evaluator row.
3. The task dispatches `atlas-distill model-geometry` through the same
   Cloud Tasks/tasks-consumer path as other heavy work.
4. `atlas-distill` emits a `/feed/beats` packet with the evidence JSON,
   rank guard, accuracy gate, and pairwise verdicts.

Example:

```bash
curl -X POST "$WORKER_URL/research/model-geometry" \
  -H "content-type: application/json" \
  -d '{
    "hypothesis_id": "mlip-manifold-equivalence",
    "fixture_url": "gs://atlas-inputs/model_geometry.csv",
    "model_pairs": ["gen0:gen1", "gen1:gen2"],
    "quality_gate": "accuracy",
    "top_k": 5
  }'
```

Research workflows are registered first-class experiment families. The current
MLIP 5x5x3 workflow writes a D1-backed campaign ledger plus 75 cells: five
observable accuracy rows, five baseline MLIP columns, and three variants:
baseline, Distill accuracy, and Distill accuracy + accelerate.

```bash
curl "$WORKER_URL/research/workflows"

curl -X POST "$WORKER_URL/research/workflows/mlip-5x5x3/campaigns" \
  -H "content-type: application/json" \
  -d '{
    "hypothesis_id": "mlip-efficiency-5x5x3",
    "fixture_url_template": "gs://atlas-inputs/mlip-5x5x3/{campaign_id}/{variant_id}/{row_id}/{mlip_id}.csv",
    "model_pairs": ["baseline:distilled"],
    "top_k": 5,
    "quality_gate": "accuracy"
  }'

curl -X POST "$WORKER_URL/research/workflows/mlip-5x5x3/campaigns/mlip-5x5x3-YYYYMMDDHHMMSS/enqueue" \
  -H "content-type: application/json" \
  -d '{"limit": 75}'
```

Each result cell records `accuracy_score` and `speed_score`. Beats emitted by
`atlas-distill model-geometry` automatically project back into the campaign
when they carry `campaign_id` and `cell_id`.

Phoenix evaluation cadence runs by triplet: one observable row, one MLIP
column, and the three variants needed for a durable verdict.

```bash
curl "$WORKER_URL/research/workflows/mlip-5x5x3/campaigns/mlip-5x5x3-YYYYMMDDHHMMSS/units/next?limit=1"

curl -X POST "$WORKER_URL/research/workflows/mlip-5x5x3/campaigns/mlip-5x5x3-YYYYMMDDHHMMSS/units/elastic_constants%3Amace-mp-0/enqueue" \
  -H "content-type: application/json" \
  -d '{"dry_run": true}'

curl -X POST "$WORKER_URL/research/workflows/mlip-5x5x3/campaigns/mlip-5x5x3-YYYYMMDDHHMMSS/units/elastic_constants%3Amace-mp-0/evaluate"
```

The triplet evaluator emits `experiment_design`, `compute_dispatch`,
`evidence`, and `verdict` hypothesis spans, writes a local evaluator row, and
adds a Phoenix trace annotation when `PHOENIX_COLLECTOR_ENDPOINT` and
`PHOENIX_API_KEY` are configured.

The old `/research/mlip-campaign/...` URLs remain as compatibility aliases,
but new problem families should register adapters under `/research/workflows`.

### MLIP baseline grid Lab run

`mlip-baseline-grid` is the real baseline lane for committee-facing MLIP
evidence. Cloudflare remains the research control plane: D1 run state, Workflow
progress, Phoenix evaluator rows, R2 report artifacts, ops actions, and public
report routes. GCP is the governed compute instrument: Cloud Tasks reaches the
allowlisted `tasks-consumer`, which starts one MLIP-specific Cloud Run Job per
cell.

Default Lab profile:

```bash
curl -X POST "$WORKER_URL/research/workflows/mlip-baseline-grid/campaigns" \
  -H "content-type: application/json" \
  -d '{
    "profile": "lab-gcp-gpu",
    "fixture_id": "canonical-structures-v1",
    "hypothesis_id": "mlip-baseline-grid-lab",
    "max_dollars_per_hour": 20,
    "max_active_gpu_cells": 10
  }'
```

Useful surfaces:

```bash
curl "$WORKER_URL/research/workflows/mlip-baseline-grid/campaigns/RUN_ID/report"
curl "$WORKER_URL/research/workflows/mlip-baseline-grid/campaigns/RUN_ID/report?format=json"
curl "$WORKER_URL/research/workflows/mlip-baseline-grid/campaigns/RUN_ID/ops"
curl -X POST "$WORKER_URL/research/workflows/mlip-baseline-grid/campaigns/RUN_ID/maintain" \
  -H "content-type: application/json" \
  -d '{"mode": "agenda", "limit": 10}'
```

The `smoke` profile completes against deterministic fixture values and never
dispatches cloud compute. `lab-gcp-gpu` dispatches the five pinned MLIP runner
jobs with L4 GPU shape. `lab-gcp-cpu` is explicit fallback only; failed GPU
quota or missing dispatch config fails preflight visibly instead of silently
downgrading.

The workflow system also exposes housekeeping primitives so the operator and
the agents see the same operating picture:

```bash
curl "$WORKER_URL/research/workflows/mlip-5x5x3"

curl "$WORKER_URL/research/workflows/mlip-5x5x3/campaigns/mlip-5x5x3-YYYYMMDDHHMMSS/ops"

curl -X POST "$WORKER_URL/research/workflows/mlip-5x5x3/campaigns/mlip-5x5x3-YYYYMMDDHHMMSS/maintain" \
  -H "content-type: application/json" \
  -d '{"mode": "agenda", "limit": 5}'
```

`/ops` returns the git files, Cloudflare routes/bindings, Phoenix evaluators,
campaign counters, and next executable actions. `/maintain` turns those
actions into durable `intelligence_tasks`, so the control plane can continue
the fight without waiting for a human to read the dashboard first.

## Development

```bash
cd glim-think
npm install
npx wrangler dev
```

Fast verification is intentionally split from the broad TypeScript graph:

```bash
npm run lint          # fast core graph + server syntax check
npm run lint:app      # broader app graph, slower diagnostic tier
npm run lint:profile  # writes target/lint-profile.json with timing evidence
npm test
```

## Deploy

```bash
npx wrangler deploy
```

## How it connects to the rest of the repo

- `gcp/mlip-cell-runner/` and `gcp/tasks-consumer/` execute cells dispatched by
  `glim-think` workflows.
- `atlas-distill/` supplies the Rust policy engine; `glim-think` can dispatch
  `atlas-distill model-geometry` and `distill-policy` tasks.
- `python/lupine_distill/` provides benchmark schemas, uplift, and regime gates
  consumed by campaign evaluators.
- `lean-spec/` holds the theorems referenced by promotion gates and hypotheses.
- `tools/glim.py` is the local CLI for the Worker API surface.
- The system map is in [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Windows notes

- Do **not** use PowerShell for `pnpm`, `tsc`, `vitest`, or `wrangler`. Use Git
  Bash or the root `justfile` wrappers.
- The root `justfile` explicitly routes Node tasks through
  `C:\Program Files\Git\bin\bash.exe` to prevent zombie processes.

## Next Steps

1. **WASM bridge**: Compile `atlas-distill` core (SVD, manifold, causal) to
   WASM and load it into Tier-1 Dynamic Workers for zero-latency analysis.
2. **Self-authored extensions**: Let the TheoristFacet write new analysis
   tools at runtime and register them via `ExtensionManager`.
3. **Browser Run integration**: Scrape live NIST/OpenKIM data to keep the
   potential catalog current without manual ingestion.
4. **Model-provider wake-up**: Configure AI Gateway with dormant OpenAI,
   Anthropic, Google, and local endpoints; route by cost/quality targets.
