# Actual verification record

## Pareto and nonlinear extension

Completed on `2026-10-10` in the Linux x86_64 branch workspace. All commands
below were actually executed successfully against the current sources.

- `lake --wfail build`: passed all three default modules, 770 jobs, no warnings.
- `python3 audit_axioms.py`: independently re-elaborated all three proof modules,
  verified complete per-module output coverage, and passed all 42 theorem audits.
- `python3 -m unittest test_audit_axioms -v`: eleven adversarial audit tests passed,
  including namespace, omitted-theorem, unexpected-print, extra-axiom and
  admitted-source rejection in addition to the output parser checks.
- `lake env lean --version`: Lean `4.29.0`, commit
  `98dc76e3c0a9b856c9b98726b713fb04fab16740`, Release.
- `git -C .lake/packages/mathlib rev-parse HEAD`: exact manifest/config pin
  `8a178386ffc0f5fef0b77738bb5449d50efeea95`.

The current [theorem inventory](theorem-inventory.json) is generated from actual
fresh Lean output, records every theorem's allowed logical dependencies, and
binds each module to its SHA-256. Counts are 18 scalar-selector theorems,
15 Pareto theorems, and 9 interval-enclosure/domain theorems. `AXIOMS.txt` contains
the combined output. Every theorem depends only on `propext`, `Classical.choice`,
and `Quot.sound`; none depends on an admitted proof or a project-specific axiom.

The local build reused the already compiled, pinned dependency graph via an
ignored `.lake/packages` symlink. Both new project modules were freshly compiled;
the audit independently elaborated all three sources. No dependency cache or
local symlink is part of the committed proof package.

Pareto retention is conditional on sound finite real endpoints. Feasible
optima whose interval feasibility is unknown survive, equal optimal vectors
survive, and exclusions require certified feasible strict dominance witnesses.
Refinement preserves those witnesses and shrinks the retained pool. Reciprocal
and division require the whole denominator interval to exclude zero; product
and square have no sign restriction. These results do not establish a Python
refinement, finite physical coverage, or empirical interval soundness.

## Initial scalar verification

Completed at `2026-10-10T06:08:44Z` in the Linux x86_64 project workspace.
The commands below were actually executed and exited successfully.

- `lake build`: completed the initial dependency and proof build, 771 jobs.
- `lake --wfail build`: completed strict current-source verification, 766 jobs;
  the root proof module was rebuilt successfully, with no warnings.
- `python3 audit_axioms.py`: independently re-elaborated the current source with
  `lake env lean LupineDiscovery.lean`; all 18 theorem outputs were present and
  passed the allowed-axiom gate.
- `python3 -m unittest test_audit_axioms -v`: six tests passed, including rejection
  of admitted proofs, custom axioms, missing output, duplicate output, and
  unexpected theorem output, plus acceptance of standard/empty axiom sets.

Lean reported version `4.29.0`, commit
`98dc76e3c0a9b856c9b98726b713fb04fab16740`, Release. The checked-out Mathlib HEAD
was `8a178386ffc0f5fef0b77738bb5449d50efeea95`, exactly the manifest/config pin.
The default Azure cache endpoint was unavailable through the session proxy;
Cloudflare mirror attempts found no usable pinned cache. The imported Mathlib
source graph was therefore compiled rather than assuming cached verification.

The initial `AXIOMS.txt` (now extended by the current audit) held the actual
fresh Lean axiom output. Every one of the 18 theorems
depends only on `propext`, `Classical.choice`, and `Quot.sound`, Lean/Mathlib's
standard logical foundations. No theorem depends on an admitted proof or a
project-specific axiom. Interval soundness, incumbent feasibility, minimizer
existence, and attained best-upper bounds appear as explicit hypotheses where
needed; this audit does not establish their physical validity.

SHA-256 of the verified source `LupineDiscovery.lean`:
`93adb82c8caceb6620285bea612b4c80e4cf11c7da6d1e04b8ba595f43c6c515`.
SHA-256 of the initial output `AXIOMS.txt`:
`39ef006d6d5d3e142b4bfc21706b9c72500a26a712296815ca968b9e18c2ee0a`.
These hashes identify artifacts; they add no mathematical or physical premise.

This record covers the abstract Lean kernel, including the deterministic
same-descriptor error lower bound. It does not claim that the Python runtime is
formally refined from Lean, that any empirical interval is sound, or that the
candidate universe exhausts physical possibilities. The README theorem map
states the precise scope of each guarantee.
