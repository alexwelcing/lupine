# Architectural Decision Records

We record significant architectural and ownership decisions here so new contributors can understand *why* the repo is shaped the way it is.

| ADR | Date | Title | Status |
| --- | --- | --- | --- |
| [0001](./0001-r2-over-bandwidth-alliance.md) | 2026-05-XX | R2 over Bandwidth Alliance | Accepted |
| [0002](./0002-documentation-architecture.md) | 2026-05-XX | Documentation architecture | Accepted |
| [0003](./0003-distill-ownership.md) | 2026-06-12 | Consolidate Distill ownership into `atlas-distill/` + `python/` | Accepted |
| [0004](./0004-public-surface-repo-split.md) | 2026-06-17 | Split public surfaces from the science control plane | Accepted intent, migration pending |

## When to write a new ADR

Add an ADR when a decision:

- Creates, removes, or re-tags a top-level root.
- Changes the boundary between two roots.
- Introduces a new dependency or build step that every contributor needs to know.
- Resolves a long-running ambiguity about where code should live.

ADRs are lightweight. One page, one decision, one accepted/rejected/superseded status.
