use crate::types::Frame;
use serde_wasm_bindgen;
use wasm_bindgen::prelude::*;

/// Parse a LAMMPS data file (read_data format).
/// Extracts atom coordinates, types, and bond topology.
#[wasm_bindgen(js_name = "parseDataFile")]
pub fn parse_data_file(content: &str) -> Result<JsValue, JsError> {
    let frame = parse_data_internal(content).map_err(|e| JsError::new(&e))?;
    serde_wasm_bindgen::to_value(&frame).map_err(|e| JsError::new(&e.to_string()))
}

fn parse_data_internal(content: &str) -> Result<Frame, String> {
    let mut lines = content.lines().map(str::trim).filter(|l| !l.is_empty() && !l.starts_with('#'));

    let _title = lines.next().unwrap_or("LAMMPS Data");

    let mut natoms = 0u32;
    let mut nbonds = 0u32;
    let mut box_bounds = [0.0f64; 6];
    let box_tilt = [0.0f64; 3];
    let triclinic = false; // Add triclinic parse if needed

    // 1. Header parsing
    let mut current_section = "Header";
    let mut section_data: Vec<&str> = Vec::new();

    let mut parsed_atoms_lines = Vec::new();
    let mut parsed_bonds_lines = Vec::new();

    for line in lines {
        // Check if section header
        if line.parse::<f64>().is_err() && line.chars().next().map_or(false, |c| c.is_alphabetic()) && !line.ends_with("xhi") {
            if line.starts_with("Atoms") {
                current_section = "Atoms";
            } else if line.starts_with("Bonds") {
                current_section = "Bonds";
            } else if line.starts_with("Masses") {
                current_section = "Masses";
            } else if line.starts_with("Velocities") {
                current_section = "Velocities";
            } else if line.starts_with("Angles") || line.starts_with("Dihedrals") || line.starts_with("Impropers") {
                current_section = "Skip";
            }
            continue;
        }

        match current_section {
            "Header" => {
                if line.ends_with("atoms") {
                    natoms = line.split_whitespace().next().unwrap().parse().unwrap_or(0);
                } else if line.ends_with("bonds") {
                    nbonds = line.split_whitespace().next().unwrap().parse().unwrap_or(0);
                } else if line.ends_with("xlo xhi") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    box_bounds[0] = parts[0].parse().unwrap_or(0.0);
                    box_bounds[1] = parts[1].parse().unwrap_or(0.0);
                } else if line.ends_with("ylo yhi") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    box_bounds[2] = parts[0].parse().unwrap_or(0.0);
                    box_bounds[3] = parts[1].parse().unwrap_or(0.0);
                } else if line.ends_with("zlo zhi") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    box_bounds[4] = parts[0].parse().unwrap_or(0.0);
                    box_bounds[5] = parts[1].parse().unwrap_or(0.0);
                }
            }
            "Atoms" => {
                parsed_atoms_lines.push(line);
            }
            "Bonds" => {
                parsed_bonds_lines.push(line);
            }
            _ => {}
        }
    }

    if parsed_atoms_lines.is_empty() {
        return Err("No Atoms section found in data file".to_string());
    }

    let n = parsed_atoms_lines.len();
    let mut ids = Vec::with_capacity(n);
    let mut types = Vec::with_capacity(n);
    let mut positions = Vec::with_capacity(n * 3);
    let mut charges = Vec::with_capacity(n);

    // Common atom styles:
    // atomic: atom-ID atom-type x y z
    // full: atom-ID molecule-ID atom-type q x y z
    // charge: atom-ID atom-type q x y z
    // We can guess format by arg count.
    for line in parsed_atoms_lines {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 5 {
            let id: i32 = parts[0].parse().unwrap_or(1);
            ids.push(id);
            
            // Heuristic for atom style
            if parts.len() >= 7 { // likely full
                let t: i32 = parts[2].parse().unwrap_or(1);
                let q: f32 = parts[3].parse().unwrap_or(0.0);
                let x: f32 = parts[4].parse().unwrap_or(0.0);
                let y: f32 = parts[5].parse().unwrap_or(0.0);
                let z: f32 = parts[6].parse().unwrap_or(0.0);
                types.push(t);
                charges.push(q);
                positions.push(x);
                positions.push(y);
                positions.push(z);
            } else if parts.len() == 6 { // likely charge
                let t: i32 = parts[1].parse().unwrap_or(1);
                let q: f32 = parts[2].parse().unwrap_or(0.0);
                let x: f32 = parts[3].parse().unwrap_or(0.0);
                let y: f32 = parts[4].parse().unwrap_or(0.0);
                let z: f32 = parts[5].parse().unwrap_or(0.0);
                types.push(t);
                charges.push(q);
                positions.push(x);
                positions.push(y);
                positions.push(z);
            } else { // likely atomic
                let t: i32 = parts[1].parse().unwrap_or(1);
                let x: f32 = parts[2].parse().unwrap_or(0.0);
                let y: f32 = parts[3].parse().unwrap_or(0.0);
                let z: f32 = parts[4].parse().unwrap_or(0.0);
                types.push(t);
                positions.push(x);
                positions.push(y);
                positions.push(z);
            }
        }
    }

    // Sort atoms by ID so ID -> Index lookup is trivial (or we just maintain a map) 
    // Data files usually come sorted, but let's map them just securely for bonds
    let mut id_to_index = std::collections::HashMap::new();
    for (idx, &id) in ids.iter().enumerate() {
        id_to_index.insert(id, idx as i32);
    }

    // Parse bonds: bond-ID bond-type atom1 atom2
    let mut bonds = Vec::with_capacity(parsed_bonds_lines.len() * 2);
    for line in parsed_bonds_lines {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 4 {
            let a1_id: i32 = parts[2].parse().unwrap_or(0);
            let a2_id: i32 = parts[3].parse().unwrap_or(0);
            
            if let (Some(&idx1), Some(&idx2)) = (id_to_index.get(&a1_id), id_to_index.get(&a2_id)) {
                bonds.push(idx1);
                bonds.push(idx2);
            }
        }
    }

    let mut properties = Vec::new();
    if !charges.is_empty() {
        properties.push(("q".to_string(), charges));
    }

    Ok(Frame {
        timestep: 0,
        natoms: ids.len() as u32,
        box_bounds,
        box_tilt,
        triclinic,
        columns: vec!["id".to_string(), "type".to_string(), "x".to_string(), "y".to_string(), "z".to_string()],
        ids,
        types,
        positions,
        properties,
        bonds,
    })
}
