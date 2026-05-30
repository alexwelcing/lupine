// The data behind the Comparison Theater.
//
// One strained FCC nanocrystal (Ni-like) is relaxed three ways. Every variant
// starts from the IDENTICAL strained state (pos0) and relaxes toward the same
// equilibrium (eq); only the relaxation schedule differs. The per-atom residual
// (distance still to travel) is the property we color by, so as time advances
// the crystal visibly cools from strained -> relaxed — faster and more completely
// for distill, fastest of all for distill+accelerate. This mirrors the measured
// result (distill lowers error; the accelerate variant converges in fewer steps).

export interface Lattice {
  eq: Float32Array; // equilibrium positions [x0,y0,z0, ...]
  radii: Float32Array; // per-atom display radius
  count: number;
  residualScale: number; // max initial displacement (color normalizer)
  extent: number; // half-size of the crystal (camera framing)
}

export interface Variant {
  id: string;
  title: string;
  badge: string;
  accent: string; // hex, for the pane chrome
  floor: number; // asymptotic residual factor (the accuracy it lands at)
  convergeAt: number; // fraction of the timeline to reach ~floor (the speed)
  decay: (fNorm: number) => number; // residual factor 1 -> floor over fNorm in [0,1]
}

export interface Theater {
  lattice: Lattice;
  pos0: Float32Array; // the shared strained starting state
  variants: Variant[];
}

// Deterministic RNG so the demo is identical every load (and testable).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FCC_BASIS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [0.5, 0.5, 0],
  [0.5, 0, 0.5],
  [0, 0.5, 0.5],
];

/** Build a centered FCC nanocrystal of nCells^3 conventional cells. */
export function makeFccLattice(nCells = 4, a = 2.0, radius = 0.52): Lattice {
  const positions: number[] = [];
  const half = (nCells * a) / 2;
  for (let i = 0; i < nCells; i++)
    for (let j = 0; j < nCells; j++)
      for (let k = 0; k < nCells; k++)
        for (const [bx, by, bz] of FCC_BASIS) {
          positions.push((i + bx) * a - half, (j + by) * a - half, (k + bz) * a - half);
        }
  const count = positions.length / 3;
  const eq = new Float32Array(positions);
  const radii = new Float32Array(count).fill(radius);
  return { eq, radii, count, residualScale: 1, extent: half };
}

/** Strain the lattice: shear + radial breathing + seeded thermal kicks. */
export function strain(lattice: Lattice, seed = 1337): Float32Array {
  const rng = mulberry32(seed);
  const { eq, count, extent } = lattice;
  const pos0 = new Float32Array(eq.length);
  const shear = 0.16;
  const breathe = 1.07;
  const thermal = 0.22 * extent * 0.18;
  let maxDisp = 1e-6;
  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const x = eq[ix];
    const y = eq[ix + 1];
    const z = eq[ix + 2];
    // edge atoms move more (drama), via radial weight.
    const r = Math.sqrt(x * x + y * y + z * z) / (extent * Math.sqrt(3));
    const w = 0.4 + 0.6 * r;
    const px = (x + shear * y) * breathe + (rng() - 0.5) * 2 * thermal * w;
    const py = (y + shear * z) * breathe + (rng() - 0.5) * 2 * thermal * w;
    const pz = (z + shear * x) * breathe + (rng() - 0.5) * 2 * thermal * w;
    pos0[ix] = px;
    pos0[ix + 1] = py;
    pos0[ix + 2] = pz;
    const dx = px - x;
    const dy = py - y;
    const dz = pz - z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > maxDisp) maxDisp = d;
  }
  lattice.residualScale = maxDisp;
  return pos0;
}

function expDecay(floor: number, k: number): (f: number) => number {
  return (f: number) => floor + (1 - floor) * Math.exp(-k * Math.max(0, f));
}

// k chosen so convergeAt = ln(20)/k (fraction of timeline to reach ~floor).
const K_BASELINE = 3.0;
const K_DISTILL = 4.8;
const K_ACCEL = 12.0;

/** The three relaxation variants — identical start, different schedule. */
export function makeVariants(): Variant[] {
  return [
    {
      id: "baseline",
      title: "MACE-MP-0 baseline",
      badge: "foundation MLIP",
      accent: "#8A8AA0",
      floor: 0.2,
      convergeAt: Math.min(1, Math.log(20) / K_BASELINE),
      decay: expDecay(0.2, K_BASELINE),
    },
    {
      id: "distill",
      title: "+ Lupine distill",
      badge: "post-hoc ribbon",
      accent: "#7B5CFF",
      floor: 0.06,
      convergeAt: Math.min(1, Math.log(20) / K_DISTILL),
      decay: expDecay(0.06, K_DISTILL),
    },
    {
      id: "accelerate",
      title: "+ distill · accelerate",
      badge: "5–7× throughput",
      accent: "#00E5FF",
      floor: 0.05,
      convergeAt: Math.min(1, Math.log(20) / K_ACCEL),
      decay: expDecay(0.05, K_ACCEL),
    },
  ];
}

export function makeTheater(): Theater {
  const lattice = makeFccLattice();
  const pos0 = strain(lattice);
  return { lattice, pos0, variants: makeVariants() };
}
