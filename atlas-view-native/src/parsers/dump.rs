use crate::parsers::types::Frame;

/// Parse a complete LAMMPS dump file (text format) and return all frames.
///
/// Supports `dump atom` and `dump custom` formats with arbitrary columns.
/// Handles both Cartesian (x,y,z) and scaled (xs,ys,zs) coordinates.
///
/// # Format reference
/// ```text
/// ITEM: TIMESTEP
/// 100
/// ITEM: NUMBER OF ATOMS
/// 1000
/// ITEM: BOX BOUNDS pp pp pp
/// 0.0 10.0
/// 0.0 10.0
/// 0.0 10.0
/// ITEM: ATOMS id type x y z vx vy vz
/// 1 1 0.123 4.567 8.901 0.01 -0.02 0.03
/// ...
/// ```
pub fn parse_dump_frames(content: &str) -> Result<Vec<Frame>, String> {
    let mut frames = Vec::new();
    let mut lines = content.lines().peekable();

    while lines.peek().is_some() {
        // Find next ITEM: TIMESTEP
        loop {
            match lines.peek() {
                Some(line) if line.starts_with("ITEM: TIMESTEP") => break,
                Some(_) => { lines.next(); }
                None => return Ok(frames),
            }
        }

        match parse_single_frame(&mut lines) {
            Ok(frame) => frames.push(frame),
            Err(e) => {
                eprintln!("[Parser] Skipping frame: {}", e);
                continue;
            }
        }
    }

    Ok(frames)
}

/// Count the number of frames in a dump file without full parsing.
pub fn count_dump_frames(content: &str) -> u32 {
    content
        .lines()
        .filter(|line| line.starts_with("ITEM: TIMESTEP"))
        .count() as u32
}

/// Build a frame offset index for random access.
/// Returns byte offsets of each "ITEM: TIMESTEP" header.
pub fn index_dump_frames(content: &str) -> Vec<u32> {
    let mut offsets = Vec::new();
    let mut pos = 0usize;
    for line in content.lines() {
        if line.starts_with("ITEM: TIMESTEP") {
            offsets.push(pos as u32);
        }
        pos += line.len() + 1; // +1 for newline
    }
    offsets
}

// ─── Internal parsing implementation ─────────────────────────────────

