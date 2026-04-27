# glim-think routes

Generated from `/openapi.json` (run `node scripts/gen_routes_md.mjs` to regenerate).

The single source of truth lives at `src/openapi.ts` and is served live at
[`/openapi.json`](https://glim-think-v1.aw-ab5.workers.dev/openapi.json).

## Status legend

- **deployed** — currently live on `glim-think-v1.aw-ab5.workers.dev`
- **planned-unit-N** — owned by an in-flight sibling PR; route returns 404 until that PR merges

## Endpoints

| Method | Path | Tag | Status | Summary |
|---|---|---|---|---|
| GET | `/health` | health | deployed | Liveness check + active hypothesis list |
| POST | `/run` | analysis | deployed | Synchronous manifold + causal analysis with auto-diary |
| POST | `/fleet/run` | fleet | deployed | Trigger parallel manifold analysis across multiple elements |
| GET | `/fleet/status` | fleet | deployed | Fleet execution progress |
| POST | `/fleet/schedule` | fleet | deployed | Configure recurring fleet runs |
| GET | `/dashboard` | health | deployed | HTML dashboard (delegates to DashboardAgent DO) |
| GET | `/experiments/pending` | experiments | deployed | Pending LAMMPS experiments awaiting local execution |
| POST | `/experiments/complete` | experiments | deployed | Mark a pending experiment as completed |
| POST | `/ingest/batch` | ingest | deployed | Bulk insert benchmark records into the D1 ledger |
| POST | `/diary/draft` | diary | deployed | On-demand LLM diary narrative for an element/potential pair |
| POST | `/ext/register` | extensions | deployed | Register a runtime extension (custom agent tool) |
| GET | `/ext/list` | extensions | deployed | List installed extensions |
| POST | `/ext/run` | extensions | deployed | Invoke a registered extension |
| POST | `/ops/report` | ops | deployed | GitHub Actions deployment telemetry |
| OPTIONS | `/ops/report` | ops | deployed | CORS preflight |
| GET | `/ops/deployments` | ops | deployed | Recent deployment history (filterable by service) |
| OPTIONS | `/ops/deployments` | ops | deployed | CORS preflight |
| GET | `/research/causal-geometry` | research | deployed | Snapshot of the active research agenda + ledger stats |
| GET | `/feed` | feed | deployed | Real-time swarm activity stream |
| OPTIONS | `/feed` | feed | deployed | CORS preflight |
| GET | `/openapi.json` | spec | deployed | This OpenAPI spec |
| POST | `/agents/{class}/{name}` | analysis | deployed | Think agent chat (auto-routed via @cloudflare/think) |
| GET | `/hypotheses` | hypotheses | planned-unit-1 | List hypotheses |
| POST | `/hypotheses` | hypotheses | planned-unit-1 | Create a hypothesis |
| GET | `/hypotheses/{id}` | hypotheses | planned-unit-1 | Single hypothesis |
| PATCH | `/hypotheses/{id}` | hypotheses | planned-unit-1 | Update status/confidence |
| POST | `/critiques` | critiques | planned-unit-2 | Queue a critique for asynchronous response |
| GET | `/critiques` | critiques | planned-unit-2 | List critiques (filter by status/source) |
| GET | `/critiques/pending` | critiques | planned-unit-2 | Pending critiques only |
| POST | `/critiques/{id}/respond` | critiques | planned-unit-2 | Submit response markdown for a critique (writes R2 artifact + marks complete) |
| POST | `/research/questions` | research-questions | planned-unit-3 | Ask a lab-notebook question |
| GET | `/research/questions` | research-questions | planned-unit-3 | List questions |
| POST | `/literature/search` | literature | planned-unit-4 | Search arXiv + Semantic Scholar + OpenAlex |
| GET | `/literature/papers/{doi}` | literature | planned-unit-4 | Single paper from cache |

## Tags

- **health** — Liveness + research-mode metadata
- **analysis** — Manifold + causal analysis triggers
- **fleet** — Multi-element parallel orchestration
- **experiments** — Pending-experiment queue (LAMMPS handoff)
- **ingest** — Bulk record ingestion
- **diary** — LLM narrative generation
- **extensions** — Runtime tool registration
- **ops** — Deployment observability
- **research** — Live research-state snapshot
- **feed** — Real-time swarm activity stream
- **spec** — Self-describing API spec
- **hypotheses** — Persisted hypothesis tracker (planned, unit 1)
- **critiques** — Peer-review critique queue (planned, unit 2)
- **research-questions** — Lab-notebook Q/A queue (planned, unit 3)
- **literature** — External paper search & cache (planned, unit 4)

## Bindings (from `wrangler.toml`)

| Binding | Type | Purpose |
|---|---|---|
| `ORCHESTRATOR` | DO | Swarm coordinator (Think) |
| `MANIFOLD_AGENT` | DO | Error-manifold geometry (Think) |
| `CAUSAL_AGENT` | DO | Simpson's-paradox screening (Think) |
| `THEORIST_AGENT` | DO | Hypothesis generation (Think) |
| `EXPERIMENT_AGENT` | DO | LAMMPS experiment design (Think) |
| `FLEET_ORCHESTRATOR` | DO | Parallel multi-element runner |
| `DASHBOARD` | DO | Real-time WebSocket dashboard |
| `EXTENSION_MANAGER` | DO | Runtime tool registration |
| `AI` | Workers AI | Multi-provider model fallback (Llama 4 Scout, Kimi K2.5) |
| `ARTIFACTS` | R2 | `glim-artifacts` bucket — diary entries, search caches, snapshots |
| `CONFIG` | KV | Usage tracking, extension configs |
| `LEDGER` | D1 | `glim-ledger` — records, claims, theories, deployments |
