//! Stress-strain extraction from thermo data.

use crate::ingest::thermo::ThermoRun;

/// Extract stress-strain curve from thermo data.
///
/// Looks for Pxx/Pyy/Pzz (stress) and a strain column (e.g. v_strain).
/// Falls back to Lx-based engineering strain if no explicit strain column.
pub fn extract_stress_strain(
    run: &ThermoRun,
    stress_col: Option<&str>,
    strain_col: Option<&str>,
) -> Vec<(f64, f64)> {
    let stress_name = stress_col.unwrap_or("Pxx");
    let strain_name = strain_col.unwrap_or("v_strain");

    // Try explicit columns first
    if let Some(pairs) = run.get_pair(strain_name, stress_name) {
        return pairs;
    }

    // Fallback: compute engineering strain from Lx
    if let (Some(lx_vals), Some(stress_vals)) = (run.get_column("Lx"), run.get_column(stress_name))
    {
        if !lx_vals.is_empty() {
            let l0 = lx_vals[0];
            if l0.abs() > 1e-30 {
                return lx_vals
                    .iter()
                    .zip(stress_vals.iter())
                    .map(|(lx, s)| ((lx - l0) / l0, *s))
                    .collect();
            }
        }
    }

    vec![]
}

/// Estimate Young's modulus from the initial linear regime of stress-strain.
pub fn youngs_modulus(stress_strain: &[(f64, f64)], max_strain: f64) -> Option<f64> {
    let linear: Vec<&(f64, f64)> = stress_strain
        .iter()
        .filter(|(e, _)| e.abs() <= max_strain)
        .collect();

    if linear.len() < 2 {
        return None;
    }

    // Linear regression
    let n = linear.len() as f64;
    let sum_e: f64 = linear.iter().map(|(e, _)| e).sum();
    let sum_s: f64 = linear.iter().map(|(_, s)| s).sum();
    let sum_e2: f64 = linear.iter().map(|(e, _)| e * e).sum();
    let sum_es: f64 = linear.iter().map(|(e, s)| e * s).sum();

    let denom = n * sum_e2 - sum_e * sum_e;
    if denom.abs() < 1e-30 {
        return None;
    }

    Some((n * sum_es - sum_e * sum_s) / denom)
}
