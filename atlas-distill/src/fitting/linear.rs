//! Ordinary Least Squares linear regression.
//!
//! y = mx + b
//! β̂ = (X^T X)^{-1} X^T y

use crate::fitting::FitResult;

/// Fit y = m*x + b to data points.
pub fn linear_fit(data: &[(f64, f64)]) -> FitResult {
    let n = data.len() as f64;
    if n < 2.0 {
        return FitResult::new("linear", "insufficient data", vec![], vec![], 0.0, f64::INFINITY, 0);
    }

    let sum_x: f64 = data.iter().map(|(x, _)| x).sum();
    let sum_y: f64 = data.iter().map(|(_, y)| y).sum();
    let sum_x2: f64 = data.iter().map(|(x, _)| x * x).sum();
    let sum_xy: f64 = data.iter().map(|(x, y)| x * y).sum();

    let denom = n * sum_x2 - sum_x * sum_x;
    if denom.abs() < 1e-30 {
        return FitResult::new("linear", "singular", vec![], vec![], 0.0, f64::INFINITY, data.len());
    }

    let m = (n * sum_xy - sum_x * sum_y) / denom;
    let b = (sum_y - m * sum_x) / n;

    // R²
    let y_mean = sum_y / n;
    let ss_tot: f64 = data.iter().map(|(_, y)| (y - y_mean).powi(2)).sum();
    let ss_res: f64 = data.iter().map(|(x, y)| (y - (m * x + b)).powi(2)).sum();

    let r_squared = if ss_tot > 1e-30 {
        1.0 - ss_res / ss_tot
    } else {
        0.0
    };

    let rms = (ss_res / n).sqrt();

    let equation = if b >= 0.0 {
        format!("y = {:.6e} * x + {:.6e}", m, b)
    } else {
        format!("y = {:.6e} * x - {:.6e}", m, b.abs())
    };

    FitResult::new(
        "linear",
        &equation,
        vec![m, b],
        vec!["slope".into(), "intercept".into()],
        r_squared,
        rms,
        data.len(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_perfect_line() {
        let data: Vec<(f64, f64)> = (0..10).map(|i| (i as f64, 2.0 * i as f64 + 1.0)).collect();
        let fit = linear_fit(&data);
        assert!((fit.params[0] - 2.0).abs() < 1e-10, "slope should be 2.0");
        assert!((fit.params[1] - 1.0).abs() < 1e-10, "intercept should be 1.0");
        assert!((fit.r_squared - 1.0).abs() < 1e-10, "R² should be 1.0");
    }
}
