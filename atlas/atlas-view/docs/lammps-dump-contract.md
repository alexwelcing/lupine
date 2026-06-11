# LAMMPS dump files in Lupi: the compatibility contract

**Short version: dump however you normally dump.** Lupi's streaming fast
path takes the full common dump dialect — orthogonal *and* triclinic
boxes, unscaled / scaled (`xs ys zs`) / unwrapped (`xu yu zu`)
coordinates, extra per-atom columns (`vx`, `c_pe`, …) as colorable
properties, per-frame (NPT) boxes, variable atom counts, and gzip.

This page mirrors the executable contract in
`packages/parsers/src/dumpContract.ts` — the same rules the product
enforces, so it cannot drift. To check a specific file:

```bash
npm run doctor -- path/to/your.lammpstrj          # head-only, instant
npm run doctor -- --deep path/to/your.lammpstrj   # full parse + stats
```

## What the fast path gives you

Drag a dump in and: frame 0 paints progressively while the file is still
being read; the whole trajectory is transcoded off the main thread into
an indexed binary (the canvas never stutters); frames load on demand
during playback with bounded memory; and the file lands in "Your
library" so you can come back without re-uploading.

Dialect handling details:

| Dialect | Handling |
| --- | --- |
| Triclinic (tilted) cells | Streamed; tilt factors carried per frame |
| Scaled coords (`xs ys zs`) | Converted to Cartesian on the fly, with the proper triclinic bound correction |
| Unwrapped coords (`xu yu zu`) | Streamed as-is — diffused atoms render outside the cell, which is usually what you want |
| Extra per-atom columns | Parsed as named properties; available for property coloring (e.g. color the melt front by `c_pe`) |
| NPT / deforming cells | Every frame keeps its own box (exact, including LAMMPS tilt flips) |
| gzip (`.gz`) | Decompressed transparently while streaming |
| Variable atom counts | Supported |

## The few things that still demote a file

| Finding | Why | Fix |
| --- | --- | --- |
| No coordinate columns at all | Nothing to render | `dump lupi all custom 500 traj.lammpstrj id type x y z` |
| No `type` column | Atoms can't be colored/sized by species | Add `type` |
| Not a dump (`ITEM: TIMESTEP` missing) | Different format | Lupi's XYZ / data-file / log parsers take over |
| Atom type ids > 255 | The binary frame format stores types as one byte | Renumber types densely from 1 |

Non-blocking: a missing `id` column renders fine but loses per-atom
identity across frames (displacement coloring, annotations) — add `id`
if you can. Non-numeric columns (e.g. `element`) are skipped.

## Why a contract at all

The fast path exists for *simulations over time on large systems*. Its
parser scans rows at the byte level and holds one frame in memory during
ingest, which is what makes multi-GB trajectories practical in a browser
tab. The executable contract keeps the gate, the diagnostics
(`lupi-doctor`), and this document provably in sync as that surface
grows.

Real reference files (copper melting, rapid solidification, nanoparticle
sintering, and a triclinic-NPT-with-properties torture case — genuine
EAM molecular dynamics) can be generated at any size with
`tools/sims/make_phase_trajectories.py`; see `tools/sims/README.md`.
