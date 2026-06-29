# A6 bridge test protocol — MatPES / MPtrj / OMat24 scale

> **Purpose.** Test the keystone paper's assumption A6 (common-spatial-mode
> separability) at the scale it prescribes: fit on MatPES/MPtrj, scale-test on
> OMat24, with a stratified permutation null and a blocked bootstrap over
> materials/trajectories. This document is the protocol; the runnable harness is
> [`tools/a6_bridge_pilot.py`](../../tools/a6_bridge_pilot.py).
>
> **Context.** Read [`keystone-reconciliation.md`](./keystone-reconciliation.md)
> and [`objects.md`](./objects.md) first. The A6 bridge is the empirical link
> between output-space error sloppiness (object B) and a shared configuration-
> space error core (object C). The paper explicitly marks A6 "strongly
> nonstandard" and says it "must be tested rather than presumed."

## 1. Statistical hypotheses

- **H1 (A6 holds, perturbative regime).** Different MLIPs share a common
  spatial error mode on the same configuration. Cross-model force-field and
  energy-field alignment is stronger than a null that breaks only per-atom
  correspondence within each material/trajectory.
- **H0 (stratified permutation null).** Observed alignment is explained by
  per-structure magnitude scaling and random sampling; it disappears when atom
  labels are permuted independently within each structure (forces) or when
  structure labels are permuted within each trajectory/phase (energies).
- **H0' (blocked-bootstrap null for uncertainty).** Resampling materials /
  trajectories with replacement reproduces the observed alignment; i.e. the
  signal is not driven by a few outlier structures.

## 2. Input data

### 2.1 Required fields

Each **block** (material, trajectory, or ionic step sequence) contains one or
more **configurations**. For each configuration and each model `M` we need:

| field | shape | meaning |
|---|---|---|
| `positions` | `[n_atoms, 3]` | Cartesian coordinates (Å) |
| `cell` | `[3, 3]` | lattice vectors (Å) |
| `symbols` | `[n_atoms]` | chemical elements |
| `energy_ev_per_atom` | scalar | predicted total energy / n_atoms |
| `forces_ev_per_angstrom` | `[n_atoms, 3]` | predicted forces |
| `reference.energy_ev_per_atom` | scalar | reference (DFT) energy / n_atoms |
| `reference.forces_ev_per_angstrom` | `[n_atoms, 3]` | reference forces |
| `block_id` | string | material or trajectory identifier |
| `config_id` | string | unique configuration identifier |

The protocol also accepts scalar stress / virial residuals, but the primary A6
bridge statistics below are defined for the force and energy fields.

### 2.2 Datasets

| stage | dataset | role | target size |
|---|---|---|---|
| fit | MatPES or MPtrj train split | estimate shared core and per-model perturbations | ≥ 10⁴ configurations, ≥ 10² materials |
| scale | OMat24 or MPtrj test split | out-of-distribution transfer test | ≥ 10⁵ configurations |
| pilot | existing 5-structure MPtrj set (`canonical-structures-v2` forces row) | method validation and CI benchmarking | 5 configs, 3 MLIPs, 107 atoms |

## 3. Residual fields

For model `M` on configuration `c`:

- **Force residual field:** `ΔF_M(c) = F_M(c) − F_ref(c)`  (eV/Å, `[n_atoms, 3]`)
- **Energy residual field:** `ΔE_M(c) = E_M(c) − E_ref(c)`  (eV/atom, scalar)

We stack residuals across all configurations in the evaluation set, preserving
block membership:

- Force residual vector for model `M`: `r_M^F ∈ ℝ^{3N_total}` (flattened by
  configuration then atom).
- Energy residual vector for model `M`: `r_M^E ∈ ℝ^{N_config}` (one entry per
  configuration).

The joint scalarized error field of the keystone paper is `q_M = ‖r_M‖²`; the
protocol reports the force and energy blocks separately so that downstream
analyses can choose weights `w_E, w_F` explicitly.

