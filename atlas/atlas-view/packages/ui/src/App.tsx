/**
 * Lupi - premium molecular viewer shell.
 *
 * Professional molecular dynamics visualization with
 * glassmorphic UI, side panels, and publication-quality rendering.
 */

import { useEffect, useCallback, useRef, useState, Component, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, ContactShadows } from '@react-three/drei';
import { Perf } from 'r3f-perf';
import { ScenePostprocessing } from './postprocess/ScenePostprocessing';
import { DevProbe } from './DevProbe';
import { McpViewerBridge, McpViewerHarness } from './mcpViewerBridge';
import { StateInspector } from './StateInspector';
import * as THREE from 'three';
import { useXR } from '@react-three/xr';
import { USDZExportHelper } from './export/USDZExportPipeline';
import { XREnvironmentDome } from './xr/XREnvironmentDome';
import { XRLightEstimation } from './xr/XRLightEstimation';
import { SceneLighting } from './SceneLighting';

import { MobileHUD } from './MobileHUD';
import { ChronosHUD } from './ChronosHUD';
import { VolcanicHUD } from './VolcanicHUD';
import { TelemetryHUD } from './TelemetryHUD';

import { useStore } from './store';
import { getMaxSafeAtomCount, getDefaultQualityTier } from './deviceCapabilities';
import { LandingPage } from './LandingPage';
import { SceneLandingPage } from './landing/SceneLandingPage';
import { SeoEducationPage } from './landing/SeoEducationPage';
import { ThermoMinimap } from './ThermoMinimap';
import { AtomsOptimized } from '@atlas/scene/AtomsOptimized';
import { AtomClusters } from '@atlas/scene/AtomClusters';
import { buildClusters, type Clusters } from '@atlas/scene/ClusterBuilder';
import { SpatialAnchor } from './SpatialAnchor';
import { Bonds } from '@atlas/scene/Bonds';
import { AnnotationsLayer } from './AnnotationsLayer';
import { SelectionMarkers } from './SelectionMarkers';
import { AtomInfoHUD } from './AtomInfoHUD';
import { CameraFocus } from './CameraFocus';
import { AtomTrails } from './AtomTrails';
import { TYPE_RADII } from '@atlas/scene';
import { useSmoothFramePlayback, type InterpolatedFrameState } from './hooks/useSmoothFramePlayback';
import { SimulationCell } from '@atlas/scene/SimulationCell';
import { ScaleBar } from '@atlas/scene/ScaleBar';
import { getBackgroundFromColormap } from '@atlas/scene';
import { FigureExportPanel } from './panels/FigureExportPanel';
import { FlythroughPanel } from './panels/FlythroughPanel';
import { TelemetryPanel } from './panels/TelemetryPanel';
import { PotentialBrowser } from './panels/PotentialBrowser';
import { EquilibriumSolveWorkbench } from './EquilibriumSolveWorkbench';
import { MlipLongRunWorkbench } from './MlipLongRunWorkbench';
import { MlipFlywheelPage } from './MlipFlywheelPage';
import { GhostAtoms } from './GhostAtoms';
import { AtomPicker } from '@atlas/scene/AtomPicker';
import { decodeFlythrough } from './flythrough';
import type { SpatialHash3D } from '@atlas/scene/SpatialHash';
import type { ColormapName } from '@atlas/core/types';
import { getElementSpec } from '@atlas/core';
import { ExportManager } from './ExportManager';
import { AnomalyTracker } from '@atlas/scene/AnomalyTracker';
import { BatchAssetGenerator } from './BatchAssetGenerator';
import { CameraPresetButton, TransportButton } from './controls';
import { CommandPalette } from './CommandPalette';
import { LupiAuthCallout } from './LupiAuthCallout';
import { LupiAgentDock } from './LupiAgentDock';
import { SavedViewButton } from './SavedViewButton';
import { MoleculeConfigurator } from './molecules/MoleculeConfigurator';
import { openRandomOmol25Molecule } from './molecules/randomOmol';
import { loadSavedMolecularView } from './savedViews';
import { recognizeLupiUrlPayload } from './lupiUrlRecognition';
import { track, ANALYTICS_EVENTS, ensureAnalyticsSession } from './analytics';
import { detectRenderCapability } from './renderCapability';
import { MoleculeFilterShell } from './MoleculeFilterShell';
import { PanelHost } from './PanelHost';
import { ViewerControlsDrawer, type ViewerControlMode } from './ViewerControlsDrawer';
import { StudyLensPanel } from './StudyLensPanel';
import {
  useViewerBackgroundState,
  useViewerFileState,
  useViewerPanelState,
  useViewerPlaybackState,
} from './storeSelectors';
import {
  SEO_EDUCATION_ROUTES,
  currentHashRoute,
  currentPathRoute,
  isEmojiRoute,
  isMcpViewerRoute as isMcpViewerRouteMatch,
  isTestbedRoute,
  normalizedPathRoute,
  savedViewSlugFromRoute,
} from './viewer/viewerRoutes';
import { openMolecule } from './viewer/openMolecule';
import { PresetLegacyBridge } from './viewer/PresetLegacyBridge';
import { ViewerCanvas } from './viewer/ViewerCanvas';
import { useViewerSceneModel } from './viewer/useViewerSceneModel';

export { xrStore } from './viewer/xrStore';

// ─── Icons ────────────────────────────────────────────────────────────
const IconFirst = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 4v16M10 12l8-6v12l-8-6z" />
  </svg>
);
const IconPrev = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M19 20L9 12l10-8v16z" />
  </svg>
);
const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7L8 5z" />
  </svg>
);
const IconPause = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);
const IconNext = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M5 4l10 8-10 8V4z" />
  </svg>
);
const IconLast = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 4v16M14 12L6 6v12l8-6z" />
  </svg>
);
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
// ─── Friendly Toolbar Icons ───────────────────────────────────────────
// Lupi toolbar glyphs: specimen-frame linework, not emoji or generic app art.
function LupiGlyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4.5 7.25V4.5h2.75" opacity="0.46" />
      <path d="M16.75 4.5h2.75v2.75" opacity="0.46" />
      <path d="M19.5 16.75v2.75h-2.75" opacity="0.46" />
      <path d="M7.25 19.5H4.5v-2.75" opacity="0.46" />
      {children}
    </svg>
  );
}

const IconLook = () => (
  <LupiGlyph>
    <path d="M7 12c1.35-2.15 3.02-3.22 5-3.22S15.65 9.85 17 12c-1.35 2.15-3.02 3.22-5 3.22S8.35 14.15 7 12Z" />
    <circle cx="12" cy="12" r="1.65" />
    <path d="M8.4 6.75 7.5 5.5" opacity="0.58" />
    <path d="M15.6 17.25l.9 1.25" opacity="0.58" />
  </LupiGlyph>
);

const IconSurface = () => (
  <LupiGlyph>
    <path d="M6.7 15.8c2.15-1.35 4.1-1.35 5.85 0 1.4 1.05 3.03 1.05 4.75 0" />
    <path d="M6.7 11.8c2.15-1.35 4.1-1.35 5.85 0 1.4 1.05 3.03 1.05 4.75 0" opacity="0.72" />
    <circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" opacity="0.72" />
    <circle cx="12" cy="7" r="0.8" fill="currentColor" stroke="none" opacity="0.72" />
    <circle cx="16" cy="8" r="0.8" fill="currentColor" stroke="none" opacity="0.72" />
  </LupiGlyph>
);

const IconWorld = () => (
  <LupiGlyph>
    <path d="M6.5 14.8c1.75 1.05 3.58 1.58 5.5 1.58s3.75-.53 5.5-1.58" />
    <path d="M6.5 10.2c1.75-1.05 3.58-1.58 5.5-1.58s3.75.53 5.5 1.58" />
    <path d="M12 6.5v11" opacity="0.7" />
    <path d="M8.8 7.2c-.82 3.12-.82 6.48 0 9.6" opacity="0.54" />
    <path d="M15.2 7.2c.82 3.12.82 6.48 0 9.6" opacity="0.54" />
  </LupiGlyph>
);

const IconExport = () => (
  <LupiGlyph>
    <path d="M7.1 8.3h6.3c1.28 0 2.32 1.04 2.32 2.32v4.58H7.1V8.3Z" />
    <path d="M9.1 8.3 10.2 6h3.1l1.1 2.3" opacity="0.7" />
    <circle cx="11.45" cy="12.05" r="1.45" />
    <path d="M15.4 6.6h2.5v2.5" />
    <path d="m17.9 6.6-4.2 4.2" />
  </LupiGlyph>
);
const IconControls = () => (
  <LupiGlyph>
    <path d="M7 8.2h10" />
    <path d="M7 12h10" opacity="0.82" />
    <path d="M7 15.8h10" opacity="0.64" />
    <circle cx="10" cy="8.2" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="14.2" cy="12" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="11.7" cy="15.8" r="1.15" fill="currentColor" stroke="none" />
  </LupiGlyph>
);
const IconStudy = () => (
  <LupiGlyph>
    <path d="M7.2 7.4h4.2c1.1 0 2 .9 2 2v7.2H9.2c-1.1 0-2-.9-2-2V7.4Z" />
    <path d="M13.4 9.4c.38-.32.88-.5 1.42-.5h2v7.2h-2c-.54 0-1.04.18-1.42.5" opacity="0.72" />
    <path d="M9.1 10.2h2.1" opacity="0.7" />
    <path d="M9.1 12.7h2.1" opacity="0.52" />
  </LupiGlyph>
);
// ─── Background presets ───────────────────────────────────────────────
import { BG_PRESETS, getBgMedia, type BgMedia, type BgPreset } from './backgroundPresets';
import { useEquirectMediaTexture } from './hooks/useEquirectMediaTexture';
import type { BackgroundGradientStyle } from './equirectTexture';
import { ProceduralBackground, ProceduralMathField } from './ProceduralBackground';


