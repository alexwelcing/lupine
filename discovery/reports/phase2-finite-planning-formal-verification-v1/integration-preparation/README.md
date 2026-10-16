# Prospective finite-planning formal integration overlay

This is an ignored six-file copy set based on clean published source
`9d1f21dae141a28db378ee2e16aa83340df57877`. No tracked integration, all-module
build, fresh axiom audit, or parser-test run was performed in this preparation.
The separate candidate compilation and independent review retain their own
receipts and scope.

`copyset.json` gives exact source/destination paths, byte counts, hashes, and
the original hashes for edited files. The overlay contains:

- The unchanged held `formal/LupineFinitePlanning.lean`, SHA-256
  `391b03aefda0f7bac5bd380347b81febc8a4ebbd329ae3a099981784803973bd`.
- `formal/lakefile.toml`, adding only the eleventh default target and its
  `lean_lib` entry. All existing targets remain in their original order.
- `formal/README.md`, adding the theorem map, exact premises and limitations.
- `formal/history/README.md`, describing the new historical copies.
- Exact historical copies of the current ten-module, 130-statement inventory
  and axiom output under `formal/history/pre-finite-planning-*`.

The historical inventory SHA-256 is
`834a14198ce1f8d52d4ba33871c143d7c76246cfd81b736109a6de78798acc40`;
the historical output SHA-256 is
`84a9ed0c9cf6acc58ea2a9a196ec46cd8f1b69b0d1dd79fd041b0c37291065f1`.
Both were checked against exact Git bytes at the stated checkpoint and current
worktree bytes. The inventory's combined-output hash and all ten module source
hashes also matched. `baseline.json` records those checks and pins the unchanged
toolchain, manifest, audit parser, parser tests, and verification document.

Root integration sequence, after independent review acceptance:

1. Recheck the baseline hashes against current source, accounting explicitly
   for any later unrelated commit. Do not overwrite intervening edits.
2. Preserve the two exact historical receipts and their history documentation
   before the fresh audit overwrites current receipts. Promote all six copy-set
   files without changing the held proof source.
3. In `discovery/formal`, run `LEAN_NUM_THREADS=1 lake --wfail build`, then
   `LEAN_NUM_THREADS=1 python3 audit_axioms.py`, then
   `python3 -m unittest test_audit_axioms -v`. Retain the actual commands, source
   bindings, stdout/stderr, exit codes, and first failures. No dependency or
   toolchain change is part of this overlay.
4. Require the fresh audit to cover all eleven modules. The expected count is
   143 statements (130 existing plus 13 new), but only actual audit output can
   establish that result. Require all eleven existing parser tests to pass.
5. Update `formal/VERIFICATION.md` and release/report evidence with those actual
   outcomes; inspect the newly generated inventory and axiom output before
   publishing. This overlay deliberately supplies neither replacement current
   receipt nor a prewritten successful verification claim.

The only new mathematical scope is finite fixed-frame counting and exact
rational null arithmetic. No Python refinement, evaluation-size monotonicity,
minimum-search-loop guarantee, sampling attestation, or physical/future risk
claim is added. G20/G21 deferral and all diagnostic/scientific negative evidence
remain unchanged.
