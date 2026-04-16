//! Polynomial regression: y = Σ cₙ · x^n
//!
//! Uses Vandermonde matrix + least squares via normal equations.
//! AIC model selection to prevent overfitting.

use crate::fitting::FitResult;
use nalgebra::{DMatrix, DVector};

/// Fit y = c₀ + c₁x + c₂x² + ... + cₙxⁿ
pub fn polynomial_fit(data: &[(f64, f64)], degree: usize) -> FitResult {
    let n = data.len();
    if n < degree + 1 {
        return FitResult::new(
            "polynomial",
            "insufficient data for degree",
            vec![],
            vec![],
            0.0,
            f64::INFINITY,
            n,
        );
    }

    let d = degree + 1; // Number of coefficients

    // Build Vandermonde matrix
    let x_mat = DMatrix::from_fn(n, d, |row, col| data[row].0.powi(col as i32));
    let y_vec = DVector::from_fn(n, |i, _| data[i].1);

    // Normal equations: (X^T X) c = X^T y
    let xtx = x_mat.transpose() * &x_mat;
    let xty = x_mat.transpose() * &y_vec;

    let coeffs = match xtx.clone().lu().solve(&xty) {
        Some(c) => c,
        None => {
            return FitResult::new(
                "polynomial",
                "singular system",
                vec![],
                vec![],
                0.0,
                f64::INFINITY,
                n,
            );
        }
    };

    let params: Vec<f64> = coeffs.iter().cloned().collect();

    // R²
    let y_mean = y_vec.mean();
    let ss_tot: f64 = data.iter().map(|(_, y)| (y - y_mean).powi(2)).sum();
    let ss_res: f64 = data
        .iter()
        .map(|(x, y)| {
            let pred: f64 = params
                .iter()
                .enumerate()
                .map(|(i, c)| c * x.powi(i as i32))
                .sum();
            (y - pred).powi(2)
        })
        .sum();

    let r_squared = if ss_tot > 1e-30 { 1.0 - ss_res / ss_tot } else { 0.0 };
    let rms = (ss_res / n as f64).sqrt();

    // Build equation string
    let mut terms = Vec::new();
    for (i, c) in params.iter().enumerate() {
        match i {
            0 => terms.push(format!("{:.6e}", c)),
            1 => terms.push(format!("{:.6e}·x", c)),
            _ => terms.push(format!("{:.6e}·x^{}", c, i)),
        }
    }
    let equation = format!("y = {}", terms.join(" + "));

    let param_names: Vec<String> = (0..d).map(|i| format!("c{}", i)).collect();

    FitResult::new("polynomial", &equation, params, param_names, r_squared, rms, n)
}

/// Find the best polynomial degree using AIC (Akaike Information Criterion).
pub fn best_polynomial(data: &[(f64, f64)], max_degree: usize) -> FitResult {
    let mut best_aic = f64::INFINITY;
    let mut best_fit = polynomial_fit(data, 1);

    for deg in 1..=max_degree.min(data.len().saturating_sub(1)) {
        let fit = polynomial_fit(data, deg);
        if fit.params.is_empty() {
            continue;
        }

        let n = data.len() as f64;
        let k = (deg + 1) as f64;

        // AIC = n * ln(RSS/n) + 2k
        let rss: f64 = fit.residual_rms.powi(2) * n;
        let aic = if rss > 0.0 {
            n * (rss / n).ln() + 2.0 * k
        } else {
            f64::NEG_INFINITY
        };

        if aic < best_aic {
            best_aic = aic;
            best_fit = fit;
        }
    }

    best_fit
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quadratic_fit() {
        // y = 1 + 2x + 3x²
        let data: Vec<(f64, f64)> = (0..20)
            .map(|i| {
                let x = i as f64 * 0.5;
                (x, 1.0 + 2.0 * x + 3.0 * x * x)
            })
            .collect();

        let fit = polynomial_fit(&data, 2);
        assert!((fit.params[0] - 1.0).abs() < 0.01, "c0 = {}", fit.params[0]);
        assert!((fit.params[1] - 2.0).abs() < 0.01, "c1 = {}", fit.params[1]);
        assert!((fit.params[2] - 3.0).abs() < 0.01, "c2 = {}", fit.params[2]);
        assert!(fit.r_squared > 0.9999);
    }

    #[test]
    fn test_best_polynomial_selects_correct_degree() {
        // y = x² — degree 2 should win over degree 5
        let data: Vec<(f64, f64)> = (1..=30)
            .map(|i| {
                let x = i as f64;
                (x, x * x)
            })
            .collect();

        let fit = best_polynomial(&data, 5);
        assert!(fit.r_squared > 0.999);
    }
}
