/**
 * glimPSE — Premium Application Shell
 *
 * Professional molecular dynamics visualization with
 * glassmorphic UI, side panels, and publication-quality rendering.
 */

import { useEffect, useCallback, useRef, useState, Component, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import {
  EffectComposer, SSAO, Bloom, ToneMapping, Vignette, DepthOfField
} from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { MobileHUD } from './MobileHUD';
import { ChronosHUD } from './ChronosHUD';
import { VolcanicHUD } from './VolcanicHUD';

import { useStore } from './store';
import { FileDropZone } from './FileDropZone';
import { ThermoMinimap } from './ThermoMinimap';
import { AtomsOptimized } from '@atlas/scene/AtomsOptimized';
import { Bonds } from '@atlas/scene/Bonds';
import { useSmoothFramePlayback, type InterpolatedFrameState } from './hooks/useSmoothFramePlayback';
import { SimulationCell } from '@atlas/scene/SimulationCell';
import { ScaleBar } from '@atlas/scene/ScaleBar';
import { getBackgroundFromColormap } from '@atlas/scene';
import { StylePanel } from './panels/StylePanel';
import { EffectsPanel } from './panels/EffectsPanel';
import { FigureExportPanel } from './panels/FigureExportPanel';
import { AnalysisPanel } from './panels/AnalysisPanel';
import { MeasurementPanel } from './panels/MeasurementPanel';
import { AtomsPanel } from './panels/AtomsPanel';
import { AtomPicker } from '@atlas/scene/AtomPicker';
import type { SpatialHash3D } from '@atlas/scene/SpatialHash';
import type { ColormapName } from '@atlas/core/types';
import { getElementSpec } from '@atlas/core';
import { ExportManager } from './ExportManager';

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

// ─── Background presets ───────────────────────────────────────────────
const BG_PRESETS: Record<string, { top: string; bottom: string; label: string }> = {
  void:     { top: '#06080d', bottom: '#06080d', label: 'Void' },
  deep:     { top: '#06080d', bottom: '#0c1220', label: 'Deep Space' },
  midnight: { top: '#080c18', bottom: '#141e38', label: 'Midnight' },
  studio:   { top: '#1a1a2e', bottom: '#16213e', label: 'Studio' },
  warm:     { top: '#1a100c', bottom: '#0d0906', label: 'Warm Dark' },
  fog:      { top: '#101418', bottom: '#1c2028', label: 'Fog' },
};

function resolveBackground(backgroundPreset: string, colormap: ColormapName): { top: string; bottom: string } {
  if (backgroundPreset.startsWith('palette:')) {
    const [, palette] = backgroundPreset.split(':');
    return getBackgroundFromColormap((palette as ColormapName) ?? colormap);
  }
  return BG_PRESETS[backgroundPreset] ?? BG_PRESETS.void;
}

// ─── Scene Background component ──────────────────────────────────────
function SceneBackground({ top, bottom, style = 'linear' }: { top: string; bottom: string; style?: 'linear' | 'radial' | 'spotlight' }) {
  const { scene } = useThree();

  useEffect(() => {
    const canvas = document.createElement('canvas');
    // We need a square / higher-res canvas for beautiful radial gradients
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    let grad;
    if (style === 'radial') {
      // Center out (bottom color on edge, top color in center)
      grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/1.5);
      grad.addColorStop(0, top);
      grad.addColorStop(1, bottom);
    } else if (style === 'spotlight') {
      // Top-down spotlight effect
      grad = ctx.createRadialGradient(size/2, 0, 0, size/2, 0, size/1.2);
      grad.addColorStop(0, top);
      grad.addColorStop(1, bottom);
    } else {
      // Standard linear fallback
      grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, top);
      grad.addColorStop(1, bottom);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    // Important: for non-linear, we want it to map across the whole view gracefully
    tex.mapping = THREE.EquirectangularReflectionMapping; 
    
    scene.background = tex;
    // Add subtle fog to match background edge for depth
    scene.fog = new THREE.FogExp2(bottom, 0.0015);

    return () => {
      tex.dispose();
      scene.background = null;
      scene.fog = null;
    };
  }, [scene, top, bottom, style]);

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

export default function App() {
  const file = useStore(s => s.file);
  const loading = useStore(s => s.loading);
  const frame = useStore(s => s.frame);
  const playing = useStore(s => s.playing);
  const playbackSpeed = useStore(s => s.playbackSpeed);
  const colorMode = useStore(s => s.colorMode);
  const colorProperty = useStore(s => s.colorProperty);
  const colormap = useStore(s => s.colormap);
  const ssao = useStore(s => s.ssao);
  const bloom = useStore(s => s.bloom);
  const dof = useStore(s => s.dof);
  const dofFocus = useStore(s => s.dofFocus);
  const toneMapping = useStore(s => s.toneMapping);
  const showCell = useStore(s => s.showCell);
  const showAxes = useStore(s => s.showAxes);
  const showBonds = useStore(s => s.showBonds);
  const bondCutoff = useStore(s => s.bondCutoff);
  const renderStyle = useStore(s => s.renderStyle);
  const atomScale = useStore(s => s.atomScale);
  const activePanel = useStore(s => s.activePanel);
  const backgroundPreset = useStore(s => s.backgroundPreset);
  const backgroundStyle = useStore(s => s.backgroundStyle);
  const ssaoIntensity = useStore(s => s.ssaoIntensity);
  const showScaleBar = useStore(s => s.showScaleBar);
  const cameraPreset = useStore(s => s.cameraPreset);
  const setCameraPreset = useStore(s => s.setCameraPreset);
  const bloomIntensity = useStore(s => s.bloomIntensity);
  const setFrame = useStore(s => s.setFrame);
  const nextFrame = useStore(s => s.nextFrame);
  const togglePlay = useStore(s => s.togglePlay);
  const setActivePanel = useStore(s => s.setActivePanel);
  const hoveredAtom = useStore(s => s.hoveredAtom);
  const setHoveredAtom = useStore(s => s.setHoveredAtom);
  const selectedAtoms = useStore(s => s.selectedAtoms);
  const setSelectedAtoms = useStore(s => s.setSelectedAtoms);
  const hiddenAtomTypes = useStore(s => s.hiddenAtomTypes);
  const atomTypeScales = useStore(s => s.atomTypeScales);

  // Spatial hash for atom picking
  const [spatialHash, setSpatialHash] = useState<SpatialHash3D | null>(null);

  const isMobile = useMediaQuery('(max-width: 768px)');

  // Mouse position for inspector tooltip
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Playback timer (replaced with smooth 60fps interpolator)
  const { currentState: interpState, setFrame: setSmoothFrame } = useSmoothFramePlayback(playing, {
    frames: file?.trajectory.frames ?? [],
    speed: playbackSpeed,
    targetFPS: 60,
    mdFrameRate: 30, // Default typical MD output
    onFrame: (state) => {
      // Sync UI timeline without forcing expensive React renders unnecessarily
      if (state.frameIndex !== useStore.getState().frame) {
        useStore.getState().setFrame(state.frameIndex);
      }
    }
  });

  // Sync external frame updates (like timeline scrubber manually dragging) back to the hook when NOT playing
  useEffect(() => {
    if (!playing && interpState.frameIndex !== frame) {
      setSmoothFrame(frame);
    }
  }, [frame, playing, setSmoothFrame, interpState.frameIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowRight') nextFrame();
      if (e.key === 'ArrowLeft') useStore.getState().prevFrame();
      if (e.key === 'Escape') setActivePanel(null);
      if (e.key === 's' && !e.metaKey && !e.ctrlKey) setActivePanel('style');
      if (e.key === 'e' && !e.metaKey && !e.ctrlKey) setActivePanel('effects');
      if (e.key === 'a' && !e.metaKey && !e.ctrlKey) setActivePanel('analysis');
      if (e.key === 'x' && !e.metaKey && !e.ctrlKey) setActivePanel('export');
      if (e.key === 'b' && !e.metaKey && !e.ctrlKey) useStore.getState().toggleBonds();
      if (e.key === 'm' && !e.metaKey && !e.ctrlKey) setActivePanel('measurement');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, nextFrame, setActivePanel]);

  // URL state restore + auto-load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('s');
    if (state) useStore.getState().decodeFromURL(state);

    const loadUrl = params.get('load');
    if (loadUrl && !file) {
      (async () => {
        try {
          useStore.getState().setLoading(true, 0);
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

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: `linear-gradient(180deg, ${bg.top}, ${bg.bottom})`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
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
            onClick={() => { if (file) useStore.getState().clearFile(); }}
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
              <div style={{ width: 1, height: 18, background: 'var(--border-subtle)' }} />
              <span style={{
                fontSize: 14, color: 'var(--text-muted)',
                maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {file.name}
              </span>
              <button
                onClick={() => useStore.getState().clearFile()}
                title="Close"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24,
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                }}
              >
                <IconClose />
              </button>
            </>
          )}
        </div>

        {/* Simple top-right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                padding: '8px 12px',
                fontSize: 13, fontWeight: 500,
                color: 'var(--text-primary)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              <IconShare />
              Share
            </button>
          )}
          {!file && (
            <button
              onClick={async () => {
                const { Gallery } = await import('./Gallery');
                // Trigger the first example load via a custom event handled by FileDropZone
                window.dispatchEvent(new CustomEvent('atlas:load-demo'));
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
      <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: 0 }}>
        {/* 3D viewport */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas
            camera={{
              position: [center[0], center[1], center[2] + cameraDistance],
              fov: 50,
              near: 0.1,
              far: cameraDistance * 10,
            }}
            gl={{ antialias: true, preserveDrawingBuffer: true }}
            style={{ background: 'transparent' }}
            onPointerMissed={() => useStore.getState().setSelectedAtoms([])}
          >
            <ExportManager />
            <SceneBackground top={bg.top} bottom={bg.bottom} style={backgroundStyle} />

            <ambientLight intensity={0.35} />
            <directionalLight position={[5, 8, 6]} intensity={1.2} />
            <directionalLight position={[-3, -2, 4]} intensity={0.35} />
            <directionalLight position={[0, -5, -3]} intensity={0.15} color="#8888ff" />

            <CameraManager fileId={file?.name} center={center} distance={cameraDistance} />
            <OrbitControls
              makeDefault
              target={center}
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.5}
              panSpeed={0.4}
              zoomSpeed={0.8}
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
              <>
                <AtomsOptimized
                  frame={file!.trajectory.frames[interpState.frameIndex]}
                  nextFrame={interpState.isInterpolating ? file!.trajectory.frames[interpState.nextFrameIndex] : undefined}
                  interpolationFactor={interpState.isInterpolating ? interpState.interpolationFactor : 0}
                  colorMode={colorMode}
                  colorProperty={colorProperty ?? undefined}
                  colormap={colormap}
                  scale={atomScale}
                  renderStyle={renderStyle}
                  onSpatialHash={setSpatialHash}
                  highlightedAtoms={new Set(selectedAtoms)}
                  hiddenAtomTypes={hiddenAtomTypes}
                  atomTypeScales={atomTypeScales}
                />
                {showBonds && (
                  <Bonds
                    frame={currentFrame}
                    nextFrame={interpState.isInterpolating ? file!.trajectory.frames[interpState.nextFrameIndex] : undefined}
                    interpolationFactor={interpState.isInterpolating ? interpState.interpolationFactor : 0}
                    maxBondLength={bondCutoff}
                    renderStyle={renderStyle}
                    colormap={colormap}
                    colorMode={colorMode}
                    radius={0.12}
                    opacity={0.85}
                  />
                )}
                {showCell && (
                  <SimulationCell bounds={currentFrame.boxBounds} color="#1e3050" opacity={0.3} />
                )}
              </>
            )}

            {currentFrame && spatialHash && (
              <AtomPicker
                frame={currentFrame}
                spatialHash={spatialHash}
                enabled={!loading}
                selectionMode={activePanel === 'measurement' ? 'measure' : 'single'}
                onHover={setHoveredAtom}
                onSelect={setSelectedAtoms}
              />
            )}

            {showAxes && (
              <GizmoHelper alignment="bottom-left" margin={[72, 72]}>
                <GizmoViewport axisColors={['#ff4060', '#40ff80', '#4080ff']} labelColor="white" />
              </GizmoHelper>
            )}

            <EffectComposer enableNormalPass={ssao} multisampling={4}>
              {ssao && (
                <SSAO
                  radius={0.3}
                  intensity={ssaoIntensity * 70}
                  luminanceInfluence={0.5}
                  worldDistanceThreshold={100}
                  worldDistanceFalloff={5}
                  worldProximityThreshold={0.5}
                  worldProximityFalloff={0.3}
                />
              ) as any}
              {bloom && (
                <Bloom
                  intensity={bloomIntensity}
                  luminanceThreshold={0.7}
                  luminanceSmoothing={0.3}
                  mipmapBlur
                />
              ) as any}
              {dof && (
                <DepthOfField
                  focusDistance={dofFocus / 100}
                  focalLength={0.02}
                  bokehScale={2}
                  height={480}
                />
              ) as any}
              {toneMapping !== 'none' && (
                <ToneMapping
                  mode={toneMapping === 'aces' ? ToneMappingMode.ACES_FILMIC : ToneMappingMode.REINHARD}
                />
              )}
              <Vignette
                offset={0.35}
                darkness={0.55}
                blendFunction={BlendFunction.NORMAL}
              />
            </EffectComposer>
          </Canvas>

          {/* File drop zone overlay */}
          <FileDropZone />

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
              <CameraPresetButton label="XY" active={cameraPreset === 'top'} onClick={() => setCameraPreset('top')} title="Top view (XY plane)" />
              <CameraPresetButton label="XZ" active={cameraPreset === 'side'} onClick={() => setCameraPreset('side')} title="Side view (XZ plane)" />
              <CameraPresetButton label="YZ" active={cameraPreset === 'front'} onClick={() => setCameraPreset('front')} title="Front view (YZ plane)" />
              <CameraPresetButton label="ISO" active={cameraPreset === 'iso'} onClick={() => setCameraPreset('iso')} title="Isometric view" />
            </div>
          )}

          {/* Floating toolbar */}
          {file && !activePanel && (
            <div style={{
              position: 'absolute',
              bottom: isMobile ? 'max(24px, env(safe-area-inset-bottom))' : 84, // Push above Timeline on desktop
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
                <ToolButton icon={<IconStyle />} label="Style" active={activePanel === 'style'} onClick={() => setActivePanel('style')} />
                <ToolButton icon={<IconAtoms />} label="Atoms" active={activePanel === 'atoms'} onClick={() => setActivePanel('atoms')} />
                <ToolButton icon={<IconEffects />} label="Effects" active={activePanel === 'effects'} onClick={() => setActivePanel('effects')} />
                <ToolButton icon={<IconAnalysis />} label="Analysis" active={activePanel === 'analysis'} onClick={() => setActivePanel('analysis')} />
                <ToolButton icon={<IconMeasure />} label="Measure" active={activePanel === 'measurement'} onClick={() => setActivePanel('measurement')} />
                <ToolButton icon={<IconCamera />} label="Export" active={activePanel === 'export'} onClick={() => setActivePanel('export')} />
                <div style={{ width: 1, minWidth: 1, background: 'rgba(255,255,255,0.15)', margin: '4px 0' }} />
                <ToolButton icon={<IconReset />} label="Reset" onClick={() => {
                  useStore.getState().reset();
                }} />
              </div>
            </div>
          )}

          {/* Atom Inspector Tooltip */}
          {currentFrame && hoveredAtom !== null && (
            <div style={{
              position: 'fixed',
              left: mousePos.x + 16,
              top: mousePos.y + 16,
              zIndex: 300,
              pointerEvents: 'none',
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: 'var(--fs-xs)',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              minWidth: 160,
            }}>
              <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>
                {(() => { const spec = getElementSpec(currentFrame.types[hoveredAtom]); return `${spec.symbol} — ${spec.name}`; })()}
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                Atom #{currentFrame.ids?.[hoveredAtom] ?? hoveredAtom + 1} · {(() => { const spec = getElementSpec(currentFrame.types[hoveredAtom]); return `${spec.mass.toFixed(2)} u · ${spec.role}`; })()}
              </div>
              <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>
                x: {currentFrame.positions[hoveredAtom * 3].toFixed(2)}<br />
                y: {currentFrame.positions[hoveredAtom * 3 + 1].toFixed(2)}<br />
                z: {currentFrame.positions[hoveredAtom * 3 + 2].toFixed(2)}
              </div>
              {Array.from(currentFrame.properties?.entries() ?? []).slice(0, 3).map(([name, vals]) => (
                <div key={name} style={{ color: 'var(--text-dim)', marginTop: 2 }}>
                  {name}: {vals[hoveredAtom].toFixed(3)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Side panel ─── */}
        {activePanel && file && (
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: isMobile ? '100%' : (activePanel === 'export' ? 360 : 320),
            borderLeft: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            overflowY: 'auto',
            zIndex: 100,
            animation: 'slideInRight 200ms ease-out forwards',
          }}>
            <ErrorBoundary>
              {activePanel === 'style' && (
                <StylePanel
                  availableProperties={availableProperties}
                  bgPresets={BG_PRESETS}
                />
              )}
              {activePanel === 'effects' && <EffectsPanel />}
              {activePanel === 'atoms' && <AtomsPanel />}
              {activePanel === 'analysis' && <AnalysisPanel />}
              {activePanel === 'measurement' && <MeasurementPanel />}
              {activePanel === 'export' && <FigureExportPanel />}
            </ErrorBoundary>
          </div>
        )}
      </div>

      {/* ─── Timeline ─── */}
      {file && !isMobile && (
        <div style={{
          height: 60, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '0 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
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
            <button
              onClick={togglePlay}
              title="Play/Pause [Space]"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 32,
                background: playing ? 'var(--accent-soft)' : 'var(--accent)',
                border: `1px solid var(--accent)`,
                borderRadius: 'var(--radius-sm)',
                color: playing ? 'var(--accent)' : 'white',
                cursor: 'pointer',
                transition: 'all 100ms ease-out',
              }}
            >
              {playing ? <IconPause /> : <IconPlay />}
            </button>
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
            fontSize: 'var(--fs-sm)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            minWidth: 90,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{frame + 1}</span>
            <span style={{ color: 'var(--text-dim)' }}> / {totalFrames}</span>
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
                  fontSize: 'var(--fs-xs)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: playbackSpeed === speed ? 500 : 400,
                  color: playbackSpeed === speed ? 'var(--accent)' : 'var(--text-muted)',
                  background: playbackSpeed === speed ? 'var(--accent-soft)' : 'transparent',
                  border: `1px solid ${playbackSpeed === speed ? 'var(--accent)' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-sm)',
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

function ToolButton({ icon, label, active, onClick }: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px',
        borderRadius: 12,
        border: 'none',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'white' : 'rgba(255,255,255,0.9)',
        cursor: 'pointer',
        transition: 'all 150ms ease-out',
        fontSize: 13,
        fontWeight: 500,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function CameraPresetButton({ label, active, onClick, title }: {
  label: string;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 40, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600,
        color: active ? 'white' : 'rgba(255,255,255,0.7)',
        background: active ? 'var(--accent)' : 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all 100ms ease-out',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
      }}
    >
      {label}
    </button>
  );
}

function TransportButton({ onClick, title, icon }: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32,
        color: 'var(--text-muted)',
        background: 'transparent',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'all 100ms ease-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--text-primary)';
        e.currentTarget.style.borderColor = 'var(--text-muted)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--text-muted)';
        e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      {icon}
    </button>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  fontSize: 'var(--fs-2xs)',
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-muted)',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  marginRight: 4,
};
