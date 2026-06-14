# Local GPU loop: TorchSim → distill → uplift → formal gate (Ni FCC)

**Date:** 2026-05-29 · **Hardware:** NVIDIA RTX A4500 (20 GB) · **Stack:** torch 2.6.0+cu124,
torch_sim 0.6.0 (eager), MACE-MP-0 medium (cached) · **Runner:**
`python/scripts/run_ni_gpu_loop.py`

First end-to-end run of the full closed compute loop **on real GPU hardware** in this repo:
a real MLIP benchmark via TorchSim, a support-fitted distillation correction, the
`distill_v_uplift` composite, and the ATLAS formal promotion gate — grounded in
machine-checked Lean theorems. No mocks, no network (cached weights + sealed fixtures).

## Why

Everything before this was scaffolding: Track B's `TorchSimBenchmarkBackend` was a stub,
the formal gate had never seen a real benchmark, and the "~75% Ni zero-point ribbon lift"
in `docs/mlip-ni-zero-point-policy-replay.md` was a cloud result we'd never reproduced
locally. This run makes the loop concrete and proves the formal layer gates real compute.

## What ran

- **Benchmark:** MACE-MP-0 single-point energy/force/stress on the sealed
  `data/mlip_benchmarks/fixtures/ni_fcc_eam_home_turf_v1.json` (31 eval structures, 4-atom
  FCC Ni cells; reference = NIST Mishin-1999 EAM + literature Cij). **31 eval + 47 support
  structures evaluated in 5.56 s.**
- **Distill (zero-point correction):** the residual `reference − prediction` is fit on the
  *non-overlapping* `gcp/mlip-cell-runner/fixtures/ni_fcc_eam_distill_support_v1.json`
  support set. MACE-MP-0 sits **+1.279 eV/atom** off the EAM energy reference (a constant
  zero-point offset); the correction removes it (support self-lift **99.7%**).
- **Uplift + gate:** `lupine_distill.uplift.distill_v_uplift` → `lupine_distill.odf.promotion_gate`.

## Results — MAE vs Ni Mishin-1999 EAM reference (lower is better)

| benchmark.metric | v0 baseline | v1 distilled | uplift |
|---|---|---|---|
| `static_energy.energy` | 1.2803 | **0.0037** eV/atom | **99.71%** |
| `static_energy.forces` | 0.0622 | 0.0622 eV/Å | 0% (no force correction) |
| `static_energy.stress` | 0.8611 | 0.2737 GPa | 68.21% |
| `elastic_constants.stress` | 1.1954 | 0.0772 GPa | 93.54% |
| **overall `distill_v_uplift`** | | | **76.04%** |

The **76% overall uplift independently reproduces** the cloud "material-family zero-point
ribbon" result (~75% lift, 0 regressions). The 0.0037 eV/atom residual energy MAE means MACE
reproduces the EAM energy–volume *shape* almost exactly once the constant reference offset is
removed — within-material the correction transfers (the documented material-family success).

## Real elastic constants (computed on GPU)

Fit of cubic C11/C12/C44 by least-squares of the stress response to the 13 strained eval
structures (zero-strain residual subtracted). **Calibration:** refitting the EAM reference
stresses recovered the literature Cij exactly (246.5 / 147.3 / 124.7), validating the Voigt
convention and the fit — so the MACE numbers are trustworthy.

| constant | MACE-MP-0 | reference (lit) | Δ |
|---|---|---|---|
| C11 | **262.9** | 246.5 | +6.7% |
| C12 | **166.6** | 147.3 | +13.1% |
| C44 | **92.4** | 124.7 | **−25.9%** |

