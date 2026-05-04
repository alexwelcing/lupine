# Meta Quest Browser Compatibility — Status & Posture

Status: **Current — verified against `@react-three/xr` 6.6.29 (May 2026).**
Owner: AR viewer team.

## TL;DR

The viewer is configured to be a first-class citizen of the Meta Quest
Browser (Quest 2 / 3 / Pro). The relevant library, `@react-three/xr`, is
already pinned to its latest published version. The session-level options
in `xrStore` request every Quest-supported feature optionally, so the
session starts cleanly on older Quest 2 devices and unlocks the full
feature set on Quest 3.

## Library versions

| Package                       | Pinned         | Latest         | Notes                                                      |
|-------------------------------|----------------|----------------|------------------------------------------------------------|
| `@react-three/xr`             | 6.6.29         | 6.6.29         | Latest. Sole package directly responsible for Quest WebXR. |
| `@react-three/fiber`          | 9.5.0          | 9.6.1          | Patch bump available. Low-priority.                        |
| `@react-three/drei`           | 10.7.7         | 10.7.7         | Latest.                                                    |
| `@react-three/postprocessing` | 3.0.4          | 3.0.4          | Latest.                                                    |
| `three`                       | 0.170.0        | 0.184.0        | 14-version gap. Quest features are stable across this range; bump deferred until it can be tested with a real device. |

The Quest browser's WebXR support hasn't gained features that require a
newer `three` than 0.170 — hand tracking, hit-test, anchors, plane and
mesh detection, and depth sensing all work today.

## Session config (see `App.tsx`)

`createXRStore` is invoked with:

- `frameRate: 'high'` — Quest 3 hits 90 Hz, Quest Pro 120 Hz.
- `foveation: 0.5` — moderate fixed-foveated rendering, big GPU win.
- `handTracking: true` — explicit (and the default).
- `hitTest: true` — for "tap the table to place" workflows.
- `anchors: true` — stable world placement after the user moves the model.
- `planeDetection: true`, `meshDetection: true` — Quest 3 scene mesh.
- `hand: { rayPointer: { rayModel: { maxLength: 1.5 } } }` — short hand
  ray for menu interactions; direct manipulation lives in
  `XRMoleculeInteraction`.

All advanced features are **optional** (`true`, not `'required'`), so a
Quest 2 session still starts even though it can't satisfy the Quest 3-only
features.

## Why we don't bump `three` yet

- The visible Quest features (hand tracking, hit-test, anchors) are
  fully covered by `three@0.170` + `@react-three/xr@6.6.29`.
- Bumping `three` means crossing 14 minor versions, each of which can be
  breaking under three.js's idiosyncratic versioning. The risk surface
  spans color management defaults, postprocessing pipelines, and the
  USDZ exporter we depend on for Apple AR Quick Look.
- We don't have a Quest device in CI; a bump should be paired with a
  manual session smoke test on a real headset.

## Upgrade plan when a device + bandwidth are available

1. Bump `three` and `@types/three` to `^0.180.0`, then `^0.184.0`.
2. Bump `@react-three/fiber` to `^9.6.0`.
3. Run the existing vitest suite.
4. Hand-test on a Quest 3:
   - Enter AR.
   - Verify the entry animation eases in (no giant pop-in).
   - Pinch-grab the molecule with each hand.
   - Throw the molecule and verify floor bounce.
   - Confirm the floating control panel still receives pinch taps.
5. Verify `USDZExportPipeline.ts` still produces a Quick-Look-loadable
   archive (the GLTFExporter and USDZExporter sometimes break on three
   minor bumps).
