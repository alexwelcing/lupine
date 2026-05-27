# MLIP Execution Playbook

This is the operating guide for running different MLIPs locally and in cloud
lanes without changing the scientific contract. The invariant is simple:
every lane runs `gcp/mlip-cell-runner/mlip_cell_runner.py run-cell`, writes the
same cell artifact, emits the same `lupine.mlip.cell_result.v1` beat, and uses
the same checkpoint shape.

## Execution Lanes

## Real-Material Source Packet

Before running the Ni or hard-lane publication benchmark, validate the source
packet. This is the audit spine for citations, licenses, local evidence, and
lane acceptance gates:

```powershell
python tools/mlip_benchmark_sources.py validate
python tools/mlip_benchmark_sources.py ni-inventory
python tools/mlip_benchmark_sources.py ni-bulk-results
```

The source packet lives at:

```text
data/mlip_benchmarks/manifest_sources.json
```

Treat the output as the first gate for real-material work. A failed source
packet means the run is not publication-grade yet, regardless of whether a
calculator can execute.

For the first fcc Ni EAM-home-turf fixture, build and self-evaluate the sealed
artifact with:

```powershell
just mlip-ni-fixture-check
```

The fixture is:

```text
data/mlip_benchmarks/fixtures/ni_fcc_eam_home_turf_v1.json
```

This is a Lane A classical-home-turf fixture. Energy, force, stress, and
relaxation labels are generated from the NIST Mishin-1999 Ni EAM potential;
elastic constants are anchored to the Ni literature/NIST Cij table. It is not
the hard-lane DFT fixture.

For paired baseline versus Distill Accuracy evidence, use the campaign
conveyor:

```powershell
just mlip-evidence-campaign-check
python tools/mlip_evidence_campaign.py commands --kind upload
python tools/mlip_evidence_launch.py --require-image-tag paired-evidence-20260527a
python tools/mlip_evidence_collect.py
python tools/mlip_evidence_report.py
```

The default campaign expands to five MLIPs, five rows, and two variants. Each
Distill Accuracy cell is paired to a baseline cell through the same
raw-prediction checkpoint URL, with baseline writing and Distill reading.

### Local Lab

Use local first when debugging MLIP dependency friction, Distill policy changes,
or fixture mistakes. No Docker is required.

```powershell
python tools/mlip_local_lab.py --mode baseline --mlip chgnet --row forces
python tools/mlip_local_lab.py --mode campaign --mlip mace-mp-0 --workers 1
```

Each backend gets an isolated `uv` environment under
`tmp/mlip-runtimes/<mlip_id>`. Run artifacts land under `tmp/mlip-local/<run_id>`.
The local harness writes JSONL beats instead of posting to Cloudflare unless
`--sync-url` is provided.

### GCP Lab

Use GCP for reproducible burst runs and committee-facing evidence. Cloudflare
stays authoritative; GCP only executes allowlisted Cloud Run Jobs.

```powershell
gcloud builds submit . `
  --config gcp/mlip-cell-runner/cloudbuild.yaml `
  --substitutions _PROJECT_ID=shed-489901,_REGION=us-central1
```

Then run a single canary before campaign fan-out:

```powershell
gcloud run jobs execute mlip-cell-chgnet `
  --project=shed-489901 `
  --region=us-central1 `
  --wait `
  --args=run-cell,--run-id,canary,--cell-id,canary:baseline:forces:chgnet,--row-id,forces,--mlip-id,chgnet,--manifest-url,gs://shed-489901-atlas-inputs/mlip-baseline/canonical-structures-v2/manifest.json,--artifact-prefix,gs://shed-489901-atlas-outputs/mlip-baseline-grid/canary/forces/chgnet,--beat-emit-url,https://glim-think-v1.aw-ab5.workers.dev/feed/beats
```

Cloud Run GPU jobs should remain explicit about region, GPU type, CPU, memory,
timeout, and retries. Do not silently downgrade to CPU when the chosen profile
requires a GPU.

### Hugging Face Jobs Fallback

Use HF Jobs when GCP GPU quota is the bottleneck or when a fast pro-account
test is more valuable than waiting on Cloud Run capacity. Submit the same
runner contract as an inline UV script or a packaged command, pass `HF_TOKEN` as
a secret if results are pushed to the Hub, and persist artifacts before the job
exits.

