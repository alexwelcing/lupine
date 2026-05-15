//! Arrhenius fitting: y = A · exp(−Eₐ / kT)
//!
//! Linearized: ln(y) = ln(A) − (Eₐ/k_B) · (1/T)
//!
//! k_B = 8.617333e-5 eV/K (Boltzmann constant)

use crate::fitting::FitResult;

const KB_EV: f64 = 8.617333e-5; // eV/K

/// Fit the Arrhenius form y = A * exp(-Ea / kT).
///
/// Input: (T, y) pairs where T is temperature in Kelvin.
/// Output: pre-exponential A, activation energy Ea in eV.
pub fn arrhenius_fit(data: &[(f64, f64)]) -> FitResult {
    // Transform to (1/T, ln(y))
    let transformed: Vec<(f64, f64)> = data
        .iter()
        .filter(|(t, y)| *t > 0.0 && *y > 0.0)
        .map(|(t, y)| (1.0 / t, y.ln()))
        .collect();

    if transformed.len() < 2 {
        return FitResult::new(
            "arrhenius",
            "insufficient data (need T > 0 and y > 0)",
            vec![],
            vec![],
            0.0,
            f64::INFINITY,
            0,
        );
    }

    // Linear regression: ln(y) = ln(A) - (Ea/kB) * (1/T)
    let n = transformed.len() as f64;
    let sum_invt: f64 = transformed.iter().map(|(invt, _)| invt).sum();
    let sum_lny: f64 = transformed.iter().map(|(_, lny)| lny).sum();
    let sum_invt2: f64 = transformed.iter().map(|(invt, _)| invt * invt).sum();
    let sum_invt_lny: f64 = transformed.iter().map(|(invt, lny)| invt * lny).sum();

    let denom = n * sum_invt2 - sum_invt * sum_invt;
    if denom.abs() < 1e-30 {
        return FitResult::new(
            "arrhenius",
            "singular",
            vec![],
            vec![],
            0.0,
            f64::INFINITY,
            data.len(),
        );
    }

    let slope = (n * sum_invt_lny - sum_invt * sum_lny) / denom; // = -Ea/kB
    let intercept = (sum_lny - slope * sum_invt) / n; // = ln(A)

    let ea = -slope * KB_EV; // Activation energy in eV
    let a = intercept.exp();

    // R² in original space
    let y_mean: f64 = data.iter().map(|(_, y)| y).sum::<f64>() / data.len() as f64;
    let ss_tot: f64 = data.iter().map(|(_, y)| (y - y_mean).powi(2)).sum();
    let ss_res: f64 = data
        .iter()
        .filter(|(t, _)| *t > 0.0)
        .map(|(t, y)| {
            let pred = a * (-ea / (KB_EV * t)).exp();
            (y - pred).powi(2)
        })
        .sum();

    let r_squared = if ss_tot > 1e-30 {
        1.0 - ss_res / ss_tot
    } else {
        0.0
    };
    let rms = (ss_res / data.len() as f64).sqrt();

    let equation = format!("y = {:.4e} · exp({:.4} eV / kT)", a, -ea);

    FitResult::new(
        "arrhenius",
        &equation,
        vec![a, ea],
        vec!["pre_exponential_A".into(), "activation_energy_Ea_eV".into()],
        r_squared,
        rms,
        data.len(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_arrhenius_known_ea() {
        // Generate data with Ea = 0.5 eV, A = 1e10
        let a = 1e10;
        let ea = 0.5; // eV
        let temps = [300.0, 400.0, 500.0, 600.0, 700.0, 800.0, 900.0, 1000.0];

        let data: Vec<(f64, f64)> = temps
            .iter()
            .map(|&t| (t, a * (-ea / (KB_EV * t)).exp()))
            .collect();

        let fit = arrhenius_fit(&data);
        assert!(
            (fit.params[1] - 0.5).abs() < 0.01,
            "Ea should be ~0.5 eV, got {}",
            fit.params[1]
        );
        assert!(fit.r_squared > 0.999);
    }
}
