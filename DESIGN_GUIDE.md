# Lupine Materials Science — Design Guide
## "Atomic Understanding" Design System v2

This document defines the visual identity, design tokens, interaction paradigms, and component architecture for all Lupine Materials Science user interfaces. Every element in this system is inspired by the physics of materials science itself.

**Core Philosophy:** *Everything is an atom. Every interaction is a bond. Every transition is a phase change.*

---

## 1. Color Tokens

### Brand: The Lupine Spectrum
A deep indigo-to-violet range that evokes the luminescence of rare earth elements under UV excitation.

| Token | Hex | Usage |
|-------|-----|-------|
| `--lupine-950` | `#12142e` | Deepest brand tint |
| `--lupine-700` | `#2e3a87` | Ambient backgrounds |
| `--lupine-500` | `#5565d4` | Primary accent |
| `--lupine-400` | `#7b8ae0` | Active states, nucleus glow |
| `--lupine-300` | `#9ba6ea` | Section labels, header text |

### Neutral: The Slate Void
12-step neutral scale from near-black (`#06070d`) to near-white, providing the dark-mode backbone.

### Semantic Accents
- **Cyan** (`#4ecdc4`): Electron indicators, success hints
- **Gold** (`#d4a843`): Code values, numerical highlights
- **Green** (`#4ecd6b`): "Shipped" status, positive confirmations
- **Red** (`#e85454`): Destructive actions, errors

### Glass Surfaces
All containers use transparent white composites over the dark void:
- **Level 1** (Surface): `rgba(255,255,255,0.015)` — barely visible, for grouping
- **Level 2** (Interior): `rgba(255,255,255,0.03)` + `backdrop-filter: blur(12px)`
- **Level 3** (Deep Core): `rgba(255,255,255,0.05)` + `backdrop-filter: blur(24px)` + grain noise

---

## 2. Typography

| Role | Family | Weight | Usage |
|------|--------|--------|-------|
| Body / UI | Inter | 300–700 | All body text, labels, controls |
| Editorial / Stats | Playfair Display | 400, 700, italic | Hero headings, stat values |
| Data / Code | JetBrains Mono | 400–600 | Numerical readouts, mono labels, terminal aesthetics |

---

## 3. Animation Keyframes

All animations are pure CSS (zero JS runtime). The library provides:

| Keyframe | Duration | Purpose |
|----------|----------|---------|
| `orbital-spin` | 3s linear ∞ | Electron orbiting nucleus on active toggles |
| `orbital-counterspin` | — | Secondary shell, opposite direction |
| `nucleus-pulse` | 2s ease ∞ | Heartbeat glow on active nucleus dots |
| `bond-flow` | 4s linear ∞ | Dashed bond lines flowing between grid nodes |
| `wave-breathe` | 3s ease ∞ | Slider thumb breathing glow ring |
| `phase-in` | 0.3s | Content materialization on section expand |
| `grain-drift` | 8s steps(6) ∞ | Noise texture overlay micro-movement |

---

## 4. Component Library (`@lupine/ui`)

### `AtomicGlass`
Glassmorphic container with 3 depth levels. Level 2+ adds grain noise overlay (inline SVG `feTurbulence`). Top-edge refraction highlight line. Interactive variant lifts on hover with lupine glow.

### `OrbitalToggle`
Boolean toggle where state is represented by electron behavior. Inactive: dim nucleus, dormant orbit paths. Active: glowing nucleus with `nucleus-pulse`, cyan electron dot tracing the orbit via `orbital-spin`. Two SVG elliptical rings at different angles create the atom cross-hatch. Pure CSS — zero JS animation.

### `WaveformSlider`
Range input styled as a spectral emission line. Track is a 3px slate line. Filled portion glows with a lupine gradient. Thumb is a 14px circle with breathing box-shadow (`wave-breathe`). On drag, the thumb scales up and glow intensifies.

### `QuantumSection`
Collapsible accordion panel with phase-transition animation. Header has a tiny nucleus dot indicator (glows when expanded), uppercase mono label, and rotating chevron. Content materializes with `phase-in` animation. Height animated via `max-height` + `ease-out-expo`.

### `IsotopeChip`
Periodic-table-inspired tag/chip. Optional superscript atomic number (top-left), main symbol text, optional subscript badge tag (e.g., "NEW"). Selected state glows with lupine accent border.

### `CovalentGrid`
CSS Grid layout that draws animated dashed SVG "bond" lines between adjacent children. Horizontal bonds connect row siblings. Vertical bonds connect column neighbors. Uses `ResizeObserver` for responsive recalculation. Bond dashes animate with `bond-flow` keyframe.

---

## 5. Integration Points

### Atlas-View WebGPU Viewer (`StylePanel.tsx`)
Every section is a `QuantumSection`. All boolean toggles are `OrbitalToggles`. All sliders are `WaveformSliders`. Color mode selection uses `IsotopeChips`. Quick presets use `CovalentGrid` + `AtomicGlass` interactive cards.

### Lupine Marketing Site (`lupine-site/`)
Deck slides and one-pager should progressively adopt the Lupine/Slate tokens and glass surfaces. The `deck.html` pipeline visualization is a prime candidate for `CovalentGrid`.

---

## 6. Performance Contract

- **Zero JS animation runtime** — no framer-motion, no GSAP, no spring libraries
- All motion is CSS `@keyframes` composited on the GPU
- Glass `backdrop-filter` usage is limited to Level 2+ panels (not used on frequently-rerendered elements)
- The `App` bundle shrank 28% (428KB → 307KB) after migration to `@lupine/ui`
- SVG noise texture is inline data-URI (no network request)
