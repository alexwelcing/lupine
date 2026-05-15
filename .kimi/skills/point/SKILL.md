---
name: point
description: "Master execution protocol for the Kimi agent on the glim repository. Point is the unified dispatch surface for builds, tests, research, distillation, and deployment."
user-invocable: true
emoji: "🎯"
homepage: https://github.com/alexwelcing/lupine
tags:
  - point
  - dispatch
  - master-protocol
  - glim
  - kimi-branch
---

# point — Master Execution Protocol

## Purpose

Point is the single command surface that the Kimi agent uses to execute any significant operation in the repository. It abstracts subsystem complexity into a uniform CLI so the operator can say "run Point" and the agent knows exactly what to do.

When the operator says **"run Point"** without qualifiers, execute `point status` first, then await further instruction.

## Subcommands

### `point status`

Full repository health check. Reports:
- Git branch and dirty state
- Rust workspace build status (quick `cargo check`)
- Lean spec build status (`lake build`)
- Web viewer build status (pnpm lockfile check)
- Python environment status (tools/ venv check)
- Pending research items (from glim-think, if reachable)
- Last commit message and timestamp

**Implementation:**
```powershell
# scripts/point.ps1 status
```

### `point build [--subsystem <name>]`

Build a subsystem or the entire repo.

| Subsystem | Build Command |
|-----------|--------------|
| `atlas-distill` | `cd atlas-distill && cargo build --release` |
| `lupine-distill` | `cd lupine-distill && cargo build --release` |
| `distill-cli` | `cd distill-cli && cargo build --release` |
| `lupine-ops` | `cd lupine-ops && cargo build --release` |
| `atlas-view-native` | `cd atlas-view-native && cargo build --release` |
| `atlas-tui` | `cd atlas-tui && cargo build --release` |
| `atlas-view` | `cd atlas/atlas-view && pnpm install && pnpm build` |
| `lupine-start` | `cd lupine-start && pnpm install && pnpm build` |
| `library-site` | `cd library-site && npm install && npm run build` |
| `glim-think` | `cd glim-think && wrangler deploy --dry-run` |
| `lean-spec` | `cd lean-spec && lake build` |
| `distiller` | `cd distiller && pip install -r requirements.txt` |
| `paper` | `cd paper && make figures` |
| `all` | Run all of the above in dependency order |

### `point test [--subsystem <name>]`

Run tests for a subsystem.

| Subsystem | Test Command |
|-----------|-------------|
| `atlas-distill` | `cd atlas-distill && cargo test` |
| `lupine-distill` | `cd lupine-distill && cargo test` |
| `distill-cli` | `cd distill-cli && cargo test` |
| `lupine-ops` | `cd lupine-ops && cargo test` |
| `atlas-view-native` | `cd atlas-view-native && cargo test` |
| `atlas-tui` | `cd atlas-tui && cargo test` |
| `lean-spec` | `cd lean-spec && lake build` (Lean tests are builds) |
| `tools` | `cd tools && python -m pytest test_glim.py -v` |
| `distiller` | `cd distiller && python -m pytest tests/ -v` (if tests exist) |
| `all` | Run all test suites |

### `point research <query>`

Dispatch a research query through the glim-think worker.

```bash
cd tools
python glim.py ask "$query" --asked-by kimi
```

### `point distill`

Run the Open Distillation Factory MVP.

```bash
bash scripts/competition/run_mvp.sh
```

### `point inventory`

Update the repository inventory and skill registry. Re-scans:
- All subsystems for new files/packages
- All skills (global, local, Kimi-specific)
- Build artifacts and cache states
- Updates `.kimi/skills/glim-repo/SKILL.md` if structural changes detected

### `point hive --query <query>`

Activate the local Lupine Hermes Hive — dispatch multi-model research squad.

```bash
# Full squad activation
python tools/hive.py run --squad --query "$query"

# Specific agents
python tools/hive.py run --profiles manifold,causal --query "$query"
```

This runs Hermes agents in parallel (Manifold, Causal, Theorist, Experiment),
collects outputs into the SQLite kanban, and posts a consolidated beat to
the glim-think swarm.

### `point deploy <target>`

Deploy to cloud targets without git push.

| Target | Command |
|--------|---------|
| `glim-think` | `cd glim-think && wrangler deploy` |
| `library-site` | `cd library-site && gcloud builds submit` |
| `lupine-start` | `cd lupine-start && gcloud builds submit` |
| `atlas-distill` | `cd atlas-distill && gcloud builds submit` |

## Usage Examples

```bash
# Check everything
point status

# Build the Rust scientific engine
point build --subsystem atlas-distill

# Run all Rust tests
point test --subsystem atlas-distill

# Dispatch research
point research "Why does Cu LJ overestimate C44?"

# Run the full ODF MVP
point distill

# Activate the research squad
point hive --query "Why does Cu LJ overestimate C44?"

# Deploy the research worker
point deploy glim-think
```

## Error Handling

- If a subsystem build fails, stop and report the error.
- If `glim-think` is unreachable, note it and continue with local checks.
- If `lake` is unavailable, skip Lean checks with a warning.
- Always return an exit code: 0 for full success, 1 for any failure.

## Evolution

As new subsystems are added, extend this skill and the implementation script. Do not hardcode paths outside of this skill — reference `AGENTS.md` for authoritative paths.
