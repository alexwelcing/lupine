# Compositing Spec — Lupine deck (how each slide shot is actually built)

> The craft pipeline for compositing brand imagery into slides so they read as one
> designed system, not stock-behind-text. Applies to every image-bearing slide. Pairs
> with `art-direction.md` (the look) — this is the *execution*.

## 0 · Pre-comp / setup (decide before touching pixels)
- **Purpose & focal hierarchy per slide** — one focal point; decide the eye path.
- **Reserve the type zone** — mark the negative-space region where headline/body live;
  the plate must stay quiet there (push detail to edges).
- **Grid & safe areas** — 16:9, consistent margins, baseline grid, title/body/eyebrow/footer zones; everything snaps to it.
- **Color management** — work in a wide/linear space at 16-bit, deliver sRGB; pin exact
  brand hexes (paper `#faf9f6`, indigo `#3d4db3`, ink `#16171d`); define the export profile.
- **Reference/look** — lock lighting direction, contrast curve, grain character up front.

## 1 · Plate prep
- **Oversample** — generate larger than final (crop latitude + crisp downscale).
- **Cull & select** the hero plate from the seed variants.
- **Artifact sweep** — heal/clone out AI tells (warped geometry, garbage edges, repeated
  motifs, banding); reconstruct broken edges.
- **Upscale → sharpen** only if needed; sharpen last, sparingly.

## 2 · Isolation & matting (for layered shots)
- **Cutout** foreground/subject (RMBG / BiRefNet — we have these nodes) → alpha matte.
- **Refine matte** — feather, choke, **decontaminate edges** (kill color fringe/spill).
- **Separate into layers** — fg / mid / bg for independent control + depth.
- **Selection masks** — luma/color keys for targeted grades later.

## 3 · Grade & color unification (the cohesion engine)
- **Neutralize** each plate to a common white point first (so nothing is "warmer" than the set).
- **Match black/white point + gamma** across all shots.
- **Brand duotone/tritone map** — shadows→ink, mids/accent→indigo, highlights→paper, so
  every image lives in the same palette (Ideogram's `color_palette` gets us 80% there; this finishes it).
- **Selective color** — make indigo the *only* saturated hue; desaturate competitors.
- **Contrast curves** — but keep the type zone low-contrast/flattened.

## 4 · Integration — "selling the comp" (making elements belong)
- **Match light** — direction, softness, color temperature across all elements; relight with gradients + dodge/burn so one light governs the frame.
- **Shadows** — contact shadows + ambient occlusion where elements meet; matched shadow density/softness.
- **Perspective/scale/horizon** — consistent vanishing + element scale.
- **Edge integration** — **light wrap** (bg light bleeding onto fg edges), micro edge-blend so cutouts never look pasted.
- **Bounce/interactive light & reflections** where elements touch.

## 5 · Depth & focus
- **Atmospheric perspective** — subtle haze with distance.
- **Depth of field** — blur by distance; one focal plane; keep the type zone calm.

## 6 · Texture & grain unification (the tie-it-together trick)
- **One unified grain/noise pass** over the whole comp — matched grain marries disparate sources (the classic compositor move).
- **Paper texture** overlay (fits the monograph brand), subtle **vignette**, restrained lens character; **dither** gradients to kill banding.

## 7 · Typographic integration (deck-specific, where decks live or die)
- **Scrim/contrast control** behind text — local darken/lighten or a soft gradient so type
  hits WCAG contrast without a flat box; image stays visible.
- **Grid & baseline** alignment; optical kerning; hanging punctuation; consistent eyebrow/number/footer treatment.
- **Type↔image interplay** — indigo/ink type on paper; for a hero, mask the image *into*
  the letterforms or knock the headline out of a duotone field.
- **Crispness** — keep type as *live vector text* (HTML/PDF) over a raster plate; never bake type into the image.

## 8 · Motion (only if animated)
- Parallax layers, slow drift, eased reveals, hold frames; motion blur on moving layers.

## 9 · Finishing & QA
- **Cohesion audit across ALL slides** — same grade, grain, margins, type treatment (the consistency = competence signal).
- **Read at thumbnail AND on a projector AND on a laptop** — does the focal point survive small? does text survive a washed-out beamer?
- Halo/edge-fringe sweep, banding/dither check, contrast/accessibility check on every text block, multi-display color proof.

## 10 · Export / delivery
- **Master** (lossless PNG / layered source archived) → **delivery** (PDF with live vector type + right-DPI raster; optimized web HTML; @1x/@2x).
- Embed fonts; sensible image compression; **asset manifest** + versioning.

---

## How this maps to OUR build (deck-appropriate subset)
The deck is a canvas/HTML system, so we don't need full roto/Nuke — but the *principles* are
what separate designed from slop, and most are cheap here:
- **Grade unification + duotone + grain + vignette + dither**: a single post pass over every
  Ideogram/FAL plate (image-edit step or canvas filters) → one cohesive set.
- **Type zone + scrim + grid + live vector type**: done in the canvas renderer (we already
  control layout via pretext) — reserve quiet zones, draw soft scrims, keep text crisp.
- **Matting/light-wrap/contact shadow**: only for the 2–3 hero slides with layered elements
  (cover, the bridge, vision) using RMBG; the rest are graded atmospheric backgrounds.
- **Depth/DOF**: subtle, on heroes only.
- **QA cohesion + thumbnail/projector read + export to HTML+PDF**: the final gate.

Result: backgrounds that look *art-directed and integrated*, type that's razor-crisp and
legible, and a set that feels like one hand made it.
