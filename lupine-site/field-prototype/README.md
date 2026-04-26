# lupine-site prototype — bluebonnet field

A working spine of the new lupine.science: a procedural Texas Hill Country bluebonnet field you walk through with the scroll wheel.

## Files

| File | Purpose |
|---|---|
| `index.html` | Single-file Three.js scene. Open it directly in any modern browser. |
| `INTEGRATION.md` | How to fold this into the existing Astro app at `github.com/alexwelcing/lupine/lupine-site/`. |
| `assets.json` | Provenance manifest pairing every Envato asset ID to its expected local path and role. |
| `README.md` | This file. |

## Run it now

```bash
cd lupine-site-prototype
python3 -m http.server 8000
```

Open `http://localhost:8000`. Or just `open index.html` to view via `file://`.

Scroll to walk forward. Press **M** to dive to a single bluebonnet stalk; press **M** again (or **Esc**) to return. Click the small wave icon in the lower-right to reveal the audio panel — toggles do nothing until you drop the WAVs in `assets/audio/` per `assets.json`.

## What works in the prototype

- Procedural rolling hills (2D simplex noise).
- 30k–80k instanced bluebonnet stalks, density auto-scaled to viewport width.
- Vertex-shader wind sway with per-instance phase, drifting global wind vector.
- Sky gradient dome, sun directional light, hemisphere fill, linear horizon fog.
- 12-control-point Catmull-Rom spline trail; vertical scroll = walking forward (page itself doesn't scroll).
- Macro-to-micro camera state (M / pinch).
- The only chrome: upper-left "Lupine — a field study" title, lower-right audio toggle, lower-left first-session hint that fades after 8 s and never returns.

## What's stubbed but not yet built

See `INTEGRATION.md`'s "found-object roadmap" — the trailhead signpost, the brass-plaque boulder, the open field journal, the specimen jars, and the wander mode (WASD).

## How this was made

1. **Plan.** The vision and constraints were captured in `outputs/bluebonnet-field-plan.md` after a Q&A with Alex about identity, sections, time of day, and the macro-to-micro feature.
2. **Art direction.** A new Stitch project ("Texas Bluebonnet Trail") generated 13 photographic mockup frames covering the field, signpost, boulder, journal, jars, and macro state. Those are art-direction targets for this implementation.
3. **References.** An Envato browse session identified 13 assets (videos, photos, sound effects) that the build can pull on; manifest at `assets.json`.
4. **This prototype.** The Three.js spine. Honest about its scope: spine of the experience, not the entire site.

## Next session priorities

1. Drop the three HollywoodEdge audio WAVs into `assets/audio/` and verify the audio toggle plays.
2. Bake the DanThornberg horizon photo into a 2048×1024 JPEG and add it as a far backdrop plane.
3. Build `TrailheadSignpost.ts` as the first found object — it's the simplest and the most important.
4. Profile on the user's actual hardware, set the flower count and wind-LFO frequency to match.
