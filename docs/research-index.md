# Deep-Research Reports Index

> **Pruned 2026-06-02.** This file previously catalogued a `glim/`-era layout in which
> the root research docs (`deep-research-report.md`, `ancillary-research-opps.md`,
> `foundational-research.md`, `example-research-papers.md`), the `atlas/*-project-plan.md`
> product plans, and the `atlas/*.jsx` presentation artifacts all lived — **all of those
> files have since been removed**, so their sections were deleted here to stop pointing at
> ghosts. What remains is the genuinely live content: the external **deep-research
> reviews** under `docs/`.
>
> For the **science**, start at [`navigation.md`](./navigation.md). For the **engineering /
> control plane**, see [`engineering/README.md`](./engineering/README.md).

These are imported technical reviews (each distilled from a longer external report) that
inform the GLIM / Lupine Science program. They are background reading, not primary claims —
the claims live in [`conjectures/ledger.md`](./conjectures/ledger.md).

## Multi-fidelity, UQ & ensembles
- [`multi_fidelity_uq_glimMER_report.md`](./multi_fidelity_uq_glimMER_report.md) — cross-potential
  meta-analysis and systematic bias correction; the "glimMER" PCA-of-errors correction idea.
- [`bayesian_active_learning_report.md`](./bayesian_active_learning_report.md) — Gaussian-process
  surrogates and active learning for potential selection at scale.
- [`weather_climate_ensembles_report.md`](./weather_climate_ensembles_report.md) — multi-model
  ensemble-weighting strategies ported from climate science.

## Error prediction & topology
- [`gnn_error_prediction_report.md`](./gnn_error_prediction_report.md) — GNNs predicting where a
  potential fails from local chemical environment.
- [`tda_error_landscapes_report.md`](./tda_error_landscapes_report.md) — persistent homology of
  high-dimensional error surfaces.

## Benchmarking & physical models
- [`phonon_benchmarking_report.md`](./phonon_benchmarking_report.md) — phonon spectra as a
  "gold standard" validation; executive summary in [`KEY_FINDINGS_SUMMARY.md`](./KEY_FINDINGS_SUMMARY.md).
- [`rg_coarsegraining_report.md`](./rg_coarsegraining_report.md) — renormalization-group coarse-graining
  for deriving effective potentials.

## Theory & information
- [`sloppy_models_report.md`](./sloppy_models_report.md) — Fisher-information eigenvalue analysis;
  stiff vs. sloppy directions (the mathematical background for the hyper-ribbon — see
  [`science/objects.md`](./science/objects.md)).
- [`info_theoretic_report.md`](./info_theoretic_report.md) — Kolmogorov complexity, rate-distortion,
  and entropy applied to model selection.

## Program context
- [`funding_landscape_report.md`](./funding_landscape_report.md) — federal materials-informatics /
  UQ funding landscape (2025–2026).

> Note: three `docs/EXTRACTION_*.md` files are one-time content-extraction *process logs* (with
> dead `/sessions/...` paths) that are still listed in the public catalog
> (`library-site/scripts/catalog.js`). Whether they belong on the public site is a content
> decision, flagged in [`decisions/0002-documentation-architecture.md`](./decisions/0002-documentation-architecture.md) §5,
> not changed here.
