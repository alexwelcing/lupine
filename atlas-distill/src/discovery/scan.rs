//! Discovery scanner — systematically tries all models on data pairs.

use crate::fitting::{self, FitResult};
use crate::ingest::thermo::ThermoRun;
use anyhow::Result;
use serde::Serialize;

/// A discovered mathematical relationship.
#[derive(Debug, Clone, Serialize)]
pub struct Discovery {
    pub x_label: String,
    pub y_label: String,
    pub best_model: String,
    pub equation: String,
    pub params: Vec<f64>,
    pub param_names: Vec<String>,
    pub r_squared: f64,
    pub residual_rms: f64,
    pub n_points: usize,
    pub physical_note: String,
}

impl Discovery {
    pub fn from_fit(x: &str, y: &str, model: &str, fit: &FitResult) -> Self {
        let note = generate_physical_note(x, y, model, &fit.params);

        Self {
            x_label: x.to_string(),
            y_label: y.to_string(),
            best_model: model.to_string(),
            equation: fit.equation.clone(),
            params: fit.params.clone(),
            param_names: fit.param_names.clone(),
            r_squared: fit.r_squared,
            residual_rms: fit.residual_rms,
            n_points: fit.n_points,
            physical_note: note,
        }
    }
}

/// Try all models on a dataset and return the best one.
fn best_fit(data: &[(f64, f64)]) -> FitResult {
    if data.len() < 3 {
        return fitting::linear::linear_fit(data);
    }

    let candidates: Vec<FitResult> = vec![
        fitting::linear::linear_fit(data),
        fitting::power_law::power_law_fit(data),
        fitting::arrhenius::arrhenius_fit(data),
        fitting::polynomial::best_polynomial(data, 4),
        fitting::symbolic::symbolic_fit(data, 300, 40),
    ];

    // Select by R² (adjusted for complexity — prefer simpler models when R² is close)
    candidates
        .into_iter()
        .filter(|f| f.r_squared.is_finite() && f.r_squared > -1.0)
        .max_by(|a, b| {
            let a_score = a.r_squared - 0.001 * a.params.len() as f64;
            let b_score = b.r_squared - 0.001 * b.params.len() as f64;
            a_score
                .partial_cmp(&b_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        })
        .unwrap_or_else(|| fitting::linear::linear_fit(data))
}

/// Fit a single observable pair (x, y) → best model.
pub fn fit_observable(x_label: &str, y_label: &str, data: &[(f64, f64)]) -> Discovery {
    let fit = best_fit(data);
    Discovery::from_fit(x_label, y_label, &fit.model, &fit)
}

/// Scan a single (x, y) pair from a thermo run.
pub fn scan_pair(run: &ThermoRun, x_col: &str, y_col: &str) -> Result<Discovery> {
    let pairs = run
        .get_pair(x_col, y_col)
        .ok_or_else(|| anyhow::anyhow!("Column '{}' or '{}' not found", x_col, y_col))?;

    if pairs.is_empty() {
        anyhow::bail!("No data for {} vs {}", x_col, y_col);
    }

    Ok(fit_observable(x_col, y_col, &pairs))
}

/// Scan all columns in a thermo run against x_col.
pub fn scan_thermo_run(run: &ThermoRun, x_col: &str) -> Result<Vec<Discovery>> {
    let mut results = Vec::new();

    for col in &run.columns {
        if col == x_col {
            continue;
        }

        if let Some(pairs) = run.get_pair(x_col, col) {
            if pairs.len() >= 3 {
                let disc = fit_observable(x_col, col, &pairs);
                // Only report fits with R² > 0.5
                if disc.r_squared > 0.5 {
                    results.push(disc);
                }
            }
        }
    }

    // Sort by R² descending
    results.sort_by(|a, b| {
        b.r_squared
            .partial_cmp(&a.r_squared)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(results)
}

/// Generate a human-readable note about the physical significance.
fn generate_physical_note(x: &str, y: &str, model: &str, params: &[f64]) -> String {
    let x_lower = x.to_lowercase();
    let y_lower = y.to_lowercase();

    // MSD analysis
    if y_lower.contains("msd") && model == "power_law" && params.len() >= 2 {
        let beta = params[1];
        return if (beta - 1.0).abs() < 0.1 {
            format!(
                "Normal diffusion (β = {:.3} ≈ 1). D = {:.4e} / 6",
                beta, params[0]
            )
        } else if beta < 0.9 {
            format!(
                "Subdiffusion (β = {:.3} < 1). System may be confined or glassy.",
                beta
            )
        } else if beta > 1.1 {
            format!(
                "Superdiffusion (β = {:.3} > 1). Ballistic or active transport.",
                beta
            )
        } else {
            format!("Nearly-normal diffusion (β = {:.3})", beta)
        };
    }

    // Temperature dependence
    if x_lower.contains("temp") && model == "arrhenius" && params.len() >= 2 {
        return format!(
            "Arrhenius behavior: activation energy Eₐ = {:.4} eV ({:.1} kJ/mol)",
            params[1],
            params[1] * 96.485 // eV to kJ/mol
        );
    }

    // Power law with temperature
    if x_lower.contains("temp") && model == "power_law" && params.len() >= 2 {
        return format!(
            "Power-law temperature dependence: exponent = {:.3}",
            params[1]
        );
    }

    // Stress-strain
    if (x_lower.contains("strain") || x_lower.contains("lx"))
        && (y_lower.contains("stress") || y_lower.contains("pxx") || y_lower.contains("press"))
    {
        if model == "linear" && !params.is_empty() {
            return format!(
                "Young's modulus ≈ {:.4e} (from linear stress-strain fit)",
                params[0]
            );
        }
        if model == "power_law" && params.len() >= 2 {
            return format!(
                "Power-law hardening: σ = {:.4e} · ε^{:.3} (Hollomon equation)",
                params[0], params[1]
            );
        }
    }

    // Generic
    match model {
        "linear" => format!(
            "Linear relationship with slope = {:.6e}",
            params.first().unwrap_or(&0.0)
        ),
        "power_law" if params.len() >= 2 => format!("Power law with exponent = {:.4}", params[1]),
        "arrhenius" if params.len() >= 2 => format!("Activation energy = {:.4} eV", params[1]),
        _ => String::from("Discovered relationship"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fit_linear_data() {
        let data: Vec<(f64, f64)> = (0..20).map(|i| (i as f64, 2.0 * i as f64 + 1.0)).collect();
        let disc = fit_observable("x", "y", &data);
        assert!(disc.r_squared > 0.99);
    }

    #[test]
    fn test_fit_power_law_data() {
        let data: Vec<(f64, f64)> = (1..=20)
            .map(|i| {
                let x = i as f64;
                (x, 5.0 * x.powf(2.0))
            })
            .collect();
        let disc = fit_observable("x", "y", &data);
        assert!(disc.r_squared > 0.99);
    }

    #[test]
    fn test_scan_thermo_run() {
        let run = ThermoRun {
            columns: vec!["Step".into(), "Temp".into(), "Press".into()],
            data: vec![
                0.0, 300.0, 1.0, 100.0, 310.0, 2.0, 200.0, 320.0, 3.0, 300.0, 330.0, 4.0, 400.0,
                340.0, 5.0,
            ],
            nrows: 5,
        };
        let results = scan_thermo_run(&run, "Step").unwrap();
        assert!(!results.is_empty());
    }
}
