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
import type { Frame, ColormapName, RenderStyle, BondStats } from '@atlas/core/types';
import { getElementSpec } from '@atlas/core';
import { useGlobalTimer } from './useTimer';
import { DEFAULT_TYPE_COLOR, getTypeColorFromColormap, BOTANICAL_COLORS, COLORMAPS } from './constants';
// Vite worker import: the `?worker` suffix triggers proper bundling so the
// production output is a real .js worker module, not a raw .ts asset.
// The triple-slash reference above pulls in the ambient `?worker` module
// declaration from vite-env.d.ts so this resolves both in @atlas/scene's
// own tsc run and in any consumer (e.g. @atlas/ui) that compiles this file
// via the path alias — its `include` would otherwise miss sibling .d.ts.
import BondWorkerCtor from './bondWorker.ts?worker';

interface BondsProps {
  frame: Frame;
  nextFrame?: Frame;
  interpolationFactor?: number;
  colormap?: ColormapName;
  colorMode?: 'type' | 'uniform' | 'property';
  colorProperty?: string;
  propRange?: [number, number];
  maxBondLength?: number;
  typeCutoffs?: Map<string, number>;
  periodic?: boolean;
  cellBounds?: [number, number, number, number, number, number];
  radius?: number;
  opacity?: number;
  renderStyle?: RenderStyle;
  botanicalMode?: boolean;
  materialPreset?: 'default' | 'matte' | 'metallic' | 'glass' | 'plastic';
  visible?: boolean;
  onBondStats?: (stats: BondStats | null) => void;
  bondColorMode?: 'type' | 'length' | 'uniform';
  filamentMode?: boolean;
  meamScreening?: boolean;
}

