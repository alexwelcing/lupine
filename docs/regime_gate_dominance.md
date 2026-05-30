# Regime-Gate Dominance — the systematic harm, prevented a-priori

The atlas measured the v0 (ungated) policy shipping **8 systematic regression(s)** to production. The a-priori regime gate — provenance only, **no oracle** — replays over the same 45 paired cells and **admits 0**, while preserving **6/6** of the wins. **Dominance proved** (Lean, 0 sorry).

## Before vs after (same evidence, two policies)

| policy | harms shipped | wins kept | needs an oracle? |
|---|---|---|---|
| v0 ungated (apply everywhere) | 8 | 6 | n/a (applies blindly) |
| **v1 regime-gated (a-priori)** | **0** | **6** | **no** |

- harm eliminated: **8**  ·  false refusals (lost wins): **0**  ·  missed harms: **0**
- decisions: 8 apply · 12 review · 25 refuse

## The ribbon's declared provenance (the trust envelope)

- `ribbon_id`: `lupine-ribbon-v1-mptrj-dft`
- reference families: `['mptrj_dft']` (a `_vs_<oracle>` unit outside this set is refused — T3 negative transfer)
- fit rows: `['energy_volume', 'relaxation_stability']` (other rows -> review)
- calibration band (metric_kind -> baseline-error range seen at fit): `{'gpa_mae': (0.0, 48.871), 'relaxation_penalty': (0.0, 0.575), 'ev_per_angstrom_rmse': (0.0, 0.2644), 'ev_per_atom_mae': (0.0, 0.4295)}`

## The harms the gate refused a-priori (the prevented regressions)

| material | row | mlip | oracle | gain (outcome) | decision | rule |
|---|---|---|---|---|---|---|
| Ni-EAM | relaxation_stability | m3gnet | mishin_eam | -8.6% (harm) | **refuse** | reference_family_mismatch |
| Ni-EAM | relaxation_stability | mace-mp-0 | mishin_eam | -9.6% (harm) | **refuse** | reference_family_mismatch |
| Ni-EAM | relaxation_stability | orb-v3 | mishin_eam | -18.2% (harm) | **refuse** | reference_family_mismatch |
| Ni-EAM | relaxation_stability | sevennet | mishin_eam | -9.1% (harm) | **refuse** | reference_family_mismatch |
| Ni-EAM | energy_volume | m3gnet | mishin_eam | -12.4% (harm) | **refuse** | reference_family_mismatch |
| Ni-EAM | energy_volume | mace-mp-0 | mishin_eam | -10.7% (harm) | **refuse** | reference_family_mismatch |
| Ni-EAM | energy_volume | orb-v3 | mishin_eam | -16.2% (harm) | **refuse** | reference_family_mismatch |
| Ni-EAM | energy_volume | sevennet | mishin_eam | -4.1% (harm) | **refuse** | reference_family_mismatch |

## The wins the gate kept (applied in-regime)

| material | row | mlip | oracle | gain (outcome) | decision | rule |
|---|---|---|---|---|---|---|
| MPtrj-DFT | relaxation_stability | mace-mp-0 | mptrj_dft | +31.0% (gain) | **apply** | in_regime |
| MPtrj-DFT | relaxation_stability | orb-v3 | mptrj_dft | +36.8% (gain) | **apply** | in_regime |
| MPtrj-DFT | relaxation_stability | sevennet | mptrj_dft | +30.9% (gain) | **apply** | in_regime |
| MPtrj-DFT | energy_volume | mace-mp-0 | mptrj_dft | +50.5% (gain) | **apply** | in_regime |
| MPtrj-DFT | energy_volume | orb-v3 | mptrj_dft | +1.4% (gain) | **apply** | in_regime |
| MPtrj-DFT | energy_volume | sevennet | mptrj_dft | +30.1% (gain) | **apply** | in_regime |

## Why this is the foundation, not a patch

The gate decides from **provenance alone** — it never sees the gain it is scored on. So the same gate protects a **novel material with no oracle**, which is exactly where the post-hoc uplift gate is blind. Each future run appends its cells to this benchmark and re-runs the certificate: dominance is re-proved (or the Lean build breaks, an alarm) every time. That is the diagnose -> fix -> re-prove loop as a machine property.

Certificate: `lean-spec/.../RegimeGate/Dominance.lean` (verified, 0 sorry); seed -> `tmp\mlip-evidence\regime_gate_theorems_seed.sql`.
