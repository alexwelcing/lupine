//! Confound-elimination engine — tests `property_coupling_bottleneck`.
//!
//! The dissertation's headline claim is that prediction errors live on a
//! low-dimensional ribbon in (C11, C12, C44) error space. The system itself
//! generated a counter-hypothesis: maybe the ribbon is just a scale-coupling
//! artifact — when a potential overestimates bonding strength, it tends to
//! overestimate every elastic constant proportionally, and the resulting
//! "all-positive" diagonal of the error vector trivially produces a 1D
//! manifold.
//!
//! Test: project each error vector onto the subspace orthogonal to the
//! reference-value direction `u_ref = normalize(C11_ref, C12_ref, C44_ref)`.
//! Recompute PR on the residuals. If PR rises sharply (toward the full
//! property dimension D), the ribbon was a scale artifact (LLM was right,
//! dissertation overclaimed). If PR stays low, the ribbon is real and the
//! counter-hypothesis is refuted.
//!
//! This module deliberately operates per-element, since the reference vector
//! is element-specific. We aggregate results across elements and pair_styles
//! to give a population-level verdict.

use anyhow::Result;
use rusqlite::Connection;
use serde::Serialize;

use crate::db::query::{self, ErrorVector};
use crate::hypothesis::manifold;

/// Hardcoded experimental references (GPa) for the 15 benchmark elements.
/// Mirrors the table in `db::ingest::experimental_reference` to keep the two
/// callsites self-contained without exporting the table publicly.
fn reference_vector(element: &str) -> Option<[f64; 3]> {
    let table: &[(&str, [f64; 3])] = &[
        ("Ag", [124.0,  93.4,  46.1]),
        ("Al", [108.2,  61.3,  28.5]),
        ("Au", [192.9, 163.8,  41.5]),
        ("Cu", [168.4, 121.4,  75.4]),
        ("Ni", [246.5, 147.3, 124.7]),
        ("Pb", [ 49.5,  42.3,  14.9]),
        ("Pd", [227.1, 176.0,  71.7]),
        ("Pt", [346.7, 250.7,  76.5]),
        ("Cr", [339.8,  58.6,  99.0]),
        ("Fe", [226.0, 140.0, 116.0]),
        ("Mo", [463.0, 161.0, 109.0]),
        ("Nb", [246.5, 134.5,  28.7]),
        ("Ta", [266.3, 158.2,  87.4]),
        ("V",  [229.0, 119.0,  43.0]),
        ("W",  [523.0, 203.0, 160.0]),
    ];
    for (el, refs) in table {
        if *el == element { return Some(*refs); }
    }
    None
}

