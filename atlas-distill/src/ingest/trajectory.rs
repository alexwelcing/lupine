//! LAMMPS dump file parser — adapted from atlas-view (f64 precision, native).

use anyhow::{Context, Result};
use std::collections::HashMap;
use std::path::Path;

/// A single frame of atomic data.
#[derive(Debug, Clone)]
pub struct Frame {
    pub timestep: u64,
    pub natoms: u32,
    pub box_bounds: [f64; 6],
    pub positions: Vec<f64>,
    pub velocities: Vec<f64>,
    pub types: Vec<i32>,
    pub properties: HashMap<String, Vec<f64>>,
}

impl Frame {
    /// Get the timestep as a float (for fitting against time).
    pub fn time(&self, dt: f64) -> f64 {
        self.timestep as f64 * dt
    }
}

/// Parse a LAMMPS dump file from disk.
pub fn parse_dump(path: &Path) -> Result<Vec<Frame>> {
    let content =
        std::fs::read_to_string(path).with_context(|| format!("Reading {}", path.display()))?;
    parse_dump_str(&content)
}

/// Parse a LAMMPS dump from a string.
pub fn parse_dump_str(content: &str) -> Result<Vec<Frame>> {
    let mut frames = Vec::new();
    let mut lines = content.lines().peekable();

    while lines.peek().is_some() {
        // Advance to next ITEM: TIMESTEP
        loop {
            match lines.peek() {
                Some(line) if line.starts_with("ITEM: TIMESTEP") => break,
                Some(_) => {
                    lines.next();
                }
                None => return Ok(frames),
            }
        }

        match parse_single_frame(&mut lines) {
            Ok(frame) => frames.push(frame),
            Err(_) => continue,
        }
    }

    Ok(frames)
}

fn parse_single_frame<'a, I>(lines: &mut std::iter::Peekable<I>) -> Result<Frame>
where
    I: Iterator<Item = &'a str>,
{
    // ITEM: TIMESTEP
    let _ = lines.next();
    let timestep: u64 = lines
        .next()
        .context("Expected timestep")?
        .trim()
        .parse()
        .context("Invalid timestep")?;

    // ITEM: NUMBER OF ATOMS
    let _ = lines.next();
    let natoms: u32 = lines
        .next()
        .context("Expected atom count")?
        .trim()
        .parse()
        .context("Invalid atom count")?;

    // ITEM: BOX BOUNDS
    let box_header = lines.next().context("Expected BOX BOUNDS")?;
    let triclinic = box_header.contains("xy");
    let mut box_bounds = [0.0f64; 6];

    for dim in 0..3 {
        let bound_line = lines.next().context("Expected box bound line")?;
        let parts: Vec<f64> = bound_line
            .split_whitespace()
            .filter_map(|s| match s.parse::<f64>() {
                Ok(v) => Some(v),
                Err(e) => {
                    eprintln!(
                        "    ⚠ trajectory: dropping unparseable box-bound value {:?} on dim {}: {}",
                        s, dim, e
                    );
                    None
                }
            })
            .collect();

        if parts.len() >= 2 {
            box_bounds[dim * 2] = parts[0];
            box_bounds[dim * 2 + 1] = parts[1];
        } else {
            eprintln!(
                "    ⚠ trajectory: box-bound line for dim {} yielded {} usable floats; using defaults",
                dim,
                parts.len()
            );
        }
    }

    // ITEM: ATOMS
    let atoms_header = lines.next().context("Expected ITEM: ATOMS")?;
    let columns: Vec<String> = atoms_header
        .strip_prefix("ITEM: ATOMS")
        .unwrap_or("")
        .split_whitespace()
        .map(String::from)
        .collect();

    let id_col = find_col(&columns, &["id"]);
    let type_col = find_col(&columns, &["type"]);
    let x_col = find_col(&columns, &["x", "xu", "xs"]);
    let y_col = find_col(&columns, &["y", "yu", "ys"]);
    let z_col = find_col(&columns, &["z", "zu", "zs"]);
    let vx_col = find_col(&columns, &["vx"]);
    let vy_col = find_col(&columns, &["vy"]);
    let vz_col = find_col(&columns, &["vz"]);

    let is_scaled = columns.iter().any(|c| c == "xs" || c == "ys" || c == "zs");
    let has_velocity = vx_col.is_some() && vy_col.is_some() && vz_col.is_some();

    let lx = box_bounds[1] - box_bounds[0];
    let ly = box_bounds[3] - box_bounds[2];
    let lz = box_bounds[5] - box_bounds[4];

    let n = natoms as usize;
    let mut positions = Vec::with_capacity(n * 3);
    let mut velocities = Vec::with_capacity(if has_velocity { n * 3 } else { 0 });
    let mut types = Vec::with_capacity(n);

    // Identify extra property columns
    let core_cols: Vec<Option<usize>> = vec![id_col, type_col, x_col, y_col, z_col, vx_col, vy_col, vz_col];
    let core_set: Vec<usize> = core_cols.iter().filter_map(|c| *c).collect();
    let extra_cols: Vec<(usize, String)> = columns
        .iter()
        .enumerate()
        .filter(|(i, _)| !core_set.contains(i))
        .map(|(i, name)| (i, name.clone()))
        .collect();
    let mut extra_data: Vec<Vec<f64>> = extra_cols.iter().map(|_| Vec::with_capacity(n)).collect();

    for _ in 0..natoms {
        let line = match lines.next() {
            Some(l) if !l.starts_with("ITEM:") => l,
            _ => break,
        };

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < columns.len() {
            continue;
        }

        let atom_type: i32 = type_col
            .and_then(|i| parts.get(i))
            .and_then(|s| s.parse().ok())
            .unwrap_or(1);
        types.push(atom_type);

        let raw_x: f64 = x_col.and_then(|i| parts.get(i)).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let raw_y: f64 = y_col.and_then(|i| parts.get(i)).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let raw_z: f64 = z_col.and_then(|i| parts.get(i)).and_then(|s| s.parse().ok()).unwrap_or(0.0);

        let (x, y, z) = if is_scaled {
            (
                box_bounds[0] + raw_x * lx,
                box_bounds[2] + raw_y * ly,
                box_bounds[4] + raw_z * lz,
            )
        } else {
            (raw_x, raw_y, raw_z)
        };

        positions.push(x);
        positions.push(y);
        positions.push(z);

        if has_velocity {
            let vx: f64 = vx_col.and_then(|i| parts.get(i)).and_then(|s| s.parse().ok()).unwrap_or(0.0);
            let vy: f64 = vy_col.and_then(|i| parts.get(i)).and_then(|s| s.parse().ok()).unwrap_or(0.0);
            let vz: f64 = vz_col.and_then(|i| parts.get(i)).and_then(|s| s.parse().ok()).unwrap_or(0.0);
            velocities.push(vx);
            velocities.push(vy);
            velocities.push(vz);
        }

        for (prop_idx, (col_idx, _)) in extra_cols.iter().enumerate() {
            let val: f64 = parts.get(*col_idx).and_then(|s| s.parse().ok()).unwrap_or(0.0);
            extra_data[prop_idx].push(val);
        }
    }

    let mut properties = HashMap::new();
    for ((_, name), data) in extra_cols.iter().zip(extra_data) {
        properties.insert(name.clone(), data);
    }

    Ok(Frame {
        timestep,
        natoms: types.len() as u32,
        box_bounds,
        positions,
        velocities,
        types,
        properties,
    })
}

