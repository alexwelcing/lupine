# ADR 0004: Split public surfaces from the science control plane

**Status:** Accepted intent, migration pending

**Date:** 2026-06-17

## Context

The current repo contains four different kinds of work:

- public start-site code for `lupine.science`
- the LUPI viewer at `lupi.live`
- the public Library reader
- the durable science/control-plane system: `glim-think`, Lean proofs, Rust and
  Python Distill runtimes, benchmark runners, evidence, papers, and tools

Keeping all of those in one repo helped early iteration, but it now makes
deploy ownership blurry. The public sites should be independently deployable and
easy to reason about, while the science/control-plane code should stay cohesive
because its value is the closed loop across claims, proofs, benchmarks, and
experiments.

## Decision

Split toward four repos:

| Destination | Purpose |
| --- | --- |
| `lupine.science` | Public program/start site. |
| `lupi.live` | Browser-native molecular viewer, auth, search, saved views, and agent viewer surface. |
| `library.lupine.site` | Public research reader and Library experience. |
| science/control-plane repo | `glim-think`, `lean-spec`, `atlas-distill`, Python Distill packages, MLIP runners, evidence, docs, papers, and experiment tooling. |

The science/control-plane repo remains the source of truth for contracts,
claims, proofs, experiments, and generated public artifacts. Public repos should
consume those artifacts through explicit exports rather than by importing random
paths from the science repo.

The detailed migration map is
[`docs/repo-split-map.md`](../repo-split-map.md).

## Consequences

### Positive

- Each public URL gets its own deploy truth, CI, secrets, and release cadence.
- The science/control-plane repo can stay focused on the closed scientific loop.
- Public repos can be smaller and more understandable to outside collaborators.
- Agent orientation improves: a viewer task starts in `lupi.live`, a reader task
  starts in the Library repo, and Distill/Lean/glim work starts in the
  science/control-plane repo.

### Negative / mitigations

- The Library currently reads source markdown directly from the repo. Mitigate
  by creating a generated content bundle or published artifact before
  extraction.
- The viewer deploy currently packages old research-site output with the viewer
  bundle. Mitigate by separating viewer deploy output from research/static-site
  output before moving `lupi.live`.
- Firebase auth, Firestore rules, API keys, saved views, and viewer functions
  are operationally coupled. Move them with `lupi.live` unless a separate
  platform service is explicitly created.
- Canonical Library URLs currently use `library.lupine.science`, while the
  target split names `library.lupine.site`. Treat this as a deliberate domain
  migration that needs DNS, config, brand, and SEO updates when the new repo is
  live.

## Verification

Each extracted repo must prove:

- local build/check truth
- CI truth
- deploy truth
- live API or public-site truth

The science/control-plane repo continues to use focused gates first:

```powershell
just think-lint
just engine-test
just live-build
```

Lean changes still require `lake build` from inside `lean-spec/`.
