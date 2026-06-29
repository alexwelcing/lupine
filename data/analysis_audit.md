# Layer-2 3×3×3 MLIP Elastic-Constant Benchmark — Reproducibility Audit

**Auditor:** Lupine benchmark reproducibility auditor  
**Run scope:** Layer-2 3×3×3 supercell elastic-constant grid, MatPES 2025.2 models  
**Inputs audited:**
- `/home/alex/Dev/lupine/lupine/data/benchmark_layer2_3x3x3_summary.json`
- `/tmp/layer2_3x3x3_full/*.json`
- `/home/alex/Dev/lupine/lupine/data/targets_0K.json`
- `/home/alex/Dev/lupine/lupine-rhizo/mlip-elastic-benchmark/mlip-elastic-benchmark-preprint-2026-06-27.md`

**Date:** 2026-06-29

---

## Executive summary

The 3×3×3 Layer-2 benchmark is now complete. All 16 planned elements, four model labels, and two functionals are represented by 128 raw outputs, all reporting `status: ok`. The raw files and the summary JSON are internally consistent, no duplicate keys exist, and every elastic tensor satisfies the cubic mechanical-stability criteria. Runtime outliers are confined to CHGNet and remain well inside the task timeout. On the basis of coverage, numerical sanity, and reproducibility metadata, the dataset is suitable to support the full 16-element preprint, subject to the caveats listed below.

**Verdict: GO for the full 16-element preprint, with caveats.**

---

## 1. Coverage audit

### Planned vs. actual elements

| Set | Count | Elements |
|-----|-------|----------|
| Planned (Layer-2 roster) | 16 | Ag, Al, Au, Ca, Cr, Cu, Fe, Mo, Nb, Ni, Pd, Pt, Sr, Ta, V, W |
| Actually covered | 16 | Ag, Al, Au, Ca, Cr, Cu, Fe, Mo, Nb, Ni, Pd, Pt, Sr, Ta, V, W |
| Missing | 0 | none |

### Task/output counts

| Counting convention | Value | Explanation |
|---------------------|-------|-------------|
| Element-model slots | 16 × 4 = 64 | Full 16-element × 4-model roster |
| Per-functional outputs produced | 128 | 16 elements × 4 models × 2 functionals |
| `n_tasks` in summary JSON | 128 | Counts each functional variant as one task |
| Missing per-functional outputs | 0 | None |

- Elements: Ag, Al, Au, Ca, Cr, Cu, Fe, Mo, Nb, Ni, Pd, Pt, Sr, Ta, V, W
- Models: CHGNet, M3GNet, QET, TensorNet
- Functionals: PBE, r2SCAN

All 16 covered elements have corresponding entries in `targets_0K.json`.

---

## 2. Per-case status

| Status | Count |
|--------|-------|
| `ok` | 128 |
| Duplicate keys | 0 |

No raw/summary value mismatches exceeding 1e-3 were found for `lattice_a`, `c11`, `c12`, `c44`, or `mae_cij`.

---

## 3. Runtime sanity

### Distribution by model

| Model | N | Min (s) | Max (s) | Mean (s) | Median (s) | Std. dev. (s) |
|-------|---|---------|---------|----------|------------|---------------|
| CHGNet | 32 | 8.32 | 90.81 | 47.71 | 51.76 | 26.75 |
| M3GNet | 32 | 4.00 | 17.70 | 8.63 | 8.24 | 3.28 |
| QET | 32 | 8.93 | 32.65 | 18.04 | 15.37 | 7.93 |
| TensorNet | 32 | 7.31 | 34.71 | 18.19 | 17.29 | 7.63 |

### Distribution by functional

| Functional | N | Min (s) | Max (s) | Mean (s) | Median (s) | Std. dev. (s) |
|------------|---|---------|---------|----------|------------|---------------|
| PBE | 64 | 5.03 | 90.16 | 23.23 | 16.67 | 20.19 |
| r2SCAN | 64 | 4.00 | 90.81 | 23.06 | 14.83 | 21.18 |

IQR outlier bounds: [-15.72, 52.26] s. Cases outside this range: 16.

### Runtime outliers (IQR rule)

