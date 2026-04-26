# Integrating the bluebonnet field into `lupine-site`

A working prototype lives at `index.html`. This is the spine of the experience: a procedural Texas bluebonnet field you walk through with the scroll wheel. It runs as a single self-contained HTML file. The job now is to fold it into the existing Astro app at `github.com/alexwelcing/lupine/lupine-site/` without losing any of the photographic qualities the prototype was tuned for.

## What the prototype delivers today

- Single-file HTML, runnable via `file://` or any static server. No build step.
- Three.js r128 from cdnjs.
- 30k–80k instanced bluebonnet stalks (auto-scales by viewport width) with a vertex-shader wind sway.
- Procedural rolling-hills terrain via 2D simplex noise, shaded with vertex colors mixing grass to warm hay.
- Sky gradient dome (cheap, photographic; not analytic Hosek-Wilkie yet).
- Sun directional + sky/ground hemisphere light, linear horizon fog.
- A 12-control-point Catmull-Rom spline path; vertical scroll = walk forward.
- Macro-to-micro camera state on **M** (or pinch on touch), with the *Lupinus texensis* caption.
- Audio toggle scaffold wired to three `<audio>` elements; drop in the HollywoodEdge WAVs from the shopping list and the toggle works as-is.
- Upper-left "Lupine — a field study" title; lower-left fade-out first-session hint.

## What is intentionally missing

These are deferred to follow-ups; each maps to a Stitch frame from the design pass.

- **Found objects** (signpost, boulder, journal, jars). Each is a separate `THREE.Group()` placed at a known parametric `t` along the spline (see "Anchoring objects" below).
- **Wander mode.** Stub left at `// {wander}` in the keydown handler. Replace with PointerLockControls on `w`.
- **True analytic sky shader** (Hosek-Wilkie/Preetham). The gradient dome is good enough for a first viewing; switch when you decide on a daylight-cycle spec.
- **Spatialized audio** — currently single-channel HTMLMediaElement. For directionally-located cicadas etc., move to PositionalAudio and PannerNode.
- **Shadow casting** — flowers cast no shadows (cost-prohibitive). Future signposts and boulders will, via a small dedicated shadow map.
- **Far-LOD billboard** at 120 m. The current build relies on fog alone to dissolve the horizon; the BlackBoxGuild video frame becomes a single backdrop plane.

## Suggested directory layout in `lupine-site`

```
lupine-site/
  src/
    pages/
      index.astro              # current home — kept as-is during transition
      field.astro              # NEW: hosts the bluebonnet field
    components/
      field/
        Field.astro            # the canvas + chrome wrapper
        FieldScene.client.ts   # the Three.js code (extracted from index.html)
        ChromeOverlay.astro    # title, hint, audio panel
      field/objects/
        TrailheadSignpost.ts   # iteration 2 (placeholder)
        BoulderPlaque.ts       # iteration 3 (placeholder)
        FieldJournal.ts        # iteration 4 (placeholder)
        SpecimenJars.ts        # iteration 5 (placeholder)
  public/
    assets/
      audio/
        cicada.wav             # HollywoodEdge "Cricket Ambience"
        field-meadow.wav       # HollywoodEdge "Field and Meadow Ambience"  (id 6f8fbb40-...)
        ridge-wind.wav         # HollywoodEdge "Designed Wind Ambience"
      video/
        bluebonnet-dolly.mp4   # BlackBoxGuild slow dolly, 4K, 45 s (id 63536676-...)
        bluebonnet-wide.mp4    # SANCUS-Media-Agency wide field, 4K, 9 s (id 2f52124e-...)
      photos/
        macro-bluebonnet.jpg   # ToastedPictures macro (id 3d46892e-...)
        wide-pasture.jpg       # wirestock wide pasture (id 892ae600-...)
        horizon-billboard.jpg  # DanThornberg dense indigo carpet (id de7e04bd-...)
  assets.json                  # provenance, see file in this repo
```

Drop the existing public assets into `public/assets/...` per the manifest. The prototype's relative paths are already aligned with this layout.

## Step-by-step migration

