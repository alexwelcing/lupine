# RFC alignment — Durablestreams + Flue + Hermes · Omnigents + CocoIndex

This branch (`experiment/omnigents-cocoindex`) implements the two workstreams
the RFC inspired, adapted to our actual stack. The RFC's stack hypothesis
(Durablestreams + Flue + Hermes + Omnigents over a single Nous Portal egress,
GCP satellite) is **based on our tools**, so it's good inspiration — but we do
not adopt half of it literally because much of what it proposes as new
infrastructure already exists here in a different shape. This doc records the
mapping so future work inherits the reasoning, not just the code.

## The thesis we adopted

> In a five-model pool accessed through a uniform portal, model selection
> contributes maybe 10–15% of quality variance. Coordination strategy
> contributes 30–50% on hard prompts. — RFC §1

Our existing deep tier (`glim-think/src/agents/models.ts::selectDeepRoute`)
did *single-model selection* — it picks ONE provider per request. That is the
RFC's "Specialist/Waterfall" pattern. The leverage the RFC identifies is
upstream of that: **call multiple models and reconcile**. That is the gap this
branch closes.

## Workstream 1 — Omnigents (multi-model coordination)

**New code:**
- `glim-think/src/agents/coordinator.ts` — the full strategy catalog (§7.2):
  - `race`, `fan_out_merge`, `ensemble_of_experts`, `waterfall`, `specialist`
  - `ConfidenceFilter` reuses the existing `runHeuristics` 0–1 score (free, no
    extra model call) rather than a separate Llama-3.1 classifier.
  - `MergeJudge`/critic/integrator use `pickStrongProvider` (OpenAI → MiniMax →
    GLM → workers-ai), shuffle drafts + strip model IDs to kill anchoring bias.
  - KV-backed hot-reloadable Strategy Registry (§7.4), `omnigents:strategy-registry`.
- `glim-think/src/agents/coordinatorTraces.ts` — D1 observability spine (§7.5/§9.1):
  one structured event per coordination call, `coordination_hit` flag, KPI rollup
  `getCoordinationKpis` (§7.6, target hit-rate ≥ 0.70).
- `glim-think/src/agents/models.ts` — added `generateForProvider` (single-provider
  primitive, no masking fallback so per-provider outcomes stay clean),
  `coordinatorPool`, `pickStrongProvider`, `selectDeepProviderId` (identity-only
  routing decision). Opt-in `coordination` field on `ResearchTextOpts` fans out
  via lazy import (no static cycle).
- `glim-think/src/server.ts` — 5 routes: `POST /coordinate` (token-gated),
  `GET /coordination/kpis`, `GET /coordination/traces`, `GET/PUT /coordination/strategy`.
- `glim-think/src/agents/__tests__/coordinator.test.ts` — 16 tests, all green.

**Adopted from the RFC:**
- The strategy catalog and the worked decision tree (§7.8) → `DEFAULT_REGISTRY`.
- Per-call structured trace + coordination-effectiveness KPIs (§7.5, §7.6).
- Strategy Registry as a hot-reloadable, per-tenant tunable (§7.4).
- Small-pool degradation (single provider → collapse to specialist).
- Anti-patterns (§7.7): no anchoring (drafts shuffled + IDs stripped), no
  "all 5 models for trivial prompts" (intent classification → waterfall/race).

**Deliberately NOT adopted:**
- **Durablestreams (TopicDO/CursorDO).** We already have `feed/` + Cloudflare
  Queues + a `RESEARCH_QUEUE`. Building a sharded DO-backed log would duplicate
  existing plumbing. The coordination layer is synchronous-within-a-request
  (fan out, reconcile, return), which needs no streaming bus.
- **Flue (workflow orchestrator).** We already have Cloudflare Workflows
  (`MLIP_BASELINE_GRID`) and the queue→consumer pattern. A bespoke saga library
  would add a failure domain for no gain at this layer.
- **Nous Portal as a separate proxy.** Our providers are already abstracted in
  `models.ts` (`selectDeepRoute`, `generateForProvider`). The "single egress"
  invariant is enforced by routing all calls through `generateForProvider`, not
  by standing up a new proxy service.
- **AgentDO per-session pinning / Hermes five-phase loop.** Our agents already
  extend `@cloudflare/think`, which owns the planning loop + SQLite sessions.
  Re-implementing it would fork the framework.
- **GCP BigQuery trace sink.** Our traces already land in D1 (`LEDGER`) and
  Phoenix via the OTLP relay. BigQuery is a future scale step, not a now-step.

So the RFC's *architecture* is mostly already present here; its *contribution*
is the coordination thesis, which we implemented on top of the existing bones.

## Workstream 2 — CocoIndex (evidence tier)

The RFC's §9.1 (BigQuery trace analytics) and our `AGENTS.md`'s "closed
scientific loop" both want the coordination/research output to become
queryable evidence. CocoIndex is the engine for that: it turns the D1 ledger
(`coordination_traces`, `hypotheses`, `claims`) into an incrementally-maintained,
embedding-indexed SQLite store.

**New code (`cocoindex/`):**
- `main.py` — CocoIndex v1 `App`: JSONL source → recursive-split → all-MiniLM-L6-v2
  embed → sqlite-vec target (`evidence_chunks`). Memoized `process_file`.
- `export_evidence.py` — D1 → JSONL (the wire between coordination traces and the index).
- `seed_data.py`, `test_pipeline.py`, `README.md`.

**Verified end-to-end:** `cocoindex update main.py` → 3 files, 6 rows, real
384-dim embeddings (1536 bytes/row); rerun → `3 unchanged`, 0.0s (incremental).

