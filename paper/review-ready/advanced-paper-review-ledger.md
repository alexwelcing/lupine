# Advanced Paper Review Ledger

Date marked ready for review: 2026-06-09

Source import: `archive/kimi-workspace-export/`

Status meaning: **ready for review** means the manuscript is worth advancing
through human review. It does not mean submission-ready, proven-current, or
publication-approved.

## Paper 3: Lean Verification

File: `paper/review-ready/paper3-lean-verification.tex`

Review status: **Ready for review**

Keep:

- Strong framing around machine-checkable scientific claims.
- The synthetic-vs-empirical distinction.
- The idea of claim audits as build-locked scientific contracts.
- The path from hyper-ribbon structure into ATLAS-Lean and differential
  geometry.

Must review before promotion:

- The manuscript claims Lean 4.8.0 and 112+ theorem statements, while the
  current repo proof surface uses the pinned `lean-spec/` toolchain and must be
  counted from the current build, not from the export text.
- T-number references need a current theorem inventory pass. Do not publish
  T30/T50/T108-style numbering until it is regenerated from the current
  source.
- Claims about real-data validation must be split from synthetic or
  theorem-shaped validation using `docs/formal-proof-ledger.md`.
- Any discussion of ATLAS-Lean should preserve the hot-build warning: selective
  leaf imports only, no whole-subject imports in the normal build path.

Promotion gate:

- `lake build OpenDistillationFactory` passes from `lean-spec/`.
- Zero `sorry` in proof code.
- A current theorem inventory is attached to the manuscript or referenced in
  the review packet.

## Paper 4: Causal Acceleration

File: `paper/review-ready/paper4-causal-acceleration.tex`

Review status: **Ready for review**

Keep:

- The compute-aware abstention framing.
- The weak-form acceleration/refusal direction.
- The explicit empirical-validation protocol.
- The warning that distance-computation overhead can erase acceleration gains.

Must review before promotion:

- The current Lean proof is a scalar weak-form gate, not a full Lipschitz/reach
  formalization.
- The current real early-exit evidence is mixed: MACE-MP-0 medium stop layer 1
  averaged 1.41x with 0.603 eV MAE, stop layer 2 averaged 1.13x with 0.792 eV
  MAE, and the adaptive policy had median speedup 1.00x.
- Any claim of 2x-5x acceleration must be framed as a target or hypothesis
  until deeper-model or production-kernel evidence passes the agenda gates.
- Force-refusal calibration is currently a shape check because the imported
  force-MAE scale is near machine precision.

Promotion gate:

- `python tools\mlip_kimi_evidence.py --check` passes.
- The manuscript cites the real early-exit negative result, not only the
  simulated acceleration result.
- The proof language is synchronized with
  `lean-spec/OpenDistillationFactory/Materials/Theory/WeakAcceleration.lean`.
