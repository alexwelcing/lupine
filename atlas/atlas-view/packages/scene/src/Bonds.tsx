/**
 * <Bonds /> — High-performance bond rendering with off-thread detection
 *
 * Bond detection (spatial hash + neighbor query) runs in a Web Worker so it
 * never blocks rendering. The component stays mounted and uses visibility
 * toggling instead of unmount/remount.
 *
 * Architecture:
 * - Bond detection → Web Worker (non-blocking)
 * - Bond geometry → computed once per worker result
 * - GPU upload → native TypedArray.set() bulk copy
 * - Toggle → instant visibility flip, no recomputation
 */

/// <reference path="./vite-env.d.ts" />
import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame, ColormapName, RenderStyle } from '@atlas/core/types';
import { getElementSpec, hexToRgb } from '@atlas/core';
import { useGlobalTimer } from './useTimer';
import { DEFAULT_TYPE_COLOR, getTypeColorFromColormap, BOTANICAL_COLORS, COLORMAPS } from './constants';
import { useBondGpuPipeline } from './useBondGpuPipeline';
import { getElementProfile, DEFAULT_PROFILE } from './materials';
// Vite ?worker import: produces a real bundled .js worker module in prod.
// The plain `new URL('./bondWorker.ts', import.meta.url)` form does NOT
// emit a worker chunk during Vite's prod build, so it 404s at runtime.
// The triple-slash reference at the top of the file pulls in the ambient
// `?worker` module declaration from vite-env.d.ts so this resolves both
// in @atlas/scene's own tsc run and in any consumer (e.g. @atlas/ui).
import BondWorkerCtor from './bondWorker.ts?worker';

/**
 * Content-equality check for bond-pair Int32Arrays. Used by the bond-
 * stability skip in uploadBondAttributes — when the worker emits a fresh
 * array with identical contents (same atoms still bonded, just moving),
 * the attribute upload becomes a no-op.
 *
 * Walks both arrays with early exit. ~0.3ms for 27k bonds, far less than
 * the ~1-3ms attribute upload it skips.
 */
/** Min frame-to-frame max-atom displacement (Å) that triggers bond recompute.
 *  Below this, bond topology is guaranteed stable for any reasonable cutoff
 *  (covalent-shortest is ~0.6 Å) so we keep the cached bondPairs and skip
 *  the spatial-hash + neighbor scan entirely. Tuned conservatively so even
 *  fast-equilibrating MD won't drop a real bond change. */
const BOND_RECOMPUTE_DISP_THRESHOLD = 0.05;

/** Returns the max |Δposition| between `curr` and `prev`, sampled at most
 *  1000 atoms to keep the check sub-millisecond on million-atom scenes.
 *  Both arrays are flat XYZ; equal length is required (caller checks). */
function subsampledMaxDisplacement(curr: Float32Array, prev: Float32Array): number {
  const natoms = curr.length / 3;
  const stride = Math.max(1, Math.floor(natoms / 1000));
  let maxSq = 0;
  for (let i = 0; i < natoms; i += stride) {
    const dx = curr[i * 3] - prev[i * 3];
    const dy = curr[i * 3 + 1] - prev[i * 3 + 1];
    const dz = curr[i * 3 + 2] - prev[i * 3 + 2];
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > maxSq) maxSq = d2;
  }
  return Math.sqrt(maxSq);
}

function bondPairsContentEqual(a: Int32Array, b: Int32Array): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

interface BondsProps {
  frame: Frame;
  nextFrame?: Frame;
  interpolationFactor?: number;
  colormap?: ColormapName;
  colorMode?: 'type' | 'uniform' | 'property';
  colorProperty?: string;
  propRange?: [number, number];
  maxBondLength?: number;
  /** Element-aware bonding tolerance (Å). Added to `r_cov(A) + r_cov(B)` per
   *  pair when deciding whether two atoms are bonded. The user-facing slider
   *  drives this. Default 0.45 mirrors the Cordero pair-radius slack. */
  tolerance?: number;
  typeCutoffs?: Map<string, number>;
  periodic?: boolean;
  cellBounds?: [number, number, number, number, number, number];
  radius?: number;
  opacity?: number;
  renderStyle?: RenderStyle;
  botanicalMode?: boolean;
  materialPreset?: 'default' | 'matte' | 'metallic' | 'glass' | 'plastic';
  materialIntensity?: number;
  rimLightIntensity?: number;
  surfaceRoughness?: number;
  surfacePolish?: number;
  surfaceClearcoat?: number;
  fillLightColor?: string;
  rimLightColor?: string;
  fillLightAzimuth?: number;
  fillLightElevation?: number;
  rimLightAzimuth?: number;
  rimLightElevation?: number;
  visible?: boolean;
  bondColorMode?: 'type' | 'length' | 'energy' | 'screening';
  /** Route bond detection through the WebGPU compute pipeline instead of
   *  the CPU worker. Falls back transparently if WebGPU init fails. */
  useGpu?: boolean;
  /** Source of per-type atom colors used as gradient endpoints. Should
   *  match the value passed to AtomsOptimized so bonds and atoms agree. */
  atomColorSource?: 'colormap' | 'element' | 'botanical';
  /** Telemetry hook — fires after every bond detection completes, with the
   *  backend that produced the result and the count. Used by the dev HUD
   *  to verify state-flow; safe to omit. */
  onBondsUpdate?: (info: { source: 'cpu' | 'gpu'; count: number }) => void;
  /** Telemetry hook — fires when the GPU pipeline's status changes. */
  onGpuStatusChange?: (status: 'idle' | 'ready' | 'unsupported') => void;
}

