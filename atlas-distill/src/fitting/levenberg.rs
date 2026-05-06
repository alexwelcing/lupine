//! Levenberg-Marquardt nonlinear least squares optimizer.
//!
//! Fits an arbitrary model function f(x; params) to data (x, y).
//! Blends between gradient descent (far from minimum) and Gauss-Newton (near minimum).

use crate::fitting::FitResult;

/// Model function signature: f(x, &params) -> y
pub type ModelFn = fn(f64, &[f64]) -> f64;

/// Fit a generic model function using Levenberg-Marquardt.
///
/// * `model` — the model function f(x, &params) -> y
/// * `initial_params` — starting guess for parameters
/// * `data` — (x, y) pairs
/// * `max_iter` — maximum iterations
pub fn levenberg_marquardt(
    model: ModelFn,
    initial_params: &[f64],
    data: &[(f64, f64)],
    max_iter: usize,
) -> Vec<f64> {
    let n = data.len();
    let p = initial_params.len();

    if n < p || p == 0 {
        return initial_params.to_vec();
    }

    let mut params = initial_params.to_vec();
    let mut lambda = 0.001f64;
    let mut prev_cost = compute_cost(model, &params, data);

    let eps = 1e-8; // Finite difference step

    for _ in 0..max_iter {
        // Compute Jacobian (n × p) via finite differences
        let mut jacobian = vec![vec![0.0f64; p]; n];
        for j in 0..p {
            let mut params_plus = params.clone();
            params_plus[j] += eps;

            for i in 0..n {
                let f_base = model(data[i].0, &params);
                let f_plus = model(data[i].0, &params_plus);
                jacobian[i][j] = (f_plus - f_base) / eps;
            }
        }

        // Residuals
        let residuals: Vec<f64> = data
            .iter()
            .map(|(x, y)| y - model(*x, &params))
            .collect();

        // J^T J (p × p)
        let mut jtj = vec![vec![0.0f64; p]; p];
        for i in 0..p {
            for j in 0..p {
                let mut sum = 0.0;
                for k in 0..n {
                    sum += jacobian[k][i] * jacobian[k][j];
                }
                jtj[i][j] = sum;
            }
        }

        // J^T r (p × 1)
        let mut jtr = vec![0.0f64; p];
        for i in 0..p {
            let mut sum = 0.0;
            for k in 0..n {
                sum += jacobian[k][i] * residuals[k];
            }
            jtr[i] = sum;
        }

        // (J^T J + λ·diag(J^T J)) Δ = J^T r
        let mut augmented = jtj.clone();
        for i in 0..p {
            augmented[i][i] += lambda * jtj[i][i].max(1e-10);
        }

        // Solve via Gaussian elimination
        if let Some(delta) = solve_linear_system(&augmented, &jtr) {
            let new_params: Vec<f64> = params.iter().zip(delta.iter()).map(|(p, d)| p + d).collect();
            let new_cost = compute_cost(model, &new_params, data);

            if new_cost < prev_cost {
                params = new_params;
                prev_cost = new_cost;
                lambda *= 0.1;
            } else {
                lambda *= 10.0;
            }

            // Convergence check
            if delta.iter().all(|d| d.abs() < 1e-12) {
                break;
            }
        } else {
            lambda *= 10.0;
        }
    }

    params
}

fn compute_cost(model: ModelFn, params: &[f64], data: &[(f64, f64)]) -> f64 {
    data.iter()
        .map(|(x, y)| (y - model(*x, params)).powi(2))
        .sum()
}

/// Solve Ax = b via Gaussian elimination with partial pivoting.
fn solve_linear_system(a: &[Vec<f64>], b: &[f64]) -> Option<Vec<f64>> {
    let n = b.len();
    let mut aug: Vec<Vec<f64>> = a
        .iter()
        .enumerate()
        .map(|(i, row)| {
            let mut r = row.clone();
            r.push(b[i]);
            r
        })
        .collect();

    // Forward elimination
    for col in 0..n {
        // Pivot
        let mut max_row = col;
        let mut max_val = aug[col][col].abs();
        for row in (col + 1)..n {
            if aug[row][col].abs() > max_val {
                max_val = aug[row][col].abs();
                max_row = row;
            }
        }
        if max_val < 1e-30 {
            return None;
        }
        aug.swap(col, max_row);

        for row in (col + 1)..n {
            let factor = aug[row][col] / aug[col][col];
            for j in col..=n {
                aug[row][j] -= factor * aug[col][j];
            }
        }
    }

    // Back substitution
    let mut x = vec![0.0; n];
    for i in (0..n).rev() {
        x[i] = aug[i][n];
        for j in (i + 1)..n {
            x[i] -= aug[i][j] * x[j];
        }
        x[i] /= aug[i][i];
    }

    Some(x)
}

/// Convenience: fit data to a model and return a FitResult.
pub fn lm_fit(
    model_name: &str,
    model: ModelFn,
    equation_fmt: fn(&[f64]) -> String,
    initial_params: &[f64],
    param_names: &[&str],
    data: &[(f64, f64)],
) -> FitResult {
    let params = levenberg_marquardt(model, initial_params, data, 200);
    let equation = equation_fmt(&params);

    let y_mean = data.iter().map(|(_, y)| y).sum::<f64>() / data.len() as f64;
    let ss_tot: f64 = data.iter().map(|(_, y)| (y - y_mean).powi(2)).sum();
    let ss_res: f64 = data
        .iter()
        .map(|(x, y)| (y - model(*x, &params)).powi(2))
        .sum();

    let r_squared = if ss_tot > 1e-30 { 1.0 - ss_res / ss_tot } else { 0.0 };
    let rms = (ss_res / data.len() as f64).sqrt();

    FitResult::new(
        model_name,
        &equation,
        params,
        param_names.iter().map(|s| s.to_string()).collect(),
        r_squared,
        rms,
        data.len(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lm_exponential() {
        // Fit y = a * exp(b * x)
        fn model(x: f64, p: &[f64]) -> f64 {
            p[0] * (p[1] * x).exp()
        }

        let a_true = 2.0;
        let b_true = 0.3;
        let data: Vec<(f64, f64)> = (0..20)
            .map(|i| {
                let x = i as f64;
                (x, a_true * (b_true * x).exp())
            })
            .collect();

        let result = levenberg_marquardt(model, &[1.0, 0.1], &data, 100);
        assert!(
            (result[0] - a_true).abs() < 0.1,
            "a should be ~{}, got {}",
            a_true,
            result[0]
        );
        assert!(
            (result[1] - b_true).abs() < 0.05,
            "b should be ~{}, got {}",
            b_true,
            result[1]
        );
    }
}
