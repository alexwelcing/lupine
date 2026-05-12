//! Power law fitting: y = a · x^b
//!
//! Transformed via: ln(y) = ln(a) + b · ln(x)
//! Then solved by linear regression in log space.

use crate::fitting::FitResult;

/// Fit y = a * x^b via log-log linear regression.
///
/// Filters out non-positive values (can't take log).
pub fn power_law_fit(data: &[(f64, f64)]) -> FitResult {
    // Filter to positive values only
    let log_data: Vec<(f64, f64)> = data
        .iter()
        .filter(|(x, y)| *x > 0.0 && *y > 0.0)
        .map(|(x, y)| (x.ln(), y.ln()))
        .collect();

    if log_data.len() < 2 {
        return FitResult::new(
            "power_law",
            "insufficient positive data",
            vec![],
            vec![],
            0.0,
            f64::INFINITY,
            0,
        );
    }

    // Linear regression in log space
    let n = log_data.len() as f64;
    let sum_lx: f64 = log_data.iter().map(|(lx, _)| lx).sum();
    let sum_ly: f64 = log_data.iter().map(|(_, ly)| ly).sum();
    let sum_lx2: f64 = log_data.iter().map(|(lx, _)| lx * lx).sum();
    let sum_lxly: f64 = log_data.iter().map(|(lx, ly)| lx * ly).sum();

    let denom = n * sum_lx2 - sum_lx * sum_lx;
    if denom.abs() < 1e-30 {
        return FitResult::new(
            "power_law",
            "singular",
            vec![],
            vec![],
            0.0,
            f64::INFINITY,
            data.len(),
        );
    }

    let b = (n * sum_lxly - sum_lx * sum_ly) / denom;
    let ln_a = (sum_ly - b * sum_lx) / n;
    let a = ln_a.exp();

    // R² in original space
    let y_mean: f64 = data.iter().map(|(_, y)| y).sum::<f64>() / data.len() as f64;
    let ss_tot: f64 = data.iter().map(|(_, y)| (y - y_mean).powi(2)).sum();
    let ss_res: f64 = data
        .iter()
        .filter(|(x, _)| *x > 0.0)
        .map(|(x, y)| (y - a * x.powf(b)).powi(2))
        .sum();

    let r_squared = if ss_tot > 1e-30 {
        1.0 - ss_res / ss_tot
    } else {
        0.0
    };
    let rms = (ss_res / data.len() as f64).sqrt();

    let equation = format!("y = {:.6e} · x^{:.4}", a, b);

    FitResult::new(
        "power_law",
        &equation,
        vec![a, b],
        vec!["coefficient".into(), "exponent".into()],
        r_squared,
        rms,
        data.len(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exact_power_law() {
        // y = 3.0 * x^1.5
        let data: Vec<(f64, f64)> = (1..=20)
            .map(|i| {
                let x = i as f64;
                (x, 3.0 * x.powf(1.5))
            })
            .collect();

        let fit = power_law_fit(&data);
        assert!(
            (fit.params[0] - 3.0).abs() < 0.01,
            "a should be ~3.0, got {}",
            fit.params[0]
        );
        assert!(
            (fit.params[1] - 1.5).abs() < 0.01,
            "b should be ~1.5, got {}",
            fit.params[1]
        );
        assert!(fit.r_squared > 0.999);
    }
}