export function Bonds({
  frame,
  nextFrame,
  interpolationFactor,
  colormap = 'viridis',
  colorMode = 'type',
  colorProperty,
  propRange,
  maxBondLength = 3.2,
  tolerance = 0.45,
  typeCutoffs,
  periodic = false,
  cellBounds,
  radius = 0.12,
  opacity = 0.85,
  renderStyle = 'standard',
  botanicalMode = false,
  materialPreset = 'default',
  materialIntensity = 0.0,
  rimLightIntensity = 0.3,
  surfaceRoughness = 0.0,
  surfacePolish = 0.0,
  surfaceClearcoat = 0.0,
  fillLightColor = '#5577ff',
  rimLightColor = '#ff7755',
  fillLightAzimuth = -120,
  fillLightElevation = 10,
  rimLightAzimuth = 160,
  rimLightElevation = 30,
  visible = true,
  bondColorMode = 'type',
  useGpu = false,
  atomColorSource = 'colormap',
  onBondsUpdate,
  onGpuStatusChange,
}: BondsProps) {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timer = useGlobalTimer();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerBusyRef = useRef<boolean>(false);
  const pendingMsgRef = useRef<{ msg: any, transferList: ArrayBuffer[] } | null>(null);

  // Auto-force GPU for big systems regardless of the user's toggle: at
  // hundreds of thousands of atoms the CPU worker is unusable (60+ seconds
  // per detection, browser kills the tab) and a single CPU dispatch can
  // OOM the worker thread. The GPU pipeline scans them in milliseconds.
  // Threshold tuned to where CPU spatial-hash detection starts taking >1s.
  const FORCE_GPU_ATOM_THRESHOLD = 200_000;
  const forceGpu = (frame?.natoms ?? 0) > FORCE_GPU_ATOM_THRESHOLD;
  const wantGpu = useGpu || forceGpu;

  // GPU bond pipeline. Initializes lazily; falls back via `unsupported`.
  // Destructure so dep arrays aren't churned by the hook returning a fresh
  // object each render — `compute` is useCallback'd and stable.
  const { ready: gpuReady, unsupported: gpuUnsupported, compute: gpuCompute } = useBondGpuPipeline(wantGpu);
  // Effective GPU mode: requested AND not known-unsupported. When GPU init
  // fails, this drops to false and the worker takes over without a hiccup.
  // EXCEPT when forceGpu is true and gpu is unsupported — in that case we
  // simply skip bond detection entirely rather than crash the worker.
  const gpuActive = wantGpu && !gpuUnsupported;
  const skipDetection = forceGpu && gpuUnsupported;

  // Telemetry: report status changes upward.
  useEffect(() => {
    if (!onGpuStatusChange) return;
    if (!useGpu) onGpuStatusChange('idle');
    else if (gpuUnsupported) onGpuStatusChange('unsupported');
    else if (gpuReady) onGpuStatusChange('ready');
    else onGpuStatusChange('idle');
  }, [useGpu, gpuReady, gpuUnsupported, onGpuStatusChange]);

  // Bond pair data from the worker
  const [bondPairs, setBondPairs] = useState<Int32Array>(new Int32Array(0));
  const [bondDistances, setBondDistances] = useState<Float32Array>(new Float32Array(0));
  const bondCount = bondPairs.length / 2;
  const halfCount = bondCount * 2; // Each bond → 2 half-cylinders

  // (tubeGeo moved below — depends on `capacity`, which is computed by
  //  the ratchet block.)

  // ─── Web Worker lifecycle ──────────────────────────────────────────
  useEffect(() => {
    const worker = new BondWorkerCtor();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { bondPairs: pairs, count, distances } = e.data;
      // pairs is Int32Array [a0,b0, a1,b1, ...]
      setBondPairs(pairs instanceof Int32Array ? pairs : new Int32Array(pairs));
      if (distances) {
        setBondDistances(distances instanceof Float32Array ? distances : new Float32Array(distances));
      }
      onBondsUpdate?.({ source: 'cpu', count: count ?? pairs.length / 2 });

      workerBusyRef.current = false;
      if (pendingMsgRef.current) {
        const { msg, transferList } = pendingMsgRef.current;
        pendingMsgRef.current = null;
        workerBusyRef.current = true;
        worker.postMessage(msg, transferList);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // ─── Dispatch bond detection to worker (debounced) ─────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevFrameRef = useRef<Frame | null>(null);
  // Track natoms to detect molecule switches — when natoms changes, the
  // user loaded a completely different system. All cached dispatch state
  // must be invalidated to prevent stale bonds from persisting.
  const prevNatomsRef = useRef<number>(0);
  // Snapshot of the positions array we last actually dispatched bond
  // detection on. Lets us skip dispatch when atoms have only jittered
  // (sub-threshold motion) — bond topology doesn't change for ~0.05 Å
  // moves, so we keep the cached bondPairs and avoid the recompute.
  const lastDispatchPositionsRef = useRef<Float32Array | null>(null);
  // Snapshot of the tolerance + max-bond-length we last dispatched on. The
  // motion-skip path must NOT fire when the user has slid the tolerance
  // knob; topology changes immediately even if atoms haven't moved.
  const lastDispatchToleranceRef = useRef<number>(NaN);
  const lastDispatchMaxBondLengthRef = useRef<number>(NaN);

  useEffect(() => {
    if (gpuActive) return; // GPU effect below owns dispatch in this mode.
    // Skip CPU dispatch when bonds are hidden — running spatial-hash + neighbor
    // scan on a 1M-atom system produces tens of MB of bond pairs that are
    // never rendered. The user explicitly toggled bonds off; respect it.
    if (!visible) {
      setBondPairs(new Int32Array(0));
      prevFrameRef.current = frame;
      return;
    }
    if (skipDetection) {
      // Forced-GPU but GPU unavailable. Don't blow up the worker on a
      // huge system; just leave bonds empty until the user lowers the cutoff
      // or the system. (Telemetry: gpuStatus already reads 'unsupported'.)
      setBondPairs(new Int32Array(0));
      prevFrameRef.current = frame;
      return;
    }
    if (!workerRef.current || !frame || frame.natoms < 2) {
      setBondPairs(new Int32Array(0));
      prevFrameRef.current = frame;
      return;
    }

    const isFrameChange = frame !== prevFrameRef.current;
    prevFrameRef.current = frame;

    // Detect molecule switch: natoms changed OR the positions buffer is a
    // different TypedArray (covers same-size molecules). A trajectory's
    // frames share their positions buffer during playback, but a gallery
    // load always allocates fresh arrays.
    const isMoleculeSwitch =
      frame.natoms !== prevNatomsRef.current ||
      (lastDispatchPositionsRef.current !== null &&
       frame.positions.buffer !== lastDispatchPositionsRef.current.buffer &&
       frame.positions.length !== lastDispatchPositionsRef.current.length);
    prevNatomsRef.current = frame.natoms;
    if (isMoleculeSwitch) {
      lastDispatchPositionsRef.current = null;
      lastDispatchToleranceRef.current = NaN;
      lastDispatchMaxBondLengthRef.current = NaN;
    }

    // Motion polish: if this is a frame change but atoms have barely moved
    // (max displacement < threshold), skip dispatch entirely and keep the
    // previously computed bondPairs. Bond topology does not change for
    // sub-threshold jitter (covalent bonds are ≥0.6 Å, threshold is 0.05 Å).
    // Subsamples up to 1000 atoms for the displacement check so the gate
    // itself stays cheap on million-atom scenes.
    const cpuParamsUnchanged =
      lastDispatchToleranceRef.current === tolerance &&
      lastDispatchMaxBondLengthRef.current === maxBondLength;
    if (!isMoleculeSwitch && isFrameChange && cpuParamsUnchanged && lastDispatchPositionsRef.current && frame.positions.length === lastDispatchPositionsRef.current.length) {
      const maxDisp = subsampledMaxDisplacement(frame.positions, lastDispatchPositionsRef.current);
      if (maxDisp < BOND_RECOMPUTE_DISP_THRESHOLD) {
        return;
      }
    }

    // Debounce cutoff changes — 150ms delay so slider doesn't spam
    // Frame changes (playback) should dispatch instantly (0ms) to prevent flickering
    const delay = isFrameChange ? 0 : 150;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const worker = workerRef.current;
      if (!worker) return;

      // Send data to worker — positions and types are transferred (zero-copy)
      // We make copies since the originals are shared with the renderer
      const posCopy = new Float32Array(frame.positions);
      const typesCopy = new Int32Array(frame.types);

      // Build per-type covalent radii lookup from ELEMENT_DATA
      // This enables scientific bond detection: d(A,B) < r_cov(A) + r_cov(B) + tolerance
      const typesArray = frame.types || new Int32Array(frame.natoms);
      const uniqueTypes = new Set(typesArray);
      const maxType = Math.max(...uniqueTypes, 0) + 1;
      const covalentRadii = new Float32Array(maxType);
      for (const t of uniqueTypes) {
        const spec = getElementSpec(t);
        covalentRadii[t] = spec.radius; // covalent radius in Å
      }

      const transferList: ArrayBuffer[] = [posCopy.buffer, typesCopy.buffer];
      const msg: Record<string, any> = {
        positions: posCopy,
        types: typesCopy,
        natoms: frame.natoms,
        maxBondLength,
        covalentRadii,
        tolerance,
        bonds: frame.bonds && frame.bonds.length > 0 ? new Int32Array(frame.bonds) : null,
        computeStats: !isFrameChange, // Skip expensive stats/sorting during rapid playback
      };

      // Cache the positions we're about to detect on, so the next frame
      // change can compare against them for motion-skip. Make our own copy
      // because posCopy is about to be transferred and detached.
      lastDispatchPositionsRef.current = new Float32Array(frame.positions);
      lastDispatchToleranceRef.current = tolerance;
      lastDispatchMaxBondLengthRef.current = maxBondLength;

      if (workerBusyRef.current) {
        pendingMsgRef.current = { msg, transferList };
      } else {
        workerBusyRef.current = true;
        worker.postMessage(msg, transferList);
      }
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [frame, maxBondLength, tolerance, gpuActive, visible, skipDetection]);

  // ─── GPU dispatch ──────────────────────────────────────────────────
  // Runs only when gpuActive is true. Mirrors the worker effect's contract:
  // updates bondPairs / bondDistances state when the GPU readback resolves.
  // `gpuDispatchGenRef` is a monotonically increasing generation counter that
  // replaces the old `cancelled` boolean for staleness detection. The boolean
  // approach raced with React's synchronous effect cleanup, causing valid
  // readbacks to be discarded during molecule switches.
  const lastDispatchedFrameRef = useRef<Frame | null>(null);
  const gpuDispatchGenRef = useRef(0);

  useEffect(() => {
    if (!gpuActive) return;
    // Same visibility-respect as the worker effect — no point computing
    // millions of bonds the user hid.
    if (!visible) {
      setBondPairs(new Int32Array(0));
      setBondDistances(new Float32Array(0));
      return;
    }
    if (!frame || frame.natoms < 2) {
      setBondPairs(new Int32Array(0));
      setBondDistances(new Float32Array(0));
      return;
    }

    // Detect molecule switch in GPU mode too — natoms change OR a different
    // positions buffer means a new system was loaded.
    const gpuMoleculeSwitch =
      frame.natoms !== prevNatomsRef.current ||
      (lastDispatchPositionsRef.current !== null &&
       frame.positions.buffer !== lastDispatchPositionsRef.current.buffer &&
       frame.positions.length !== lastDispatchPositionsRef.current.length);
    prevNatomsRef.current = frame.natoms;
    if (gpuMoleculeSwitch) {
      lastDispatchPositionsRef.current = null;
      lastDispatchToleranceRef.current = NaN;
      lastDispatchMaxBondLengthRef.current = NaN;
    }

    // Motion polish — same skip rule as the CPU path. Atoms that haven't
    // meaningfully moved keep their cached bondPairs; we don't even
    // dispatch the GPU compute. Saves a queue submit + readback per frame
    // during equilibrated playback. Tolerance changes also need a fresh
    // dispatch (the user is dragging the slider — bonds should re-compute
    // as cutoffs widen/narrow), so the skip only fires when tolerance and
    // maxBondLength match the last dispatch as well.
    const paramsUnchanged =
      lastDispatchToleranceRef.current === tolerance &&
      lastDispatchMaxBondLengthRef.current === maxBondLength;
    if (!gpuMoleculeSwitch && paramsUnchanged && lastDispatchPositionsRef.current && frame.positions.length === lastDispatchPositionsRef.current.length) {
      const maxDisp = subsampledMaxDisplacement(frame.positions, lastDispatchPositionsRef.current);
      if (maxDisp < BOND_RECOMPUTE_DISP_THRESHOLD) {
        return;
      }
    }
    lastDispatchPositionsRef.current = new Float32Array(frame.positions);
    lastDispatchToleranceRef.current = tolerance;
    lastDispatchMaxBondLengthRef.current = maxBondLength;

    // Build covalent radii table sized for the largest type seen.
    const typesArray = frame.types || new Int32Array(frame.natoms);
    const uniqueTypes = new Set(typesArray);
    const maxType = Math.max(...uniqueTypes, 0) + 1;
    const covalentRadii = new Float32Array(maxType);
    for (const t of uniqueTypes) {
      const spec = getElementSpec(t);
      covalentRadii[t] = spec.radius;
    }

    // Sim-box extent — used to coarsen the GPU spatial grid for sparse systems.
    let boxExtent = 0;
    if (frame.boxBounds) {
      const dx = frame.boxBounds[1] - frame.boxBounds[0];
      const dy = frame.boxBounds[3] - frame.boxBounds[2];
      const dz = frame.boxBounds[5] - frame.boxBounds[4];
      boxExtent = Math.max(dx, dy, dz);
    }

    // Increment the dispatch generation. The async readback uses this to
    // check freshness — if a newer dispatch has been initiated by the time
    // the readback lands, the result is stale and gets discarded. This is
    // strictly superior to a `cancelled` boolean set from useEffect cleanup,
    // because React's cleanup fires synchronously during re-render, which
    // can race with the async GPU readback and discard valid results from
    // the most-recent dispatch.
    gpuDispatchGenRef.current += 1;
    const thisGeneration = gpuDispatchGenRef.current;

    lastDispatchedFrameRef.current = frame;

    void gpuCompute({
      positions: frame.positions,
      types: typesArray,
      natoms: frame.natoms,
      covalentRadii,
      tolerance,
      maxBondLength,
      boxExtent,
    }).then((readback) => {
      if (!readback) return;
      // Discard if a newer dispatch was initiated after this one.
      if (gpuDispatchGenRef.current !== thisGeneration) return;
      // readBondsAsync returns freshly-allocated arrays — no need to clone.
      setBondPairs(readback.pairs);
      setBondDistances(readback.distances);
      onBondsUpdate?.({ source: 'gpu', count: readback.count });
    }).catch((err) => {
      console.warn('[Bonds] GPU compute failed, falling back to worker:', err);
    });

    // No cleanup needed — staleness is tracked via gpuDispatchGenRef, not a
    // boolean that races with React's synchronous effect teardown.
  }, [gpuActive, frame, maxBondLength, tolerance, gpuCompute, onBondsUpdate, visible]);

  // ─── Capacity management ───────────────────────────────────────────
  // Grow on demand (with headroom), shrink when sustainably under-utilized.
  // Both directions take effect via the `key={capacity}` remount on the
  // <instancedMesh> below, so the GPU buffers always match what we write.
  //
  // Shrink heuristic: if halfCount has been < 50% of capacity for
  // SHRINK_IDLE_RENDERS straight (counter ticks per render — ~one per
  // playback frame), shrink to halfCount * 1.5 (or MIN_BOND_CAPACITY,
  // whichever is larger). This typically fires after a small file is
  // loaded following a large one — reclaims tens of MB of GPU buffers.
  const MIN_BOND_CAPACITY = 20000;
  const SHRINK_THRESHOLD = 0.5;     // halfCount < capacity * this → "under-used"
  const SHRINK_IDLE_RENDERS = 60;   // sustain idle for ~1s of playback before shrinking
  const SHRINK_MIN_GAIN = 0.7;      // require 30%+ memory savings before bothering

  const capacityRef = useRef(MIN_BOND_CAPACITY);
  const idleRendersRef = useRef(0);

  if (halfCount > capacityRef.current) {
    capacityRef.current = Math.max(capacityRef.current * 1.5, Math.ceil(halfCount * 1.2));
    idleRendersRef.current = 0;
  } else if (
    halfCount > 0 &&
    halfCount < capacityRef.current * SHRINK_THRESHOLD &&
    capacityRef.current > MIN_BOND_CAPACITY
  ) {
    idleRendersRef.current += 1;
    if (idleRendersRef.current >= SHRINK_IDLE_RENDERS) {
      const target = Math.max(MIN_BOND_CAPACITY, Math.ceil(halfCount * 1.5));
      if (target < capacityRef.current * SHRINK_MIN_GAIN) {
        capacityRef.current = target;
      }
      idleRendersRef.current = 0;
    }
  } else {
    idleRendersRef.current = 0;
  }
  const capacity = capacityRef.current;

  // Tube geometry. Capacity-keyed so the geometry-attached InstancedBuffer-
  // Attributes (colorT, radiusBT, tangent) grow when the capacity ratchet
  // bumps. If we kept the geometry stable and used setAttribute later, the
  // InstancedMesh's cached attribute bindings would still reference the old
  // (small) buffers — the 13.5k-atom CuZr fixture caught this:
  // `colorT=20000 radiusBT=20000` while `color=181656` from instanceColor
  // JSX which DID grow. Cylinder vertex/index data is constant; only
  // attribute sizes change.
  const tubeGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 4, 1);

    geo.setAttribute('radiusBT', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2));
    geo.setAttribute('colorT', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3));
    // Per-bond PBR material gradient: vec4 (metalnessB, roughnessB,
    // metalnessT, roughnessT). The fragment shader interpolates along the
    // bond axis so a Au–Au bond reads gold-shiny end-to-end, an Au–O bond
    // reads gold→ceramic. Initialized to a neutral default; uploadBondAttributes
    // overwrites per-frame with values from the elements involved.
    geo.setAttribute('materialBT', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4));

    // Tangent for MeshPhysicalMaterial's anisotropy. Cylinder is y-aligned,
    // so every vertex's tangent is +Y in local space — becomes the bond
    // axis after the instanceMatrix transform.
    const vertCount = geo.attributes.position.count;
    const tangentArray = new Float32Array(vertCount * 4);
    for (let i = 0; i < vertCount; i++) {
      tangentArray[i * 4 + 1] = 1;
      tangentArray[i * 4 + 3] = 1;
    }
    geo.setAttribute('tangent', new THREE.BufferAttribute(tangentArray, 4));

    return geo;
  }, [capacity]);

  // CPU-side state arrays for bulk GPU upload.
  //
  // Color is split into "B" (bottom) and "T" (top) per half-cylinder so the
  // shader can lerp along the bond axis. For each bond i:
  //   instance i*2   (atom A's half):   colorB = A's color, colorT = midpoint
  //   instance i*2+1 (atom B's half):   colorB = midpoint,  colorT = B's color
  // This produces a continuous A → mid → B gradient with no visible seam,
  // making the per-atom property gradient mathematically legible. For per-bond
  // modes (length, energy), B == T and the bond renders uniformly.
  const cpuMatrixArray = useMemo(() => new Float32Array(capacity * 16), [capacity]);
  const cpuColorBArray = useMemo(() => new Float32Array(capacity * 3), [capacity]);
  const cpuColorTArray = useMemo(() => new Float32Array(capacity * 3), [capacity]);
  const cpuRadiusBTArray = useMemo(() => new Float32Array(capacity * 2), [capacity]);
  const cpuMaterialBTArray = useMemo(() => new Float32Array(capacity * 4), [capacity]);

  // (Per-instance attributes radiusBT/colorT/tangent are now created inside
  //  the tubeGeo useMemo above — they need to exist at the moment the
  //  InstancedMesh remounts via key={capacity}, not in a post-commit useEffect.)

  // ─── Material ──────────────────────────────────────────────────────
  const uniformsRef = useRef({ 
    uTime: { value: 0 },
    uSurfaceRoughness: { value: surfaceRoughness },
    uSurfacePolish: { value: surfacePolish },
    uFillLightColor: { value: new THREE.Color(fillLightColor) },
    uRimLightColor: { value: new THREE.Color(rimLightColor) },
    uFillLightDir: { value: new THREE.Vector3() },
    uRimLightDir: { value: new THREE.Vector3() },
    uRimLight: { value: rimLightIntensity },
  });

  useEffect(() => {
    uniformsRef.current.uSurfaceRoughness.value = surfaceRoughness;
    uniformsRef.current.uSurfacePolish.value = surfacePolish;
    uniformsRef.current.uFillLightColor.value.set(fillLightColor);
    uniformsRef.current.uRimLightColor.value.set(rimLightColor);
    uniformsRef.current.uRimLight.value = rimLightIntensity;

    const faz = fillLightAzimuth * Math.PI / 180;
    const fel = fillLightElevation * Math.PI / 180;
    uniformsRef.current.uFillLightDir.value.set(
      Math.cos(fel) * Math.sin(faz),
      Math.sin(fel),
      Math.cos(fel) * Math.cos(faz)
    ).normalize();

    const raz = rimLightAzimuth * Math.PI / 180;
    const rel = rimLightElevation * Math.PI / 180;
    uniformsRef.current.uRimLightDir.value.set(
      Math.cos(rel) * Math.sin(raz),
      Math.sin(rel),
      Math.cos(rel) * Math.cos(raz)
    ).normalize();
  }, [surfaceRoughness, surfacePolish, fillLightColor, rimLightColor, rimLightIntensity, fillLightAzimuth, fillLightElevation, rimLightAzimuth, rimLightElevation]);

  const material = useMemo(() => {
    let mat: THREE.Material;
    if (botanicalMode) {
      // Botanical mode keeps MeshPhysicalMaterial — needs transmission for organic look
      mat = new THREE.MeshPhysicalMaterial({
        metalness: 0.05,
        roughness: 0.65,
        clearcoat: 0.2,
        clearcoatRoughness: 0.3,
        transmission: 0.3,
        thickness: 1.5,
        ior: 1.4,
      });
    } else if (renderStyle === 'toon') {
      mat = new THREE.MeshToonMaterial({
        transparent: opacity < 1,
        opacity,
      });
    } else {
      // Switched to MeshPhysicalMaterial for native anisotropy support —
      // bonds have a clear tangent direction (the bond axis), so we get
      // the brushed-metal streak effect that's correct for the geometry.
      // The cost over Standard is real but bounded (~10-15% more fragment
      // work for the anisotropy term); transmission/clearcoat are NOT
      // enabled here so we don't pay for those passes. Tangent attribute
      // is set on tubeGeo below; for our y-aligned cylinder it's always
      // (0, 1, 0, 1) per vertex.
      let matConfig: THREE.MeshPhysicalMaterialParameters = {};
      switch (materialPreset) {
        case 'matte':
          matConfig = { metalness: 0.05, roughness: 0.85 };
          break;
        case 'metallic':
          matConfig = { metalness: 0.8, roughness: 0.2, envMapIntensity: 2.0 };
          break;
        case 'glass':
          matConfig = { metalness: 0.3, roughness: 0.05, envMapIntensity: 1.5 };
          break;
        case 'plastic':
          matConfig = { metalness: 0.0, roughness: 0.4, envMapIntensity: 1.0 };
          break;
        case 'default':
        default:
          // Isotropic: the anisotropic streak (formerly 0.4) caused
          // specular strobing on thin moving cylinders and is gone.
          matConfig = { metalness: 0.35, roughness: 0.45, envMapIntensity: 1.0 };
          break;
      }
      mat = new THREE.MeshPhysicalMaterial({
        ...matConfig,
        clearcoat: surfaceClearcoat,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity,
      });
    }

    mat.onBeforeCompile = (shader) => {
      if (botanicalMode) {
        shader.uniforms.uTime = uniformsRef.current.uTime;
      }

      // Bond LOD via distance fade. uBondFadeStart and uBondFadeEnd are in
      // world units (Å). Bonds closer than start render fully opaque; those
      // beyond end are fully transparent (early-z rejection in the fragment
      // shader saves cost). Tied to a global ref via the existing uniformsRef
      // pattern so we don't churn the material.
      shader.uniforms.uBondFadeStart = { value: 60.0 };
      shader.uniforms.uBondFadeEnd = { value: 200.0 };

      shader.uniforms.uSurfaceRoughness = uniformsRef.current.uSurfaceRoughness;
      shader.uniforms.uSurfacePolish = uniformsRef.current.uSurfacePolish;

      shader.vertexShader = `
        attribute vec2 radiusBT;
        varying float vBondViewDist;
        ${botanicalMode ? 'uniform float uTime;' : ''}
        ${shader.vertexShader}
      `;

      // Flat per-half color: each bond's two instances carry a solid
      // endpoint color via instanceColor (default <color_vertex> handles
      // it). No per-fragment A→mid→B gradient and no per-bond material
      // gradient — that stack produced visual noise and bloom strobing.
      // metalness/roughness now come uniformly from the material preset.

      let vertexChunk = `
        #include <begin_vertex>
        // Taper bonds using per-instance radiusBT (bottom, top)
        float instanceRadius = mix(radiusBT.x, radiusBT.y, position.y + 0.5);
        transformed.x *= instanceRadius;
        transformed.z *= instanceRadius;
      `;

      if (botanicalMode) {
        vertexChunk += `
        // Organic wind sway based on world height (instanceMatrix[3].y)
        float heightFactor = max(0.0, instanceMatrix[3].y - 2.0);
        float swayAmount = heightFactor * 0.04;
        float noise = sin(uTime * 1.2 + instanceMatrix[3].x * 0.5 + instanceMatrix[3].z * 0.5);
        transformed.x += noise * swayAmount;
        transformed.z += cos(uTime * 0.9 + instanceMatrix[3].x) * swayAmount;
        `;
      }

      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', vertexChunk);

      // After project_vertex, mvPosition is the view-space coord. Capture
      // its negative z (= camera-relative distance, since camera looks -Z)
      // for the LOD fade in the fragment.
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        #include <project_vertex>
        vBondViewDist = -mvPosition.z;
        `,
      );

      // Bond LOD: fade alpha based on view distance. The fragment shader
      // runs early-z rejection on fully transparent fragments, so distant
      // bonds beyond uBondFadeEnd cost effectively nothing. The fade is
      // smoothstep so the boundary doesn't read as a hard ring.
      shader.fragmentShader = `
        varying float vBondViewDist;
        uniform float uBondFadeStart;
        uniform float uBondFadeEnd;
        uniform float uSurfaceRoughness;
        uniform float uSurfacePolish;
        uniform vec3 uFillLightColor;
        uniform vec3 uRimLightColor;
        uniform vec3 uFillLightDir;
        uniform vec3 uRimLightDir;
        uniform float uRimLight;
        ${shader.fragmentShader}
      `
      // Surface knobs still nudge the uniform material factors (the rig's
      // Roughness/Polish controls keep working); no per-bond gradient.
      .replace(
        '#include <metalnessmap_fragment>',
        `
        #include <metalnessmap_fragment>
        metalnessFactor = clamp(metalnessFactor + uSurfacePolish, 0.0, 1.0);
        `,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `
        #include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + uSurfaceRoughness, 0.0, 1.0);
        `,
      ).replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        float bondFade = 1.0 - smoothstep(uBondFadeStart, uBondFadeEnd, vBondViewDist);
        gl_FragColor.a *= bondFade;
        
        vec3 viewDir = normalize(vViewPosition);
        float ndotv = max(0.0, dot(geometryNormal, viewDir));
        float fresnel = pow(1.0 - ndotv, 4.0);
        
        // Additive rim lighting tinted by uRimLightColor, masked by directional light
        // Transforms world-space rim dir into view space for dot product
        vec3 rimLightViewDir = normalize((viewMatrix * vec4(uRimLightDir, 0.0)).xyz);
        float rimDirMask = max(0.0, dot(geometryNormal, rimLightViewDir));
        vec3 rimColor = uRimLightColor * fresnel * uRimLight * rimDirMask;
        
        // Wrap shading fill light contribution
        vec3 fillLightViewDir = normalize((viewMatrix * vec4(uFillLightDir, 0.0)).xyz);
        float wrapHalf = 0.5;
        float wrapNoL2 = max((dot(geometryNormal, fillLightViewDir) + wrapHalf) / (1.0 + wrapHalf), 0.0) * 0.3;
        vec3 fillColor = uFillLightColor * wrapNoL2;
        
        gl_FragColor.rgb += rimColor + fillColor;

        ${botanicalMode ? `
        // Velvet rim/fuzz (Schlick approximation)
        float botFresnel = pow(1.0 - ndotv, 3.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + vec3(0.15, 0.2, 0.05), botFresnel * 0.6);
        ` : ''}
        `,
      );
    };
    return mat;
  }, [renderStyle, opacity, botanicalMode, materialPreset]);

  // Cleanup
  useEffect(() => {
    return () => { tubeGeo.dispose(); };
  }, [tubeGeo]);

  useEffect(() => {
    return () => { material.dispose(); };
  }, [material]);

  // ─── Property data ─────────────────────────────────────────────────
  const isPropMode = colorMode === 'property' && colorProperty;
  const propData = isPropMode && frame.properties ? frame.properties.get(colorProperty) : null;

  const [autoMin, autoMax] = useMemo(() => {
    if (!propData) return [0, 1];
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < propData.length; i++) {
      if (propData[i] < mn) mn = propData[i];
      if (propData[i] > mx) mx = propData[i];
    }
    return [mn === Infinity ? 0 : mn, mx === -Infinity ? 1 : mx];
  }, [propData]);

  const pMin = propRange?.[0] ?? autoMin;
  const pMax = propRange?.[1] ?? autoMax;


  // Upload instance matrices + colors. Extracted into a callback so we can
  // invoke it both on dep change AND on mesh remount (R3F remounts the mesh
  // when entering WebXR, and rAF is paused during the session-start transition
  // so a normal useEffect won't fire on the new mesh until too late).
  // ─── Upload split — matrix-only fast path + attribute (color/radius) path ─
  // Architectural goal: matrices change every frame during interpolation,
  // but per-bond colors and radii only change in property mode. Splitting
  // these into two effects with distinct deps means non-property modes pay
  // ~35% less GPU upload bandwidth per frame (matrices only, ~1.7MB at 27k
  // bonds vs. 2.6MB combined). The two callbacks share their setup but
  // touch disjoint cpu arrays — net work is similar to the single pass,
  // but the per-frame upload to the GPU is leaner.

  /** Compute per-bond INSTANCE MATRICES from interpolated positions. Writes
   *  cpuMatrixArray and uploads instanceMatrix only. Runs on frame /
   *  interpolation / periodic changes. */
  const uploadBondMatrices = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh || halfCount === 0) return;
    if (!mesh.instanceMatrix) return;

    const drawCount = Math.min(halfCount, capacity);
    const t = interpolationFactor ?? 0;
    const positions = frame.positions;
    const nextPos = nextFrame?.positions;
    const pbcBox = frame.boxBounds ?? cellBounds;

    for (let i = 0; i < drawCount / 2; i++) {
      const a = bondPairs[i * 2];
      const b = bondPairs[i * 2 + 1];
      let ax = positions[a * 3];
      let ay = positions[a * 3 + 1];
      let az = positions[a * 3 + 2];
      let bx = positions[b * 3];
      let by = positions[b * 3 + 1];
      let bz = positions[b * 3 + 2];

      const canInterpolate = nextFrame && t > 0 && nextPos && nextPos.length >= positions.length;
      if (canInterpolate) {
        let d_ax = nextPos[a * 3] - ax;
        let d_ay = nextPos[a * 3 + 1] - ay;
        let d_az = nextPos[a * 3 + 2] - az;
        let d_bx = nextPos[b * 3] - bx;
        let d_by = nextPos[b * 3 + 1] - by;
        let d_bz = nextPos[b * 3 + 2] - bz;

        if (frame.boxBounds) {
          const bsx = frame.boxBounds[1] - frame.boxBounds[0];
          const bsy = frame.boxBounds[3] - frame.boxBounds[2];
          const bsz = frame.boxBounds[5] - frame.boxBounds[4];
          if (d_ax > bsx / 2) d_ax -= bsx;
          if (d_ax < -bsx / 2) d_ax += bsx;
          if (d_bx > bsx / 2) d_bx -= bsx;
          if (d_bx < -bsx / 2) d_bx += bsx;
          if (d_ay > bsy / 2) d_ay -= bsy;
          if (d_ay < -bsy / 2) d_ay += bsy;
          if (d_by > bsy / 2) d_by -= bsy;
          if (d_by < -bsy / 2) d_by += bsy;
          if (d_az > bsz / 2) d_az -= bsz;
          if (d_az < -bsz / 2) d_az += bsz;
          if (d_bz > bsz / 2) d_bz -= bsz;
          if (d_bz < -bsz / 2) d_bz += bsz;
        }
        ax += d_ax * t;
        ay += d_ay * t;
        az += d_az * t;
        bx += d_bx * t;
        by += d_by * t;
        bz += d_bz * t;
      }

      if (periodic && pbcBox) {
        let diffx = bx - ax;
        let diffy = by - ay;
        let diffz = bz - az;
        const lx = pbcBox[1] - pbcBox[0];
        const ly = pbcBox[3] - pbcBox[2];
        const lz = pbcBox[5] - pbcBox[4];
        if (Math.abs(diffx) > lx * 0.5) diffx -= Math.sign(diffx) * lx;
        if (Math.abs(diffy) > ly * 0.5) diffy -= Math.sign(diffy) * ly;
        if (Math.abs(diffz) > lz * 0.5) diffz -= Math.sign(diffz) * lz;
        bx = ax + diffx;
        by = ay + diffy;
        bz = az + diffz;
      }

      const dx = bx - ax;
      const dy = by - ay;
      const dz = bz - az;
      const bondLenSq = dx * dx + dy * dy + dz * dz;
      if (bondLenSq === 0) continue;
      const bondLen = Math.sqrt(bondLenSq);
      const halfLen = bondLen * 0.5;

      const nx = dx / bondLen;
      const ny = dy / bondLen;
      const nz = dz / bondLen;
      let upX = 0, upY = 1, upZ = 0;
      if (Math.abs(ny) > 0.999) { upX = 1; upY = 0; upZ = 0; }
      let ux = upY * nz - upZ * ny;
      let uy = upZ * nx - upX * nz;
      let uz = upX * ny - upY * nx;
      const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
      ux /= uLen; uy /= uLen; uz /= uLen;
      const vx = uy * nz - uz * ny;
      const vy = uz * nx - ux * nz;
      const vz = ux * ny - uy * nx;

      const midAx = ax + dx * 0.25, midAy = ay + dy * 0.25, midAz = az + dz * 0.25;
      let offA = (i * 2) * 16;
      cpuMatrixArray[offA + 0] = ux; cpuMatrixArray[offA + 1] = uy; cpuMatrixArray[offA + 2] = uz; cpuMatrixArray[offA + 3] = 0;
      cpuMatrixArray[offA + 4] = nx * halfLen; cpuMatrixArray[offA + 5] = ny * halfLen; cpuMatrixArray[offA + 6] = nz * halfLen; cpuMatrixArray[offA + 7] = 0;
      cpuMatrixArray[offA + 8] = vx; cpuMatrixArray[offA + 9] = vy; cpuMatrixArray[offA + 10] = vz; cpuMatrixArray[offA + 11] = 0;
      cpuMatrixArray[offA + 12] = midAx; cpuMatrixArray[offA + 13] = midAy; cpuMatrixArray[offA + 14] = midAz; cpuMatrixArray[offA + 15] = 1;

      const midBx = ax + dx * 0.75, midBy = ay + dy * 0.75, midBz = az + dz * 0.75;
      let offB = (i * 2 + 1) * 16;
      cpuMatrixArray[offB + 0] = ux; cpuMatrixArray[offB + 1] = uy; cpuMatrixArray[offB + 2] = uz; cpuMatrixArray[offB + 3] = 0;
      cpuMatrixArray[offB + 4] = nx * halfLen; cpuMatrixArray[offB + 5] = ny * halfLen; cpuMatrixArray[offB + 6] = nz * halfLen; cpuMatrixArray[offB + 7] = 0;
      cpuMatrixArray[offB + 8] = vx; cpuMatrixArray[offB + 9] = vy; cpuMatrixArray[offB + 10] = vz; cpuMatrixArray[offB + 11] = 0;
      cpuMatrixArray[offB + 12] = midBx; cpuMatrixArray[offB + 13] = midBy; cpuMatrixArray[offB + 14] = midBz; cpuMatrixArray[offB + 15] = 1;
    }

    // GPU upload — matrix only. Defensive cap (see uploadBonds bug fix memo).
    const dstMat = mesh.instanceMatrix.array as Float32Array;
    const meshMatrixCap = (dstMat.length / 16) | 0;
    const totalBonds = Math.min(drawCount, meshMatrixCap);
    dstMat.set(cpuMatrixArray.subarray(0, totalBonds * 16));
    mesh.count = totalBonds;
    mesh.instanceMatrix.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bondPairs, halfCount, capacity, frame, nextFrame, interpolationFactor, periodic, cellBounds]);

  /** Compute per-bond COLORS and RADII. Writes cpuColorBArray, cpuColorTArray,
   *  cpuRadiusBTArray and uploads instanceColor + colorT + radiusBT. Runs on
   *  bondPairs / scheme / colorMode / property data changes. In non-property
   *  modes, this fires only when the bond set changes — not per playback
   *  frame, saving ~35% of upload bandwidth. In property mode it fires per
   *  frame because per-atom values interpolate. */
  // Bond-stability cache: when the worker emits a fresh Int32Array whose
  // CONTENT matches the last upload AND we're in a static-color mode (not
  // property / not length / not energy / not screening), the attributes
  // haven't changed — skip the entire iteration + GPU upload. Saves ~1-3ms
  // and avoids re-uploading 1MB of color/radius data per stable playback
  // frame. The check is a content-equality walk; for 27k bonds it's ~0.3ms,
  // a fraction of the work it skips.
  const lastAttrBondPairsRef = useRef<Int32Array | null>(null);

  const uploadBondAttributes = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh || halfCount === 0) return;

    // In any of these modes, color depends on per-frame data and we must
    // recompute every call regardless of bondPairs stability.
    const isFrameDepColors =
      isPropMode ||
      bondColorMode === 'length' ||
      bondColorMode === 'energy' ||
      bondColorMode === 'screening';

    if (
      !isFrameDepColors &&
      lastAttrBondPairsRef.current !== null &&
      bondPairsContentEqual(bondPairs, lastAttrBondPairsRef.current)
    ) {
      return; // bonds + color params unchanged — nothing to upload
    }

    const drawCount = Math.min(halfCount, capacity);
    const t = interpolationFactor ?? 0;
    const hasPropInterpolation = isPropMode && nextFrame && t > 0 && nextFrame.properties && nextFrame.properties.has(colorProperty!);
    const nextPropData = hasPropInterpolation ? nextFrame.properties!.get(colorProperty!) : null;
    const mapFn = COLORMAPS[colormap] || COLORMAPS.viridis;

    // Build type normalization map to match AtomsOptimized.tsx
    const typeSet = new Set<number>();
    if (frame.types) {
      for (let i = 0; i < frame.natoms; i++) typeSet.add(frame.types[i]);
    }
    const sortedTypes = Array.from(typeSet).sort((a, b) => a - b);
    const typeToNorm = new Map<number, number>();
    for (let j = 0; j < sortedTypes.length; j++) {
      typeToNorm.set(sortedTypes[j], sortedTypes.length > 1 ? j / (sortedTypes.length - 1) : 0.5);
    }

    // Auto-compute local min/max for prop mapping if not supplied
    let pMin = propRange?.[0] ?? 0;
    let pMax = propRange?.[1] ?? 1;
    if (isPropMode && propData && !propRange) {
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < frame.natoms; i++) {
        if (propData[i] < min) min = propData[i];
        if (propData[i] > max) max = propData[i];
      }
      pMin = min;
      pMax = max;
    }

    // Precompute bond-distance range for length coloring mode (avoids O(N²))
    let distMin = 0, distMax = 1, distRange = 1;
    if (bondColorMode === 'length' && bondDistances.length >= bondCount) {
      distMin = Infinity; distMax = -Infinity;
      for (let k = 0; k < bondCount; k++) {
        if (bondDistances[k] < distMin) distMin = bondDistances[k];
        if (bondDistances[k] > distMax) distMax = bondDistances[k];
      }
      distRange = distMax - distMin || 1;
    }

    for (let i = 0; i < drawCount / 2; i++) {
      const a = bondPairs[i * 2];
      const b = bondPairs[i * 2 + 1];

      // Property mode: interpolate normalized values per atom for radii+colors.
      let normA = 0.5, normB = 0.5;
      if (isPropMode && propData) {
        let valA = propData[a];
        if (nextPropData && nextPropData.length > a) valA += (nextPropData[a] - valA) * t;
        normA = pMax > pMin ? (valA - pMin) / (pMax - pMin) : 0.5;

        let valB = propData[b];
        if (nextPropData && nextPropData.length > b) valB += (nextPropData[b] - valB) * t;
        normB = pMax > pMin ? (valB - pMin) / (pMax - pMin) : 0.5;
      }

      const rA = isPropMode ? radius * (0.2 + 1.8 * normA) : radius;
      const rB = isPropMode ? radius * (0.2 + 1.8 * normB) : radius;
      const rMid = (rA + rB) / 2.0;

      // Radii (instance i*2 = bottom half A→Mid, instance i*2+1 = top half Mid→B)
      cpuRadiusBTArray[(i * 2) * 2] = rA;
      cpuRadiusBTArray[(i * 2) * 2 + 1] = rMid;
      cpuRadiusBTArray[(i * 2 + 1) * 2] = rMid;
      cpuRadiusBTArray[(i * 2 + 1) * 2 + 1] = rB;

      // ─── Bond Color Logic ─────────────────────────────────────────────
      // Per-bond modes (length/energy/screening): same color along the whole
      // bond. Both halves get B == T == that color, so the shader's lerp is
      // a no-op and the bond reads as uniform — current behavior preserved.
      // Per-atom modes (type/property/uniform/botanical): the gradient is
      // visible. tcA at the A end, tcB at the B end, midpoint is the average.
      if (bondColorMode === 'length' && bondDistances.length > i) {
        const normDist = (bondDistances[i] - distMin) / distRange;
        const tcLen = mapFn(normDist);
        const offA = (i * 2) * 3;
        const offB = (i * 2 + 1) * 3;
        cpuColorBArray[offA] = tcLen[0]; cpuColorBArray[offA + 1] = tcLen[1]; cpuColorBArray[offA + 2] = tcLen[2];
        cpuColorTArray[offA] = tcLen[0]; cpuColorTArray[offA + 1] = tcLen[1]; cpuColorTArray[offA + 2] = tcLen[2];
        cpuColorBArray[offB] = tcLen[0]; cpuColorBArray[offB + 1] = tcLen[1]; cpuColorBArray[offB + 2] = tcLen[2];
        cpuColorTArray[offB] = tcLen[0]; cpuColorTArray[offB + 1] = tcLen[1]; cpuColorTArray[offB + 2] = tcLen[2];
      } else {
        // Endpoint colors must match what AtomsOptimized used for the same
        // type, otherwise the bond gradient terminates in colors that don't
        // exist on the atoms it connects. Mirror that branch structure here.
        const colorForType = (typeId: number): [number, number, number] => {
          if (botanicalMode || atomColorSource === 'botanical') {
            return BOTANICAL_COLORS[typeId] ?? [0.3, 0.5, 0.2];
          }
          if (atomColorSource === 'element') {
            return hexToRgb(getElementSpec(typeId).color);
          }
          // 'colormap'
          return mapFn(typeToNorm.get(typeId) ?? 0.5);
        };

        let tcA: [number, number, number];
        if (isPropMode && propData) {
          tcA = mapFn(normA);
        } else if (colorMode === 'uniform') {
          tcA = mapFn(0.0);
        } else {
          tcA = frame.types ? colorForType(frame.types[a]) : DEFAULT_TYPE_COLOR;
        }

        let tcB: [number, number, number];
        if (isPropMode && propData) {
          tcB = mapFn(normB);
        } else if (colorMode === 'uniform') {
          tcB = mapFn(0.0);
        } else {
          tcB = frame.types ? colorForType(frame.types[b]) : DEFAULT_TYPE_COLOR;
        }

        // Flat per-half: instance i*2 = solid A, instance i*2+1 = solid B.
        // Hard split at the geometric midpoint — the universal 2-tone bond
        // convention. colorT writes retained (attribute still allocated;
        // shader ignores it) until the Phase-2 buffer prune.
        const offA = (i * 2) * 3;
        cpuColorBArray[offA] = tcA[0]; cpuColorBArray[offA + 1] = tcA[1]; cpuColorBArray[offA + 2] = tcA[2];
        cpuColorTArray[offA] = tcA[0]; cpuColorTArray[offA + 1] = tcA[1]; cpuColorTArray[offA + 2] = tcA[2];

        const offB = (i * 2 + 1) * 3;
        cpuColorBArray[offB] = tcB[0]; cpuColorBArray[offB + 1] = tcB[1]; cpuColorBArray[offB + 2] = tcB[2];
        cpuColorTArray[offB] = tcB[0]; cpuColorTArray[offB + 1] = tcB[1]; cpuColorTArray[offB + 2] = tcB[2];

        // ─── Per-bond material identity ────────────────────────────────
        // Lookup PBR metalness/roughness from each atom's element profile;
        // gradient across the bond mirrors the color gradient. A Au–Au
        // bond reads gold-shiny end-to-end; an Au–O bond transitions
        // gold→ceramic exactly through the seam. Falls back to a neutral
        // default when atom types aren't known.
        const profA = frame.types ? getElementProfile(frame.types[a]) : DEFAULT_PROFILE;
        const profB = frame.types ? getElementProfile(frame.types[b]) : DEFAULT_PROFILE;
        const midMet = (profA.metalness + profB.metalness) * 0.5;
        const midRough = (profA.roughness + profB.roughness) * 0.5;
        // Bottom half: B = atomA's profile, T = midpoint
        const matOffA = (i * 2) * 4;
        cpuMaterialBTArray[matOffA + 0] = profA.metalness;
        cpuMaterialBTArray[matOffA + 1] = profA.roughness;
        cpuMaterialBTArray[matOffA + 2] = midMet;
        cpuMaterialBTArray[matOffA + 3] = midRough;
        // Top half: B = midpoint, T = atomB's profile
        const matOffB = (i * 2 + 1) * 4;
        cpuMaterialBTArray[matOffB + 0] = midMet;
        cpuMaterialBTArray[matOffB + 1] = midRough;
        cpuMaterialBTArray[matOffB + 2] = profB.metalness;
        cpuMaterialBTArray[matOffB + 3] = profB.roughness;
      }
    }

    // ─── GPU upload — colors + radii only. Matrix is owned by uploadBondMatrices.
    const dstColRaw = mesh.instanceColor ? (mesh.instanceColor.array as Float32Array) : null;
    const meshColorCap = dstColRaw ? (dstColRaw.length / 3) | 0 : Infinity;
    const dstColorTArr = tubeGeo.attributes.colorT.array as Float32Array;
    const colorTCap = (dstColorTArr.length / 3) | 0;
    const dstRadiusBTArr = tubeGeo.attributes.radiusBT.array as Float32Array;
    const radiusBTCap = (dstRadiusBTArr.length / 2) | 0;
    const dstMaterialBTArr = tubeGeo.attributes.materialBT.array as Float32Array;
    const materialBTCap = (dstMaterialBTArr.length / 4) | 0;

    const totalBonds = Math.min(drawCount, meshColorCap, colorTCap, radiusBTCap, materialBTCap);
    if (totalBonds < drawCount) {
      console.warn(
        `[Bonds] attribute capacity mismatch — wanted ${drawCount}, color=${meshColorCap} colorT=${colorTCap} radiusBT=${radiusBTCap}; clipping.`,
      );
    }

    if (dstColRaw) dstColRaw.set(cpuColorBArray.subarray(0, totalBonds * 3));
    dstColorTArr.set(cpuColorTArray.subarray(0, totalBonds * 3));
    dstRadiusBTArr.set(cpuRadiusBTArray.subarray(0, totalBonds * 2));
    dstMaterialBTArr.set(cpuMaterialBTArray.subarray(0, totalBonds * 4));

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    (tubeGeo.attributes.colorT as any).needsUpdate = true;
    (tubeGeo.attributes.colorT as any).updateRange = { offset: 0, count: totalBonds * 3 };
    (tubeGeo.attributes.radiusBT as any).needsUpdate = true;
    (tubeGeo.attributes.radiusBT as any).updateRange = { offset: 0, count: totalBonds * 2 };
    (tubeGeo.attributes.materialBT as any).needsUpdate = true;
    (tubeGeo.attributes.materialBT as any).updateRange = { offset: 0, count: totalBonds * 4 };

    // Cache the bondPairs we just uploaded for the next stability check.
    lastAttrBondPairsRef.current = bondPairs;
    // Deps: NO frame.positions / nextFrame / interpolationFactor / periodic —
    // those drive matrices, not attributes. In property mode `propData` (a
    // per-frame Float32Array) IS in deps, so attribute updates do fire per
    // frame for property coloring. In static modes (type/element/uniform/
    // botanical), propData is null and frame changes don't refire this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bondPairs, bondDistances, halfCount, capacity, frame.types, frame.natoms, colormap, colorMode, isPropMode, propData, propRange, radius, atomColorSource, botanicalMode, bondColorMode, nextFrame, interpolationFactor, colorProperty]);

  // Matrix upload runs in the rAF loop, NOT in a useEffect. This bypasses
  // React's commit cycle so per-frame matrix updates flow at native rAF
  // cadence — no reconciliation overhead between bond detection and the
  // GPU upload. The closure captures the latest props/state via R3F's
  // useFrame-on-render pattern (R3F replaces the registered callback on
  // every component render with the freshly-closed function).
  //
  // A dirty check skips the upload entirely when nothing changed since the
  // last call — paused playback with stable bondPairs and zero interpolation
  // costs nothing per frame.
  const lastMatrixKeyRef = useRef<{
    frame: typeof frame | null;
    nextFrame: typeof nextFrame;
    interp: number;
    bondPairs: typeof bondPairs | null;
    capacity: number;
  }>({ frame: null, nextFrame: undefined, interp: -1, bondPairs: null, capacity: 0 });

  useFrame(() => {
    if (botanicalMode) {
      uniformsRef.current.uTime.value = timer.getElapsedTime();
    }

    // Skip when nothing that affects matrices has changed since last upload.
    // capacity remounts the mesh via key, so capacity flips also trigger an
    // upload (the mesh ref is fresh, instanceMatrix needs filling).
    const last = lastMatrixKeyRef.current;
    const interp = interpolationFactor ?? 0;
    if (
      last.frame === frame &&
      last.nextFrame === nextFrame &&
      last.interp === interp &&
      last.bondPairs === bondPairs &&
      last.capacity === capacity
    ) {
      return;
    }
    uploadBondMatrices();
    last.frame = frame;
    last.nextFrame = nextFrame;
    last.interp = interp;
    last.bondPairs = bondPairs;
    last.capacity = capacity;
  });

  // Attributes path stays on useEffect — its deps fire only on bond-set or
  // scheme changes (rare), so React's commit cycle is the right gate. In
  // property mode the deps include propData which changes per frame, so
  // attributes fire per frame in that case (same cost as before).
  useEffect(() => {
    uploadBondAttributes();
  }, [uploadBondAttributes]);

  // Handle R3F remounts on WebXR session entry. rAF is paused during the
  // transition, so we schedule the uploads via setTimeout (same pattern as
  // Atoms / AtomsOptimized — see commit 17a0b66). Both passes are needed
  // because a remount loses both matrix and attribute buffers.
  const onMeshRef = useCallback((mesh: THREE.InstancedMesh | null) => {
    if (mesh) {
      (meshRef as any).current = mesh;
      setTimeout(() => {
        uploadBondMatrices();
        uploadBondAttributes();
      }, 0);
    }
  }, [uploadBondMatrices, uploadBondAttributes]);

  return (
    // `key={capacity}` forces R3F to fully remount the InstancedMesh when
    // the capacity ratchet bumps. Without it, R3F may update the mesh's
    // count prop without resizing instanceMatrix/instanceColor — and our
    // upload would write past the typed-array bounds. Capacity changes are
    // rare (once per file load typically), so the brief remount is cheap.
    <instancedMesh
      key={capacity}
      ref={onMeshRef}
      args={[tubeGeo, material, capacity]}
      frustumCulled={false}
      visible={visible && halfCount > 0}
    >
      <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(capacity * 3), 3]} />
    </instancedMesh>
  );
}

/** Predefined bond cutoffs for common elements (Angstroms) */
export const DEFAULT_CUTOFFS: Map<string, number> = new Map([
  ['Cu-Cu', 2.8], ['Cu-O', 2.0],
  ['O-O', 1.6],   ['O-H', 1.2],
  ['C-C', 1.8],   ['C-H', 1.1],
  ['Si-O', 1.7],  ['Al-O', 1.9],
  ['Fe-O', 2.1],  ['Fe-Fe', 2.5],
]);

/** Build type cutoff map from element symbols */
export function buildTypeCutoffs(
  typeToElement: Map<number, string>,
  cutoffs: Map<string, number> = DEFAULT_CUTOFFS
): Map<string, number> {
  const result = new Map<string, number>();

  for (const [type1, elem1] of typeToElement) {
    for (const [type2, elem2] of typeToElement) {
      const key1 = `${elem1}-${elem2}`;
      const key2 = `${elem2}-${elem1}`;
      const cutoff = cutoffs.get(key1) ?? cutoffs.get(key2);
      if (cutoff) {
        result.set(`${type1}-${type2}`, cutoff);
      }
    }
  }

  return result;
}
