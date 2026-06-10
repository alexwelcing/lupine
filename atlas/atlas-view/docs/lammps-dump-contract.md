# LAMMPS dump files in Lupi: the compatibility contract

Lupi accepts any LAMMPS text dump it can parse, but **how** a file is
dumped decides which path it takes in the viewer. This page is the
human-readable mirror of the executable contract in
`packages/parsers/src/dumpContract.ts` — the same rules the product
enforces, so it cannot drift. To check a specific file, run the doctor:

```bash
npm run doctor -- path/to/your.lammpstrj          # head-only, instant
npm run doctor -- --deep path/to/your.lammpstrj   # full parse + stats
```

## The one-liner

If you remember nothing else, dump like this:

```
dump lupi all custom 500 traj.lammpstrj id type x y z
```

That dialect gets the **streaming fast path**: atoms paint progressively
while the file is still being read, the whole trajectory is transcoded to
an indexed binary off the main thread (the canvas never stutters), frames
load on demand during playback with bounded memory, and the file lands in
"Your library" so you can come back to it without re-uploading.

## Tiers

| Tier | What it means |
| --- | --- |
| **streamable** | Worker fast path, as above. Requires: orthogonal box, unscaled wrapped `x y z`, a `type` column, plain text. |
| **standard** | Still viewable — parsed whole in memory by the WASM path. Slower for big files and (today) not persisted to the library. This is where triclinic, scaled-coordinate, and gzipped dumps land. |
| **not-a-dump** | No `ITEM: TIMESTEP` header. Lupi will try its XYZ / extended-XYZ, LAMMPS data-file, and log parsers instead. |

## What moves a file off the fast path (and the fix)

| Finding | Why | Fix |
| --- | --- | --- |
| Triclinic box (`xy xz yz` in `BOX BOUNDS`) | Streaming parser handles orthogonal cells only | Run with zero box tilt if your system permits; otherwise the standard path handles it |
| Scaled coords (`xs ys zs`) | Fast path reads unscaled positions | Dump `x y z` |
| Unwrapped coords (`xu yu zu`) | Fast path reads wrapped positions | Dump `x y z` |
| gzip (`.gz`) | Fast path reads raw text | gunzip before dropping, or dump uncompressed |
| Missing `type` | Atoms can't be colored/sized by species | Add `type` to the dump columns |
| Atom type ids > 255 | The binary frame format stores types as one byte | Renumber types densely from 1 |

Non-blocking notes the doctor will also tell you about:

- **Missing `id`**: renders fine, but per-atom identity across frames
  (displacement coloring, annotations) is lost. Add `id`.
- **Extra per-atom columns** (`vx`, `c_pe`, …): ignored by the fast path.
  If you need to color by a computed property, the standard path carries
  properties through — keep that file under the streaming size threshold
  (5 MB) or accept the slower load. Carrying properties through the
  streaming transcode is on the roadmap.
- **Variable atom counts** across frames are supported on both paths.
- The box stored for playback is frame 0's. Fixed-volume runs (NVT/NVE)
  reproduce exactly; NPT runs render exact positions inside a frame-0
  cell wireframe.

## Why this dialect

The fast path exists for *simulations over time on large systems* — the
files that used to be painful. Restricting it to the simplest, most
common dump dialect is what makes it possible to parse while
downloading, hold only one frame in memory during ingest, and seek
frames in O(1) afterward. Everything else still works; it just takes the
general-purpose path.

Real reference files (copper melting, rapid solidification, nanoparticle
sintering — genuine EAM molecular dynamics) can be generated at any size
with `tools/sims/make_phase_trajectories.py`; see `tools/sims/README.md`.