| Element | Model | Functional | Runtime (s) |
|---------|-------|------------|-------------|
| Ni | CHGNet | r2SCAN | 90.81 |
| Cu | CHGNet | PBE | 90.16 |
| Pt | CHGNet | PBE | 83.06 |
| Pt | CHGNet | r2SCAN | 80.95 |
| Pd | CHGNet | r2SCAN | 77.04 |
| Au | CHGNet | r2SCAN | 76.01 |
| Pd | CHGNet | PBE | 73.02 |
| Cu | CHGNet | r2SCAN | 71.89 |
| Au | CHGNet | PBE | 71.36 |
| Ni | CHGNet | PBE | 70.39 |
| Cr | CHGNet | r2SCAN | 66.25 |
| Ag | CHGNet | PBE | 60.68 |
| Ag | CHGNet | r2SCAN | 59.78 |
| Fe | CHGNet | PBE | 58.18 |
| Al | CHGNet | PBE | 56.87 |
| Al | CHGNet | r2SCAN | 56.15 |

All runtimes are below the Cloud Run task timeout of 3600 s. CHGNet drives the high-side tail; M3GNet is the fastest architecture on average.

---

## 4. Numerical sanity

### Lattice constants

- All `lattice_a` values are positive.
- Range: **2.8258 Å** to **6.1139 Å**.
- No negative, zero, or unphysically large lattice constants were found.

### Elastic constants and mechanical stability

- Negative elastic constants: **0**
- Extreme values (>1000 GPa): **0**
- Mechanical-stability violations for cubic crystals (`c11 − c12 > 0`, `c44 > 0`, `c11 + 2c12 > 0`): **0**

All 128 tensors are mechanically admissible.

### Aggregate MAE by model and functional

| Model | Mean MAE (GPa) |
|-------|----------------|
| CHGNet | 22.92 |
| M3GNet | 17.42 |
| QET | 14.44 |
| TensorNet | 16.58 |

| Functional | Mean MAE (GPa) |
|------------|----------------|
| PBE | 15.01 |
| r2SCAN | 20.66 |

### Summary-block cross-check

The following aggregates are stored in the summary JSON under `summary`:

```json
{
  "PBE": {
    "mean_mae_cij": 15.01,
    "model_mean_mae_cij": {
      "CHGNet": 17.9,
      "M3GNet": 14.13,
      "QET": 13.41,
      "TensorNet": 14.61
    },
    "best_model": "QET"
  },
  "r2SCAN": {
    "mean_mae_cij": 20.66,
    "model_mean_mae_cij": {
      "CHGNet": 27.94,
      "M3GNet": 20.71,
      "QET": 15.46,
      "TensorNet": 18.54
    },
    "best_model": "QET"
  },
  "overall_mean_mae_cij": 17.84,
  "overall_model_mean_mae_cij": {
    "CHGNet": 22.92,
    "M3GNet": 17.42,
    "QET": 14.44,
    "TensorNet": 16.58
  },
  "overall_best_model": "QET"
}
```

### Largest prediction errors

Largest per-case MAE values (scientific outliers, not numerical failures):

| Rank | Element | Model | Functional | MAE (GPa) |
|------|---------|-------|------------|-----------|
| 1 | Cr | M3GNet | r2SCAN | 86.31 |
| 2 | Cr | CHGNet | r2SCAN | 66.55 |
| 3 | Pt | CHGNet | r2SCAN | 57.75 |
| 4 | Mo | CHGNet | r2SCAN | 51.78 |
| 5 | Fe | CHGNet | r2SCAN | 49.96 |
| 6 | Cr | TensorNet | PBE | 46.08 |
| 7 | Cr | CHGNet | PBE | 45.02 |
| 8 | Cr | TensorNet | r2SCAN | 44.26 |
| 9 | Cr | QET | r2SCAN | 43.88 |
| 10 | Pt | TensorNet | r2SCAN | 40.01 |
| 11 | Nb | M3GNet | r2SCAN | 39.38 |
| 12 | W | CHGNet | r2SCAN | 37.33 |
| 13 | V | CHGNet | r2SCAN | 35.72 |
| 14 | Fe | M3GNet | r2SCAN | 34.91 |
| 15 | V | QET | r2SCAN | 34.48 |

Chromium and the heavier transition metals dominate the high-error tail; these reflect model-form limitations rather than run artifacts.

