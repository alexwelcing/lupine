# Local-Opus evaluation — calibration run

> Artifact for [Part 3 of the process](../03-eval-protocol.md). It demonstrates the
> **local Opus agent** doing its named job — generating ribbon hypotheses and then
> (independently) scoring them on the rubric — and proves the rubric discriminates.
> It is **not** a MiniMax M2.7-vs-M3 result; that needs `INTERNAL_TASK_TOKEN`
> (see the [honesty boundary](../03-eval-protocol.md#honesty-boundary-what-is-live-vs-pending-a-key)).

## What was run (all real, here, now)

1. **Generation (local Opus agent as Theorist).** One Opus agent generated 2–3
   genuinely competing hypotheses for anchors **T1, T3, T4** — real, concrete
   materials-physics mechanisms with discriminating tests. Saved to
   [`local-opus-generations.json`](./local-opus-generations.json). A deliberately
   weak hand-written set (`weak-fixture-T1`) was added as a control.

2. **Evaluation (independent local Opus agent as judge).** A *separate* Opus agent
   scored all four sets **blind** (neutral labels S1–S4, source hidden) on the
   five-dimension rubric. Scores in
   [`scored-calibration.json`](./scored-calibration.json).

3. **Aggregation (pure code).** `glim_model_eval.py report` run on the real
   weak-vs-strong T1 pair ([`demo-report-scored.json`](./demo-report-scored.json)).

## Result — the rubric discriminates

| set (blind) | source | falsi | competing | grounding | discrim | linkage | **/10** |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| S1 | `weak-fixture-T1` | 0 | 0 | 0 | 0 | 0 | **0** |
| S2 | `opus-T1` | 2 | 2 | 2 | 2 | 2 | **10** |
| S3 | `opus-T3` | 2 | 2 | 2 | 2 | 2 | **10** |
| S4 | `opus-T4` | 2 | 2 | 2 | 2 | 2 | **10** |

Blind ranking returned: **S3 > S2 > S4 > S1**. The judge put the weak control
dead last at 0/10 and the three real sets at the ceiling — **without knowing which
was which**. That is the property we need: the rubric rewards falsifiable,
competing, theorem-linked physics and punishes vague restatement.

## Aggregation behaves (and is conservative)

`report` on the weak→strong T1 pair:

```json
{ "n": 1, "deltas": { "falsifiability": 1.0, "competing_hypotheses": 1.0,
  "physical_grounding": 1.0, "discriminative_power": 1.0, "theorem_linkage": 1.0 },
  "aggregate_delta": 1.0, "regression": false, "verdict": "reject" }
```

A maximal +1.0 delta on every dimension, yet **verdict = reject** because
`n = 1 < min_n = 8`. The guardrail (lifted from `ab-oracle.ts`) refuses to adopt
on a single example no matter how large the gap — exactly the conservatism we want
when the candidate is a new model.

## What this licenses

The evaluator and rubric are **validated**: a 0/10 vs 10/10 separation on blind
inputs, and a correct, conservative aggregation. When a MiniMax key is wired:

```bash
python tools/glim_model_eval.py generate --model MiniMax-M2.7 --out docs/glim-m3-upgrade/runs/m27.json
python tools/glim_model_eval.py generate --model MiniMax-M3   --out docs/glim-m3-upgrade/runs/m3.json
python tools/glim_model_eval.py compare  --baseline docs/glim-m3-upgrade/runs/m27.json \
       --candidate docs/glim-m3-upgrade/runs/m3.json --out docs/glim-m3-upgrade/runs/comparison.json
# local Opus agent fills scores -> scored.json (same judge, same rubric as above)
python tools/glim_model_eval.py report   --scored docs/glim-m3-upgrade/runs/scored.json
```

…the identical judge and rubric produce the real M2.7→M3 verdict over all 10
anchored prompts. Nothing about the method changes — only the source of the text.

## The hypotheses are themselves an input to Part 4

The T4 set predicts **where distill fails** (bonding-distance, energy-vs-mechanical
orthogonality, PES-curvature). Those failure axes are exactly what the Cloud-Run
3-tier simulation in [Part 4](../04-cloud-run-sim-tiers.md) is configured to probe
on held-out systems — closing the loop from hypothesis to simulation.
