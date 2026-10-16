# Monorepo import verification

On 2026-10-10, the standalone project was imported into `discovery/` on
`research/lupine-discovery` in `alexwelcing/lupine`, at the user's direction.
The import commit preserves the original research history as a merge parent.
Hosting and research-ledger updates follow in a separate commit.

Executed from the relocated directory:

- All 41 engine, replay, and descriptor-audit tests passed with `PYTHONPATH=src`.
- The example certificate verified successfully through the relocated module.
- Every runtime-manifest source hash matched the original checkpoint.
- The Lean source matched the previously compiled source byte for byte.
- Six axiom-audit parser tests passed.
- Fresh Lean elaboration through `audit_axioms.py` passed all 18 theorems,
  permitting only standard logical axioms. Existing pinned dependency build
  artifacts were reused through a temporary local symlink, removed afterward.

The new path-filtered monorepo workflow runs the Python 3.11/3.12 checks and
the standalone Lean gate. Its remote result is separate from these local checks.
No raw archives, build caches, environment files, or temporary symlinks are
included in the import. Existing monorepo engine code is unchanged.
