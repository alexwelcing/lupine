# Local GPU verification artifacts — Ni FCC EAM-home-turf

Generated 2026-06-16 on NVIDIA RTX A4500 (Windows, CUDA 12.4).

## Contents

- `uplift_report.json` — aggregate uplift: 76.04% overall, promote band.
- `gate_decisions.json` — formal promotion gate outcomes:
  - in-support + formal certification → **PROMOTE**
  - out-of-scope / uncertified → **REVIEW** (negative-transfer guard)
  - marginal + uncertified → **REJECT**
- `v0_baseline.json`, `v1_distilled.json` — raw TorchSim benchmark payloads.
- `elastic_constants.json` — fitted C11/C12/C44 comparison.
- `mace_mp_medium_immi_results.json` — 15-element elastic-constant sweep with MACE-MP-medium.
- `mace_mpa0_immi_results.json` — 15-element elastic-constant sweep with MACE-MPA-0.

## Formal grounding

The promotion gate references two Lean 4 theorems (0 `sorry`):

- `OpenDistillationFactory.Materials.Theory.ContextSpecificProof.context_correction_does_not_transfer`
- `OpenDistillationFactory.Materials.Theory.AccuracyCommitment.accuracyGain_is_operative_value`

The in-support decision is also materialized as a build-locked theorem in
`lean-spec/OpenDistillationFactory/Materials/Theory/AccuracyCommitment.lean`:

- `mace_mp0_ni_energy_beats_baseline`
- `mace_mp0_ni_energy_reduction_is_material`

## How to reproduce

```powershell
cd C:\Users\alexw\Downloads\shed
C:/Users/alexw/mlip-gpu/Scripts/python.exe python/scripts/run_ni_gpu_loop.py
```
