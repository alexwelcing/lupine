# Published-data retrospective replay

This experiment ran on two real Matbench v0.1 experimental-property archives. It is an evaluation of a conditional selector with imperfect empirical intervals, not a discovery of new material, a DFT calculation, a reproduction of official Matbench cross-validation, or a physical certificate. Both datasets contain test outcomes outside their predicted intervals. The simultaneous soundness premise required by optimizer-retention mathematics is therefore **refuted in both archives**.

## Frozen protocol

Before accessing target columns, the script parses formulas, computes exact normalized elemental fractions, and fixes composition-group assignments using SHA256 with seed `lupine-archived-v1-2026-10-10`. Buckets 0–59 train, 60–79 calibrate, and 80–99 test. Identical normalized compositions stay together. Unsupported formula syntax would be excluded before target access and listed; the actual run excluded zero rows. The script records the entire target-free row/split manifest digest. This deterministic split is an independently specified retrospective protocol; outcomes already existed publicly, and this is not a prospective blind trial.

The surrogate is fixed at k=5 nearest neighbors in Euclidean distance between stoichiometric fraction vectors, unweighted neighbor target mean, with deterministic ID tie order and predictions rounded to eight decimal places. No target labels select these parameters or the split. Training outcomes fit the surrogate. Calibration outcomes alone set an absolute-error radius using the conformal-style order statistic `ceil((n+1)*(1-alpha))` at alpha=0.1. A rank exceeding n is rejected rather than clamped. Test outcomes enter only the subsequent audit. NumPy accelerates the numerical surrogate; the selector uses exact Fraction endpoints constructed from serialized decimals and rounded predictions. These rational representations do not make the archived experiments physically exact.

A conventional split-conformal theorem provides marginal coverage only under its exchangeability assumptions. Our deterministic composition-group split can correlate rows and does not establish row exchangeability. We therefore label these intervals **empirical conformal-style calibration**, without a claimed marginal probability guarantee. Even a valid per-row marginal guarantee would not establish simultaneous coverage of all candidates or sound optimizer screening.

For band gaps the objective is to minimize experimental gap in eV. For steels it is to minimize negative experimental yield strength in MPa, equivalent to maximizing yield strength. There are no feasibility constraints: every finite-archive candidate is feasible. This choice tests score screening and does not describe application suitability. Baselines use nominal prediction order or a fixed seeded hash random order. Their same-budget pools use exactly the retained pool size; top-one baselines show the incumbent comparison. No top-k truncation enters the certified selector.

## Actual results

Executed with Python 3.12 and NumPy 2.3.5 in this workspace. Each test archive was audited completely.

| Measure | Experimental band gap | Steel yield strength |
|---|---:|---:|
| Published rows | 4,604 | 312 |
| Train / calibration / test | 2,803 / 913 / 888 | 190 / 54 / 68 |
| Calibration radius | 1.466 eV | 296.94 MPa |
| Empirical test containment | 799/888 (89.98%) | 62/68 (91.18%) |
| All test intervals contain truth | false | false |
| Retained pool | 842/888 (94.82%) | 3/68 (4.41%) |
| All true minimizers retained | false | true |
| Some true minimizer retained | true | true |
| Incumbent true regret | 0 eV | 0 MPa |
| Conditional regret bound | 2.932 eV | 593.88 MPa |
| Observed incumbent obeys bound | true | true |
| Nominal same-budget best regret | 0 eV | 0 MPa |
| Random same-budget best regret | 0 eV | 1,123.1 MPa |
| Nominal top-one regret | 0 eV | 0 MPa |
| Random top-one regret | 0 eV | 1,260.9 MPa |

The steel surrogate ranks the archive optimum first, and the interval pool offers no improvement in this run over nominal top-one ranking. Band-gap minimization has many zero-gap ties, so finding one optimum is weak evidence: screening actually discards true minimizers. Its pool is also nearly the entire test archive. Both tasks demonstrate why successful observed incumbent regret must not be substituted for simultaneous interval soundness. These two fixed runs do not establish superiority to random ranking across repetitions or domains. The report includes every uncovered test ID, optimum counts, and all baseline pool metrics; no misses are hidden.

