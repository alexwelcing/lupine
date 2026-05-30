import type { Frame, Trajectory } from '@atlas/core/types';
import type { LoadedFile } from './store';

const MLIP_MEASURED_FRAME_RATE = 1;

export type MlipArtifactPayload = EquilibriumScoreArtifact | MdTrajectoryArtifact;

export interface EquilibriumScoreArtifact {
  schema: 'lupine.distill.equilibrium_solve_score.v1';
  run_id?: string;
  cell_id?: string;
  variant_id?: string;
  mlip_id?: string;
  material_id: string;
  score?: Record<string, unknown>;
  anytime_curve?: Array<Record<string, unknown>>;
  viewer_artifact: {
    schema: 'lupine.mlip.equilibrium_viewer.v1';
    material_id: string;
    mlip_id?: string;
    frames: ViewerFrame[];
  };
}

export interface MdTrajectoryArtifact {
  schema: 'lupine.mlip.md_trajectory.v1';
  run_id?: string;
  cell_id?: string;
  variant_id?: string;
  mlip_id?: string;
  material_id: string;
  frames: ViewerFrame[];
  diagnostics?: Record<string, unknown>;
}

interface ViewerFrame {
  step?: number;
  time_seconds?: number;
  cell_angstrom?: number[][];
  positions_angstrom?: number[][];
  force_max_norm_ev_per_angstrom?: number;
  distance_to_reference?: number;
  closeness?: number;
  energy_ev_per_atom?: number;
  total_energy_ev_per_atom?: number;
  temperature_k?: number;
  symbols?: string[];
}

const TYPE_BY_ELEMENT: Record<string, number> = {
  H: 1,
  Li: 3,
  C: 6,
  O: 8,
  Mg: 12,
  Al: 13,
  P: 15,
  Fe: 26,
  Ni: 28,
};

export function artifactToLoadedFile(payload: MlipArtifactPayload, sourceUrl: string): LoadedFile {
  if (payload.schema === 'lupine.distill.equilibrium_solve_score.v1') {
    return equilibriumScoreToLoadedFile(payload, sourceUrl);
  }
  if (payload.schema === 'lupine.mlip.md_trajectory.v1') {
    return mdTrajectoryToLoadedFile(payload, sourceUrl);
  }
  throw new Error(`Unsupported MLIP artifact schema: ${(payload as { schema?: string }).schema ?? 'unknown'}`);
}

function equilibriumScoreToLoadedFile(payload: EquilibriumScoreArtifact, sourceUrl: string): LoadedFile {
  const frames = viewerFramesToFrames(payload.viewer_artifact.frames, payload.material_id);
  return {
    name: `${payload.material_id} ${payload.mlip_id ?? 'MLIP'} measured solve`,
    size: frames.reduce((sum, frame) => sum + frame.positions.byteLength, 0),
    trajectory: framesToTrajectory(frames),
    thermo: null,
    sourceUrl,
  };
}

function mdTrajectoryToLoadedFile(payload: MdTrajectoryArtifact, sourceUrl: string): LoadedFile {
  const frames = viewerFramesToFrames(payload.frames, payload.material_id);
  const variant = payload.variant_id ? ` ${payload.variant_id.replaceAll('_', ' ')}` : '';
  return {
    name: `${payload.material_id} ${payload.mlip_id ?? 'MLIP'}${variant} measured MD`,
    size: frames.reduce((sum, frame) => sum + frame.positions.byteLength, 0),
    trajectory: framesToTrajectory(frames),
    thermo: null,
    sourceUrl,
    playbackFrameRate: MLIP_MEASURED_FRAME_RATE,
  };
}

function viewerFramesToFrames(viewerFrames: ViewerFrame[], materialId: string): Frame[] {
  if (!viewerFrames.length) throw new Error('Measured artifact has no frames.');
  const finalPositions = lastPositions(viewerFrames);
  return viewerFrames.map((viewerFrame) => {
    const positionsList = viewerFrame.positions_angstrom;
    if (!positionsList?.length) throw new Error('Measured viewer frame is missing positions_angstrom.');
    const natoms = positionsList.length;
    const positions = new Float32Array(natoms * 3);
    const types = new Int32Array(natoms);
    const distanceToFinal = new Float32Array(natoms);
    const solveCloseness = new Float32Array(natoms);
    const forceNorm = new Float32Array(natoms);
    const globalDistance = typeof viewerFrame.distance_to_reference === 'number'
      ? viewerFrame.distance_to_reference
      : 0;
    const closeness = typeof viewerFrame.closeness === 'number' ? viewerFrame.closeness : 1 / (1 + globalDistance);
    const maxForce = typeof viewerFrame.force_max_norm_ev_per_angstrom === 'number'
      ? viewerFrame.force_max_norm_ev_per_angstrom
      : 0;

    for (let idx = 0; idx < natoms; idx += 1) {
      const pos = positionsList[idx] ?? [0, 0, 0];
      positions[idx * 3] = Number(pos[0]) || 0;
      positions[idx * 3 + 1] = Number(pos[1]) || 0;
      positions[idx * 3 + 2] = Number(pos[2]) || 0;
      const final = finalPositions[idx] ?? pos;
      types[idx] = elementTypeForFrame(viewerFrame, idx, materialId);
      distanceToFinal[idx] = distance3(pos, final);
      solveCloseness[idx] = closeness;
      forceNorm[idx] = maxForce;
    }

    const bounds = cellToBounds(viewerFrame.cell_angstrom, positions);
    return {
      timestep: Number(viewerFrame.step) || 0,
      natoms,
      boxBounds: bounds.boxBounds,
      boxTilt: bounds.boxTilt,
      triclinic: bounds.triclinic,
      columns: ['id', 'type', 'x', 'y', 'z', 'distance_to_final', 'solve_closeness', 'force_norm'],
      ids: Int32Array.from({ length: natoms }, (_, idx) => idx + 1),
      types,
      positions,
      bonds: new Int32Array(0),
      properties: new Map([
        ['distance_to_final', distanceToFinal],
        ['solve_closeness', solveCloseness],
        ['force_norm', forceNorm],
      ]),
    };
  });
}