fn parse_single_frame<'a, I>(lines: &mut std::iter::Peekable<I>) -> Result<Frame, String>
where
    I: Iterator<Item = &'a str>,
{
    // ─── ITEM: TIMESTEP ───
    let _header = lines.next().ok_or("Expected ITEM: TIMESTEP")?;
    let timestep: u64 = lines
        .next()
        .ok_or("Expected timestep value")?
        .trim()
        .parse()
        .map_err(|e| format!("Invalid timestep: {}", e))?;

    // ─── ITEM: NUMBER OF ATOMS ───
    let natoms_header = lines.next().ok_or("Expected ITEM: NUMBER OF ATOMS")?;
    if !natoms_header.contains("NUMBER OF ATOMS") {
        return Err(format!("Expected NUMBER OF ATOMS, got: {}", natoms_header));
    }
    let natoms: u32 = lines
        .next()
        .ok_or("Expected atom count")?
        .trim()
        .parse()
        .map_err(|e| format!("Invalid atom count: {}", e))?;

    // ─── ITEM: BOX BOUNDS ───
    let box_header = lines.next().ok_or("Expected ITEM: BOX BOUNDS")?;
    if !box_header.contains("BOX BOUNDS") {
        return Err(format!("Expected BOX BOUNDS, got: {}", box_header));
    }

    // Detect triclinic from header (contains "xy xz yz")
    let triclinic = box_header.contains("xy");

    let mut box_bounds = [0.0f64; 6];
    let mut box_tilt = [0.0f64; 3];

    for dim in 0..3 {
        let bound_line = lines.next().ok_or("Expected box bound line")?;
        let parts: Vec<f64> = bound_line
            .split_whitespace()
            .filter_map(|s| s.parse().ok())
            .collect();

        if triclinic && parts.len() >= 3 {
            box_bounds[dim * 2] = parts[0];
            box_bounds[dim * 2 + 1] = parts[1];
            box_tilt[dim] = parts[2];
        } else if parts.len() >= 2 {
            box_bounds[dim * 2] = parts[0];
            box_bounds[dim * 2 + 1] = parts[1];
        } else {
            return Err(format!("Invalid box bound line: {}", bound_line));
        }
    }

    // ─── ITEM: ATOMS ───
    let atoms_header = lines.next().ok_or("Expected ITEM: ATOMS")?;
    if !atoms_header.contains("ITEM: ATOMS") {
        return Err(format!("Expected ITEM: ATOMS, got: {}", atoms_header));
    }

    // Parse column names from header: "ITEM: ATOMS id type x y z ..."
    let columns: Vec<String> = atoms_header
        .strip_prefix("ITEM: ATOMS")
        .unwrap_or("")
        .split_whitespace()
        .map(String::from)
        .collect();

    if columns.is_empty() {
        return Err("No column names in ATOMS header".to_string());
    }

    // Find column indices for required fields
    let id_col = find_column(&columns, &["id"]);
    let type_col = find_column(&columns, &["type", "element"]);
    let x_col = find_column(&columns, &["x", "xu", "xs"]);
    let y_col = find_column(&columns, &["y", "yu", "ys"]);
    let z_col = find_column(&columns, &["z", "zu", "zs"]);

    let is_scaled = columns.iter().any(|c| c == "xs" || c == "ys" || c == "zs");

    // Identify extra property columns (everything that's not id/type/position)
    let pos_col_indices: Vec<usize> = [id_col, type_col, x_col, y_col, z_col]
        .iter()
        .filter_map(|c| *c)
        .collect();
    let extra_columns: Vec<(usize, String)> = columns
        .iter()
        .enumerate()
        .filter(|(i, _)| !pos_col_indices.contains(i))
        .map(|(i, name)| (i, name.clone()))
        .collect();

    // Pre-allocate arrays
    let n = natoms as usize;
    let mut ids = Vec::with_capacity(n);
    let mut types = Vec::with_capacity(n);
    let mut positions = Vec::with_capacity(n * 3);
    let mut extra_data: Vec<Vec<f32>> = extra_columns.iter().map(|_| Vec::with_capacity(n)).collect();

    // Box dimensions for scaled coordinate conversion
    let lx = box_bounds[1] - box_bounds[0];
    let ly = box_bounds[3] - box_bounds[2];
    let lz = box_bounds[5] - box_bounds[4];

    // ─── Parse atom lines ───
    for _ in 0..natoms {
        let line = match lines.next() {
            Some(l) if !l.starts_with("ITEM:") => l,
            _ => break,
        };

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < columns.len() {
            continue; // Skip malformed lines
        }

        // ID
        let atom_id: i32 = id_col
            .and_then(|i| parts.get(i))
            .and_then(|s| s.parse().ok())
            .unwrap_or(ids.len() as i32 + 1);
        ids.push(atom_id);

        // Type
        let atom_type: i32 = type_col
            .and_then(|i| parts.get(i))
            .and_then(|s| s.parse().ok())
            .unwrap_or(1);
        types.push(atom_type);

        // Position
        let raw_x: f64 = x_col
            .and_then(|i| parts.get(i))
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let raw_y: f64 = y_col
            .and_then(|i| parts.get(i))
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let raw_z: f64 = z_col
            .and_then(|i| parts.get(i))
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);

        // Convert scaled → Cartesian if needed
        let (x, y, z) = if is_scaled {
            (
                box_bounds[0] + raw_x * lx,
                box_bounds[2] + raw_y * ly,
                box_bounds[4] + raw_z * lz,
            )
        } else {
            (raw_x, raw_y, raw_z)
        };

        positions.push(x as f32);
        positions.push(y as f32);
        positions.push(z as f32);

        // Extra properties
        for (prop_idx, (col_idx, _)) in extra_columns.iter().enumerate() {
            let val: f32 = parts
                .get(*col_idx)
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            extra_data[prop_idx].push(val);
        }
    }

    let properties: Vec<(String, Vec<f32>)> = extra_columns
        .iter()
        .zip(extra_data.into_iter())
        .map(|((_, name), data)| (name.clone(), data))
        .collect();

    Ok(Frame {
        timestep,
        natoms: ids.len() as u32,
        box_bounds,
        box_tilt,
        triclinic,
        columns,
        ids,
        types,
        positions,
        properties,
        topological_bonds: None,
    })
}

