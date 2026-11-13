# Zenodo Deposit — published checklist

**Published record:** https://zenodo.org/records/20787874  
**DOI:** https://doi.org/10.5281/zenodo.20787874

The two bundles below were uploaded to Zenodo and the DOI has been propagated
to Paper 1's Data Availability and Paper 2's Reproducibility/Data availability
sections.

## Upload files

1. `replication/error-geometry-zenodo-v2026-06-21.zip` — empirical
   replication kit.
2. `replication/lean-spec-formal-core-v2026-06-21.zip` — tracked Lean source,
   Lake manifest, pinned toolchain, and no `.lake` build cache.

## Bundle contents (all committed in-repo)

- Tier-1/Tier-2 replication kit: `tier1_analyze.py`, `tier2_recompute.py`,
  `harness.py`, `references.py`, `patch_matgl.py`, `requirements.txt`,
  `README.md`, `THEORY.md`, `NOVELTY.md`
- Raw data: `data/cell_*.json` (8 MatPES cells), `data/anchors/*.json`
  (MACE/CHGNet/Orb trio), `data/acwf/*.json` (pinned ACWF code-data),
  `data/classical/manifold_revalidation_42potentials.json` +
  `canonical_numbers.json` (pinned classical PR dataset)
- Analyses: `analyze_acwf_delta_gauge.py`, `robustness_checks.py` (+ results
  JSONs), `tier1_pr_gauge.py` (+ `data/pr_gauge_results.json`),
  `make_fig2_classical.py`
- Pre-registrations: `prereg_functional_vs_architecture_2x2.md` (@dffbe595),
  `prereg_acwf_delta_gauge.md` (@ebf39e33), `prereg_round2.md`
- Lean artifact: `lean-spec-formal-core-v2026-06-21.zip` includes the tracked
  source tree, Lake manifest, and pinned toolchain (77 build-locked theorems
  in `Vision.lean`, ~225 declarations, 0 `sorry`, 0 new axioms)

**Live GCS mirror (already public):** https://storage.googleapis.com/shed-489901-replication/error-geometry/v1-10c18ace/ — add as a related identifier ("is identical to") in the Zenodo form.

## Metadata (paste into Zenodo form)

> **Next version (2026-11-11):** the first deposit's title presented "The
> Projection Law" as a law. Mint a new version with the scoped title and
> description below, and add the failed preregistered Round-2 outcomes (see the
> status note in `README.md`) to the description. `.zenodo.json` carries the
> same scoped metadata.

- **Title:** Replication kit and formal artifact: error geometry of
  interatomic-potential elastic predictions (classical potentials, foundation
  MLIPs, DFT implementations), including failed preregistered follow-ups
- **Authors:** Welcing, Alex (Lupine Science) — ORCID:
  `0009-0002-1602-8545`
- **License:** MIT (code) / CC-BY-4.0 (first-party data and docs); third-party
  source data keep their own terms. The form takes one licence: choose MIT
  and keep the split stated in the description.
- **Keywords:** model ensembles; error geometry; interatomic potentials;
  foundation models; DFT verification; pre-registration; Lean 4
- **Related identifiers:** "is supplement to" → arXiv IDs of Papers 1–2 once
  posted; ACWF source data: 10.24435/materialscloud (Bosoni et al. archive);
  MatPES: arXiv:2503.04070
- **Description:** The preregistered Round-2 3×3×3 follow-up
  (`paper2/ProjectionLaw_Round2.md`) did not reproduce the functional-clustering
  result (H1/H2a kills triggered; H2b and H4 coverage missed their
  thresholds). Two-tier replication kit (Tier 1: every factorial
  statistic from committed raw data, NumPy-only; Tier 2: bit-exact-regression
  harness re-deriving raw elastic constants from public checkpoints), pinned
  datasets, three pre-registrations with commit hashes, referee-driven
  robustness analyses, and the machine-checked Lean 4 theory core.
