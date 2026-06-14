> ⚠️ **Stale campaign snapshot.** This atlas combines earlier MPtrj-DFT and Ni-EAM
> campaign results before the 2026-06-02 correction. Its "6 accelerate-wins" claim was
> later nullified (the `accelerate` tier produced no speedup), and the Ni-EAM regressions
> are the v0 ungated harms now prevented by the regime gate. See the corrected MPtrj
> account [`docs/glim-m3-upgrade/runs/live-campaign-results.md`](./glim-m3-upgrade/runs/live-campaign-results.md)
> and the Ni paired result [`docs/mlip-ni-paired-accuracy-live-report.md`](./mlip-ni-paired-accuracy-live-report.md).
> The Lean atlas theorems remain a historical artifact.

# Distill Improvement Atlas

Unified synthesis of a GCP TorchSim+distill run — 45 paired (baseline↔distill) cells across 2 material lanes. **6 improve, 8 regress, 6 accelerate-wins (faster AND ≥ as accurate).**

## 1. Improvement matrix (accuracy + throughput)

| material | row | mlip | base err | distill err | gain% | speedup | accel err | accel speedup | verdict |
|---|---|---|---|---|---|---|---|---|---|
| MPtrj-DFT | elastic_constants | chgnet | 48.8710 | 48.8710 | -0.0 | 0.80x | 48.8710 | 3.47x | neutral |
| MPtrj-DFT | elastic_constants | mace-mp-0 | 35.5242 | 35.5242 | 0.0 | 0.45x | 35.5242 | 2.90x | neutral |
| MPtrj-DFT | elastic_constants | orb-v3 | 16.1513 | 16.1513 | 0.0 | 0.01x | 16.1513 | 2.68x | neutral |
| MPtrj-DFT | elastic_constants | sevennet | 38.5338 | 38.5338 | -0.0 | 0.42x | 38.5338 | 3.22x | neutral |
| MPtrj-DFT | energy_volume | chgnet | 0.1035 | 0.1035 | 0.0 | 0.05x | 0.1035 | 5.31x | neutral |
| MPtrj-DFT | energy_volume | mace-mp-0 | 0.4116 | 0.2038 | 50.5 | 0.01x | 0.2038 | 5.26x | 🚀 accel-win |
| MPtrj-DFT | energy_volume | orb-v3 | 0.4295 | 0.4237 | 1.4 | 0.00x | 0.4237 | 4.83x | 🚀 accel-win |
| MPtrj-DFT | energy_volume | sevennet | 0.3997 | 0.2795 | 30.1 | 0.02x | 0.2795 | 5.61x | 🚀 accel-win |
| MPtrj-DFT | forces | chgnet | 0.1649 | 0.1649 | 0.0 | 0.15x | 0.1649 | 5.39x | neutral |
| MPtrj-DFT | forces | mace-mp-0 | 0.2644 | 0.2644 | -0.0 | 0.22x | 0.2644 | 6.12x | neutral |
| MPtrj-DFT | forces | orb-v3 | 0.1241 | 0.1241 | 0.0 | 0.30x | 0.1241 | 5.29x | neutral |
| MPtrj-DFT | forces | sevennet | 0.1957 | 0.1957 | 0.0 | 0.14x | — | —x | neutral |
| MPtrj-DFT | relaxation_stability | chgnet | 0.0557 | 0.0557 | 0.0 | 0.03x | 0.0557 | 6.72x | neutral |
| MPtrj-DFT | relaxation_stability | mace-mp-0 | 0.5604 | 0.3866 | 31.0 | 0.05x | 0.3866 | 6.93x | 🚀 accel-win |
| MPtrj-DFT | relaxation_stability | orb-v3 | 0.5327 | 0.3365 | 36.8 | 0.07x | 0.3365 | 6.24x | 🚀 accel-win |
| MPtrj-DFT | relaxation_stability | sevennet | 0.5750 | 0.3972 | 30.9 | 0.03x | 0.3972 | 6.72x | 🚀 accel-win |
| MPtrj-DFT | stress | chgnet | 0.4311 | 0.4311 | 0.0 | 0.13x | 0.4311 | 5.03x | neutral |
| MPtrj-DFT | stress | mace-mp-0 | 0.5669 | 0.5669 | 0.0 | 0.19x | — | —x | neutral |
| MPtrj-DFT | stress | orb-v3 | 0.2798 | 0.2798 | 0.0 | 0.33x | 0.2798 | 5.53x | neutral |
| MPtrj-DFT | stress | sevennet | 0.3536 | 0.3536 | -0.0 | 0.13x | 0.3536 | 5.53x | neutral |
| Ni-EAM | elastic_constants | chgnet | 27.7109 | 27.7109 | 0.0 | 0.66x | — | —x | neutral |
| Ni-EAM | elastic_constants | m3gnet | 30118.0389 | 30118.0389 | 0.0 | 0.77x | — | —x | neutral |
| Ni-EAM | elastic_constants | mace-mp-0 | 22.6534 | 22.6534 | 0.0 | 0.57x | — | —x | neutral |
| Ni-EAM | elastic_constants | orb-v3 | 8.0001 | 8.0001 | 0.0 | 0.01x | — | —x | neutral |
| Ni-EAM | elastic_constants | sevennet | 26.7399 | 26.7399 | 0.0 | 0.37x | — | —x | neutral |
| Ni-EAM | energy_volume | chgnet | 1.2943 | 1.3005 | -0.5 | 0.03x | — | —x | neutral |
| Ni-EAM | energy_volume | m3gnet | 1.2877 | 1.4476 | -12.4 | 0.03x | — | —x | regress |
| Ni-EAM | energy_volume | mace-mp-0 | 1.2803 | 1.4168 | -10.7 | 0.01x | — | —x | regress |
| Ni-EAM | energy_volume | orb-v3 | 1.0438 | 1.2133 | -16.2 | 0.00x | — | —x | regress |
| Ni-EAM | energy_volume | sevennet | 1.3151 | 1.3696 | -4.1 | 0.01x | — | —x | regress |
| Ni-EAM | forces | chgnet | 0.1054 | 0.1054 | 0.0 | 0.16x | — | —x | neutral |
| Ni-EAM | forces | m3gnet | 0.0487 | 0.0487 | -0.0 | 0.03x | — | —x | neutral |
| Ni-EAM | forces | mace-mp-0 | 0.0825 | 0.0825 | 0.0 | 0.18x | — | —x | neutral |
| Ni-EAM | forces | orb-v3 | 0.0684 | 0.0684 | -0.0 | 0.24x | — | —x | neutral |
| Ni-EAM | forces | sevennet | 0.0391 | 0.0391 | -0.0 | 0.11x | — | —x | neutral |
| Ni-EAM | relaxation_stability | chgnet | 1.2930 | 1.2943 | -0.1 | 0.03x | — | —x | neutral |
| Ni-EAM | relaxation_stability | m3gnet | 1.2865 | 1.3968 | -8.6 | 0.01x | — | —x | regress |
| Ni-EAM | relaxation_stability | mace-mp-0 | 1.2798 | 1.4025 | -9.6 | 0.05x | — | —x | regress |
| Ni-EAM | relaxation_stability | orb-v3 | 1.0427 | 1.2328 | -18.2 | 0.07x | — | —x | regress |
| Ni-EAM | relaxation_stability | sevennet | 1.3138 | 1.4340 | -9.1 | 0.03x | — | —x | regress |
| Ni-EAM | stress | chgnet | 1.4479 | 1.4479 | 0.0 | 0.11x | — | —x | neutral |
| Ni-EAM | stress | m3gnet | 285.8921 | 285.8921 | 0.0 | 0.04x | — | —x | neutral |
| Ni-EAM | stress | mace-mp-0 | 0.8611 | 0.8611 | 0.0 | 0.17x | — | —x | neutral |
| Ni-EAM | stress | orb-v3 | 1.1324 | 1.1324 | 0.0 | 0.32x | — | —x | neutral |
| Ni-EAM | stress | sevennet | 1.4846 | 1.4846 | 0.0 | 0.10x | — | —x | neutral |

