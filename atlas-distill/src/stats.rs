//! Core statistical utilities for atlas-distill.
//!
//! Provides PCA/SVD, covariance, correlation, Fisher z-transformation,
//! and other methods needed for sloppy model and meta-analysis.

use nalgebra::{DMatrix, DVector, SVD};

/// Compute the covariance matrix of a data matrix (rows = observations, cols = variables).
///
/// Returns a (n_vars × n_vars) symmetric covariance matrix.
pub fn covariance(data: &DMatrix<f64>) -> DMatrix<f64> {
    let n = data.nrows() as f64;
    if n < 2.0 {
        return DMatrix::zeros(data.ncols(), data.ncols());
    }

    let means: Vec<f64> = (0..data.ncols())
        .map(|j| data.column(j).iter().sum::<f64>() / data.nrows() as f64)
        .collect();
    let centered = data - DMatrix::from_fn(data.nrows(), data.ncols(), |_i, j| means[j]);

    (centered.transpose() * &centered) / (n - 1.0)
}

/// Compute Pearson correlation matrix from covariance.
pub fn correlation_from_cov(cov: &DMatrix<f64>) -> DMatrix<f64> {
    let n = cov.nrows();
    let mut corr = DMatrix::zeros(n, n);

    for i in 0..n {
        for j in 0..n {
            let denom = (cov[(i, i)] * cov[(j, j)]).sqrt();
            if denom > 1e-30 {
                corr[(i, j)] = cov[(i, j)] / denom;
            }
        }
    }

    corr
}

/// Compute Pearson correlation matrix directly from data.
pub fn correlation_matrix(data: &DMatrix<f64>) -> DMatrix<f64> {
    correlation_from_cov(&covariance(data))
}

/// PCA via SVD: returns (eigenvalues descending, eigenvectors as columns).
///
/// Eigenvalues are the variances along each principal component.
pub fn pca(data: &DMatrix<f64>) -> (DVector<f64>, DMatrix<f64>) {
    let means = data.column_mean();
    let centered = data - DMatrix::from_fn(data.nrows(), data.ncols(), |_i, j| means[j]);

    let svd = SVD::new(centered.clone(), true, true);
    let _u = svd.u.expect("SVD U matrix missing");
    let s = svd.singular_values;
    let vt = svd.v_t.expect("SVD V^T matrix missing");

    // Eigenvalues = squared singular values / (n - 1)
    let n = data.nrows() as f64;
    let eigenvalues: Vec<f64> = s.iter().map(|&si| si * si / (n - 1.0)).collect();

    // Eigenvectors are rows of V^T, i.e., columns of V
    let eigenvectors = vt.transpose();

    (DVector::from_vec(eigenvalues), eigenvectors)
}

/// Effective dimensionality via the participation ratio (PR).
///
/// PR = (Σ λᵢ)² / Σ λᵢ²  where λᵢ are eigenvalues.
///
/// For d-dimensional isotropic Gaussian data, PR ≈ d.
/// For data confined to a k-dimensional subspace, PR ≈ k.
/// This is the standard measure from sloppy model theory.
pub fn participation_ratio(eigenvalues: &[f64]) -> f64 {
    let sum: f64 = eigenvalues.iter().sum();
    let sum_sq: f64 = eigenvalues.iter().map(|&v| v * v).sum();

    if sum_sq < 1e-30 {
        return 0.0;
    }

    sum * sum / sum_sq
}

/// Effective dimensionality via the participation ratio, normalized by total dimension.
pub fn fractional_dimensionality(eigenvalues: &[f64]) -> f64 {
    if eigenvalues.is_empty() {
        return 0.0;
    }
    participation_ratio(eigenvalues) / eigenvalues.len() as f64
}

/// Fisher z-transformation: z = arctanh(r) = 0.5 * ln((1+r)/(1-r))
pub fn fisher_z(r: f64) -> f64 {
    // Clamp to avoid domain errors
    let r_clamped = r.clamp(-0.999_999, 0.999_999);
    0.5 * ((1.0 + r_clamped) / (1.0 - r_clamped)).ln()
}

/// Inverse Fisher z-transformation: r = tanh(z)
pub fn fisher_z_inverse(z: f64) -> f64 {
    ((2.0 * z).exp() - 1.0) / ((2.0 * z).exp() + 1.0)
}

