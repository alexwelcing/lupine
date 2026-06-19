# Working Path

This repo's durable control-plane work starts in `glim-think/`. Use this file
as the quick route back to a clean working state when the checkout has many
branches, worktrees, or generated experiment folders.

## Canonical Entry Points

| Need | Start here |
| --- | --- |
| New? Pick a track | [`docs/ONBOARDING.md`](./ONBOARDING.md) |
| System architecture map | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Public repo split and migration map | [`docs/repo-split-map.md`](./repo-split-map.md) |
| Research control plane, agenda, claims, evals, traces | `glim-think/` |
| Formal evidence and Lean proof obligations | `lean-spec/` |
| Distill policy/runtime scoring | `atlas-distill/` |
| Python Distill packages (benchmark/uplift/regime/runtime) | `python/` |
| Local MLIP and IMMI evidence runs | `mlip_immi/` |
| LUPI viewer and atomistic inspection | `atlas/atlas-view/apps/web/` |
| Public research/library surface | `library-site/` |
| Root ownership decisions | `ROOTS.md` |

Do not route new viewer work into `lupi-studio`, `lupi-studio-pr`, or
`archive/lupine-start`. Those are retired or scratch surfaces; the canonical
LUPI app is `atlas/atlas-view/apps/web/`.

## Starting New Work

Refresh first:

```powershell
git fetch --prune origin
git worktree prune --dry-run --verbose
```

If the dry run reports only missing worktree metadata, prune it:

```powershell
git worktree prune --verbose
```

For publishable code work, create a clean branch from current `origin/main`:

```powershell
git switch -c codex/<short-topic> origin/main
```

If the current checkout is dirty or another branch is already checked out
elsewhere, prefer a separate worktree:

```powershell
git worktree add -b codex/<short-topic> C:\Users\alexw\Downloads\shed-<short-topic> origin/main
```

Before opening a PR, check that the branch contains only the intended work:

```powershell
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
```

## Focused Verification

Use the focused repo gates first:

```powershell
just think-lint
just engine-test
just live-build
```

Use `just verify-light` for quick pre-commit checks, `just verify` for routine
pre-merge validation, and `just verify-heavy` before releases or cloud bursts.
If a broad target is noisy, bucket failures by file and cause.

For Lean work:

```powershell
cd lean-spec
lake build
```

Run Lean from `lean-spec/` so the pinned toolchain is selected.

For Node, pnpm, Vite, Vitest, and build tasks on Windows, use the repo `justfile`
or explicit Git Bash pathing. Avoid raw `bash -c` and avoid PowerShell as the
shell for long-running Node build tasks.

## Worktree Hygiene

Useful status commands:

```powershell
git worktree list --porcelain
git branch -vv
git status --short --branch
```

Safe cleanup rules:

- `git worktree prune --verbose` is appropriate for metadata that points at
  directories that no longer exist.
- Delete local branches with `git branch -d <branch>` only when they are merged
  into `origin/main` and are not attached to a worktree.
- Keep unmerged branches even when their upstream is gone until their contents
  are reviewed or intentionally archived.
- Preserve dirty files and untracked experiment output unless the owner has
  explicitly asked to remove them.
