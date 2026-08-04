# Replication Kit: Error-Geometry of Foundation MLIP Elastic Predictions

Self-contained replication of the pre-registered functional-vs-architecture
experiment (prereg committed at `dffbe595`, results at `63f6e59c`) and the
formal theory it instantiates.

**Claims under test**

1. Foundation-MLIP elastic-constant error geometry organizes by **training
   functional**, not architecture (cluster statistic S_func = +0.317,
   permutation p = 0.029 over all 70 labelings; S_arch = −0.093).
2. r2SCAN-trained models rotate the noble-metal C44 error toward experiment
   (Au: −0.327 → −0.069; Pt: −0.462 → −0.308).
3. The error subspace per element is ~one-dimensional across 8–11 models
   (rank-1 share 0.56–0.94) even where mean *signed* cosine ≈ 0: the conserved
   object is the **axis**, not the vector.

**Formal layer (no experiment trust required):** the participation-ratio gauge
PR(d, ρ) = (ρ+d)²/((ρ+1)²+(d−1)) and the ribbon/consensus decoupling theorem
are machine-checked in Lean 4 (`lean-spec/OpenDistillationFactory/Materials/
Theory/ErrorGeometry.lean`, zero sorry, zero new axioms). Build with
`lake build` in `lean-spec/`.

## Tiers

| Tier | What it verifies | Needs | Runtime |
|---|---|---|---|
| 1 | Every headline statistic, recomputed from committed raw elastic constants (`data/`) | numpy, scipy | seconds |
| 2 | The raw elastic constants themselves, recomputed from public checkpoints through the frozen harness | + torch, matgl | ~5 min CPU |

```
# Tier 1 — analysis layer (deterministic, no ML)
python tier1_analyze.py

# Tier 2 — physics layer (downloads public MatPES checkpoints)
pip install -r requirements.txt
python patch_matgl.py        # torch>=2.11 compat shim for matgl<=4.0.2 (annotations only)
python tier2_recompute.py --cell tensornet_pbe        # one cell
python tier2_recompute.py --all                       # all eight
```

Tier 1 exits 0 only if all recomputed statistics match `data/expected_results.json`
within stated tolerances. Tier 2 exits 0 only if recomputed elastic constants
match the committed cells within 1 GPa (deterministic: fixed checkpoints, CPU,
float32; minor BLAS variation is far below tolerance).

## Protocol (frozen)

- Strain-energy method: a0 from parabolic fit over ±5% isotropic strain;
  K from isotropic mode; (C11−C12) from volume-conserving tetragonal mode;
  C44 from pure shear; 9-point grids, eps_max = 0.5%; quadratic fits.
  Cross-validated against an independent stress-strain implementation
  (agreement ≤ 2.4%) and strain-window stable (Au C44 drift < 4% over an
  8× window range). See `harness.py` (frozen copy; no external imports).
- References: experimental single-crystal elastic constants (Simmons & Wang
  1971 lineage), `references.py`, identical to the table used for the
  classical 559-potential analysis.
- Born screen applied identically to every model: C11>0, C44>0, C11>|C12|.
- Models: matgl-distributed MatPES 2025.2 checkpoints, four architectures
  (M3GNet, TensorNet, CHGNet, QET) × two functionals (PBE, r2SCAN), plus
  the original MPtrj/OMat anchors (MACE-MP-0-small, CHGNet, Orb-v3) whose
  raw outputs are committed under `data/anchors/`.
