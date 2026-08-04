# Cloud-Run Simulation Tiers — affordable, accurate, cellValue-scored

> Part 4 of the [glim-think M3 upgrade process](./README.md). Configures the
> Cloud-Run tests so the three model regimes — **baseline**, **distilled-accuracy**,
> **distilled-accuracy+speed** — run cheaply, measure honestly, and score against
> the Lean `cellValue` bridge. This is where the ribbon hypotheses from
> [Part 3](./runs/local-opus-calibration.md) get tested on held-out evidence.

## The three tiers already exist — this wires them into one cost-bounded matrix

The `mlip-cell-runner` already supports exactly the three regimes the goal names:

| Tier | runner flags | meaning |
|---|---|---|
| **baseline** | `--variant-id baseline --distill-profile off` | raw MLIP, no correction |
| **distilled accuracy only** | `--variant-id distill_accuracy --distill-profile accuracy` | ribbon-aware accuracy correction |
| **distilled accuracy + speed** | `--variant-id distill_accuracy_accelerate --distill-profile accuracy_accelerate` | accuracy + universality refusal speedup |

So Part 4 is **orchestration + cost discipline + scoring**, not new infrastructure:

- **Policy:** [`gcp/mlip-cell-runner/policies/model-sim-matrix.yml`](../../gcp/mlip-cell-runner/policies/model-sim-matrix.yml)
- **Driver:** [`tools/mlip_sim_matrix.py`](../../tools/mlip_sim_matrix.py) (`plan` + `score`)

Every resource this touches — the six `mlip-cell-*` jobs (nvidia-l4), the
`tasks-consumer` service, the `atlas-distill-jobs` queue, and both GCS manifests —
was **verified live in `shed-489901` on 2026-06-02**:
[runs/gcp-verification.md](./runs/gcp-verification.md). The plan is executable as-is.

## Affordable by construction

| lever | how |
|---|---|
| small canary | 2 backends × 3 systems × cheap rows (energy_volume, forces) — `elastic_constants` (39 cases) excluded from the canary |
| hard cap | `--max-cells` aborts before launch; the planner prints a `$`/GPU-min estimate |
| scale-to-zero | L4 Cloud-Run Jobs, no idle cost |
| shared checkpoints | the three tiers reuse one raw-prediction checkpoint per `(system,row,mlip)` — distill tiers don't re-run MLIP inference |

The 12-cell canary plans at **~$0.13** (`3 tiers × 2 mlips × 2 systems × 1 row`, 60 s/cell).

## Accurate by construction

The accuracy guard is the **shared raw-prediction checkpoint**: because every tier
in a `(system,row,mlip)` group is scored on the *same* MLIP predictions, the
baseline→distill delta is the **ribbon policy's effect alone**, not backend
nondeterminism (mirrors `distill-validation.yml`'s `share_raw_predictions: true`).
`require_material_root_overlap: true` blocks support-set leakage.

## Scored by `cellValue` (the Lean bridge)

`tools/mlip_sim_matrix.py score` computes, faithful to
[UniversalityBridge.lean](../../lean-spec/OpenDistillationFactory/Materials/Theory/UniversalityBridge.lean)
and [AccuracyCommitment.lean](../../lean-spec/OpenDistillationFactory/Materials/Theory/AccuracyCommitment.lean):

```
accuracyGain = baselineErr − tierErr                  (native units; AccuracyCommitment)
speedup      = tier_structures_per_sec / baseline_…   (≥ 1 desired; speedup_ge_one)
cellValue    = speedup × (1 + accuracyGain)           (== 1 at baseline; cellValue_baseline)
meetsCommitment = tierErr ≤ baselineErr
```

### Demonstrated on REAL runner output

Scoring the two committed MACE-energy cloud artifacts
(`library-site/src/reports/assets/mlip/mace-energy-cloud-featurefix-{baseline,distill}-cell-result.json`)
→ [`runs/sim-matrix-mace-energy.json`](./runs/sim-matrix-mace-energy.json):

| tier | err (eV/atom) | gain | gain% | speedup | **cellValue** | ok |
|---|--:|--:|--:|--:|--:|:--:|
| baseline | 0.4116 | 0.0 | 0.0 | 1.00 | **1.000** | – |
| distill_accuracy | 0.2038 | 0.2078 | 50.5% | 1.025 | **1.238** | yes |

This is a real measurement, not a fixture — and the recovered `gain 0.2078` /
`distillErr 0.2038` exactly match the constants hard-coded in
`AccuracyCommitment.lean` (`maceEnergyBaseline 0.4116`, `maceEnergyDistill 0.2038`).
The driver reproduces the Lean numbers from the raw artifact, so the scoring path
is verified end-to-end.

## Running it

```bash
# PLAN — see the matrix, cost, and exact commands (no execution)
# NOTE: --mlips takes backend_catalog ids (mace-mp-0, chgnet, sevennet, orb-v3,
# m3gnet, uma-s-1p1), NOT job names — mace-mp-0 maps to job mlip-cell-mace.
python tools/mlip_sim_matrix.py plan --target cloud --max-cells 18 \
  --mlips mace-mp-0,sevennet --rows energy_volume,forces \
  --manifest-url gs://.../canonical-structures-v2/manifest.json \
  --support-manifest-url gs://.../canonical-distill-support-…/manifest.json

# EXECUTE — pipe the planned `gcloud run jobs execute …` lines (scale-to-zero L4)

# SCORE — once cell_result.json artifacts land
python tools/mlip_sim_matrix.py score --dir gs_or_local_results_dir/ --out runs/sim.json
```

## Why these systems — the loop closes here

The canary system set is chosen to **test the T4 failure hypotheses** the local
Opus agent generated in [Part 3](./runs/local-opus-calibration.md):

- `Cu_fcc` — in-distribution metal: distill should win (positive cellValue).
- `Si_diamond` — covalent: probes the **bonding-distance** failure hypothesis
  (T4 H1 — a metals-fit correction should degrade off-chemistry).
- `Fe_bcc` — ribbon outlier + anharmonic: probes the **PES-curvature** failure
  hypothesis (T4 H3) and the [Fe persistent-outlier conjecture](../conjectures/fe-persistent-outlier.md).

If distill's cellValue stays ≥ 1 on `Cu_fcc` but drops below 1 on `Si_diamond` /
`Fe_bcc`, that is exactly the held-out evidence needed to **bound**
`broad_commitment_is_open` (T4) — converting it from "open" to "true within a
measured validity radius." That is the payoff of the whole pipeline: a model
(M3) proposes sharper hypotheses → the sim matrix tests them affordably → the
ribbon theorem advances.
