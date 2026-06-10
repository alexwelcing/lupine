# glim-think hypothesis model upgrade — MiniMax M2.7 → M3

The deep-tier model behind **Theorist** hypothesis generation in the
`glim-think` Cloudflare Worker is upgraded from **MiniMax-M2.7** to
**MiniMax-M3** (released 2026-06-01; same OpenAI-compatible `api.minimax.io/v1`
route, 1M context, ~1/20 cost at long context). The upgrade is gated behind a
measurable A/B so M3 is **adopted on evidence, not reputation**, and the work is
wired through to the hyper-ribbon theorems and the Cloud-Run simulation tiers.

This folder is the documented process (the explicit deliverable of goal step 3).

| # | Part | What it pins |
|---|---|---|
| 1 | [Target Lean theorems](./01-target-theorems.md) | the **specific** ribbon theorem set T1–T5 + the `cellValue` bridge |
| 2 | [Research strategy](./02-research-strategy.md) | per-theorem literature query bundles via Literaturist |
| 3 | [Eval protocol](./03-eval-protocol.md) | M2.7→M3 generate → **local-Opus** score → verdict |
| — | [Local-Opus calibration run](./runs/local-opus-calibration.md) | real Opus generation + blind evaluation, rubric validated |
| 4 | [Cloud-Run sim tiers](./04-cloud-run-sim-tiers.md) | baseline / distill-accuracy / distill-accuracy+speed, cellValue-scored |
| — | [GCP verification](./runs/gcp-verification.md) | every Cloud-Run resource confirmed live in `shed-489901` |
| — | [**Live campaign results**](./runs/live-campaign-results.md) | 21 real L4 cells — distill is energy-only + policy-gated; a T4 hypothesis **confirmed** |

## The model axis (the core code change)

The comparison is only meaningful if M2.7 and M3 can be driven through the *same*
pipeline with *only* the model id changing. That axis didn't exist — provider was
pinnable, the specific MiniMax model was not. Added:

- `selectDeepRoute(env, { modelOverride })` and `generateResearchText({ modelOverride })`
  thread a per-call MiniMax id through to `miniMaxModel(env, id)`
  ([models.ts](../../glim-think/src/agents/models.ts)).
- `/ops/experiment-generate` accepts `body.model`
  ([server.ts](../../glim-think/src/server.ts)).
- `ab-oracle.ts --axis model` ([ab-oracle.ts](../../glim-think/evals/ab-oracle.ts)).
- Default flips to `MiniMax-M3`; `MINIMAX_BASELINE_MODEL = "MiniMax-M2.7"` is kept
  as the canonical A/B baseline id.

So the whole comparison is one command:

```bash
npx tsx evals/ab-oracle.ts --agent Theorist --axis model \
  --baseline MiniMax-M2.7 --candidate MiniMax-M3 \
  --dataset glim-ribbon-theorems --limit 10 --json
```

…or the local-Opus-judged equivalent in [Part 3](./03-eval-protocol.md).

## Upgrade / deploy / rollback

```bash
# 0. Verify M3 is live on this account's key
curl -s "$GLIM_API_URL/admin/minimax-models" | jq '.models[].id'    # expect "MiniMax-M3"

# 1. Capture the M2.7 baseline + M3 candidate and the verdict (Part 3) BEFORE trusting M3.
#    Adopt only if report/oracle says "adopt".

# 2. Deploy (default is now M3):           npm --prefix glim-think run deploy
#    Pin explicitly instead of code-default: wrangler secret put MINIMAX_MODEL   # MiniMax-M3
# 3. Rollback (no redeploy needed):         wrangler secret put MINIMAX_MODEL    # MiniMax-M2.7
```

Because the model is env-overridable, rollback is a secret change, not a code
revert. The budget guard and Workers-AI fallback are unchanged.

## What is live-verified here vs. key-gated

This checkout has **no MiniMax key** (`.dev.vars` absent). Honest status:

| Deliverable | Status |
|---|---|
| Model axis (models.ts / server.ts / ab-oracle.ts) | ✅ typechecked — **0 new type errors** vs committed original; tests green (6/6) |
| Ribbon-theorem dataset + `glim_model_eval.py` | ✅ compiles; offline scaffold + compare exercised |
| Local-Opus evaluator + rubric | ✅ **run for real** — blind 0/10 vs 10/10 discrimination; conservative aggregation verified |
| Sim-matrix driver + policy | ✅ compiles; **scored real artifacts** (cellValue 1.238, reproduces Lean constants); plan cost-guard verified |
| M2.7-vs-M3 generation numbers | ⏳ requires `INTERNAL_TASK_TOKEN` + live key — one command (Part 3), method unchanged |

No M2.7/M3 quality numbers are fabricated. Everything that could be run without a
secret was run; the live half is a single documented command away.

## The loop, end to end

```
target theorems (1) ─▶ research bundles (2) ─▶ Theorist@{M2.7,M3} ─▶ local-Opus judge (3)
        ▲                                                                        │
        └──────────────── cellValue verdict ◀── Cloud-Run sim tiers (4) ◀────────┘
```

A better model (M3) proposes sharper, theorem-linked hypotheses → the local Opus
judge measures the lift → the sim tiers test the sharpest (e.g. "where does
distill fail?") on held-out systems → the ribbon theorems (T2/T3/T4) advance. The
model upgrade is in service of moving the formal frontier, which is the point.