## 4. Alignment statistics

For each unordered pair of models `(M_i, M_j)`:

### 4.1 Force field

| statistic | definition | A6 interpretation |
|---|---|---|
| `mag_corr` | Pearson `corr(‖ΔF_i(a)‖, ‖ΔF_j(a)‖)` over all atoms `a` | same atoms carry large errors |
| `atom_cos` | mean over atoms of `cos(ΔF_i(a), ΔF_j(a))` | same direction per atom |
| `field_cos` | `cos(r_i^F, r_j^F)` over flattened 3N vector | whole-field alignment |
| `core_proxy` | normalized least-squares fit `r_j ≈ α r_i` | shared-mode amplitude ratio |
| `delta_rel` | `mean ‖ΔF_j − α ΔF_i‖ / mean ‖ΔF_i‖` | relative perturbation magnitude `η_M` |

### 4.2 Energy field

| statistic | definition | A6 interpretation |
|---|---|---|
| `energy_corr` | Pearson `corr(ΔE_i(c), ΔE_j(c))` over configs | same structures are high/low error |
| `energy_cos` | `cos(r_i^E, r_j^E)` | whole energy-error vector alignment |
| `energy_mae_ratio` | `MAE(ΔE_i) / MAE(ΔE_j)` | relative energy-error scale |

All cosine similarities are computed on mean-centered vectors unless
explicitly noted; Pearson correlations are sign-preserving.

## 5. Stratified permutation null

The null must break per-atom correspondence **without** breaking the per-
structure size/magnitude distribution.

### 5.1 Force-field null

For each model independently and **within each block separately**, permute the
atom indices of `ΔF_M`. Then recompute `mag_corr`, `atom_cos`, and `field_cos`.
This preserves:

- the number of atoms per block,
- the marginal distribution of force magnitudes within each block,
- the per-model error scale.

It destroys:

- the shared per-atom spatial pattern across models,
- any atom-to-atom correspondence between models.

Repeat `B` times (default `B = 5000`). Report empirical one-sided p-values:
`p = (1 + #{null ≥ observed}) / (B + 1)`.

### 5.2 Energy-field null

For each model independently and **within each block separately**, permute the
configuration indices of `ΔE_M`. This preserves the block-level mean/variance
and destroys cross-model configuration correspondence. For single-configuration
blocks the null is degenerate; such blocks are excluded from energy-field null
sampling or grouped into a coarser stratum.

### 5.3 Coupling-aware extension (required before publication)

The permutation null still does **not** control for mathematical coupling of
residual components (Cauchy relation / mechanical-stability constraints). The
publication-grade protocol adds a **geometry-preserving null**: rotate each
model's residual field by a random block-wise orthogonal transformation and
recompute the alignment statistics. If observed alignment survives this null, it
is not an artifact of shared elastic constraints. This is listed as a deliverable
in the summary.

## 6. Blocked bootstrap

Blocks are **materials / trajectories / ionic-step sequences**, never individual
atomic frames.

### 6.1 Procedure

1. Let `B = {b_1, …, b_K}` be the set of blocks.
2. For replicate `s = 1 … S` (default `S = 2000`):
   - Sample `K` blocks from `B` with replacement: `B^(s)`.
   - Concatenate all configurations and atoms from `B^(s)`.
   - Recompute every alignment statistic on the bootstrap sample.
3. Report percentile bootstrap CIs (e.g. 95%) for each statistic.
4. Report the bootstrap standard error and bias-corrected estimate.

### 6.2 Why blocks matter

Atomic frames within the same MD trajectory or ionic-relaxation sequence are
strongly correlated. Bootstrapping atoms would anti-conservatively shrink the CI
and produce false confidence in A6. The paper's diagnostics table (p. 14–15)
explicitly requires blocked bootstrap over materials.

### 6.3 Stability margin

