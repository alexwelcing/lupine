# Internal Science Program

This is a private working map for the next evidence push. Do not treat it as a
public claim sheet. It is here to keep the research honest while the system
grinds.

## Current Scientific Center

The strongest idea is not that one potential ranks above another. The strongest
idea is that interatomic-potential errors can be studied as physical objects:
they have covariance spectra, symmetry structure, provenance, failure modes,
and causal context.

The current center of gravity is:

1. Error vectors for elastic observables are strongly compressed.
2. Benchmark heterogeneity is signal, not nuisance.
3. Simpson-style claims need strict causal auditing before they are allowed back
   into headline status.
4. The next real battlefield is curvature: phonons, Hessians, force constants,
   and non-equilibrium configurations.
5. Formalization should trail only stable claims with artifacts and falsification
   notes.

## Fresh Local Run

Command run privately into `.glim-runtime/science-runs/`:

```powershell
cargo run --release --manifest-path ..\..\atlas-distill\Cargo.toml --bin atlas-distill -- benchmark (Resolve-Path ..\..\nist_benchmark.csv) --full
```

Input: `nist_benchmark.csv`

Dataset summary:

- Entries: 386
- Materials: 10, namely Ag, Al, Au, Cr, Cu, Fe, Mo, Ni, V, W
- Potentials: 38
- Properties: C11, C12, C44, Ecoh, a0
- Completeness: 13.8%

Manifold results from the private run:

| Potential | Materials | PR / 5 | PR CI | First mode variance | Strict ribbon |
| --- | ---: | ---: | --- | ---: | --- |
| Ackland-1987 | 4 | 1.458 | 1.000-1.697 | 80.5% | no |
| Foiles-1986 | 4 | 1.685 | 1.000-1.972 | 74.6% | no |
| Zhou-2004 | 5 | 1.150 | 1.000-1.442 | 93.0% | no |
| Adams-1989 | 4 | 1.991 | 1.000-1.991 | 65.9% | no |

Interpretation:

- Low-dimensional compression is real and strong in these slices.
- The stricter geometric-ribbon classifier currently rejects all four sparse 5D
  slices.
- That means the next claim should be "compressed error subspace" unless and
  until the geometric-sequence law is separately proven.
- The zero or near-zero trailing eigenvalues are partly a sparse-rank issue:
  four or five materials cannot fully populate a five-observable covariance
  matrix.

Meta-analysis results from the same run:

- Fixed effects: pooled r = 0.9901, I2 = 96.1%
- Random effects: pooled r = 0.9945, I2 = 96.5%
- Random-effects prediction interval: 0.8251-0.9998

Interpretation:

- Correlations are very high overall, but heterogeneity remains extreme.
- The right claim is not "one pooled number is enough." It is "the pooled number
  survives here, while the heterogeneity says group structure still matters."

## Claim Triage

### Promote

Compressed error subspace:

- Supported by FCC, BCC, and fresh NIST slices.
- Good next form: "Participation ratios stay near 1-2 across elastic/statics
  observable bundles, even when the ambient observable count is 5."

Heterogeneity as diagnostic:

- Supported by high I2 across local meta-analysis runs.
- Good next form: "Random-effects meta-analysis should be a standard
  benchmark diagnostic, even when all subgroup correlations are positive."

Curvature validation:

- Supported by the phonon report and by the conceptual gap between elastic
  constants and full Hessian behavior.
- Good next form: "A potential is not validation-complete until force-constant
  and phonon stability errors are measured."

### Quarantine

Simpson's paradox:

- Existing local artifacts disagree in emphasis.
- `paradox_detection.json` says no Simpson sign reversal but flags ecological
  fallacy by reversal magnitude.
- Lean causal docs say empirical Simpson and ecological fallacy are both absent
  for a separate embedded dataset.
- Next action: build a single paradox audit table keyed by dataset, grouping,
  x/y definition, pooled r, pooled-within r, sign reversal, and magnitude gap.

Strict hyper-ribbon law:

- The fresh 386-entry run shows strong compression but strict classifier failure.
- Next action: split the theorem into two layers:
  - Low PR compression.
  - Geometric eigenvalue law.

### Retire Or Rewrite

Any public wording that says "Simpson's paradox proven" should be treated as
outdated until the unified causal audit says otherwise.

Any public wording that says "hyper-ribbon proven" should specify which
criterion is meant. Low PR is not the same as a strict geometric spectrum.

## Next Internal Experiments

1. Causal audit matrix
   - Run every paradox detector against every local dataset.
   - Standardize x/y definitions.
   - Output one table with no narrative.

2. Rank-aware manifold audit
   - For each potential, record sample count, observable count, matrix rank,
     PR, PR CI, geometric residual CV, and strict-ribbon result.
   - Flag any run where sample count <= observable count.

3. Bulk/shear mode basis
   - Transform C11, C12, C44 into bulk-like and shear-like coordinates.
   - Test whether principal directions align with physical elastic modes.
   - This is the real path toward spectral rigidity.

4. Phonon sentinel protocol
   - Start with small displacement sweeps for Al, Cu, Ni, and Ag.
   - Record Hessian/force-constant sensitivity before attempting broad MLIP
     benchmarking.
   - Gate with dynamic-stability classification, not just frequency MAE.

5. Lean gate preparation
   - Formalize low-PR compression separately from geometric spectrum.
   - Add an explicit "insufficient rank" theorem/guard for sparse covariance
     claims.
   - Keep Simpson as a refuted or quarantined claim until the audit resolves.

## Why This Is Exciting

The scientific path is becoming sharper. GLIM is not merely a validation runner;
it is a machine for discovering the structure of model error. If that holds,
then the useful product is a living error atlas: which observables collapse,
which modes stay stiff, which potential families fail by the same geometry, and
which new experiments break the compression.
