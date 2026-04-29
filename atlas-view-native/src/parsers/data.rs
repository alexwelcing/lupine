use std::collections::HashMap;
use anyhow::Result;
use super::types::Frame;

/// Represents the parsed structure of a LAMMPS standard data file.
#[derive(Debug, Clone)]
pub struct LammpsData {
    pub natoms: u32,
    pub nbonds: u32,
    pub atom_types: u32,
    pub bond_types: u32,
    pub box_bounds: [f64; 6],
    pub box_tilt: [f64; 3],
    pub triclinic: bool,
    
    // Flat arrays for GPU consumption: [x0, y0, z0, x1, y1, z1, ...]
    pub positions: Vec<f32>,
    pub ids: Vec<i32>,
    pub types: Vec<i32>,
    pub charges: Vec<f32>,
    
    // Bond topology: flat array of [atom1, atom2, atom1, atom2] (1-indexed usually, but we keep raw)
    pub bonds: Vec<(i32, i32, i32)>, // (bond_type, atom1, atom2)
}

impl Default for LammpsData {
    fn default() -> Self {
        Self {
            natoms: 0,
            nbonds: 0,
            atom_types: 0,
            bond_types: 0,
            box_bounds: [0.0; 6],
            box_tilt: [0.0; 3],
            triclinic: false,
            positions: Vec::new(),
            ids: Vec::new(),
            types: Vec::new(),
            charges: Vec::new(),
            bonds: Vec::new(),
        }
    }
}

pub fn parse_data_string(content: &str) -> Result<LammpsData> {
    let mut data = LammpsData::default();
    
    let mut current_section = "";
    
    let mut lines = content.lines().filter(|l| !l.trim().is_empty() && !l.trim().starts_with('#')).peekable();
    
    // Skip optional first line comment
    if let Some(first) = lines.peek() {
        if !first.contains("atoms") && !first.contains("xlo") { // very rough heuristic to skip title
            lines.next();
        }
    }

    while let Some(line) = lines.next() {
        let trimmed = line.trim();
        if trimmed.is_empty() { continue; }

        // Determine if we are changing sections
        if trimmed == "Atoms" || trimmed.starts_with("Atoms ") {
            current_section = "Atoms";
            continue;
        } else if trimmed == "Bonds" || trimmed.starts_with("Bonds ") {
            current_section = "Bonds";
            continue;
        } else if trimmed == "Masses" || trimmed.starts_with("Masses ") {
            current_section = "Masses";
            continue;
        } else if trimmed == "Velocities" || trimmed.starts_with("Velocities ") {
            current_section = "Velocities";
            continue;
        }

        // Parsing Header
        if current_section == "" {
            if trimmed.ends_with("atoms") {
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                data.natoms = parts[0].parse().unwrap_or(0);
            } else if trimmed.ends_with("bonds") {
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                data.nbonds = parts[0].parse().unwrap_or(0);
            } else if trimmed.ends_with("atom types") {
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                data.atom_types = parts[0].parse().unwrap_or(0);
            } else if trimmed.ends_with("bond types") {
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                data.bond_types = parts[0].parse().unwrap_or(0);
            } else if trimmed.ends_with("xlo xhi") {
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                data.box_bounds[0] = parts[0].parse().unwrap_or(0.0);
                data.box_bounds[1] = parts[1].parse().unwrap_or(0.0);
            } else if trimmed.ends_with("ylo yhi") {
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                data.box_bounds[2] = parts[0].parse().unwrap_or(0.0);
                data.box_bounds[3] = parts[1].parse().unwrap_or(0.0);
            } else if trimmed.ends_with("zlo zhi") {
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                data.box_bounds[4] = parts[0].parse().unwrap_or(0.0);
                data.box_bounds[5] = parts[1].parse().unwrap_or(0.0);
            } else if trimmed.ends_with("xy xz yz") {
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                data.box_tilt[0] = parts[0].parse().unwrap_or(0.0);
                data.box_tilt[1] = parts[1].parse().unwrap_or(0.0);
                data.box_tilt[2] = parts[2].parse().unwrap_or(0.0);
                data.triclinic = true;
            }
        } 
        // Parsing Atoms
        else if current_section == "Atoms" {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            // Typically atomic: id type x y z
            // typically charge: id mol type q x y z
            if parts.len() >= 5 {
                if parts.len() >= 7 {
                    // Assume full/charge: id mol type q x y z
                    data.ids.push(parts[0].parse().unwrap_or(0));
                    data.types.push(parts[2].parse().unwrap_or(1));
                    data.charges.push(parts[3].parse().unwrap_or(0.0));
                    data.positions.push(parts[4].parse().unwrap_or(0.0));
                    data.positions.push(parts[5].parse().unwrap_or(0.0));
                    data.positions.push(parts[6].parse().unwrap_or(0.0));
                } else {
                    // Assume atomic: id type x y z
                    data.ids.push(parts[0].parse().unwrap_or(0));
                    data.types.push(parts[1].parse().unwrap_or(1));
                    data.charges.push(0.0);
                    data.positions.push(parts[2].parse().unwrap_or(0.0));
                    data.positions.push(parts[3].parse().unwrap_or(0.0));
                    data.positions.push(parts[4].parse().unwrap_or(0.0));
                }
            }
        }
        // Parsing Bonds
        else if current_section == "Bonds" {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            // bond-id bond-type atom1 atom2
            if parts.len() >= 4 {
                let btype = parts[1].parse().unwrap_or(1);
                let a1 = parts[2].parse().unwrap_or(0);
                let a2 = parts[3].parse().unwrap_or(0);
                data.bonds.push((btype, a1, a2));
            }
        }
    }
    
    Ok(data)
}

impl Into<Frame> for LammpsData {
    fn into(self) -> Frame {
        // Map bonds from LAMMPS IDs to zero-indexed array positions
        let mut id_to_index: HashMap<i32, u32> = HashMap::with_capacity(self.ids.len());
        for (i, &id) in self.ids.iter().enumerate() {
            id_to_index.insert(id, i as u32);
        }
        
        let mut topological_bonds = Vec::with_capacity(self.bonds.len());
        for &(_, a1, a2) in &self.bonds {
            if let (Some(&i1), Some(&i2)) = (id_to_index.get(&a1), id_to_index.get(&a2)) {
                topological_bonds.push((i1, i2));
            }
        }

        Frame {
            timestep: 0, // Base state
            natoms: self.natoms,
            box_bounds: self.box_bounds,
            box_tilt: self.box_tilt,
            triclinic: self.triclinic,
            columns: vec!["id".to_string(), "type".to_string(), "q".to_string(), "x".to_string(), "y".to_string(), "z".to_string()],
            ids: self.ids,
            types: self.types,
            positions: self.positions,
            properties: vec![("q".to_string(), self.charges)],
            topological_bonds: Some(topological_bonds),
        }
    }
}
