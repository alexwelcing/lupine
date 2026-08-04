# Onboarding

Welcome. This repo is organized around a single closed scientific loop: **benchmark → hypothesize → prove → publish evidence**. Pick the track that matches you.

## Track 1: Research scientist (materials / MLIP focus)

You probably want to answer a concrete question: *Does this potential fail in a structured way?* *Does a distillation correction transfer?* *Can I reproduce a published claim?*

### 1. Read the map

- [`docs/navigation.md`](./navigation.md) — the 60-second path to the science.
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — how the code planes connect.
- [`CHANGELOG.md`](../CHANGELOG.md) — what has been learned and corrected recently.

### 2. Find the evidence lane closest to your question

| Question | Code entry point | Docs |
| --- | --- | --- |
| Run a benchmark and see uplift | `python/scripts/run_ni_gpu_loop.py` | [`docs/mlip-gpu-ni-distill-formal-gate.md`](./mlip-gpu-ni-distill-formal-gate.md) |
| Test cross-material transfer | `python/scripts/run_cross_material_transfer.py` | [`docs/mlip-gpu-ni-distill-formal-gate.md`](./mlip-gpu-ni-distill-formal-gate.md) §Cross-material |
| Understand the regime gate | `python/lupine_distill/regime/` | [`docs/regime_gate_dominance.md`](./regime_gate_dominance.md) |
| Inspect a structure in 3D | `atlas/atlas-view/apps/web/` | <https://lupi.live> |
| Add or refute a claim | `docs/templates/publication.md` | [`docs/conjectures/ledger.md`](./conjectures/ledger.md) |

### 3. Run the small, free proofs first

These do not need a GPU or cloud spend:

```powershell
# Python unit tests (regime gate, schemas, uplift, mock backends)
cd python
python -m pytest -m unit -q

# Rust engine compile check
cargo check --manifest-path ../atlas-distill/Cargo.toml --bin atlas-distill

# Regime-filter CLI dry run
python ../tools/mlip_regime_filter.py --campaign ../data/mlip_benchmarks/evidence_campaigns/mptrj_lane_b_paired_accuracy_v1.json --scope promotion-canary
```

### 4. Add a claim

Use [`docs/templates/publication.md`](./templates/publication.md). A serious claim must identify:

- Model family and version
- Material set and reference
- Property target
- Evidence path and status
- Known confounders
- The next test that could change its status

## Track 2: Software engineer

You probably want to run, extend, or deploy part of the system.

### 1. Understand the ownership rule

Every top-level root has one owner. See [`ROOTS.md`](../ROOTS.md). If you are adding a new workflow, connect it to `glim-think` or the evidence ledger rather than leaving it standalone.

### 2. Install per-plane prerequisites

Run the bootstrap for your platform:

```powershell
# Windows (PowerShell)
.\scripts\bootstrap.ps1

# Linux / macOS
./scripts/bootstrap.sh
```

| Plane | Prerequisites | How to check |
| --- | --- | --- |
| Control plane | Node 20+, pnpm | `cd glim-think && pnpm --version` |
| Rust engine | Rust 1.80+ | `cargo --version` |
| Python packages | Python 3.10+, pip | `python --version` |
| Formal layer | Lean 4 toolchain (via elan) | `cd lean-spec && lake --version` |
| Public site | Node 20+, pnpm | `cd library-site && pnpm --version` |

### 3. Run the focused gates

```bash
# Control-plane lint/test (use Git Bash on Windows)
just think-lint
npm --prefix glim-think run test

# Rust engine
just engine-test

# Python packages
cd python
python -m pytest -m unit -q

# Lean proofs (heavy first build; run from inside lean-spec/)
cd lean-spec
lake build
```

On Windows, the root `justfile` routes Node/build tasks through Git Bash to avoid PowerShell process-tree hangs.

### 4. Where to put code

- New MLIP benchmark logic → `python/lupine_distill/`
- New Distill policy / scoring → `atlas-distill/src/`
- New agent workflow / ledger route → `glim-think/src/`
- New formal theorem → `lean-spec/OpenDistillationFactory/Materials/`
- New public docs → `docs/` (use the templates)

### 5. Before opening a change

- Run `git diff --check`.
- Run the focused gate for the root you touched.
- If you changed architecture or root ownership, add/update a decision doc in `docs/decisions/`.

## Common pitfalls

- **Do not use PowerShell for `pnpm`, `tsc`, or `vitest`**. Use Git Bash or the `justfile` wrappers.
- **Run `lake` from inside `lean-spec/`**, not the repo root, so elan selects the pinned toolchain.
- **Do not import the whole ATLAS-Lean subject** in `lean-spec`. Import only the proved leaf modules you need; whole-subject imports are ~80 min and OOM.
- **Do not add a new top-level root** without updating `ROOTS.md` and `docs/decisions/`.

## Need help?

- Frequently asked questions: [`docs/FAQ.md`](./FAQ.md)
- Status of every claim: [`docs/conjectures/ledger.md`](./conjectures/ledger.md)
- Research corpus map: [`docs/navigation.md`](./navigation.md)
- System map: [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- Root ledger: [`ROOTS.md`](../ROOTS.md)