function resolveBackground(backgroundPreset: string, colormap: ColormapName): { top: string; bottom: string; media: BgMedia; procedural?: BgPreset['procedural'] } {
  if (backgroundPreset.startsWith('palette:')) {
    const [, palette] = backgroundPreset.split(':');
    const colors = getBackgroundFromColormap((palette as ColormapName) ?? colormap);
    return { ...colors, media: { kind: 'gradient', projection: 'equirectangular' } };
  }
  const preset = BG_PRESETS[backgroundPreset] ?? BG_PRESETS.void;
  return { top: preset.top, bottom: preset.bottom, media: getBgMedia(preset), procedural: preset.procedural };
}

// ─── Scene Background component ──────────────────────────────────────
type BackgroundAssetAdjustments = {
  yawDegrees: number;
  pitchDegrees: number;
  opacity: number;
  brightness: number;
  saturation: number;
  contrast: number;
  motionPaused: boolean;
  motionSpeed: number;
};

const DEFAULT_BACKGROUND_ADJUSTMENTS: BackgroundAssetAdjustments = {
  yawDegrees: 0,
  pitchDegrees: 0,
  opacity: 1,
  brightness: 1,
  saturation: 1,
  contrast: 1,
  motionPaused: false,
  motionSpeed: 1,
};

function SceneBackground({ top, bottom, style = 'linear', media, procedural, adjustments = DEFAULT_BACKGROUND_ADJUSTMENTS, center = [0, 0, 0], distance = 1 }: {
  top: string; bottom: string;
  style?: BackgroundGradientStyle;
  media: BgMedia;
  procedural?: BgPreset['procedural'];
  adjustments?: BackgroundAssetAdjustments;
  center?: [number, number, number];
  distance?: number;
}) {
  const { scene } = useThree();

  // Hook must be called unconditionally
  const mode = useXR(state => state.mode);
  const xrMode = mode as string | null;
  const isImmersiveAR = xrMode === 'immersive-ar';
  const isImmersiveVR = xrMode === 'immersive-vr';
  const texture = useEquirectMediaTexture({
    media,
    top,
    bottom,
    style,
    enabled: !isImmersiveAR && !procedural,
    projection: media.kind === 'gradient' ? 'scene-background' : 'dome',
    paused: adjustments.motionPaused,
    playbackRate: adjustments.motionSpeed,
    logPrefix: 'bg',
  });

  useEffect(() => {
    if (isImmersiveAR || procedural) {
      scene.background = null;
      scene.fog = procedural && !isImmersiveAR ? new THREE.FogExp2(bottom, 0.0007) : null;
      return () => {
        scene.background = null;
        scene.fog = null;
      };
    }

    if (!texture) {
      scene.background = null;
      scene.fog = null;
      return;
    }

    if (media.kind !== 'gradient') {
      scene.background = null;
      scene.fog = new THREE.FogExp2(bottom, media.kind === 'image' ? 0.0008 : 0.00055);
      return () => {
        scene.background = null;
        scene.fog = null;
      };
    }

    scene.background = texture;
    scene.fog = new THREE.FogExp2(bottom, 0.0015);

    return () => {
      if (scene.background === texture) scene.background = null;
      scene.fog = null;
    };
  }, [bottom, isImmersiveAR, media.kind, procedural, scene, texture]);

  if (procedural) {
    const visible = !isImmersiveAR;
    return (
      <>
        <ProceduralBackground variant={procedural} top={top} bottom={bottom} visible={visible} />
        <ProceduralMathField variant={procedural} center={center} radius={distance * 1.46} visible={visible} />
      </>
    );
  }

  if ((media.kind === 'image' || media.kind === 'video') && texture && !isImmersiveAR && !isImmersiveVR) {
    return <PanoramaBackgroundDome texture={texture} adjustments={adjustments} />;
  }

  return null;
}

const PANORAMA_DOME_RADIUS = 5000;

const PANORAMA_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PANORAMA_FRAGMENT_SHADER = `
  uniform sampler2D map;
  uniform float opacity;
  uniform float brightness;
  uniform float saturation;
  uniform float contrast;
  varying vec2 vUv;

  void main() {
    vec4 texel = texture2D(map, vUv);
    vec3 color = texel.rgb;
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, saturation);
    color = (color - 0.5) * contrast + 0.5;
    color *= brightness;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), texel.a * opacity);
  }
`;

