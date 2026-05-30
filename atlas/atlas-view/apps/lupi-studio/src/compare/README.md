# Comparison Theater (`/compare`)

A standout Lupi Viewer feature that makes the distill result *visible*: the same
strained FCC nanocrystal, relaxed three ways, **side-by-side-by-side** with a
**locked camera + clock**, atoms recoloring by their per-atom residual as time
advances (**time-lapse color**).

```
baseline (MACE-MP-0)      + Lupine distill         + distill · accelerate
   stays warm                cools further             cools first
   residual -> 20%           residual -> 6%            residual -> 5% @ 25% time
```

You drag any pane and all three orbit together; you scrub the timeline and all
three step together — so the only thing your eye compares is the *physics*: the
distill panes cool to a lower residual (accuracy), and the accelerate pane reaches
equilibrium in a quarter of the steps (speed). That is the measured result
(distill 5–7× faster + up to 50% lower error) rendered as something you can watch.

## Why R3F to full potential

- **Instanced impostor-free atoms** (`CompareScene.tsx`): one `InstancedMesh`,
  per-instance matrices + `instanceColor` rewritten every frame from the shared
  clock — hundreds of atoms at 60fps with zero per-atom React overhead.
- **Per-atom heat glow**: a second additive `InstancedMesh` whose brightness is
  scaled by `residual²`, so relaxed atoms add nothing and strained atoms bloom —
  a postprocess-free glow that reads as "hot."
- **Property→color time-lapse**: the residual (distance still to travel) drives a
  perceptual colormap (`colormaps.ts`: inferno / viridis / turbo). As the crystal
  relaxes you literally watch the color sweep from strained to relaxed.
- **Locked multi-pane**: one `clock` + one `orbit` singleton (`theaterState.ts`)
  read by every pane's `useFrame`; a single rAF loop in the page drives them, so
  N Canvases stay perfectly in sync with no cross-Canvas React churn.

## Files

| file | role |
|---|---|
| `trajectory.ts` | FCC lattice + strain + the three relaxation schedules (the data) |
| `colormaps.ts` | perceptual colormaps + CSS legend |
| `theaterState.ts` | shared clock + orbit singletons (the lock) |
| `CompareScene.tsx` | the instanced atom field + heat halo + camera rig |
| `Pane.tsx` | one Canvas + 3-point lighting + live residual/converged header |
| `../pages/Compare.tsx` | the page: rAF clock, drag-to-orbit, transport, legend |

## Next (real data)

The schedules here are physically-shaped placeholders. To drive it from a real
run, replace `makeTheater()` with a loader that reads a TorchSim relaxation
trajectory (positions per step) + a per-atom property (force / error vs DFT) per
variant — the scene already consumes `{ eq, pos0, decay }`, so only the data
source changes. Then the panes show the actual baseline/distill/accelerate
relaxations of a real MPtrj structure.
