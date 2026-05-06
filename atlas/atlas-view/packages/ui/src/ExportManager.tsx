/**
 * ExportManager — Unified pipeline for image, MP4, GLB, and GIF export.
 *
 * Architecture:
 *   Image:  Single-frame WebGL readback at arbitrary resolution.
 *   MP4:    WebCodecs VideoEncoder + mp4-muxer → H.264 MP4 download.
 *   GIF:    Same MP4 pipeline → decode via <video> element → gifenc → GIF download.
 *   GLB:    Reconstructs real sphere/cylinder meshes from atomic data and exports
 *           via GLTFExporter for use in Blender, Unity, or any 3D software.
 *
 * The GIF path reuses the exact same recording pipeline as MP4, then converts
 * the finalized MP4 blob client-side. This means one capture loop, one encoder,
 * zero raw-frame memory accumulation.
 *
 * All video modes support 360° orbit around the structure centroid.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useStore } from './store';
import * as THREE from 'three';
import { sampleFlythrough, getSequenceDuration } from './flythrough';

// Native MediaRecorder requires no dynamic muxer loads
// ─── MP4 → GIF converter ─────────────────────────────────────────
/**
 * Decodes an MP4 blob frame-by-frame via a <video> element, then encodes
 * each frame into a GIF using gifenc with per-frame adaptive 256-color palettes.
 *
 * This is memory-efficient: only one decoded frame is held in RAM at a time.
 */
async function convertMp4ToGif(
  mp4Blob: Blob,
  targetFps: number = 30, // Upgraded from 15fps to 30fps for butter-smooth GIF looping
): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');

  const videoUrl = URL.createObjectURL(mp4Blob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = videoUrl;

  // Wait for metadata (duration, dimensions)
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load MP4 for GIF conversion'));
    // Safety timeout
    setTimeout(() => reject(new Error('MP4 metadata load timeout')), 10_000);
  });

  const w = video.videoWidth;
  const h = video.videoHeight;
  const duration = video.duration;
  const frameInterval = 1 / targetFps;
  const delay = Math.round(1000 / targetFps); // ms per frame for GIF
  const totalFrames = Math.floor(duration * targetFps);

  // Offscreen canvas for frame extraction
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const encoder = GIFEncoder();

  // Seek to each frame time and encode
  for (let i = 0; i < totalFrames; i++) {
    const seekTime = Math.min(i * frameInterval, duration - 0.001);

    // Seek and wait
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = seekTime;
    });

    // Draw frame to canvas
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);

    // Quantize to 256 colors and encode
    const palette = quantize(imageData.data, 256);
    const indexed = applyPalette(imageData.data, palette);
    encoder.writeFrame(indexed, w, h, { palette, delay });
  }

  encoder.finish();

  // Cleanup
  URL.revokeObjectURL(videoUrl);
  video.remove();

  return new Blob([encoder.bytes().buffer as ArrayBuffer], { type: 'image/gif' });
}

