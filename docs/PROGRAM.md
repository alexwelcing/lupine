# The Lupine Research Program — Unified State

*Single-page map of the error-geometry research program. Updated 2026-06-21.
Paper status source of truth: `library-site/src/brand.json` → `publication.status`
("in preparation" — never describe any paper as submitted/accepted/published
until that field changes; enforced by `tools/validate_pitch_claims.py`).*

## The law

A model family is a projection operator: every well-fitted member shares one
residual — a single direction in observable space — and that direction
fingerprints whatever constraint binds the family. When a paradigm is replaced,
the anisotropy is conserved and the direction **rotates** to the next
constraint upstream. Corollary: agreement among models sharing a constraint
measures the constraint, not the truth.

## The evidence (three layers, one epistemic stack)

| Layer | Ensemble | Binding constraint | Result | Status |
|---|---|---|---|---|
| Classical interatomic potentials | 559 potentials, 15 metals | functional form | within-family r=0.95; PR invariant 40 yr (median 1.09, pinned dataset); coupled-diagnostic consistency α≈0.98 | observational (Paper 1) |
| Foundation MLIPs | 4 architectures × 2 functionals (MatPES) + 3 anchors | training functional | S_func=+0.317 vs S_arch=−0.093, p=0.029; screened per-element PR median 1.592, max 1.910 | pre-registered @ `dffbe595`, kill condition not triggered |
| DFT implementations | 12 ACWF methods, 384 crystals | pseudopotential table | S_table=+0.526 vs S_code=+0.265, p=0.017; SIESTA = nested basis-set constraint | pre-registered @ `ebf39e33`, kill condition not triggered |

All registered misses are reported as failures (4 of 7 registered predictions; 2/4 and 1/3 passing per experiment; nested-constraint attributions are registered round-2 hypotheses). Referee-driven robustness: ordering survives unscreened; ACWF separation grows without B1/whitened; LOMO out-of-sample correction = 69% median.

## The artifacts

- **Paper 1** (instance): `paper/immi-paper.tex` — corrected post-audit
  manuscript (ecological fallacy per Lean audit T111; Born-screened §4.6;
  verified Table 2). Submission bundle: research workspace
  `complete_package/immi_submission/`. Open items in its SUBMISSION_LOG.
- **Paper 2** (the law): `paper2/projection-law.tex` (PRX master) +
  `paper2/immi/` (IMMI format), 4 figures from kit data
  (`paper2/figures/make_figures.py`), claims governed by
  `replication/error-geometry/NOVELTY.md` (3 adversarial prior-art sweeps);
  venue strategy in `paper2/TARGETING.md`.
- **Formal core**: `lean-spec/.../Theory/{ProjectionLaw, ConvexProjection,
  SpectrumBridge, ErrorGeometry, AffineDecomposition, SmoothProjection,
  FiniteSampleConcentration}.lean` — normal-cone consensus theorem,
  PR gauge derived as theorem, ribbon collapse ≤ 3(d−1)/ρ, ribbon/consensus
  decoupling, affine decomposition, local normal-cone theorem for smooth
  non-convex immersions, and Hoeffding entrywise concentration of the empirical
  second-moment matrix. Current declaration and `sorry` totals are read from
  the reviewed machine inventory at `data/lean-inventory.json`; the build adds
  no new axioms and must remain green.
- **Replication**: `replication/error-geometry/` — Tier 1 (NumPy-only,
  seconds, verifies every headline statistic), screened PR/rank-one-share
  recomputation (`tier1_pr_gauge.py`), and Tier 2 (recompute from public
  checkpoints, bit-exact) are the verification spine; THEORY.md is the
  theorem↔statistic contract.
- **Methodology propagation**: glim-think Causal agent
  (`Causal.v1.md`) enforces Kievit-threshold aggregation-bias classification
  (strict reversal / ecological fallacy / suppression + permutation nulls) —
  the audit's lesson is now machine policy, not just a correction.

## Corrections history (the audit trail)

1. 2026-06-11 audit: Simpson's-paradox → ecological-fallacy (Lean T111);
   Born screening of MLIP tensors (7/45 excluded); Table 2 errata;
   unsupported "14/15 PR<2, Fe outlier" abstract claim removed.
2. Claims hygiene: all public/investor surfaces purged of
   "peer-reviewed / in press / journal-named" status language; validator
   scope extended to deck + raise (commit `353d986`).
3. Science-claims propagation: conjecture ledger "14/15 on-ribbon" →
   *Under re-audit*; Fe-outlier conjecture annotated; public report/catalog/
   llms surfaces corrected; deck rebuilt around the real results
   (commits `f8734ea`, `6548275`). Superseded artifacts quarantined in the
   research workspace `archive/superseded-pre-audit/`.

## Open items (the live queue)

1. DONE 2026-06-21: **Born-screened recomputation** for the committed
   replication-kit foundation-MLIP corpus. `python tier1_pr_gauge.py`
   recomputes all 15 per-element screened PR buckets from raw tensors:
   median PR 1.592, max 1.910, median rank-1 share 0.774. The old
   "14/15 on-ribbon" shorthand remains retired; the citable replacement is
   the screened PR/rank-one-share table in
   `replication/error-geometry/data/pr_gauge_results.json`. Live-ledger
   expansion continues via `mlip-discovery-loop` campaign `github:27618187135`
   (12 agenda tasks queued; Fe/CHGNet stability verdict =
   `inspect_before_promotion`).
2. DONE 2026-06-11: round-2 prereg registered (prereg_round2.md: single primary endpoints, axis statistics, symmetric equivalence-bound kills, DFT-PBE anchor test, harness hardening gate). Execution = round 2.
3. DONE 2026-06-21: PR range settled by pinned dataset (median 1.09, max 2.29; Fig 2 regenerated 600 dpi); companion titles set; academic and adversarial reviews surfaced on library.lupine.science; versioned PDF assets deployed at `/assets/papers/projection-law-v2026-06-16.pdf`; Zenodo DOI minted at `https://doi.org/10.5281/zenodo.20787874`; ORCID filled as `https://orcid.org/0009-0002-1602-8545`.
4. DONE 2026-06-16: 3-referee/adversarial review cycle incorporated; IMMI copy regenerated from the R2 master and local quality gate passes. USER: arXiv + PRX submission clicks after DOI/ORCID and final human read-through.
5. LIVE 2026-06-21: `glim-think` workflow registry, `mlip-discovery-loop` progress, `/ops/smoketest`, and gated `/maintain` all verified against production. Keep local, CI/deploy, live Worker, and public-library truth reported separately on future release passes.
