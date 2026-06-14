//! Hypothesis 3.2 — Cross-Element Transfer Universality
//!
//! Claim: The principal error axes (PCA eigenvectors) are conserved across
//! elements for the same pair_style family.
//!
//! Test: Compute PCA per (element, pair_style), measure cosine similarity
//! of PC1 across elements. High similarity (> 0.8) supports universality.

use anyhow::Result;
use rusqlite::Connection;
use serde::Serialize;
use crate::db::query;

#[derive(Debug, Clone, Serialize)]
pub struct TransferResult {
    /// Element pairs compared
    pub comparisons: Vec<ElementComparison>,
    /// Mean cosine similarity of PC1 across all element pairs
    pub mean_cosine_similarity: f64,
    /// Whether universality is supported (mean cos > 0.7)
    pub supported: bool,
    /// Number of elements analyzed
    pub n_elements: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ElementComparison {
    pub element_a: String,
    pub element_b: String,
    pub pair_style: String,
    pub cosine_similarity: f64,
    pub pc1_a: Vec<f64>,
    pub pc1_b: Vec<f64>,
    pub n_potentials_a: usize,
    pub n_potentials_b: usize,
}

/// Test cross-element transfer universality.
pub fn test_transfer(conn: &Connection, pair_style: Option<&str>) -> Result<TransferResult> {
    // Get distinct elements
    let elements: Vec<String> = {
        let mut stmt = conn.prepare(
            "SELECT DISTINCT element FROM benchmarks ORDER BY element"
        )?;
        let v: Vec<String> = stmt.query_map([], |r| r.get::<_, String>(0))?
            .filter_map(|r| r.ok())
            .collect();
        v
    };

    if elements.len() < 2 {
        anyhow::bail!("Need at least 2 elements for transfer analysis, got {}", elements.len());
    }

    // Get distinct pair_styles
    let styles: Vec<String> = if let Some(ps) = pair_style {
        vec![ps.to_string()]
    } else {
        let mut stmt = conn.prepare(
            "SELECT DISTINCT pair_style FROM benchmarks WHERE pair_style != 'unknown' ORDER BY pair_style"
        )?;
        let v: Vec<String> = stmt.query_map([], |r| r.get::<_, String>(0))?
            .filter_map(|r| r.ok())
            .collect();
        v
    };

    let mut comparisons = Vec::new();

    for style in &styles {
        // Compute PCA for each element within this pair_style
        let mut element_pcs: Vec<(String, Vec<f64>, usize)> = Vec::new();

        for el in &elements {
            let vecs = query::error_vectors(conn, Some(el), Some(style))?;
            if vecs.len() < 3 {
                continue; // Need minimum 3 potentials for meaningful PCA
            }

            match compute_pc1(&vecs) {
                Some(pc1) => element_pcs.push((el.clone(), pc1, vecs.len())),
                None => continue,
            }
        }

        // Compare all pairs of elements
        for i in 0..element_pcs.len() {
            for j in (i + 1)..element_pcs.len() {
                let cos = cosine_similarity(&element_pcs[i].1, &element_pcs[j].1);
                comparisons.push(ElementComparison {
                    element_a: element_pcs[i].0.clone(),
                    element_b: element_pcs[j].0.clone(),
                    pair_style: style.clone(),
                    cosine_similarity: cos.abs(), // Sign is arbitrary for eigenvectors
                    pc1_a: element_pcs[i].1.clone(),
                    pc1_b: element_pcs[j].1.clone(),
                    n_potentials_a: element_pcs[i].2,
                    n_potentials_b: element_pcs[j].2,
                });
            }
        }
    }

    let mean_cos = if comparisons.is_empty() {
        0.0
    } else {
        comparisons.iter().map(|c| c.cosine_similarity).sum::<f64>() / comparisons.len() as f64
    };

    Ok(TransferResult {
        n_elements: elements.len(),
        comparisons,
        mean_cosine_similarity: mean_cos,
        supported: mean_cos > 0.7,
    })
}

/// Compute PC1 from error vectors using power iteration.
/// Returns None if there's insufficient variance.
fn compute_pc1(vectors: &[query::ErrorVector]) -> Option<Vec<f64>> {
    if vectors.is_empty() {
        return None;
    }

    let dim = vectors[0].errors.len();
    let n = vectors.len();

    // Compute mean
    let mut mean = vec![0.0; dim];
    for v in vectors {
        for (i, e) in v.errors.iter().enumerate() {
            mean[i] += e;
        }
    }
    for m in &mut mean {
        *m /= n as f64;
    }

    // Center the data
    let centered: Vec<Vec<f64>> = vectors.iter()
        .map(|v| v.errors.iter().zip(&mean).map(|(e, m)| e - m).collect())
        .collect();

    // Compute covariance matrix (dim x dim)
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
            cov[i][j] /= (n - 1) as f64;
        }
    }

    // Power iteration for PC1
    let mut pc = vec![1.0; dim];
    let norm = (dim as f64).sqrt();
    for p in &mut pc {
        *p /= norm;
    }

    for _ in 0..100 {
        let mut new_pc = vec![0.0; dim];
        for i in 0..dim {
            for j in 0..dim {
                new_pc[i] += cov[i][j] * pc[j];
            }
        }

        // Normalize
        let mag: f64 = new_pc.iter().map(|x| x * x).sum::<f64>().sqrt();
        if mag < 1e-15 {
            return None;
        }
        for p in &mut new_pc {
            *p /= mag;
        }

        pc = new_pc;
    }

    Some(pc)
}

fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let mag_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let mag_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();
    if mag_a < 1e-15 || mag_b < 1e-15 { 0.0 } else { dot / (mag_a * mag_b) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity_identical() {
        let a = vec![1.0, 2.0, 3.0];
        assert!((cosine_similarity(&a, &a) - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_cosine_similarity_orthogonal() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        assert!(cosine_similarity(&a, &b).abs() < 1e-10);
    }
}