export function Bonds({
  frame,
  nextFrame,
  interpolationFactor,
  colormap = 'viridis',
  colorMode = 'type',
  colorProperty,
  propRange,
  maxBondLength = 2.5,
  typeCutoffs,
  periodic = false,
  cellBounds,
  radius = 0.12,
  opacity = 0.85,
  renderStyle = 'standard',
  botanicalMode = false,
  materialPreset = 'default',
  visible = true,
  onBondStats,
  bondColorMode = 'type',
  filamentMode = false,
  meamScreening = false,
}: BondsProps) {
  const timer = useGlobalTimer();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const workerRef = useRef<Worker | null>(null);

  // Bond pair data from the worker
  const [bondPairs, setBondPairs] = useState<Int32Array>(new Int32Array(0));
  const [screeningFactors, setScreeningFactors] = useState<Float32Array | null>(null);
  const bondCount = bondPairs.length / 2;
  const halfCount = bondCount * 2; // Each bond → 2 half-cylinders

  // ─── Compute bond statistics from detected pairs ────────────────────
  const bondStats = useMemo<BondStats | null>(() => {
    if (bondCount === 0 || !frame || frame.natoms < 2) return null;

    const positions = frame.positions;
    const types = frame.types;
    const count = bondCount;

    // Accumulators
    let minLen = Infinity;
    let maxLen = -Infinity;
    let sum = 0;
    let sumSq = 0;

    const typePairCounts: Record<string, number> = {};
    const typePairSums: Record<string, number> = {};

    // First pass: compute lengths + basic stats
    const lengths = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = bondPairs[i * 2];
      const b = bondPairs[i * 2 + 1];
      const dx = positions[b * 3] - positions[a * 3];
      const dy = positions[b * 3 + 1] - positions[a * 3 + 1];
      const dz = positions[b * 3 + 2] - positions[a * 3 + 2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      lengths[i] = len;

      if (len < minLen) minLen = len;
      if (len > maxLen) maxLen = len;
      sum += len;
      sumSq += len * len;

      if (types) {
        const specA = getElementSpec(types[a]);
        const specB = getElementSpec(types[b]);
        const symA = specA?.symbol ?? `T${types[a]}`;
        const symB = specB?.symbol ?? `T${types[b]}`;
        const pairKey = symA < symB ? `${symA}–${symB}` : `${symB}–${symA}`;
        typePairCounts[pairKey] = (typePairCounts[pairKey] ?? 0) + 1;
        typePairSums[pairKey] = (typePairSums[pairKey] ?? 0) + len;
      }
    }

    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    const stdDev = Math.sqrt(Math.max(0, variance));

    // Percentiles: exact sort for ≤200k, histogram for larger
    let median = mean;
    const percentiles: Record<string, number> = {};

    const HIST_BINS = 30;
    const binEdges: number[] = new Array(HIST_BINS + 1);
    const bins: number[] = new Array(HIST_BINS).fill(0);
    const range = maxLen - minLen;

    for (let b = 0; b <= HIST_BINS; b++) {
      binEdges[b] = minLen + (range * b) / HIST_BINS;
    }

    if (range > 0) {
      for (let i = 0; i < count; i++) {
        const len = lengths[i];
        let binIdx = Math.floor(((len - minLen) / range) * HIST_BINS);
        if (binIdx < 0) binIdx = 0;
        if (binIdx >= HIST_BINS) binIdx = HIST_BINS - 1;
        bins[binIdx]++;
      }
    } else {
      // All bonds have identical length
      bins[0] = count;
    }

    if (count <= 200_000) {
      // Exact sort
      const sorted = Array.from(lengths).sort((a, b) => a - b);
      const pct = (p: number) => sorted[Math.min(count - 1, Math.floor((p / 100) * count))];
      for (let p = 0; p <= 100; p += 5) {
        percentiles[`p${p}`] = pct(p);
      }
      median = percentiles.p50;
    } else {
      // Histogram-based percentile approximation
      const cumulative = new Array(HIST_BINS).fill(0);
      let running = 0;
      for (let b = 0; b < HIST_BINS; b++) {
        running += bins[b];
        cumulative[b] = running;
      }
      const getPct = (p: number) => {
        const target = (p / 100) * count;
        for (let b = 0; b < HIST_BINS; b++) {
          if (cumulative[b] >= target) {
            const prev = b > 0 ? cumulative[b - 1] : 0;
            const frac = bins[b] > 0 ? (target - prev) / bins[b] : 0;
            return binEdges[b] + frac * (binEdges[b + 1] - binEdges[b]);
          }
        }
        return maxLen;
      };
      for (let p = 0; p <= 100; p += 5) {
        percentiles[`p${p}`] = getPct(p);
      }
      median = percentiles.p50;
    }

    const typePairMeans: Record<string, number> = {};
    for (const key of Object.keys(typePairCounts)) {
      typePairMeans[key] = typePairSums[key] / typePairCounts[key];
    }

    // Find first minimum of bond-length histogram (proxy for coordination shell boundary)
    let bondLengthHistogramFirstMinimum: number | null = null;
    if (bins.length >= 5) {
      // 3-bin moving average smoothing
      const smoothed = bins.map((_, i) => {
        const a = bins[Math.max(0, i - 1)];
        const b = bins[i];
        const c = bins[Math.min(bins.length - 1, i + 1)];
        return (a + b + c) / 3;
      });
      // Find first peak (skip first 2 bins)
      let peakIdx = -1;
      for (let i = 2; i < smoothed.length - 1; i++) {
        if (smoothed[i] > smoothed[i - 1] && smoothed[i] >= smoothed[i + 1]) {
          peakIdx = i;
          break;
        }
      }
      // Find first minimum after peak
      if (peakIdx !== -1) {
        for (let i = peakIdx + 1; i < smoothed.length - 1; i++) {
          if (smoothed[i] < smoothed[i - 1] && smoothed[i] <= smoothed[i + 1]) {
            bondLengthHistogramFirstMinimum = binEdges[i];
            break;
          }
        }
      }
    }

    return {
      count,
      minLength: minLen,
      maxLength: maxLen,
      meanLength: mean,
      medianLength: median,
      stdDev,
      histogram: { bins: Array.from(bins), binEdges },
      percentiles,
      typePairCounts,
      typePairMeans,
      bondLengthHistogramFirstMinimum,
    };
  }, [bondPairs, frame]);

  // Emit stats to parent
  useEffect(() => {
    onBondStats?.(bondStats);
  }, [bondStats, onBondStats]);

  // ─── Coordination numbers (for filament coloring) ───────────────────
  const coordinationNumbers = useMemo<Float32Array | null>(() => {
    if (!filamentMode || bondCount === 0 || !frame || frame.natoms < 2) return null;
    const cn = new Float32Array(frame.natoms);
    for (let i = 0; i < bondCount; i++) {
      const a = bondPairs[i * 2];
      const b = bondPairs[i * 2 + 1];
      if (a >= 0 && a < frame.natoms) cn[a]++;
      if (b >= 0 && b < frame.natoms) cn[b]++;
    }
    return cn;
  }, [filamentMode, bondPairs, bondCount, frame]);

  // Tube geometry — 8 radial segments for smoother filament look
  const tubeGeo = useMemo(
    () => new THREE.CylinderGeometry(1, 1, 1, filamentMode ? 8 : 5, 1),
    [filamentMode]
  );

  // ─── Web Worker lifecycle ──────────────────────────────────────────
  useEffect(() => {
    const worker = new BondWorkerCtor();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { bondPairs: pairs, count, screeningFactors: screening } = e.data;
      // pairs is Int32Array [a0,b0, a1,b1, ...]
      setBondPairs(pairs instanceof Int32Array ? pairs : new Int32Array(pairs));
      setScreeningFactors(screening instanceof Float32Array ? screening : null);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // ─── Dispatch bond detection to worker (debounced) ─────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track previous cutoff so we can distinguish slider-driven changes
  // (debounce) from playback frame advances (immediate). Must live at
  // component scope — calling useRef inside an effect violates the Rules of
  // Hooks and crashes the renderer on mount.
  const prevMaxBondLengthRef = useRef(maxBondLength);

  useEffect(() => {
    if (!workerRef.current || !frame || frame.natoms < 2) {
      setBondPairs(new Int32Array(0));
      return;
    }

    const isSliderChange = prevMaxBondLengthRef.current !== maxBondLength;
    prevMaxBondLengthRef.current = maxBondLength;

    const delay = isSliderChange ? 150 : 0;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const worker = workerRef.current;
      if (!worker) return;

      // Guard against frames missing types array (defensive for exotic parsers)
      if (!frame.types) {
        setBondPairs(new Int32Array(0));
        return;
      }

      // Send data to worker — positions and types are transferred (zero-copy)
      // We make copies since the originals are shared with the renderer
      const posCopy = new Float32Array(frame.positions);
      const typesCopy = new Int32Array(frame.types);

      worker.postMessage(
        {
          positions: posCopy,
          types: typesCopy,
          natoms: frame.natoms,
          maxBondLength,
          bonds: frame.bonds && frame.bonds.length > 0 ? new Int32Array(frame.bonds) : null,
          meamScreening,
        },
        [posCopy.buffer, typesCopy.buffer] // Transfer ownership
      );
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [frame, maxBondLength, meamScreening]);

  // ─── Capacity management ───────────────────────────────────────────
  const MIN_BOND_CAPACITY = 20000;
  const capacityRef = useRef(MIN_BOND_CAPACITY);
  if (halfCount > capacityRef.current) {
    capacityRef.current = Math.max(capacityRef.current * 1.5, Math.ceil(halfCount * 1.2));
  }
  const capacity = capacityRef.current;

  // CPU-side state arrays for bulk GPU upload
  const cpuMatrixArray = useMemo(() => new Float32Array(capacity * 16), [capacity]);
  const cpuColorArray = useMemo(() => new Float32Array(capacity * 3), [capacity]);
  const cpuRadiusBTArray = useMemo(() => new Float32Array(capacity * 2), [capacity]);
  const cpuCoordArray = useMemo(() => new Float32Array(capacity), [capacity]);

  // Stable args for the instancedBufferAttribute so R3F doesn't recreate it on every render
  const instanceColorArgs = useMemo<[Float32Array, number]>(() => [new Float32Array(capacity * 3), 3], [capacity]);
  const instanceCoordArgs = useMemo<[Float32Array, number]>(() => [new Float32Array(capacity), 1], [capacity]);

  // Working arrays for rendering/updating GPU buffers
  const radiusBTArray = useMemo(() => new Float32Array(capacity * 2), [capacity]);
  useEffect(() => {
    tubeGeo.setAttribute('radiusBT', new THREE.InstancedBufferAttribute(radiusBTArray, 2));
  }, [tubeGeo, radiusBTArray]);

  // Coordination number per instance (for filament coloring)
  const coordArray = useMemo(() => new Float32Array(capacity), [capacity]);
  useEffect(() => {
    tubeGeo.setAttribute('coord', new THREE.InstancedBufferAttribute(coordArray, 1));
  }, [tubeGeo, coordArray]);

  // Screening factor per instance (for MEAM ghosting)
  const cpuScreeningArray = useMemo(() => new Float32Array(capacity), [capacity]);
  useEffect(() => {
    tubeGeo.setAttribute('screening', new THREE.InstancedBufferAttribute(cpuScreeningArray, 1));
  }, [tubeGeo, cpuScreeningArray]);

  // ─── Material ──────────────────────────────────────────────────────
  const uniformsRef = useRef({
    uTime: { value: 0 },
    uColorLow: { value: new THREE.Color('#3b82f6') },
    uColorHigh: { value: new THREE.Color('#ef4444') },
  });

  const material = useMemo(() => {
    if (filamentMode) {
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime: uniformsRef.current.uTime,
          uColorLow: uniformsRef.current.uColorLow,
          uColorHigh: uniformsRef.current.uColorHigh,
        },
        vertexShader: `
          attribute vec2 radiusBT;
          attribute float coord;
          attribute float screening;

          uniform mat4 modelViewMatrix;
          uniform mat4 projectionMatrix;
          uniform mat3 normalMatrix;

          varying float vCoord;
          varying float vScreening;
          varying vec2 vBondUv;
          varying vec3 vNormal;
          varying vec3 vViewPosition;

          void main() {
            float r = mix(radiusBT.x, radiusBT.y, position.y + 0.5);
            vec3 transformed = position;
            transformed.x *= r;
            transformed.z *= r;

            vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            vCoord = coord;
            vScreening = screening;
            vBondUv = uv;
            vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
            vViewPosition = -mvPosition.xyz;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColorLow;
          uniform vec3 uColorHigh;

          varying float vCoord;
          varying float vScreening;
          varying vec2 vBondUv;
          varying vec3 vNormal;
          varying vec3 vViewPosition;

          void main() {
            vec3 viewDir = normalize(vViewPosition);
            float ndotv = max(dot(vNormal, viewDir), 0.0);
            float radialFalloff = pow(ndotv, 3.0);

            float coordNorm = clamp(vCoord / 12.0, 0.0, 1.0);
            vec3 filamentColor = mix(uColorLow, uColorHigh, coordNorm);

            float flow = sin(vBondUv.y * 20.0 + uTime * 3.0) * 0.3 + 0.7;

            // MEAM screening ghosting
            float screenFade = smoothstep(0.0, 0.3, vScreening);

            float alpha = radialFalloff * flow * 0.5 * screenFade;
            gl_FragColor = vec4(filamentColor * alpha * 2.5, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }

    let mat: THREE.Material;
    if (botanicalMode) {
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
      let matConfig: THREE.MeshPhysicalMaterialParameters = {};
      switch (materialPreset) {
        case 'matte':
          matConfig = { metalness: 0.05, roughness: 0.85, clearcoat: 0.0 };
          break;
        case 'metallic':
          matConfig = { metalness: 0.8, roughness: 0.2, clearcoat: 0.2, clearcoatRoughness: 0.2, envMapIntensity: 2.0 };
          break;
        case 'glass':
          matConfig = { metalness: 0.1, roughness: 0.1, transmission: 0.8, thickness: 1.5, ior: 1.5, transparent: true, clearcoat: 1.0, envMapIntensity: 1.5 };
          break;
        case 'plastic':
          matConfig = { metalness: 0.0, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 1.0 };
          break;
        case 'default':
        default:
          matConfig = { metalness: 0.1, roughness: 0.5, clearcoat: 0.1, envMapIntensity: 0.8 };
          break;
      }
      mat = new THREE.MeshPhysicalMaterial({
        ...matConfig,
        transparent: true,
        opacity,
      });
    }

    mat.onBeforeCompile = (shader) => {
      if (botanicalMode) {
        shader.uniforms.uTime = uniformsRef.current.uTime;
      }

      shader.vertexShader = `
        attribute vec2 radiusBT;
        ${botanicalMode ? 'uniform float uTime;' : ''}
        ${shader.vertexShader}
      `;

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

      if (botanicalMode) {
        shader.fragmentShader = `
          ${shader.fragmentShader}
        `;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          #include <dithering_fragment>
          // Velvet rim/fuzz (Schlick approximation)
          vec3 viewDir = normalize(vViewPosition);
          float ndotv = max(0.0, dot(geometryNormal, viewDir));
          float fresnel = pow(1.0 - ndotv, 3.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + vec3(0.15, 0.2, 0.05), fresnel * 0.6);
          `
        );
      }
    };
    return mat;
  }, [renderStyle, opacity, botanicalMode, materialPreset, filamentMode]);

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
  const uploadBonds = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh || halfCount === 0) return;

    if (!mesh.instanceMatrix) return;

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

    const positions = frame.positions;
    const nextPos = nextFrame?.positions;

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

      if (periodic && cellBounds) {
        let diffx = bx - ax;
        let diffy = by - ay;
        let diffz = bz - az;
        const lx = cellBounds[1] - cellBounds[0];
        const ly = cellBounds[3] - cellBounds[2];
        const lz = cellBounds[5] - cellBounds[4];

        if (Math.abs(diffx) > lx * 0.5) diffx -= Math.sign(diffx) * lx;
        if (Math.abs(diffy) > ly * 0.5) diffy -= Math.sign(diffy) * ly;
        if (Math.abs(diffz) > lz * 0.5) diffz -= Math.sign(diffz) * lz;

        bx = ax + diffx;
        by = ay + diffy;
        bz = az + diffz;
      }

      let dx = bx - ax;
      let dy = by - ay;
      let dz = bz - az;
      const bondLenSq = dx*dx + dy*dy + dz*dz;
      if (bondLenSq < 1e-12) continue; // skip degenerate / overlapping atoms
      
      const bondLen = Math.sqrt(bondLenSq);
      const halfLen = bondLen * 0.5;

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

      // Instance i*2 (Bottom half: A → Mid)
      cpuRadiusBTArray[(i * 2) * 2] = rA;
      cpuRadiusBTArray[(i * 2) * 2 + 1] = rMid;
      
      // Instance i*2+1 (Top half: Mid → B)
      cpuRadiusBTArray[(i * 2 + 1) * 2] = rMid;
      cpuRadiusBTArray[(i * 2 + 1) * 2 + 1] = rB;

      // Filament coordination & screening data
      if (filamentMode && coordinationNumbers) {
        cpuCoordArray[i * 2] = coordinationNumbers[a];
        cpuCoordArray[i * 2 + 1] = coordinationNumbers[b];
      }
      if (filamentMode && screeningFactors) {
        const s = screeningFactors[i];
        cpuScreeningArray[i * 2] = s;
        cpuScreeningArray[i * 2 + 1] = s;
      }

      // Inline Matrix math to skip massive THREE.Object3D overhead
      const nx = dx / bondLen;
      const ny = dy / bondLen;
      const nz = dz / bondLen;
      
      let upX = 0, upY = 1, upZ = 0;
      if (Math.abs(ny) > 0.999) {
          upX = 1; upY = 0; upZ = 0;
      }
      
      let ux = upY * nz - upZ * ny;
      let uy = upZ * nx - upX * nz;
      let uz = upX * ny - upY * nx;
      const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz);
      ux /= uLen; uy /= uLen; uz /= uLen;
      
      const vx = uy * nz - uz * ny;
      const vy = uz * nx - ux * nz;
      const vz = ux * ny - uy * nx;

      // Midpoints for Bottom (A -> Mid) and Top (Mid -> B)
      const midAx = ax + dx * 0.25;
      const midAy = ay + dy * 0.25;
      const midAz = az + dz * 0.25;

      let offA = (i * 2) * 16;
      cpuMatrixArray[offA + 0]  = ux;
      cpuMatrixArray[offA + 1]  = uy;
      cpuMatrixArray[offA + 2]  = uz;
      cpuMatrixArray[offA + 3]  = 0;
      cpuMatrixArray[offA + 4]  = nx * halfLen;
      cpuMatrixArray[offA + 5]  = ny * halfLen;
      cpuMatrixArray[offA + 6]  = nz * halfLen;
      cpuMatrixArray[offA + 7]  = 0;
      cpuMatrixArray[offA + 8]  = vx;
      cpuMatrixArray[offA + 9]  = vy;
      cpuMatrixArray[offA + 10] = vz;
      cpuMatrixArray[offA + 11] = 0;
      cpuMatrixArray[offA + 12] = midAx;
      cpuMatrixArray[offA + 13] = midAy;
      cpuMatrixArray[offA + 14] = midAz;
      cpuMatrixArray[offA + 15] = 1;

      const midBx = ax + dx * 0.75;
      const midBy = ay + dy * 0.75;
      const midBz = az + dz * 0.75;

      let offB = (i * 2 + 1) * 16;
      cpuMatrixArray[offB + 0]  = ux;
      cpuMatrixArray[offB + 1]  = uy;
      cpuMatrixArray[offB + 2]  = uz;
      cpuMatrixArray[offB + 3]  = 0;
      cpuMatrixArray[offB + 4]  = nx * halfLen;
      cpuMatrixArray[offB + 5]  = ny * halfLen;
      cpuMatrixArray[offB + 6]  = nz * halfLen;
      cpuMatrixArray[offB + 7]  = 0;
      cpuMatrixArray[offB + 8]  = vx;
      cpuMatrixArray[offB + 9]  = vy;
      cpuMatrixArray[offB + 10] = vz;
      cpuMatrixArray[offB + 11] = 0;
      cpuMatrixArray[offB + 12] = midBx;
      cpuMatrixArray[offB + 13] = midBy;
      cpuMatrixArray[offB + 14] = midBz;
      cpuMatrixArray[offB + 15] = 1;

      let tcA: [number, number, number];
      let tcB: [number, number, number];

      if (bondColorMode === 'length' && bondStats) {
        const lenNorm = bondStats.maxLength > bondStats.minLength
          ? (bondLen - bondStats.minLength) / (bondStats.maxLength - bondStats.minLength)
          : 0.5;
        const lenColor = mapFn(Math.max(0, Math.min(1, lenNorm)));
        tcA = lenColor;
        tcB = lenColor;
      } else {
        if (botanicalMode && frame.types) {
          tcA = BOTANICAL_COLORS[frame.types[a]] ?? [0.3, 0.5, 0.2];
        } else if (isPropMode && propData) {
          tcA = mapFn(normA);
        } else if (colorMode === 'uniform') {
          tcA = mapFn(0.0);
        } else {
          tcA = frame.types ? mapFn(typeToNorm.get(frame.types[a]) ?? 0.5) : DEFAULT_TYPE_COLOR;
        }

        if (botanicalMode && frame.types) {
          tcB = BOTANICAL_COLORS[frame.types[b]] ?? [0.3, 0.5, 0.2];
        } else if (isPropMode && propData) {
          tcB = mapFn(normB);
        } else if (colorMode === 'uniform') {
          tcB = mapFn(0.0);
        } else {
          tcB = frame.types ? mapFn(typeToNorm.get(frame.types[b]) ?? 0.5) : DEFAULT_TYPE_COLOR;
        }
      }
      cpuColorArray[(i * 2) * 3 + 0] = tcA[0];
      cpuColorArray[(i * 2) * 3 + 1] = tcA[1];
      cpuColorArray[(i * 2) * 3 + 2] = tcA[2];
      cpuColorArray[(i * 2 + 1) * 3 + 0] = tcB[0];
      cpuColorArray[(i * 2 + 1) * 3 + 1] = tcB[1];
      cpuColorArray[(i * 2 + 1) * 3 + 2] = tcB[2];
    }

    // ─── GPU upload ────────────────────────────────────────────────────
    const totalBonds = Math.min(halfCount, capacity);

    const dstMat = mesh.instanceMatrix.array as Float32Array;
    dstMat.set(cpuMatrixArray.subarray(0, totalBonds * 16));

    const dstCol = mesh.instanceColor ? (mesh.instanceColor.array as Float32Array) : null;
    if (dstCol) {
      dstCol.set(cpuColorArray.subarray(0, totalBonds * 3));
      (mesh.instanceColor as any).updateRange = { offset: 0, count: totalBonds * 3 };
    }

    const dstRadiusBT = tubeGeo.attributes.radiusBT.array as Float32Array;
    dstRadiusBT.set(cpuRadiusBTArray.subarray(0, totalBonds * 2));

    const dstCoord = tubeGeo.attributes.coord?.array as Float32Array | undefined;
    if (dstCoord) {
      dstCoord.set(cpuCoordArray.subarray(0, totalBonds));
      tubeGeo.attributes.coord.needsUpdate = true;
      (tubeGeo.attributes.coord as any).updateRange = { offset: 0, count: totalBonds };
    }

    const dstScreening = tubeGeo.attributes.screening?.array as Float32Array | undefined;
    if (dstScreening) {
      dstScreening.set(cpuScreeningArray.subarray(0, totalBonds));
      tubeGeo.attributes.screening.needsUpdate = true;
      (tubeGeo.attributes.screening as any).updateRange = { offset: 0, count: totalBonds };
    }

    mesh.count = totalBonds;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    tubeGeo.attributes.radiusBT.needsUpdate = true;
    (tubeGeo.attributes.radiusBT as any).updateRange = { offset: 0, count: totalBonds * 2 };
  }, [bondPairs, halfCount, capacity, tubeGeo, frame, nextFrame, interpolationFactor, colormap, colorMode, periodic, cellBounds, radius, botanicalMode, isPropMode, propData, pMin, pMax, colorProperty, cpuMatrixArray, cpuColorArray, cpuRadiusBTArray, cpuCoordArray, cpuScreeningArray, bondColorMode, bondStats, filamentMode, coordinationNumbers, meamScreening, screeningFactors]);

  useFrame(() => {
    if (botanicalMode || filamentMode) {
      uniformsRef.current.uTime.value = timer.getElapsedTime();
    }
  });

  useEffect(() => {
    uploadBonds();
  }, [uploadBonds]);

  // Handle R3F remounts on WebXR session entry. rAF is paused during the
  // transition, so we schedule the upload via setTimeout (same pattern as
  // Atoms / AtomsOptimized — see commit 17a0b66).
  const onMeshRef = useCallback((mesh: THREE.InstancedMesh | null) => {
    if (mesh) {
      (meshRef as any).current = mesh;
      setTimeout(() => uploadBonds(), 0);
    }
  }, [uploadBonds]);

  return (
    <instancedMesh
      ref={onMeshRef}
      args={[tubeGeo, material, capacity]}
      frustumCulled={false}
      visible={visible && halfCount > 0}
    >
      <instancedBufferAttribute attach="instanceColor" args={instanceColorArgs} />
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
