# Release Notes - Controls Palette
## LUPI viewer controls rollout

**Status:** Ship-ready locally

**Primary audience:** LUPI users tuning molecular views for inspection, publication, and export
**Verification:** `pnpm --filter @atlas/web build` and `pnpm verify:controls -- --no-screenshot`

---

## What Users Get

- A dockable desktop Controls palette that can be moved, resized, collapsed, and reopened.
- One tabbed surface for Look, Surface, World, and Export settings.
- More room around the molecule: desktop controls no longer live in a fixed right-side drawer.
- Cleaner panel chrome: embedded controls and export views use one close affordance instead of stacked close buttons.
- Mobile behavior remains a bottom sheet, preserving the existing small-screen interaction model.

## Controls Included

- **Look:** visual grade, atom coloring, property color, uniform color, element overrides, and click-sound toggle.
- **Surface:** render style, material recipe, atom scale, material mix, roughness, polish, clearcoat, bonds, and bond coloring.
- **World:** authored background scenes, filter-shell controls, environment, lighting, and post-process context.
- **Export:** PNG, JPG, USDZ, GLB, and MP4 export actions from the same Controls palette.

## Engineering Notes

- `PanelHost` owns desktop tool-panel routing.
- `DockableWindow` owns desktop movement, resize, collapse, close, snapping, and viewport clamping.
- `ViewerControlsDrawer` owns the tabbed controls surface and can render with mobile chrome or embedded desktop chrome.
- `StudioControlDeck` and `FigureExportPanel` now support embedded mode by suppressing their internal close buttons.
- `tools/verify-controls.mjs` starts Vite on a free OS-assigned port unless `VERIFY_URL` is provided, making the smoke test usable locally, in CI, and against preview/live URLs.

## Ship Checklist

- Local build: `pnpm --filter @atlas/web build`
- Local controls smoke: `pnpm verify:controls -- --no-screenshot`
- Optional visual artifact: `pnpm verify:controls`
- Live verification after deploy: `VERIFY_URL=https://lupi.live pnpm verify:controls -- --no-screenshot`

## Rollback

The normal rollback path is the viewer Cloud Run revision rollback for `lupi.live`, or a revert of the controls rollout commit followed by the standard push-to-main deploy.
