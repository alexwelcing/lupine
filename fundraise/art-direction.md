# Lupine Science — Art Direction & Creative (visual source of truth)

> The visual counterpart to `company-profile.md`. Every image, figure, slide, the
> one-pager, and the site inherit from here so the whole raise looks like one mind made it.
> The bar: **be the best thing an investor sees that month** — by singular identity +
> one ownable hero motif + authentic data made beautiful. Not by maximalism.

---

## The bar (why this exists)

A frontier partner skims 50–200 decks/month and funds ~1. Breaking through is *not* about
being prettier — over-polish reads as style-over-substance and hurts a big ask. We break
through by: (1) a singular, anti-trend identity; (2) one ownable, repeated hero image; (3)
authentic data rendered beautifully (unfakeable depth). Design *amplifies* the thesis,
proof, and founder — it never substitutes for them.

## The identity (anti-trend on purpose)

- **Ground:** warm paper `#faf9f6` — the dominant surface. Most AI decks are dark neon; we
  go editorial/scientific-monograph. Premium, calm, confident, memorable *because* it's not
  trying to look like everyone else.
- **Light:** a single accent, indigo `#3d4db3`. Treat it as the only light source. Used
  sparingly = luminous; used everywhere = noise.
- **Ink:** near-black `#16171d` for text.
- **Type:** Newsreader (serif) does the heavy lifting; headlines are assertions. Imagery is
  atmospheric, never cluttered. White space is confidence.
- **Mark:** the atom-orbit + petal SVG as a recurring system element (corner mark, title).
- **Discipline:** one idea + one image per slide. Restraint over flash.

## The ownable hero motif — "the shape of wrongness"

The brand's central, repeatable image is the **hyper-ribbon manifold**: scattered, faint
error vectors (many wrong simulations) resolving/collapsing onto a single luminous indigo
ribbon/curve on warm paper. It *is* the thesis. It recurs (cover → proof → moat) until it's
unmistakably Lupine. This is the frame they remember.

## Secondary motifs (one visual language)

- **Bits → atoms:** a field of pixels/glyphs dissolving on one side, re-forming into a
  precise atomic lattice on the other — "AI leaving the screen, entering matter."
- **Crystalline sublime:** clean, scientific lattices / unit cells / materials, indigo-lit.
- **Error vectors aligning:** many near-parallel arrows collapsing to one direction (the
  cos θ > 0.8 insight).
- **Compounding geometry:** a crystal/flywheel growing outward (the moat).

## Palette-lock rule (makes generated images feel like one system)

Every generated image is constrained to **paper + indigo + ink** (a near-duotone). Prompt
for it, and if a render drifts, post-process to a warm-white→indigo duotone so the whole
deck is cohesive — never a stock grab-bag. No flowers (brand stays, lupine flowers go), no
people, no text baked into images (Newsreader handles all type), no dark backgrounds, no
neon/cyberpunk, no generic "AI brain/glowing-circuit" tropes, no stocky 3D-render look.

---

## Two production tracks

