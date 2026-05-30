import { createXRStore } from '@react-three/xr';

// XR store — tuned for the Meta Quest browser (Quest 2/3/Pro) while staying
// graceful on non-Meta runtimes. All advanced features are requested as
// *optional* (XRSessionFeatureRequest = true) so a session still starts on
// devices that lack them.
export const xrStore = createXRStore({
  offerSession: false,
  emulate: false,
  // Quest 3 reliably hits 90 Hz; default of 72 leaves frames on the table.
  frameRate: 'high',
  // Foveated rendering — Quest GPU loves this; 0 disables, 1 is max.
  foveation: 0.5,
  // We hand-build the session init (rather than use the named feature options)
  // so we can request 'light-estimation' alongside the usual Quest 3 features —
  // @react-three/xr has no first-class option for it, and customSessionInit
  // takes over feature negotiation entirely (see @pmndrs/xr buildXRSessionInit).
  // 'light-estimation' lets XRLightEstimation mirror the real surroundings onto
  // the molecule (campfire reflections in low light). Everything stays optional,
  // so a session still starts on devices that lack any given feature; this list
  // mirrors the previous defaults (hand-tracking, layers, hit-test, anchors,
  // plane/mesh detection, dom-overlay) plus light-estimation.
  customSessionInit: {
    requiredFeatures: ['local-floor'],
    optionalFeatures: [
      'hand-tracking',
      'layers',
      'hit-test',
      'anchors',
      'plane-detection',
      'mesh-detection',
      'dom-overlay',
      'light-estimation',
    ],
  },
  // Direct manipulation lives in XRMoleculeInteraction (reads joint poses
  // every frame). The short hand ray remains as a fallback for menu / UI.
  hand: {
    rayPointer: { rayModel: { maxLength: 1.5 } },
    teleportPointer: false,
    grabPointer: false,
  },
});
