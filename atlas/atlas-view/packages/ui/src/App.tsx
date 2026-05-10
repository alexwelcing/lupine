/**
 * glimPSE — Premium Application Shell
 *
 * Professional molecular dynamics visualization with
 * glassmorphic UI, side panels, and publication-quality rendering.
 */

import { useEffect, useCallback, useRef, useState, Component, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Environment, ContactShadows } from '@react-three/drei';
import { Perf } from 'r3f-perf';
import { ScenePostprocessing } from './postprocess/ScenePostprocessing';
import { POSTPROCESS_PRESETS } from './postprocess/presets';
import { DevProbe } from './DevProbe';
import { StateInspector } from './StateInspector';
import * as THREE from 'three';
import { XR, createXRStore, useXR } from '@react-three/xr';
import { USDZExportHelper } from './export/USDZExportPipeline';

// XR store — tuned for the Meta Quest browser (Quest 2/3/Pro) while staying
// graceful on non-Meta runtimes. All advanced features are requested as
// *optional* (XRSessionFeatureRequest = true) so a session still starts on
// devices that lack them.
export const xrStore = createXRStore({
  emulate: false,
  // Quest 3 reliably hits 90 Hz; default of 72 leaves frames on the table.
  frameRate: 'high',
  // Foveated rendering — Quest GPU loves this; 0 disables, 1 is max.
  foveation: 0.5,
  // Optional WebXR features. Quest 3 supports all of these; older devices
  // simply ignore them. Requesting them up-front means we don't have to
  // re-negotiate later if/when we wire surface-placement, mesh occlusion, etc.
  handTracking: true,
  hitTest: true,
  anchors: true,
  planeDetection: true,
  meshDetection: true,
  // Direct manipulation lives in XRMoleculeInteraction (reads joint poses
  // every frame). The short hand ray remains as a fallback for menu / UI.
  hand: {
    rayPointer: { rayModel: { maxLength: 1.5 } },
    teleportPointer: false,
    grabPointer: false,
  },
});

import { MobileHUD } from './MobileHUD';
import { ChronosHUD } from './ChronosHUD';
import { VolcanicHUD } from './VolcanicHUD';

import { useStore } from './store';
import { getMaxSafeAtomCount, getDefaultQualityTier } from './deviceCapabilities';
import { LandingPage } from './LandingPage';
import { ThermoMinimap } from './ThermoMinimap';
import { AtomsOptimized } from '@atlas/scene/AtomsOptimized';
import { AtomClusters } from '@atlas/scene/AtomClusters';
import { buildClusters, type Clusters } from '@atlas/scene/ClusterBuilder';
import { SpatialAnchor } from './SpatialAnchor';
import { Bonds } from '@atlas/scene/Bonds';
import { AnnotationsLayer } from './AnnotationsLayer';
import { SelectionMarkers } from './SelectionMarkers';
import { CameraFocus } from './CameraFocus';
import { AtomTrails } from './AtomTrails';
import { AtomInfoHUD } from './AtomInfoHUD';
import { MeasurementsLayer } from './MeasurementsLayer';
import { TYPE_RADII } from '@atlas/scene';
import { useSmoothFramePlayback, type InterpolatedFrameState } from './hooks/useSmoothFramePlayback';
import { SimulationCell } from '@atlas/scene/SimulationCell';
import { ScaleBar } from '@atlas/scene/ScaleBar';
import { getBackgroundFromColormap } from '@atlas/scene';
import { VisualsPanel } from './panels/VisualsPanel';
import { FigureExportPanel } from './panels/FigureExportPanel';
import { AnalysisPanel } from './panels/AnalysisPanel';
import { MeasurementPanel } from './panels/MeasurementPanel';
import { FlythroughPanel } from './panels/FlythroughPanel';
import { TelemetryPanel } from './panels/TelemetryPanel';
import { AtomPicker } from '@atlas/scene/AtomPicker';
import { decodeFlythrough } from './flythrough';
import type { SpatialHash3D } from '@atlas/scene/SpatialHash';
import type { ColormapName } from '@atlas/core/types';
import { getElementSpec } from '@atlas/core';
import { ExportManager } from './ExportManager';
import { AnomalyTracker } from '@atlas/scene/AnomalyTracker';
import { BatchAssetGenerator } from './BatchAssetGenerator';
import { GpuUnlockOverlay, RiveEffectLayer, HeaderShimmer, ToolbarRipple, AnimatedToolButton, AnimatedCameraPresetButton, AnimatedTransportButton } from './rive';

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
const IconShare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

// ─── Friendly Toolbar Icons ───────────────────────────────────────────
const IconStyle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.375 2.625a3.875 3.875 0 0 0-5.48 0l-9.27 9.27a3.875 3.875 0 0 0 0 5.48l.27.27a3.875 3.875 0 0 0 5.48 0l9.27-9.27a3.875 3.875 0 0 0 0-5.48l-.27-.27Z" />
    <path d="M14 6l4 4" />
    <path d="M8.5 15.5 4 20" />
  </svg>
);
const IconEffects = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);
const IconMeasure = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.3 15.3 2.7 2.7" />
    <path d="M15 21.3 2.7 2.7" />
    <path d="M21.3 9 2.7 2.7" />
    <path d="M9 21.3 2.7 2.7" />
  </svg>
);
const IconCamera = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);
const IconReset = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
const IconAnalysis = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IconAtoms = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="5" r="2" />
    <circle cx="19" cy="16" r="2" />
    <circle cx="5" cy="16" r="2" />
    <line x1="12" y1="7" x2="12" y2="9" />
    <line x1="16.9" y1="14.5" x2="14.6" y2="13.3" />
    <line x1="7.1" y1="14.5" x2="9.4" y2="13.3" />
  </svg>
);
const IconFlythrough = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2" />
    <path d="M7 2v20" />
    <path d="M17 2v20" />
    <path d="M2 12h20" />
    <path d="M2 7h5" />
    <path d="M2 17h5" />
    <path d="M17 7h5" />
    <path d="M17 17h5" />
  </svg>
);
const IconTelemetry = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

