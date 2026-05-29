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
import * as THREE from 'three';
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

function inspectSceneGraph(scene: any) {
  const lights: Record<string, number> = {};
  const hiddenLights: Record<string, number> = {};
  let objectCount = 0;
  let meshCount = 0;
  scene.traverse?.((object: any) => {
    objectCount += 1;
    if (object.isMesh) meshCount += 1;
    if (object.isLight) {
      let visible = object.visible !== false;
      let parent = object.parent;
      while (visible && parent) {
        visible = parent.visible !== false;
        parent = parent.parent;
      }
      const bucket = visible ? lights : hiddenLights;
      bucket[object.type] = (bucket[object.type] ?? 0) + 1;
    }
  });

  const state = useStore.getState();
  return {
    objectCount,
    meshCount,
    lights,
    hiddenLights,
    environmentActive: Boolean(scene.environment),
    materialScene: state.materialScene,
    materialPreset: state.materialPreset,
    environmentPreset: state.environmentPreset,
    postprocessPreset: state.postprocessPreset,
    lightRig: {
      ambient: state.ambientLightIntensity,
      key: state.dirLightIntensity,
      rim: state.rimLightIntensity,
      keyAngles: [state.keyLightAzimuth, state.keyLightElevation],
      fillAngles: [state.fillLightAzimuth, state.fillLightElevation],
      rimAngles: [state.rimLightAzimuth, state.rimLightElevation],
    },
  };
}

function inspectInstancedMeshes(scene: any) {
  const meshes: Array<Record<string, unknown>> = [];
  scene.traverse?.((object: any) => {
    if (!object.isInstancedMesh) return;
    const geometry = object.geometry as THREE.BufferGeometry | undefined;
    const attrs = geometry?.attributes ?? {};
    meshes.push({
      name: object.name || object.type,
      type: object.type,
      visible: object.visible,
      count: object.count,
      frustumCulled: object.frustumCulled,
      geometry: geometry?.type,
      material: object.material?.type,
      capacity: object.instanceMatrix?.count ?? null,
      attributes: Object.fromEntries(
        Object.entries(attrs).map(([key, attr]) => [
          key,
          {
            itemSize: (attr as THREE.BufferAttribute).itemSize,
            count: (attr as THREE.BufferAttribute).count,
            usage: (attr as THREE.BufferAttribute).usage,
          },
        ]),
      ),
    });
  });
  return meshes;
}

interface DevProbeProps {
  enabled?: boolean;
}

function writeDiagnosticsPayload(payload: unknown) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('lupi-scene-diagnostics') as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script') as HTMLScriptElement;
    el.id = 'lupi-scene-diagnostics';
    el.type = 'application/json';
    el.setAttribute('data-lupi-diagnostics', 'scene');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(payload);
}

export function DevProbe({ enabled = false }: DevProbeProps) {
  const three = useThree();
  const samplesRef = useRef<number[]>([]);   // rolling frame timestamps
  const frameCountRef = useRef(0);
  const active = enabled || import.meta.env.DEV;

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    const w = window as any;
    w.__atlas = w.__atlas ?? {};
    w.__atlas.three = {
      scene: three.scene,
      camera: three.camera,
      gl: three.gl,
      controls: three.controls,
      get state() { return three; },
    };
    w.__atlas.inspectScene = () => inspectSceneGraph(three.scene);
    w.__atlas.snapshot = () => {
      const state = useStore.getState();
      const renderer = three.gl as THREE.WebGLRenderer;
      const size = new THREE.Vector2();
      renderer.getSize(size);
      return {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        file: state.file ? {
          name: state.file.name,
          size: state.file.size,
          frames: state.file.trajectory.frames.length,
          natoms: state.file.trajectory.frames[state.frame]?.natoms ?? state.file.trajectory.frames[0]?.natoms ?? 0,
          atomTypes: state.file.trajectory.atomTypes,
        } : null,
        store: {
          frame: state.frame,
          totalFrames: state.file?.trajectory.frames.length ?? 0,
          playing: state.playing,
          playbackSpeed: state.playbackSpeed,
          loadedAtomCount: state.loadedAtomCount,
          renderStyle: state.renderStyle,
          colorMode: state.colorMode,
          colorProperty: state.colorProperty,
          colormap: state.colormap,
          atomColorSource: state.atomColorSource,
          showBonds: state.showBonds,
          bondTolerance: state.bondTolerance,
          bondColorMode: state.bondColorMode,
          useGpuBonds: state.useGpuBonds,
          gpuBondsStatus: state.gpuBondsStatus,
          bondSource: state.bondSource,
          lastBondCount: state.lastBondCount,
          backgroundPreset: state.backgroundPreset,
          backgroundVideo: (state as any).backgroundVideo ?? null,
          materialScene: state.materialScene,
          materialPreset: state.materialPreset,
          postprocessPreset: state.postprocessPreset,
        },
        renderer: {
          pixelRatio: renderer.getPixelRatio(),
          size: [size.x, size.y],
          canvas: {
            width: renderer.domElement.width,
            height: renderer.domElement.height,
            clientWidth: renderer.domElement.clientWidth,
            clientHeight: renderer.domElement.clientHeight,
          },
          memory: { ...renderer.info.memory },
          render: { ...renderer.info.render },
          programs: renderer.info.programs?.length ?? 0,
        },
        scene: inspectSceneGraph(three.scene),
        instancedMeshes: inspectInstancedMeshes(three.scene),
        perf: w.__atlas.perf ?? null,
      };
    };
    w.__atlas.resetRendererInfo = () => three.gl.info.reset();
    w.__lupi = w.__atlas;
    w.__lupi.inspectScene = w.__atlas.inspectScene;
    w.__lupi.snapshot = w.__atlas.snapshot;
    writeDiagnosticsPayload(w.__atlas.snapshot());
    // Three.js DevTools picks the scene up via the WebGLRenderer hook
    // automatically; this is also a Needle/Three console handle.

    // Real-file loader for the verifier (and console pokes). Fetches the URL,
    // wraps as a File, runs through the same parseFile() the FileDropZone
    // uses — so this validates the WHOLE pipeline (WASM parser + frame
    // construction + setFile + smart defaults + render).
    w.__atlas.loadFromURL = async (url: string) => {
      const { parseFile, detectFileType } = await import('@atlas/parsers');
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
  }, [active, three]);

  // FPS sampler. Stamps every render with performance.now(), keeps the last
  // 5 seconds of samples, and exposes derived stats on window.__atlas.perf.
  // Costs negligible per frame (a push + a binary-search-ish trim).
  useFrame(() => {
    if (!active || typeof window === 'undefined') return;
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
    if (frameCountRef.current % 30 === 0 && (window as any).__atlas.snapshot) {
      writeDiagnosticsPayload((window as any).__atlas.snapshot());
    }
  });

  return null;
}
