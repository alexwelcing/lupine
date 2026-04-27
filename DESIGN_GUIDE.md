# Lupine Materials Science — Design System Index

The `glim/` workspace contains several frontends, each with its own design
surface. Per-app docs live alongside the code; this file is a thin index.

| App                 | Stack                          | Authoritative design doc                |
|---------------------|--------------------------------|-----------------------------------------|
| `lupine-start/`     | TanStack Start + Tailwind v4   | [`lupine-start/DESIGN.md`](./lupine-start/DESIGN.md) |
| `lupine-site/`      | Vite + Tailwind                | _no doc yet — extend Lab tokens_        |
| `library-site/`     | Static research publication    | _no doc yet_                            |
| `atlas/atlas-view/` | WebGPU LAMMPS viewer (less active) | _no doc yet_                       |

## Shared design philosophy

All Lupine frontends draw from a common conceptual palette, but token
implementations are intentionally per-app rather than imported from a shared
package. This keeps each surface free to evolve at its own cadence.

**Two motifs recur across apps:**

1. **Lab / Obsidian** — operational interfaces. Near-black surfaces, neon cyan
   primary (`#00fbfb`), violet secondary, sharp 0px corners, terminal-mono
   labels, ambient pulse animations.
2. **Marketing / Editorial** — public-facing surfaces. Indigo lupine spectrum
   (`#5565d4` → `#1a1d3d`), slate neutrals, Playfair Display serif, atomic
   imagery (orbital electrons, lattice grids), warmer pacing.

Most apps host both motifs and route between them by section. The
`lupine-start` app is the canonical reference — when starting a new frontend,
crib its `src/styles/tokens.css` as a starting point and adapt.

## Cross-app conventions

- **Dark-first.** Light mode is aspirational across the workspace; ship
  dark-only until light is genuinely needed and properly designed.
- **Sharp corners** (`--radius: 0`) for the Lab look; soft radii are reserved
  for marketing CTAs.
- **Inter** for body, **Space Grotesk** for display + mono, **Playfair
  Display** for editorial highlights. Load from a single Google Fonts `<link>`
  per app, not via CSS `@import`.
- **Animation**: CSS keyframes for ambient motion, framer-motion for
  state-driven transitions. No GSAP, no Lottie, no Three.js outside dedicated
  visualizer surfaces.
- **Tokens via CSS custom properties**, not Tailwind theme extensions, so
  values are inspectable and overridable at runtime.

## Aspirational components (not yet built)

An earlier draft of this guide (titled "Atomic Understanding v2") spec'd a
named component library — `AtomicGlass`, `OrbitalToggle`, `WaveformSlider`,
`QuantumSection`, `IsotopeChip`, `CovalentGrid`. **None of these have been
implemented.** The motifs they describe still inform the system, but the
named primitives are not present in any app's component tree. If the spec is
revived, a shared `@lupine/ui` package would be the right home — not
ad-hoc duplication across apps.