// ─── Background presets ───────────────────────────────────────────────
const BG_PRESETS: Record<string, { top: string; bottom: string; label: string }> = {
  void:      { top: '#000000', bottom: '#000000', label: 'Void' },
  deep:      { top: '#080a14', bottom: '#000000', label: 'Deep Field' },
  dark:      { top: '#1a1a1f', bottom: '#0a0a0c', label: 'Dark' },
  white:     { top: '#ffffff', bottom: '#f0f0f5', label: 'White' },
  blueprint: { top: '#0b162c', bottom: '#050a14', label: 'Blueprint' },
  midnight:  { top: '#080c18', bottom: '#141e38', label: 'Midnight' },
  studio:    { top: '#1a1a2e', bottom: '#16213e', label: 'Studio' },
  warm:      { top: '#1a100c', bottom: '#0d0906', label: 'Warm Dark' },
  fog:       { top: '#101418', bottom: '#1c2028', label: 'Fog' },
};

function resolveBackground(backgroundPreset: string, colormap: ColormapName): { top: string; bottom: string } {
  if (backgroundPreset.startsWith('palette:')) {
    const [, palette] = backgroundPreset.split(':');
    return getBackgroundFromColormap((palette as ColormapName) ?? colormap);
  }
  return BG_PRESETS[backgroundPreset] ?? BG_PRESETS.void;
}

// ─── Scene Background component ──────────────────────────────────────
function SceneBackground({ top, bottom, style = 'linear', videoUrl }: { top: string; bottom: string; style?: 'linear' | 'radial' | 'spotlight'; videoUrl?: string | null }) {
  const { scene } = useThree();
  
  // Hook must be called unconditionally
  const mode = useXR(state => state.mode);

  useEffect(() => {
    if (mode === 'immersive-ar') {
      scene.background = null;
      scene.fog = null;
      return;
    }

    let video: HTMLVideoElement | null = null;
    let tex: THREE.Texture | null = null;

    if (videoUrl) {
      video = document.createElement('video');
      video.src = videoUrl;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.play().catch(e => console.warn('Video background autoplay prevented:', e));

      tex = new THREE.VideoTexture(video);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      
      scene.background = tex;
      scene.fog = null;
    } else {
      const canvas = document.createElement('canvas');
      const size = 1024;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      let grad;
      if (style === 'radial') {
        grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/1.5);
        grad.addColorStop(0, top);
        grad.addColorStop(1, bottom);
      } else if (style === 'spotlight') {
        grad = ctx.createRadialGradient(size/2, 0, 0, size/2, 0, size/1.2);
        grad.addColorStop(0, top);
        grad.addColorStop(1, bottom);
      } else {
        grad = ctx.createLinearGradient(0, 0, 0, size);
        grad.addColorStop(0, top);
        grad.addColorStop(1, bottom);
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      tex = new THREE.CanvasTexture(canvas);
      tex.mapping = THREE.EquirectangularReflectionMapping; 
      
      scene.background = tex;
      scene.fog = new THREE.FogExp2(bottom, 0.0015);
    }

    return () => {
      if (tex) tex.dispose();
      if (video) {
        video.pause();
        video.src = '';
        video.load();
      }
      scene.background = null;
      scene.fog = null;
    };
  }, [scene, top, bottom, style, videoUrl, mode]);

  return null;
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
}: {
  fileId?: string;
  center: [number, number, number];
  distance: number;
}) {
  const { camera, controls } = useThree((s) => ({ camera: s.camera, controls: s.controls as any }));
  const flythroughPreview = useStore(s => s.flythroughPreview);

  // Sync continuously during flythrough preview + keep clipping planes generous
  useFrame(() => {
    // Dynamic clipping: always keep far plane far enough to see everything
    if (camera instanceof THREE.PerspectiveCamera) {
      const camDist = camera.position.length();
      const minFar = Math.max(10000, distance * 100, camDist * 20);
      if (camera.far < minFar) {
        camera.far = minFar;
        camera.updateProjectionMatrix();
      }
    }

    if (flythroughPreview) {
      const state = useStore.getState();
      camera.position.set(...state.cameraPosition);
      camera.lookAt(...state.cameraTarget);
      
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = state.cameraFov;
        camera.updateProjectionMatrix();
      }

      if (controls && controls.target) {
        controls.target.set(...state.cameraTarget);
        controls.update();
      }
    }
  });

  // Fit on load
  useEffect(() => {
    if (!fileId) return;
    camera.position.set(center[0], center[1], center[2] + distance);
    camera.lookAt(center[0], center[1], center[2]);
    camera.updateProjectionMatrix();
    if (controls && controls.target) {
      controls.target.set(center[0], center[1], center[2]);
      controls.update();
    }
    useStore.getState().setCameraState(camera.position.toArray() as any, center);
  }, [fileId, center, distance, camera, controls]);

  // Sync with presets
  useEffect(() => {
    const unsub = useStore.subscribe(
      (s) => s.cameraPreset,
      (preset) => {
        const { cameraPosition, cameraTarget } = useStore.getState();
        camera.position.set(...cameraPosition);
        camera.lookAt(...cameraTarget);
        camera.updateProjectionMatrix();
        if (controls && controls.target) {
          controls.target.set(...cameraTarget);
          controls.update();
        }
      }
    );
    return unsub;
  }, [camera, controls]);

  return null;
}

