# "Open in Snapchat" — Planning Doc

Status: **Proposal / pre-implementation**.
Owner: AR viewer team.
Related: `docs/product-feedback/ar-viewer-feedback-2026-04-29.md` ("Snapchat
compatibility exploration", P2).

## Goal

From the GlimPSE molecule viewer, let a user tap **Open in Snap** and land
inside the Snapchat camera with their molecule rendered as an AR Lens —
correctly colored, in PBR, scaled to fit a real surface, and ready to share.

## What "good" looks like

- One tap from the AR viewer launches Snapchat (mobile) or our embedded Camera
  Kit web canvas (desktop fallback).
- The molecule the user *just* configured (color mapping, atom scale, render
  style) is what they see in Snap — no re-uploads, no manual export.
- Material and color parity with the WebGL viewer is acceptable to a domain
  scientist (i.e., element coloring + property heatmaps survive the export).
- Lens loads in < 5 s on LTE for moderate molecules (≤ 5 000 atoms / ≤ 8 MB).

## Two viable paths

### Path A — Lens Studio + remote GLB (recommended)

1. We build a **single, generic Lupine Molecule Lens** in Lens Studio. It
   contains:
   - A GLTF Loader script that fetches a GLB from `lensQueryParameter` (the
     `metadata` field of the deep link).
   - A surface-tracking template for "place on table".
   - PBR materials with environment lighting estimation enabled.
2. The web viewer adds a **GLB exporter** alongside the existing
   `USDZExportPipeline`. It bakes per-atom colors as vertex colors (or as a
   small palette texture) and embeds metallic/roughness from the user's
   `materialPreset`.
3. The exported GLB is uploaded to a CDN endpoint we control
   (`https://cdn.lupine.science/molecules/<hash>.glb`).
4. We construct a deep link:
   ```
   https://www.snapchat.com/unlock/?type=SNAPCODE&uuid=<lensId>&metadata=<encoded-glb-url>
   ```
   On mobile this universally hands off to the Snapchat app; on desktop it
   shows a QR code.
5. The Snap Lens reads `metadata`, fetches the GLB, instantiates it.

**Pros:** one Lens to maintain, no per-molecule Lens publishing, works for
arbitrary user-generated structures.
**Cons:** requires Snap dev account + Lens publishing flow; Lens Studio
remote-asset loading has size/format restrictions (≤ 8 MB GLB, ≤ 2 048×2 048
textures, no skinned meshes — fine for our use).

### Path B — Camera Kit Web SDK embed (fallback / desktop)

1. Pull in `@snap/camera-kit` JS SDK.
2. Render the user's molecule as a `<canvas>` and feed it into Camera Kit as
   a video texture, with the same Lens applied.
3. Composite the result back into our viewer.

**Pros:** runs on desktop without Snapchat install, gives us a "preview in
Snap style" without the deep-link round trip.
**Cons:** SDK is heavy (~1.5 MB), API key required, doesn't reach the
"share to friends" loop that makes Snap valuable.

We'd ship Path A as the primary CTA and keep Path B as the desktop preview.

## Concrete next steps (ordered by leverage)

1. **GLB export** — extend `USDZExportPipeline` with a sibling
   `GLBExportPipeline` using `three/examples/jsm/exporters/GLTFExporter.js`.
   Bake colors into `THREE.Color` vertex attributes so Lens Studio's default
   PBR shader picks them up without a custom shader graph.
   - Target: ≤ 5 MB for a 5 000-atom molecule.
   - Acceptance test: open the GLB in Babylon Sandbox; element colors match
     the viewer.

2. **Cloud upload** — small Vercel/Cloudflare Worker endpoint that takes a
   GLB blob, hashes it (SHA-256 → CDN key), stores it in R2/S3, returns a
   signed read URL. 30-day TTL is plenty for a "share with a friend" loop.

3. **Lens build** — register `lupine-science` in Snap Kit Developer Portal,
   build the Lens described above, publish it as a public Lens with a
   stable `lensId`. Ship the Lens project in this repo under
   `lens-studio/lupine-molecule-lens/` so it lives with our codebase.

4. **Deep link button** — add an "Open in Snap" button next to "View AR" in
   `App.tsx`. On click:
   ```ts
   const glbUrl = await uploadGLB(await exportGLB(currentScene));
   const link = `https://www.snapchat.com/unlock/?type=SNAPCODE`
     + `&uuid=${LUPINE_MOLECULE_LENS_ID}`
     + `&metadata=${encodeURIComponent(glbUrl)}`;
   window.location.href = link;
   ```

5. **Color parity QA** — automate a screenshot diff between the WebGL viewer
   and a headless Lens render (Snap provides a `lens-cli` for this). Gate
   the GLB exporter PR on a < 5 % mean color delta.

## Open questions for the team

- Do we want to ship as a public Lupine Lens (anyone can scan and use) or
  gate behind a Snap Login? Public is simpler and matches the "share a
  molecule with a friend" pitch. (Recommendation: public.)
- What's the molecule-size cap? GLB size and Lens runtime budget will pick
  the cap for us — likely ~8 000 atoms before frame rate degrades on a
  mid-tier phone.
- Should the Lens animate trajectories or only show frame 0? Lens Studio
  supports baked animations but they bloat the GLB; a static frame-0 export
  is the v1.

## Why bother

Snap's audience is wildly different from a research-tool audience. An
"Open in Snap" button is a low-cost way to put molecular structure into
classrooms, recruitment posts, and public-engagement contexts where a
WebGL viewer never reaches. It's also the only one of our currently
explored AR targets that has friction-free social sharing built in.
