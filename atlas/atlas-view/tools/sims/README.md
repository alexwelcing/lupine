# Phase-change demo trajectories

Real LAMMPS molecular dynamics — not synthetic fixtures — that exercise the
viewer's multi-frame bring-your-own-data path with visually dramatic
transformations. Both scenarios use the classic Foiles–Baskes–Daw `Cu_u3`
EAM copper potential that ships with LAMMPS, and write dumps in exactly the
dialect the streaming fast path handles: orthogonal box, `id type x y z`,
constant atom count.

| Scenario | What you see | Physics |
| --- | --- | --- |
| `cu-melt` | A Cu(100) slab heated 300 K → 1700 K. Melting nucleates at the free surfaces near T_m (≈1340 K for this potential) and the disorder front eats inward until the crystal is gone. | Surface-nucleated first-order melting. The slab geometry is the point: a perfect periodic crystal superheats, a surface melts *at* T_m, so the transition shows up on a demo timescale. |
| `cu-solidify` | Bulk liquid copper quenched 2000 K → 300 K in ~100 ps. The liquid's churn arrests into a frozen amorphous structure. | Rapid solidification (~4×10¹³ K/s) — far too fast for crystallization, so the melt vitrifies. |

## Generate

```bash
pip install lammps   # PyPI wheel; ships the potential files
python3 tools/sims/make_phase_trajectories.py all --size demo
```

Sizes: `ci` (~900 atoms, seconds — the committed test fixtures),
`demo` (~9k atoms, a few minutes, >5 MB so the drag-and-drop streaming
path engages), `showcase` (~26k atoms, ~10 minutes, tens of MB).

Output lands in `tools/sims/output/` (gitignored). Drag a `.lammpstrj`
into the viewer: frame 0 paints progressively while the worker transcodes
the trajectory to `.glimbin` in OPFS, then the timeline appears and the
file shows up under “Your library” for next time.

## Verify

Push any real dump through the exact parse → transcode → read-back
pipeline the viewer uses, plus a physics check that the file really
contains a transformation:

```bash
npm run verify:real-trajectory                      # demo files, if present
npx -y tsx tools/verify-real-trajectory.mjs <file>  # any dump
```

Gzipped `ci`-size runs of both scenarios are committed at
`packages/parsers/src/__fixtures__/` and locked in by
`packages/parsers/src/realDumpPipeline.test.ts`, so the pipeline is
regression-tested against what LAMMPS *actually writes* (scientific-
notation box bounds, `pp pp ff` boundaries), not just hand-rolled text.