fn find_col(columns: &[String], candidates: &[&str]) -> Option<usize> {
    for c in candidates {
        if let Some(pos) = columns.iter().position(|col| col == c) {
            return Some(pos);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_dump() {
        let dump = "\
ITEM: TIMESTEP
0
ITEM: NUMBER OF ATOMS
3
ITEM: BOX BOUNDS pp pp pp
0.0 10.0
0.0 10.0
0.0 10.0
ITEM: ATOMS id type x y z vx vy vz
1 1 1.0 2.0 3.0 0.1 0.2 0.3
2 1 4.0 5.0 6.0 -0.1 -0.2 -0.3
3 2 7.0 8.0 9.0 0.0 0.0 0.0
ITEM: TIMESTEP
100
ITEM: NUMBER OF ATOMS
3
ITEM: BOX BOUNDS pp pp pp
0.0 10.0
0.0 10.0
0.0 10.0
ITEM: ATOMS id type x y z vx vy vz
1 1 1.1 2.1 3.1 0.1 0.2 0.3
2 1 4.1 5.1 6.1 -0.1 -0.2 -0.3
3 2 7.1 8.1 9.1 0.0 0.0 0.0
";
        let frames = parse_dump_str(dump).unwrap();
        assert_eq!(frames.len(), 2);
        assert_eq!(frames[0].natoms, 3);
        assert!((frames[0].positions[0] - 1.0).abs() < 1e-10);
        assert!(!frames[0].velocities.is_empty());
        assert!((frames[0].velocities[0] - 0.1).abs() < 1e-10);
    }

    #[test]
    fn test_scaled_coordinates() {
        let dump = "\
ITEM: TIMESTEP
0
ITEM: NUMBER OF ATOMS
1
ITEM: BOX BOUNDS pp pp pp
0.0 10.0
0.0 20.0
0.0 30.0
ITEM: ATOMS id type xs ys zs
1 1 0.5 0.5 0.5
";
        let frames = parse_dump_str(dump).unwrap();
        assert!((frames[0].positions[0] - 5.0).abs() < 1e-10);
        assert!((frames[0].positions[1] - 10.0).abs() < 1e-10);
        assert!((frames[0].positions[2] - 15.0).abs() < 1e-10);
    }
}