**Finding:** MACE-MP-0 overstiffens the normal elastic constants and substantially undershoots
the shear constant **C44** on Ni — consistent with known foundation-MLIP shear weakness, now
measured locally. This is a curvature-adjacent signal worth tracking against the hyper-ribbon
program (elastic constants are the program's core observables).

## The formal gate gates real compute

The same measured 76% uplift, evaluated three ways through `python/lupine_distill/odf/promotion_gate.py`:

| scenario | uplift | formal certification | decision |
|---|---|---|---|
| in-support, certified | 76% | `formal_properties` present | **PROMOTE** |
| out-of-support, uncertified (T3 regime) | 76% | `formal_properties` empty | **REVIEW** |
| marginal + uncertified | 0% | `formal_properties` empty | **REJECT** |

Grounding theorems (lean-spec, 0 `sorry`, `lake build` green):
- `OpenDistillationFactory.Materials.Theory.ContextSpecificProof.context_correction_does_not_transfer`
  (T3 — a context-specific correction has **negative** operative value out of scope)
- `OpenDistillationFactory.Materials.Theory.AccuracyCommitment.accuracyGain_is_operative_value`
  (accuracy-over-baseline **is** the operative value, in scope)

**The point:** a 76% measured win auto-promotes *only* with the in-support formal
certification. Applied out-of-scope — the regime where T3 *proves* the correction does not
transfer — the identical win is held for human review. The formal layer is load-bearing, not
decorative: it requires proof-of-scope before auto-promotion.

## Cross-material negative transfer — the gate's full range (real T3 REJECT)

`scripts/run_cross_material_transfer.py` makes the gate's teeth undeniable. The zero-point
correction is fit on **Pt** (the FCC metal with the largest MACE-vs-EMT per-element offset,
+6.01 eV/atom) using a classical **EMT** reference, then applied across elements. Predictions
are MACE-MP-0 on the GPU; the metric is energy MAE.

| element | scope | v0 MAE | v1 MAE | uplift | gate |
|---|---|---|---|---|---|
| Pt | in-family | 6.0136 | 0.0259 | **+99.6%** | **PROMOTE** |
| Ni | cross-family | 5.7218 | 0.2918 | +94.9% | REVIEW |
| Cu | cross-family | 4.0771 | 1.9365 | +52.5% | REVIEW |
| Au | cross-family | 3.2041 | 2.8096 | +12.3% | REVIEW |
| Ag | cross-family | 2.8193 | 3.1944 | **−13.3%** | **REJECT** |

A clean monotonic gradient: transfer **degrades with chemical distance** from Pt and **crosses
zero at Ag**, where the 6.01 eV Pt correction overshoots Ag's small 2.82 eV offset and genuinely
*regresses*. The formal gate tracks it exactly — PROMOTE (in-scope) → REVIEW (positive but
unproven out-of-scope) → **REJECT** (measured regression). The Ag reject is the real
`ContextSpecificProof.context_correction_does_not_transfer` (T3): the gate refuses the correction
on **measured regression**, precisely where the theorem proves it must not transfer — and holds
the positive-but-unproven cases for human review rather than auto-promoting them.

## Caveats (honest scope)

- **Reference is Mishin EAM, not DFT.** This is the controlled "home-turf" test (does the MLIP
  reproduce the classical potential), which is exactly right for the distill *mechanism*. A
  DFT hard-lane fixture is separate.
- **torch_sim ran in eager mode.** Its compiled neighbor list needs Triton (unavailable on
  Windows), so dynamo was disabled. Genuinely torch_sim on GPU, but the *batched-compiled*
  speedup would need Linux/Triton. Fine for 4-atom cells.
- **One of two distill operators.** This uses the zero-point bias correction; the linear
  `ribbon_residual_correction_v1` operator (`lupine_distill_runtime/session.py`) is the other.
- **Cross-material negative transfer is now shown** (Pt→Ag, above) using an EMT classical
  reference and MACE-MP-0 across FCC metals — a real measured-regression REJECT. A *second-model*
  variant (e.g. CHGNet near-DFT overshoot) would still strengthen it but needs a model download.

## Next

1. ~~Cross-material negative transfer~~ **done** (Pt→Ag REJECT, above). Next: a *second-model*
   variant (CHGNet near-DFT overshoot) once weights are downloaded.
2. Open the curvature lane: phonon/Hessian sentinel — the C44 shear weakness above suggests the
   second-derivative signal is where MACE-MP-0 diverges most.
3. Seed `glim-think.atlas_theorems` from these theorem refs and emit `lupine.proof.status`
   spans so this gate decision flows into Phoenix (Thrust 1).

## Artifacts

`tmp/mlip-gpu-ni/`: `v0_baseline.json`, `v1_distilled.json`, `uplift_report.json`,
`gate_decisions.json`, `elastic_constants.json`.
