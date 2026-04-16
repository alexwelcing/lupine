use serde::Serialize;
use wasm_bindgen::prelude::*;

/// A single frame of atomic data from a LAMMPS dump file.
/// Positions and properties are stored as flat Float64Arrays for zero-copy
/// transfer to WebGPU buffers via JavaScript.
#[wasm_bindgen]
#[derive(Serialize)]
pub struct Frame {
    /// Timestep number from LAMMPS
    pub timestep: u64,
    /// Number of atoms in this frame
    pub natoms: u32,
    /// Simulation box bounds [xlo, xhi, ylo, yhi, zlo, zhi]
    #[wasm_bindgen(skip)]
    pub box_bounds: [f64; 6],
    /// Triclinic tilt factors [xy, xz, yz] — zero for orthogonal boxes
    #[wasm_bindgen(skip)]
    pub box_tilt: [f64; 3],
    /// Whether the box is triclinic
    pub triclinic: bool,
    /// Column names from the dump header (e.g. ["id","type","x","y","z","vx","vy","vz"])
    #[wasm_bindgen(skip)]
    pub columns: Vec<String>,
    /// Atom IDs (length = natoms)
    #[wasm_bindgen(skip)]
    pub ids: Vec<i32>,
    /// Atom types (length = natoms)
    #[wasm_bindgen(skip)]
    pub types: Vec<i32>,
    /// Flat position array [x0,y0,z0, x1,y1,z1, ...] (length = natoms * 3)
    #[wasm_bindgen(skip)]
    pub positions: Vec<f32>,
    /// All extra per-atom properties as named Float32 arrays
    /// Keys are column names, values are flat arrays of length natoms
    #[wasm_bindgen(skip)]
    pub properties: Vec<(String, Vec<f32>)>,
    /// Bond pairs: flat array [a1, b1, a2, b2, ...] (length = nbonds * 2)
    #[wasm_bindgen(skip)]
    pub bonds: Vec<i32>,
}

#[wasm_bindgen]
impl Frame {
    /// Get box bounds as a JS Float64Array: [xlo, xhi, ylo, yhi, zlo, zhi]
    #[wasm_bindgen(getter, js_name = "boxBounds")]
    pub fn box_bounds_js(&self) -> Vec<f64> {
        self.box_bounds.to_vec()
    }

    /// Get box tilt factors [xy, xz, yz]
    #[wasm_bindgen(getter, js_name = "boxTilt")]
    pub fn box_tilt_js(&self) -> Vec<f64> {
        self.box_tilt.to_vec()
    }

    /// Get column names
    #[wasm_bindgen(getter, js_name = "columns")]
    pub fn columns_js(&self) -> Vec<JsValue> {
        self.columns.iter().map(|s| JsValue::from_str(s)).collect()
    }

    /// Get atom IDs as Int32Array
    #[wasm_bindgen(getter, js_name = "ids")]
    pub fn ids_js(&self) -> Vec<i32> {
        self.ids.clone()
    }

    /// Get atom types as Int32Array
    #[wasm_bindgen(getter, js_name = "types")]
    pub fn types_js(&self) -> Vec<i32> {
        self.types.clone()
    }

    /// Get flat position array [x0,y0,z0, x1,y1,z1, ...] as Float32Array
    #[wasm_bindgen(getter, js_name = "positions")]
    pub fn positions_js(&self) -> Vec<f32> {
        self.positions.clone()
    }

    /// Get a named property array by column name
    #[wasm_bindgen(js_name = "getProperty")]
    pub fn get_property(&self, name: &str) -> Option<Vec<f32>> {
        self.properties
            .iter()
            .find(|(k, _)| k == name)
            .map(|(_, v)| v.clone())
    }

    /// List all available property names beyond id/type/position
    #[wasm_bindgen(js_name = "propertyNames")]
    pub fn property_names(&self) -> Vec<JsValue> {
        self.properties
            .iter()
            .map(|(k, _)| JsValue::from_str(k))
            .collect()
    }

    /// Get bonds array tracking [a1, b1, a2, b2, ...] as Int32Array
    #[wasm_bindgen(getter, js_name = "bonds")]
    pub fn bonds_js(&self) -> Vec<i32> {
        self.bonds.clone()
    }
}

/// Result of parsing a LAMMPS log file — thermo data from one or more runs.
#[wasm_bindgen]
#[derive(Serialize)]
pub struct ThermoData {
    /// Number of runs found in the log
    pub num_runs: u32,
    #[wasm_bindgen(skip)]
    pub runs: Vec<ThermoRun>,
}

/// Thermo data from a single LAMMPS `run` command.
#[derive(Serialize, Clone)]
pub struct ThermoRun {
    /// Column headers (e.g. ["Step", "Temp", "E_pair", "E_mol", "TotEng", "Press"])
    pub columns: Vec<String>,
    /// Row-major data: data[row * num_columns + col]
    pub data: Vec<f64>,
    /// Number of rows
    pub nrows: usize,
}

#[wasm_bindgen]
impl ThermoData {
    /// Get column names for a specific run
    #[wasm_bindgen(js_name = "getColumns")]
    pub fn get_columns(&self, run: usize) -> Vec<JsValue> {
        self.runs
            .get(run)
            .map(|r| r.columns.iter().map(|s| JsValue::from_str(s)).collect())
            .unwrap_or_default()
    }

    /// Get a specific column's data as Float64Array for a given run
    #[wasm_bindgen(js_name = "getColumn")]
    pub fn get_column(&self, run: usize, name: &str) -> Option<Vec<f64>> {
        let r = self.runs.get(run)?;
        let col_idx = r.columns.iter().position(|c| c == name)?;
        let ncols = r.columns.len();
        let values: Vec<f64> = (0..r.nrows)
            .map(|row| r.data[row * ncols + col_idx])
            .collect();
        Some(values)
    }

    /// Get all data for a run as a flat Float64Array (row-major)
    #[wasm_bindgen(js_name = "getRunData")]
    pub fn get_run_data(&self, run: usize) -> Option<Vec<f64>> {
        self.runs.get(run).map(|r| r.data.clone())
    }

    /// Get number of rows in a specific run
    #[wasm_bindgen(js_name = "getRunLength")]
    pub fn get_run_length(&self, run: usize) -> u32 {
        self.runs.get(run).map(|r| r.nrows as u32).unwrap_or(0)
    }
}
