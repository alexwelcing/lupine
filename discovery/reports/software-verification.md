# Software verification: initial implementation

Executed locally on 2026-10-10 with Python 3.12.14. This is a software verification record, not physical validation.

- `python -m unittest discover -s tests -v`: **41 tests passed**. Includes exhaustive small integer worlds, 500 randomized compatible refinements, residual-cone checks, outcome separation, incomplete truth, identity and scope checks, certificate tampering, duplicate JSON keys, malformed rational inputs, and descriptor-collision error floors.
- The synthetic `select`, `verify`, and `replay` CLI commands completed successfully. The committed example certificate was recomputed after the final evidence-state wording change.
- `python examples/anchored.py` completed: synthetic residual cones retained `query-1`, excluded `query-3`, and returned a conditional regret bound of 1.
- `python -m pip wheel . --no-deps --no-build-isolation --wheel-dir dist` built a wheel successfully. A clean virtual environment installed that wheel with `--no-index --no-deps` and verified the example certificate from outside the source tree.
- Two archived-data pilots ran with NumPy 2.3.5; outcomes and scientific failures are in `archived-v1.json` and `../docs/archived-benchmark.md`.
- `python scripts/descriptor_audit.py` completed a posthoc audit of descriptor collisions in the same pinned archives; it did not modify benchmark settings. See `descriptor-audit.json`.

`runtime-manifest.json` pins final Python source, tests, and benchmark-script bytes. The Lean package has a separate actual execution and axiom record in `../formal/VERIFICATION.md`. The Python tests are not a formal refinement proof from the executable implementation to Lean.

The formal gate's six independent parser tests also passed: `python3 -m unittest test_audit_axioms -v` from `formal/`. They test accepted standard axioms and rejection of admitted proofs, custom axioms, missing output, duplicate output, and unexpected theorem output. These are separate from the 41 engine/replay tests.

At the original standalone checkpoint, a GitHub Actions workflow was configured for Python 3.11/3.12 and the pinned Lean toolchain. It had **not run remotely** at that checkpoint because repository creation was blocked by integration permissions. The project subsequently moved to a Lupine branch; see `monorepo-import.md` and `../HOSTING.md`. Local testing used Python 3.12; Python 3.11 compatibility is configured for CI but has not been executed in this environment.