The perturbative theorem's stability margin is `M_M = a_M c_ψ − L_M`. We do not
observe `a_M`, `c_ψ`, or `L_M` directly, but the blocked bootstrap gives a CI
for `delta_rel` (a proxy for `‖η_M‖`) and for the alignment drop-off under
permutation. A positive A6 result requires:

- the lower CI of `field_cos` / `mag_corr` is above the permutation-null mean,
- the upper CI of `delta_rel` is bounded well below 1.

## 7. Core-dimension diagnostic (optional but recommended)

To connect to the keystone paper's object C, estimate the dimension `d` of the
shared configuration-space core `H`:

1. Pool all high-error atoms/configurations: e.g. top quartile of
   `max_M ‖ΔF_M(a)‖` and top quartile of `max_M |ΔE_M(c)|`.
2. Collect their configuration-space descriptors (positions flattened, or local
   SOAP/Voronoi fingerprints).
3. Run local PCA with a neighborhood radius and report the number of eigenvalues
   needed to explain 90% of variance.
4. Sweep the error threshold; if `d` is unstable, the core is not robust.

This is a separate deliverable and is not implemented in the pilot script.

## 8. Decision criteria

| condition | implication |
|---|---|
| `field_cos` and `mag_corr` significantly exceed stratified null; CIs exclude null mean | A6 supported for that field and pair |
| `atom_cos` > 0 with tight CI but `field_cos` mixed | shared spatial mode exists but model-specific perturbations are large (perturbative theorem regime) |
| `energy_cos` significant but `field_cos` not | energy errors share structure but force errors do not — dynamical utility is weak |
| Bootstrap CIs overlap the permutation-null mean | signal is not robust to material resampling; A6 not established |
| CHGNet (or any model) consistently the weakest aligner | that model carries the largest `η_M`; treat it as a high-perturbation outlier in downstream transfer |

## 9. Pilot execution

Run the pilot on the existing 5-structure set:

```bash
cd /home/alex/Dev/lupine/lupine
python tools/a6_bridge_pilot.py --pilot \
  --permutations 5000 --bootstrap 2000 \
  --output docs/glim-m3-upgrade/runs/a6-bridge-pilot-results.json \
  --report docs/glim-m3-upgrade/runs/a6-bridge-pilot-results.md
```

This uses the three baseline result files in
`docs/glim-m3-upgrade/runs/live/forces/` and requires only NumPy/SciPy.

## 10. Full-scale execution plan

1. **Materialize MatPES/MPtrj input manifest** in the schema expected by
   `a6_bridge_pilot.py` (see `--schema` flag).
2. **Run three independent blocked-bootstrap replicates** at different random
   seeds; check CI stability.
3. **Add the coupling-aware null** (geometry-preserving random rotations).
4. **Estimate core dimension** on pooled high-error configurations.
5. **Reproduce on OMat24** with the same models and report transfer gaps.
6. **Write a paper-ready report** linking each statistic to the exact theorem
   statement in the keystone paper.

## 11. Limitations and caveats

- The pilot is 5 structures / 107 atoms; it validates the harness, not A6 at
  scale.
- The permutation null controls per-structure size but not mechanical/elastic
  coupling.
- A positive A6 test supports the **perturbative** tubular theorem, not an
  unrestricted universality claim.
- Energy alignment and force alignment can disagree; the joint scalarized field
  `q_M = ‖r_M‖²` is what the theorem uses.

## 12. References

- Repo-root PDF: *A Conditional Universality Theorem for Error Geometry in
  Machine-Learning Interatomic Potentials* — assumptions A0–A6, exact and
  perturbative tubular theorems, diagnostics table p. 14–15.
- [`keystone-reconciliation.md`](./keystone-reconciliation.md)
- [`objects.md`](./objects.md)
- [`docs/glim-m3-upgrade/runs/a6-alignment-results.md`](../glim-m3-upgrade/runs/a6-alignment-results.md) — first pilot