## 2. Residual / regression map (the operator + policy fix spec)

**Distill REGRESSES (wrong-regime ribbon harms) — fix: material-aware ribbon selection (T3):**
- Ni-EAM / energy_volume / m3gnet: 1.2877 → 1.4476 (-12.4%), 10 interventions / 0 refusals
- Ni-EAM / energy_volume / mace-mp-0: 1.2803 → 1.4168 (-10.7%), 10 interventions / 0 refusals
- Ni-EAM / energy_volume / orb-v3: 1.0438 → 1.2133 (-16.2%), 10 interventions / 0 refusals
- Ni-EAM / energy_volume / sevennet: 1.3151 → 1.3696 (-4.1%), 10 interventions / 0 refusals
- Ni-EAM / relaxation_stability / m3gnet: 1.2865 → 1.3968 (-8.6%), 6 interventions / 0 refusals
- Ni-EAM / relaxation_stability / mace-mp-0: 1.2798 → 1.4025 (-9.6%), 6 interventions / 0 refusals
- Ni-EAM / relaxation_stability / orb-v3: 1.0427 → 1.2328 (-18.2%), 6 interventions / 0 refusals
- Ni-EAM / relaxation_stability / sevennet: 1.3138 → 1.4340 (-9.1%), 6 interventions / 0 refusals

**Largest residuals after distill (what the next operator must target):**
- Ni-EAM / elastic_constants / m3gnet: residual 30118.0389 gpa_mae_vs_literature_cij
- Ni-EAM / stress / m3gnet: residual 285.8921 gpa_mae_vs_mishin_eam
- MPtrj-DFT / elastic_constants / chgnet: residual 48.8710 gpa_mae
- MPtrj-DFT / elastic_constants / sevennet: residual 38.5338 gpa_mae
- MPtrj-DFT / elastic_constants / mace-mp-0: residual 35.5242 gpa_mae
- Ni-EAM / elastic_constants / chgnet: residual 27.7109 gpa_mae_vs_literature_cij

## 3. Lean atlas (machine-checked verdicts, 0 sorry)

Authored 22 decidable theorems under `lean-spec/.../DistillAtlas/`, 2/2 lane modules `lean`-verified; seed → `tmp\mlip-evidence\distill_atlas_theorems_seed.sql`. Each encodes a verdict (distill improves / regresses; accelerate faster-and-accurate) as a decidable Nat fact from the GCP evidence — the neural→symbolic bridge applied to the production run.
