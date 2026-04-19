/**
 * ExportManager — Unified pipeline for image, MP4, and GIF export.
 *
 * Architecture:
 *   Image:  Single-frame WebGL readback at arbitrary resolution.
 *   MP4:    WebCodecs VideoEncoder + mp4-muxer → H.264 MP4 download.
 *   GIF:    Same MP4 pipeline → decode via <video> element → gifenc → GIF download.
 *
 * The GIF path reuses the exact same recording pipeline as MP4, then converts
 * the finalized MP4 blob client-side. This means one capture loop, one encoder,
 * zero raw-frame memory accumulation.
 *
 * All video modes support 360° orbit around the structure centroid.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useStore } from './store';
import * as THREE from 'three';

// ─── Dynamic imports (tree-shaken when unused) ────────────────────
let Muxer: any = null;
let ArrayBufferTarget: any = null;

async function loadMp4Muxer() {
  if (Muxer) return;
  const mod = await import('mp4-muxer');
  Muxer = mod.Muxer;
  ArrayBufferTarget = mod.ArrayBufferTarget;
}
// ─── MP4 → GIF converter ─────────────────────────────────────────
/**
 * Decodes an MP4 blob frame-by-frame via a <video> element, then encodes
 * each frame into a GIF using gifenc with per-frame adaptive 256-color palettes.
 *
 * This is memory-efficient: only one decoded frame is held in RAM at a time.
 */
