/**
 * Lupi - premium molecular viewer shell.
 *
 * Professional molecular dynamics visualization with
 * glassmorphic UI, side panels, and publication-quality rendering.
 */

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Perf } from 'r3f-perf';
import { DevProbe } from './DevProbe';
import { McpViewerBridge, McpViewerHarness } from './mcpViewerBridge';
import { StateInspector } from './StateInspector';
import * as THREE from 'three';

import { TelemetryHUD } from './TelemetryHUD';

import { useStore } from './store';
import { getMaxSafeAtomCount, getDefaultQualityTier } from './deviceCapabilities';
import { LandingPage } from './LandingPage';
import { buildClusters, type Clusters } from '@atlas/scene/ClusterBuilder';
import { useSmoothFramePlayback } from './hooks/useSmoothFramePlayback';
import { ScaleBar } from '@atlas/scene/ScaleBar';
import { FigureExportPanel } from './panels/FigureExportPanel';
import { FlythroughPanel } from './panels/FlythroughPanel';
import { TelemetryPanel } from './panels/TelemetryPanel';
import { PotentialBrowser } from './panels/PotentialBrowser';
import { EquilibriumSolveWorkbench } from './EquilibriumSolveWorkbench';
import { MlipLongRunWorkbench } from './MlipLongRunWorkbench';
import { MlipFlywheelPage } from './MlipFlywheelPage';
import type { SpatialHash3D } from '@atlas/scene/SpatialHash';
import { getElementSpec } from '@atlas/core';
import { BatchAssetGenerator } from './BatchAssetGenerator';
import { ToolButton, CameraPresetButton } from './controls';
import { StudioControlDeck, type StudioDeckMode } from './StudioControlDeck';
import {
  IconLook, IconSurface, IconWorld, IconExport,
} from './viewer/icons';
import { resolveBackground } from './viewer/SceneBackground';
import { ErrorBoundary } from './viewer/ErrorBoundary';
import { currentHashRoute } from './viewer/routeUtils';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useUrlAutoLoad } from './hooks/useUrlAutoLoad';
import { ViewerHeader } from './viewer/ViewerHeader';
import { ViewerScene } from './viewer/ViewerScene';
import { Timeline } from './viewer/Timeline';

import { Testbed } from './Testbed';