Recommended first hardware order:

1. `cpu-upgrade` for import and fixture-contract checks.
2. `l4x1` or `t4-medium` for a single real MLIP canary.
3. `a10g-small` for larger cells or slower backends.

HF Jobs environments are ephemeral, so successful jobs must upload artifacts to
Hub, GCS, or post beats to `glim-think`.

## Backend Matrix

The machine-readable source of truth is
`gcp/mlip-cell-runner/backend_catalog.json`. Inspect it with:

```powershell
python tools/mlip_local_lab.py --list-backends
```

| MLIP | Runner id | GCP job | Local env | First canary |
| --- | --- | --- | --- | --- |
| MACE-MP | `mace-mp-0` | `mlip-cell-mace` | `tmp/mlip-runtimes/mace-mp-0` | `forces` |
| CHGNet | `chgnet` | `mlip-cell-chgnet` | `tmp/mlip-runtimes/chgnet` | `forces` |
| M3GNet | `m3gnet` | `mlip-cell-m3gnet` | `tmp/mlip-runtimes/m3gnet` | `energy_volume` |
| ORB v3 | `orb-v3` | `mlip-cell-orb` | `tmp/mlip-runtimes/orb-v3` | `energy_volume` |
| SevenNet | `sevennet` | `mlip-cell-sevennet` | `tmp/mlip-runtimes/sevennet` | `forces` |

On native Windows, the catalog also records local support status. M3GNet is
currently marked `blocked` because the pinned DGL CUDA wheel is Linux-only for
this stack; broad local runs skip it and route it to GCP/Hugging Face Linux
runners. ORB is marked `heavy` because it uses a separate cu118 Torch stack; run
it locally only when that extra disk/runtime cost is intentional.

The canary row is a starting point, not a scientific shortcut. A release run
still needs all five rows and all three variants.

## Checkpoint Contract

The runner now writes a per-cell checkpoint by default:

```text
<artifact-prefix>/cell_checkpoint.json
```

The checkpoint schema is `lupine.mlip.cell_checkpoint.v1`. It stores:

- run, cell, row, MLIP, variant, Distill profile, and manifest hash;
- one completed raw prediction per structure case;
- structure content hashes to prevent stale reuse;
- loaded/written/miss counts in the final artifact and beat.

The checkpoint is intentionally raw-prediction level. Distill policy decisions
are replayed after predictions are loaded, so a newer hyperribbon policy can be
tested without rerunning expensive MLIP inference when the sealed manifest is
unchanged.

Useful modes:

```powershell
--checkpoint-mode read-write   # default, resume completed cases and save new ones
--checkpoint-mode read-only    # inspect/replay existing predictions only
--checkpoint-mode write-only   # force recompute while preserving a new checkpoint
--checkpoint-mode off          # disable checkpointing
```

For custom paths:

```powershell
python tools/mlip_local_lab.py `
  --mode baseline `
  --mlip chgnet `
  --row forces `
  --checkpoint-url-template "tmp/mlip-checkpoints/{run_id}/{cell_id}.json"
```

## Inspection Loop

For every backend, use the same ladder:

1. `--dry-run` the local command and inspect the resolved runner arguments.
2. Run one local CPU/GPU cell with `--checkpoint-mode read-write`.
3. Re-run the same cell and confirm checkpoint hits appear in the beat/artifact.
4. Run the matching GCP or HF canary.
5. Promote through Cloudflare workflow dispatch only after the canary artifact
   has package versions, CUDA facts, checkpoint summary, and row-native metrics.

## Local Distill Growth Loop

The local loop is where we try Distill moves aggressively. The cloud loop is
where we prove that the same move is reproducible.