/// Variance of Fisher z for sample size n: var(z) ≈ 1/(n-3)
pub fn fisher_z_variance(n: usize) -> f64 {
    if n > 3 {
        1.0 / (n as f64 - 3.0)
    } else {
        f64::INFINITY
    }
}

/// Standard error of Pearson correlation for sample size n.
pub fn correlation_se(n: usize) -> f64 {
    fisher_z_variance(n).sqrt()
}

/// Compute Pearson r between two vectors.
pub fn pearson_r(x: &[f64], y: &[f64]) -> f64 {
    if x.len() != y.len() || x.len() < 2 {
        return f64::NAN;
    }

    let n = x.len() as f64;
    let mean_x = x.iter().sum::<f64>() / n;
    let mean_y = y.iter().sum::<f64>() / n;

    let mut num = 0.0;
    let mut den_x = 0.0;
    let mut den_y = 0.0;

    for (xi, yi) in x.iter().zip(y.iter()) {
        let dx = xi - mean_x;
        let dy = yi - mean_y;
        num += dx * dy;
        den_x += dx * dx;
        den_y += dy * dy;
    }

    let denom = (den_x * den_y).sqrt();
    if denom < 1e-30 {
        0.0
    } else {
        num / denom
    }
}

/// Cumulative explained variance ratio from eigenvalues.
pub fn cumulative_variance_ratio(eigenvalues: &[f64]) -> Vec<f64> {
    let total: f64 = eigenvalues.iter().sum();
    if total < 1e-30 {
        return vec![0.0; eigenvalues.len()];
    }

    let mut cumulative = 0.0;
    eigenvalues
        .iter()
        .map(|&v| {
            cumulative += v;
            cumulative / total
        })
        .collect()
}

/// Geometric series test: fit log(eigenvalues) to a line.
///
/// Returns (slope, intercept, r_squared) for log(λᵢ) vs i.
/// Sloppy models exhibit approximately linear log-spacing.
pub fn eigenvalue_geometric_fit(eigenvalues: &[f64]) -> (f64, f64, f64) {
    let data: Vec<(f64, f64)> = eigenvalues
        .iter()
        .enumerate()
        .filter(|(_, &v)| v > 1e-30)
        .map(|(i, &v)| (i as f64, v.ln()))
        .collect();

    if data.len() < 2 {
        return (f64::NAN, f64::NAN, 0.0);
    }

    let n = data.len() as f64;
    let sum_x: f64 = data.iter().map(|(x, _)| x).sum();
    let sum_y: f64 = data.iter().map(|(_, y)| y).sum();
    let sum_x2: f64 = data.iter().map(|(x, _)| x * x).sum();
    let sum_xy: f64 = data.iter().map(|(x, y)| x * y).sum();

    let denom = n * sum_x2 - sum_x * sum_x;
    if denom.abs() < 1e-30 {
        return (f64::NAN, f64::NAN, 0.0);
    }

    let slope = (n * sum_xy - sum_x * sum_y) / denom;
    let intercept = (sum_y - slope * sum_x) / n;

    // R²
    let y_mean = sum_y / n;
    let ss_tot: f64 = data.iter().map(|(_, y)| (y - y_mean).powi(2)).sum();
    let ss_res: f64 = data
        .iter()
        .map(|(x, y)| {
            let pred = slope * x + intercept;
            (y - pred).powi(2)
        })
        .sum();

    let r2 = if ss_tot > 1e-30 { 1.0 - ss_res / ss_tot } else { 0.0 };

    (slope, intercept, r2)
}

/// Mann-Kendall trend test for monotonicity.
/// Returns (tau, p_approx) using normal approximation.
pub fn mann_kendall_tau(data: &[f64]) -> f64 {
    let n = data.len();
    if n < 2 {
        return 0.0;
    }

    let mut concordant = 0i64;
    let mut discordant = 0i64;

    for i in 0..n {
        for j in (i + 1)..n {
            let diff = data[j] - data[i];
            if diff > 1e-30 {
                concordant += 1;
            } else if diff < -1e-30 {
                discordant += 1;
            }
        }
    }

    let total_pairs = (n * (n - 1) / 2) as f64;
    (concordant as f64 - discordant as f64) / total_pairs
}

