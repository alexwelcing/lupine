# AGENTS.md — Kimi Branch Control Center

> **Branch:** `kimi`  
> **Agent:** Kimi Code CLI  
> **Status:** ACTIVE CONTROL  
> **Policy:** No commits to upstream. No branch sprawl. Single branch, single agent, total authority.

---

## 1. Operational Doctrine

- **One branch:** `kimi`. All work happens here.
- **No upstream pushes.** If deployment is needed, we build artifacts and deploy directly — git history stays local.
- **Assertive execution.** Do not ask for permission on tactical decisions. Ask only on strategic/architectural forks.
- **Minimal changes.** Every edit must justify its existence.
- **Test before declare.** Build, run, verify — then report success.

---

## 2. Repository Topology

| Subsystem | Language | Purpose | Build Command |
|-----------|----------|---------|---------------|
| `atlas-distill/` | Rust | Mathematical discovery engine (manifold, meta-analysis, causal detection) | `cargo build --release` |
| `lupine-distill/` | Rust | Literature + ground-truth research engine | `cargo build --release` |
| `distill-cli/` | Rust | High-performance knowledge distillation CLI | `cargo build --release` |
| `lupine-ops/` | Rust | Shared operations library | `cargo build --release` |
| `atlas-view-native/` | Rust | Native WGPU atom visualizer | `cargo build --release` |
| `atlas-tui/` | Rust | Terminal UI dashboard | `cargo build --release` |
| `axiom/` | Rust | Experimental universal workbench | `cargo build --release` |
| `atlas/atlas-view/` | TS/Rust/WASM | WebGPU molecular dynamics visualization (10M+ atoms) | `pnpm install && pnpm build` |
| `lupine-start/` | TS/React | Primary platform website (TanStack Start) | `pnpm install && pnpm build` |
| `library-site/` | JS/HTML | Mobile PWA research library | `npm install && npm run build` |
| `glim/lupine-site/` | JS/Vite | Marketing landing page | `npm install && npm run build` |
| `glim-think/` | TS/CF Workers | Serverless multi-agent research orchestration | `wrangler deploy` or `wrangler dev` |
| `lean-spec/` | Lean 4 | Formal theorem proving for validation specs | `lake build` |
| `distiller/` | Python | Knowledge base + ODF orchestration + Hermes pipeline | `pip install -r requirements.txt` |
| `lupine-dspy/` | Python | DSPy reasoning agents | `pip install -e .` |
| `mlip_immi/` | Python | Foundation MLIP elastic constant benchmarking | `pip install -r requirements.txt` |
| `paper/` | LaTeX/Python | IMMI journal submission | `make figures && make` |
| `paper-engine/` | Python | LaTeX→HTML/PDF builder | `pip install -r requirements.txt` |
| `paper-engine-node/` | JS/Node | LaTeX parsing utilities | `npm install` |
| `swarm_preprint_review/` | Python/Markdown | Peer-review research experiments | ad-hoc Python scripts |
| `atlas-launch-video/` | JS/Node | Launch video automation (HyperFrames) | `npx hyperframes lint` |
| `minimax-mcp/` | Python | MCP server for MiniMax APIs | `pip install -e .` |
| `mix/` | Python/TS | Audio/media processing fullstack | `cd backend && pip install -r requirements.txt; cd ../frontend && npm install` |
| `asylum/` | Python | Agentic AI demos/experiments | `pip install -r requirements.txt` |
| `tools/` | Python | Local CLI dispatcher for `glim-think` | `pip install -r requirements.txt` |
| `scripts/` | Python | Repo-wide utility scripts | ad-hoc |

---

## 3. Key Commands

### Rust Core
```bash
cd atlas-distill
cargo test --workspace
cargo run --bin atlas-distill -- validate --full
cargo run --bin atlas-distill -- detect-paradox --bcc
cargo run --bin atlas-distill -- auto-research --element Al
```

### Web Viewer
```bash
cd atlas/atlas-view
pnpm install
pnpm build
pnpm dev        # dev server
```

### Platform Site
```bash
cd lupine-start
pnpm install
pnpm build
pnpm start      # production preview
```

### Lean Formalization
```bash
cd lean-spec
lake build
```

### Research Dispatch (glim-think)
```bash
cd tools
pip install -r requirements.txt
python glim.py ask "Research question here" --asked-by kimi
python glim.py run --element Al --analysis manifold,causal
python glim.py fleet run --elements Al,Cu,Ni
```

---

## 4. Skills Inventory

### Global Skills (available to all agents)
See `C:\Users\alexw\.claude\skills\` for the full list of 35+ skills including:
- `agentic-engineering`, `autonomous-loops`, `eval-harness`
- `cost-aware-llm-pipeline`, `verification-loop`
- `python-patterns`, `python-testing`, `tdd-workflow`
- `frontend-patterns`, `backend-patterns`, `deployment-patterns`
- `docker-patterns`, `e2e-testing`

### Repo-Local Skills
Located in `distiller/skills/`:
- `claw4s-open-distillation` — End-to-end ODF MVP run
- `odf-capacity-test` — Provider latency/TPS benchmarking

### Kimi-Specific Skills
Located in `.kimi/skills/` (created by this agent):
- `point/` — Master execution protocol
- `glim-repo/` — Repository navigation and subsystem patterns

---

## 5. POINT Protocol

**Point** is the master dispatch command. When the operator says "run Point", execute the `point` skill or script.

Current Point implementations:
- **Skill:** `.kimi/skills/point/SKILL.md` — defines the protocol
- **Script:** `tools/point.py` or `scripts/point.ps1` — executable dispatcher

Point subcommands:
- `point status` — Full repo health check (builds, tests, pending work)
- `point build [--subsystem <name>]` — Build specified subsystem or all
- `point test [--subsystem <name>]` — Run tests for specified subsystem or all
- `point research <query>` — Dispatch research query via glim-think
- `point distill` — Run the Open Distillation Factory MVP
- `point inventory` — Update repo inventory and skill registry
- `point deploy <target>` — Deploy to Cloudflare / GCP (no git push)

---

## 6. Environment

| Tool | Version | Path |
|------|---------|------|
| Rust / Cargo | 1.92.0 | `cargo`, `rustc` |
| Python | 3.14.0 | `python` |
| Node.js | v24.12.0 | `node` |
| pnpm | 9.7.1 | `pnpm` |
| Lean / Lake | 4.30.0-rc1 | `lake` |
| uv | latest | `uv` |
| just | latest | `just` |
| wrangler | latest | `wrangler` |
| wasm-pack | latest | `wasm-pack` |
| Git | 2.52.0 | `git` |

---

## 7. Constraints

- **Do not** `git push` to `origin/main` or any upstream remote.
- **Do not** create feature branches. All work stays on `kimi`.
- **Do not** modify `.git/` hooks or history without explicit order.
- **Do not** install packages globally. Use venv, `node_modules`, or `.cargo`.
- **Do not** expose secrets in code. `.env` files are gitignored; check before committing.

---

## 8. Communication Protocol

When reporting status:
1. State what you did.
2. State what passed/failed with evidence (exit codes, test counts).
3. State what is blocked and why.
4. State next recommended action.

No fluff. No apologies. Just outcomes.