1. Run a narrow local triplet with checkpoints:

   ```powershell
   python tools/mlip_local_lab.py `
     --mode campaign `
     --mlip mace-mp-0 `
     --row forces `
     --workers 1 `
     --run-id mace-forces-local-v1
   ```

   For support data that matches the held-out MPtrj baseline distribution, build
   a non-overlapping support manifest first:

   ```powershell
   python gcp/mlip-cell-runner/build_mptrj_distill_support.py `
     --per-row 20 `
     --output gcp/mlip-cell-runner/fixtures/canonical_distill_support_mptrj_train_v1.json
   ```

   Then pass it through the local harness:

   ```powershell
   --support-manifest-url gcp/mlip-cell-runner/fixtures/canonical_distill_support_mptrj_train_v1.json
   ```

2. Search a candidate ribbon policy from local Distill artifacts:

   ```powershell
   cargo build --manifest-path atlas-distill/Cargo.toml --bin atlas-distill

   python tools/mlip_distill_growth_loop.py `
     --run-dir tmp/mlip-local/mace-forces-local-v1 `
     --objective both `
     --rounds 3 `
     --beam-width 4
   ```

3. Re-run the same local triplet with the selected policy limits:

   ```powershell
   python tools/mlip_local_lab.py `
     --mode campaign `
     --mlip mace-mp-0 `
     --row forces `
     --run-id mace-forces-local-v2 `
     --distill-policy-url tmp/mlip-distill-growth/growth-YYYYMMDD-HHMMSS/policy_limits_accuracy.json
   ```

4. Build the promotion packet:

   ```powershell
   python tools/mlip_local_promotion.py `
     --run-dir tmp/mlip-local/mace-forces-local-v2 `
     --distill-policy-url gs://shed-489901-atlas-inputs/mlip-policies/hyperribbon-v2/policy_limits_accuracy.json
   ```

If the packet reports `gate.status = "hold_local"`, keep iterating locally. If
it reports `promote_to_gcp_canary`, run the listed GCP canary commands. This is
the bright line: local evidence earns a cloud run; local settings are never the
release artifact.

### Current Local Hyperribbon

The current local test ribbon is:

```text
gcp/mlip-cell-runner/policies/hyperribbon-local-v1b-accuracy.json
```

It was selected from local CHGNet energy, CHGNet stress, and MACE force triplets.
The useful result was not an accuracy win yet; it was a no-harm policy that
learned to block corrections that looked good on support but failed to transfer
to held-out eval. In particular, CHGNet stress support proposed a roughly
`6 GPa` stress bias that improved support residuals but degraded held-out stress
MAE from about `0.43 GPa` to about `3.10 GPa`; `hyperribbon-local-v1b` lowers
`max_stress_bias_gpa` to `3.125`, preserving the baseline score while still
recording blocked-correction evidence.

Use it for local Distill development like this:

```powershell
python tools/mlip_local_lab.py `
  --mode campaign `
  --mlip chgnet `
  --row stress `
  --workers 1 `
  --ribbon-version hyperribbon-local-v1b `
  --distill-policy-engine rust `
  --distill-policy-url gcp/mlip-cell-runner/policies/hyperribbon-local-v1b-accuracy.json
```

This is a development ribbon, not a release claim. Promote a ribbon to cloud
only after the promotion packet shows positive accuracy delta on held-out rows.

### Current Positive Local Ribbon

The first positive local Distill Accuracy ribbon is:

```text
gcp/mlip-cell-runner/policies/hyperribbon-mptrj-support-v1-accuracy.json
```

It was selected from `tmp/mlip-local/mace-energy-mptrj-support-v1` using
non-overlapping MPtrj train support. The selected-policy validation run is
`tmp/mlip-local/mace-energy-mptrj-support-v1-selected2`; it reduced MACE-MP-0
held-out energy MAE from `0.4116` to `0.2038` eV/atom. This is the first
local proof that the Rust policy can improve an MLIP result in the run loop.
It is not an acceleration claim yet; support fitting still dominates this small
fixture.

Two additional local positive policies are now tracked:

```text
gcp/mlip-cell-runner/policies/hyperribbon-mptrj-sevennet-energy-v1-accuracy.json
gcp/mlip-cell-runner/policies/hyperribbon-mptrj-mace-stress-v1-accuracy.json
```

`hyperribbon-mptrj-sevennet-energy-v1-accuracy` reduced SevenNet held-out
energy MAE from `0.3997` to `0.2773` eV/atom in
`tmp/mlip-local/sevennet-energy-mptrj-support-v1-selected`. This is backend
diversity for the same energy-row residual ribbon mechanism.

`hyperribbon-mptrj-mace-stress-v1-accuracy` reduced MACE-MP-0 held-out stress
MAE from `0.5669` to `0.3481` GPa in
`tmp/mlip-local/mace-stress-mptrj-support-v1-selected`. This is the first row
diversity win. Its accelerate profile currently worsens stress MAE to
`0.6636` GPa, so do not use it as an Accuracy + Accelerate claim.

The no-win local probes are also useful: CHGNet energy selected `hold`,
CHGNet stress selected `hold`, SevenNet stress selected `hold`, and MACE/SevenNet
forces stayed numerically unchanged. Those outcomes keep the hyperribbon honest:
the growth loop must learn when to refuse or block, not just when to correct.

## Local MD And Paper-Reproduction Gate

Static cell scoring is not enough to claim we can reproduce an MLIP paper. A
paper-style reproduction needs at least one real trajectory protocol: seeded
initial velocities, time step, ensemble, thermostat settings, trajectory frames,
energy drift, force stability, and an exact model/checkpoint identity.

Use the local ASE harness for this lower layer:

```powershell
# Offset-lattice relaxation, emitted in the Rust equilibrium-solve schema.
python tools/mlip_md_local.py `
  --mode relax `
  --mlip-id emt `
  --element Al `
  --crystal fcc `
  --lattice-a 4.05 `
  --cell-scale 1.03 `
  --position-noise-angstrom 0.01 `
  --steps 50 `
  --output tmp/mlip-md-local/al-emt-relax.json

cargo run --manifest-path atlas-distill/Cargo.toml --bin atlas-distill -- `
  equilibrium-solve `
  --trajectory tmp/mlip-md-local/al-emt-relax.json `
  --output tmp/mlip-md-local/al-emt-relax-score.json

