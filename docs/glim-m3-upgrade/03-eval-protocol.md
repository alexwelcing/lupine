# Evaluation Protocol — M2.7 baseline, M3 candidate, local-Opus judge

> Part 3 of the [glim-think M3 upgrade process](./README.md). The held-fixed
> research from [Part 2](./02-research-strategy.md) is run through the Theorist
> under **MiniMax-M2.7** then **MiniMax-M3**; a **local Opus agent** scores both
> on a ribbon-specific rubric; a deterministic step emits the adopt/reject
> verdict. Only the model id changes between the two runs.

## Pipeline

```
 glim-ribbon-theorems.json   (fixed input — the 10 anchored Theorist prompts)
            │
            ▼  POST /ops/experiment-generate { agentClass:"Theorist", model:<id> }
   ┌────────────────────┐        ┌────────────────────┐
   │ generate M2.7      │        │ generate M3        │     ← worker, model axis
   │  runs/m27.json     │        │  runs/m3.json      │
   └─────────┬──────────┘        └─────────┬──────────┘
             └───────────┬─────────────────┘
                         ▼  glim_model_eval.py compare
                 runs/comparison.json      (paired, rubric scaffold, scores=null)
                         ▼  LOCAL OPUS AGENT fills scores (its named job)
                 runs/scored.json
                         ▼  glim_model_eval.py report  (pure code, mirrors ab-oracle)
                 { deltas per dimension, aggregate, regression, verdict }
```

Two interchangeable drivers produce the same comparison:

- **`tools/glim_model_eval.py`** (stdlib, local-Opus-in-the-loop) — used here so
  the *Opus* agent is the judge, per the goal.
- **`evals/ab-oracle.ts --axis model`** (the worker's own self-improving oracle,
  gpt-4o-mini judges) — the automated counterpart, now model-aware:

  ```bash
  npx tsx evals/ab-oracle.ts --agent Theorist --axis model \
    --baseline MiniMax-M2.7 --candidate MiniMax-M3 \
    --dataset glim-ribbon-theorems --limit 10 --json
  ```

  Both consume `/ops/experiment-generate`'s new `model` field
  ([models.ts `selectDeepRoute({modelOverride})`](../../glim-think/src/agents/models.ts),
  [server.ts handler](../../glim-think/src/server.ts)). The Opus run is the
  human-grade judge; the oracle run is the cheap, repeatable gate.

## The rubric (local Opus agent)

Each Theorist response is a set of 2–3 competing hypotheses. Score **0–2** per
dimension, for **both** models, blind to which model produced which text:

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| `falsifiability` | no test | vague test | concrete discriminating test per hypothesis |
| `competing_hypotheses` | one idea restated | overlap | genuinely different predictions |
| `physical_grounding` | wrong/invented physics or fabricated numbers | generic but correct | specific, correct, consistent with grounding set |
| `discriminative_property` | none | named but non-separating | a property that actually separates the hypotheses |
| `theorem_linkage` | no anchor | mentions ribbon loosely | names T1–T5/B and a state-moving step |

Scoring rules: **do not reward verbosity or hedging**; reward falsifiable,
competing, theorem-linked hypotheses. A fabricated citation or invented numeric
constant caps `physical_grounding` at 0 (mirrors the worker's `hallucination`
judge in [run-evals.ts](../../glim-think/evals/run-evals.ts)). `report` normalises
each dimension to 0–1 (÷2) so the deltas live on the same scale as the existing
combo/Phase-2 evaluators.

### Verdict semantics (deterministic, mirrors ab-oracle)

`report` computes per-dimension mean delta `candidate − baseline`, the aggregate,
and:

```
adopt  iff aggregate ≥ AB_EPSILON(0.03) AND no dimension regresses > AB_REGRESSION(0.05)
        AND scored_pairs ≥ AB_MIN_N(8)
reject otherwise
```

So M3 is adopted only if it is **measurably better and nowhere materially worse**
across the anchored hypotheses — never on reputation.

## Running it

```bash
# 0. one-time: confirm M3 is live on this key (else the model axis 404s/falls back)
curl -s "$GLIM_API_URL/admin/minimax-models" | jq '.models[].id'   # must list MiniMax-M3

# 1. generate both (needs INTERNAL_TASK_TOKEN)
export INTERNAL_TASK_TOKEN=...   GLIM_API_URL=https://glim-think-v1.aw-ab5.workers.dev
python tools/glim_model_eval.py generate --model MiniMax-M2.7 --out docs/glim-m3-upgrade/runs/m27.json
python tools/glim_model_eval.py generate --model MiniMax-M3   --out docs/glim-m3-upgrade/runs/m3.json

# 2. pair → 3. local Opus agent scores → 4. report
python tools/glim_model_eval.py compare --baseline docs/glim-m3-upgrade/runs/m27.json \
    --candidate docs/glim-m3-upgrade/runs/m3.json --out docs/glim-m3-upgrade/runs/comparison.json
#    (local Opus agent reads comparison.json, fills scores, writes scored.json)
python tools/glim_model_eval.py report --scored docs/glim-m3-upgrade/runs/scored.json
```

## Honesty boundary (what is live vs. pending a key)

This repository checkout has **no MiniMax key** (`.dev.vars` absent), so the
*generation* half (steps 1) cannot run here and **no M2.7-vs-M3 numbers are
fabricated**. What is real and verified in this change:

- the **model axis** that makes the comparison a one-command swap (typechecked;
  proven to add zero new type errors; existing tests green);
- the **fixed dataset** and the **runner** (compiles; offline scaffold + compare
  exercised end-to-end);
- the **local-Opus evaluator**, demonstrated for real on *delivered* ribbon
  hypotheses in [`runs/local-opus-calibration.md`](./runs/local-opus-calibration.md)
  — this calibrates the rubric (shows a strong vs. weak hypothesis profile) so
  that when the M2.7/M3 generations land, the scoring is already grounded.

When the key is present, steps 1–4 above produce `runs/scored.json` +
`runs/report.json` and the verdict is real. Nothing else changes.