/// Bootstrap confidence interval for a statistic.
///
/// Resamples the data matrix with replacement `n_bootstrap` times,
/// computes the statistic on each resample, and returns the
/// `(lower, upper)` percentile bounds.
pub fn bootstrap_ci<F>(
    data: &DMatrix<f64>,
    statistic: F,
    n_bootstrap: usize,
    confidence: f64,
) -> (f64, f64)
where
    F: Fn(&DMatrix<f64>) -> f64,
{
    use rand::Rng;
    let n = data.nrows();
    if n < 3 || n_bootstrap == 0 {
        return (f64::NAN, f64::NAN);
    }

    let mut rng = rand::thread_rng();
    let mut estimates = Vec::with_capacity(n_bootstrap);

    for _ in 0..n_bootstrap {
        let mut rows = Vec::with_capacity(n);
        for _ in 0..n {
            let idx = rng.gen_range(0..n);
            rows.push(data.row(idx).iter().cloned().collect::<Vec<f64>>());
        }
        let n_cols = data.ncols();
        let boot_data = DMatrix::from_fn(n, n_cols, |i, j| rows[i][j]);
        estimates.push(statistic(&boot_data));
    }

    estimates.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let alpha = 1.0 - confidence;
    let lower_idx = ((alpha / 2.0) * n_bootstrap as f64).floor() as usize;
    let upper_idx = ((1.0 - alpha / 2.0) * n_bootstrap as f64).floor() as usize;
    let lower_idx = lower_idx.min(estimates.len().saturating_sub(1));
    let upper_idx = upper_idx.min(estimates.len().saturating_sub(1));

    (estimates[lower_idx], estimates[upper_idx])
}

/// Bootstrap CI for participation ratio on a data matrix.
pub fn bootstrap_pr_ci(data: &DMatrix<f64>, n_bootstrap: usize, confidence: f64) -> (f64, f64) {
    bootstrap_ci(data, |d| {
        let (ev, _) = pca(d);
        let ev_vec: Vec<f64> = ev.iter().cloned().collect();
        participation_ratio(&ev_vec)
    }, n_bootstrap, confidence)
}