### Track A — Generative atmosphere (local ComfyUI · Ideogram 4)
Hero + section backgrounds. Model: `ideogram4_fp8_scaled` (best local still model; strong at
palette/style adherence). Backgrounds must sit *behind* text → low-contrast, lots of paper,
detail toward edges. Workflow wiring pending the discovery sweep (don't guess the graph).
- Process: 4–6 seed variants per concept → ruthless curation to 1 → palette-lock → upscale.
- Output: `fundraise/brand-assets/` with `manifest.json` (asset → slide → prompt → seed → model).
- Sizes: 16:9 full-bleed backgrounds (generate ≥1536×864, upscale to 1920×1080+); plus a
  1200×630 OG/social card for lupine.science. Optional later: a short bits→atoms loop via
  Wan 2.2 / LTX for the cover (over-engineering, only if it clears the bar).

### Track B — Authentic data-art (the credibility engine)
Render the *real* results as elegant brand-styled figures (matplotlib/their existing
`make_figures.py` / replication kit, restyled to paper+indigo, Newsreader-ish labels):
- Cross-MLIP **cosine matrix** heatmap (functional blocks visible).
- **PR-collapse / participation-ratio** curve (1.05–2.05).
- **Error-vector alignment** diagram (same direction, different magnitude).
- The **Lean proof** rendered as a clean typographic artifact (0 sorry).
These are unfakeable and belong on the Proof slide and appendix.

---

## Per-slide creative plan (maps to `lupine-science-deck.md` v2)

| # | Slide | Visual | Track |
|---|-------|--------|-------|
| 1 | Cover | **Shape of wrongness** hero (vectors → indigo ribbon) + mark | A (hero) |
| 2 | The change | Bits → atoms crossing (glyph field → lattice) | A |
| 3 | The catch | Many faint, subtly-different error curves scattered | A (subtle bg) |
| 4 | The proof | The hyper-ribbon manifold **+ real cosine matrix / PR curve** | A + **B** |
| 5 | Why it's everything | Single light rippling outward through a faint materials lattice (upstream cascade) | A (subtle bg) |
| 6 | Why me | The **bridge**: lattice → glyphs → lattice, one luminous arc | A (hero) |
| 7 | What we're building | A precise calibration grid aligning scattered points to a manifold | A |
| 8 | The moat | Compounding crystalline geometry / flywheel | A |
| 9 | The team | Minimal — mark + whitespace, no generative image (restraint) | — |
| 10 | The vision | Replicator arc: matter coalescing from light along a horizon | A (hero) |
| 11 | The ask | A luminous indigo line/network reaching toward a horizon (global labs/compute) | A (subtle bg) |
| — | Appendix | Real data-art figures + Lean artifact | **B** |

## Prompt library (Ideogram 4 — refine after wiring confirmed)

Shared style suffix appended to each: *"editorial scientific minimalism, warm off-white
`#faf9f6` paper background, single indigo `#3d4db3` light/accent, near-duotone, generous
negative space, calm and premium, no text, no people, no flowers, no neon, no glowing
circuits, like a figure in a beautiful physics monograph, high detail toward the edges."*

1. **Cover / shape of wrongness:** "faint scattered directional error vectors across a warm
   paper field gracefully collapsing and aligning onto a single luminous indigo ribbon — a
   low-dimensional manifold emerging from chaos."
2. **Bits → atoms:** "a field of tiny digital glyphs and pixels on the left dissolving and
   re-forming into a precise crystalline atomic lattice on the right; the crossing from the
   digital to the physical."
3. **The catch:** "many faint, subtly different prediction curves scattered across paper,
   each slightly wrong in a different way; quiet visual tension, mostly empty space."
4. **The proof:** "a single luminous indigo low-dimensional ribbon manifold that scattered
   error vectors converge onto; precise, sublime, like the key figure of a landmark paper."
5. **Upstream cascade:** "one point of indigo light rippling outward through a vast faint
   lattice of interconnected nodes, conveying scale and consequence."
6. **The bridge (why me):** "a single luminous indigo arc bridging a crystalline lattice to
   a field of digital glyphs and back to a lattice; atoms to bits to atoms."
7. **Calibration layer:** "a clean indigo correction grid overlaying and aligning a field of
   scattered points onto a smooth manifold."
8. **The moat:** "a crystal growing outward in self-reinforcing geometry, a compounding
   flywheel rendered as elegant indigo lattice growth on paper."
10. **Vision / replicator arc:** "matter coalescing out of indigo light along a faint
    horizon arc, expansive and cinematic, restrained."
11. **The ask:** "a luminous indigo line extending across a warm paper plane toward a distant
    horizon, a network of faint nodes lighting up — reach and momentum."

## Curation & quality bar

Generate broadly, keep almost nothing. A frame ships only if: it's on-palette, it sits
quietly behind text, it advances the slide's single idea, and it looks *art-directed* — not
"we ran a prompt." Two or three genuine showstoppers (cover, the bridge, the vision) carry
the deck; the rest are quiet atmosphere. Coherence across deck + one-pager + site is the
competence signal — enforce it.
