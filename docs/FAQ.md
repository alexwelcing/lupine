# Frequently Asked Questions

## For research scientists

### What is the fastest way to see the system work?

Run the unit tests and a dry-run of the regime gate:

```powershell
cd python
python -m pytest -m unit -q
python ../tools/mlip_regime_filter.py --campaign ../data/mlip_benchmarks/evidence_campaigns/mptrj_lane_b_paired_accuracy_v1.json --scope promotion-canary
```

No GPU, no cloud spend, no heavy MLIP downloads.

### Where is the real benchmark data?

Small fixtures live in `data/mlip_benchmarks/`. Large artifacts (MLIP weights, DFT reference sets, cloud-run outputs) live in GCS/R2 with manifests in `data/`.

### How do I add a new scientific claim?

Use [`docs/templates/publication.md`](./templates/publication.md). Then update [`docs/conjectures/ledger.md`](./conjectures/ledger.md) and `CHANGELOG.md`.

### What does "0 sorry" mean?

A Lean proof compiles and contains no unproved placeholders (`sorry`). In this repo it is the gate for trusting a formal claim.

## For software engineers

### Why are there so many top-level directories?

The repo is organized by deployable unit and runtime. See [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) and [`ROOTS.md`](../ROOTS.md). Retired roots are archived under `archive/`.

### Which root owns Distill?

- `atlas-distill/` — the Rust engine.
- `python/` — the active Python packages.
- `archive/lupine-distill-rust/` and `archive/distiller-kb/` — retired provenance.

### Why can't I run `lake build` from the repo root?

`lean-spec/` pins its own Lean toolchain. Run `lake` from inside `lean-spec/` so elan selects the pinned version; otherwise Mathlib may rebuild from source and fail on API drift.

### Why does `pnpm` hang on Windows?

PowerShell mishandles Node process trees. Use Git Bash or the `justfile` wrappers, which call the explicit Git Bash path.

### How do I add a new root?

Don't. If you think you need one, write an ADR in `docs/decisions/` and update `ROOTS.md`.

## For both

### What should I run before committing?

```bash
git diff --check
just think-lint        # if you touched glim-think
just engine-test       # if you touched atlas-distill or python
cd lean-spec && lake build   # if you touched proofs
```

### How do I know whether a docs/ file is still current?

Check the top of the file. Stale, superseded, or provisional docs now carry a
prominent banner that names the issue and points to the current source. The
authoritative maps are [`docs/navigation.md`](./navigation.md) (the science
entry points), [`docs/conjectures/ledger.md`](./conjectures/ledger.md) (claim
status), and [`CHANGELOG.md`](../CHANGELOG.md) (what was corrected and when).

### Where do I ask for help?

Read the maps first:

- [`docs/ONBOARDING.md`](./ONBOARDING.md)
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`docs/navigation.md`](./navigation.md)
- [`ROOTS.md`](../ROOTS.md)
