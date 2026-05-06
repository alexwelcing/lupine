/**
 * useBondGpuPipeline — React hook owning a WebGPU BondPipeline.
 *
 * Lazily initializes a WebGPU device + BondPipeline on first compute()
 * call. Capacity grows automatically when atom counts exceed the current
 * pipeline; each grow recreates the pipeline (rare during a session).
 *
 * On unmount, GPU resources are released via pipeline.destroy().
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BondPipeline, initWebGPU } from '@atlas/renderer';
import type { BondReadback } from '@atlas/renderer';

const GRID_DIM = 32;          // 32^3 = 32K cells. Adjust if working with millions of atoms.
const MAX_ATOMS_PER_CELL = 64;
const INITIAL_MAX_ATOMS = 100_000;
const INITIAL_MAX_BONDS = INITIAL_MAX_ATOMS * 12;

export interface BondGpuComputeInput {
  positions: Float32Array;
  types: Int32Array;
  natoms: number;
  covalentRadii: Float32Array; // indexed by atom type
  tolerance: number;
  maxBondLength: number;       // hard cap; sets the spatial cell size
  /** Optional explicit origin. If omitted, BondPipeline uses the min of
   *  positions computed during updatePositions. */
  origin?: [number, number, number];
  /** Optional simulation box extent; widens cellSize for sparse systems
   *  so the 32^3 grid still spans the full box. */
  boxExtent?: number;
}

export interface UseBondGpuPipelineResult {
  /** True once the device has been acquired and a pipeline exists. */
  ready: boolean;
  /** True when WebGPU is unavailable; caller should fall back to the worker. */
  unsupported: boolean;
  /** Run one compute+readback pass. Returns null when ready=false. */
  compute: (input: BondGpuComputeInput) => Promise<BondReadback | null>;
}

interface InternalState {
  device: GPUDevice | null;
  pipeline: BondPipeline | null;
  maxAtoms: number;
  maxBonds: number;
  initFailed: boolean;
}

export function useBondGpuPipeline(enabled: boolean): UseBondGpuPipelineResult {
  const [ready, setReady] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const stateRef = useRef<InternalState>({
    device: null,
    pipeline: null,
    maxAtoms: 0,
    maxBonds: 0,
    initFailed: false,
  });
  const initPromiseRef = useRef<Promise<boolean> | null>(null);

  // Eagerly initialize when enabled flips on. The first compute() call will
  // otherwise pay the init cost on the critical path of a frame.
  useEffect(() => {
    if (!enabled || stateRef.current.device || stateRef.current.initFailed) return;
    void ensureInitialized(stateRef, initPromiseRef, INITIAL_MAX_ATOMS, INITIAL_MAX_BONDS).then((ok) => {
      if (ok) setReady(true);
      else setUnsupported(true);
    });
  }, [enabled]);

  // Tear down when the pipeline is no longer wanted.
  useEffect(() => {
    return () => {
      if (stateRef.current.pipeline) {
        stateRef.current.pipeline.destroy();
        stateRef.current.pipeline = null;
      }
      stateRef.current.device = null;
      stateRef.current.maxAtoms = 0;
      stateRef.current.maxBonds = 0;
    };
  }, []);

  const compute = useCallback(async (input: BondGpuComputeInput): Promise<BondReadback | null> => {
    const target = Math.max(input.natoms, INITIAL_MAX_ATOMS);
    const targetBonds = Math.max(target * 12, INITIAL_MAX_BONDS);
    const ok = await ensureInitialized(stateRef, initPromiseRef, target, targetBonds);
    if (!ok) {
      setUnsupported(true);
      return null;
    }
    setReady(true);

    // Grow if the incoming frame outsizes the current pipeline.
    if (input.natoms > stateRef.current.maxAtoms) {
      const grown = await growPipeline(stateRef, input.natoms);
      if (!grown) return null;
    }

    const pipeline = stateRef.current.pipeline!;
    const device = stateRef.current.device!;

    // Pad covalentRadii to the 128-entry buffer the pipeline allocates.
    const radiiPadded = new Float32Array(128);
    radiiPadded.set(input.covalentRadii.subarray(0, Math.min(input.covalentRadii.length, 128)));
    pipeline.updateElementRadii(radiiPadded);

    pipeline.updatePositions(input.positions, input.types);

    // cellSize must be ≥ maxBondLength so the 3×3×3 neighbor scan covers all
    // candidate pairs. For sparse systems (large box, few atoms) coarsen the
    // cell so the 32-cell grid still spans the full box.
    const minCellFromBox = (input.boxExtent ?? 0) / GRID_DIM;
    const cellSize = Math.max(input.maxBondLength, minCellFromBox);

    pipeline.updateConfig(
      input.natoms,
      stateRef.current.maxBonds,
      input.tolerance,
      cellSize,
      input.origin,
    );

    const encoder = device.createCommandEncoder({ label: 'BondPipeline.compute' });
    pipeline.computeBonds(encoder, input.natoms);
    device.queue.submit([encoder.finish()]);

    return pipeline.readBondsAsync();
  }, []);

  return { ready, unsupported, compute };
}

async function ensureInitialized(
  stateRef: React.MutableRefObject<InternalState>,
  initPromiseRef: React.MutableRefObject<Promise<boolean> | null>,
  maxAtoms: number,
  maxBonds: number,
): Promise<boolean> {
  if (stateRef.current.pipeline) return true;
  if (stateRef.current.initFailed) return false;
  if (initPromiseRef.current) return initPromiseRef.current;

  initPromiseRef.current = (async () => {
    const result = await initWebGPU();
    if (!result) {
      stateRef.current.initFailed = true;
      return false;
    }
    stateRef.current.device = result.device;
    stateRef.current.pipeline = new BondPipeline({
      device: result.device,
      maxAtoms,
      maxBonds,
      gridDimX: GRID_DIM,
      gridDimY: GRID_DIM,
      gridDimZ: GRID_DIM,
      maxAtomsPerCell: MAX_ATOMS_PER_CELL,
    });
    stateRef.current.maxAtoms = maxAtoms;
    stateRef.current.maxBonds = maxBonds;
    return true;
  })();

  const ok = await initPromiseRef.current;
  initPromiseRef.current = null;
  return ok;
}

async function growPipeline(
  stateRef: React.MutableRefObject<InternalState>,
  newAtomCount: number,
): Promise<boolean> {
  const device = stateRef.current.device;
  const oldPipeline = stateRef.current.pipeline;
  if (!device || !oldPipeline) return false;

  // Grow with headroom so we don't grow every frame as data trickles in.
  const newMaxAtoms = Math.max(Math.ceil(newAtomCount * 1.5), stateRef.current.maxAtoms * 2);
  const newMaxBonds = newMaxAtoms * 12;

  oldPipeline.destroy();

  stateRef.current.pipeline = new BondPipeline({
    device,
    maxAtoms: newMaxAtoms,
    maxBonds: newMaxBonds,
    gridDimX: GRID_DIM,
    gridDimY: GRID_DIM,
    gridDimZ: GRID_DIM,
    maxAtomsPerCell: MAX_ATOMS_PER_CELL,
  });
  stateRef.current.maxAtoms = newMaxAtoms;
  stateRef.current.maxBonds = newMaxBonds;
  return true;
}