function PanoramaBackgroundDome({ texture, adjustments }: { texture: THREE.Texture; adjustments: BackgroundAssetAdjustments }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(PANORAMA_DOME_RADIUS, 128, 64);
    geo.scale(-1, 1, 1);
    return geo;
  }, []);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      opacity: { value: adjustments.opacity },
      brightness: { value: adjustments.brightness },
      saturation: { value: adjustments.saturation },
      contrast: { value: adjustments.contrast },
    },
    vertexShader: PANORAMA_VERTEX_SHADER,
    fragmentShader: PANORAMA_FRAGMENT_SHADER,
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    fog: false,
  }), []);

  useEffect(() => {
    material.uniforms.map.value = texture;
    material.uniforms.opacity.value = adjustments.opacity;
    material.uniforms.brightness.value = adjustments.brightness;
    material.uniforms.saturation.value = adjustments.saturation;
    material.uniforms.contrast.value = adjustments.contrast;
    material.needsUpdate = true;
  }, [adjustments.brightness, adjustments.contrast, adjustments.opacity, adjustments.saturation, material, texture]);

  useEffect(() => () => {
    material.dispose();
  }, [material]);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.copy(camera.position);
    meshRef.current.rotation.set(
      THREE.MathUtils.degToRad(adjustments.pitchDegrees),
      THREE.MathUtils.degToRad(adjustments.yawDegrees),
      0,
    );
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false} renderOrder={-1000}>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// Error Boundary for side panels
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 16,
          color: 'var(--danger)',
          fontSize: 'var(--fs-xs)',
          fontFamily: 'var(--font-mono)',
        }}>
          <div style={{ marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>
            Panel Error
          </div>
          {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
}

function CameraManager({
  fileId,
  center,
  distance,
  near,
}: {
  fileId?: string;
  center: [number, number, number];
  distance: number;
  near: number;
}) {
  const { camera, controls } = useThree((s) => ({ camera: s.camera, controls: s.controls as any }));
  const flythroughPreview = useStore(s => s.flythroughPreview);

  const applyPerspectiveProjection = useCallback((nextFov?: number) => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const camDist = Math.hypot(
        camera.position.x - center[0],
        camera.position.y - center[1],
        camera.position.z - center[2],
      );
      const minFar = Math.max(10000, distance * 100, camDist * 20);
      const fovChanged = Number.isFinite(nextFov) && Math.abs(camera.fov - nextFov!) > 1e-4;
      const nearChanged = Math.abs(camera.near - near) > 1e-4;
      const farChanged = camera.far < minFar;
      if (fovChanged || nearChanged || farChanged) {
        if (fovChanged) camera.fov = nextFov!;
        camera.near = near;
        camera.far = minFar;
        camera.updateProjectionMatrix();
      }
    }
  }, [camera, center, distance, near]);

  // Sync continuously during flythrough preview + keep clipping planes generous
  useFrame(() => {
    if (flythroughPreview) {
      const state = useStore.getState();
      camera.position.set(...state.cameraPosition);
      camera.lookAt(...state.cameraTarget);
      applyPerspectiveProjection(state.cameraFov);

      if (controls && controls.target) {
        controls.target.set(...state.cameraTarget);
        controls.update();
      }
      return;
    }

    applyPerspectiveProjection();
  });

  // Fit on load
  useEffect(() => {
    if (!fileId) return;
    camera.position.set(center[0], center[1], center[2] + distance);
    camera.lookAt(center[0], center[1], center[2]);
    applyPerspectiveProjection();
    if (controls && controls.target) {
      controls.target.set(center[0], center[1], center[2]);
      controls.update();
    }
    useStore.getState().setCameraState(camera.position.toArray() as any, center);
  }, [fileId, center, distance, camera, controls, applyPerspectiveProjection]);

  // Sync with presets
  useEffect(() => {
    const unsub = useStore.subscribe(
      (s) => s.cameraPreset,
      (preset) => {
        const { cameraPosition, cameraTarget } = useStore.getState();
        camera.position.set(...cameraPosition);
        camera.lookAt(...cameraTarget);
        applyPerspectiveProjection();
        if (controls && controls.target) {
          controls.target.set(...cameraTarget);
          controls.update();
        }
      }
    );
    return unsub;
  }, [camera, controls, applyPerspectiveProjection]);

  useEffect(() => {
    const applyStoredCamera = () => {
      const { cameraPosition, cameraTarget, cameraFov } = useStore.getState();
      camera.position.set(...cameraPosition);
      camera.lookAt(...cameraTarget);
      applyPerspectiveProjection(cameraFov);
      if (controls && controls.target) {
        controls.target.set(...cameraTarget);
        controls.update();
      }
    };
    const unsubs = [
      useStore.subscribe((s) => s.cameraPosition, applyStoredCamera),
      useStore.subscribe((s) => s.cameraTarget, applyStoredCamera),
      useStore.subscribe((s) => s.cameraFov, applyStoredCamera),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [camera, controls, applyPerspectiveProjection]);

  return null;
}

import { Testbed } from './Testbed';
import EmojiPlayground from './EmojiPlayground';

export default function App() {
  if (typeof window !== 'undefined' && isTestbedRoute()) {
    return <Testbed />;
  }

  if (typeof window !== 'undefined' && isEmojiRoute()) {
    return <EmojiPlayground />;
  }

  const [hashRoute, setHashRoute] = useState(currentHashRoute);
  const [pathRoute, setPathRoute] = useState(currentPathRoute);
  const [isExportingQuickLook, setIsExportingQuickLook] = useState(false);
  const [studioDeck, setStudioDeck] = useState<ViewerControlMode | null>(null);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [studyLensOpen, setStudyLensOpen] = useState(false);
  const loadedSavedViewSlugRef = useRef<string | null>(null);
  const hashPath = hashRoute.split('?')[0] || '/';
  const normalizedPath = normalizedPathRoute(pathRoute);
  const isMlipFlywheelRoute = hashPath === '/system/mlip-flywheel';
  const isMcpViewerRoute = isMcpViewerRouteMatch(hashPath);
  const savedViewSlug = savedViewSlugFromRoute(hashPath) ?? savedViewSlugFromRoute(normalizedPath);
  const isSavedViewRoute = Boolean(savedViewSlug);
  const isCopperSceneRoute = normalizedPath === '/scenes/1m-copper-lattice';
  const seoEducationKind = SEO_EDUCATION_ROUTES[normalizedPath] ?? null;

  useEffect(() => {
    const syncRoute = () => {
      setHashRoute(currentHashRoute());
      setPathRoute(currentPathRoute());
    };
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  // Analytics: top-of-funnel landing. Mint the session (UTM/returning) and
  // emit app_landed once per mount. Fire-and-forget; never blocks the app.
  useEffect(() => {
    ensureAnalyticsSession();
    track(ANALYTICS_EVENTS.APP_LANDED);
  }, []);

  // Use TanStack Query for saved view data (viral sharing, caching, proper loading states)
  const savedViewQuery = useQuery({
    queryKey: ['savedView', savedViewSlug],
    queryFn: () => loadSavedMolecularView(savedViewSlug!),
    enabled: !!savedViewSlug,
    staleTime: 1000 * 60 * 10, // shared views don't change often
  });

  useEffect(() => {
    if (!savedViewSlug) return;
    if (loadedSavedViewSlugRef.current === savedViewSlug) return;

    loadedSavedViewSlugRef.current = savedViewSlug;

    if (savedViewQuery.isPending) {
      useStore.getState().setLoading(true, 0);
    }

    if (savedViewQuery.data) {
      document.title = `${savedViewQuery.data.title} - Lupi`;
    }

    if (savedViewQuery.error) {
      const message = savedViewQuery.error instanceof Error ? savedViewQuery.error.message : String(savedViewQuery.error);
      useStore.getState().setLoading(false);
      useStore.getState().setError(message);
    }
  }, [savedViewSlug, savedViewQuery.isPending, savedViewQuery.data, savedViewQuery.error]);

  const { file, ghostFile, loading, frame, loadedAtomCount } = useViewerFileState();
  const { playing, playbackSpeed, setFrame, nextFrame, togglePlay } = useViewerPlaybackState();
  const colorMode = useStore(s => s.colorMode);
  const colorProperty = useStore(s => s.colorProperty);
  const materialPreset = useStore(s => s.materialPreset);
  const materialIntensity = useStore(s => s.materialIntensity);
  const rimLightIntensity = useStore(s => s.rimLightIntensity);
  const surfaceRoughness = useStore(s => s.surfaceRoughness);
  const surfacePolish = useStore(s => s.surfacePolish);
  const surfaceClearcoat = useStore(s => s.surfaceClearcoat);
  const keyLightAzimuth = useStore(s => s.keyLightAzimuth);
  const keyLightElevation = useStore(s => s.keyLightElevation);
  const fillLightAzimuth = useStore(s => s.fillLightAzimuth);
  const fillLightElevation = useStore(s => s.fillLightElevation);
  const rimLightAzimuth = useStore(s => s.rimLightAzimuth);
  const rimLightElevation = useStore(s => s.rimLightElevation);
  const fillLightColor = useStore(s => s.fillLightColor);
  const rimLightColor = useStore(s => s.rimLightColor);
  const colormap = useStore(s => s.colormap);
  const uniformAtomColor = useStore(s => s.uniformAtomColor);
  const elementColorOverrides = useStore(s => s.elementColorOverrides);
  const atomColorSource = useStore(s => s.atomColorSource);
  const postprocessPreset = useStore(s => s.postprocessPreset);
  const propertyEmissionStrength = useStore(s => s.propertyEmissionStrength);
  const annotations = useStore(s => s.annotations);
  const labelStyle = useStore(s => s.labelStyle);
  const hoveredAtom = useStore(s => s.hoveredAtom);
  const selectedAtoms = useStore(s => s.selectedAtoms);

  // Atoms that get worldline trails. Currently annotation-driven only.
  // Lifted to component top so the useMemo's hook
  // index is stable across renders — embedding it inside conditional JSX
  // changes the hook count when `currentFrame` flips and crashes React
  // with "Rendered more hooks than during the previous render."
  const trackedAtomIndices = useMemo(() => {
    const set = new Set<number>();
    for (const ann of annotations) set.add(ann.atomIndex);
    return Array.from(set);
  }, [annotations]);

  // Etched annotation: when the user picks the 'etched' label style and
  // has at least one annotation, rasterize the most-recent text into a
  // CanvasTexture and pass it (plus the target atom index) into the atom
  // impostor shader. The shader gates on uHasEtch and atom-id match, so a
  // single texture engraves exactly one atom. Multi-atom etching at once
  // is plumbing-feasible (texture array) but visually noisy; one at a
  // time reads cleaner. Memoized so editing other annotations doesn't
  // re-rasterize. Disposes previous texture on text change to avoid leaks.
  const { etchTexture, etchAtomId } = useMemo<{
    etchTexture: THREE.CanvasTexture | null;
    etchAtomId: number | null;
  }>(() => {
    if (labelStyle !== 'etched' || annotations.length === 0) {
      return { etchTexture: null, etchAtomId: null };
    }
    const newest = annotations[annotations.length - 1];
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.font = 'bold 48px ui-monospace, "SF Mono", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(newest.text.slice(0, 16), 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return { etchTexture: tex, etchAtomId: newest.atomIndex };
  }, [labelStyle, annotations]);
  // Dispose stale textures when the memo recomputes.
  useEffect(() => () => { etchTexture?.dispose(); }, [etchTexture]);
  const ssao = useStore(s => s.ssao);
  const bloom = useStore(s => s.bloom);
  const dof = useStore(s => s.dof);
  const dofFocus = useStore(s => s.dofFocus);
  const toneMapping = useStore(s => s.toneMapping);
  const showCell = useStore(s => s.showCell);
  const showAxes = useStore(s => s.showAxes);
  const flythroughPreview = useStore(s => s.flythroughPreview);
  const showBonds = useStore(s => s.showBonds);
  const bondTolerance = useStore(s => s.bondTolerance);
  const useGpuBonds = useStore(s => s.useGpuBonds);
  const bondColorMode = useStore(s => s.bondColorMode);
  const renderStyle = useStore(s => s.renderStyle);
  const atomScale = useStore(s => s.atomScale);
  const { activePanel, setActivePanel, showPotentialBrowser, setShowPotentialBrowser } = useViewerPanelState();
  const {
    backgroundPreset,
    backgroundStyle,
    backgroundMotionPaused,
    backgroundMotionSpeed,
    backgroundOpacity,
    backgroundBrightness,
    backgroundSaturation,
    backgroundContrast,
    backgroundYawDegrees,
    backgroundPitchDegrees,
  } = useViewerBackgroundState();
  const filterShellShape = useStore(s => s.filterShellShape);
  const filterShellPreset = useStore(s => s.filterShellPreset);
  const filterShellOpacity = useStore(s => s.filterShellOpacity);
  const filterShellRadius = useStore(s => s.filterShellRadius);
  const ssaoIntensity = useStore(s => s.ssaoIntensity);
  const showScaleBar = useStore(s => s.showScaleBar);
  const cameraPreset = useStore(s => s.cameraPreset);
  const setCameraPreset = useStore(s => s.setCameraPreset);
  const bloomIntensity = useStore(s => s.bloomIntensity);
  const propRange = useStore(s => s.propRange);
  const hiddenAtomTypes = useStore(s => s.hiddenAtomTypes);
  const atomTypeScales = useStore(s => s.atomTypeScales);
  const anomalyTracking = useStore(s => s.anomalyTracking);
  const atomTexture = useStore(s => s.atomTexture);
  // Cluster splats for huge-scene LOD (Phase 4). Built once per frame
  // identity, AFTER streaming completes — running on a partial frame
  // would aggregate uninitialized zero-positions into a giant fake
  // cluster at the origin. Stored as React state so the cluster mesh
  // remounts when the build finishes.
  const [clusters, setClusters] = useState<Clusters | null>(null);

  // Spatial hash for atom picking
  const [spatialHash, setSpatialHash] = useState<SpatialHash3D | null>(null);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const showDebugHud = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('debug') || params.has('devhud') || params.has('dev');
  }, []);
  const cameraPresetLabel =
    cameraPreset === 'top' ? 'XY' :
    cameraPreset === 'side' ? 'XZ' :
    cameraPreset === 'front' ? 'YZ' :
    cameraPreset === 'iso' ? 'ISO' : 'View';

  const openStudioDeck = useCallback((mode: ViewerControlMode) => {
    setShowPotentialBrowser(false);
    setViewMenuOpen(false);
    setStudioDeck(mode);
    if (activePanel !== 'studio') setActivePanel('studio');
  }, [activePanel, setActivePanel, setShowPotentialBrowser]);

  const toggleControlsPanel = useCallback(() => {
    setShowPotentialBrowser(false);
    setViewMenuOpen(false);
    setStudioDeck(current => current ?? 'look');
    setActivePanel('studio');
  }, [setActivePanel, setShowPotentialBrowser]);

  useEffect(() => {
    if (showPotentialBrowser || !file) {
      setStudioDeck(null);
      setViewMenuOpen(false);
      if (!file) setStudyLensOpen(false);
    } else if (activePanel && activePanel !== 'studio') {
      setViewMenuOpen(false);
    }
  }, [activePanel, showPotentialBrowser, file?.name]);

  // Device-capability budget. Computed once at mount — hardware doesn't
  // change during a session. The cap reflects MEMORY ceiling now (not GPU
  // shader cost) since the quality-tier system below makes any tier render
  // any count. The fast tier specifically restores early-Z on mobile by
  // skipping gl_FragDepth, so 1M impostor spheres become feasible on a
  // phone where the premium shader would freeze the page.
  const deviceMaxAtoms = useMemo(() => getMaxSafeAtomCount(), []);
  const deviceQualityTier = useMemo(() => getDefaultQualityTier(), []);

  // Renderer capability probe — run once at mount (hardware/browser support
  // doesn't change within a session). When the device can't start a WebGL
  // context we must NOT mount the <Canvas> (it would paint a silent blank
  // rect — the single biggest cold-mobile bounce source). Audit findings:
  // ios-safari-webgpu-silent-fail, android-firefox-no-webgpu-message,
  // no-canvas-webgl-fallback.
  // Advisory only: a false preflight must not prevent the real Canvas mount.
  const renderCapability = useMemo(() => detectRenderCapability(), []);

  // Surface a NON-BLOCKING warning when the optional WebGPU bond accelerator
  // is unavailable/timed out while the user had it enabled. The scene still
  // renders via the CPU bond path. Audit finding: no-offline-fallback-webgpu-init.
  const gpuBondsStatus = useStore(s => s.gpuBondsStatus);
  useEffect(() => {
    const setRendererWarning = useStore.getState().setRendererWarning;
    if (useGpuBonds && gpuBondsStatus === 'unsupported') {
      setRendererWarning('GPU bond acceleration unavailable on this device — using the slower CPU path.');
    } else if (gpuBondsStatus === 'ready') {
      setRendererWarning(null);
    }
  }, [useGpuBonds, gpuBondsStatus]);
  const playbackFrameRate = file?.playbackFrameRate ?? 30;
  const highFidelityPlayback = Boolean(file?.playbackFrameRate && (file?.trajectory.frames[0]?.natoms ?? 0) <= 5000);

  // Playback timer (replaced with smooth 60fps interpolator)
  const { currentState: interpState, setFrame: setSmoothFrame } = useSmoothFramePlayback(playing, {
    frames: file?.trajectory.frames ?? [],
    speed: playbackSpeed,
    targetFPS: highFidelityPlayback ? 120 : 60,
    mdFrameRate: playbackFrameRate,
    stateSyncFPS: highFidelityPlayback ? 120 : 15,
    onFrame: (state) => {
      // Sync UI timeline without forcing expensive React renders unnecessarily
      // Only sync when playing. When paused, the store (user scrubbing) drives the hook.
      if (useStore.getState().playing && state.frameIndex !== useStore.getState().frame) {
        useStore.getState().setFrame(state.frameIndex);
      }
    }
  });
  const ghostFrame = ghostFile
    ? ghostFile.trajectory.frames[Math.min(interpState.frameIndex, Math.max(ghostFile.trajectory.totalFrames - 1, 0))]
    : null;

  // Sync external frame updates (like timeline scrubber manually dragging) back to the hook when NOT playing
  useEffect(() => {
    if (!playing && interpState.effectiveFrame !== frame) {
      setSmoothFrame(frame);
    }
  }, [frame, playing, setSmoothFrame, interpState.effectiveFrame]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K opens the command palette from anywhere.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(open => !open);
        return;
      }

      if (commandPaletteOpen) return; // palette owns its own keyboard nav

      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      const currentFile = useStore.getState().file;
      const isResearch = Boolean(currentFile?.name?.startsWith('research_') || currentFile?.sourceUrl?.includes('/research/'));

      if (e.key === ' ' && !isResearch) { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowRight') nextFrame();
      if (e.key === 'ArrowLeft') useStore.getState().prevFrame();
      if (e.key === 'Escape') {
        setActivePanel(null);
        setStudioDeck(null);
        setShowPotentialBrowser(false);
      }
      if (e.key === 'v' && !e.metaKey && !e.ctrlKey) {
        setActivePanel(null);
        setShowPotentialBrowser(false);
        setStudioDeck(current => current === 'look' ? null : 'look');
      }
      if (e.key === 'x' && !e.metaKey && !e.ctrlKey) {
        setStudioDeck(null);
        setShowPotentialBrowser(false);
        setActivePanel('export');
      }
      if (e.key === 'b' && !e.metaKey && !e.ctrlKey) useStore.getState().toggleBonds();
      if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
        setStudioDeck(null);
        setShowPotentialBrowser(false);
        setActivePanel('telemetry');
      }
    };
    window.addEventListener('keydown', handler);
    // Track Shift for the click-to-annotate flow. AtomPicker's onClick can't
    // see the original DOM event, so we mirror the modifier on a global
    // ambient flag the click handler reads. Released-on-blur to avoid
    // sticky state when the user alt-tabs while holding shift.
    const shiftDown = (e: KeyboardEvent) => { if (e.key === 'Shift') (window as any).__atlasShiftHeld = true; };
    const shiftUp = (e: KeyboardEvent) => { if (e.key === 'Shift') (window as any).__atlasShiftHeld = false; };
    const blurReset = () => { (window as any).__atlasShiftHeld = false; };
    window.addEventListener('keydown', shiftDown);
    window.addEventListener('keyup', shiftUp);
    window.addEventListener('blur', blurReset);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keydown', shiftDown);
      window.removeEventListener('keyup', shiftUp);
      window.removeEventListener('blur', blurReset);
    };
  }, [togglePlay, nextFrame, setActivePanel, setShowPotentialBrowser, commandPaletteOpen]);

  // URL state restore + auto-load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const intent = recognizeLupiUrlPayload(window.location.href);
    const state = intent?.state ?? params.get('s');
    if (state) useStore.getState().decodeFromURL(state);

    // Restore flythrough from URL
    const flyParam = intent?.fly ?? params.get('fly');
    if (flyParam) {
      const seq = decodeFlythrough(flyParam);
      if (seq) {
        useStore.getState().setFlythrough(seq);
        useStore.getState().setActivePanel('flythrough');
      }
    }

    const loadUrl = intent?.kind === 'loadUrl' ? intent.url : params.get('load');
    if (loadUrl && !file) {
      (async () => {
        await openMolecule({ kind: 'url', url: loadUrl, history: 'none' });
      })();
    }
  }, []);

  const currentFrame = file?.trajectory.frames[frame];
  const totalFrames = file?.trajectory.totalFrames ?? 0;

  // Auto-derive the spatial-hash upper cap from the element-aware cutoff so
  // the bond detector can never under-size its search radius. Walks the
  // unique types in the current frame, finds the largest pair of covalent
  // radii, and adds tolerance + a 0.5 Å slack. Bonds.tsx queries the
  // spatial hash with this radius, so any pair the element-aware filter
  // would accept is in scope. Capped at 6 Å (sane upper bound for any
  // single chemical bond) to keep the spatial hash from collapsing into a
  // single cell on systems with rare-earth radii. This is what the slider
  // previously controlled directly; the slider now drives `bondTolerance`
  // and the cap follows automatically.
  const effectiveBondCutoff = useMemo(() => {
    if (!currentFrame || !currentFrame.types || currentFrame.natoms === 0) {
      return Math.min(6, 2 * 1.4 + bondTolerance);
    }
    const seen = new Set<number>();
    let maxR = 0;
    for (let i = 0; i < currentFrame.natoms; i++) {
      const t = currentFrame.types[i];
      if (seen.has(t)) continue;
      seen.add(t);
      const r = getElementSpec(t).radius;
      if (r > maxR) maxR = r;
    }
    if (maxR === 0) maxR = 1.4;
    return Math.min(6, 2 * maxR + bondTolerance + 0.5);
  }, [currentFrame, bondTolerance]);

  // Build cluster splats once streaming completes on a sufficiently
  // large frame. Skips small frames (cluster overhead doesn't pay off
  // below ~50K atoms), and skips during streaming (ClusterBuilder
  // would aggregate the unfilled zero-position tail into a giant fake
  // cluster at the origin). Runs in requestIdleCallback so the build
  // doesn't compete with the streaming-completion render.
  useEffect(() => {
    setClusters(null);  // clear stale clusters when frame changes.
    if (!currentFrame) return;
    if (currentFrame.natoms < 50_000) return;
    if (loadedAtomCount < currentFrame.natoms) return;
    let cancelled = false;
    const idleCb = (typeof requestIdleCallback !== 'undefined')
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 0);
    const cancelIdle = (typeof cancelIdleCallback !== 'undefined')
      ? cancelIdleCallback
      : clearTimeout;
    const handle = idleCb(() => {
      if (cancelled) return;
      const built = buildClusters(currentFrame, { mobile: deviceQualityTier === 0 });
      if (!cancelled) setClusters(built);
    });
    return () => { cancelled = true; cancelIdle(handle as any); };
  }, [currentFrame, loadedAtomCount, deviceQualityTier]);

  // Tune the splat fade range to the scene size. Splats stay invisible
  // at default zoom (which is ~diagonal × 1.4) so atoms own the visible
  // detail; they fade in as the user zooms out and atoms hit the
  // sub-pixel cull. Values picked so the crossover lines up with
  // pixel-cull range on a typical 1080p viewport: an atom of radius
  // ~1 Å goes sub-pixel around camera distance ≈ diagonal × 3,
  // saturated invisible by ≈ diagonal × 10.
  const clusterFadeNear = useMemo(() => {
    if (!file) return 300;
    const { min, max } = file.trajectory.globalBounds;
    const diag = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    return diag * 3;
  }, [file?.name]);
  const clusterFadeFar = useMemo(() => clusterFadeNear * 3.3, [clusterFadeNear]);

  const {
    cameraDistance,
    cameraMinDistance,
    cameraNear,
    center,
    filterShellBaseRadius,
  } = useViewerSceneModel(file);

  const bg = resolveBackground(backgroundPreset, colormap);
  const bgMedia = bg.media;
  const bgAdjustments = useMemo<BackgroundAssetAdjustments>(() => ({
    yawDegrees: backgroundYawDegrees,
    pitchDegrees: backgroundPitchDegrees,
    opacity: backgroundOpacity,
    brightness: backgroundBrightness,
    saturation: backgroundSaturation,
    contrast: backgroundContrast,
    motionPaused: backgroundMotionPaused,
    motionSpeed: backgroundMotionSpeed,
  }), [
    backgroundBrightness,
    backgroundContrast,
    backgroundMotionPaused,
    backgroundMotionSpeed,
    backgroundOpacity,
    backgroundPitchDegrees,
    backgroundSaturation,
    backgroundYawDegrees,
  ]);
  const isBatchExport = new URLSearchParams(window.location.search).get('batchExport') === 'true';
  const mobilePanelHeight = 'clamp(260px, 38dvh, 340px)';
  const activeMobilePanelHeight = activePanel === 'studio' ? 'clamp(460px, 72dvh, 680px)' : mobilePanelHeight;
  const mobileLoadedHeader = isMobile && !!file;
  const headerHeight = isMobile
    ? `calc(${mobileLoadedHeader ? '76px' : '48px'} + env(safe-area-inset-top))`
    : 56;
  const clearLoadedFile = useCallback(() => {
    useStore.getState().clearFile();
    const url = new URL(window.location.href);
    url.searchParams.delete('sim');
    url.searchParams.delete('load');
    window.history.pushState({}, '', url);
  }, []);

  return (
    <div style={{
      width: '100%', minHeight: '100vh',
      height: file ? '100dvh' : 'auto',
      overflow: file ? 'hidden' : 'visible',
      background: `linear-gradient(180deg, ${bg.top}, ${bg.bottom})`,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ─── Desktop Header ─── */}
      <header
        className={file ? 'lupine-glass' : ''}
        style={{
          height: headerHeight,
          minHeight: headerHeight,
          flexShrink: 0,
          display: mobileLoadedHeader ? 'grid' : 'flex',
          alignItems: 'center',
          justifyContent: mobileLoadedHeader ? undefined : 'space-between',
          gridTemplateColumns: mobileLoadedHeader ? 'auto minmax(0, 1fr) auto' : undefined,
          gridTemplateRows: mobileLoadedHeader ? '38px 28px' : undefined,
          columnGap: mobileLoadedHeader ? 8 : undefined,
          rowGap: mobileLoadedHeader ? 2 : undefined,
          padding: mobileLoadedHeader ? 'calc(env(safe-area-inset-top) + 4px) 8px 4px' : (isMobile ? 'env(safe-area-inset-top) 8px 0' : '0 16px'),
          margin: file ? (isMobile ? '6px 6px 0' : '14px 16px 0') : 0,
          borderRadius: file ? 8 : 0,
          borderBottom: file ? 'none' : '1px solid var(--border-subtle)',
          background: file ? undefined : 'var(--bg-glass)',
          backdropFilter: file ? undefined : 'blur(12px)',
          WebkitBackdropFilter: file ? undefined : 'blur(12px)',
          boxShadow: file ? '0 18px 48px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.08)' : undefined,
          zIndex: 200,
        }}
      >
        {/* Logo + file breadcrumb */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 12,
          minWidth: 0,
          gridColumn: mobileLoadedHeader ? '1 / 2' : undefined,
          gridRow: mobileLoadedHeader ? '1' : undefined,
        }}>
          <button
            onClick={() => {
              if (file) {
                clearLoadedFile();
              }
            }}
            aria-label={file ? 'Return to Lupi home' : 'Lupi home'}
            className="lupine-btn icon-only"
            style={{
              background: 'transparent',
              borderColor: 'transparent',
              boxShadow: 'none',
              padding: isMobile ? '0 2px' : 6,
              gap: 4,
              cursor: file ? 'pointer' : 'default',
              height: isMobile ? 34 : undefined,
              minHeight: isMobile ? 34 : undefined,
              aspectRatio: isMobile ? 'auto' : undefined,
              flexShrink: 0,
            }}
          >
            <span style={{
              fontSize: isMobile ? 19 : 21, fontWeight: 750, color: 'var(--text-primary)',
              letterSpacing: 0
            }}>
              Lupi
            </span>
          </button>

          {file && !isMobile && (
            <>
              <div className="lupine-divider" style={{ display: isMobile ? 'none' : 'block' }} />

              <span style={{
                display: 'grid',
                gap: 1,
                minWidth: 0,
                maxWidth: isMobile ? 92 : 300,
              }}>
                <span style={{
                  fontSize: 10,
                  color: 'rgba(203,213,225,0.48)',
                  fontWeight: 760,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  letterSpacing: 0,
                }}>
                  Loaded
                </span>
                <span style={{
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontWeight: 650,
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }} title={file.name}>
                  {file.name}
                </span>
              </span>
              <button
                onClick={clearLoadedFile}
                title="Close"
                aria-label="Close dataset"
                className="lupine-icon-btn"
                style={{ width: 28, height: 28 }}
              >
                <IconClose />
              </button>
            </>
          )}
        </div>

        {file && isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
              gridColumn: '1 / -1',
              gridRow: '2',
              padding: '0 1px',
            }}
          >
            <span style={{
              flexShrink: 0,
              fontSize: 9,
              color: 'rgba(203,213,225,0.48)',
              fontWeight: 760,
              lineHeight: 1,
              textTransform: 'uppercase',
              letterSpacing: 0,
            }}>
              Loaded
            </span>
            <span
              title={file.name}
              style={{
                minWidth: 0,
                flex: '1 1 auto',
                fontSize: 12,
                color: 'var(--text-primary)',
                fontWeight: 650,
                lineHeight: 1.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {file.name}
            </span>
            <button
              onClick={clearLoadedFile}
              title="Close"
              aria-label="Close dataset"
              className="lupine-icon-btn"
              style={{
                width: 28,
                height: 28,
                flexShrink: 0,
              }}
            >
              <IconClose />
            </button>
          </div>
        )}

        {/* Top-right actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: isMobile ? 4 : 10,
          minWidth: 0,
          gridColumn: mobileLoadedHeader ? '2 / 4' : undefined,
          gridRow: mobileLoadedHeader ? '1' : undefined,
          justifySelf: mobileLoadedHeader ? 'end' : undefined,
        }}>
          {!file && (
            <>
              <a
                href="#gallery"
                onClick={(e) => {
                  // Smooth-scroll to the Gallery section on the landing page
                  // instead of mutating the hash route (which #/ left as a no-op).
                  const el = document.getElementById('gallery');
                  if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="lupine-btn"
                style={{
                  padding: isMobile ? '7px 9px' : '8px 12px',
                  fontSize: isMobile ? 12 : 13,
                  minHeight: isMobile ? 34 : undefined,
                }}
              >
                {isMobile ? 'Atoms' : 'Gallery'}
              </a>
            </>
          )}
          {!file && (
            <button
              onClick={() => void openRandomOmol25Molecule()}
              className="lupine-btn primary"
              style={{
                padding: isMobile ? '7px 10px' : '8px 14px',
                fontSize: isMobile ? 12 : 14,
                minHeight: isMobile ? 34 : undefined,
              }}
            >
              {isMobile ? 'View' : 'View a molecule'}
            </button>
          )}
          {/* Loop step 3: a clear Save entry the moment a molecule is on screen.
              Anonymous → prompts sign-in (pending draft) → resumes save → share link. */}
          {file && <SavedViewButton compact={isMobile} />}
          <LupiAgentDock compact={isMobile} />
          <a
            href="?view=compare"
            aria-label="Open Comparison Theater for cinema-style movie watching of relaxations"
            title="Comparison Theater — cinema movie watching"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: isMobile ? 36 : 38, minWidth: isMobile ? 36 : 80,
              padding: isMobile ? 0 : '0 10px',
              borderRadius: 999, border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(123,92,255,0.12)', color: '#c4b5fd', fontSize: isMobile ? 10 : 11,
              textDecoration: 'none', touchAction: 'manipulation',
            }}
          >
            {isMobile ? '🎥' : 'CINEMA'}
          </a>
        </div>
      </header>
      <LupiAuthCallout compact={isMobile} />
      <MoleculeConfigurator />

      {/* ─── Main content ─── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative' }}>
        <McpViewerBridge />
        {isMcpViewerRoute && <McpViewerHarness />}
        {/* 3D viewport */}
        <div className="lupi-main-viewport" style={{
          position: file ? 'absolute' : 'fixed',
          top: file ? 0 : 56, // below header when fixed
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 0,
        }}>
          <style>{`
            .lupi-main-viewport canvas {
              width: 100% !important;
              height: 100% !important;
            }
          `}</style>
          <ViewerCanvas
            capability={renderCapability}
            center={center}
            cameraDistance={cameraDistance}
            cameraNear={cameraNear}
          >
            {import.meta.env.DEV && showDebugHud && <Perf position="top-left" logsPerSecond={4} matrixUpdate />}
            {(import.meta.env.DEV || showDebugHud) && <DevProbe enabled={showDebugHud} />}
              <USDZExportHelper trigger={isExportingQuickLook} onComplete={() => setIsExportingQuickLook(false)} />
            <ExportManager />
            <SceneBackground
              top={bg.top}
              bottom={bg.bottom}
              style={backgroundStyle}
              media={bgMedia}
              procedural={bg.procedural}
              adjustments={bgAdjustments}
              center={center}
              distance={cameraDistance}
            />
            <XREnvironmentDome media={bgMedia} top={bg.top} bottom={bg.bottom} style={backgroundStyle} adjustments={bgAdjustments} disabled={!!bg.procedural} />
            {/* Real-world light estimation: in AR this takes over scene.environment
                with a live reflection map so the molecule mirrors the surroundings
                (e.g. campfire) and adds a directional light tracking the real key
                light. No-op outside an estimation-capable immersive-ar session. */}
            <XRLightEstimation />

            {/* Authored 3-point rig + HDRI environment, XR-aware: dims itself and
                yields scene.environment to XRLightEstimation when AR lighting is
                live. Bonds (MeshPhysicalMaterial) and the atom impostor shader both
                read scene.environment for IBL reflections. */}
            <SceneLighting />

            <CameraManager fileId={file?.name} center={center} distance={cameraDistance} near={cameraNear} />
            <PresetLegacyBridge />
            <OrbitControls
              makeDefault
              enabled={!flythroughPreview}
              target={center}
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.5}
              panSpeed={0.4}
              zoomSpeed={0.8}
              minDistance={cameraMinDistance}
              maxDistance={cameraDistance * 6}
              onEnd={(e: any) => {
                if (e?.target?.object && e?.target?.target) {
                  useStore.getState().setCameraState(
                    e.target.object.position.toArray(),
                    e.target.target.toArray()
                  );
                }
              }}
            />

            {currentFrame && (
              <SpatialAnchor cameraDistance={cameraDistance}>
                <MoleculeFilterShell
                  center={center}
                  radius={filterShellBaseRadius}
                  shape={filterShellShape}
                  preset={filterShellPreset}
                  opacity={filterShellOpacity}
                  radiusScale={filterShellRadius}
                />
                <AnomalyTracker
                  frame={currentFrame}
                  colorProperty={colorProperty}
                  active={anomalyTracking}
                />
                {ghostFrame && (
                  <GhostAtoms
                    frame={ghostFrame}
                    scale={atomScale * 0.34}
                  />
                )}
                <AtomsOptimized
                  frame={file!.trajectory.frames[interpState.frameIndex]}
                  nextFrame={interpState.isInterpolating ? file!.trajectory.frames[interpState.nextFrameIndex] : undefined}
                  interpolationFactor={interpState.isInterpolating ? interpState.interpolationFactor : 0}
                  colorMode={colorMode}
                  colorProperty={colorProperty ?? undefined}
                  colormap={colormap}
                  uniformColor={uniformAtomColor}
                  elementColorOverrides={elementColorOverrides}
                  atomColorSource={atomColorSource}
                  scale={atomScale}
                  renderStyle={renderStyle}
                  maxAtoms={deviceMaxAtoms}
                  loadedAtomCount={loadedAtomCount}
                  onSpatialHash={setSpatialHash}
                  hiddenAtomTypes={hiddenAtomTypes}
                  atomTypeScales={atomTypeScales}
                  botanicalMode={renderStyle === 'botanical'}
                  materialPreset={materialPreset}
                  materialIntensity={materialIntensity}
                  rimLightIntensity={rimLightIntensity}
                  surfaceRoughness={surfaceRoughness}
                  surfacePolish={surfacePolish}
                  surfaceClearcoat={surfaceClearcoat}
                  keyLightAzimuth={keyLightAzimuth}
                  keyLightElevation={keyLightElevation}
                  fillLightAzimuth={fillLightAzimuth}
                  fillLightElevation={fillLightElevation}
                  rimLightAzimuth={rimLightAzimuth}
                  rimLightElevation={rimLightElevation}
                  fillLightColor={fillLightColor}
                  rimLightColor={rimLightColor}
                  atomTexture={atomTexture}
                  propertyEmissionStrength={propertyEmissionStrength}
                  etchTexture={etchTexture}
                  etchAtomId={etchAtomId}
                />
                {/* Phase 4: cluster splats fill the far-LOD gap left
                    by the atom mesh's sub-pixel cull. Built off the
                    main thread after streaming completes; renders
                    nothing until then (clusters === null). */}
                <AtomClusters
                  clusters={clusters}
                  fadeNear={clusterFadeNear}
                  fadeFar={clusterFadeFar}
                />
                <Bonds
                    frame={currentFrame}
                    nextFrame={interpState.isInterpolating ? file!.trajectory.frames[interpState.nextFrameIndex] : undefined}
                    interpolationFactor={interpState.isInterpolating ? interpState.interpolationFactor : 0}
                    maxBondLength={effectiveBondCutoff}
                    tolerance={bondTolerance}
                    renderStyle={renderStyle}
                    colormap={colormap}
                    colorMode={colorMode}
                    colorProperty={colorProperty ?? undefined}
                    uniformColor={uniformAtomColor}
                    elementColorOverrides={elementColorOverrides}
                    radius={0.12}
                    opacity={0.85}
                    botanicalMode={renderStyle === 'botanical'}
                    materialPreset={materialPreset}
                    materialIntensity={materialIntensity}
                    rimLightIntensity={rimLightIntensity}
                    surfaceRoughness={surfaceRoughness}
                    surfacePolish={surfacePolish}
                    surfaceClearcoat={surfaceClearcoat}
                    fillLightColor={fillLightColor}
                    rimLightColor={rimLightColor}
                    fillLightAzimuth={fillLightAzimuth}
                    fillLightElevation={fillLightElevation}
                    rimLightAzimuth={rimLightAzimuth}
                    rimLightElevation={rimLightElevation}
                    // Suppress bond detection while atoms are still
                    // streaming in to prevent phantom bonds at origin.
                    visible={showBonds && loadedAtomCount >= currentFrame.natoms}
                    bondColorMode={bondColorMode}
                    useGpu={useGpuBonds}
                    atomColorSource={atomColorSource}
                    onBondsUpdate={(info) => useStore.getState().reportBondsUpdate(info.source, info.count)}
                    onGpuStatusChange={(status) => useStore.getState().setGpuBondsStatus(status)}
                  />
                {showCell && (
                  <SimulationCell bounds={currentFrame.boxBounds} color="#1e3050" opacity={0.3} />
                )}

                {/* Contact shadow under the molecule. Sized to box-bounds
                    diagonal × 1.5 so the soft falloff catches even atoms at
                    the very edge of the cell. Disabled in 'diagram' preset
                    (flat, figure-faithful) where any shadow would mislead. */}
                {currentFrame.boxBounds && postprocessPreset !== 'diagram' && (() => {
                  const b = currentFrame.boxBounds;
                  const cx = (b[0] + b[1]) / 2;
                  const cy = b[2]; // floor = min Y of the cell
                  const cz = (b[4] + b[5]) / 2;
                  const dx = b[1] - b[0];
                  const dz = b[5] - b[4];
                  const planeSize = Math.max(dx, dz) * 1.6;
                  return (
                    <ContactShadows
                      position={[cx, cy - 0.05, cz]}
                      scale={planeSize}
                      blur={2.4}
                      far={Math.max(20, dx * 0.6)}
                      opacity={postprocessPreset === 'cinematic' ? 0.55 : 0.32}
                      resolution={1024}
                      color="#04060c"
                    />
                  );
                })()}

                {/* Pinned text annotations. The same annotation list renders
                    in one of four visual styles (tag/glyph/halo/etched) chosen
                    in the Visuals panel — same data, very different presentations. */}
                <AnnotationsLayer
                  frame={currentFrame}
                  annotations={annotations}
                  style={labelStyle}
                  onDismiss={(id) => useStore.getState().removeAnnotation(id)}
                />

                {/* Click an atom to inspect it, mark it, and focus the camera.
                    Shift-click keeps the lightweight annotation workflow. */}
                <SelectionMarkers
                  frame={currentFrame}
                  selectedAtoms={selectedAtoms}
                  hoveredAtom={hoveredAtom}
                  typeRadii={TYPE_RADII}
                />
                <AtomInfoHUD
                  frame={currentFrame}
                  selectedAtoms={selectedAtoms}
                  activeProperty={colorProperty ?? undefined}
                  onDismissCard={(atomIndex) => useStore.getState().setSelectedAtoms(
                    (prev) => prev.filter(idx => idx !== atomIndex),
                  )}
                />
                <CameraFocus
                  frame={currentFrame}
                  enabled={!flythroughPreview}
                />


                {/* Worldline trails for annotated atoms.
                    Scoped to bound memory at 1M-atom scenes; samples one new
                    position per playback frame change so the trail length is
                    in simulation time. Diffusion + dynamics get visual memory. */}
                <AtomTrails
                  frame={currentFrame}
                  frameKey={interpState.frameIndex}
                  atomIndices={trackedAtomIndices}
                />

                {/* Click-to-inspect: AtomPicker owns the raycast and sends the
                    selected atom into the store. */}
                {spatialHash && (
                  <AtomPicker
                    frame={currentFrame}
                    spatialHash={spatialHash}
                    enabled
                    onClick={(atomIndex) => {
                      if (atomIndex == null) return;
                      // Read the modifier from the latest mouse event via a
                      // synthetic check on the document — drei doesn't pass
                      // the original event through. Cheap workaround.
                      const isAnnotate = (window as any).__atlasShiftHeld === true;
                      if (isAnnotate) {
                        const text = window.prompt('Annotation text', `atom #${atomIndex}`);
                        if (text && text.trim()) {
                          useStore.getState().addAnnotation(atomIndex, text.trim());
                        }
                      }
                    }}
                    onHover={(atomIndex) => useStore.getState().setHoveredAtom(atomIndex)}
                    onSelect={(indices) => useStore.getState().setSelectedAtoms(indices)}
                  />
                )}

              </SpatialAnchor>
            )}

            {showAxes && (
              <GizmoHelper alignment="bottom-left" margin={[72, 72]}>
                <GizmoViewport axisColors={['#ff4060', '#40ff80', '#4080ff']} labelColor="white" />
              </GizmoHelper>
            )}


            <ScenePostprocessing />
          </ViewerCanvas>

          {import.meta.env.DEV && showDebugHud && <StateInspector />}

          {/* Non-blocking renderer warning (e.g. WebGPU bond accelerator
              unavailable/timed out → CPU fallback). The scene still renders;
              this is informational and dismissible. */}
          <RendererWarningToast />

          {/* (removed: GPU-unlock overlay, micro-effects layer, header shimmer) */}

          {/* Scale bar for publication figures */}
          {file && currentFrame && showScaleBar && (
            <ScaleBar
              frame={currentFrame}
              cameraDistance={cameraDistance}
              visible={showScaleBar}
              position="bottom-left"
            />
          )}

          {file && currentFrame && studyLensOpen && (
            <StudyLensPanel
              compact={isMobile}
              onClose={() => setStudyLensOpen(false)}
            />
          )}

          {/* Simple stats overlay */}
          {file && totalFrames > 1 && (
            <div style={{
              position: 'absolute', top: 16, left: 16,
              pointerEvents: 'none',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 7,
                background: 'linear-gradient(180deg, rgba(15,23,42,0.76), rgba(3,7,18,0.58))',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 12,
                fontWeight: 700,
                color: '#f8fafc',
                fontVariantNumeric: 'tabular-nums',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}>
                <span style={{ color: 'rgba(203,213,225,0.56)', fontSize: 10, textTransform: 'uppercase' }}>Frame</span>
                {frame + 1} / {totalFrames}
              </div>
            </div>
          )}

          {showDebugHud && <TelemetryHUD />}

          {/* Camera view selector */}
          {file && (
            <div style={{
              position: 'absolute',
              top: file ? (isMobile ? 72 : 88) : 72,
              left: isMobile ? 12 : 18,
              display: 'grid',
              flexDirection: 'column',
              alignItems: 'start',
              gap: 6,
              padding: 5,
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 8,
              background: 'linear-gradient(180deg, rgba(15,23,42,0.70), rgba(3,7,18,0.56))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 18px 48px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)',
              zIndex: 150,
            }}>
              <button
                onClick={() => {
                  setViewMenuOpen(open => !open);
                  setStudioDeck(null);
                }}
                title="Camera view"
                aria-label="Camera view"
                aria-expanded={viewMenuOpen}
                className={`lupine-btn compact icon-only ${viewMenuOpen ? 'active' : ''}`}
                style={{
                  width: isMobile ? 44 : 48,
                  height: 36,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 820,
                }}
              >
                {cameraPresetLabel}
              </button>
              {viewMenuOpen && (
                <div
                  className="lupine-glass lupine-glass--menu animate-menu-in"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    minWidth: 102,
                    gap: 5,
                  }}
                >
                  <CameraPresetButton label="XY" active={cameraPreset === 'top'} onClick={() => { setCameraPreset('top'); setViewMenuOpen(false); }} title="Top view (XY plane)" />
                  <CameraPresetButton label="XZ" active={cameraPreset === 'side'} onClick={() => { setCameraPreset('side'); setViewMenuOpen(false); }} title="Side view (XZ plane)" />
                  <CameraPresetButton label="YZ" active={cameraPreset === 'front'} onClick={() => { setCameraPreset('front'); setViewMenuOpen(false); }} title="Front view (YZ plane)" />
                  <CameraPresetButton label="ISO" active={cameraPreset === 'iso'} onClick={() => { setCameraPreset('iso'); setViewMenuOpen(false); }} title="Isometric view" />
                </div>
              )}
              <button
                type="button"
                data-testid="study-lens-toggle"
                onClick={() => {
                  setViewMenuOpen(false);
                  setStudyLensOpen(open => !open);
                }}
                title="Study lens"
                aria-label="Study lens"
                aria-pressed={studyLensOpen}
                className={`lupine-btn compact ${studyLensOpen ? 'active' : ''}`}
                style={{
                  width: isMobile ? 44 : 48,
                  height: 36,
                  padding: 0,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <IconStudy />
              </button>
            </div>
          )}

          {/* Top-right controls launcher */}
          {file && !showPotentialBrowser && (
            <div style={{
              position: 'absolute',
              top: file ? (isMobile ? 72 : 88) : 72,
              right: isMobile ? 12 : 18,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: 5,
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 8,
              background: 'linear-gradient(180deg, rgba(15,23,42,0.70), rgba(3,7,18,0.56))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 18px 48px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)',
              zIndex: 150,
            }}>
              <button
                type="button"
                aria-label="Controls"
                aria-expanded={activePanel === 'studio'}
                title="Controls"
                onClick={toggleControlsPanel}
                className={`lupine-btn ${activePanel === 'studio' ? 'active' : ''}`}
                style={{
                  minWidth: isMobile ? 48 : 118,
                  height: isMobile ? 44 : 38,
                  gap: 8,
                  padding: isMobile ? '0 10px' : '0 14px',
                  fontSize: isMobile ? 0 : 13,
                  fontWeight: 760,
                  letterSpacing: 0,
                  touchAction: 'manipulation',
                }}
              >
                <IconControls />
                {!isMobile && <span>Controls</span>}
              </button>
            </div>
          )}

        </div>

        {/* ─── Side panel / dockable windows ─── */}
        {/* NIST IPR potential browser — full-screen overlay, manages its own
            close via setShowPotentialBrowser(false). */}
        {showPotentialBrowser && <PotentialBrowser />}

        {/* Mobile quick actions bar (thumb friendly, always reachable on phones) */}
        {isMobile && file && !activePanel && (
          <div
            role="toolbar"
            aria-label="Mobile quick actions"
            style={{
              position: 'fixed',
              bottom: 'calc(env(safe-area-inset-bottom) + 4px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 95,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(15,16,22,0.92)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 999,
              padding: '4px 6px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}>
            <button
              onClick={() => useStore.getState().togglePlay()}
              aria-label={playing ? 'Pause playback' : 'Play animation'}
              style={{ minHeight: 36, minWidth: 46, borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: '#e6e6e6', fontSize: 11, padding: '0 10px', touchAction: 'manipulation' }}
            >
              {playing ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => { setStudioDeck('look'); setActivePanel('studio'); }}
              aria-label="Open controls panel"
              style={{ minHeight: 36, borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: '#e6e6e6', fontSize: 10, padding: '0 10px', touchAction: 'manipulation' }}
            >
              CONTROLS
            </button>
            <button
              onClick={() => setShowPotentialBrowser(true)}
              aria-label="Browse gallery and atoms"
              style={{ minHeight: 36, borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: '#e6e6e6', fontSize: 10, padding: '0 10px', touchAction: 'manipulation' }}
            >
              ATOMS
            </button>
          </div>
        )}

        {/* Mobile: legacy bottom sheet */}
        {activePanel && file && isMobile && (
          <div style={{
            position: 'absolute',
            top: 'auto',
            right: 0,
            bottom: 0,
            left: 0,
            width: '100%',
            height: activeMobilePanelHeight,
            maxHeight: activeMobilePanelHeight,
            boxSizing: 'border-box',
            borderTop: '1px solid var(--border-subtle)',
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: activePanel === 'export' || activePanel === 'studio' ? 'hidden' : 'auto',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)',
            paddingTop: 4,
            boxShadow: '0 -18px 48px rgba(0,0,0,0.45)',
            zIndex: 100,
            WebkitOverflowScrolling: 'touch',
          }}>
            {/* Drag handle + close */}
            <div
              role="presentation"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 12px 6px', position: 'relative' }}
            >
              <div
                aria-hidden="true"
                style={{ width: 42, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }}
              />
              <button
                onClick={() => setActivePanel(null)}
                style={{ position: 'absolute', right: 12, background: 'transparent', border: 'none', color: '#aaa', fontSize: 16, lineHeight: 1, padding: 8, minWidth: 36, minHeight: 36 }}
                aria-label="Close panel"
              >
                ✕
              </button>
            </div>
            <ErrorBoundary>
              {activePanel === 'studio' && (
                <ViewerControlsDrawer
                  activeMode={studioDeck ?? 'look'}
                  onModeChange={openStudioDeck}
                  onClose={() => setActivePanel(null)}
                  showChrome
                />
              )}
              {activePanel === 'export' && <FigureExportPanel />}
              {activePanel === 'flythrough' && <FlythroughPanel />}
              {activePanel === 'telemetry' && (
                <TelemetryPanel
                  thermo={file?.thermo ?? null}
                  currentFrame={currentFrame}
                  totalFrames={totalFrames}
                />
              )}
              {activePanel === 'equilibrium' && <EquilibriumSolveWorkbench />}
              {activePanel === 'mlipLongRun' && <MlipLongRunWorkbench />}
            </ErrorBoundary>
          </div>
        )}

        {/* Desktop: dockable floating panels */}
        {!isMobile && file && (
          <PanelHost
            activePanel={activePanel}
            studioDeck={studioDeck}
            onOpenStudioDeck={openStudioDeck}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* Landing page (hero, featured, drop zone, gallery) */}
        {!file && (
          <div style={{ position: 'relative', width: '100%', zIndex: 10 }}>
            {isMlipFlywheelRoute
              ? <MlipFlywheelPage />
              : isMcpViewerRoute || isSavedViewRoute
                ? null
                : isCopperSceneRoute
                  ? <SceneLandingPage />
                  : seoEducationKind
                    ? <SeoEducationPage kind={seoEducationKind} />
                    : <LandingPage />}
          </div>
        )}
      </div>

      {/* ─── Batch Asset Generator overlay ─── */}
      {isBatchExport && <BatchAssetGenerator />}

      {/* ─── Timeline ─── */}
      {file && totalFrames > 1 && (
        <div style={{
          height: 60, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 16,
          padding: isMobile ? '0 12px 48px' : '0 20px',
          borderTop: '1px solid #1f2937',
          background: '#0a0a0c',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {/* Transport controls */}
          <div style={{ display: 'flex', gap: 4 }}>
            <TransportButton
              onClick={() => useStore.getState().setFrame(0)}
              title="First frame"
              icon={<IconFirst />}
            />
            <TransportButton
              onClick={() => useStore.getState().prevFrame()}
              title="Previous [←]"
              icon={<IconPrev />}
            />
            <TransportButton
              onClick={togglePlay}
              title="Play/Pause [Space]"
              icon={playing ? <IconPause /> : <IconPlay />}
              active={playing}
              width={40}
            />
            <TransportButton
              onClick={nextFrame}
              title="Next [→]"
              icon={<IconNext />}
            />
            <TransportButton
              onClick={() => useStore.getState().setFrame(totalFrames - 1)}
              title="Last frame"
              icon={<IconLast />}
            />
          </div>

          {/* Scrubber */}
          <ThermoMinimap
            thermo={file?.thermo ?? null}
            totalFrames={totalFrames}
            currentFrame={frame}
            onFrameChange={(f) => {
              if (playing) togglePlay();
              setFrame(f);
            }}
          />

          {/* Frame counter */}
          <div style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: '#64748b',
            minWidth: 90,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}>
            <span style={{ color: '#f8fafc', fontWeight: 500 }}>{Math.floor(frame) + 1}</span>
            <span style={{ color: '#475569' }}> / {totalFrames}</span>
          </div>

          {/* Speed selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[0.25, 0.5, 1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => useStore.getState().setPlaybackSpeed(speed)}
                style={{
                  padding: '6px 8px',
                  minWidth: 36,
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: playbackSpeed === speed ? 600 : 400,
                  color: playbackSpeed === speed ? '#0a0a0c' : '#64748b',
                  background: playbackSpeed === speed ? '#f59e0b' : '#121418',
                  border: `1px solid ${playbackSpeed === speed ? '#f59e0b' : '#334155'}`,
                  borderRadius: 0,
                  cursor: 'pointer',
                  transition: 'all 100ms ease-out',
                }}
              >
                {speed}×
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Command palette — global quick navigation */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        actions={useMemo(() => {
          const list: import('./CommandPalette').CommandAction[] = [
            {
              id: 'random-molecule',
              label: 'View random OMol25 molecule',
              group: 'Discover',
              shortcut: 'R',
              onSelect: () => void openRandomOmol25Molecule(),
            },
            {
              id: 'gallery',
              label: 'Open gallery',
              group: 'Discover',
              shortcut: 'G',
              onSelect: () => {
                const el = document.getElementById('gallery');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                else window.location.href = '/#/gallery';
              },
            },
            {
              id: 'controls-look',
              label: 'Open Look controls',
              group: 'Panels',
              shortcut: 'V',
              disabled: !file,
              onSelect: () => openStudioDeck('look'),
            },
            {
              id: 'controls-surface',
              label: 'Open Surface controls',
              group: 'Panels',
              disabled: !file,
              onSelect: () => openStudioDeck('surface'),
            },
            {
              id: 'controls-world',
              label: 'Open World controls',
              group: 'Panels',
              disabled: !file,
              onSelect: () => openStudioDeck('world'),
            },
            {
              id: 'export-panel',
              label: 'Open figure export',
              group: 'Panels',
              shortcut: 'X',
              disabled: !file,
              onSelect: () => {
                setShowPotentialBrowser(false);
                setActivePanel('export');
              },
            },
            {
              id: 'study-lens',
              label: 'Toggle study lens',
              group: 'Panels',
              disabled: !file,
              onSelect: () => {
                setShowPotentialBrowser(false);
                setStudyLensOpen(open => !open);
              },
            },
            {
              id: 'telemetry-panel',
              label: 'Open telemetry',
              group: 'Panels',
              shortcut: 'T',
              disabled: !file,
              onSelect: () => {
                setShowPotentialBrowser(false);
                setActivePanel('telemetry');
              },
            },
            {
              id: 'flythrough-panel',
              label: 'Open flythrough',
              group: 'Panels',
              disabled: !file,
              onSelect: () => {
                setShowPotentialBrowser(false);
                setActivePanel('flythrough');
              },
            },
            {
              id: 'camera-top',
              label: 'Camera top view',
              group: 'Camera',
              disabled: !file,
              onSelect: () => setCameraPreset('top'),
            },
            {
              id: 'camera-side',
              label: 'Camera side view',
              group: 'Camera',
              disabled: !file,
              onSelect: () => setCameraPreset('side'),
            },
            {
              id: 'camera-front',
              label: 'Camera front view',
              group: 'Camera',
              disabled: !file,
              onSelect: () => setCameraPreset('front'),
            },
            {
              id: 'camera-iso',
              label: 'Camera isometric view',
              group: 'Camera',
              disabled: !file,
              onSelect: () => setCameraPreset('iso'),
            },
            {
              id: 'toggle-bonds',
              label: 'Toggle bond guides',
              group: 'Scene',
              disabled: !file,
              onSelect: () => useStore.getState().toggleBonds(),
            },
            {
              id: 'toggle-playback',
              label: 'Play / pause trajectory',
              group: 'Scene',
              disabled: !file || totalFrames <= 1,
              onSelect: () => togglePlay(),
            },
            {
              id: 'close-file',
              label: 'Close current molecule',
              group: 'Scene',
              disabled: !file,
              onSelect: clearLoadedFile,
            },
            {
              id: 'close-panel',
              label: 'Close tool panel',
              group: 'Scene',
              disabled: !activePanel,
              onSelect: () => setActivePanel(null),
            },
          ];
          return list;
        }, [file, activePanel, totalFrames, studyLensOpen, clearLoadedFile])}
      />
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────

/** Non-blocking, dismissible toast for renderer warnings (WebGPU accelerator
 *  unavailable/timed out → CPU fallback). role="status" so it's announced
 *  politely without stealing focus. The scene keeps rendering underneath. */
function RendererWarningToast() {
  const rendererWarning = useStore(s => s.rendererWarning);
  const isCompact = useMediaQuery('(max-width: 640px)');
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    setDetailsOpen(false);
  }, [rendererWarning, isCompact]);

  if (!rendererWarning) return null;
  const isCpuFallback = /GPU bond acceleration|CPU path/i.test(rendererWarning);
  const severity = isCpuFallback ? 'notice' : 'warning';
  const isNotice = severity === 'notice';
  const isQuietNotice = isCompact && severity === 'notice';
  const isExpanded = !isQuietNotice || detailsOpen;
  const visibleWarning = isQuietNotice && !isExpanded ? 'CPU bond path active' : rendererWarning;
  const announceWarning = isQuietNotice ? rendererWarning : undefined;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={announceWarning}
      title={isQuietNotice ? rendererWarning : undefined}
      style={{
        position: 'absolute',
        top: isCompact ? 10 : 16,
        right: isCompact ? 10 : 16,
        maxWidth: isCompact ? (isExpanded ? 'min(280px, calc(100vw - 20px))' : 'min(188px, calc(100vw - 20px))') : 280,
        display: 'flex',
        alignItems: isExpanded ? 'flex-start' : 'center',
        gap: isCompact ? 6 : 8,
        padding: isCompact ? '6px 8px' : '10px 12px',
        background: isQuietNotice
          ? (isExpanded ? 'rgba(12,16,24,0.86)' : 'rgba(12,16,24,0.58)')
          : 'rgba(20,24,33,0.92)',
        border: isNotice
          ? '1px solid rgba(148,163,184,0.14)'
          : '1px solid rgba(245,158,11,0.22)',
        borderRadius: isQuietNotice && !isExpanded ? 999 : 'var(--radius-sm, 8px)',
        backdropFilter: 'blur(10px)',
        fontSize: isCompact ? 11 : 12,
        lineHeight: 1.35,
        color: isNotice && isCompact ? 'rgba(226,232,240,0.78)' : 'var(--text-muted, #9aa7bd)',
        zIndex: 160,
      }}
    >
      {isQuietNotice ? (
        <button
          type="button"
          onClick={() => setDetailsOpen(open => !open)}
          aria-expanded={detailsOpen}
          aria-label={detailsOpen ? 'Collapse renderer warning details' : `Expand renderer warning details: ${rendererWarning}`}
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: isExpanded ? 'normal' : 'nowrap',
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            font: 'inherit',
            lineHeight: 'inherit',
            padding: 0,
            textAlign: 'left',
          }}
        >
          {visibleWarning}
        </button>
      ) : (
        <span style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: isCompact && isNotice ? 'nowrap' : 'normal',
        }}>
          {visibleWarning}
        </span>
      )}
      <button
        type="button"
        onClick={() => useStore.getState().setRendererWarning(null)}
        aria-label="Dismiss warning"
        title="Dismiss"
        style={{
          flexShrink: 0,
          width: isCompact ? 20 : 18,
          height: isCompact ? 20 : 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-dim, #6b7688)',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <IconClose />
      </button>
    </div>
  );
}

/** Inline tab strip rendered at the top of a consolidated drawer. Switches
 *  the active panel without closing the drawer; currently used for the
 *  Export figure/path split. Each tab id corresponds to a panel id in
 *  activePanel. */
function SubTabStrip({
  active,
  tabs,
  children,
}: {
  active: string;
  tabs: Array<{ id: string; label: string }>;
  children: React.ReactNode;
}) {
  const setActivePanel = useStore(s => s.setActivePanel);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '8px 12px 0 12px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        {tabs.map(tab => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id as any)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                padding: '8px 14px',
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 150ms',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  fontSize: '9px',
  fontFamily: 'var(--font-mono)',
  color: '#94a3b8',
  background: '#121418',
  border: '1px solid #334155',
  borderRadius: 0,
  marginRight: 4,
};
