# A6 bridge test — expected deliverables and blockers

## Deliverables produced

1. **Protocol** — `docs/science/a6_bridge_protocol.md`
   - Formal statement of H1 / H0 for the A6 (common-spatial-mode separability) bridge.
   - Stratified permutation null (within block, never across blocks).
   - Blocked bootstrap over materials/trajectories (atomic frames are not resampled).
   - Force-field and energy-field alignment statistics with explicit A6 interpretation.
   - Scaling plan: MatPES/MPtrj fit → OMat24 scale-test, core-dimension sweep, and
     coupling-aware null.

2. **Pilot script** — `tools/a6_bridge_pilot.py`
   - Runnable on the existing 5-structure pilot set (`--pilot`) or on a custom
     MatPES/MPtrj/OMat24 manifest (`--manifest`).
   - Computes `mag_corr`, `atom_cos`, `field_cos`, `core_proxy`, `delta_rel` for
     forces and `energy_corr`, `energy_cos`, `energy_mae_ratio` for energies.
   - Emits permutation null p-values, blocked-bootstrap CIs, and Fisher aggregate
     χ² values.
   - Outputs JSON (`lupine.a6_bridge.results.v1`) and an optional markdown report.

3. **This summary** — `docs/science/a6_bridge_deliverables.md`

## Expected next deliverables

| # | deliverable | owner / dependency | definition of done |
|---|---|---|---|
| 1 | Materialize MatPES/MPtrj input manifest | data engineering | JSON manifest in `lupine.a6_bridge.manifest.v1` schema with ≥ 10² materials and reference DFT labels |
| 2 | Coupling-aware null | methods | Geometry-preserving random rotation of residual fields within blocks; p-values survive this stricter null |
| 3 | Core-dimension estimate | methods | Local PCA on pooled high-error configurations with threshold sweep; stable `d` reported |
| 4 | OMat24 scale reproduction | compute | Same models, same protocol, transfer gap quantified vs MatPES/MPtrj |
| 5 | Paper-ready report | science | Each statistic explicitly mapped to the keystone theorem's exact/perturbative statements |

## Known blockers

1. **Data access and licensing.** MatPES, MPtrj, and OMat24 are public but large.
   The harness expects pre-computed MLIP predictions with reference labels; we do
   not yet have a materialized manifest for the full datasets.
2. **Coupling-aware null is unimplemented.** The current permutation null controls
   per-structure size but not the Cauchy-relation / mechanical-stability coupling
   that Jackson–Somers (1991) and Archie (1981) show creates a non-zero baseline
   correlation. The positive pilot signal is therefore suggestive, not established.
3. **Compute budget.** A full MatPES/MPtrj run with 3+ MLIPs and 10⁴+ configurations
   is not free; the protocol is designed to run offline on existing predictions once
   the manifest exists.
4. **Reference-label alignment.** The protocol assumes identical (block_id,
   config_id) sets across models. Differing inference outputs (missing configs,
   different atom ordering) must be reconciled before the alignment statistics are
   meaningful.
5. **Energy vs force agreement.** The keystone theorem uses the joint scalarized
   field `q_M = ‖r_M‖²`. Separate force/energy alignment can disagree; defining the
   shared weights `w_E, w_F` for the joint field is a modeling choice that affects
   conclusions.

## Current status

- Harness and protocol are built and ready for the pilot set.
- No large-scale compute was run; only the method and small-test infrastructure
  were produced.
- The next actionable step is to materialize the MatPES/MPtrj manifest and run the
  pilot script against it with reduced permutation/bootstrap counts for a sanity
  check before the full-scale campaign.
