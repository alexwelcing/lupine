//! Hypothesis 3.3 — Manifold Dimensionality & Participation Ratio
//!
//! Claim: The participation ratio of the error manifold is bounded by
//! properties/parameters (d/p). Potentials with more fitted parameters
//! produce lower-dimensional error manifolds.
//!
//! Also: Re-validates hyper-ribbon geometry per element.

use anyhow::Result;
use rusqlite::Connection;
use serde::Serialize;
use crate::db::query;

#[derive(Debug, Clone, Serialize)]
pub struct ManifoldResult {
    pub analyses: Vec<GroupManifold>,
    pub hyper_ribbon_confirmed: bool,
    pub n_groups_tested: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct GroupManifold {
    pub label: String,
    pub element: Option<String>,
    pub pair_style: Option<String>,
    pub n_potentials: usize,
    pub n_properties: usize,
    pub eigenvalues: Vec<f64>,
    pub explained_variance: Vec<f64>,
    pub participation_ratio: f64,
    pub effective_dim: usize,
    /// True if PR < n_properties (hyper-ribbon geometry)
    pub is_ribbon: bool,
}

/// Run manifold analysis for all available groupings.
pub fn test_manifold(conn: &Connection) -> Result<ManifoldResult> {
    let elements = query::query_distinct(conn, "element")?;
    let mut analyses = Vec::new();

    // Per-element analysis
    for el in &elements {
        let vecs = query::error_vectors(conn, Some(el), None)?;
        if vecs.len() >= 3 {
            if let Some(m) = analyze_group(&format!("element:{}", el), Some(el), None, &vecs) {
                analyses.push(m);
            }
        }
    }

    // Per pair_style analysis
    let styles = query::query_distinct(conn, "pair_style")?;
    for style in &styles {
        if style == "unknown" { continue; }
        let vecs = query::error_vectors(conn, None, Some(style))?;
        if vecs.len() >= 3 {
            if let Some(m) = analyze_group(&format!("style:{}", style), None, Some(style), &vecs) {
                analyses.push(m);
            }
        }
    }

    // Global analysis
    let all_vecs = query::error_vectors(conn, None, None)?;
    if all_vecs.len() >= 3 {
        if let Some(m) = analyze_group("global", None, None, &all_vecs) {
            analyses.push(m);
        }
    }

    let ribbon_count = analyses.iter().filter(|a| a.is_ribbon).count();
    let n = analyses.len();

    Ok(ManifoldResult {
        hyper_ribbon_confirmed: n > 0 && ribbon_count as f64 / n as f64 > 0.5,
        n_groups_tested: n,
        analyses,
    })
}

fn analyze_group(
    label: &str,
    element: Option<&str>,
    pair_style: Option<&str>,
    vectors: &[query::ErrorVector],
) -> Option<GroupManifold> {
    if vectors.is_empty() { return None; }

    let n = vectors.len();
    let dim = vectors[0].errors.len();
    if dim < 2 || n < 3 { return None; }

    // Compute mean
    let mut mean = vec![0.0; dim];
    for v in vectors {
        for (i, e) in v.errors.iter().enumerate() {
            mean[i] += e;
        }
    }
    for m in &mut mean { *m /= n as f64; }

    // Centered data
    let centered: Vec<Vec<f64>> = vectors.iter()
        .map(|v| v.errors.iter().zip(&mean).map(|(e, m)| e - m).collect())
        .collect();

    // Covariance matrix
    let mut cov = vec![vec![0.0; dim]; dim];
    for row in &centered {
        for i in 0..dim {
            for j in 0..dim {
                cov[i][j] += row[i] * row[j];
            }
        }
    }
    for i in 0..dim {
        for j in 0..dim {
            cov[i][j] /= (n - 1).max(1) as f64;
        }
    }

    // Eigenvalue decomposition via Jacobi iteration
    let eigenvalues = jacobi_eigenvalues(&cov);
    let total: f64 = eigenvalues.iter().sum();

    if total < 1e-15 { return None; }

    let explained: Vec<f64> = eigenvalues.iter().map(|e| e / total).collect();

    // Participation ratio: (sum(lambda))^2 / sum(lambda^2)
    let sum_sq: f64 = eigenvalues.iter().map(|e| e * e).sum();
    let pr = if sum_sq > 1e-15 { total * total / sum_sq } else { 1.0 };

    // Effective dimension: number of components explaining > 5% variance
    let eff_dim = explained.iter().filter(|&&e| e > 0.05).count();

    Some(GroupManifold {
        label: label.to_string(),
        element: element.map(|s| s.to_string()),
        pair_style: pair_style.map(|s| s.to_string()),
        n_potentials: n,
        n_properties: dim,
        eigenvalues,
        explained_variance: explained,
        participation_ratio: pr,
        effective_dim: eff_dim,
        is_ribbon: pr < dim as f64 * 0.8, // PR significantly below dimension
    })
}

/// Public re-export of the Jacobi eigensolver for cross-module use
/// (null_model bootstrap, orthogonalize). Kept as a thin alias so the
/// implementation remains private to this module.
pub fn jacobi_eigenvalues_pub(mat: &[Vec<f64>]) -> Vec<f64> {
    jacobi_eigenvalues(mat)
}

/// Jacobi eigenvalue algorithm for small symmetric matrices.
/// Returns eigenvalues sorted descending.
fn jacobi_eigenvalues(mat: &[Vec<f64>]) -> Vec<f64> {
    let n = mat.len();
    let mut a: Vec<Vec<f64>> = mat.to_vec();

    for _ in 0..100 {
        // Find largest off-diagonal element
        let mut max_val = 0.0f64;
        let mut p = 0;
        let mut q = 1;
        for i in 0..n {
            for j in (i + 1)..n {
                if a[i][j].abs() > max_val {
                    max_val = a[i][j].abs();
                    p = i;
                    q = j;
                }
            }
        }

        if max_val < 1e-12 { break; }

        // Compute rotation
        let theta = if (a[p][p] - a[q][q]).abs() < 1e-15 {
            std::f64::consts::FRAC_PI_4
        } else {
            0.5 * ((2.0 * a[p][q]) / (a[p][p] - a[q][q])).atan()
        };

        let c = theta.cos();
        let s = theta.sin();

        // Apply rotation
        let mut new_a = a.clone();
        for i in 0..n {
            if i != p && i != q {
                new_a[i][p] = c * a[i][p] + s * a[i][q];
                new_a[p][i] = new_a[i][p];
                new_a[i][q] = -s * a[i][p] + c * a[i][q];
                new_a[q][i] = new_a[i][q];
            }
        }
        new_a[p][p] = c * c * a[p][p] + 2.0 * s * c * a[p][q] + s * s * a[q][q];
        new_a[q][q] = s * s * a[p][p] - 2.0 * s * c * a[p][q] + c * c * a[q][q];
        new_a[p][q] = 0.0;
        new_a[q][p] = 0.0;

        a = new_a;
    }

    let mut eigenvalues: Vec<f64> = (0..n).map(|i| a[i][i].max(0.0)).collect();
    eigenvalues.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
    eigenvalues
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jacobi_identity() {
        let mat = vec![
            vec![3.0, 0.0, 0.0],
            vec![0.0, 2.0, 0.0],
            vec![0.0, 0.0, 1.0],
        ];
        let eigs = jacobi_eigenvalues(&mat);
        assert!((eigs[0] - 3.0).abs() < 1e-10);
        assert!((eigs[1] - 2.0).abs() < 1e-10);
        assert!((eigs[2] - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_jacobi_symmetric() {
        let mat = vec![
            vec![2.0, 1.0],
            vec![1.0, 2.0],
        ];
        let eigs = jacobi_eigenvalues(&mat);
        assert!((eigs[0] - 3.0).abs() < 1e-10);
        assert!((eigs[1] - 1.0).abs() < 1e-10);
    }
}