/// Bootstrap CI for Pearson correlation.
pub fn bootstrap_r_ci(x: &[f64], y: &[f64], n_bootstrap: usize, confidence: f64) -> (f64, f64) {
    if x.len() != y.len() || x.len() < 3 || n_bootstrap == 0 {
        return (f64::NAN, f64::NAN);
    }
    let n = x.len();
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let mut estimates = Vec::with_capacity(n_bootstrap);

    for _ in 0..n_bootstrap {
        let mut bx = Vec::with_capacity(n);
        let mut by = Vec::with_capacity(n);
        for _ in 0..n {
            let idx = rng.gen_range(0..n);
            bx.push(x[idx]);
            by.push(y[idx]);
        }
        estimates.push(pearson_r(&bx, &by));
    }

    estimates.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let alpha = 1.0 - confidence;
    let lower_idx = ((alpha / 2.0) * n_bootstrap as f64).floor() as usize;
    let upper_idx = ((1.0 - alpha / 2.0) * n_bootstrap as f64).floor() as usize;
    let lower_idx = lower_idx.min(estimates.len().saturating_sub(1));
    let upper_idx = upper_idx.min(estimates.len().saturating_sub(1));

    (estimates[lower_idx], estimates[upper_idx])
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_covariance_identity() {
        // 2D data with clear correlation structure
        let data = DMatrix::from_row_slice(
            4,
            2,
            &[
                1.0, 2.0, //
                2.0, 4.0, //
                3.0, 6.0, //
                4.0, 8.0, //
            ],
        );
        let cov = covariance(&data);
        // Var(x) = 1.666..., Var(y) = 6.666..., Cov(x,y) = 3.333...
        assert_relative_eq!(cov[(0, 0)], 1.666_667, epsilon = 1e-4);
        assert_relative_eq!(cov[(1, 1)], 6.666_667, epsilon = 1e-4);
        assert_relative_eq!(cov[(0, 1)], 3.333_333, epsilon = 1e-4);
        assert_relative_eq!(cov[(1, 0)], 3.333_333, epsilon = 1e-4);
    }

    #[test]
    fn test_correlation_perfect() {
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y = vec![2.0, 4.0, 6.0, 8.0, 10.0];
        let r = pearson_r(&x, &y);
        assert_relative_eq!(r, 1.0, epsilon = 1e-10);
    }

    #[test]
    fn test_correlation_inverse() {
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y = vec![10.0, 8.0, 6.0, 4.0, 2.0];
        let r = pearson_r(&x, &y);
        assert_relative_eq!(r, -1.0, epsilon = 1e-10);
    }

    #[test]
    fn test_fisher_z_roundtrip() {
        let r = 0.75;
        let z = fisher_z(r);
        let r_back = fisher_z_inverse(z);
        assert_relative_eq!(r, r_back, epsilon = 1e-10);
    }

    #[test]
    fn test_participation_ratio_isotropic() {
        // Isotropic 3D Gaussian: eigenvalues all equal → PR ≈ 3
        let ev = vec![1.0, 1.0, 1.0];
        let pr = participation_ratio(&ev);
        assert_relative_eq!(pr, 3.0, epsilon = 1e-10);
    }

    #[test]
    fn test_participation_ratio_1d() {
        // Data on a line: one large eigenvalue → PR ≈ 1
        let ev = vec![100.0, 0.1, 0.01];
        let pr = participation_ratio(&ev);
        assert!((pr - 1.0).abs() < 0.1, "PR should be ~1 for 1D data, got {}", pr);
    }

    #[test]
    fn test_pca_structure() {
        // Use a 2D matrix with clear principal direction
        let data = DMatrix::from_row_slice(
            5,
            2,
            &[
                1.0, 2.0, //
                2.0, 4.0, //
                3.0, 6.0, //
                4.0, 8.0, //
                5.0, 10.0, //
            ],
        );
        let (eigenvalues, eigenvectors) = pca(&data);
        // Should have 2 eigenvalues
        assert_eq!(eigenvalues.len(), 2);
        // First eigenvalue should dominate (perfect correlation)
        assert!(eigenvalues[0] > eigenvalues[1] * 10.0,
            "First eigenvalue should dominate: {} vs {}", eigenvalues[0], eigenvalues[1]);
        // Eigenvectors should be unit length
        let v0 = eigenvectors.column(0);
        let v0_norm = v0.dot(&v0).sqrt();
        assert_relative_eq!(v0_norm, 1.0, epsilon = 1e-6);
    }

    #[test]
    fn test_eigenvalue_geometric_fit_sloppy() {
        // Sloppy model eigenvalue spectrum: log-spaced
        let ev: Vec<f64> = (0..5).map(|i| 100.0 * 0.1f64.powi(i)).collect();
        let (slope, _intercept, r2) = eigenvalue_geometric_fit(&ev);
        assert!(r2 > 0.99, "Log-spacing should be nearly perfect, R² = {}", r2);
        assert!(slope < -1.0, "Slope should be negative for decaying eigenvalues");
    }

    #[test]
    fn test_mann_kendall_monotonic() {
        let data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let tau = mann_kendall_tau(&data);
        assert_relative_eq!(tau, 1.0, epsilon = 1e-10);
    }

    #[test]
    fn test_bootstrap_r_ci_contains_true_r() {
        // Perfect positive correlation
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
        let y = vec![2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0];
        let (lo, hi) = bootstrap_r_ci(&x, &y, 200, 0.95);
        assert!(lo.is_finite() && hi.is_finite(), "Bootstrap CI should be finite");
        assert!(lo <= hi, "Lower bound should be <= upper bound");
        let true_r = pearson_r(&x, &y);
        assert!(lo <= true_r && true_r <= hi,
            "CI should contain true r: [{}, {}] does not contain {}", lo, hi, true_r);
    }

    #[test]
    fn test_bootstrap_pr_ci() {
        // 3D strongly anisotropic data
        let data = DMatrix::from_row_slice(
            10,
            3,
            &[
                1.0, 2.0, 0.1,
                2.0, 4.0, 0.2,
                3.0, 6.0, 0.15,
                4.0, 8.0, 0.25,
                5.0, 10.0, 0.1,
                6.0, 12.0, 0.2,
                7.0, 14.0, 0.15,
                8.0, 16.0, 0.25,
                9.0, 18.0, 0.1,
                10.0, 20.0, 0.2,
            ],
        );
        let (lo, hi) = bootstrap_pr_ci(&data, 100, 0.95);
        assert!(lo.is_finite() && hi.is_finite(), "Bootstrap PR CI should be finite");
        assert!(lo <= hi, "Lower bound should be <= upper bound");
        // PR for 3D data should be in [1, 3]
        assert!(lo >= 1.0 && hi <= 3.0,
            "PR CI should be within [1, 3]: got [{}, {}]", lo, hi);
    }
}
