# Part-3 verdict — MiniMax M2.7 → M3: **ADOPT**

> The generation half that the [eval protocol](../03-eval-protocol.md) left
> pending on a MiniMax key ran for real on 2026-06-10. The deterministic
> verdict over all 10 anchored Theorist prompts is **adopt**.

## Result

```json
{ "baseline_model": "MiniMax-M2.7", "candidate_model": "MiniMax-M3",
  "n": 10,
  "deltas": { "falsifiability": 0.75, "competing_hypotheses": 0.70,
    "physical_grounding": 0.60, "discriminative_power": 0.75,
    "theorem_linkage": 0.75 },
  "aggregate_delta": 0.71, "regression": false, "verdict": "adopt" }
```

Per-pair totals (rubric sum /10):

| pair | anchor | M2.7 | M3 |
|---|---|--:|--:|
| T1:0 | hyper_ribbon_bound_3d | 0 | 8 |
| T2:1 | empirical_hyper_ribbon_holds | 0 | 9 |
| T3:2 | eamFccElasticConjecture | 0 | 9 |
| T4:3 | broad_commitment_is_open | 4 | 0 |
| T5:4 | hyper_ribbon_survives_context_correction | 0 | 10 |
| T2:5 | empirical_hyper_ribbon_holds | 0 | 10 |
| T1:6 | hyper_ribbon_bound_3d | 4 | 10 |
| T1:7 | hyper_ribbon_bound_3d | 6 | 10 |
| B:8 | cellValue | 0 | 10 |
| T3:9 | eamFccElasticConjecture | 0 | 9 |

## How it was run

- **Generation**: GitHub Actions (`glim-m3-ab-generate.yml`, run 27283587717)
  drove the live worker's model axis (`/ops/experiment-generate`,
  `body.model`) over the committed `glim-ribbon-theorems` dataset — only the
  model id differed between runs. Both models went through the Anthropic
  Messages harness (`api.minimax.io/anthropic/v1`).
- **Scoring**: the local Claude judge (the protocol's "local Opus agent"
  role) scored the pairs from a procedurally anonymized file
  (deterministic per-example A/B shuffle; mapping joined only after scores
  were written). Same rubric as the
  [calibration run](./local-opus-calibration.md). Raw artifacts:
  [`m27.json`](./m27.json), [`m3.json`](./m3.json),
  [`scored.json`](./scored.json), [`report.json`](./report.json).
- **Aggregation**: `tools/glim_model_eval.py report` (pure code, thresholds
  ε=0.03 / min_n=8 / regression=0.05).

## Honesty notes — read before citing the +0.71

1. **Half of M2.7's responses were empty** (5/10 empty, one more a bare
   title, one a leaked planning monologue that never produced the answer).
   Mechanism, observed directly: M2.7 through the Anthropic endpoint spends
   the output budget inside its `thinking` block and stops at `max_tokens`
   before emitting text. So the comparison measures **models-in-the-deployed-
   harness**, not platonic model quality. That is the right object for an
   adoption decision — the harness is what runs in production — but a
   harness change (bigger budget, thinking disabled for M2.7) could narrow
   the gap. Nobody should quote "+0.71" as a context-free capability claim.
2. **Blinding was partial.** The judge knew from run metadata that M2.7
   produced most of the empty responses, so the empty-vs-full pairs were
   effectively unblinded; the genuinely blind judgments were the three
   pairs where both sides produced text (T4:3, T1:6, T1:7 — split 1–2 for
   M3 by content quality, not emptiness).
3. **Where M3 actually wins on content** (the both-text pairs): complete
   delivery vs truncation (T1:7), a structured answer vs leaked
   chain-of-thought (T1:6), and on the strongest M3 answers (T5:4, B:8) it
   reads the Lean anchor correctly — e.g. restating `cellValue` from
   `UniversalityBridge.lean` and reframing the formally-trivial question as
   a feasibility-region test. M3's one loss (T4:3) was an empty response
   against a mediocre M2.7 enumeration.
4. M3 is not fabrication-free: one answer asserted an unrun empirical
   verification ("verified empirically for 559 potentials"), which capped
   its `physical_grounding` at 0 per the rubric. The hallucination judge
   should stay on.

## State changes

- Prod was already cut to `MINIMAX_MODEL=MiniMax-M3` on 2026-06-03; this
  verdict supplies the evidence the cut-over was gated on.
- The deep tier's prod `MINIMAX_API_KEY` was rotated 2026-06-10 (old key
  dead) and verified live via `/ops/llm-selftest` (241 tokens, M3,
  spend recorded).
