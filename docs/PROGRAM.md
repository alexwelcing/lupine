# The Lupine Research Program — Unified State

*Single-page map of the error-geometry research program. Updated 2026-06-16.
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
| Foundation MLIPs | 4 architectures × 2 functionals (MatPES) + 3 anchors | training functional | S_func=+0.317 vs S_arch=−0.093, p=0.029; r²SCAN rotation confirmed | pre-registered @ `dffbe595`, kill condition not triggered |
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
  second-moment matrix. 77 build-locked theorems in `Vision.lean`, ~225
  declarations, 0 `sorry`, 0 new axioms; 2891-job `lake build` green.
- **Replication**: `replication/error-geometry/` — Tier 1 (NumPy-only,
  seconds, verifies every headline statistic) and Tier 2 (recompute from
  public checkpoints, bit-exact) both verified; THEORY.md is the
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

1. **Born-screened recomputation** of per-element on-ribbon/PR counts —
   requires the per-element classical error-vector buckets (worker D1
   ledger; not in this checkout). Settles the ledger's re-audit entry and
   the Fe conjecture.
2. DONE 2026-06-11: round-2 prereg registered (prereg_round2.md: single primary endpoints, axis statistics, symmetric equivalence-bound kills, DFT-PBE anchor test, harness hardening gate). Execution = round 2.
3. 2026-06-16: PR range settled by pinned dataset (median 1.09, max 2.29; Fig 2 regenerated 600 dpi); companion titles set; academic review surfaced on library.lupine.science; versioned PDF assets deployed at `/assets/papers/projection-law-v2026-06-16.pdf`. USER: Zenodo DOI (see `replication/error-geometry/ZENODO_DEPOSIT.md` and `.zenodo.json`), ORCID, adversarial multi-agent review pass from `TARGETING.md`.
4. DONE 2026-06-11: 3-referee adversarial review run; revision R2 incorporates all findings (commit f9e1da40). USER: arXiv + PRX submission clicks; IMMI copy of P2 must be regenerated from R2 master first.
5. READY: merge dry-run clean (0 conflicts; 28 ahead / 44 behind). USER: git merge codex/science on main + push → CI deploys corrected deck/library/llms. Eyeball the deck render first (new proof section).