/// Find a column index by trying multiple possible names.
fn find_column(columns: &[String], candidates: &[&str]) -> Option<usize> {
    for candidate in candidates {
        if let Some(pos) = columns.iter().position(|c| c == candidate) {
            return Some(pos);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_DUMP: &str = r#"ITEM: TIMESTEP
0
ITEM: NUMBER OF ATOMS
4
ITEM: BOX BOUNDS pp pp pp
0.0 10.0
0.0 10.0
0.0 10.0
ITEM: ATOMS id type x y z vx vy vz c_pe
1 1 1.0 2.0 3.0 0.01 -0.02 0.03 -3.5
2 1 4.0 5.0 6.0 -0.01 0.02 -0.03 -3.4
3 2 7.0 8.0 9.0 0.0 0.0 0.0 -2.1
4 2 2.5 3.5 4.5 0.01 0.01 0.01 -2.0
ITEM: TIMESTEP
100
ITEM: NUMBER OF ATOMS
4
ITEM: BOX BOUNDS pp pp pp
0.0 10.0
0.0 10.0
0.0 10.0
ITEM: ATOMS id type x y z vx vy vz c_pe
1 1 1.1 2.1 3.1 0.01 -0.02 0.03 -3.45
2 1 4.1 5.1 6.1 -0.01 0.02 -0.03 -3.35
3 2 7.1 8.1 9.1 0.0 0.0 0.0 -2.05
4 2 2.6 3.6 4.6 0.01 0.01 0.01 -1.95
"#;

    #[test]
    fn test_parse_dump_frames() {
        let frames = parse_dump_frames(SAMPLE_DUMP).unwrap();
        assert_eq!(frames.len(), 2);

        let f0 = &frames[0];
        assert_eq!(f0.timestep, 0);
        assert_eq!(f0.natoms, 4);
        assert_eq!(f0.ids, vec![1, 2, 3, 4]);
        assert_eq!(f0.types, vec![1, 1, 2, 2]);
        assert_eq!(f0.positions.len(), 12); // 4 atoms × 3 coords
        assert!((f0.positions[0] - 1.0).abs() < 1e-5); // atom 1 x
        assert!((f0.positions[1] - 2.0).abs() < 1e-5); // atom 1 y
        assert!((f0.positions[2] - 3.0).abs() < 1e-5); // atom 1 z

        // Check extra properties
        assert_eq!(f0.columns.len(), 9); // id type x y z vx vy vz c_pe
        let pe = f0
            .properties
            .iter()
            .find(|(k, _)| k == "c_pe")
            .unwrap();
        assert_eq!(pe.1.len(), 4);
        assert!((pe.1[0] - (-3.5)).abs() < 1e-5);

        // Second frame
        let f1 = &frames[1];
        assert_eq!(f1.timestep, 100);
        assert!((f1.positions[0] - 1.1).abs() < 1e-5);
    }

    #[test]
    fn test_count_frames() {
        assert_eq!(count_dump_frames(SAMPLE_DUMP), 2);
    }

    #[test]
    fn test_scaled_coordinates() {
        let dump = r#"ITEM: TIMESTEP
0
ITEM: NUMBER OF ATOMS
2
ITEM: BOX BOUNDS pp pp pp
0.0 10.0
0.0 20.0
0.0 30.0
ITEM: ATOMS id type xs ys zs
1 1 0.5 0.5 0.5
2 1 0.0 0.0 0.0
"#;
        let frames = parse_dump_frames(dump).unwrap();
        let f = &frames[0];
        // Scaled 0.5 in box [0,10] → Cartesian 5.0
        assert!((f.positions[0] - 5.0).abs() < 1e-5);
        assert!((f.positions[1] - 10.0).abs() < 1e-5);
        assert!((f.positions[2] - 15.0).abs() < 1e-5);
    }
}
