# Maintainer Handbook

This guide is for maintainers of the Lupine Science monorepo. It covers the
mechanics of keeping the repository healthy, consistent, and aligned with the
closed scientific loop.

## Table of contents

- [Cutting a release](#cutting-a-release)
- [Archiving a root](#archiving-a-root)
- [Adding an ADR](#adding-an-adr)
- [Escalation paths](#escalation-paths)
- [Windows operational notes](#windows-operational-notes)

---

## Cutting a release

The repo does not ship a binary product; a "release" is a pinned, reproducible
checkpoint of the evidence spine.

1. **Open a release prep branch** named `release/YYYY-MM-DD`.
2. **Version bump**:
   - Update the top-level version string in any manifest that changed
     (`glim-think/package.json`, `library-site/package.json`, `python/pyproject.toml`,
     `atlas-distill/Cargo.toml`, `lean-spec/lakefile.toml`).
   - Keep versions loosely synchronized; the root does not have a single package
     version, but the CHANGELOG date is the public checkpoint.
3. **CHANGELOG entry**:
   - Add a new top-level section to [`CHANGELOG.md`](../CHANGELOG.md) with the
     release date.
   - Include **Why**, **What**, **Results**, and **Next** for every notable
     change or correction.
   - Mark retracted or bounded claims explicitly.
4. **Run the local gates**:
   ```bash
   just verify
   ```
   If the change touched formal proofs, also run `lake build` inside `lean-spec/`.
5. **Open a PR** using the pull-request template and get at least one review.
6. **Merge to `main`**.
7. **Tag the checkpoint**:
   ```bash
   git tag -a checkpoint/YYYY-MM-DD -m "Checkpoint: <one-line summary>"
   git push origin checkpoint/YYYY-MM-DD
   ```

Do not rewrite public tags. If a checkpoint is bad, cut a new one and document
the correction in CHANGELOG.

---

## Archiving a root

Roots are tracked in [`ROOTS.md`](../ROOTS.md). Archiving means the root is no
longer actively maintained but is preserved for reproducibility.

1. **Open an issue** explaining why the root is being archived and where its
   responsibilities move.
2. **Update `ROOTS.md`**:
   - Move the root entry to the "Archived" section.
   - Set its status to `archived` and record the archive date.
   - Add a pointer to the replacement root or workflow.
3. **Add an ADR** in `docs/decisions/` describing the archive decision and any
   migration path.
4. **Freeze CI** for the archived root:
   - Remove or disable path-filtered workflows that target only the archived
     root.
   - Keep the source code readable; do not delete evidence unless required by
     policy.
5. **Update CHANGELOG.md**.
6. **Run `just verify`** to ensure the archive change did not break active roots.

---

## Adding an ADR

Architecture Decision Records live in `docs/decisions/`.

1. **Pick the next number**: look at existing files (`ADR-0002-*.md` → `ADR-0003`).
2. **Create `docs/decisions/ADR-XXXX-short-title.md`** using this structure:
   - **Status**: proposed / accepted / superseded by ADR-YYYY
   - **Context**: what forced the decision
   - **Decision**: the exact choice
   - **Consequences**: what becomes easier, harder, or impossible
   - **References**: issues, claims, or ledger entries
3. **Update `docs/decisions/README.md`** (or `docs/decisions/index.md`) to list
   the new ADR.
4. **Link from affected roots**: if the ADR changes ownership or boundaries,
   update `ROOTS.md` and any relevant READMEs.

ADRs are lightweight; prefer one per decision over omnibus documents.

---

## Escalation paths

### Verification tiers

Choose the gate that matches the risk and cost of your change:

- **`just verify-light`** — fastest pre-commit gate. Runs Python unit tests,
  Rust `cargo check`, and diff hygiene. No optional deps, no GPU, no cloud.
- **`just verify`** — routine pre-merge gate. Adds Rust `cargo test` and the
  tools smoke tests (regime filter + runtime). Still no GPU/cloud.
- **`just verify-heavy`** — run before releases or cloud bursts. Adds Python
  integration tests, Rust clippy, the Lean `lake build`, and leaves room for
  the MLIP backend smoke matrix. This can take minutes to hours depending on
  toolchain cache and local hardware.

### When to run `lake build`

Run `lake build` from inside `lean-spec/` when:

- Any `lean-spec/` source file changes.
- An ADR or claim references a formal theorem.
- A benchmark result is being promoted to "proved" status.

A green `lake build` with zero `sorry` proofs is required before any
proof-related PR merges. Never import the `Unproved` ATLAS target.

### When to engage cloud burst

Engage GCP cloud burst only when:

- The workload needs GPUs or large-scale compute that local hardware cannot
  provide.
- The result must be reproducible on standard cloud hardware.
- The local gate has already passed (`just verify` or focused equivalent).

Cloud runs should write results back to the evidence ledger and GCS lake, not
just local files. See `gcp/mlip-cell-runner/` and `tools/mlip_evidence_campaign.py`.

### When to open an issue vs. a PR

- Open an issue for a scientific claim, refutation, or design question.
- Open a PR for a concrete, bounded change. Larger changes should come with an
  issue or ADR first.

---

## Windows operational notes

Most maintainers run the repo on Windows. The root `justfile` is the canonical
way to avoid shell hazards.

### Git Bash is the default shell for Node/build tasks

The `justfile` sets:

```justfile
set shell := ["bash", "-c"]
set windows-shell := ["C:\\Program Files\\Git\\bin\\bash.exe", "-c"]
```

This means:

- On Windows, `just` recipes run through Git Bash, not PowerShell.
- On Unix, they run through `bash`.

### PowerShell pitfalls

Do **not** use PowerShell as the default shell for `pnpm`, `npm`, `tsc`,
`vitest`, or `cargo` when invoked directly. Windows PowerShell mishandles Node
process trees and leaves zombie tasks. If you must run a PowerShell script
(such as `scripts/bootstrap.ps1`), invoke `powershell.exe` explicitly from
inside a Git Bash recipe.

### Avoid bare `bash`

Windows ships with a WSL stub `bash.exe` in `C:\WINDOWS\system32\`. A bare
`bash -c` call can trigger WSL and hang or crash. Always use the explicit path
`C:\Program Files\Git\bin\bash.exe` when spawning bash from Python or another
script.

### Path separators

- Use forward slashes in Git Bash and in `justfile` strings.
- In PowerShell scripts, keep backslashes but escape them as needed.

### Verification order on Windows

```powershell
# Fast local gate
just verify

# Control-plane focused gate (runs through Git Bash)
just think-lint
just live-build

# Formal layer (run from inside lean-spec/)
cd lean-spec
lake build
```

If `just verify` fails, do not escalate to cloud burst or formal proofs until the
local gate is green.