## How the two workstreams connect

```
glim-think (Cloudflare)                         cocoindex (local)
┌──────────────────────────────┐               ┌──────────────────────────┐
│ /coordinate (Omnigents)      │──trace──▶ D1  │ export_evidence.py       │
│  → coordinatorTraces.ts      │  (LEDGER)     │  wrangler d1 → JSONL     │
│  → D1 coordination_traces    │──────────────▶│ ./data/*.jsonl           │
└──────────────────────────────┘               │ cocoindex update main.py │
                                               │  → ./evidence.db (vec)   │
                                               └──────────────────────────┘
```

Every coordination call writes a trace to D1; the exporter drains it to JSONL;
CocoIndex embeds it. The result is a semantic index over "which coordination
strategy worked, for which kind of prompt, and why" — the offline mirror of
the online coordination-effectiveness KPIs.

## Verification

- TS: `just think-lint` green; `vitest run` = **158 passed** (126 prior + 32 new), 0 type errors.
- Python: `pytest test_pipeline.py` = **4 passed**; full engine run produces real embeddings.
- Along the way, fixed 3 latent type bugs in `models.ts` the new tests surfaced
  (missing `specificationVersion: "v3"` on the spend middleware; two
  `model_route: cfg` → `model_route: { base_url, model }` shape mismatches).

## Open next steps (not in this branch)

- Route high-stakes Orchestrator/Causal synthesis through `coordinate(...)` by
  default (currently opt-in via `ResearchTextOpts.coordination`).
- Backfill `coordination_traces` → cocoindex on a schedule (cron) so the index
  tracks the live ledger without a manual export.
- Promote BigQuery as the trace sink once D1 query volume justifies it (RFC §9.1).

## v2: GCP evidence-index service + memory flywheel

The initial cocoindex pipeline was local-only (sqlite). The "max version"
elevates it to a **running GCP Cloud Run service** with Postgres+pgvector,
and closes the loop by making the coordinator **consult the index before
choosing a strategy** — the RFC's coordination-effectiveness uplift (§7.6)
comes from *using* past results, not just measuring them.

### Architecture

```
glim-think worker (Cloudflare)              GCP satellite
┌────────────────────────────────┐         ┌────────────────────────────────────┐
│ /coordinate (Omnigents)        │         │ evidence-index (Cloud Run, FastAPI)│
│  1. consultMemory(): GET /search│───────▶│  POST /ingest  (embed + upsert)    │
│     "past prompts like this →  │         │  GET  /search   (semantic ANN)     │
│      strategy X hit 80%"       │◀──hits──│  GET  /health                      │
│  2. applyMemoryBias → pick     │         │         │                          │
│  3. run strategy               │         │         ▼                          │
│  4. emitTrace(): POST /ingest  │───────▶│  Postgres + pgvector (Cloud SQL)    │
│     (fire-and-forget, OIDC)    │         │  ivfflat ANN index, 384-dim        │
└────────────────────────────────┘         └────────────────────────────────────┘
```

### New code

- `gcp/evidence-index/` — the Cloud Run service:
  - `app.py` — FastAPI: `/ingest`, `/search` (semantic + keyword), `/health`, `/count`
  - `store.py` — storage interface: `PostgresStore` (pgvector, ivfflat) for prod,
    `SqliteStore` for dev/test. Same interface, two backends.
  - `Dockerfile` — CPU-only (MiniLM is ~5ms on CPU), pre-downloads the model
    into the image layer so cold starts don't pay the HF Hub download.
  - `cloudbuild.yaml` — deploys to Cloud Run, min-instances=1, Cloud SQL secrets.
  - `test_service.py` — unit tests against sqlite-backed store.
- `glim-think/src/agents/memoryClient.ts` — the HTTP bridge:
  - `consultMemory()` — searches the index before coordination (800ms timeout,
    degrades to no-op on any failure)
  - `emitTrace()` — POSTs the trace after coordination (fire-and-forget)
  - `applyMemoryBias()` — conservative steering: only overrides the registry pick
    on strong, well-separated signal (bias ≥ 0.7 and registry's pick ≥ 0.2 lower)
- `glim-think/src/agents/coordinator.ts` — the flywheel integration:
  - Before strategy selection: `consultMemory()` → `applyMemoryBias()` → pick
  - After coordination: `emitTrace()` to the GCP service
  - Both non-blocking: if `EVIDENCE_INDEX_URL` is unset, behavior is identical to v1

### Deploy steps (one-time)

1. Create Cloud SQL Postgres + enable pgvector (see cloudbuild.yaml header)
2. Create secrets: `evidence-db-url`, `evidence-ingest-token`
3. `just evidence-deploy` (builds + deploys to Cloud Run)
4. `just evidence-health url=https://evidence-index-...a.run.app`
5. `wrangler secret put EVIDENCE_INDEX_URL` (set to the Cloud Run URL)
6. `wrangler secret put EVIDENCE_INGEST_TOKEN` (match the secret from step 2)

### The two layers (coexisting)

| Layer | Runtime | Role |
| --- | --- | --- |
| **glim-think worker** | TypeScript / Cloudflare | Produces evidence → D1 + live POST to GCP `/ingest`. Coordinator consults `/search` (flywheel). Exposes `/evidence/recent` for non-vector live view. |
| **evidence-index service** | Python / GCP Cloud Run | Live embed + semantic ANN over Postgres+pgvector. Always warm (min-instances=1). The coordinator's memory. |
| **cocoindex/** | Python / local | Offline batch indexer for dev/CI (sqlite). Hermes skill wraps seed → index → query. Same record schema as the GCP service. |
