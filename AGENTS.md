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

## MLIP flywheel telemetry

The Distill flywheel (`tools/mlip_local_promotion.py`,
`tools/mlip_distill_growth_loop.py`) emits per-iteration OTLP traces to Phoenix
through `glim-otlp-relay`. Telemetry is opt-in and never blocks a run; absent
deps or config degrade to a logged no-op.

- Validate the pipeline before trusting a cycle's telemetry:
  `just flywheel-telemetry-check` (dry-run + unit tests). For the live relay, set
  `PHOENIX_OTLP_RELAY_URL` + `PHOENIX_RELAY_TOKEN` and run
  `python tools/mlip_phoenix_trace.py --smoke-test`, then confirm the printed
  marker lands in the `mlip-flywheel` Phoenix project.
- When a cycle runs a flywheel step, pass `--phoenix` (or set
  `PHOENIX_OTLP_RELAY_URL`) so the iteration is traced. Metrics-only: spans carry
  accuracy deltas, speedups, loss, and the recorded verdict — the gate is NOT
  re-evaluated here (it lives in the flywheel and the Lean AccuracyCommitment).
- Known gap: agent cycles that dispatch cloud cells (`mlip_cell_runner.py` →
  `/feed/beats`) do not run these local tools, so cloud-only cycles will not emit
  these traces until emission is added to that path. Treat that as the next wiring
  step, not a passing state.
- Deps: `pip install -r tools/requirements-telemetry.txt`.

## Shell Execution & Environment Hazards (Windows)

When writing automation scripts, deployment orchestrators, or `justfile` configurations on Windows, you must strictly adhere to the following guardrails to prevent system crashes and zombie processes:

1. **Avoid PowerShell for Node/Build Tasks:** Windows PowerShell mishandles Node.js process trees (e.g., `pnpm`, `tsc`, `vitest`) and standard I/O streams, preventing them from cleanly exiting. This leads to hanging or zombie tasks. **Never** use PowerShell as the default shell for these tasks.
2. **Explicit Git Bash Pathing:** To circumvent PowerShell, you must execute complex commands through Git Bash. However, **never** use generic `bash -c` in Python's `subprocess.run` or `justfile` configs. Windows Subsystem for Linux (WSL) installs a stub `bash.exe` in `C:\WINDOWS\system32\` which sits extremely high in the `$PATH`. Calling raw `bash` will inadvertently trigger WSL, which will instantly crash or hang if not fully configured.
3. **The Standard:** Always wrap shell executions explicitly using the absolute path to Git Bash:
   ```python
   subprocess.run(["C:/Program Files/Git/bin/bash.exe", "-c", "pnpm build"], check=True)
   ```
   Or in a `justfile`:
   ```justfile
   set shell := ["C:\\Program Files\\Git\\bin\\bash.exe", "-c"]
   ```