---

## 5. Reproducibility notes

| Provenance item | Value / observation |
|-------------------|---------------------|
| Execution ID | `layer2-3x3x3-grid-zb76j` (provided by benchmark team) |
| Cloud Run job name | `layer2-3x3x3-grid` |
| Container image | `us-central1-docker.pkg.dev/witching-606c6/lupine-layer2/runner:v1` |
| Region / project | `us-central1` / `witching-606c6` |
| GCS bucket | `lupine-benchmark-witching-606c6` |
| GCS upload path | `gs://lupine-benchmark-witching-606c6/layer2_3x3x3/<element>_<model>_<functional>.json` |
| Git commit (repo state) | `5fd110e63f09a827731e36c880c0ec041c6279d7` — note: the committed summary message references 112 results; the working-tree summary now contains 128 results |
| Benchmark task script | `data/layer2_benchmark_task.py` |
| Job configuration (submission script) | 56 tasks, 4 CPU, 8 Gi memory, 3600 s timeout, max 1 retry (`data/gcp/submit_layer2_jobs.py`) |
| Raw-output schema | `lupine.layer2.raw.v1` |
| Summary schema | `lupine.benchmark.layer2.v1` |

**Caveat:** the raw JSON files do not embed the execution ID, image digest, git commit, or GCS path. Reproducibility therefore depends on the external submission record and bucket contents. Future runs should write a `provenance` block into each raw output.

---

## 6. Limitations and caveats

1. **r2SCAN targets are approximate.** `Tr2SCAN_0K` tensors in `targets_0K.json` are PBE tensors scaled by a scalar bulk-modulus ratio from Liu et al. 2024. Al, Ca, and Sr retain a shift factor of 1.0 because no r2SCAN bulk modulus was available. Headline claims should use the PBE target.

2. **Au reference is PW91-GGA, not PBE.** No stable published PBE cubic Au tensor was recovered; the PW91-GGA values of Wang & Li 2008 are used as the baseline, as documented in `targets_0K.json`.

3. **QET is an alias for TensorNet in MatPES 2025.2.** The four model labels therefore represent three distinct architectures. Any architecture count or ensemble construction must deduplicate QET/TensorNet.

4. **Single seed / no replicates.** Each `(element, model, functional)` combination was run once. Runtime and MAE variance from repeated execution are not captured in this dataset.

5. **Runtime is wall-clock, not core-hour.** `runtime_seconds` is elapsed wall time on Cloud Run tasks configured with 4 CPUs. Core-hour accounting requires an assumption about CPU utilization.

6. **CHGNet runtime is highly variable.** Outliers above the IQR threshold are concentrated in CHGNet. Cost projections that assume uniform timing per model will be inaccurate.

7. **No embedded provenance in raw files.** Each JSON contains scientific outputs plus `runtime_seconds` and `status`. Future runs should add `execution_id`, `image`, `git_commit`, and `gcs_path` fields.

8. **Git commit vs. working tree.** The committed summary (`5fd110e`) still describes 112 results. The audited summary file in the working tree has 128 results. Publication should either commit the updated summary or document the working-tree revision explicitly.

---

## 7. Go / no-go recommendation

### Verdict: **GO for the full 16-element preprint, with caveats.**

The dataset now satisfies the coverage requirement that blocked the previous audit:

- 16 elements, 128 per-functional outputs, all `status: ok`.
- No duplicate keys, no raw/summary mismatches, no missing targets.
- All elastic tensors are mechanically stable; no negative or extreme constants.
- Runtime outliers are model-specific and within timeout.
- The prior preprint's 3×3×3 reference values are reproduced for the overlapping elements.

### Recommended actions before submission

1. Commit the updated `benchmark_layer2_3x3x3_summary.json` (128 results) and this audit report so the repository state matches the audited data.
2. Add provenance metadata (`execution_id`, `image`, `git_commit`, `gcs_path`) to each raw output file in future benchmark runs.
3. Keep the r2SCAN, Au PW91, and QET≡TensorNet caveats in the preprint text and figures.
4. If cost claims are made, report per-model timing distributions rather than a single mean.

No re-runs are required for the 16-element coverage claim. The data are ready to support the full preprint subject to the caveats above.