/** Sync the legacy `dof` boolean to whether the active preset has DOF
 *  enabled. AnomalyTracker reads `dof` to know when to focus on hot atoms;
 *  keeping this synced means the legacy field stays meaningful without
 *  duplicating preset logic in the consumer. Migrate AnomalyTracker to read
 *  the preset directly when convenient and delete this. */
function PresetLegacyBridge() {
  const presetId = useStore(s => s.postprocessPreset);
  useEffect(() => {
    const preset = POSTPROCESS_PRESETS[presetId];
    if (!preset) return;
    useStore.setState({
      ssao: preset.ssao.enabled,
      bloom: preset.bloom.enabled,
      dof: preset.dof.enabled,
      toneMapping: preset.toneMapping,
    });
  }, [presetId]);
  return null;
}

import { Testbed } from './Testbed';

export default function App() {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('testbed')) {
    return <Testbed />;
  }

  const [isExportingQuickLook, setIsExportingQuickLook] = useState(false);
  const [xrCapabilities, setXrCapabilities] = useState({ ar: false, vr: false, ios: false });

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const xr = (navigator as any).xr;
    
    if (xr) {
      // Check AR support
      xr.isSessionSupported('immersive-ar').then((supported: boolean) => {
        setXrCapabilities(prev => ({ ...prev, ar: supported }));
      }).catch(() => {});
      
      // Check VR support
      xr.isSessionSupported('immersive-vr').then((supported: boolean) => {
        setXrCapabilities(prev => ({ ...prev, vr: supported }));
      }).catch(() => {});
    }
    
    setXrCapabilities(prev => ({ ...prev, ios: isIOS }));
  }, []);
  const file = useStore(s => s.file);
  const loading = useStore(s => s.loading);
  const frame = useStore(s => s.frame);
  const playing = useStore(s => s.playing);
  const playbackSpeed = useStore(s => s.playbackSpeed);
  const colorMode = useStore(s => s.colorMode);
  const colorProperty = useStore(s => s.colorProperty);
  const environmentPreset = useStore(s => s.environmentPreset);
  const materialPreset = useStore(s => s.materialPreset);
  const colormap = useStore(s => s.colormap);
  const atomColorSource = useStore(s => s.atomColorSource);
  const postprocessPreset = useStore(s => s.postprocessPreset);
  const propertyEmissionStrength = useStore(s => s.propertyEmissionStrength);
  const annotations = useStore(s => s.annotations);
  const labelStyle = useStore(s => s.labelStyle);
  const selectedAtoms = useStore(s => s.selectedAtoms);
  const hoveredAtom = useStore(s => s.hoveredAtom);
  const pinnedMeasurements = useStore(s => s.pinnedMeasurements);

  // Atoms that get worldline trails. Union of currently-selected and
  // currently-annotated. Lifted to component top so the useMemo's hook
  // index is stable across renders — embedding it inside conditional JSX
  // changes the hook count when `currentFrame` flips and crashes React
  // with "Rendered more hooks than during the previous render."
  const trackedAtomIndices = useMemo(() => {
    const set = new Set<number>(selectedAtoms);
    for (const ann of annotations) set.add(ann.atomIndex);
    return Array.from(set);
  }, [selectedAtoms, annotations]);

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
  const activePanel = useStore(s => s.activePanel);
  const backgroundPreset = useStore(s => s.backgroundPreset);
  const backgroundStyle = useStore(s => s.backgroundStyle);
  const backgroundVideo = useStore(s => s.backgroundVideo);
  const ssaoIntensity = useStore(s => s.ssaoIntensity);
  const showScaleBar = useStore(s => s.showScaleBar);
  const cameraPreset = useStore(s => s.cameraPreset);
  const setCameraPreset = useStore(s => s.setCameraPreset);
  const bloomIntensity = useStore(s => s.bloomIntensity);
  const propRange = useStore(s => s.propRange);
  const setFrame = useStore(s => s.setFrame);
  const nextFrame = useStore(s => s.nextFrame);
  const togglePlay = useStore(s => s.togglePlay);
  const setActivePanel = useStore(s => s.setActivePanel);
  const hiddenAtomTypes = useStore(s => s.hiddenAtomTypes);
  const atomTypeScales = useStore(s => s.atomTypeScales);
  const anomalyTracking = useStore(s => s.anomalyTracking);
  const ambientLightIntensity = useStore(s => s.ambientLightIntensity);
  const dirLightIntensity = useStore(s => s.dirLightIntensity);
  const atomTexture = useStore(s => s.atomTexture);
  const loadedAtomCount = useStore(s => s.loadedAtomCount);
  // Cluster splats for huge-scene LOD (Phase 4). Built once per frame
  // identity, AFTER streaming completes — running on a partial frame
  // would aggregate uninitialized zero-positions into a giant fake
  // cluster at the origin. Stored as React state so the cluster mesh
  // remounts when the build finishes.
  const [clusters, setClusters] = useState<Clusters | null>(null);

  // Spatial hash for atom picking
  const [spatialHash, setSpatialHash] = useState<SpatialHash3D | null>(null);

  const isMobile = useMediaQuery('(max-width: 768px)');

  // Device-capability budget. Computed once at mount — hardware doesn't
  // change during a session. The cap reflects MEMORY ceiling now (not GPU
  // shader cost) since the quality-tier system below makes any tier render
  // any count. The fast tier specifically restores early-Z on mobile by
  // skipping gl_FragDepth, so 1M impostor spheres become feasible on a
  // phone where the premium shader would freeze the page.
  const deviceMaxAtoms = useMemo(() => getMaxSafeAtomCount(), []);
  const deviceQualityTier = useMemo(() => getDefaultQualityTier(), []);

  // Playback timer (replaced with smooth 60fps interpolator)
  const { currentState: interpState, setFrame: setSmoothFrame } = useSmoothFramePlayback(playing, {
    frames: file?.trajectory.frames ?? [],
    speed: playbackSpeed,
    targetFPS: 60,
    mdFrameRate: 30, // Default typical MD output
    onFrame: (state) => {
      // Sync UI timeline without forcing expensive React renders unnecessarily
      // Only sync when playing. When paused, the store (user scrubbing) drives the hook.
      if (useStore.getState().playing && state.frameIndex !== useStore.getState().frame) {
        useStore.getState().setFrame(state.frameIndex);
      }
    }
  });

  // Sync external frame updates (like timeline scrubber manually dragging) back to the hook when NOT playing
  useEffect(() => {
    if (!playing && interpState.effectiveFrame !== frame) {
      setSmoothFrame(frame);
    }
  }, [frame, playing, setSmoothFrame, interpState.effectiveFrame]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      const currentFile = useStore.getState().file;
      const isResearch = Boolean(currentFile?.name?.startsWith('research_') || currentFile?.sourceUrl?.includes('/research/'));

      if (e.key === ' ' && !isResearch) { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowRight') nextFrame();
      if (e.key === 'ArrowLeft') useStore.getState().prevFrame();
      if (e.key === 'Escape') setActivePanel(null);
      if (e.key === 'v' && !e.metaKey && !e.ctrlKey) setActivePanel('visuals');
      if (e.key === 'a' && !e.metaKey && !e.ctrlKey) setActivePanel('analysis');
      if (e.key === 'x' && !e.metaKey && !e.ctrlKey) setActivePanel('export');
      if (e.key === 'b' && !e.metaKey && !e.ctrlKey) useStore.getState().toggleBonds();
      if (e.key === 'm' && !e.metaKey && !e.ctrlKey) setActivePanel('measurement');
      if (e.key === 't' && !e.metaKey && !e.ctrlKey) setActivePanel('telemetry');
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
  }, [togglePlay, nextFrame, setActivePanel]);

  // URL state restore + auto-load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('s');
    if (state) useStore.getState().decodeFromURL(state);

    // Restore flythrough from URL
    const flyParam = params.get('fly');
    if (flyParam) {
      const seq = decodeFlythrough(flyParam);
      if (seq) {
        useStore.getState().setFlythrough(seq);
        useStore.getState().setActivePanel('flythrough');
      }
    }

    const loadUrl = params.get('load');
    if (loadUrl && !file) {
      (async () => {
        try {
          useStore.getState().setLoading(true, 0);

          // ── Streaming path for .glimbin files ──
          // Fetches only a 256-byte header + frame index + frame 0,
          // then loads additional frames on-demand via Range Requests.
          const { isGlimbinUrl, autoDetectLoader } = await import('@atlas/parsers/StreamingLoader');
          const loaderType = isGlimbinUrl(loadUrl) ? 'streaming' : await autoDetectLoader(loadUrl);

          if (loaderType === 'streaming') {
            const { StreamingLoader } = await import('@atlas/parsers/StreamingLoader');
            const loader = new StreamingLoader(loadUrl, {
              onProgress: (_phase, progress) => {
                useStore.getState().setLoading(true, progress * 0.6);
              },
            });

            const header = await loader.fetchHeader();
            await loader.fetchIndex();
            const frame0 = await loader.fetchFrame(0);
            const meta = loader.getMetadata()!;

            // Build trajectory with frame 0 loaded; rest fetched on-demand
            const placeholderFrames = new Array(meta.totalFrames);
            placeholderFrames[0] = frame0;

            const name = loadUrl.split('/').pop() ?? 'dataset.glimbin';
            useStore.getState().setFile({
              name,
              size: meta.fileSize,
              trajectory: {
                frames: placeholderFrames,
                totalFrames: meta.totalFrames,
                atomTypes: meta.atomTypes,
                globalBounds: meta.globalBounds,
              },
              thermo: null,
              sourceUrl: loadUrl,
            });

            // On-demand frame fetching: subscribe to timeline scrubs
            // and auto-fetch frames that haven't been loaded yet.
            const unsubFrameWatch = useStore.subscribe(
              (s) => s.frame,
              async (frameIndex) => {
                const currentFile = useStore.getState().file;
                if (!currentFile) return;
                if (currentFile.trajectory.frames[frameIndex]) return;

                try {
                  const frame = await loader.fetchFrame(frameIndex);
                  const file = useStore.getState().file;
                  if (file) {
                    file.trajectory.frames[frameIndex] = frame;
                    useStore.setState({ file: { ...file } });
                  }
                  // Prefetch adjacent frames
                  const isPlaying = useStore.getState().playing;
                  loader.prefetch(frameIndex, isPlaying ? 1 : 0, isPlaying ? 8 : 3);
                } catch (err: any) {
                  console.warn(`[streaming] Frame ${frameIndex} fetch failed:`, err.message);
                }
              }
            );

            // Stash cleanup for potential future navigation
            (window as any).__atlasStreamingCleanup = () => {
              unsubFrameWatch();
              loader.dispose();
            };
            return;
          }

          // ── Legacy monolithic path for text formats ──
          const resp = await fetch(loadUrl);
          if (!resp.ok) throw new Error(`Failed to fetch ${loadUrl}: ${resp.status}`);
          const blob = await resp.blob();
          const name = loadUrl.split('/').pop() ?? 'file.dump';
          const fileObj = new File([blob], name);
          const { parseFile } = await import('@atlas/parsers');
          const result = await parseFile(fileObj);
          if (result.trajectory) {
            useStore.getState().setFile({
              name,
              size: blob.size,
              trajectory: result.trajectory,
              thermo: result.thermo ?? null,
              sourceUrl: loadUrl,
            });
          } else {
            throw new Error('No trajectory data found');
          }
        } catch (err: any) {
          useStore.getState().setError(err.message);
        }
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

  const cameraDistance = useMemo(() => file
    ? (() => {
        const { min, max } = file.trajectory.globalBounds;
        const dx = max[0] - min[0], dy = max[1] - min[1], dz = max[2] - min[2];
        const diagonal = Math.hypot(dx, dy, dz);
        // Field of view is 50 deg. To fit bounding sphere with radius (diagonal/2):
        // D = (diagonal / 2) / Math.sin(25 * Math.PI / 180) ≈ diagonal * 1.18
        // Multiply by an extra margin to give breathing room.
        return diagonal * 1.4;
      })()
    : 50, [file?.name]);

  const center = useMemo(() => file
    ? file.trajectory.globalBounds.min.map(
        (v, i) => (v + file.trajectory.globalBounds.max[i]) / 2
      ) as [number, number, number]
    : [0, 0, 0] as [number, number, number], [file?.name]);

  const availableProperties = currentFrame
    ? Array.from(currentFrame.properties?.keys() ?? [])
    : [];

  const bg = resolveBackground(backgroundPreset, colormap);
  const isBatchExport = new URLSearchParams(window.location.search).get('batchExport') === 'true';

  return (
    <div style={{
      width: '100%', minHeight: '100vh',
      height: file ? '100vh' : 'auto',
      overflow: file ? 'hidden' : 'visible',
      background: `linear-gradient(180deg, ${bg.top}, ${bg.bottom})`,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ─── Desktop Header ─── */}
      <header style={{
        height: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 200,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => { 
              if (file) {
                useStore.getState().clearFile(); 
                const url = new URL(window.location.href);
                url.searchParams.delete('sim');
                window.history.pushState({}, '', url);
              }
            }}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 4,
              background: 'none', border: 'none', padding: 0,
              cursor: file ? 'pointer' : 'default',
            }}
          >
            <span style={{
              fontSize: 20, fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.02em'
            }}>
              glim
            </span>
            <span style={{
              fontSize: 20, fontWeight: 500, color: 'var(--accent)',
            }}>
              PSE
            </span>
          </button>

          {file && (
            <>
              <div style={{ width: 1, height: 18, background: 'var(--border-subtle)', display: isMobile ? 'none' : 'block' }} />

              <span style={{
                fontSize: 14, color: 'var(--text-muted)',
                maxWidth: isMobile ? 80 : 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {file.name}
              </span>
              <button
                onClick={() => {
                  useStore.getState().clearFile();
                  const url = new URL(window.location.href);
                  url.searchParams.delete('sim');
                  window.history.pushState({}, '', url);
                }}
                title="Close"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24,
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <IconClose />
              </button>
            </>
          )}
        </div>

        {/* Simple top-right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
          {file && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  if (xrCapabilities.ar) {
                    xrStore.enterAR();
                  } else if (xrCapabilities.vr) {
                    xrStore.enterVR();
                  } else if (xrCapabilities.ios) {
                    setIsExportingQuickLook(true);
                  } else {
                    alert("Immersive AR/VR is not supported on this device or browser.\n\nOn iOS: Use Safari for AR Quick Look.\nOn Android: Use Google Chrome.");
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 12px', background: 'var(--accent-soft)',
                  border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  minHeight: 36, // Ensure it's large enough to tap easily
                }}
                title="Immersive Tools"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {isMobile ? 'View AR' : 'View XR'}
              </button>
            </div>
          )}
          {file?.sourceUrl && (
            <button
              onClick={() => {
                const s = useStore.getState().encodeToURL();
                const link = `${window.location.origin}${window.location.pathname}?load=${encodeURIComponent(file.sourceUrl!)}&s=${encodeURIComponent(s)}`;
                navigator.clipboard.writeText(link);
                alert('View copied to clipboard! Anyone with this link can view the exact state and orientation.');
              }}
              title="Copy shareable link"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: isMobile ? '8px 8px' : '8px 12px',
                fontSize: 13, fontWeight: 500,
                color: 'var(--text-primary)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              <IconShare />
              {!isMobile && 'Share'}
            </button>
          )}
          {!file && (
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('sim', 'au_nanocluster');
                window.history.pushState({}, '', url);
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              style={{
                padding: '8px 14px',
                fontSize: 14, fontWeight: 500,
                color: 'white',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              Try a demo
            </button>
          )}
          <a
            href="https://lupine.science"
            style={{
              display: isMobile ? 'none' : 'block',
              padding: '8px 12px',
              fontSize: 13, fontWeight: 500,
              color: 'var(--text-primary)',
              background: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
            }}
          >
            Lupine Home
          </a>
          <a
            href="https://github.com/alexwelcing/lupine"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: isMobile ? 'none' : 'block',
              padding: '8px 12px',
              fontSize: 13, fontWeight: 500,
              color: 'var(--text-muted)',
              background: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
            }}
          >
            GitHub
          </a>
        </div>
      </header>

      {/* ─── Main content ─── */}
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* 3D viewport */}
        <div style={{ 
          position: file ? 'absolute' : 'fixed', 
          inset: 0, 
          top: file ? 0 : 56, // below header when fixed
          zIndex: 0 
        }}>
          <Canvas
            camera={{
              position: [center[0], center[1], center[2] + cameraDistance],
              fov: 50,
              near: 0.1,
              far: Math.max(10000, cameraDistance * 100),
            }}
            gl={{
              antialias: false,
              preserveDrawingBuffer: true,
              powerPreference: 'high-performance',
            }}
            onCreated={({ gl }) => {
              // r182 deprecates PCFSoftShadowMap; PCFShadowMap is now soft.
              gl.shadowMap.type = THREE.PCFShadowMap;
            }}
            style={{ background: 'transparent' }}
            onPointerMissed={() => useStore.getState().setSelectedAtoms([])}
          >
            {import.meta.env.DEV && (
              <>
                <Perf position="top-left" logsPerSecond={4} matrixUpdate />
                <DevProbe />
              </>
            )}
            <XR store={xrStore}>
              <USDZExportHelper trigger={isExportingQuickLook} onComplete={() => setIsExportingQuickLook(false)} />
            <ExportManager />
            <SceneBackground top={bg.top} bottom={bg.bottom} style={backgroundStyle} videoUrl={backgroundVideo} />

            <ambientLight intensity={ambientLightIntensity} />
            <directionalLight position={[5, 8, 6]} intensity={dirLightIntensity} />
            {(!file?.trajectory?.frames?.[0]?.positions?.length || file.trajectory.frames[0].positions.length / 3 <= 50000) && (
              <>
                <directionalLight position={[-3, -2, 4]} intensity={dirLightIntensity * 0.3} />
                <directionalLight position={[0, -5, -3]} intensity={dirLightIntensity * 0.15} color="#8888ff" />
              </>
            )}
          {/* HDRI environment, coupled to the postprocess preset. Bonds (which
              use MeshPhysicalMaterial) automatically pick this up via
              scene.environment for IBL specular — they reflect studio in
              studio preset, sunset in cinematic, night in editorial, etc.
              The store-level `environmentPreset` is now a fallback override
              when explicitly set to anything other than 'studio' (the default). */}
          {(() => {
            const drei = POSTPROCESS_PRESETS[postprocessPreset].env.drei;
            const override = environmentPreset !== 'studio' && environmentPreset !== 'none' ? environmentPreset : null;
            const final = override ?? drei;
            return final ? <Environment preset={final as any} /> : null;
          })()}

            <CameraManager fileId={file?.name} center={center} distance={cameraDistance} />
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
              minDistance={Math.max(0.5, cameraDistance * 0.04)}
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
                <AnomalyTracker
                  frame={currentFrame}
                  colorProperty={colorProperty}
                  active={anomalyTracking}
                />
                <AtomsOptimized
                  frame={file!.trajectory.frames[interpState.frameIndex]}
                  nextFrame={interpState.isInterpolating ? file!.trajectory.frames[interpState.nextFrameIndex] : undefined}
                  interpolationFactor={interpState.isInterpolating ? interpState.interpolationFactor : 0}
                  colorMode={colorMode}
                  colorProperty={colorProperty ?? undefined}
                  colormap={colormap}
                  atomColorSource={atomColorSource}
                  scale={atomScale}
                  renderStyle={renderStyle}
                  maxAtoms={deviceMaxAtoms}
                  qualityTier={deviceQualityTier}
                  loadedAtomCount={loadedAtomCount}
                  onSpatialHash={setSpatialHash}
                  hiddenAtomTypes={hiddenAtomTypes}
                  atomTypeScales={atomTypeScales}
                  botanicalMode={renderStyle === 'botanical'}
                  materialPreset={materialPreset}
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
                    radius={0.12}
                    opacity={0.85}
                    botanicalMode={renderStyle === 'botanical'}
                    materialPreset={materialPreset}
                    // Suppress bond detection while atoms are still
                    // streaming in. The detector reads frame.natoms /
                    // frame.positions wholesale, but during streaming
                    // indices [loadedAtomCount, natoms) are zero — the
                    // detector would see millions of phantom atoms
                    // clustered at the origin and generate a flood of
                    // spurious bonds. Re-enables once streaming
                    // completes (loadedAtomCount === natoms).
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

                {/* Visual feedback for selection + hover. Selection ring pulses
                    subtly via useFrame so the eye is drawn to the picked atom
                    without it being noisy. Hover marker is a quieter, no-pulse
                    pale ring. */}
                <SelectionMarkers
                  frame={currentFrame}
                  selectedAtoms={selectedAtoms}
                  hoveredAtom={hoveredAtom}
                  typeRadii={TYPE_RADII}
                />

                {/* Inline data card next to each selected atom: element,
                    index, position, available property values, and (for
                    multi-selects) distance to the first selected atom. Closes
                    the click → information loop without forcing the user to
                    open a side panel. */}
                <AtomInfoHUD
                  frame={currentFrame}
                  selectedAtoms={selectedAtoms}
                  activeProperty={colorProperty ?? undefined}
                  onDismissCard={(idx) => useStore.getState().setSelectedAtoms(prev => prev.filter(i => i !== idx))}
                  onPinMeasurement={(atomIndices) => useStore.getState().pinMeasurement(atomIndices)}
                />

                {/* Geometric measurements between selected atoms. 2 → dashed
                    distance line, 3 → angle arc, 4 → dihedral readout. Lives
                    in 3D so it persists across camera moves and exports
                    cleanly with the figure pipeline. Live (warm) + pinned
                    (cool) variants render together. */}
                <MeasurementsLayer
                  frame={currentFrame}
                  selectedAtoms={selectedAtoms}
                  pinned={pinnedMeasurements}
                />

                {/* Smoothly dollies camera target toward a single-selection atom.
                    Never pushes camera out — only re-centers and pulls in if the
                    user is far. Disabled during flythrough preview which owns
                    the camera. */}
                <CameraFocus frame={currentFrame} enabled={!flythroughPreview} />

                {/* Worldline trails for tracked atoms (selected ∪ annotated).
                    Scoped to bound memory at 1M-atom scenes; samples one new
                    position per playback frame change so the trail length is
                    in simulation time. Diffusion + dynamics get visual memory. */}
                <AtomTrails
                  frame={currentFrame}
                  frameKey={interpState.frameIndex}
                  atomIndices={trackedAtomIndices}
                />

                {/* Click-to-annotate: shift+click any atom prompts for label
                    text. Plain click selects (existing selectedAtoms slice).
                    Hover state powers the hover indicator in AtomPicker. */}
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
                      } else {
                        useStore.getState().setSelectedAtoms([atomIndex]);
                      }
                    }}
                    onHover={(atomIndex) => useStore.getState().setHoveredAtom(atomIndex)}
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
            </XR>
          </Canvas>

          {import.meta.env.DEV && <StateInspector />}

          {/* GPU feature unlock overlay — fires on CPU→WebGPU transition */}
          <GpuUnlockOverlay />

          {/* Micro-effects layer — fires on state transitions (file load, panel, mode, etc.) */}
          <RiveEffectLayer />

          {/* Ambient header shimmer — subtle top-line glow when a file is loaded */}
          <HeaderShimmer active={!!file} />

          {/* Scale bar for publication figures */}
          {file && currentFrame && showScaleBar && (
            <ScaleBar
              frame={currentFrame}
              cameraDistance={cameraDistance}
              visible={showScaleBar}
              position="bottom-left"
            />
          )}

          {/* Simple stats overlay */}
          {file && (
            <div style={{
              position: 'absolute', top: 16, left: 16,
              pointerEvents: 'none',
            }}>
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
                color: 'white',
                backdropFilter: 'blur(8px)',
              }}>
                Frame {frame + 1} / {totalFrames}
              </div>
            </div>
          )}

          {/* Camera preset buttons */}
          {file && (
            <div style={{
              position: 'absolute',
              top: 72,
              left: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              zIndex: 150,
            }}>
              <AnimatedCameraPresetButton label="XY" active={cameraPreset === 'top'} onClick={() => setCameraPreset('top')} title="Top view (XY plane)" />
              <AnimatedCameraPresetButton label="XZ" active={cameraPreset === 'side'} onClick={() => setCameraPreset('side')} title="Side view (XZ plane)" />
              <AnimatedCameraPresetButton label="YZ" active={cameraPreset === 'front'} onClick={() => setCameraPreset('front')} title="Front view (YZ plane)" />
              <AnimatedCameraPresetButton label="ISO" active={cameraPreset === 'iso'} onClick={() => setCameraPreset('iso')} title="Isometric view" />
            </div>
          )}

          {/* Floating toolbar */}
          {file && !activePanel && (
            <div style={{
              position: 'absolute',
              bottom: 84, // Push above Timeline
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 150,
              padding: '0 16px',
            }}>
              <div style={{
                pointerEvents: 'auto',
                display: 'flex',
                gap: 8,
                padding: 8,
                background: 'rgba(0,0,0,0.5)',
                borderRadius: 16,
                backdropFilter: 'blur(12px)',
                maxWidth: '100%',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}>
                <AnimatedToolButton icon={<IconStyle />} label="Visuals" active={activePanel === 'visuals'} onClick={() => setActivePanel('visuals')} />
                <AnimatedToolButton icon={<IconAnalysis />} label="Analysis" active={activePanel === 'analysis' || activePanel === 'measurement'} onClick={() => setActivePanel('analysis')} />
                <AnimatedToolButton icon={<IconCamera />} label="Export" active={activePanel === 'export' || activePanel === 'flythrough'} onClick={() => setActivePanel('export')} />
                {/* Telemetry is a developer surface — visible only with ?dev=1.
                    Production users see 3 tabs: Visuals · Analysis · Export. */}
                {(typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev')) && (
                  <AnimatedToolButton icon={<IconTelemetry />} label="Telemetry" active={activePanel === 'telemetry'} onClick={() => setActivePanel('telemetry')} />
                )}
                <div style={{ width: 1, minWidth: 1, background: 'rgba(255,255,255,0.15)', margin: '4px 0' }} />
                <AnimatedToolButton icon={<IconReset />} label="Reset" onClick={() => {
                  useStore.getState().reset();
                }} />
              </div>
            </div>
          )}

        </div>

        {/* ─── Side panel ─── */}
        {activePanel && file && (
          <div style={{
            position: 'absolute',
            top: isMobile ? 'auto' : 0,
            right: 0,
            bottom: 0,
            left: isMobile ? 0 : 'auto',
            width: isMobile ? '100%' : (activePanel === 'export' || activePanel === 'flythrough' || activePanel === 'telemetry' ? 360 : 320),
            height: isMobile ? '55vh' : 'auto',
            borderLeft: isMobile ? 'none' : '1px solid var(--border-subtle)',
            borderTop: isMobile ? '1px solid var(--border-subtle)' : 'none',
            background: isMobile ? 'var(--bg-glass)' : 'var(--bg-surface)',
            backdropFilter: isMobile ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: isMobile ? 'blur(16px)' : 'none',
            overflowY: 'auto',
            zIndex: 100,
            animation: isMobile ? 'slideInUp 200ms ease-out forwards' : 'slideInRight 200ms ease-out forwards',
          }}>
            <ErrorBoundary>
              {activePanel === 'visuals' && (
                <VisualsPanel
                  availableProperties={availableProperties}
                />
              )}
              {/* Consolidated Analysis: inner tab strip switches between
                  the analysis modules and the measurement workflow. */}
              {(activePanel === 'analysis' || activePanel === 'measurement') && (
                <SubTabStrip
                  active={activePanel}
                  tabs={[
                    { id: 'analysis', label: 'Modules' },
                    { id: 'measurement', label: 'Measure' },
                  ]}
                >
                  {activePanel === 'analysis' ? <AnalysisPanel /> : <MeasurementPanel />}
                </SubTabStrip>
              )}
              {/* Consolidated Export: figures + flythrough path authoring. */}
              {(activePanel === 'export' || activePanel === 'flythrough') && (
                <SubTabStrip
                  active={activePanel}
                  tabs={[
                    { id: 'export', label: 'Figures' },
                    { id: 'flythrough', label: 'Path' },
                  ]}
                >
                  {activePanel === 'export' ? <FigureExportPanel /> : <FlythroughPanel />}
                </SubTabStrip>
              )}
              {activePanel === 'telemetry' && (
                <TelemetryPanel
                  thermo={file?.thermo ?? null}
                  currentFrame={currentFrame}
                  totalFrames={totalFrames}
                />
              )}
            </ErrorBoundary>
          </div>
        )}

        {/* Landing page (hero, featured, drop zone, gallery) */}
        {!file && (
          <div style={{ position: 'relative', width: '100%', zIndex: 10 }}>
            <LandingPage />
          </div>
        )}
      </div>

      {/* ─── Batch Asset Generator overlay ─── */}
      {isBatchExport && <BatchAssetGenerator />}

      {/* ─── Timeline ─── */}
      {file && (
        <div style={{
          height: 60, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '0 20px',
          borderTop: '1px solid #1f2937',
          background: '#0a0a0c',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {/* Transport controls */}
          <div style={{ display: 'flex', gap: 4 }}>
            <AnimatedTransportButton
              onClick={() => useStore.getState().setFrame(0)}
              title="First frame"
              icon={<IconFirst />}
            />
            <AnimatedTransportButton
              onClick={() => useStore.getState().prevFrame()}
              title="Previous [←]"
              icon={<IconPrev />}
            />
            {totalFrames > 1 && (
              <button
                onClick={togglePlay}
                title="Play/Pause [Space]"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 40, height: 32,
                  background: playing ? 'rgba(52, 211, 153, 0.2)' : '#121418',
                  border: `1px solid ${playing ? '#34d399' : '#334155'}`,
                  boxShadow: playing ? '0 0 15px 2px rgba(52, 211, 153, 0.4)' : 'none',
                  borderRadius: 0,
                  color: playing ? '#34d399' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 100ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  textShadow: playing ? '0 0 8px rgba(52, 211, 153, 0.8)' : 'none',
                }}
              >
                {playing ? <IconPause /> : <IconPlay />}
              </button>
            )}
            <AnimatedTransportButton
              onClick={nextFrame}
              title="Next [→]"
              icon={<IconNext />}
            />
            <AnimatedTransportButton
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
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────

/** Inline tab strip rendered at the top of a consolidated drawer. Switches
 *  the active panel without closing the drawer — used to fold Measure
 *  inside Analysis and Path inside Export so the top-level toolbar can
 *  stay at 3 tabs. Each tab id corresponds to a panel id in activePanel. */
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


