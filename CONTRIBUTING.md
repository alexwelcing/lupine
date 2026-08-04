# Contributing to Lupine Science

This repo is a public research program, not a product page. Contributions can be code, benchmarks, claims, refutations, proofs, or documentation. The only requirement is that the contribution is inspectable, reproducible, and connected to the evidence ledger.

## Kinds of contribution

| Contribution | Entry point | Review criteria |
| --- | --- | --- |
| Scientific claim | `docs/templates/publication.md` | Evidence, status, confounders, next test |
| MLIP benchmark | `python/lupine_distill/` | Unit tests pass, uplift computed, regime gate applied |
| Distill policy / geometry | `atlas-distill/src/` | `cargo test`, no clippy warnings |
| Formal proof | `lean-spec/OpenDistillationFactory/Materials/` | `lake build` green, zero `sorry` |
| Agent workflow | `glim-think/src/` | `just think-lint`, tests pass |
| Public docs / Library | `docs/` or `library-site/` | Accurate, no marketing copy, no duplicate surfaces |

## Workflow

1. **Open an issue or claim first** unless the change is trivial. Use `docs/templates/publication.md` for scientific claims.
2. **Work in a feature branch**. The repo is local-only; do not force-push shared history.
3. **Run the focused gate** for every root you touch (see [`docs/ONBOARDING.md`](./docs/ONBOARDING.md)).
4. **Update the ledger**:
   - `CHANGELOG.md` for user-visible changes and corrections.
   - `ROOTS.md` if you add, remove, or re-tag a root.
   - `docs/decisions/` if you change architecture or ownership.
   - `docs/conjectures/ledger.md` if you change a claim's status.
5. **Keep the diff minimal**. Do not refactor unrelated code.
6. **No `sorry` in proofs** except inside doc comments describing a separate conjecture project.

## Verification commands

```bash
# Full future-spine gate (use Git Bash on Windows)
just verify

# Focused gates
just think-lint
just engine-test
just live-build

# Python packages
cd python && python -m pytest -m unit -q

# Rust engine
cargo test --manifest-path atlas-distill/Cargo.toml --bin atlas-distill
cargo clippy --manifest-path atlas-distill/Cargo.toml --bin atlas-distill -- -D warnings

# Lean proofs
cd lean-spec && lake build

# Whitespace / diff hygiene
git diff --check
```

## Windows guardrails

- **Never use PowerShell as the default shell for Node/build tasks.** It mishandles process trees and creates zombies.
- **Use the explicit Git Bash path.** The root `justfile` already does this.
- If you call `bash` from Python, use `C:/Program Files/Git/bin/bash.exe`, not a bare `bash` (which can hit the WSL stub).

## Root ownership

If your change touches more than one root, read [`ROOTS.md`](./ROOTS.md) first. The rule is: one root, one owner. When in doubt, ask in the issue/claim before restructuring.

## Style

- Python: type hints, frozen Pydantic models, `from __future__ import annotations`.
- Rust: standard `cargo fmt` + clippy.
- TypeScript: the `glim-think` lint rules.
- Markdown: hard-wrap prose for readability, no trailing whitespace.

## Questions?

- System map: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- Research corpus map: [`docs/navigation.md`](./docs/navigation.md)
- Root ledger: [`ROOTS.md`](./ROOTS.md)