#[derive(Debug, Clone, Serialize)]
pub struct OrthogonalizeResult {
    pub per_element: Vec<ElementOrthogonal>,
    pub pooled_pr_before: f64,
    pub pooled_pr_after: f64,
    pub pooled_dim: usize,
    /// True if PR rose by >= 50% relative or crossed `dim * 0.8` after
    /// orthogonalization (i.e., the ribbon dissolved → confound was real).
    pub confound_detected: bool,
    pub n_elements_analyzed: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ElementOrthogonal {
    pub element: String,
    pub n_potentials: usize,
    pub pr_before: f64,
    pub pr_after: f64,
    pub explained_variance_before: Vec<f64>,
    pub explained_variance_after: Vec<f64>,
    pub scale_axis_unit: [f64; 3],
    pub fraction_along_scale_axis: f64,
}

pub fn run(conn: &Connection, element: Option<&str>) -> Result<OrthogonalizeResult> {
    let elements: Vec<String> = match element {
        Some(el) => vec![el.to_string()],
        None => query::query_distinct(conn, "element")?,
    };

    let mut per_element = Vec::new();
    let mut all_before: Vec<ErrorVector> = Vec::new();
    let mut all_after: Vec<ErrorVector> = Vec::new();

    for el in &elements {
        let refs = match reference_vector(el) {
            Some(r) => r,
            None => continue,
        };
        // Build u_ref in error-space coordinates: dimensionless direction.
        let mag = (refs[0].powi(2) + refs[1].powi(2) + refs[2].powi(2)).sqrt();
        if mag < 1e-9 { continue; }
        let u_ref = [refs[0] / mag, refs[1] / mag, refs[2] / mag];

        let vectors = query::error_vectors_for_properties(
            conn, Some(el), None, Some(&["C11", "C12", "C44"]),
        )?;
        if vectors.len() < 3 { continue; }

        // PR before: as-is.
        let (pr_before, ev_before) = pr_and_explained(&vectors).unwrap_or((0.0, vec![]));

        // Project each error vector onto the orthogonal complement of u_ref.
        // Track the average squared projection along u_ref so we can report
        // how much "scale" we removed.
        let mut residuals: Vec<ErrorVector> = Vec::with_capacity(vectors.len());
        let mut along_sq_sum = 0.0;
        let mut total_sq_sum = 0.0;
        for v in &vectors {
            let e = &v.errors;
            if e.len() != 3 { continue; }
            let along: f64 = e[0] * u_ref[0] + e[1] * u_ref[1] + e[2] * u_ref[2];
            let resid = vec![
                e[0] - along * u_ref[0],
                e[1] - along * u_ref[1],
                e[2] - along * u_ref[2],
            ];
            along_sq_sum += along * along;
            total_sq_sum += e.iter().map(|x| x * x).sum::<f64>();
            let mut copy = v.clone();
            copy.errors = resid;
            residuals.push(copy);
        }
        if residuals.is_empty() { continue; }

        let (pr_after, ev_after) = pr_and_explained(&residuals).unwrap_or((0.0, vec![]));
        let frac_along = if total_sq_sum > 1e-12 { along_sq_sum / total_sq_sum } else { 0.0 };

        per_element.push(ElementOrthogonal {
            element: el.clone(),
            n_potentials: vectors.len(),
            pr_before,
            pr_after,
            explained_variance_before: ev_before,
            explained_variance_after: ev_after,
            scale_axis_unit: u_ref,
            fraction_along_scale_axis: frac_along,
        });
        all_before.extend(vectors);
        all_after.extend(residuals);
    }

    // Pooled: concatenate across elements and recompute. This is meaningful
    // because errors are dimensionless percentages.
    let (pooled_before, _) = pr_and_explained(&all_before).unwrap_or((0.0, vec![]));
    let (pooled_after, _) = pr_and_explained(&all_after).unwrap_or((0.0, vec![]));

    let dim = 3usize;
    let confound = (pooled_after - pooled_before) / pooled_before.max(1e-9) > 0.5
        || pooled_after >= dim as f64 * 0.8;

    Ok(OrthogonalizeResult {
        n_elements_analyzed: per_element.len(),
        per_element,
        pooled_pr_before: pooled_before,
        pooled_pr_after: pooled_after,
        pooled_dim: dim,
        confound_detected: confound,
    })
}

fn pr_and_explained(vectors: &[ErrorVector]) -> Option<(f64, Vec<f64>)> {
    let n = vectors.len();
    if n < 3 { return None; }
    let dim = vectors[0].errors.len();
    if dim < 2 { return None; }

    let mut mean = vec![0.0; dim];
    for v in vectors {
        for (i, e) in v.errors.iter().enumerate() { mean[i] += e; }
    }
    for m in &mut mean { *m /= n as f64; }

    let centered: Vec<Vec<f64>> = vectors.iter()
        .map(|v| v.errors.iter().zip(&mean).map(|(e, m)| e - m).collect())
        .collect();

    let mut cov = vec![vec![0.0; dim]; dim];
    for row in &centered {
        for i in 0..dim {
            for j in 0..dim { cov[i][j] += row[i] * row[j]; }
        }
    }
    for i in 0..dim {
        for j in 0..dim { cov[i][j] /= (n - 1).max(1) as f64; }
    }

    let eigenvalues = manifold::jacobi_eigenvalues_pub(&cov);
    let total: f64 = eigenvalues.iter().sum();
    if total < 1e-15 { return None; }
    let sum_sq: f64 = eigenvalues.iter().map(|e| e * e).sum();
    if sum_sq < 1e-15 { return None; }
    let pr = total * total / sum_sq;
    let explained: Vec<f64> = eigenvalues.iter().map(|e| e / total).collect();
    Some((pr, explained))
}
