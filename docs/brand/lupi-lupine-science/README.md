# LUPI and Lupine Science Logos

Final direction: bluebonnet raceme first. No atom marks, no orbital rings, no molecule glyphs.

## System

- `lupi-mark.svg`: abstract product mark construction reference. Pearl/floret rhythm, hidden petal arcs, favicon-friendly.
- `lupine-science-mark.svg`: botanical field-science mark with leaves and registration ticks.
- `hit-reel-storyboard.svg`: five-frame logo reveal plan inspired by luminous studio reels.
- `comfy/model-registry.json`: local model lanes, exact files, and operational notes.

## Current Keepers

- Product mark: `renders/lupi-mark-seed-1024.png`
- Approved Lupine Science icon crop: `renders/lupine-science-icon-470.png`
- Scientific drawing plate: `renders/lupi_anima_scientific_plate_00001_.png`
- Local Wan 2.2 5B ident proof: `renders/lupi_wan22_5b_logo_hit_reel_00003_.mp4`
- Wan ident contact sheet: `renders/lupi_wan22_5b_logo_hit_reel_00003_contact_sheet.png`

## Design Notes

- The core silhouette is a Texas bluebonnet flower spike, not an atom.
- The small circles and ovals read as florets/seed pearls at small sizes.
- The folded ovals behind the LUPI mark reference bluebonnet petals, not orbits.
- The science layer is field evidence: registration ticks, cyanotype colors, measured symmetry.
- The glow treatment is a production layer only. The approved production mark is the icon crop, not a wordmark lockup.

## Palette

- Void blue: `#031927`
- Field navy: `#102f47`
- Bluebonnet: `#475b9c`
- Slate lupine: `#6b8aaf`
- Manuscript: `#fef8f5`
- Pearl: `#f5f0df`
- Sage: `#4c653d`

## Local Comfy Workflows

Comfy is expected at `http://127.0.0.1:8199`.

Text-to-image glow concept:

```powershell
python docs\brand\lupi-lupine-science\comfy\run_comfy_logo_workflow.py `
  --workflow docs\brand\lupi-lupine-science\comfy\lupi_bluebonnet_glow_t2i_api.json
```

Minimal hit-reel direction, closer to the reference sheet:

```powershell
python docs\brand\lupi-lupine-science\comfy\run_comfy_logo_workflow.py `
  --workflow docs\brand\lupi-lupine-science\comfy\lupi_bluebonnet_minimal_glow_t2i_api.json
```

Image-to-image refinement from the SVG-rendered seed:

```powershell
python docs\brand\lupi-lupine-science\comfy\run_comfy_logo_workflow.py `
  --workflow docs\brand\lupi-lupine-science\comfy\lupi_bluebonnet_refine_img2img_api.json `
  --source-image docs\brand\lupi-lupine-science\renders\lupi-mark-1024.png
```

Both workflows use the local Z-Image Turbo GGUF path and do not use provider-spend API nodes.

Anima scientific drawing still:

```powershell
python docs\brand\lupi-lupine-science\comfy\run_comfy_logo_workflow.py `
  --workflow docs\brand\lupi-lupine-science\comfy\lupi_anima_scientific_plate_t2i_api.json
```

Wan 2.2 5B logo hit-reel smoke from a seed image:

```powershell
python docs\brand\lupi-lupine-science\comfy\run_comfy_logo_workflow.py `
  --workflow docs\brand\lupi-lupine-science\comfy\lupi_wan22_5b_logo_hit_reel_i2v_api.json `
  --source-image docs\brand\lupi-lupine-science\renders\lupi-mark-1024.png
```

Anima and Wan model installation details live in `comfy/model-registry.json`.
