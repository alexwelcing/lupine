/**
 * ExportManager — Unified pipeline for image, MP4/WebM, GLB, and USDZ export.
 *
 * Architecture:
 *   Image:  Single-frame WebGL readback at arbitrary resolution.
 *   Video:  MP4/WebM via the browser-native MediaRecorder recording
 *           `gl.domElement.captureStream(fps)`. MediaRecorder encodes natively,
 *           off the main thread (no UI freeze), on every browser — mp4 on
 *           Safari/iOS, webm (vp9/vp8) on Chromium/Firefox. The capture loop only
 *           drives the camera/scene by wall-clock time; the canvas is recorded
 *           automatically.
 *   GLB:    Reconstructs real sphere/cylinder meshes from atomic data and exports
 *           via GLTFExporter for use in Blender, Unity, or any 3D software.
 *   USDZ:   Same mesh reconstruction → USDZExporter for AR Quick Look.
 *
 * All video modes support 360° orbit around the structure centroid.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useStore } from './store';
import { getElementSpec } from '@atlas/core';
import * as THREE from 'three';
import { sampleFlythrough, getSequenceDuration } from './flythrough';
import { expandInstancedMeshes, restoreInstancedMeshes } from './export/USDZExportPipeline';

const TARGET_USDZ_EXTENT_METERS = 0.4;
const SINGLE_TYPE_NORM_VALUE = 0.5;
const MIN_NUMERIC_RANGE = 1e-6;
const MIN_USDZ_SCALE = 0.0001;
const MAX_USDZ_SCALE = 2.0;

// ─── Video Capture Loop Component ──────────────────────────────────
// By isolating the priority=2 useFrame into a conditionally mounted component,
// we prevent React Three Fiber from permanently disabling its native Priority 0
// gl.render loop (which happens if any hooked component has priority > 0).
//
// MediaRecorder records the canvas in REAL TIME (off the main thread), so this
// loop drives the camera/scene purely by WALL-CLOCK progress — never by frame
// count. It posts no frames anywhere; the canvas is captured automatically.
function VideoCaptureLoop({
  requestRef,
  totalFrames,
  originalCameraPosition,
  file,
  isRecording,
  setIsCapturing,
  recorderRef,
  recorderStoppedRef,
  captureStartRef,
}: any) {
  const { invalidate } = useThree();
  const { camera } = useThree();

  useFrame(() => {
    if (!isRecording.current) return;

    // Keep the demand frameloop alive: the export must drive continuous rendering
    // even though the app normally renders on demand. Without this, useFrame can
    // stall after the first frame once the frameloop idles.
    invalidate();

    const req = requestRef.current;
    if (!req) return;

    // On the first tick, anchor the wall-clock start. MediaRecorder started a hair
    // earlier; tying progress to the first rendered frame keeps the motion smooth.
    if (captureStartRef.current === null) {
      captureStartRef.current = performance.now();
    }

    const elapsed = performance.now() - captureStartRef.current;
    const durationMs = (req.durationSeconds || 5) * 1000;
    const progress = Math.min(elapsed / durationMs, 1);

    // Drive the camera/scene by wall-clock `progress` (0..1).
    // Flythrough path takes priority over orbit
    if (req.flythrough && req.flythrough.keyframes.length >= 2) {
      const flyDuration = getSequenceDuration(req.flythrough);
      const flyTime = progress * flyDuration;

      // Update store for UI progress bar
      useStore.getState().setFlythroughTime(flyTime);

      const sample = sampleFlythrough(req.flythrough, flyTime);
      if (sample) {
        camera.position.set(...sample.position);
        camera.lookAt(...sample.target);
        if (camera instanceof THREE.PerspectiveCamera && sample.fov) {
          camera.fov = sample.fov;
          camera.updateProjectionMatrix();
        }
      }
    } else if (req.orbit && originalCameraPosition.current && file) {
      const { min, max } = file.trajectory.globalBounds;
      const center = new THREE.Vector3(
        (min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2
      );
      const radius = originalCameraPosition.current.distanceTo(center);

      const angle = progress * Math.PI * 2;
      camera.position.x = center.x + Math.sin(angle) * radius;
      camera.position.z = center.z + Math.cos(angle) * radius;
      camera.position.y = originalCameraPosition.current.y;
      camera.lookAt(center);
    }

    if (req.cinematic && file) {
      // Advance trajectory if there is one
      if (file.trajectory.totalFrames > 1) {
        // Run from start to the absolute end frame
        const targetFrame = Math.floor(progress * file.trajectory.totalFrames);
        const safeFrame = Math.min(targetFrame, file.trajectory.totalFrames - 1);
        if (useStore.getState().frame !== safeFrame) {
          useStore.getState().setFrame(safeFrame);
        }
      }

      // Cinematic bond pulse (breathes in to reveal bonds, breathes out).
      // Drives `bondTolerance` now that the tolerance is the user-facing
      // bonding knob — pulse 0 → ~1.0 Å takes per-pair cutoffs from
      // r_cov(A)+r_cov(B) up to a generous reveal, then back down.
      const pulse = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
      useStore.getState().setBondTolerance(Math.max(0, pulse * 1.0));

      // Subtle atom scaling
      useStore.getState().setAtomScale(0.85 + pulse * 0.15);
    }

    // Stop the recorder exactly once when wall-clock duration is reached. The
    // recorder's onstop handler builds the blob, delivers it, and restores the
    // scene. Unmount the loop immediately to hand rendering back to Fiber.
    if (progress >= 1) {
      isRecording.current = false;
      setIsCapturing(false);
      if (
        !recorderStoppedRef.current &&
        recorderRef.current &&
        recorderRef.current.state !== 'inactive'
      ) {
        recorderStoppedRef.current = true;
        recorderRef.current.stop();
      }
    }
  }, 2); // Priority 2 execution!

  return null;
}

// ─── ExportManager component ─────────────────────────────────────
export function ExportManager() {
  const { gl, scene, camera, size, setSize, setDpr, setFrameloop, invalidate } = useThree();
  const exportRequest = useStore(s => s.exportRequest);
  const clearExportRequest = useStore(s => s.clearExportRequest);
  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);

  // Recording state
  const isRecording = useRef(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const onCompleteRef = useRef<((success: boolean, blob?: Blob, filename?: string) => void) | null>(null);

  // MediaRecorder pipeline state. MediaRecorder records `captureStream()` of the
  // WebGL canvas natively, off the main thread — no UI freeze, works on every
  // browser (mp4 on Safari/iOS, webm on Chromium/Firefox).
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]); // recorder chunks accumulated via ondataavailable
  const captureStartRef = useRef<number | null>(null); // wall-clock anchor, set on first VideoCaptureLoop tick
  const recorderStoppedRef = useRef(false); // ensures recorder.stop() is called exactly once
  const requestRef = useRef<any>(null);
  const totalFrames = useRef(0);
  const frameCount = useRef(0);
  const originalPixelRatio = useRef<number>(1);
  const originalCameraPosition = useRef<THREE.Vector3 | null>(null);
  const originalSize = useRef<{ width: number; height: number; aspect: number } | null>(null);
  const originalStoreState = useRef<{ bondTolerance: number; atomScale: number; frame: number } | null>(null);

  // Shared scene/camera/size/store restore after a video export. Reused for both
  // the success and failure paths of the MediaRecorder capture.
  const restoreAfterVideo = useCallback(() => {
    if (originalCameraPosition.current && file) {
      const { min, max } = file.trajectory.globalBounds;
      const center = new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
      camera.position.copy(originalCameraPosition.current);
      camera.lookAt(center);
      originalCameraPosition.current = null;
    }
    if (originalSize.current) {
      setSize(originalSize.current.width, originalSize.current.height);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = originalSize.current.aspect;
        camera.updateProjectionMatrix();
      }
      originalSize.current = null;
    }
    if (originalPixelRatio.current) setDpr(originalPixelRatio.current);
    if (originalStoreState.current) {
      useStore.getState().setBondTolerance(originalStoreState.current.bondTolerance);
      useStore.getState().setAtomScale(originalStoreState.current.atomScale);
      useStore.getState().setFrame(originalStoreState.current.frame);
      originalStoreState.current = null;
    }
    // Hand rendering back to the perf-friendly demand loop now that export is done.
    setFrameloop('demand');
    clearExportRequest();
  }, [camera, file, setSize, setDpr, setFrameloop, clearExportRequest]);

  // Stable ref so the VideoCaptureLoop always calls the freshest restore closure.
  const restoreAfterVideoRef = useRef(restoreAfterVideo);
  restoreAfterVideoRef.current = restoreAfterVideo;

  // ─── Image Export ─────────────────────────────────────────────
  const handleImageExport = useCallback(() => {
    const req = exportRequest;
    if (!req) return;

    const oldWidth = size.width;
    const oldHeight = size.height;
    const targetWidth = req.resolution?.width || oldWidth;
    const targetHeight = req.resolution?.height || oldHeight;
    const format = req.format || 'png';

    const originalAspect = (camera as THREE.PerspectiveCamera).aspect;
    const originalPixelRatio = gl.getPixelRatio();
    const originalClearColor = new THREE.Color();
    gl.getClearColor(originalClearColor);
    const originalClearAlpha = gl.getClearAlpha();

    gl.setPixelRatio(1);
    gl.setSize(targetWidth, targetHeight, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = targetWidth / targetHeight;
      camera.updateProjectionMatrix();
    }

    if (!req.transparent) {
      gl.setClearColor(new THREE.Color('#10131a'), 1);
    } else {
      gl.setClearColor(0x000000, 0);
    }

    const originalRenderTarget = gl.getRenderTarget();
    gl.setRenderTarget(null);
    gl.render(scene, camera);

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = targetWidth;
    captureCanvas.height = targetHeight;
    const captureContext = captureCanvas.getContext('2d')!;
    captureContext.drawImage(gl.domElement, 0, 0, targetWidth, targetHeight);

    const mime = `image/${format}`;
    const quality = format === 'png' ? undefined : 1.0;
    const ext = format === 'jpeg' ? 'jpg' : format;
    const filename = `${req.baseName || 'LUPI-export'}-frame${frame + 1}.${ext}`;

    // Use toBlob for reliable downloads with correct file extensions.
    // toDataURL + link.click() fails in modern Chrome when the <a> isn't in the DOM,
    // causing missing/wrong file extensions.
    // Note: toBlob captures pixels synchronously per spec — the callback is just for
    // delivering the encoded blob. Safe to restore renderer state immediately after.
    captureCanvas.toBlob(
      (blob) => {
        if (blob) {
          if (req.onComplete) {
            req.onComplete(true, blob, filename);
          } else {
            downloadBlob(blob, filename);
          }
        } else {
          console.error('[ExportManager] toBlob returned null — canvas may be tainted or context lost');
          if (req.onComplete) req.onComplete(false);
        }
        clearExportRequest();
      },
      mime,
      quality,
    );

    // Restore renderer state immediately — pixels already captured above
    gl.setRenderTarget(originalRenderTarget);
    gl.setPixelRatio(originalPixelRatio);
    gl.setSize(oldWidth, oldHeight, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = originalAspect;
      camera.updateProjectionMatrix();
    }
    gl.setClearColor(originalClearColor, originalClearAlpha);
  }, [exportRequest, gl, scene, camera, size, clearExportRequest, frame]);

  // ─── 3D Model Export (GLB / USDZ) ─────────────────────
  const handle3DExport = useCallback(async () => {
    const req = exportRequest;
    if (!req) return;

    try {
      const { TYPE_COLORS, TYPE_RADII, DEFAULT_TYPE_COLOR, BOTANICAL_COLORS, COLORMAPS } = await import('@atlas/scene');

      const state = useStore.getState();
      const currentFile = state.file;
      if (!currentFile) {
        console.error('[3D Export] No file loaded');
        if (req.onComplete) req.onComplete(false);
        clearExportRequest();
        return;
      }

      const currentFrame = currentFile.trajectory.frames[state.frame];
      if (!currentFrame) {
        console.error('[3D Export] No valid frame');
        if (req.onComplete) req.onComplete(false);
        clearExportRequest();
        return;
      }

      const exportScene = new THREE.Scene();
      exportScene.name = currentFile.name || 'LUPI-export';
      const isUsdZ = req.type === 'usdz';

      const mapFn = COLORMAPS[state.colormap] ?? COLORMAPS.viridis;
      const typeSet = new Set<number>();
      for (let i = 0; i < currentFrame.natoms; i++) {
        typeSet.add(currentFrame.types[i]);
      }
      const sortedTypes = Array.from(typeSet).sort((a, b) => a - b);
      const typeToNorm = new Map<number, number>();
      for (let i = 0; i < sortedTypes.length; i++) {
        typeToNorm.set(
          sortedTypes[i],
          sortedTypes.length > 1 ? i / (sortedTypes.length - 1) : SINGLE_TYPE_NORM_VALUE,
        );
      }

      const resolveTypeColor = (typeId: number): [number, number, number] => {
        if (state.renderStyle === 'botanical' || state.atomColorSource === 'botanical') {
          return BOTANICAL_COLORS[typeId] ?? [0.3, 0.5, 0.2];
        }
        if (state.atomColorSource === 'element') {
          const override = state.elementColorOverrides[typeId];
          if (override) return new THREE.Color(override).toArray() as [number, number, number];
          return TYPE_COLORS[typeId] ?? DEFAULT_TYPE_COLOR;
        }
        const t = typeToNorm.get(typeId) ?? SINGLE_TYPE_NORM_VALUE;
        return mapFn(t);
      };

      const propertyData = state.colorMode === 'property' && state.colorProperty
        ? currentFrame.properties?.get(state.colorProperty)
        : null;
      let propertyMin = state.propRange[0];
      let propertyMax = state.propRange[1];
      if (propertyData && (!Number.isFinite(propertyMin) || !Number.isFinite(propertyMax) || propertyMin >= propertyMax)) {
        propertyMin = Infinity;
        propertyMax = -Infinity;
        for (let i = 0; i < propertyData.length; i++) {
          const v = propertyData[i];
          if (v < propertyMin) propertyMin = v;
          if (v > propertyMax) propertyMax = v;
        }
      }
      const propertyRange = Math.max(propertyMax - propertyMin, MIN_NUMERIC_RANGE);

      const resolveAtomColor = (atomIndex: number, atomType: number): [number, number, number] => {
        if (state.colorMode === 'property' && propertyData) {
          const t = Math.max(0, Math.min(1, (propertyData[atomIndex] - propertyMin) / propertyRange));
          return mapFn(t);
        }
        if (state.colorMode === 'uniform') {
          return new THREE.Color(state.uniformAtomColor).toArray() as [number, number, number];
        }
        return resolveTypeColor(atomType);
      };

      let centerX = 0;
      let centerY = 0;
      let centerZ = 0;
      let arScale = 1;
      if (isUsdZ) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        let visibleAtoms = 0;
        for (let i = 0; i < currentFrame.natoms; i++) {
          const typeId = currentFrame.types[i];
          if (state.hiddenAtomTypes.has(typeId)) continue;
          const x = currentFrame.positions[i * 3];
          const y = currentFrame.positions[i * 3 + 1];
          const z = currentFrame.positions[i * 3 + 2];
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (z < minZ) minZ = z;
          if (z > maxZ) maxZ = z;
          visibleAtoms++;
        }
        if (visibleAtoms > 0) {
          centerX = (minX + maxX) * 0.5;
          centerY = (minY + maxY) * 0.5;
          centerZ = (minZ + maxZ) * 0.5;
          const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ, MIN_NUMERIC_RANGE);
          arScale = Math.max(MIN_USDZ_SCALE, Math.min(MAX_USDZ_SCALE, TARGET_USDZ_EXTENT_METERS / extent));
        }
      }

      // ── Build atom meshes ──
      // Group atoms by type for instanced rendering efficiency in downstream tools
      const atomsByType = new Map<number, number[]>();
      for (let i = 0; i < currentFrame.natoms; i++) {
        const typeId = currentFrame.types[i];
        if (state.hiddenAtomTypes.has(typeId)) continue;
        if (!atomsByType.has(typeId)) atomsByType.set(typeId, []);
        atomsByType.get(typeId)!.push(i);
      }

      const sphereGeo = new THREE.SphereGeometry(1, 16, 12);

      for (const [typeId, indices] of atomsByType) {
        const baseRadius = (TYPE_RADII[typeId] ?? 1.0) * (state.atomScale ?? 1.0);
        const typeScale = state.atomTypeScales[typeId] ?? 1.0;
        const radius = baseRadius * typeScale * arScale;

        let matConfig: any = { metalness: 0.1, roughness: 0.5 };
        switch (state.materialPreset) {
          case 'matte':
            matConfig = { metalness: 0.05, roughness: 0.85 };
            break;
          case 'metallic':
            matConfig = { metalness: 0.8, roughness: 0.2 };
            break;
          case 'glass':
            matConfig = isUsdZ
              ? { metalness: 0.1, roughness: 0.2 }
              : { metalness: 0.1, roughness: 0.1, transmission: 0.8, transparent: true, opacity: 0.8, ior: 1.5 };
            break;
          case 'plastic':
            matConfig = { metalness: 0.0, roughness: 0.4 };
            break;
        }

        matConfig.metalness = Math.max(0.0, Math.min(1.0, matConfig.metalness + (state.surfacePolish || 0.0)));
        matConfig.roughness = Math.max(0.0, Math.min(1.0, matConfig.roughness + (state.surfaceRoughness || 0.0)));

        const MaterialClass = state.materialPreset === 'glass' && !isUsdZ ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
        const material = new MaterialClass({
          color: new THREE.Color(1, 1, 1),
          ...matConfig
        });

        const mesh = new THREE.InstancedMesh(sphereGeo, material, indices.length);
        mesh.name = `atoms-type-${typeId}`;
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();

        for (let j = 0; j < indices.length; j++) {
          const idx = indices[j];
          const x = (currentFrame.positions[idx * 3] - centerX) * arScale;
          const y = (currentFrame.positions[idx * 3 + 1] - centerY) * arScale;
          const z = (currentFrame.positions[idx * 3 + 2] - centerZ) * arScale;
          const [r, g, b] = resolveAtomColor(idx, typeId);
          color.setRGB(r, g, b);
          mesh.setColorAt(j, color);
          matrix.compose(
            new THREE.Vector3(x, y, z),
            new THREE.Quaternion(),
            new THREE.Vector3(radius, radius, radius)
          );
          mesh.setMatrixAt(j, matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        exportScene.add(mesh);
      }

      // ── Build bond cylinders (if bonds are visible) ──
      if (state.showBonds && currentFrame.natoms < 50000) {
        // Mirror the live viewer's element-aware test:
        //   d ≤ r_cov(A) + r_cov(B) + tolerance
        // GLB export was previously a flat distance threshold which gave
        // wildly different bond sets from what the user saw on-screen
        // (e.g., LLZO La–O at 2.6 Å was kept by the flat cutoff but
        // dropped by the in-app element-aware filter). Use the same
        // tolerance the slider controls so the export matches the view.
        const tolerance = state.bondTolerance ?? 0.45;
        const radiusForType = new Map<number, number>();
        for (let i = 0; i < currentFrame.natoms; i++) {
          const t = currentFrame.types[i];
          if (!radiusForType.has(t)) radiusForType.set(t, getElementSpec(t).radius);
        }
        let maxR = 0;
        radiusForType.forEach((r) => { if (r > maxR) maxR = r; });
        const hardCapSq = (2 * maxR + tolerance + 0.5) ** 2; // outer cap on the O(N²) loop

        const bonds: [number, number][] = [];

        // Simple O(n²) for small systems, spatial hash for larger
        // For GLB export we cap at 50k atoms to avoid memory issues
        for (let i = 0; i < currentFrame.natoms && bonds.length < 500000; i++) {
          const xi = currentFrame.positions[i * 3];
          const yi = currentFrame.positions[i * 3 + 1];
          const zi = currentFrame.positions[i * 3 + 2];
          const ri = radiusForType.get(currentFrame.types[i]) ?? 1.4;
          for (let j = i + 1; j < currentFrame.natoms; j++) {
            const dx = currentFrame.positions[j * 3] - xi;
            const dy = currentFrame.positions[j * 3 + 1] - yi;
            const dz = currentFrame.positions[j * 3 + 2] - zi;
            const distSq = dx * dx + dy * dy + dz * dz;
            if (distSq <= 0.01 || distSq > hardCapSq) continue;
            const rj = radiusForType.get(currentFrame.types[j]) ?? 1.4;
            const cutoff = ri + rj + tolerance;
            if (distSq < cutoff * cutoff) {
              bonds.push([i, j]);
            }
          }
        }

        if (bonds.length > 0) {
          const bondRadius = 0.12 * arScale;
          const cylGeo = new THREE.CylinderGeometry(bondRadius, bondRadius, 1, 8, 1);
          // Rotate cylinder so it aligns along +Y (default cylinder axis)
          let matConfig: any = { metalness: 0.1, roughness: 0.5 };
          switch (state.materialPreset) {
            case 'matte':
              matConfig = { metalness: 0.05, roughness: 0.85 };
              break;
            case 'metallic':
              matConfig = { metalness: 0.8, roughness: 0.2 };
              break;
            case 'glass':
              matConfig = isUsdZ
                ? { metalness: 0.1, roughness: 0.2 }
                : { metalness: 0.1, roughness: 0.1, transmission: 0.8, transparent: true, opacity: 0.8, ior: 1.5 };
              break;
            case 'plastic':
              matConfig = { metalness: 0.0, roughness: 0.4 };
              break;
          }

          matConfig.metalness = Math.max(0.0, Math.min(1.0, matConfig.metalness + (state.surfacePolish || 0.0)));
          matConfig.roughness = Math.max(0.0, Math.min(1.0, matConfig.roughness + (state.surfaceRoughness || 0.0)));

          const MaterialClass = state.materialPreset === 'glass' && !isUsdZ ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
          const bondMat = new MaterialClass({
            color: new THREE.Color(1, 1, 1),
            ...matConfig
          });

          const bondMesh = new THREE.InstancedMesh(cylGeo, bondMat, bonds.length);
          bondMesh.name = 'bonds';
          const mat = new THREE.Matrix4();
          const pos = new THREE.Vector3();
          const dir = new THREE.Vector3();
          const up = new THREE.Vector3(0, 1, 0);
          const quat = new THREE.Quaternion();
          const scale = new THREE.Vector3();
          const colorA = new THREE.Color();
          const colorB = new THREE.Color();
          const colorMid = new THREE.Color();

          for (let b = 0; b < bonds.length; b++) {
            const [ai, aj] = bonds[b];
            const ax = (currentFrame.positions[ai * 3] - centerX) * arScale;
            const ay = (currentFrame.positions[ai * 3 + 1] - centerY) * arScale;
            const az = (currentFrame.positions[ai * 3 + 2] - centerZ) * arScale;
            const bx = (currentFrame.positions[aj * 3] - centerX) * arScale;
            const by = (currentFrame.positions[aj * 3 + 1] - centerY) * arScale;
            const bz = (currentFrame.positions[aj * 3 + 2] - centerZ) * arScale;

            const length = Math.sqrt((bx-ax)**2 + (by-ay)**2 + (bz-az)**2);
            pos.set((ax+bx)/2, (ay+by)/2, (az+bz)/2);
            dir.set(bx-ax, by-ay, bz-az).normalize();
            quat.setFromUnitVectors(up, dir);
            scale.set(1, length, 1);
            mat.compose(pos, quat, scale);
            bondMesh.setMatrixAt(b, mat);

            const [ar, ag, ab] = resolveAtomColor(ai, currentFrame.types[ai]);
            const [br, bg, bb] = resolveAtomColor(aj, currentFrame.types[aj]);
            colorA.setRGB(ar, ag, ab);
            colorB.setRGB(br, bg, bb);
            // Keep bond color visually tied to both connected atoms.
            colorMid.copy(colorA).lerp(colorB, 0.5);
            bondMesh.setColorAt(b, colorMid);
          }
          bondMesh.instanceMatrix.needsUpdate = true;
          if (bondMesh.instanceColor) bondMesh.instanceColor.needsUpdate = true;
          exportScene.add(bondMesh);
        }
      }

      // ── Export via chosen format ──
      let blob: Blob;
      let filename: string;
      const baseName = req.baseName || 'LUPI';

      if (req.type === 'usdz') {
        console.log('[ExportManager] FIXED USDZ EXPORT RUNNING');
        const { USDZExporter } = await import('three/addons/exporters/USDZExporter.js');
        const exporter = new USDZExporter();
        const swaps = expandInstancedMeshes(exportScene);
        let usdz: ArrayBuffer;
        try {
          usdz = (await (exporter as any).parseAsync(exportScene)) as ArrayBuffer;
        } finally {
          restoreInstancedMeshes(swaps);
        }
        blob = new Blob([usdz], { type: 'model/vnd.usdz+zip' });
        filename = `${baseName}-frame${state.frame + 1}.usdz`;
      } else {
        const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
        const exporter = new GLTFExporter();
        const glb = (await exporter.parseAsync(exportScene, { binary: true })) as ArrayBuffer;
        blob = new Blob([glb], { type: 'model/gltf-binary' });
        filename = `${baseName}-frame${state.frame + 1}.glb`;
      }

      if (req.onComplete) {
        req.onComplete(true, blob, filename);
      } else {
        downloadBlob(blob, filename);
      }

      // Cleanup export scene
      exportScene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      sphereGeo.dispose();

    } catch (err) {
      console.error('[3D Export] Failed:', err);
      if (req.onComplete) req.onComplete(false);
    }

    clearExportRequest();
  }, [exportRequest, clearExportRequest]);

  // ─── Start Video Recording (MediaRecorder — native, off-thread) ───────
  const startVideoRecording = useCallback(async () => {
    const req = exportRequest;
    if (!req || isRecording.current) return;

    // Keep even dimensions (some encoders/players dislike odd dims).
    const width = (req.resolution?.width || 1920) & ~1;
    const height = (req.resolution?.height || 1080) & ~1;
    const fps = 30;

    onCompleteRef.current = req.onComplete || null;
    requestRef.current = req;

    // Capture standard canvas size bounds to restore later
    if (req.orbit) {
      originalCameraPosition.current = camera.position.clone();
    }

    if (req.cinematic) {
      const state = useStore.getState();
      originalStoreState.current = {
        bondTolerance: state.bondTolerance,
        atomScale: state.atomScale,
        frame: state.frame,
      };
    }

    originalSize.current = {
      width: size.width,
      height: size.height,
      aspect: (camera as THREE.PerspectiveCamera).aspect
    };

    // Force DPR to 1 and size the engine THROUGH R3F (setDpr/setSize) rather than
    // a raw gl.setSize(). The postprocessing EffectComposer only resizes its
    // render targets when R3F's `size` state changes; a raw gl.setSize() leaves
    // the composer at the old viewport aspect, and its final fullscreen pass then
    // stretches that across the new export buffer — the squished-molecule bug.
    // Routing through R3F keeps composer + camera + renderer on one aspect.
    originalPixelRatio.current = gl.getPixelRatio();
    setDpr(1);
    setSize(width, height);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    // The app runs a demand frameloop (renders only on interaction) for perf, but
    // the capture loop needs a frame EVERY tick. Force 'always' for the duration of
    // the export; restoreAfterVideo() hands it back to 'demand'. This is the real
    // fix for exports stalling when the canvas is otherwise idle.
    setFrameloop('always');

    // ── MediaRecorder (single durable path) ───────────────────────────
    // Pick the best supported container/codec, preferring MP4 (Safari/iOS) then
    // WebM (Chromium/Firefox). MediaRecorder encodes the captured canvas stream
    // natively and off the main thread, so the UI never freezes.
    const candidateMimes = [
      'video/mp4;codecs=avc1.640028',
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const canvas = gl.domElement as HTMLCanvasElement;
    const supportsRecorder =
      typeof MediaRecorder !== 'undefined' &&
      typeof MediaRecorder.isTypeSupported === 'function';
    const mimeType = supportsRecorder
      ? candidateMimes.find((m) => MediaRecorder.isTypeSupported(m))
      : undefined;

    if (!supportsRecorder || !mimeType || typeof canvas.captureStream !== 'function') {
      useStore.getState().setRendererWarning('Video export isn’t supported in this browser.');
      onCompleteRef.current?.(false);
      restoreAfterVideo();
      return;
    }

    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';

    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 12_000_000,
    });

    // Fresh chunk accumulator for this export.
    recordedChunksRef.current = [];
    const chunks = recordedChunksRef.current;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };

    recorder.onstop = () => {
      void (async () => {
        try {
          const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
          const baseName = req.baseName || 'LUPI';
          const filename = `${baseName}.${ext}`;

          if (blob.size === 0) {
            useStore.getState().setRendererWarning('Video export captured no frames.');
            onCompleteRef.current?.(false);
          } else if (req.fileStream) {
            // Stream the final video to the user-picked file handle.
            await req.fileStream.write(blob);
            await req.fileStream.close();
            onCompleteRef.current?.(true);
          } else if (onCompleteRef.current) {
            onCompleteRef.current(true, blob, filename);
          } else {
            downloadBlob(blob, filename);
          }
        } catch (err) {
          console.error('[ExportManager] Video delivery failed:', err);
          useStore.getState().setRendererWarning('Video export failed in this browser.');
          onCompleteRef.current?.(false);
        } finally {
          restoreAfterVideoRef.current();
        }
      })();
    };

    recorderRef.current = recorder;
    captureStartRef.current = null; // anchored on the first VideoCaptureLoop tick
    recorderStoppedRef.current = false;

    recorder.start();

    totalFrames.current = fps * (req.durationSeconds || 5); // no longer used for completion; harmless
    frameCount.current = 0;
    isRecording.current = true;
    setIsCapturing(true);
    // Kick the render loop: switching demand→always doesn't restart rAF on its own,
    // so without this the capture loop can stall before its first tick.
    invalidate();
  }, [exportRequest, camera, gl, size, clearExportRequest, setSize, setDpr, setFrameloop, invalidate, restoreAfterVideo]);

  // ─── Effect: Dispatch export actions ──────────────────────────
  // IMPORTANT: Only depend on exportRequest. We use refs for the handlers
  // to break the React dependency cycle that causes "Maximum update depth exceeded".
  const handleImageExportRef = useRef(handleImageExport);
  handleImageExportRef.current = handleImageExport;
  const startVideoRecordingRef = useRef(startVideoRecording);
  startVideoRecordingRef.current = startVideoRecording;
  const handle3DExportRef = useRef(handle3DExport);
  handle3DExportRef.current = handle3DExport;

  useEffect(() => {
    if (!exportRequest || !exportRequest.type) return;

    if (exportRequest.type === 'image') {
      handleImageExportRef.current();
    }
    if (exportRequest.type === 'video') {
      startVideoRecordingRef.current();
    }
    if (exportRequest.type === 'glb' || exportRequest.type === 'usdz') {
      handle3DExportRef.current();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportRequest]);

  return isCapturing ? (
    <VideoCaptureLoop
      requestRef={requestRef}
      totalFrames={totalFrames}
      originalCameraPosition={originalCameraPosition}
      file={file}
      isRecording={isRecording}
      setIsCapturing={setIsCapturing}
      recorderRef={recorderRef}
      recorderStoppedRef={recorderStoppedRef}
      captureStartRef={captureStartRef}
    />
  ) : null;
}

// ─── Utility ─────────────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
