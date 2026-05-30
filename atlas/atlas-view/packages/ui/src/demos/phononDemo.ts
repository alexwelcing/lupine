// A clear, self-contained "smooth playback" demo: a crystal carrying a transverse
// standing-wave phonon. It exists because the only built-in demo is a STATIC
// structure, which never shows the viewer's core feature — smooth interpolated
// MD playback. This one:
//   • ripples in an obvious sinusoid (collective motion you can't miss),
//   • is colored by per-atom displacement so the wave reads at a glance,
//   • LOOPS SEAMLESSLY by construction: frame[0] == frame[N-1] (one full cos
//     period), so replay is endless with no jump at the wrap.
// Built as real @atlas/core Frames so the genuine impostor engine + the GPU
// interpolation render it.

import type { Frame, Trajectory } from '@atlas/core';
import { useStore } from '../store';

const N = 8; // cells per side -> 512 atoms
const SPACING = 1.8; // lattice constant (display units)
const AMP = 0.72; // wave amplitude (< spacing/2, no overlap)
const N_WAVES = 2; // wavelengths across the crystal
const N_FRAMES = 96;
const TYPE = 6; // carbon — a valid, well-sized impostor radius

export function makePhononTrajectory(): Trajectory {
  const eq: number[] = [];
  const half = ((N - 1) * SPACING) / 2;
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++)
      for (let k = 0; k < N; k++)
        eq.push(i * SPACING - half, j * SPACING - half, k * SPACING - half);
  const count = eq.length / 3;

  const Lx = (N - 1) * SPACING;
  const kx = (2 * Math.PI * N_WAVES) / Lx;

  const ids = new Int32Array(count);
  for (let i = 0; i < count; i++) ids[i] = i;
  const types = new Int32Array(count).fill(TYPE);

  const m = half + AMP + 1; // cell padding
  const frames: Frame[] = [];
  for (let f = 0; f < N_FRAMES; f++) {
    // t in [0, 2π]; cos(0) === cos(2π) so frame[0] === frame[N-1] -> seamless loop.
    const ct = Math.cos((f / (N_FRAMES - 1)) * 2 * Math.PI);
    const positions = new Float32Array(count * 3);
    const displacement = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const ex = eq[ix], ey = eq[ix + 1], ez = eq[ix + 2];
      const dy = AMP * Math.sin(kx * (ex + half)) * ct; // transverse: displace y by x-phase
      positions[ix] = ex;
      positions[ix + 1] = ey + dy;
      positions[ix + 2] = ez;
      displacement[i] = Math.min(1, Math.abs(dy) / AMP);
    }
    frames.push({
      timestep: f,
      natoms: count,
      boxBounds: new Float64Array([-m, m, -m, m, -m, m]),
      boxTilt: new Float64Array([0, 0, 0]),
      triclinic: false,
      columns: ['id', 'type', 'x', 'y', 'z', 'displacement'],
      ids,
      types,
      positions,
      bonds: new Int32Array(0),
      properties: new Map([['displacement', displacement]]),
    });
  }

  return {
    frames,
    totalFrames: N_FRAMES,
    atomTypes: [TYPE],
    globalBounds: { min: [-m, -m, -m], max: [m, m, m] },
  };
}

/** Load the phonon demo and start it playing, colored by displacement. */
export function loadPhononDemo(): void {
  const st = useStore.getState();
  st.setFile({ name: 'phonon · standing wave', size: 0, trajectory: makePhononTrajectory(), thermo: null });
  // Color by the wave; clean crystal (no bonds); auto-play smoothly.
  useStore.setState({
    colorMode: 'property',
    colorProperty: 'displacement',
    colormap: 'turbo',
    propRange: [0, 1],
    showBonds: false,
    showCell: true,
    frame: 0,
    playbackSpeed: 1,
    playing: true,
  });
}
