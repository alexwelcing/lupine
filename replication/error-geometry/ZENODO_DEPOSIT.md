# Zenodo Deposit — ready-to-upload checklist

**One user action required:** create the deposit at zenodo.org (needs Alex's
account), upload the bundle below, mint the DOI, then replace
`10.5281/zenodo.XXXXXX` in Paper 1's Data Availability and add the DOI to
Paper 2's Reproducibility section.

## Bundle contents (all committed in-repo; zip `replication/error-geometry/` wholesale)

- Tier-1/Tier-2 replication kit: `tier1_analyze.py`, `tier2_recompute.py`,
  `harness.py`, `references.py`, `patch_matgl.py`, `requirements.txt`,
  `README.md`, `THEORY.md`, `NOVELTY.md`
- Raw data: `data/cell_*.json` (8 MatPES cells), `data/anchors/*.json`
  (MACE/CHGNet/Orb trio), `data/acwf/*.json` (pinned ACWF code-data),
  `data/classical/manifold_revalidation_42potentials.json` +
  `canonical_numbers.json` (pinned classical PR dataset)
- Analyses: `analyze_acwf_delta_gauge.py`, `robustness_checks.py` (+ results
  JSONs), `recompute_born_filtered.py`, `make_fig2_classical.py`
- Pre-registrations: `prereg_functional_vs_architecture_2x2.md` (@dffbe595),
  `prereg_acwf_delta_gauge.md` (@ebf39e33), `prereg_round2.md`
- Lean artifact: tag `lean-spec` at the current commit; include the five
  core theory files or the repo tarball (77 build-locked theorems in
  `Vision.lean`, ~225 declarations, 0 `sorry`, 0 new axioms)

**Live GCS mirror (already public):** https://storage.googleapis.com/shed-489901-replication/error-geometry/v1-10c18ace/ — add as a related identifier ("is identical to") in the Zenodo form.

## Metadata (paste into Zenodo form)

- **Title:** Replication kit and formal artifact: The Projection Law —
  error geometry of model ensembles (classical potentials, foundation MLIPs,
  DFT implementations)
- **Authors:** Welcing, Alex (Lupine Science) — ORCID: [fill before minting]
- **License:** MIT (code) / CC-BY-4.0 (data+docs)
- **Keywords:** model ensembles; error geometry; interatomic potentials;
  foundation models; DFT verification; pre-registration; Lean 4
- **Related identifiers:** "is supplement to" → arXiv IDs of Papers 1–2 once
  posted; ACWF source data: 10.24435/materialscloud (Bosoni et al. archive);
  MatPES: arXiv:2503.04070
- **Description:** Two-tier replication kit (Tier 1: every factorial
  statistic from committed raw data, NumPy-only; Tier 2: bit-exact-regression
  harness re-deriving raw elastic constants from public checkpoints), pinned
  datasets, three pre-registrations with commit hashes, referee-driven
  robustness analyses, and the machine-checked Lean 4 theory core.
