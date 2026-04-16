use crate::types::Frame;
use serde_wasm_bindgen;
use wasm_bindgen::prelude::*;

/// Map common element symbols to atom types.
/// Falls back to parsing as integer if not in table.
fn element_to_type(symbol: &str) -> i32 {
    match symbol.trim() {
        "H" => 1,
        "He" => 2,
        "Li" => 3,
        "Be" => 4,
        "B" => 5,
        "C" => 6,
        "N" => 7,
        "O" => 8,
        "F" => 9,
        "Ne" => 10,
        "Na" => 11,
        "Mg" => 12,
        "Al" => 13,
        "Si" => 14,
        "P" => 15,
        "S" => 16,
        "Cl" => 17,
        "Ar" => 18,
        "K" => 19,
        "Ca" => 20,
        "Sc" => 21,
        "Ti" => 22,
        "V" => 23,
        "Cr" => 24,
        "Mn" => 25,
        "Fe" => 26,
        "Co" => 27,
        "Ni" => 28,
        "Cu" => 29,
        "Zn" => 30,
        "Ga" => 31,
        "Ge" => 32,
        "As" => 33,
        "Se" => 34,
        "Br" => 35,
        "Kr" => 36,
        "Rb" => 37,
        "Sr" => 38,
        "Y" => 39,
        "Zr" => 40,
        "Nb" => 41,
        "Mo" => 42,
        "Tc" => 43,
        "Ru" => 44,
        "Rh" => 45,
        "Pd" => 46,
        "Ag" => 47,
        "Cd" => 48,
        "In" => 49,
        "Sn" => 50,
        "Sb" => 51,
        "Te" => 52,
        "I" => 53,
        "Xe" => 54,
        "Cs" => 55,
        "Ba" => 56,
        "La" => 57,
        "Ce" => 58,
        "Pr" => 59,
        "Nd" => 60,
        "Pm" => 61,
        "Sm" => 62,
        "Eu" => 63,
        "Gd" => 64,
        "Tb" => 65,
        "Dy" => 66,
        "Ho" => 67,
        "Er" => 68,
        "Tm" => 69,
        "Yb" => 70,
        "Lu" => 71,
        "Hf" => 72,
        "Ta" => 73,
        "W" => 74,
        "Re" => 75,
        "Os" => 76,
        "Ir" => 77,
        "Pt" => 78,
        "Au" => 79,
        "Hg" => 80,
        "Tl" => 81,
        "Pb" => 82,
        "Bi" => 83,
        "Po" => 84,
        "At" => 85,
        "Rn" => 86,
        _ => symbol.trim().parse::<i32>().unwrap_or(1),
    }
}

#[wasm_bindgen(js_name = "parseXyzFile")]
pub fn parse_xyz_file(content: &str) -> Result<JsValue, JsError> {
    let frames = parse_xyz_internal(content).map_err(|e| JsError::new(&e))?;
    serde_wasm_bindgen::to_value(&frames).map_err(|e| JsError::new(&e.to_string()))
}

fn parse_xyz_internal(content: &str) -> Result<Vec<Frame>, String> {
    let lines: Vec<&str> = content.lines().collect();
    let mut frames = Vec::new();
    let mut idx = 0;
    let mut frame_counter = 0u64;

    while idx < lines.len() {
        let natoms: u32 = lines[idx].trim().parse().map_err(|_| {
            format!("Expected atom count at line {}, got: '{}'", idx + 1, lines[idx])
        })?;
        idx += 1;

        if idx >= lines.len() {
            break;
        }

        // Comment line — try to extract a timestep if it looks like a number
        let comment = lines[idx].trim();
        let timestep = comment.parse::<u64>().unwrap_or(frame_counter);
        idx += 1;

        let mut positions = Vec::with_capacity((natoms * 3) as usize);
        let mut types = Vec::with_capacity(natoms as usize);
        let mut ids = Vec::with_capacity(natoms as usize);

        let mut min_x = f64::INFINITY;
        let mut min_y = f64::INFINITY;
        let mut min_z = f64::INFINITY;
        let mut max_x = f64::NEG_INFINITY;
        let mut max_y = f64::NEG_INFINITY;
        let mut max_z = f64::NEG_INFINITY;

        for i in 0..natoms {
            if idx >= lines.len() {
                return Err(format!(
                    "Unexpected end of file while reading atom {} of frame {}",
                    i + 1,
                    frames.len() + 1
                ));
            }
            let parts: Vec<&str> = lines[idx].split_whitespace().collect();
            if parts.len() < 4 {
                return Err(format!(
                    "Expected at least 4 columns at line {}, got: '{}'",
                    idx + 1,
                    lines[idx]
                ));
            }

            let atom_type = element_to_type(parts[0]);
            let x: f32 = parts[1].parse().map_err(|_| format!("Invalid x coordinate at line {}", idx + 1))?;
            let y: f32 = parts[2].parse().map_err(|_| format!("Invalid y coordinate at line {}", idx + 1))?;
            let z: f32 = parts[3].parse().map_err(|_| format!("Invalid z coordinate at line {}", idx + 1))?;

            positions.push(x);
            positions.push(y);
            positions.push(z);
            types.push(atom_type);
            ids.push((i + 1) as i32);

            let xf = x as f64;
            let yf = y as f64;
            let zf = z as f64;
            if xf < min_x { min_x = xf; }
            if xf > max_x { max_x = xf; }
            if yf < min_y { min_y = yf; }
            if yf > max_y { max_y = yf; }
            if zf < min_z { min_z = zf; }
            if zf > max_z { max_z = zf; }

            idx += 1;
        }

        // Pad bounds by 2 Å
        let pad = 2.0;
        let box_bounds = [
            min_x - pad, max_x + pad,
            min_y - pad, max_y + pad,
            min_z - pad, max_z + pad,
        ];

        frames.push(Frame {
            timestep,
            natoms,
            box_bounds,
            box_tilt: [0.0, 0.0, 0.0],
            triclinic: false,
            columns: vec!["id".to_string(), "type".to_string(), "x".to_string(), "y".to_string(), "z".to_string()],
            ids,
            types,
            positions,
            properties: Vec::new(),
            bonds: Vec::new(),
        });

        frame_counter += 1;
    }

    if frames.is_empty() {
        return Err("No valid XYZ frames found".to_string());
    }

    Ok(frames)
}
