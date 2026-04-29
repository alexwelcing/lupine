use serde::Serialize;

/// A single frame of atomic data from a LAMMPS dump file.
/// Positions and properties are stored as flat arrays for direct GPU upload.
#[derive(Debug, Clone, Serialize)]
pub struct Frame {
    /// Timestep number from LAMMPS
    pub timestep: u64,
    /// Number of atoms in this frame
    pub natoms: u32,
    /// Simulation box bounds [xlo, xhi, ylo, yhi, zlo, zhi]
    pub box_bounds: [f64; 6],
    /// Triclinic tilt factors [xy, xz, yz] — zero for orthogonal boxes
    pub box_tilt: [f64; 3],
    /// Whether the box is triclinic
    pub triclinic: bool,
    /// Column names from the dump header
    pub columns: Vec<String>,
    /// Atom IDs (length = natoms)
    pub ids: Vec<i32>,
    /// Atom types (length = natoms)
    pub types: Vec<i32>,
    /// Flat position array [x0,y0,z0, x1,y1,z1, ...] (length = natoms * 3)
    pub positions: Vec<f32>,
    /// All extra per-atom properties as named Float32 arrays
    pub properties: Vec<(String, Vec<f32>)>,
    /// Explicit bonds mapped to 0-indexed positions (atom_index1, atom_index2)
    pub topological_bonds: Option<Vec<(u32, u32)>>,
}

/// Result of parsing a LAMMPS log file — thermo data from one or more runs.
#[derive(Debug, Clone, Serialize)]
pub struct ThermoData {
    /// Number of runs found in the log
    pub num_runs: u32,
    pub runs: Vec<ThermoRun>,
}

/// Thermo data from a single LAMMPS `run` command.
#[derive(Debug, Clone, Serialize)]
pub struct ThermoRun {
    /// Column headers (e.g. ["Step", "Temp", "E_pair", "TotEng", "Press"])
    pub columns: Vec<String>,
    /// Row-major data: data[row * num_columns + col]
    pub data: Vec<f64>,
    /// Number of rows
    pub nrows: usize,
}