export default function App() {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('testbed')) {
    return <Testbed />;
  }

  const [hashRoute, setHashRoute] = useState(currentHashRoute);
  const [isExportingQuickLook, setIsExportingQuickLook] = useState(false);
  const [studioDeck, setStudioDeck] = useState<StudioDeckMode | null>(null);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const hashPath = hashRoute.split('?')[0] || '/';
  const isMlipFlywheelRoute = hashPath === '/system/mlip-flywheel';
  const isMcpViewerRoute = hashPath === '/mcp' || new URLSearchParams(window.location.search).has('mcp');

  useEffect(() => {
    const syncRoute = () => setHashRoute(currentHashRoute());
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  const file = useStore(s => s.file);
  const ghostFile = useStore(s => s.ghostFile);
  const frame = useStore(s => s.frame);
  const playing = useStore(s => s.playing);
  const flythroughPreview = useStore(s => s.flythroughPreview);
  const playbackSpeed = useStore(s => s.playbackSpeed);
  const colormap = useStore(s => s.colormap);
  const annotations = useStore(s => s.annotations);
  const labelStyle = useStore(s => s.labelStyle);

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
  const bondTolerance = useStore(s => s.bondTolerance);
  const activePanel = useStore(s => s.activePanel);
  const backgroundPreset = useStore(s => s.backgroundPreset);
  const showScaleBar = useStore(s => s.showScaleBar);
  const cameraPreset = useStore(s => s.cameraPreset);
  const setCameraPreset = useStore(s => s.setCameraPreset);
  const setFrame = useStore(s => s.setFrame);
  const nextFrame = useStore(s => s.nextFrame);
  const togglePlay = useStore(s => s.togglePlay);
  const setActivePanel = useStore(s => s.setActivePanel);
  const showPotentialBrowser = useStore(s => s.showPotentialBrowser);
  const setShowPotentialBrowser = useStore(s => s.setShowPotentialBrowser);
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

  const handleShareView = useCallback(() => {
    if (!file?.sourceUrl) return;
    const s = useStore.getState().encodeToURL();
    const link = `${window.location.origin}${window.location.pathname}?load=${encodeURIComponent(file.sourceUrl)}&s=${encodeURIComponent(s)}`;
    navigator.clipboard.writeText(link);
    alert('View copied to clipboard! Anyone with this link can view the exact state and orientation.');
  }, [file?.sourceUrl]);

  // One overlay at a time. The deck, the side panels, the potential browser, and
  // the camera-view menu are mutually exclusive — every opener closes the others
  // through resetOverlays(), so that rule lives in ONE place instead of being
  // re-derived (and occasionally forgotten — see the old view-menu toggle) in
  // each handler and each keyboard shortcut.
  const resetOverlays = useCallback(() => {
    setStudioDeck(null);
    setActivePanel(null);
    setShowPotentialBrowser(false);
    setViewMenuOpen(false);
  }, [setActivePanel, setShowPotentialBrowser]);

  const openStudioDeck = useCallback((mode: StudioDeckMode) => {
    if (studioDeck === mode) { setStudioDeck(null); return; } // click the active deck -> close
    resetOverlays();
    setStudioDeck(mode);
  }, [studioDeck, resetOverlays]);

  const openToolPanel = useCallback((panel: 'export' | 'flythrough' | 'equilibrium' | 'mlipLongRun' | 'telemetry') => {
    resetOverlays();
    setActivePanel(panel as any);
  }, [resetOverlays, setActivePanel]);

  const toggleViewMenu = useCallback(() => {
    if (viewMenuOpen) { setViewMenuOpen(false); return; }
    resetOverlays();
    setViewMenuOpen(true);
  }, [viewMenuOpen, resetOverlays]);

  useEffect(() => {
    if (activePanel || showPotentialBrowser || !file) {
      setStudioDeck(null);
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
  const playbackFrameRate = file?.playbackFrameRate ?? 30;
  const highFidelityPlayback = Boolean(file?.playbackFrameRate && (file?.trajectory.frames[0]?.natoms ?? 0) <= 5000);

  // Playback timer (replaced with smooth 60fps interpolator)
  // Throttle the store frame-sync during playback to ~20fps. Motion stays at
  // display rate (uProgress is GPU-driven from the live ref); only the timeline
  // text + store-frame consumers (bonds, annotations) sync at 20fps, capping
  // React-tree re-renders on dense trajectories with no perceptible lag.
  const lastFrameSyncRef = useRef(0);
  const { currentState: interpState, setFrame: setSmoothFrame, liveStateRef } = useSmoothFramePlayback(playing, {
    frames: file?.trajectory.frames ?? [],
    speed: playbackSpeed,
    targetFPS: highFidelityPlayback ? 120 : 60,
    mdFrameRate: playbackFrameRate,
    stateSyncFPS: highFidelityPlayback ? 120 : 15,
    onFrame: (state) => {
      // Paused → the store/scrubber drives the hook, not the reverse.
      if (!useStore.getState().playing || state.frameIndex === useStore.getState().frame) return;
      const now = performance.now();
      if (now - lastFrameSyncRef.current < 50) return; // ~20fps
      lastFrameSyncRef.current = now;
      useStore.getState().setFrame(state.frameIndex);
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

  useKeyboardShortcuts({ togglePlay, nextFrame, resetOverlays, openStudioDeck, openToolPanel });

  useUrlAutoLoad(file);

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

  const bg = resolveBackground(backgroundPreset, colormap);
  const bgMedia = bg.media;
  const isBatchExport = new URLSearchParams(window.location.search).get('batchExport') === 'true';
  const panelWidth = activePanel === 'mlipLongRun'
    ? 390
    : (activePanel === 'export' || activePanel === 'flythrough' || activePanel === 'telemetry' || activePanel === 'equilibrium' ? 380 : 320);
  const mobilePanelHeight = 'clamp(232px, 32dvh, 300px)';
  const mobileStudioDeckHeight = 'clamp(220px, 31dvh, 288px)';
  const desktopStudioDeckHeight = 'min(38vh, 330px)';
  const sceneRightInset = file && activePanel && !isMobile ? panelWidth : 0;
  const sceneBottomInset = file && activePanel && isMobile ? mobilePanelHeight : 0;
  const toolbarBottom = totalFrames > 1 ? 84 : 32;
  const studioDeckBottom = toolbarBottom + 64;
  const studioDeckCanvasReserve = file && !activePanel && studioDeck
    ? `calc(${isMobile ? mobileStudioDeckHeight : desktopStudioDeckHeight} + ${studioDeckBottom + 16}px)`
    : '0px';

  return (
    <div style={{
      width: '100%', minHeight: '100vh',
      height: file ? '100dvh' : 'auto',
      overflow: file ? 'hidden' : 'visible',
      background: `linear-gradient(180deg, ${bg.top}, ${bg.bottom})`,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ─── Desktop Header ─── */}
      <ViewerHeader
        isMobile={isMobile}
        isMlipFlywheelRoute={isMlipFlywheelRoute}
        isMcpViewerRoute={isMcpViewerRoute}
        onShareView={handleShareView}
      />

      {/* ─── Main content ─── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative' }}>
        <McpViewerBridge />
        {isMcpViewerRoute && <McpViewerHarness />}
        {/* 3D viewport */}
        <div style={{ 
          position: file ? 'absolute' : 'fixed', 
          top: file ? 0 : 56, // below header when fixed
          right: sceneRightInset,
          bottom: sceneBottomInset,
          left: 0,
          zIndex: 0,
          transition: 'right 180ms ease, bottom 180ms ease',
        }}>
          <Canvas
            // Render on demand: a static structure costs 0 frames. We force
            // "always" only while something is genuinely animating — playback,
            // a flythrough, or an export capture. OrbitControls (drei) invalidates
            // on camera change, so interaction stays smooth in demand mode.
            frameloop={(playing || flythroughPreview || isExportingQuickLook || isBatchExport || activePanel === 'export') ? 'always' : 'demand'}
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
            style={{
              background: 'transparent',
              display: 'block',
              width: '100%',
              height: studioDeckCanvasReserve === '0px' ? '100%' : `calc(100% - ${studioDeckCanvasReserve})`,
              minHeight: studioDeckCanvasReserve === '0px' ? undefined : 180,
              transition: 'height 180ms ease',
            }}
          >
            {import.meta.env.DEV && showDebugHud && <Perf position="top-left" logsPerSecond={4} matrixUpdate />}
            {(import.meta.env.DEV || showDebugHud) && <DevProbe enabled={showDebugHud} />}
            <ViewerScene
              file={file}
              currentFrame={currentFrame}
              interpState={interpState}
              ghostFrame={ghostFrame}
              center={center}
              cameraDistance={cameraDistance}
              deviceMaxAtoms={deviceMaxAtoms}
              clusters={clusters}
              clusterFadeNear={clusterFadeNear}
              clusterFadeFar={clusterFadeFar}
              spatialHash={spatialHash}
              setSpatialHash={setSpatialHash}
              effectiveBondCutoff={effectiveBondCutoff}
              trackedAtomIndices={trackedAtomIndices}
              etchTexture={etchTexture}
              etchAtomId={etchAtomId}
              bgTop={bg.top}
              bgBottom={bg.bottom}
              bgMedia={bgMedia}
              bgProcedural={bg.procedural}
              isExportingQuickLook={isExportingQuickLook}
              onExportQuickLookComplete={() => setIsExportingQuickLook(false)}
              liveStateRef={liveStateRef}
            />
          </Canvas>

          {import.meta.env.DEV && showDebugHud && <StateInspector />}

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

          {/* Simple stats overlay */}
          {file && totalFrames > 1 && (
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

          {showDebugHud && <TelemetryHUD />}

          {/* Camera view selector */}
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
              <button
                onClick={toggleViewMenu}
                title="Camera view"
                aria-label="Camera view"
                aria-expanded={viewMenuOpen}
                style={{
                  width: 52,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0,
                  color: '#1edce0',
                  background: 'rgba(0,0,0,0.52)',
                  border: '1px solid rgba(30, 220, 224, 0.45)',
                  borderRadius: 0,
                  cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {cameraPresetLabel}
              </button>
              {viewMenuOpen && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: 6,
                  background: 'rgba(0,0,0,0.62)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(12px)',
                }}>
                  <CameraPresetButton label="XY" active={cameraPreset === 'top'} onClick={() => { setCameraPreset('top'); setViewMenuOpen(false); }} title="Top view (XY plane)" />
                  <CameraPresetButton label="XZ" active={cameraPreset === 'side'} onClick={() => { setCameraPreset('side'); setViewMenuOpen(false); }} title="Side view (XZ plane)" />
                  <CameraPresetButton label="YZ" active={cameraPreset === 'front'} onClick={() => { setCameraPreset('front'); setViewMenuOpen(false); }} title="Front view (YZ plane)" />
                  <CameraPresetButton label="ISO" active={cameraPreset === 'iso'} onClick={() => { setCameraPreset('iso'); setViewMenuOpen(false); }} title="Isometric view" />
                </div>
              )}
            </div>
          )}

          {file && !activePanel && studioDeck && (
            <StudioControlDeck
              mode={studioDeck}
              onClose={() => setStudioDeck(null)}
              bottomOffset={studioDeckBottom}
            />
          )}

          {/* Floating toolbar */}
          {file && !activePanel && (
            <div style={{
              position: 'absolute',
              bottom: toolbarBottom,
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
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 8,
                padding: 8,
                background: 'rgba(8,10,14,0.62)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                backdropFilter: 'blur(16px)',
                boxShadow: '0 12px 44px -18px rgba(0,0,0,0.75)',
                width: 'min(700px, calc(100vw - 32px))',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}>
                <ToolButton icon={<IconLook />} label="Look" active={studioDeck === 'look'} onClick={() => openStudioDeck('look')} />
                <ToolButton icon={<IconSurface />} label={isMobile ? 'Surf' : 'Surface'} active={studioDeck === 'surface'} onClick={() => openStudioDeck('surface')} />
                <ToolButton icon={<IconWorld />} label="World" active={studioDeck === 'world'} onClick={() => openStudioDeck('world')} />
                <ToolButton icon={<IconExport />} label={isMobile ? 'Save' : 'Export'} active={activePanel === 'export' || activePanel === 'flythrough'} onClick={() => openToolPanel('export')} />
              </div>
            </div>
          )}

        </div>

        {/* ─── Side panel ─── */}
        {/* NIST IPR potential browser — full-screen overlay, manages its own
            close via setShowPotentialBrowser(false). */}
        {showPotentialBrowser && <PotentialBrowser />}

        {activePanel && file && (
          <div style={{
            position: 'absolute',
            top: isMobile ? 'auto' : 0,
            right: 0,
            bottom: 0,
            left: isMobile ? 0 : 'auto',
            width: isMobile ? '100%' : panelWidth,
            height: isMobile ? mobilePanelHeight : 'auto',
            maxHeight: isMobile ? mobilePanelHeight : 'none',
            boxSizing: 'border-box',
            borderLeft: isMobile ? 'none' : '1px solid var(--border-subtle)',
            borderTop: isMobile ? '1px solid var(--border-subtle)' : 'none',
            borderTopLeftRadius: isMobile ? 8 : 0,
            borderTopRightRadius: isMobile ? 8 : 0,
            background: isMobile ? 'var(--bg-glass)' : 'var(--bg-surface)',
            backdropFilter: isMobile ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: isMobile ? 'blur(16px)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflowY: activePanel === 'export' ? 'hidden' : 'auto',
            paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : 0,
            boxShadow: isMobile ? '0 -18px 48px rgba(0,0,0,0.45)' : 'none',
            zIndex: 100,
            animation: isMobile ? 'slideInUp 200ms ease-out forwards' : 'slideInRight 200ms ease-out forwards',
          }}>
            <ErrorBoundary>
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

        {/* Landing page (hero, featured, drop zone, gallery) */}
        {!file && (
          <div style={{ position: 'relative', width: '100%', zIndex: 10 }}>
            {isMlipFlywheelRoute ? <MlipFlywheelPage /> : isMcpViewerRoute ? null : <LandingPage />}
          </div>
        )}
      </div>

      {/* ─── Batch Asset Generator overlay ─── */}
      {isBatchExport && <BatchAssetGenerator />}

      {/* ─── Timeline ─── */}
      {file && totalFrames > 1 && (
        <Timeline
          file={file}
          frame={frame}
          totalFrames={totalFrames}
          playing={playing}
          playbackSpeed={playbackSpeed}
          togglePlay={togglePlay}
          nextFrame={nextFrame}
          setFrame={setFrame}
        />
      )}
    </div>
  );
}