// ─── Video Capture Loop Component ──────────────────────────────────
// By isolating the priority=2 useFrame into a conditionally mounted component,
// we prevent React Three Fiber from permanently disabling its native Priority 0 
// gl.render loop (which happens if any hooked component has priority > 0).
function VideoCaptureLoop({
  encoderRef,
  muxerRef,
  requestRef,
  frameCount,
  totalFrames,
  originalCameraPosition,
  originalSize,
  originalPixelRatio,
  outputFormat,
  onCompleteRef,
  clearExportRequest,
  file,
  isRecording,
  setIsCapturing,
  originalStoreState
}: any) {
  const { gl, camera } = useThree();

  useFrame(() => {
    if (!isRecording.current || !encoderRef.current || !muxerRef.current) return;

    // --- Backpressure Protocol (Prevents crashes on long exports or fast displays) ---
    // If the browser pushes frames into the WebCodecs queue faster than the hardware 
    // encoder can compress them (e.g., 144Hz monitor playing 80Mbps 4K video), RAM fills
    // instantly and the browser silently crashes with an OOM. 
    // By returning early, we pause frame extraction until the GPU drains the queue.
    if (encoderRef.current.encodeQueueSize > 4) {
      return; 
    }

    const req = requestRef.current;
    if (!req) return;

    const i = frameCount.current;
    const total = totalFrames.current;
    const fps = 60;

    // 1. Capture the completed canvas frame from the PREVIOUS loop computations
    // We do this immediately to grab what EffectComposer just dumped to gl.domElement.
    try {
      const frameData = new VideoFrame(gl.domElement, { timestamp: (i * 1e6) / fps });
      encoderRef.current.encode(frameData, { keyFrame: i % 60 === 0 });
      frameData.close();
    } catch (e) {
      console.error("Frame encode error", e);
    }

    frameCount.current++;

    // 2. Setup the camera strictly for the NEXT loop computation
    // Flythrough path takes priority over orbit
    if (req.flythrough && req.flythrough.keyframes.length >= 2) {
      const flyDuration = getSequenceDuration(req.flythrough);
      const flyTime = (frameCount.current / total) * flyDuration;
      
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
      
      // Calculate angle based on the *next* frame about to be rendered
      const angle = (frameCount.current / total) * Math.PI * 2;
      camera.position.x = center.x + Math.sin(angle) * radius;
      camera.position.z = center.z + Math.cos(angle) * radius;
      camera.position.y = originalCameraPosition.current.y;
      camera.lookAt(center);
    }

    if (req.cinematic && file) {
      const progress = frameCount.current / total;
      
      // Advance trajectory if there is one
      if (file.trajectory.totalFrames > 1) {
        // Run from start to the absolute end frame
        const targetFrame = Math.floor(progress * file.trajectory.totalFrames);
        const safeFrame = Math.min(targetFrame, file.trajectory.totalFrames - 1);
        if (useStore.getState().frame !== safeFrame) {
          useStore.getState().setFrame(safeFrame);
        }
      }

      // Cinematic bond pulse (breathes in to reveal bonds, breathes out)
      const pulse = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
      useStore.getState().setBondCutoff(Math.max(0, pulse * 2.5));

      // Subtle atom scaling
      useStore.getState().setAtomScale(0.85 + pulse * 0.15);
    }

    // 3. Finalize when finished
    if (frameCount.current >= total) {
      isRecording.current = false;
      setIsCapturing(false); // Unmount hook IMMEDIATELY to restore normal Fiber rendering
      
      // Detach async completion from the synchronous render thread
      (async () => {
        try {
          await encoderRef.current!.flush();
          
          // Finalize the MP4 container. Catch colorSpace crash as a last resort.
          try {
            muxerRef.current!.finalize();
          } catch (finalizeErr: any) {
            if (finalizeErr?.message?.includes('colorSpace') || finalizeErr?.message?.includes('null')) {
              console.warn('[ExportManager] finalize() colorSpace fallback — salvaging buffer', finalizeErr);
            } else {
              throw finalizeErr;
            }
          }

          let success = false;

          // If we streamed to disk, no buffer exists to download. Just close the stream!
          if (req.fileStream) {
            await req.fileStream.close();
            if (onCompleteRef.current) onCompleteRef.current(true);
            success = true;
          } else {
            // Memory target: Pull the array buffer and spawn a client-side download
            const finalBuffer = muxerRef.current!.target.buffer;
            const finalBlob = new Blob([finalBuffer], { type: 'video/mp4' });
            const baseName = req.baseName || 'glimPSE';
            const userFormat = outputFormat.current;

            if (userFormat === 'mp4') {
              if (onCompleteRef.current) {
                onCompleteRef.current(true, finalBlob, `${baseName}.mp4`);
              } else {
                downloadBlob(finalBlob, `${baseName}.mp4`);
                if (onCompleteRef.current) onCompleteRef.current(true);
              }
              success = true;
            } else if (userFormat === 'gif') {
              try {
                const gifBlob = await convertMp4ToGif(finalBlob, 30); 
                if (onCompleteRef.current) {
                  onCompleteRef.current(true, gifBlob, `${baseName}.gif`);
                } else {
                  downloadBlob(gifBlob, `${baseName}.gif`);
                  if (onCompleteRef.current) onCompleteRef.current(true);
                }
                success = true;
              } catch (err) {
                console.error('GIF conversion failed, downloading pristine MP4 fallback:', err);
                if (onCompleteRef.current) {
                  onCompleteRef.current(true, finalBlob, `${baseName}.mp4`);
                } else {
                  downloadBlob(finalBlob, `${baseName}.mp4`);
                  if (onCompleteRef.current) onCompleteRef.current(true);
                }
                success = true;
              }
            }
          } // close else
          
          if (!success) {
            if (onCompleteRef.current) onCompleteRef.current(false);
          }

        } catch (err) {
          console.error("Finalization failed", err);
          if (onCompleteRef.current) onCompleteRef.current(false);
        } finally {
          encoderRef.current = null;
          muxerRef.current = null;
          
          // Restore Scene State securely
          if (originalCameraPosition.current && file) {
            const { min, max } = file.trajectory.globalBounds;
            const center = new THREE.Vector3(
              (min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2
            );
            camera.position.copy(originalCameraPosition.current);
            camera.lookAt(center);
            originalCameraPosition.current = null;
          }

          if (originalSize.current) {
            gl.setSize(originalSize.current.width, originalSize.current.height, false);
            if (camera instanceof THREE.PerspectiveCamera) {
              camera.aspect = originalSize.current.aspect;
              camera.updateProjectionMatrix();
            }
            originalSize.current = null;
          }
          
          // Restore Retina super-sampling
          if (originalPixelRatio.current) {
            gl.setPixelRatio(originalPixelRatio.current);
          }

          // Restore Cinematic Mutations
          if (originalStoreState.current) {
            useStore.getState().setBondCutoff(originalStoreState.current.bondCutoff);
            useStore.getState().setAtomScale(originalStoreState.current.atomScale);
            useStore.getState().setFrame(originalStoreState.current.frame);
            originalStoreState.current = null;
          }

          outputFormat.current = null;
          clearExportRequest();
        }
      })();
    }
  }, 2); // Priority 2 execution!

  return null;
}

// ─── ExportManager component ─────────────────────────────────────
export function ExportManager() {
  const { gl, scene, camera, size } = useThree();
  const exportRequest = useStore(s => s.exportRequest);
  const clearExportRequest = useStore(s => s.clearExportRequest);
  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);

  // Recording state
  const isRecording = useRef(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const outputFormat = useRef<'mp4' | 'gif' | null>(null);
  const onCompleteRef = useRef<((success: boolean) => void) | null>(null);

  // WebCodecs / Pipeline state
  const encoderRef = useRef<VideoEncoder | null>(null);
  const muxerRef = useRef<any>(null);
  const requestRef = useRef<any>(null);
  const totalFrames = useRef(0);
  const frameCount = useRef(0);
  const originalPixelRatio = useRef<number>(1);
  const originalCameraPosition = useRef<THREE.Vector3 | null>(null);
  const originalSize = useRef<{ width: number; height: number; aspect: number } | null>(null);
  const originalStoreState = useRef<{ bondCutoff: number; atomScale: number; frame: number } | null>(null);

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
    gl.setSize(targetWidth, targetHeight, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = targetWidth / targetHeight;
      camera.updateProjectionMatrix();
    }

    const originalClearAlpha = gl.getClearAlpha();
    if (!req.transparent) {
      gl.setClearColor(new THREE.Color('#10131a'), 1);
    } else {
      gl.setClearColor(0x000000, 0);
    }

    const originalRenderTarget = gl.getRenderTarget();
    gl.setRenderTarget(null);
    gl.render(scene, camera);

    const mime = `image/${format}`;
    const quality = format === 'png' ? undefined : 1.0;
    const ext = format === 'jpeg' ? 'jpg' : format;
    const filename = `${req.baseName || 'glimPSE-export'}-frame${frame + 1}.${ext}`;

    // Use toBlob for reliable downloads with correct file extensions.
    // toDataURL + link.click() fails in modern Chrome when the <a> isn't in the DOM,
    // causing missing/wrong file extensions.
    // Note: toBlob captures pixels synchronously per spec — the callback is just for
    // delivering the encoded blob. Safe to restore renderer state immediately after.
    gl.domElement.toBlob(
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
    gl.setSize(oldWidth, oldHeight, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = originalAspect;
      camera.updateProjectionMatrix();
    }
    gl.setClearAlpha(originalClearAlpha);
  }, [exportRequest, gl, scene, camera, size, clearExportRequest, frame]);

  // ─── 3D Model Export (GLB / USDZ) ─────────────────────
  const handle3DExport = useCallback(async () => {
    const req = exportRequest;
    if (!req) return;

    try {
      const { TYPE_COLORS, TYPE_RADII, DEFAULT_TYPE_COLOR } = await import('@atlas/scene');

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
      exportScene.name = currentFile.name || 'glimPSE-export';

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
        const [r, g, b] = TYPE_COLORS[typeId] ?? DEFAULT_TYPE_COLOR;
        const baseRadius = (TYPE_RADII[typeId] ?? 1.0) * (state.atomScale ?? 1.0);
        const typeScale = state.atomTypeScales[typeId] ?? 1.0;
        const radius = baseRadius * typeScale;

        let matConfig: any = { metalness: 0.1, roughness: 0.5 };
        switch (state.materialPreset) {
          case 'matte':
            matConfig = { metalness: 0.05, roughness: 0.85 };
            break;
          case 'metallic':
            matConfig = { metalness: 0.8, roughness: 0.2 };
            break;
          case 'glass':
            matConfig = { metalness: 0.1, roughness: 0.1, transmission: 0.8, transparent: true, opacity: 0.8, ior: 1.5 };
            break;
          case 'plastic':
            matConfig = { metalness: 0.0, roughness: 0.4 };
            break;
        }

        const MaterialClass = state.materialPreset === 'glass' ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
        const material = new MaterialClass({
          color: new THREE.Color(r, g, b),
          ...matConfig
        });

        const mesh = new THREE.InstancedMesh(sphereGeo, material, indices.length);
        mesh.name = `atoms-type-${typeId}`;
        const matrix = new THREE.Matrix4();

        for (let j = 0; j < indices.length; j++) {
          const idx = indices[j];
          const x = currentFrame.positions[idx * 3];
          const y = currentFrame.positions[idx * 3 + 1];
          const z = currentFrame.positions[idx * 3 + 2];
          matrix.compose(
            new THREE.Vector3(x, y, z),
            new THREE.Quaternion(),
            new THREE.Vector3(radius, radius, radius)
          );
          mesh.setMatrixAt(j, matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        exportScene.add(mesh);
      }

      // ── Build bond cylinders (if bonds are visible) ──
      if (state.showBonds && currentFrame.natoms < 50000) {
        const bondCutoff = state.bondCutoff ?? 2.5;
        const cutoffSq = bondCutoff * bondCutoff;
        const bonds: [number, number][] = [];

        // Simple O(n²) for small systems, spatial hash for larger
        // For GLB export we cap at 50k atoms to avoid memory issues
        for (let i = 0; i < currentFrame.natoms && bonds.length < 500000; i++) {
          const xi = currentFrame.positions[i * 3];
          const yi = currentFrame.positions[i * 3 + 1];
          const zi = currentFrame.positions[i * 3 + 2];
          for (let j = i + 1; j < currentFrame.natoms; j++) {
            const dx = currentFrame.positions[j * 3] - xi;
            const dy = currentFrame.positions[j * 3 + 1] - yi;
            const dz = currentFrame.positions[j * 3 + 2] - zi;
            const distSq = dx * dx + dy * dy + dz * dz;
            if (distSq < cutoffSq && distSq > 0.01) {
              bonds.push([i, j]);
            }
          }
        }

        if (bonds.length > 0) {
          const cylGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 8, 1);
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
              matConfig = { metalness: 0.1, roughness: 0.1, transmission: 0.8, transparent: true, opacity: 0.8, ior: 1.5 };
              break;
            case 'plastic':
              matConfig = { metalness: 0.0, roughness: 0.4 };
              break;
          }

          const MaterialClass = state.materialPreset === 'glass' ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
          const bondMat = new MaterialClass({
            color: new THREE.Color(0.5, 0.5, 0.5),
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

          for (let b = 0; b < bonds.length; b++) {
            const [ai, aj] = bonds[b];
            const ax = currentFrame.positions[ai * 3];
            const ay = currentFrame.positions[ai * 3 + 1];
            const az = currentFrame.positions[ai * 3 + 2];
            const bx = currentFrame.positions[aj * 3];
            const by = currentFrame.positions[aj * 3 + 1];
            const bz = currentFrame.positions[aj * 3 + 2];

            const length = Math.sqrt((bx-ax)**2 + (by-ay)**2 + (bz-az)**2);
            pos.set((ax+bx)/2, (ay+by)/2, (az+bz)/2);
            dir.set(bx-ax, by-ay, bz-az).normalize();
            quat.setFromUnitVectors(up, dir);
            scale.set(1, length, 1);
            mat.compose(pos, quat, scale);
            bondMesh.setMatrixAt(b, mat);
          }
          bondMesh.instanceMatrix.needsUpdate = true;
          exportScene.add(bondMesh);
        }
      }

      // ── Export via chosen format ──
      let blob: Blob;
      let filename: string;
      const baseName = req.baseName || 'glimPSE';

      if (req.type === 'usdz') {
        console.log('[ExportManager] FIXED USDZ EXPORT RUNNING');
        const { USDZExporter } = await import('three/addons/exporters/USDZExporter.js');
        const exporter = new USDZExporter();
        const usdz = (await (exporter as any).parseAsync(exportScene)) as ArrayBuffer;
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

  // ─── Start Video Recording (Post-processing Aware 80Mbps) ─────────
  const startVideoRecording = useCallback(async () => {
    const req = exportRequest;
    if (!req || isRecording.current) return;

    const userFormat = req.format === 'gif' ? 'gif' : 'mp4';
    const width = req.resolution?.width || 1920;
    const height = req.resolution?.height || 1080;
    const fps = 60; 
    const duration = req.durationSeconds || 5;

    if (typeof VideoEncoder === 'undefined') {
      console.error('WebCodecs VideoEncoder not available in this browser.');
      if (req.onComplete) req.onComplete(false);
      clearExportRequest();
      return;
    }

    outputFormat.current = userFormat;
    onCompleteRef.current = req.onComplete || null;
    requestRef.current = req;

    // Capture standard canvas size bounds to restore later
    if (req.orbit) {
      originalCameraPosition.current = camera.position.clone();
    }

    if (req.cinematic) {
      const state = useStore.getState();
      originalStoreState.current = {
        bondCutoff: state.bondCutoff,
        atomScale: state.atomScale,
        frame: state.frame,
      };
    }

    originalSize.current = {
      width: size.width,
      height: size.height,
      aspect: (camera as THREE.PerspectiveCamera).aspect
    };
    
    // EXTREMELY IMPORTANT: Force pixel ratio to exactly 1.0!
    originalPixelRatio.current = gl.getPixelRatio();
    gl.setPixelRatio(1);

    // Size the engine precisely to export dimensions
    gl.setSize(width, height, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    try {
      const mp4Muxer = await import('mp4-muxer');
      const Muxer = mp4Muxer.Muxer || (mp4Muxer as any).default?.Muxer || (mp4Muxer as any).default;
      const ArrayBufferTarget = mp4Muxer.ArrayBufferTarget || (mp4Muxer as any).default?.ArrayBufferTarget;
      const FileSystemWritableFileStreamTarget = mp4Muxer.FileSystemWritableFileStreamTarget || (mp4Muxer as any).default?.FileSystemWritableFileStreamTarget;

      const target = req.fileStream 
        ? new FileSystemWritableFileStreamTarget(req.fileStream) 
        : new ArrayBufferTarget();

      const muxer = new Muxer({
        target,
        video: { codec: 'avc', width, height },
        // IMPORTANT: Must be false when streaming to disk with a file stream!
        fastStart: req.fileStream ? false : 'in-memory',
      });
      muxerRef.current = muxer;

      let firstChunkSeen = false;
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
          // mp4-muxer 5.x crashes in finalize() if track.info.decoderConfig is null
          // or if decoderConfig.colorSpace is missing. We inject colorSpace on the
          // first chunk if the encoder doesn't provide it.
          // CRITICAL: Use muxerRef.current (not local muxer) to avoid stale closure
          // when React strict mode or HMR causes double-initialization.
          if (!firstChunkSeen) {
            firstChunkSeen = true;
            if (meta?.decoderConfig) {
              if (!meta.decoderConfig.colorSpace) {
                meta = {
                  ...meta,
                  decoderConfig: {
                    ...meta.decoderConfig,
                    colorSpace: {
                      primaries: 'bt709',
                      transfer: 'bt709',
                      matrix: 'bt709',
                      fullRange: false,
                    },
                  },
                };
              }
            } else {
              meta = {
                ...(meta || {}),
                decoderConfig: {
                  codec: 'avc1.640028',
                  description: new Uint8Array(0),
                  colorSpace: {
                    primaries: 'bt709',
                    transfer: 'bt709',
                    matrix: 'bt709',
                    fullRange: false,
                  },
                },
              } as EncodedVideoChunkMetadata;
            }
          }
          if (muxerRef.current) {
            muxerRef.current.addVideoChunk(chunk, meta);
          }
        },
        error: (e) => console.error('VideoEncoder error:', e),
      });

      videoEncoder.configure({
        codec: 'avc1.640028',
        width,
        height,
        bitrate: 80_000_000, 
        framerate: fps,
        hardwareAcceleration: 'prefer-hardware',
      } as VideoEncoderConfig);
      encoderRef.current = videoEncoder;

      totalFrames.current = fps * duration;
      frameCount.current = 0;
      isRecording.current = true;
      setIsCapturing(true);

    } catch (err) {
      console.error('Failed to init WebCodecs video:', err);
      if (onCompleteRef.current) onCompleteRef.current(false);
      isRecording.current = false;
      gl.setPixelRatio(originalPixelRatio.current);
      clearExportRequest();
    }
  }, [exportRequest, camera, gl, size, clearExportRequest]);

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
      encoderRef={encoderRef}
      muxerRef={muxerRef}
      requestRef={requestRef}
      frameCount={frameCount}
      totalFrames={totalFrames}
      originalCameraPosition={originalCameraPosition}
      originalSize={originalSize}
      originalPixelRatio={originalPixelRatio}
      outputFormat={outputFormat}
      onCompleteRef={onCompleteRef}
      clearExportRequest={clearExportRequest}
      file={file}
      isRecording={isRecording}
      setIsCapturing={setIsCapturing}
      originalStoreState={originalStoreState}
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
