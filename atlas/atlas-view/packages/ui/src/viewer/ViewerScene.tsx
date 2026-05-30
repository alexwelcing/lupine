import type { Dispatch, SetStateAction } from 'react';
import { OrbitControls, GizmoHelper, GizmoViewport, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { XR } from '@react-three/xr';
import { useStore } from '../store';
import type { LoadedFile } from '../store';
import { xrStore } from './xrStore';
import { USDZExportHelper } from '../export/USDZExportPipeline';
import { ExportManager } from '../ExportManager';
import { SceneBackground } from './SceneBackground';
import { XREnvironmentDome } from '../xr/XREnvironmentDome';
import { XRLightEstimation } from '../xr/XRLightEstimation';
import { SceneLighting } from '../SceneLighting';
import { CameraManager } from './CameraManager';
import { PresetLegacyBridge } from './PresetLegacyBridge';
import { SpatialAnchor } from '../SpatialAnchor';
import { AnomalyTracker } from '@atlas/scene/AnomalyTracker';
import { GhostAtoms } from '../GhostAtoms';
import { AtomsOptimized } from '@atlas/scene/AtomsOptimized';
import { AtomClusters } from '@atlas/scene/AtomClusters';
import { Bonds } from '@atlas/scene/Bonds';
import { SimulationCell } from '@atlas/scene/SimulationCell';
import { AnnotationsLayer } from '../AnnotationsLayer';
import { SelectionMarkers } from '../SelectionMarkers';
import { AtomInfoHUD } from '../AtomInfoHUD';
import { CameraFocus } from '../CameraFocus';
import { AtomTrails } from '../AtomTrails';
import { AtomPicker } from '@atlas/scene/AtomPicker';
import { TYPE_RADII } from '@atlas/scene';
import { ScenePostprocessing } from '../postprocess/ScenePostprocessing';
import type { Frame } from '@atlas/core/types';
import type { InterpolatedFrameState } from '../hooks/useSmoothFramePlayback';
import type { Clusters } from '@atlas/scene/ClusterBuilder';
import type { SpatialHash3D } from '@atlas/scene/SpatialHash';
import type { BgMedia, BgPreset } from '../backgroundPresets';

export function ViewerScene({
  file,
  currentFrame,
  interpState,
  ghostFrame,
  center,
  cameraDistance,
  deviceMaxAtoms,
  clusters,
  clusterFadeNear,
  clusterFadeFar,
  spatialHash,
  setSpatialHash,
  effectiveBondCutoff,
  trackedAtomIndices,
  etchTexture,
  etchAtomId,
  bgTop,
  bgBottom,
  bgMedia,
  bgProcedural,
  isExportingQuickLook,
  onExportQuickLookComplete,
}: {
  file: LoadedFile | null;
  currentFrame: Frame | undefined;
  interpState: InterpolatedFrameState;
  ghostFrame: Frame | null;
  center: [number, number, number];
  cameraDistance: number;
  deviceMaxAtoms: number;
  clusters: Clusters | null;
  clusterFadeNear: number;
  clusterFadeFar: number;
  spatialHash: SpatialHash3D | null;
  setSpatialHash: Dispatch<SetStateAction<SpatialHash3D | null>>;
  effectiveBondCutoff: number;
  trackedAtomIndices: number[];
  etchTexture: THREE.CanvasTexture | null;
  etchAtomId: number | null;
  bgTop: string;
  bgBottom: string;
  bgMedia: BgMedia;
  bgProcedural?: BgPreset['procedural'];
  isExportingQuickLook: boolean;
  onExportQuickLookComplete: () => void;
}) {
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
  const atomColorSource = useStore(s => s.atomColorSource);
  const postprocessPreset = useStore(s => s.postprocessPreset);
  const propertyEmissionStrength = useStore(s => s.propertyEmissionStrength);
  const annotations = useStore(s => s.annotations);
  const labelStyle = useStore(s => s.labelStyle);
  const hoveredAtom = useStore(s => s.hoveredAtom);
  const selectedAtoms = useStore(s => s.selectedAtoms);
  const showCell = useStore(s => s.showCell);
  const showAxes = useStore(s => s.showAxes);
  const flythroughPreview = useStore(s => s.flythroughPreview);
  const showBonds = useStore(s => s.showBonds);
  const bondTolerance = useStore(s => s.bondTolerance);
  const useGpuBonds = useStore(s => s.useGpuBonds);
  const bondColorMode = useStore(s => s.bondColorMode);
  const renderStyle = useStore(s => s.renderStyle);
  const atomScale = useStore(s => s.atomScale);
  const backgroundStyle = useStore(s => s.backgroundStyle);
  const hiddenAtomTypes = useStore(s => s.hiddenAtomTypes);
  const atomTypeScales = useStore(s => s.atomTypeScales);
  const anomalyTracking = useStore(s => s.anomalyTracking);
  const atomTexture = useStore(s => s.atomTexture);
  const loadedAtomCount = useStore(s => s.loadedAtomCount);

  return (
            <XR store={xrStore}>
              <USDZExportHelper trigger={isExportingQuickLook} onComplete={onExportQuickLookComplete} />
            <ExportManager />
            <SceneBackground
              top={bgTop}
              bottom={bgBottom}
              style={backgroundStyle}
              media={bgMedia}
              procedural={bgProcedural}
              center={center}
              distance={cameraDistance}
            />
            <XREnvironmentDome media={bgMedia} top={bgTop} bottom={bgBottom} style={backgroundStyle} disabled={!!bgProcedural} />
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
                      resolution={512}
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
            </XR>
  );
}
