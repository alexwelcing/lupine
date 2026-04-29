# glim-think

Project Think integration for Lupine's autoresearch loop. Moves the
`atlas-distill` Rust engine from an ephemeral CLI into durable,
serverless, multi-agent infrastructure running on Cloudflare.

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

## Development

```bash
cd glim-think
npm install
npx wrangler dev
```

## Deploy

```bash
npx wrangler deploy
```

## Next Steps

1. **WASM bridge**: Compile `atlas-distill` core (SVD, manifold, causal) to
   WASM and load it into Tier-1 Dynamic Workers for zero-latency analysis.
2. **Self-authored extensions**: Let the TheoristFacet write new analysis
   tools at runtime and register them via `ExtensionManager`.
3. **Browser Run integration**: Scrape live NIST/OpenKIM data to keep the
   potential catalog current without manual ingestion.
4. **Model-provider wake-up**: Configure AI Gateway with dormant OpenAI,
   Anthropic, Google, and local endpoints; route by cost/quality targets.
