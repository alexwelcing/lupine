// bond_compute.wgsl
// WebGPU Compute Shader for O(N) Bond Detection via Spatial Hashing
//
// Pipeline order (orchestrated by BondPipeline.ts):
//   1. main_clear_grid    — zero per-cell atom counts
//   2. main_grid_build    — bin atoms into cells
//   3. main_bond_detect   — for each atom, scan 3x3x3 neighbor cells
//
// Coordinates are translated by `origin` before binning so negative LAMMPS
// coords land in cell index >= 0. Atoms whose translated coord falls
// outside [0, gridDim*cellSize) are dropped from the grid.

struct IndirectArgs {
  indexCount: atomic<u32>,
  instanceCount: atomic<u32>,
  firstIndex: u32,
  baseVertex: u32,
  firstInstance: u32,
}

struct Bond {
  atomA: u32,
  atomB: u32,
  distance: f32,
  padding: f32,
}

@group(0) @binding(0) var<storage, read> atoms: array<vec4f>;
@group(0) @binding(1) var<storage, read> covalent_radii: array<f32>;
@group(0) @binding(2) var<storage, read_write> bonds: array<Bond>;
@group(0) @binding(3) var<storage, read_write> indirect: IndirectArgs;

struct Config {
  numAtoms: u32,
  maxBonds: u32,
  tolerance: f32,
  cellSize: f32,
  gridDimX: u32,
  gridDimY: u32,
  gridDimZ: u32,
  maxAtomsPerCell: u32,
  // Origin offset — subtracted from positions so the spatial grid is in
  // [0, gridDim*cellSize). Required for LAMMPS dumps with negative coords.
  originX: f32,
  originY: f32,
  originZ: f32,
  _pad: f32,
}

@group(0) @binding(4) var<uniform> config: Config;

// Spatial grid storage
@group(0) @binding(5) var<storage, read_write> cell_counts: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read_write> cell_atoms: array<u32>; // size = gridDimX*gridDimY*gridDimZ * maxAtomsPerCell

fn translated(pos: vec3f) -> vec3f {
  return pos - vec3f(config.originX, config.originY, config.originZ);
}

fn get_cell_coords(pos: vec3f) -> vec3<i32> {
  let t = translated(pos);
  return vec3<i32>(
    i32(floor(t.x / config.cellSize)),
    i32(floor(t.y / config.cellSize)),
    i32(floor(t.z / config.cellSize)),
  );
}

fn cell_in_bounds(c: vec3<i32>) -> bool {
  return c.x >= 0 && c.x < i32(config.gridDimX) &&
         c.y >= 0 && c.y < i32(config.gridDimY) &&
         c.z >= 0 && c.z < i32(config.gridDimZ);
}

fn flat_cell_index(c: vec3<i32>) -> u32 {
  return u32(c.x) +
         u32(c.y) * config.gridDimX +
         u32(c.z) * config.gridDimX * config.gridDimY;
}

@compute @workgroup_size(64)
fn main_clear_grid(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let cell_idx = global_id.x;
  let total_cells = config.gridDimX * config.gridDimY * config.gridDimZ;
  if (cell_idx >= total_cells) { return; }
  atomicStore(&cell_counts[cell_idx], 0u);
}

@compute @workgroup_size(64)
fn main_grid_build(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let atom_idx = global_id.x;
  if (atom_idx >= config.numAtoms) { return; }

  let pos = atoms[atom_idx].xyz;
  let cc = get_cell_coords(pos);
  if (!cell_in_bounds(cc)) { return; }

  let cell_idx = flat_cell_index(cc);
  let count = atomicAdd(&cell_counts[cell_idx], 1u);
  if (count < config.maxAtomsPerCell) {
    let flat_idx = cell_idx * config.maxAtomsPerCell + count;
    cell_atoms[flat_idx] = atom_idx;
  } else {
    // Cell overflow — undo the increment so the count stays a valid bound
    // for main_bond_detect's scan loop.
    atomicSub(&cell_counts[cell_idx], 1u);
  }
}

@compute @workgroup_size(64)
fn main_bond_detect(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let a_idx = global_id.x;
  if (a_idx >= config.numAtoms) { return; }

  let atom_a_raw = atoms[a_idx];
  let pos_a = atom_a_raw.xyz;
  let elem_a = bitcast<i32>(atom_a_raw.w);
  let r_cov_a = covalent_radii[elem_a];

  let cc = get_cell_coords(pos_a);
  // No early-return for atoms outside the grid: a bond may still tie an
  // out-of-grid atom to an in-grid one. Cell bounds are checked per neighbor.

  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let n = vec3<i32>(cc.x + dx, cc.y + dy, cc.z + dz);
        if (!cell_in_bounds(n)) { continue; }

        let cell_idx = flat_cell_index(n);
        let count = min(atomicLoad(&cell_counts[cell_idx]), config.maxAtomsPerCell);

        for (var i = 0u; i < count; i++) {
          let b_idx = cell_atoms[cell_idx * config.maxAtomsPerCell + i];
          if (a_idx >= b_idx) { continue; }

          let atom_b_raw = atoms[b_idx];
          let pos_b = atom_b_raw.xyz;
          let dist = distance(pos_a, pos_b);

          let elem_b = bitcast<i32>(atom_b_raw.w);
          let r_cov_b = covalent_radii[elem_b];
          let threshold = r_cov_a + r_cov_b + config.tolerance;

          if (dist <= threshold && dist > 0.0) {
            let bond_idx = atomicAdd(&indirect.instanceCount, 1u);
            if (bond_idx < config.maxBonds) {
              bonds[bond_idx].atomA = a_idx;
              bonds[bond_idx].atomB = b_idx;
              bonds[bond_idx].distance = dist;
              bonds[bond_idx].padding = 0.0;
            } else {
              // Roll back overflow so instanceCount remains a true count.
              atomicSub(&indirect.instanceCount, 1u);
            }
          }
        }
      }
    }
  }
}
