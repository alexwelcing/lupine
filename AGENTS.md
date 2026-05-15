# Agent Operating Rules

This repo is organized around `glim-think` as the durable intelligence control
plane. Treat it as the primary system unless the task explicitly points
elsewhere.

## Autonomy

- Prefer implementing, running checks, and reporting concrete outcomes.
- Spin up local dependencies when needed; do not stop at a missing install.
- Keep working through mechanical lint/test failures when the next fix is clear.
- Separate inherited repo noise from regressions introduced by the current work.
- Preserve user changes and do not revert unrelated files.

## Organization

- Keep marketing and launch-site code out of the tree.
- Prefer fewer top-level concepts: control plane, live ops, engines, evidence,
  and tools.
- Add abstractions only when they make the control plane more capable or make
  verification easier.
- When adding a new workflow, connect it to the durable agenda or ledger.
- Route compute through the resource fabric: Cloudflare for control, local GPU
  first for heavy work, GCP only for burst or reproducible cloud runs.

## Verification

Use focused checks first:

```powershell
just think-lint
just engine-test
just live-build
```

Use `just verify` for the future spine. If a broader lint/test target is noisy,
bucket the failures by file and cause instead of flattening them into "fails."
