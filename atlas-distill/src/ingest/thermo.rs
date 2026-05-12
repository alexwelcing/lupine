//! LAMMPS thermo log parser — adapted from atlas-view (WASM-free, f64 precision).

use anyhow::{Context, Result};
use std::path::Path;

/// Thermo data from a single LAMMPS `run` command.
#[derive(Debug, Clone)]
pub struct ThermoRun {
    /// Column headers (e.g. ["Step", "Temp", "TotEng", "Press"])
    pub columns: Vec<String>,
    /// Row-major data: data[row * num_columns + col]
    pub data: Vec<f64>,
    /// Number of rows
    pub nrows: usize,
}

impl ThermoRun {
    /// Extract a single column by name.
    pub fn get_column(&self, name: &str) -> Option<Vec<f64>> {
        let col_idx = self.columns.iter().position(|c| c == name)?;
        let ncols = self.columns.len();
        let values: Vec<f64> = (0..self.nrows)
            .map(|row| self.data[row * ncols + col_idx])
            .collect();
        Some(values)
    }

    /// Extract two columns as (x, y) pairs.
    pub fn get_pair(&self, x_name: &str, y_name: &str) -> Option<Vec<(f64, f64)>> {
        let xs = self.get_column(x_name)?;
        let ys = self.get_column(y_name)?;
        Some(xs.into_iter().zip(ys).collect())
    }
}

/// Parse a LAMMPS log file from disk.
pub fn parse_log(path: &Path) -> Result<Vec<ThermoRun>> {
    let content =
        std::fs::read_to_string(path).with_context(|| format!("Reading {}", path.display()))?;
    parse_log_str(&content)
}

/// Parse a LAMMPS log from a string.
pub fn parse_log_str(content: &str) -> Result<Vec<ThermoRun>> {
    let mut runs: Vec<ThermoRun> = Vec::new();
    let mut current_columns: Option<Vec<String>> = None;
    let mut current_data: Vec<f64> = Vec::new();
    let mut current_nrows: usize = 0;

    for line in content.lines() {
        let trimmed = line.trim();

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

        let all_numeric = tokens.iter().all(|t| t.parse::<f64>().is_ok());
        let all_non_numeric = tokens.iter().all(|t| t.parse::<f64>().is_err());

        if all_non_numeric && tokens.len() >= 2 {
            // Header line
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

            if is_likely_thermo_header(&tokens) {
                current_columns = Some(tokens.iter().map(|s| s.to_string()).collect());
                current_data.clear();
                current_nrows = 0;
            }
        } else if all_numeric && current_columns.is_some() {
            let ncols = current_columns.as_ref().unwrap().len();
            if tokens.len() == ncols {
                for token in &tokens {
                    let val: f64 = token.parse().unwrap_or(f64::NAN);
                    current_data.push(val);
                }
                current_nrows += 1;
            }
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

fn is_likely_thermo_header(tokens: &[&str]) -> bool {
    const KNOWN: &[&str] = &[
        "Step", "Temp", "TotEng", "KinEng", "PotEng", "E_pair", "E_mol", "E_bond", "E_angle",
        "E_dihed", "Press", "Volume", "Density", "Lx", "Ly", "Lz", "Pxx", "Pyy", "Pzz", "Pxy",
        "Pxz", "Pyz", "Time", "CPU", "v_", "c_", "f_",
    ];
    tokens
        .iter()
        .any(|t| KNOWN.iter().any(|h| t.starts_with(h)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_single_run() {
        let log = "\
Step Temp E_pair TotEng Press
       0          300   -4.2   -3.9    1.234
     100          298   -4.195   -3.897    2.345
     200          301   -4.198   -3.895    1.567
Loop time of 12.3456 on 4 procs for 200 steps with 1000 atoms
";
        let runs = parse_log_str(log).unwrap();
        assert_eq!(runs.len(), 1);
        assert_eq!(
            runs[0].columns,
            vec!["Step", "Temp", "E_pair", "TotEng", "Press"]
        );
        assert_eq!(runs[0].nrows, 3);
    }

    #[test]
    fn test_get_column() {
        let log = "\
Step Temp Press
0 300 1.0
100 350 2.0
200 400 3.0
Loop time of 1.0 on 1 procs
";
        let runs = parse_log_str(log).unwrap();
        let temps = runs[0].get_column("Temp").unwrap();
        assert_eq!(temps, vec![300.0, 350.0, 400.0]);
    }

    #[test]
    fn test_get_pair() {
        let log = "\
Step Temp Press
0 300 1.0
100 350 2.0
200 400 3.0
Loop time of 1.0 on 1 procs
";
        let runs = parse_log_str(log).unwrap();
        let pairs = runs[0].get_pair("Temp", "Press").unwrap();
        assert_eq!(pairs.len(), 3);
        assert!((pairs[0].0 - 300.0).abs() < 1e-10);
        assert!((pairs[0].1 - 1.0).abs() < 1e-10);
    }
}