## Reproduction and artifacts

From the repository root:

```sh
PYTHONPATH=src python scripts/archived_benchmark.py --output .cache/archived-results.json
PYTHONPATH=src python -m unittest discover -s tests -p 'test_archived_benchmark.py'
```

Install the optional NumPy dependency for the benchmark if absent. Downloads remain in ignored `.cache`; the generated aggregate audit JSON is also preserved at `reports/archived-v1.json`. Bulk archives are not redistributed. The script checks pinned compressed-byte SHA256 hashes before reading data. Cached corruption fails closed. The original Materials Project download host returned HTTP 403 here; the successful run uses the Matbench repository's published artifact mirror at commit `936176db18ca4cd7b38cbd957c017a5bac770c6b`.

| Archive | Compressed-byte SHA256 |
|---|---|
| [matbench_expt_gap.json.bz2](https://raw.githubusercontent.com/hackingmaterials/matbench/936176db18ca4cd7b38cbd957c017a5bac770c6b/scripts/artifacts/matbench_expt_gap.json.bz2) | `11d79ac6f2c25e23a136295e9bc37ea9ea4a9fa936c6bc366e777c1cb1c397b9` |
| [matbench_steels.json.bz2](https://raw.githubusercontent.com/hackingmaterials/matbench/936176db18ca4cd7b38cbd957c017a5bac770c6b/scripts/artifacts/matbench_steels.json.bz2) | `f62ab2e43009e58bdeb3cb83637359e163e065caaf9fe309fab9bb8c7ad54aac` |

Target-free manifest SHA256:

- Gap: `1dfcc1b5adb6dae8544341a75240969a8ab446d24a67682a34eb3df0975e178c`.
- Steel: `95773510a25a5c15dd5320fabbefccf98776ffbde6aa4cb6fa0a3d20fedf2530`.

Tests check nested formula normalization and equivalent composition grouping, target-independent split freezing and exclusion, and the finite-sample quantile boundary. Those software checks do not verify physical truth or independence of published source measurements.

## Sources and licensing

- Dunn et al., *Benchmarking materials property prediction methods: the Matbench test set and Automatminer reference algorithm*, npj Computational Materials 6, 138 (2020), [DOI:10.1038/s41524-020-00406-3](https://doi.org/10.1038/s41524-020-00406-3).
- Zhuo, Mansouri Tehrani, and Brgoch, *Predicting the Band Gaps of Inorganic Solids by Machine Learning*, J. Phys. Chem. Lett. 9, 1668–1673 (2018), [DOI:10.1021/acs.jpclett.8b00124](https://doi.org/10.1021/acs.jpclett.8b00124). Matbench describes composition deduplication and removal of inconsistent gap reports spanning more than 0.1 eV, with a representative measured value assigned to retained compositions.
- Steel provenance in Matbench metadata: Citrine Informatics, *Mechanical properties of some steels*, [Citrination dataset 153092](https://citrination.com/datasets/153092/). The downloaded metadata supplies this dataset reference rather than a verified primary-paper citation; its primary publication provenance remains unresolved.
- Source descriptions and original download hashes: [matminer metadata](https://github.com/hackingmaterials/matminer/blob/master/matminer/datasets/dataset_metadata.json). Artifact bytes above use a different compression and therefore different hashes.

The Matbench repository has an [MIT software license](https://github.com/hackingmaterials/matbench/blob/936176db18ca4cd7b38cbd957c017a5bac770c6b/LICENSE), copyright 2021 Hacking Materials Research Group. This does not establish upstream experimental dataset licensing. Dataset-specific reuse and redistribution permissions from the original band-gap supplement and Citrination source were not verified and are recorded as unknown. This project publishes its method, citations, hashes, and aggregate results; it does not bundle those data.
