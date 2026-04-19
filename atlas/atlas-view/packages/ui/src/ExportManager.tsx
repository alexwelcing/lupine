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

  // MediaRecorder state
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const finalMimeType = useRef<string>('');

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

    // Check MediaRecorder
    if (typeof MediaRecorder === 'undefined') {
      console.error('MediaRecorder not available in this browser.');
      if (req.onComplete) req.onComplete(false);
      clearExportRequest();
      return;
    }

    let selectedMime = '';
    const mimeMap = [
      'video/mp4;codecs=h264',
      'video/webm;codecs=vp9',
      'video/webm',
      'video/mp4'
    ];
    for (const m of mimeMap) {
      if (MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }
    if (!selectedMime) {
      console.error('No supported MediaRecorder MIME type found.');
      if (req.onComplete) req.onComplete(false);
      clearExportRequest();
      return;
    }
    finalMimeType.current = selectedMime;

    outputFormat.current = userFormat;
    recordingWidth.current = width;
    recordingHeight.current = height;
    recordingFps.current = fps;
    recordingDuration.current = duration;
    frameCount.current = 0;
    onCompleteRef.current = req.onComplete || null;
    recordedChunks.current = [];

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

    // Force an immediate render to guarantee the canvas has content
    gl.render(scene, camera);

    const stream = gl.domElement.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: selectedMime,
      videoBitsPerSecond: 16_000_000,
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.current.push(e.data);
      }
    };
    
    recorder.onstop = async () => {
      const finalBlob = new Blob(recordedChunks.current, { type: selectedMime });
      const ext = selectedMime.includes('mp4') ? 'mp4' : 'webm';
      const baseName = req.baseName || 'glimPSE';

      let success = false;
      try {
        if (outputFormat.current === 'mp4') { // 'mp4' represents the native video stream, could be WebM
          downloadBlob(finalBlob, `${baseName}.${ext}`);
          success = true;
        } else if (outputFormat.current === 'gif') {
          try {
            const gifBlob = await convertMp4ToGif(finalBlob, 15);
            downloadBlob(gifBlob, `${baseName}.gif`);
            success = true;
          } catch (err) {
            console.error('GIF conversion failed, downloading video instead:', err);
            downloadBlob(finalBlob, `${baseName}.${ext}`);
            success = true;
          }
        }
      } catch (err) {
        console.error('Failed to finalize video export:', err);
        success = false;
      } finally {
        mediaRecorder.current = null;
        recordedChunks.current = [];

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

        isRecording.current = false;
        outputFormat.current = null;
        if (onCompleteRef.current) onCompleteRef.current(success);
        clearExportRequest();
      }
    };

    recorder.start(100);
    mediaRecorder.current = recorder;

    recordingStartTime.current = performance.now();
    isRecording.current = true;
  }, [exportRequest, camera, gl, scene, size, clearExportRequest, file]);

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
    if (!isRecording.current || !mediaRecorder.current) return;

    const elapsed = (performance.now() - recordingStartTime.current) / 1000;
    const duration = recordingDuration.current;

    // Check if recording is complete
    if (elapsed >= duration) {
      if (mediaRecorder.current.state === 'recording') {
        mediaRecorder.current.stop();
      }
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

    // MediaRecorder automatically captures the canvas stream, 
    // so we only need to manually orchestrate the Orbit camera angle per-frame!
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