# Short deterministic NVE smoke with energy-drift diagnostics.
python tools/mlip_md_local.py `
  --mode nve `
  --mlip-id emt `
  --element Al `
  --crystal fcc `
  --lattice-a 4.05 `
  --temperature-k 300 `
  --timestep-fs 1 `
  --steps 100 `
  --log-interval 10 `
  --output tmp/mlip-md-local/al-emt-nve.json
```

Replace `--mlip-id emt` with `chgnet`, `mace-mp-0`, `m3gnet`, `orb-v3`, or
`sevennet` only after the corresponding local runtime environment imports
cleanly. For paper reproduction, promote only after the local run records:

Relaxation mode uses ASE cell relaxation by default, because the offset-lattice
problem is specifically about solving back toward an equilibrium lattice. Use
`--fixed-cell` only for position-only checks.

By default the local harness does not score raw reference positions or EMT
energy/stress for MLIP lattice reproduction. Periodic same-element crystals can
look position-wrong under naive atom ordering even when the lattice solve is
physically fine, and EMT observables are not the literature reference for
CHGNet/MACE/M3GNet. Use `--score-positions` or
`--include-emt-reference-observables` only when that is the intended benchmark.

`atlas-distill equilibrium-solve` treats a normalized distance of `0.5` as the
default solved threshold, meaning the final state is on average within half of
the configured physical tolerances.

- model package versions and model/checkpoint id;
- exact structure source, lattice, repeat, seed, time step, ensemble, and
  thermostat parameters;
- trajectory frames with energies, forces, temperature, stress when available;
- NVE energy drift or relaxation distance-to-reference;
- a GCP command or workflow packet that can rerun the same protocol without
  relying on this workstation.

## Practical GPU Notes

For small fixtures, GPU time can be dominated by import, model load, graph
setup, and kernel launch overhead. Treat cold total time, model load time, and
warm inference time as separate metrics. Committee-facing speed claims should
use warm inference time for the cell and include the cold timing as evidence.

When running MD or relaxation-style workloads, prefer engine-native restart
state when available. ASE trajectory files are good for inspection and replay of
frames, but they are not a full stochastic-thermostat restart contract. For the
current cell runner, `cell_checkpoint.json` is the durable resume layer for
completed fixture cases; exact integrator continuity is a future per-engine
adapter contract.

## References

- Cloud Run GPU Jobs: <https://cloud.google.com/run/docs/configuring/jobs/gpu>
- Hugging Face Jobs: <https://huggingface.co/docs/hub/jobs>
- ASE trajectory files: <https://ase-lib.org/ase/io/trajectory.html>
- MACE training checkpoints: <https://mace-docs.readthedocs.io/en/latest/guide/training.html#checkpoints>
