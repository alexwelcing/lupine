/**
 * DevProbe — exposes the live R3F scene / camera / renderer / GL on
 * `window.__atlas.three` for in-browser inspection (Needle Tools chrome
 * extension, Three.js DevTools, console pokes), plus a rolling FPS tracker
 * on `window.__atlas.perf`.
 *
 * Mount inside the <Canvas/>, dev-only. No-op in prod.
 */

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { parseFile, detectFileType } from '@atlas/parsers';
import { useStore } from './store';

interface PerfWindowState {
  /** Instantaneous FPS, smoothed over the most recent ~250ms. */
  fps: number;
  /** Average FPS over the last second. */
  avgFps1s: number;
  /** Average FPS over the last 5 seconds. */
  avgFps5s: number;
  /** Average frame time in milliseconds (1s window). */
  frameTimeMs: number;
  /** Total frames rendered since mount. */
  frameCount: number;
}

export function DevProbe() {
  const three = useThree();
  const samplesRef = useRef<number[]>([]);   // rolling frame timestamps
  const frameCountRef = useRef(0);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;
    const w = window as any;
    w.__atlas = w.__atlas ?? {};
    w.__atlas.three = {
      scene: three.scene,
      camera: three.camera,
      gl: three.gl,
      controls: three.controls,
      get state() { return three; },
    };
    // Three.js DevTools picks the scene up via the WebGLRenderer hook
    // automatically; this is just a convenience handle for the console.

    // Real-file loader for the verifier (and console pokes). Fetches the URL,
    // wraps as a File, runs through the same parseFile() the FileDropZone
    // uses — so this validates the WHOLE pipeline (WASM parser + frame
    // construction + setFile + smart defaults + render).
    w.__atlas.loadFromURL = async (url: string) => {
      const response = await fetch(url, { headers: { Accept: 'text/plain, */*' } });
      if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
      const ct = response.headers.get('content-type') ?? '';
      const bytes = await response.arrayBuffer();
      const head = new TextDecoder().decode(new Uint8Array(bytes).slice(0, 80));
      console.log(`[atlas loadFromURL] ${url} → ${response.status} (${ct}, ${bytes.byteLength}B) head=${JSON.stringify(head)}`);
      const name = url.split('/').pop() ?? 'remote';
      const file = new File([bytes], name);
      const fileType = detectFileType(name);
      const result = await parseFile(file);
      if (!result.trajectory) {
        throw new Error(`Parser returned no trajectory for ${name} (detected as ${fileType})`);
      }
      useStore.getState().setFile({
        name,
        size: bytes.byteLength,
        trajectory: result.trajectory,
        thermo: result.thermo ?? null,
      });
      return {
        natoms: result.trajectory.frames[0]?.natoms ?? 0,
        frames: result.trajectory.frames.length,
        atomTypes: result.trajectory.atomTypes,
      };
    };
  }, [three]);

  // FPS sampler. Stamps every render with performance.now(), keeps the last
  // 5 seconds of samples, and exposes derived stats on window.__atlas.perf.
  // Costs negligible per frame (a push + a binary-search-ish trim).
  useFrame(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;
    const now = performance.now();
    samplesRef.current.push(now);
    frameCountRef.current += 1;

    // Trim samples older than 5 seconds.
    const cutoff5s = now - 5000;
    while (samplesRef.current.length > 0 && samplesRef.current[0] < cutoff5s) {
      samplesRef.current.shift();
    }

    // Only update the window state every ~10 frames to avoid mutating a
    // hot path during render. The verify harness polls on its own cadence.
    if (frameCountRef.current % 10 !== 0) return;

    const samples = samplesRef.current;
    const cutoff250 = now - 250;
    const cutoff1s = now - 1000;
    let count250 = 0, count1s = 0;
    for (let i = samples.length - 1; i >= 0; i--) {
      const t = samples[i];
      if (t >= cutoff250) count250++;
      if (t >= cutoff1s) count1s++;
      else break;
    }
    const stats: PerfWindowState = {
      fps: count250 > 0 ? count250 * 4 : 0,            // samples in 0.25s → /s
      avgFps1s: count1s,
      avgFps5s: samples.length / 5,
      frameTimeMs: count1s > 0 ? 1000 / count1s : 0,
      frameCount: frameCountRef.current,
    };
    (window as any).__atlas = (window as any).__atlas ?? {};
    (window as any).__atlas.perf = stats;
  });

  return null;
}