async function convertMp4ToGif(
  mp4Blob: Blob,
  targetFps: number = 15,
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

// ─── ExportManager component ─────────────────────────────────────
export function ExportManager() {
  const { gl, scene, camera, size } = useThree();
  const exportRequest = useStore(s => s.exportRequest);
  const clearExportRequest = useStore(s => s.clearExportRequest);
  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);

  // Recording state
  const isRecording = useRef(false);
  const outputFormat = useRef<'mp4' | 'gif' | null>(null); // What the user requested
  const recordingStartTime = useRef(0);
  const recordingDuration = useRef(5);
  const recordingFps = useRef(60);
  const recordingWidth = useRef(1920);
  const recordingHeight = useRef(1080);
  const frameCount = useRef(0);
  const onCompleteRef = useRef<((success: boolean) => void) | null>(null);

  // MP4 encoder state (used for both MP4 and GIF output)
  const videoEncoder = useRef<VideoEncoder | null>(null);
  const muxer = useRef<any>(null);
  const mp4Target = useRef<any>(null);

  // Orbit state
  const originalCameraPosition = useRef<THREE.Vector3 | null>(null);
  const originalSize = useRef<{ width: number; height: number; aspect: number } | null>(null);

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
    const dataUrl = gl.domElement.toDataURL(mime, format === 'png' ? undefined : 0.95);

    gl.setRenderTarget(originalRenderTarget);
    gl.setSize(oldWidth, oldHeight, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = originalAspect;
      camera.updateProjectionMatrix();
    }
    gl.setClearAlpha(originalClearAlpha);

    const link = document.createElement('a');
    link.download = `${req.baseName || 'glimPSE-export'}-frame${frame + 1}.${format === 'jpeg' ? 'jpg' : format}`;
    link.href = dataUrl;
    link.click();

    if (req.onComplete) req.onComplete(true);
    clearExportRequest();
  }, [exportRequest, gl, scene, camera, size, clearExportRequest, frame]);

  // ─── Start Video Recording (unified for MP4 and GIF) ─────────
  const startVideoRecording = useCallback(async () => {
    const req = exportRequest;
    if (!req || isRecording.current) return;

    const userFormat = req.format === 'gif' ? 'gif' : 'mp4';
    const width = req.resolution?.width || 1920;
    const height = req.resolution?.height || 1080;
    const fps = 60;
    const duration = req.durationSeconds || 5;

    // Check WebCodecs
    if (typeof VideoEncoder === 'undefined') {
      console.error('WebCodecs VideoEncoder not available in this browser.');
      if (req.onComplete) req.onComplete(false);
      clearExportRequest();
      return;
    }

    outputFormat.current = userFormat;
    recordingWidth.current = width;
    recordingHeight.current = height;
    recordingFps.current = fps;
    recordingDuration.current = duration;
    frameCount.current = 0;
    onCompleteRef.current = req.onComplete || null;

    // Always init the MP4 encoder (GIF will convert from the MP4 after)
    await loadMp4Muxer();
    mp4Target.current = new ArrayBufferTarget();
    muxer.current = new Muxer({
      target: mp4Target.current,
      video: { codec: 'avc', width, height },
      fastStart: 'in-memory',
    });

    videoEncoder.current = new VideoEncoder({
      output: (chunk: any, meta: any) => {
        muxer.current?.addVideoChunk(chunk, meta);
      },
      error: (e: any) => console.error('VideoEncoder error:', e),
    });

    videoEncoder.current.configure({
      codec: 'avc1.640028', // H.264 High Profile Level 4.0
      width,
      height,
      bitrate: 16_000_000, // 16 Mbps
      framerate: fps,
    });

    // Setup orbit
    if (req.orbit) {
      originalCameraPosition.current = camera.position.clone();
    }

    // Set Canvas Size for Video
    originalSize.current = {
      width: size.width,
      height: size.height,
      aspect: (camera as THREE.PerspectiveCamera).aspect
    };
    
    gl.setSize(width, height, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    recordingStartTime.current = performance.now();
    isRecording.current = true;
  }, [exportRequest, camera, gl, size, clearExportRequest]);

  // ─── Finalize Recording ───────────────────────────────────────
  const finalizeRecording = useCallback(async () => {
    isRecording.current = false;
    const userFormat = outputFormat.current;
    const baseName = exportRequest?.baseName || 'glimPSE';

    if (!videoEncoder.current || !muxer.current) {
      console.error('No active encoder to finalize');
      if (onCompleteRef.current) onCompleteRef.current(false);
      clearExportRequest();
      return;
    }

    let success = false;
    try {
      if (videoEncoder.current.state === 'closed') {
        throw new Error('VideoEncoder closed unexpectedly before finalize.');
      }
      
      // Flush and finalize the MP4
      await videoEncoder.current.flush();
      muxer.current.finalize();
      const buffer = mp4Target.current.buffer;
      const mp4Blob = new Blob([buffer], { type: 'video/mp4' });

      if (userFormat === 'mp4') {
        // Direct MP4 download
        downloadBlob(mp4Blob, `${baseName}.mp4`);
        success = true;
      } else if (userFormat === 'gif') {
        // Convert MP4 → GIF (15fps is standard for smooth GIF loops)
        try {
          const gifBlob = await convertMp4ToGif(mp4Blob, 15);
          downloadBlob(gifBlob, `${baseName}.gif`);
          success = true;
        } catch (err) {
          console.error('GIF conversion failed, downloading MP4 instead:', err);
          downloadBlob(mp4Blob, `${baseName}.mp4`);
          success = true;
        }
      }
    } catch (err) {
      console.error('Failed to finalize video export:', err);
      success = false;
    } finally {
      // Cleanup encoder
      if (videoEncoder.current && videoEncoder.current.state !== 'closed') {
        try {
          videoEncoder.current.close();
        } catch(e) {}
      }
      videoEncoder.current = null;
      muxer.current = null;
      mp4Target.current = null;

      // Restore camera if orbit was used
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

      outputFormat.current = null;
      if (onCompleteRef.current) onCompleteRef.current(success);
      clearExportRequest();
    }
  }, [exportRequest, camera, file, clearExportRequest, gl]);

  // ─── Effect: Dispatch export actions ──────────────────────────
  useEffect(() => {
    if (!exportRequest || !exportRequest.type) return;

    if (exportRequest.type === 'image') {
      handleImageExport();
    }
    if (exportRequest.type === 'video') {
      startVideoRecording();
    }
  }, [exportRequest, handleImageExport, startVideoRecording]);

  // ─── Per-frame: orbit + capture ───────────────────────────────
  useFrame(() => {
    if (!isRecording.current || !videoEncoder.current) return;

    const elapsed = (performance.now() - recordingStartTime.current) / 1000;
    const duration = recordingDuration.current;

    // Check if recording is complete
    if (elapsed >= duration) {
      finalizeRecording();
      return;
    }

    // Orbit camera around structure centroid
    if (originalCameraPosition.current && file) {
      const { min, max } = file.trajectory.globalBounds;
      const center = new THREE.Vector3(
        (min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2
      );
      const radius = originalCameraPosition.current.distanceTo(center);
      const height = originalCameraPosition.current.y;
      const angle = (elapsed / duration) * Math.PI * 2; // Full 360°
      camera.position.x = center.x + Math.sin(angle) * radius;
      camera.position.z = center.z + Math.cos(angle) * radius;
      camera.position.y = height;
      camera.lookAt(center);
    }

    // Only capture at target FPS intervals (skip if ahead)
    const targetInterval = 1 / recordingFps.current;
    const expectedFrames = Math.floor(elapsed / targetInterval);
    if (frameCount.current >= expectedFrames) return;
    frameCount.current = expectedFrames;

    // Encode frame via WebCodecs (same path for MP4 and GIF)
    const canvas = gl.domElement;
    try {
      const videoFrame = new VideoFrame(canvas, {
        timestamp: Math.round(elapsed * 1_000_000), // microseconds
      });
      // Ensure the very first frame encoded is ALWAYS a keyFrame, plus every 60th frame
      const isFirstFrame = muxer.current && !muxer.current._hasEncodedFirst; // custom flag 
      if (muxer.current) muxer.current._hasEncodedFirst = true;
      
      videoEncoder.current!.encode(videoFrame, {
        keyFrame: isFirstFrame || (frameCount.current % 60 === 0),
      });
      videoFrame.close();
    } catch (e) {
      console.warn('VideoFrame encode failed, skipping frame', e);
    }
  });

  return null;
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