1. **Create the new route.** Add `src/pages/field.astro`. Make it the eventual homepage by swapping `index.astro` once the field is ready; until then, `/field` is its own URL so the existing manuscript site stays live.
2. **Extract the script.** Move the inline `<script>` block out of `index.html` into `src/components/field/FieldScene.client.ts`, exporting a `mountField(canvas: HTMLCanvasElement)` function that takes the canvas element and runs the loop.
3. **Wrap the canvas.** `Field.astro` renders the canvas, the chrome overlay, and the `<audio>` stems. Use `client:load` to hydrate `FieldScene.client.ts`.
4. **Pin Three.js.** Add `three@0.128` to `package.json` rather than CDN-loading at runtime. The prototype uses CDN purely for zero-build portability; in Astro, bundle it.
5. **Move the styles.** The CSS in the prototype maps cleanly to the existing Tailwind tokens — keep the chrome simple, no Tailwind explosion.
6. **Wire fonts.** The Astro app already loads Newsreader and Space Grotesk. Verify the field uses those (not Manrope, which Stitch's design system selected).
7. **Set the canvas to fixed full-viewport.** `body { overflow: hidden }` because we capture the wheel ourselves. This is a hard departure from the existing manuscript page; if you want the manuscript still scrollable elsewhere, scope these styles to the `/field` route only.

## Anchoring objects to the spline

Found objects sit at known `t` parameters along the path. The pattern:

```ts
function placeAtPathT(group: THREE.Group, t: number, lateral = 0) {
  const p = path.getPointAt(t);
  const aheadT = Math.min(t + 0.001, 1);
  const ahead = path.getPointAt(aheadT);
  // Lateral offset, perpendicular to the path direction
  const dir = ahead.clone().sub(p).normalize();
  const left = new THREE.Vector3(-dir.z, 0, dir.x);
  const pos = p.clone().addScaledVector(left, lateral);
  pos.y = heightAt(pos.x, pos.z);
  group.position.copy(pos);
  group.lookAt(pos.clone().add(dir));
  scene.add(group);
}

placeAtPathT(makeTrailheadSignpost(),  0.04, +0.6);   // 5 m in, slightly to the right
placeAtPathT(makeBoulderPlaque(),       0.25, -1.2);   // 25 % along, off to the left
placeAtPathT(makeFieldJournal(),        0.50, +0.8);   // halfway, set on a flat stone
placeAtPathT(makeSpecimenJars(),        0.70, -1.0);   // 70 %, fence to the left
```

When the camera approaches an object (Euclidean distance under ~6 m on the path), trigger the slow-down by clamping `walkedTarget` velocity. When close enough (~2 m), reveal the object's "[ press · or click ]" prompt. On click/press, run that object's read animation (each object module owns its own).

## Performance pass before launch

- **Profile on M-series + integrated GPU + iPhone.** Target 60 fps on M-series at 1440p, 30 fps on integrated at 1080p, 30 fps on iPhone 12 at default density.
- **Drop flower count to 30k on `prefers-reduced-motion`** (and also if `navigator.deviceMemory < 4`).
- **Halve the wind sway frequency on devices reporting `<= 4` cores** — the wind's perceived motion is the most expensive thing in this scene.
- **Frustum-cull instances by chunk.** Today every flower is in one InstancedMesh. Split into a 3×3 grid of InstancedMeshes around the active path tile; cull whole grid cells when off-camera.
- **Bake the horizon LOD** from `bluebonnet-wide.jpg` (DanThornberg, 5616×3744 → 2048×1024 JPEG). One `THREE.PlaneGeometry` at z = -180 m, fog-blended at the far edge.
- **Compress audio.** WAVs are huge. Re-encode the three HollywoodEdge tracks to 96 kbps Opus (.ogg) for the actual deploy.

## The found-object roadmap

| Iteration | Object | Stitch frame ID | Repo location |
|---|---|---|---|
| 2 | Trail-head signpost | "The trail-head, approached/read" | `objects/TrailheadSignpost.ts` |
| 3 | Brass-plaque boulder | "The boulder, approached/read" | `objects/BoulderPlaque.ts` |
| 4 | Open field journal | "The journal, approached/opened/page-turned" | `objects/FieldJournal.ts` |
| 5 | Specimen jars on fencepost | "The specimen line, approached/read" | `objects/SpecimenJars.ts` |
| 6 | Macro-to-micro state | "The field, mid-walk / One bluebonnet" | already in `FieldScene.client.ts` |
| 7 | Audio toggle + first-session hint | (chrome) | already in `ChromeOverlay.astro` |
| 8 | Wander mode | (no Stitch frame; stub on `w`) | `controls/Wander.ts` |

## Open questions before launch

- Does the field replace the entire homepage, or does scrolling past the field hand off to the existing manuscript content below? (My recommendation: the field IS the homepage, and the manuscript becomes `/manuscript` for the people who want it that way.)
- Real-world geographic anchor — does the path lat/lon match a real Texas Hill Country location for symbolic provenance? If yes, list it in the colophon.
- Mobile viewport: portrait-only or do we lock to landscape? The current density assumes landscape.
- Accessibility: does the path advance for keyboard users (Page Down / Space)? The current handler only listens to wheel + touch.

## Running the prototype as-is

```bash
cd outputs/lupine-site-prototype
python3 -m http.server 8000   # or any static server
open http://localhost:8000/
```

You can also `open index.html` directly via `file://`. The audio elements will 404 until you drop the WAVs at `assets/audio/...`, but the field renders fine without them.
