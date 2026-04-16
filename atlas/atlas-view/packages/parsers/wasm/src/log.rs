use crate::types::{ThermoData, ThermoRun};
use wasm_bindgen::prelude::*;

/// Parse a LAMMPS log file and extract thermodynamic data from all runs.
///
/// Handles the standard "line" thermo_style output format:
/// ```text
/// Step Temp E_pair E_mol TotEng Press
///     0    300   -4.200    0.000   -3.900    1.234
///   100    298   -4.195    0.000   -3.897    2.345
/// ...
/// Loop time of 12.3456 on 4 procs ...
/// ```
///
/// Detection strategy:
/// - Header line: all tokens are non-numeric (column names)
/// - Data lines: all tokens are numeric
/// - End markers: "Loop time", "ERROR", "WARNING", empty line, or new header
#[wasm_bindgen(js_name = "parseLog")]
pub fn parse_log(content: &str) -> Result<ThermoData, JsError> {
    let runs = parse_log_runs(content)
        .map_err(|e| JsError::new(&format!("Log parse error: {}", e)))?;

    Ok(ThermoData {
        num_runs: runs.len() as u32,
        runs,
    })
}

/// Count the number of thermo output runs in a log file.
#[wasm_bindgen(js_name = "countLogRuns")]
pub fn count_log_runs(content: &str) -> u32 {
    parse_log_runs(content)
        .map(|r| r.len() as u32)
        .unwrap_or(0)
}

// ─── Internal implementation ─────────────────────────────────

pub(crate) fn parse_log_runs(content: &str) -> Result<Vec<ThermoRun>, String> {
    let mut runs: Vec<ThermoRun> = Vec::new();
    let mut current_columns: Option<Vec<String>> = None;
    let mut current_data: Vec<f64> = Vec::new();
    let mut current_nrows: usize = 0;

    for line in content.lines() {
        let trimmed = line.trim();

        // Skip empty lines and known non-data lines
        if trimmed.is_empty() {
            if let Some(cols) = current_columns.take() {
                if current_nrows > 0 {
                    runs.push(ThermoRun {
                        columns: cols,
                        data: std::mem::take(&mut current_data),
                        nrows: current_nrows,
                    });
                    current_nrows = 0;
                }
            }
            continue;
        }

        // End markers
        if trimmed.starts_with("Loop time")
            || trimmed.starts_with("ERROR")
            || trimmed.starts_with("WARNING")
            || trimmed.starts_with("Total wall time")
            || trimmed.starts_with("LAMMPS")
            || trimmed.starts_with("Per MPI rank")
            || trimmed.starts_with("Nlocal:")
        {
            if let Some(cols) = current_columns.take() {
                if current_nrows > 0 {
                    runs.push(ThermoRun {
                        columns: cols,
                        data: std::mem::take(&mut current_data),
                        nrows: current_nrows,
                    });
                    current_nrows = 0;
                }
            }
            continue;
        }

        let tokens: Vec<&str> = trimmed.split_whitespace().collect();
        if tokens.is_empty() {
            continue;
        }

        // Determine if this is a header line (all non-numeric) or data line (all numeric)
        let all_numeric = tokens.iter().all(|t| is_numeric(t));
        let all_non_numeric = tokens.iter().all(|t| !is_numeric(t));

        if all_non_numeric && tokens.len() >= 2 {
            // This looks like a header line
            // First, finalize any existing run
            if let Some(cols) = current_columns.take() {
                if current_nrows > 0 {
                    runs.push(ThermoRun {
                        columns: cols,
                        data: std::mem::take(&mut current_data),
                        nrows: current_nrows,
                    });
                    current_nrows = 0;
                }
            }

            // Check if first token is a typical thermo header keyword
            if is_likely_thermo_header(&tokens) {
                current_columns = Some(tokens.iter().map(|s| s.to_string()).collect());
                current_data.clear();
                current_nrows = 0;
            }
        } else if all_numeric && current_columns.is_some() {
            // This is a data line belonging to the current run
            let ncols = current_columns.as_ref().unwrap().len();
            if tokens.len() == ncols {
                for token in &tokens {
                    let val: f64 = token.parse().unwrap_or(f64::NAN);
                    current_data.push(val);
                }
                current_nrows += 1;
            }
            // If column count doesn't match, skip the line (malformed)
        }
    }

    // Finalize last run
    if let Some(cols) = current_columns.take() {
        if current_nrows > 0 {
            runs.push(ThermoRun {
                columns: cols,
                data: current_data,
                nrows: current_nrows,
            });
        }
    }

    Ok(runs)
}

/// Check if a string can be parsed as a number (int or float, including scientific notation)
fn is_numeric(s: &str) -> bool {
    s.parse::<f64>().is_ok()
}

/// Heuristic: is this token list likely a LAMMPS thermo header?
/// Look for common keywords like Step, Temp, Press, TotEng, etc.
fn is_likely_thermo_header(tokens: &[&str]) -> bool {
    const KNOWN_HEADERS: &[&str] = &[
        "Step", "Temp", "TotEng", "KinEng", "PotEng", "E_pair", "E_mol",
        "E_bond", "E_angle", "E_dihed", "E_impro", "E_vdwl", "E_coul",
        "E_long", "E_tail", "Press", "Volume", "Density", "Lx", "Ly", "Lz",
        "Atoms", "Bonds", "Angles", "Dihedrals", "Impropers", "Pxx", "Pyy",
        "Pzz", "Pxy", "Pxz", "Pyz", "Fmax", "Fnorm", "Cella", "Cellb",
        "Time", "CPU", "v_", "c_", "f_",
    ];

    tokens.iter().any(|t| {
        KNOWN_HEADERS.iter().any(|h| t.starts_with(h))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_log() {
        let log = r#"LAMMPS (2 Aug 2023)
Reading data file ...
  1000 atoms

Step Temp E_pair TotEng Press
       0          300   -4.2   -3.9    1.234
     100          298   -4.195   -3.897    2.345
     200          301   -4.198   -3.895    1.567
Loop time of 12.3456 on 4 procs for 200 steps with 1000 atoms
"#;
        let runs = parse_log_runs(log).unwrap();
        assert_eq!(runs.len(), 1);
        assert_eq!(runs[0].columns, vec!["Step", "Temp", "E_pair", "TotEng", "Press"]);
        assert_eq!(runs[0].nrows, 3);
        assert!((runs[0].data[0] - 0.0).abs() < 1e-10); // Step 0
        assert!((runs[0].data[1] - 300.0).abs() < 1e-10); // Temp 300
    }

    #[test]
    fn test_multiple_runs() {
        let log = r#"
Step Temp TotEng
0 300 -4.0
100 299 -4.1
Loop time of 1.0 on 1 procs

Step Temp TotEng Press
0 300 -4.0 1.0
200 310 -3.9 2.0
400 305 -3.95 1.5
Loop time of 2.0 on 1 procs
"#;
        let runs = parse_log_runs(log).unwrap();
        assert_eq!(runs.len(), 2);
        assert_eq!(runs[0].nrows, 2);
        assert_eq!(runs[0].columns.len(), 3);
        assert_eq!(runs[1].nrows, 3);
        assert_eq!(runs[1].columns.len(), 4); // Has Press column
    }
}
