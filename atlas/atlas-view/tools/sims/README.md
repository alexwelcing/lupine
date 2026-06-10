# Phase-change demo trajectories

Real LAMMPS molecular dynamics — not synthetic fixtures — that exercise the
viewer's multi-frame bring-your-own-data path with visually dramatic
transformations. All scenarios use the classic Foiles–Baskes–Daw `Cu_u3`
EAM copper potential that ships with LAMMPS, and dump in exactly the
dialect the streaming fast path handles (the executable contract:
`packages/parsers/src/dumpContract.ts`, human version:
`docs/lammps-dump-contract.md`).

| Scenario | What you see | Physics |
| --- | --- | --- |
| `cu-melt` | A Cu(100) slab heated 300 K → 1700 K. Melting nucleates at the free surfaces near T_m (≈1340 K for this potential) and the disorder front eats inward until the crystal is gone. | Surface-nucleated first-order melting. The slab geometry is the point: a perfect periodic crystal superheats, a surface melts *at* T_m, so the transition shows up on a demo timescale. |
| `cu-solidify` | Bulk liquid copper quenched 2000 K → 300 K in ~100 ps. The liquid's churn arrests into a frozen amorphous structure. | Rapid solidification (~4×10¹³ K/s) — far too fast for crystallization, so the melt vitrifies. |
| `cu-sinter` | Two copper nanoparticles at 1000 K grow a neck and coalesce. | Surface-diffusion-driven sintering at 0.75 T_m. The particles are carved from differently-oriented lattices, so the neck contains a real grain boundary. |

## Scenarios are data

A scenario is `setup` (geometry + potential) × `protocol` (a list of NVT
`Phase`s: temperature ramp/hold, steps, dump on/off). Adding a new
transformation means adding a `Scenario` entry to the registry in
`make_phase_trajectories.py` — no new script, and it automatically gets
sizing presets, manifests, and verification.

Every output gets a sidecar **`<name>.manifest.json`** with full
provenance: potential, protocol phases, seed, LAMMPS version, dump
cadence, and an `expected.min_moved_fraction` verification hint (melting
moves nearly every atom; sintering legitimately moves few). Downstream
tools key off the manifest — `verify-real-trajectory` reads its
threshold, and gallery/library ingestion can trust its metadata.

## Generate

```bash
pip install lammps   # PyPI wheel; ships the potential files
python3 tools/sims/make_phase_trajectories.py --list
python3 tools/sims/make_phase_trajectories.py all --size demo   # or: npm run sims:phase-change
```

Sizes: `ci` (~1k atoms, seconds — the committed test fixtures), `demo`
(~7–12k atoms, a few minutes, >5 MB so the drag-and-drop streaming path
engages), `showcase` (~26–33k atoms, ~10 minutes, tens of MB).

Output lands in `tools/sims/output/` (gitignored). Drag a `.lammpstrj`
into the viewer: frame 0 paints progressively while the worker transcodes
the trajectory to `.glimbin` in OPFS, then the timeline appears and the
file shows up under “Your library” for next time.

To publish a run to the gallery, bake it first —
`npm run bake:glimbin -- tools/sims/output/<name>.lammpstrj` — then
follow the Scenario-1 write path in `docs/trajectory-architecture.md`
(upload `.glimbin` + manifest to GCS, card metadata from the manifest).

## Verify and diagnose

```bash
npm run verify:real-trajectory                      # demo files, if present
npx -y tsx tools/verify-real-trajectory.mjs <file>  # any dump: full pipeline + physics check
npm run doctor -- [--deep] <file>                   # compatibility report for ANY user file
```

`verify-real-trajectory` drives the exact viewer pipeline (streaming
gate → multi-frame parse → incremental `.glimbin` transcode →
`LocalGlimbinSource` read-back) plus a physics assertion that the
transformation in the manifest actually happened. `lupi-doctor` runs the
viewer's compatibility contract against any LAMMPS user's file and says
which path it takes, why, and what to change.

Gzipped `ci`-size runs of all scenarios are committed at
`packages/parsers/src/__fixtures__/` and locked in by
`packages/parsers/src/realDumpPipeline.test.ts`, so the pipeline is
regression-tested against what LAMMPS *actually writes* (scientific-
notation box bounds, `pp pp ff` boundaries), not just hand-rolled text.
