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

Use `just verify-light` for fast pre-commit checks, `just verify` for routine
pre-merge validation, and `just verify-heavy` before releases or cloud bursts.
If a broader lint/test target is noisy, bucket the failures by file and cause
instead of flattening them into "fails."

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

## Formal verification (`lean-spec` + ATLAS-Lean)

`lean-spec` (Lake package `OpenDistillationFactory`, Lean `v4.29.0` — pinned to
ATLAS's toolchain) is the evidence layer: it holds the proven theorems behind
the materials-science claims. Treat a green `lake build` with zero `sorry`
proofs as the gate — a broken or `sorry`-bearing proof is a regression, not
noise. Current state: **77 build-locked theorems, ~225 theorem declarations, 0 `sorry`, 2891-job build green**.

- Verify proofs with `lake build` in `lean-spec/`. Never introduce a `sorry`
  into a proof; the only acceptable `sorry` text is inside doc comments that
  describe a separate mathlib-free conjecture project.
- ATLAS-Lean (`facebookresearch/atlas-lean`) is consumed as a pinned Lake
  dependency, not vendored. Keep strict namespace discipline: imported math
  lives under `Atlas.*`, our formalization stays under
  `OpenDistillationFactory.*`.
- Import only the proved `Atlas` target. Do **not** pull in the `Unproved`
  target — it carries `sorry` statements that would poison the gate.
- `lean-spec` is pinned to ATLAS's exact toolchain (`v4.29.0`) and Mathlib rev
  (`8a178386…`) so the whole graph resolves to ONE reproducible Mathlib; ATLAS is
  pinned at `c5a10f1a…`. `lake exe cache get` then hydrates Mathlib from cache
  instead of compiling it. Run lake **from inside `lean-spec/`** so elan selects
  v4.29.0 — running from the repo root picks the global toolchain and silently
  refuses the cache (`lake version … does not match toolchain`), forcing a
  from-source Mathlib build that fails on API drift.
- COST WARNING (hard-won): ATLAS's autoformalized modules elaborate in ~7–9 min
  EACH; importing a whole subject (e.g. `Atlas.RealAnalysis`, ~85 modules) is
  ~80 min and will OOM a dev box. Build theorems on the shared cached Mathlib
  that ATLAS pins to, and reserve direct `Atlas.*` imports for selective single
  leaf modules behind an offline/opt-in target — never a whole subject in the
  hot build path.
- Extend proofs incrementally, module by module (Analysis.Manifold,
  Theory.ParameterBound, Computation.LammpsTrace, Theory.UniversalityBridge).
  Each import must preserve existing theorems and add no `sorry`.

## Closed scientific loop & MLIP benchmarking

The intended spine is a closed loop: TorchSim benchmarks (GCP) → glim-think
hypotheses (CF Durable Objects) → `lean-spec` proofs → tests → back to
simulation. When adding a workflow, wire it into this loop rather than leaving
it standalone.

- Benchmark before distilling: capture a `v0` baseline per model, then compute
  `distill_v_uplift` per distillation version. Promotion through ODF gates on
  uplift (`promote` > +5%, `review` 0–5%, `reject` < 0%) — never promote a
  regression.
- Prefer TorchSim (batched GPU) over serial ASE for MLIP benchmarks; keep a CPU
  fallback so CI degrades gracefully.
- Emit OpenInference spans for the loop stages (TOOL for builds/benchmarks, LLM
  for hypotheses, EVALUATOR for proof checks) through the shared `otlp-relay` to
  Phoenix, reusing the flywheel telemetry path above. Tracing is opt-in and must
  never block a run.

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
   set shell := ["bash", "-c"]
   set windows-shell := ["C:\\Program Files\\Git\\bin\\bash.exe", "-c"]
   ```
   The root `justfile` uses `windows-shell` for the explicit Git Bash path and
   keeps `shell` POSIX for Unix maintainers.

## Lupi viewer agent surface (MCP + API keys)

The Lupi molecular viewer (`atlas/atlas-view`, live at lupi.live) exposes an
agent-drivable surface so Codex / Claude Code can load and inspect molecules
without manual viewer setup.

- **Auth without OAuth:** a signed-in user mints an API key (`lupi_pk_…`); the
  agent POSTs it to `exchangeApiKey` for a Firebase custom token, signs in, and
  then drives the viewer as that user. Full flow + endpoints:
  `atlas/atlas-view/docs/api-keys.md`. Treat the key like a password.
- **Federated search:** the `lupi.search_molecules` MCP tool fans out across six
  sources (saved views, curated library, gallery, NIST, Meta OMol25, PubChem) and
  returns ranked, loadable hits. OMol25 hits carry **real in-house DFT geometry**
  served as GCS-hosted `.xyz` (`gs://shed-489901-omol25`), not a formula guess.
- **Shared library:** signed-in agents can stamp molecules into the public
  `moleculeLibrary` (Firestore) that backs the `library` source.
- Deploys are push-to-`main`: `atlas/**` → viewer (Cloud Run); `functions/**`,
  `firebase.json`, `firestore.rules` → Cloud Functions + Firestore rules.
- Roadmap + milestones: `atlas/atlas-view/docs/lupi-mcp-roadmap.md`.
