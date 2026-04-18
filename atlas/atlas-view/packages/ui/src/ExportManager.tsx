import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useStore } from './store';
import * as THREE from 'three';

export function ExportManager() {
  const { gl, scene, camera, size } = useThree();
  const exportRequest = useStore(s => s.exportRequest);
  const clearExportRequest = useStore(s => s.clearExportRequest);
  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);

  const isRecording = useRef(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<BlobPart[]>([]);

  // For 120fps Rotation Orbit
  const originalCameraPosition = useRef<THREE.Vector3 | null>(null);
  const rotationAngle = useRef(0);
  const targetRotation = useRef(0);

  useEffect(() => {
    if (!exportRequest || !exportRequest.type) return;

    if (exportRequest.type === 'image') {
      const oldWidth = size.width;
      const oldHeight = size.height;
      
      const targetWidth = exportRequest.resolution?.width || oldWidth;
      const targetHeight = exportRequest.resolution?.height || oldHeight;
      const format = exportRequest.format || 'png';
      
      // Preserve current renderer aspect safely
      const originalAspect = (camera as THREE.PerspectiveCamera).aspect;
      
      // Force renderer into specific pixel resolution without altering CSS
      gl.setSize(targetWidth, targetHeight, false);
      
      if (camera instanceof THREE.PerspectiveCamera) {
          camera.aspect = targetWidth / targetHeight;
          camera.updateProjectionMatrix();
      }

      // If opaque, ensure drawing buffer matches scene bg
      const originalClearAlpha = gl.getClearAlpha();
      if (!exportRequest.transparent) {
        gl.setClearColor(new THREE.Color('#10131a'), 1);
      } else {
        gl.setClearColor(0x000000, 0);
      }

      // Single synchronous render at higher resolution
      // CRUCIAL: EffectComposer may leave a RenderTarget bound. We MUST unbind it
      // so that our synchronous render goes directly to the canvas drawing buffer!
      const originalRenderTarget = gl.getRenderTarget();
      gl.setRenderTarget(null);
      gl.render(scene, camera);

      // Extract Base64
      const mime = `image/${format}`;
      const dataUrl = gl.domElement.toDataURL(mime, format === 'png' ? undefined : 0.95);

      // Revert WebGL target
      gl.setRenderTarget(originalRenderTarget);

      // Revert WebGL size & Camera
      gl.setSize(oldWidth, oldHeight, false);
      if (camera instanceof THREE.PerspectiveCamera) {
          camera.aspect = originalAspect;
          camera.updateProjectionMatrix();
      }
      gl.setClearAlpha(originalClearAlpha);
      
      // Trigger user download
      const link = document.createElement('a');
      link.download = `${exportRequest.baseName || 'glimPSE-export'}-frame${frame + 1}.${format === 'jpeg' ? 'jpg' : format}`;
      link.href = dataUrl;
      link.click();

      // Finalize
      if (exportRequest.onComplete) exportRequest.onComplete(true);
      clearExportRequest();
    }
    
    if (exportRequest.type === 'video') {
      if (isRecording.current) return;
      isRecording.current = true;
      recordedChunks.current = [];
      
      const stream = gl.domElement.captureStream(120); // Request 120fps
      
      // Standardize to WebM VP9 which supports high-fps and high bitrates on most browsers
      const mimeType = 'video/webm;codecs=vp9';
      let options = {};
      if (MediaRecorder.isTypeSupported(mimeType)) {
        options = { mimeType, videoBitsPerSecond: 16000000 };
      }
      
      mediaRecorder.current = new MediaRecorder(stream, options);
      
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.current.push(e.data);
      };
      
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: mediaRecorder.current?.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const ext = mediaRecorder.current?.mimeType.includes('mp4') ? 'mp4' : 'webm';
        link.download = `${exportRequest.baseName || 'glimPSE-recording'}.${ext}`;
        link.href = url;
        link.click();
        
        isRecording.current = false;
        
        if (exportRequest.onComplete) exportRequest.onComplete(true);
        clearExportRequest();
      };
      
      mediaRecorder.current.start();
      
      // Setup orbit if requested over a 5s duration
      if (exportRequest.orbit) {
        originalCameraPosition.current = camera.position.clone();
        rotationAngle.current = 0;
        targetRotation.current = Math.PI * 2; // full 360 sweeping orbit
      }
      
      const durationMs = (exportRequest.durationSeconds || 5) * 1000;
      setTimeout(() => {
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
        }
      }, durationMs);
    }

  }, [exportRequest, gl, scene, camera, size, clearExportRequest, frame]);

  // Handle orbit per frame
  useFrame((state, delta) => {
    if (isRecording.current && exportRequest?.orbit) {
       const duration = exportRequest.durationSeconds || 5;
       const speed = (Math.PI * 2) / duration; // radians per second
       rotationAngle.current += speed * delta;
       
       if (originalCameraPosition.current && file) {
         // get center
         const { min, max } = file.trajectory.globalBounds;
         const center = new THREE.Vector3(
           (min[0] + max[0]) / 2,
           (min[1] + max[1]) / 2,
           (min[2] + max[2]) / 2
         );
         
         const radius = originalCameraPosition.current.distanceTo(center);
         const height = originalCameraPosition.current.y;
         
         // simple rotation around Y axis through center
         camera.position.x = center.x + Math.sin(rotationAngle.current) * radius;
         camera.position.z = center.z + Math.cos(rotationAngle.current) * radius;
         camera.position.y = height;
         camera.lookAt(center);
         
         // Restore at the very end
         if (rotationAngle.current >= targetRotation.current) {
            camera.position.copy(originalCameraPosition.current);
            camera.lookAt(center);
            originalCameraPosition.current = null;
         }
       }
    }
  });

  return null;
}