function framesToTrajectory(frames: Frame[]): Trajectory {
  return {
    frames,
    totalFrames: frames.length,
    atomTypes: Array.from(new Set(Array.from(frames[0]?.types ?? []))),
    globalBounds: boundsForFrames(frames),
  };
}

function lastPositions(frames: ViewerFrame[]): number[][] {
  return frames
    .slice()
    .reverse()
    .find((frame) => frame.positions_angstrom?.length)
    ?.positions_angstrom ?? [];
}

function cellToBounds(cell: number[][] | undefined, positions: Float32Array) {
  if (cell?.length === 3) {
    const x = Math.max(vectorLength(cell[0]), 1);
    const y = Math.max(vectorLength(cell[1]), 1);
    const z = Math.max(vectorLength(cell[2]), 1);
    const triclinic = Math.abs(cell[1]?.[0] ?? 0) > 1e-5
      || Math.abs(cell[2]?.[0] ?? 0) > 1e-5
      || Math.abs(cell[2]?.[1] ?? 0) > 1e-5;
    return {
      boxBounds: new Float64Array([0, x, 0, y, 0, z]),
      boxTilt: new Float64Array([cell[1]?.[0] ?? 0, cell[2]?.[0] ?? 0, cell[2]?.[1] ?? 0]),
      triclinic,
    };
  }
  const bounds = boundsForPositions(positions);
  return {
    boxBounds: new Float64Array([
      bounds.min[0],
      bounds.max[0],
      bounds.min[1],
      bounds.max[1],
      bounds.min[2],
      bounds.max[2],
    ]),
    boxTilt: new Float64Array([0, 0, 0]),
    triclinic: false,
  };
}

function boundsForFrames(frames: Frame[]): { min: [number, number, number]; max: [number, number, number] } {
  const bounds = frames.reduce(
    (acc, frame) => mergeBounds(acc, boundsForPositions(frame.positions)),
    emptyBounds(),
  );
  return finiteBounds(bounds);
}

function boundsForPositions(positions: Float32Array) {
  const bounds = emptyBounds();
  for (let idx = 0; idx < positions.length; idx += 3) {
    bounds.min[0] = Math.min(bounds.min[0], positions[idx]);
    bounds.min[1] = Math.min(bounds.min[1], positions[idx + 1]);
    bounds.min[2] = Math.min(bounds.min[2], positions[idx + 2]);
    bounds.max[0] = Math.max(bounds.max[0], positions[idx]);
    bounds.max[1] = Math.max(bounds.max[1], positions[idx + 1]);
    bounds.max[2] = Math.max(bounds.max[2], positions[idx + 2]);
  }
  return finiteBounds(bounds);
}

function emptyBounds() {
  return {
    min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY] as [number, number, number],
    max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY] as [number, number, number],
  };
}

function mergeBounds(left: ReturnType<typeof emptyBounds>, right: ReturnType<typeof emptyBounds>) {
  return {
    min: [
      Math.min(left.min[0], right.min[0]),
      Math.min(left.min[1], right.min[1]),
      Math.min(left.min[2], right.min[2]),
    ] as [number, number, number],
    max: [
      Math.max(left.max[0], right.max[0]),
      Math.max(left.max[1], right.max[1]),
      Math.max(left.max[2], right.max[2]),
    ] as [number, number, number],
  };
}

function finiteBounds(bounds: ReturnType<typeof emptyBounds>) {
  if (!bounds.min.every(Number.isFinite) || !bounds.max.every(Number.isFinite)) {
    return { min: [0, 0, 0] as [number, number, number], max: [1, 1, 1] as [number, number, number] };
  }
  return bounds;
}

function elementType(materialId: string) {
  const match = materialId.match(/[A-Z][a-z]?/);
  return TYPE_BY_ELEMENT[match?.[0] ?? ''] ?? 1;
}

function elementTypeForFrame(frame: ViewerFrame, atomIndex: number, materialId: string) {
  const symbol = frame.symbols?.[atomIndex];
  return TYPE_BY_ELEMENT[symbol ?? ''] ?? elementType(materialId);
}

function vectorLength(value: number[] | undefined) {
  if (!value) return 0;
  return Math.sqrt((value[0] ?? 0) ** 2 + (value[1] ?? 0) ** 2 + (value[2] ?? 0) ** 2);
}

function distance3(a: number[], b: number[]) {
  const dx = (Number(a[0]) || 0) - (Number(b[0]) || 0);
  const dy = (Number(a[1]) || 0) - (Number(b[1]) || 0);
  const dz = (Number(a[2]) || 0) - (Number(b[2]) || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
