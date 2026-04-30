//! Cross-style PC1 alignment — tests `HYP-CU-UNIVERSAL-ALIGN-001`.
//!
//! The §3.2 transfer test asks "is PC1 conserved across **elements** within
//! the same pair_style?" — and the LLM-generated counter-claim flipped that
//! axis: PC1 is element-intrinsic, **invariant to functional form**. This
//! module tests the LLM's prediction directly: for each element with enough
//! data in two-or-more pair_style families, compute the cosine similarity
//! between PC1 vectors **across pair_styles** within that element. If the
//! mean cosine is high, the LLM was right and the dissertation's framing of
//! transfer was on the wrong axis. If low, PC1 lives with the functional
//! form, not the element.
//!
//! Output is a structured result with per-element summaries plus a pooled
//! mean cosine, and is persisted as a `CrossStyleAlignment` claim.

use anyhow::Result;
use rusqlite::Connection;
use serde::Serialize;

use crate::db::query::{self, ErrorVector};
use crate::null_model::Xorshift64;

/// Minimum number of potentials per (element, pair_style) bucket for that
/// bucket to contribute a PC1 vector. PCA on n<3 is meaningless; n=3 is the
/// hard floor.
const MIN_POTENTIALS_PER_BUCKET: usize = 3;

/// Properties that define the elastic-constant error space (matches §3.1
/// fingerprint and §3.2 transfer).
const PROPERTIES: &[&str] = &["C11", "C12", "C44"];

#[derive(Debug, Clone, Serialize)]
pub struct CrossStyleResult {
    pub per_element: Vec<ElementCrossStyle>,
    pub pooled_mean_cosine: f64,
    pub pooled_n_pairs: usize,
    pub n_elements_analyzed: usize,
    /// True when pooled mean |cos| > 0.7 — same heuristic as transfer.
    pub supported: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ElementCrossStyle {
    pub element: String,
    pub pair_styles: Vec<String>,
    pub n_pairs: usize,
    pub mean_cosine: f64,
    pub min_cosine: f64,
    pub max_cosine: f64,
    pub comparisons: Vec<StylePairComparison>,
}

#[derive(Debug, Clone, Serialize)]
pub struct StylePairComparison {
    pub style_a: String,
    pub style_b: String,
    pub cosine_similarity: f64,
    pub n_potentials_a: usize,
    pub n_potentials_b: usize,
    pub pc1_a: Vec<f64>,
    pub pc1_b: Vec<f64>,
}

pub fn run(conn: &Connection, element: Option<&str>) -> Result<CrossStyleResult> {
    let elements: Vec<String> = match element {
        Some(el) => vec![el.to_string()],
        None => query::query_distinct(conn, "element")?,
    };

    let mut per_element = Vec::new();
    let mut pooled_sum = 0.0_f64;
    let mut pooled_n = 0usize;

    for el in &elements {
        // Discover all pair_styles with sufficient (element, pair_style) data
        // for this element. We compute one PC1 per bucket.
        let styles = element_pair_styles(conn, el)?;
        if styles.len() < 2 {
            continue;
        }

        let mut style_pcs: Vec<(String, Vec<f64>, usize)> = Vec::new();
        for ps in &styles {
            let vecs = query::error_vectors_for_properties(
                conn, Some(el), Some(ps), Some(PROPERTIES),
            )?;
            if vecs.len() < MIN_POTENTIALS_PER_BUCKET {
                continue;
            }
            if let Some(pc1) = compute_pc1(&vecs) {
                style_pcs.push((ps.clone(), pc1, vecs.len()));
            }
        }
        if style_pcs.len() < 2 {
            continue;
        }

        let mut comparisons = Vec::new();
        let mut sum = 0.0_f64;
        let mut min_cos = f64::INFINITY;
        let mut max_cos = f64::NEG_INFINITY;

        for i in 0..style_pcs.len() {
            for j in (i + 1)..style_pcs.len() {
                let cos = cosine(&style_pcs[i].1, &style_pcs[j].1).abs();
                sum += cos;
                if cos < min_cos { min_cos = cos; }
                if cos > max_cos { max_cos = cos; }
                comparisons.push(StylePairComparison {
                    style_a: style_pcs[i].0.clone(),
                    style_b: style_pcs[j].0.clone(),
                    cosine_similarity: cos,
                    n_potentials_a: style_pcs[i].2,
                    n_potentials_b: style_pcs[j].2,
                    pc1_a: style_pcs[i].1.clone(),
                    pc1_b: style_pcs[j].1.clone(),
                });
            }
        }
        let n_pairs = comparisons.len();
        if n_pairs == 0 { continue; }
        let mean_cos = sum / n_pairs as f64;

        pooled_sum += sum;
        pooled_n += n_pairs;

        per_element.push(ElementCrossStyle {
            element: el.clone(),
            pair_styles: style_pcs.iter().map(|(s, _, _)| s.clone()).collect(),
            n_pairs,
            mean_cosine: mean_cos,
            min_cosine: if min_cos.is_finite() { min_cos } else { 0.0 },
            max_cosine: if max_cos.is_finite() { max_cos } else { 0.0 },
            comparisons,
        });
    }

    let pooled_mean = if pooled_n > 0 { pooled_sum / pooled_n as f64 } else { 0.0 };

    Ok(CrossStyleResult {
        n_elements_analyzed: per_element.len(),
        per_element,
        pooled_mean_cosine: pooled_mean,
        pooled_n_pairs: pooled_n,
        supported: pooled_mean > 0.7,
    })
}

/// Random-unit-vector null model — matches the convention used by §3.2
/// transfer's null. Returns the empirical p-value vs the observed pooled mean.
pub fn null_model_pooled(
    conn: &Connection,
    n_iterations: usize,
) -> Result<(f64, f64, f64, f64, f64, Vec<f64>)> {
    let observed = run(conn, None)?;
    if observed.pooled_n_pairs == 0 {
        anyhow::bail!("cross-style null: no comparisons in observed result");
    }
    let n_pairs = observed.pooled_n_pairs;
    let dim = PROPERTIES.len();

    let mut rng = Xorshift64::from_time();
    let mut null_dist = Vec::with_capacity(n_iterations);
    for _ in 0..n_iterations {
        let mut sum = 0.0_f64;
        for _ in 0..n_pairs {
            let a = random_unit_vector(&mut rng, dim);
            let b = random_unit_vector(&mut rng, dim);
            sum += cosine(&a, &b).abs();
        }
        null_dist.push(sum / n_pairs as f64);
    }

    let mut sorted = null_dist.clone();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let pct = |q: f64| sorted[((q * (sorted.len() as f64 - 1.0)).round() as usize).min(sorted.len() - 1)];
    let mean = null_dist.iter().sum::<f64>() / null_dist.len() as f64;
    let var = null_dist.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / null_dist.len() as f64;
    let std = var.sqrt();
    let lo = pct(0.025);
    let hi = pct(0.975);
    let ge = null_dist.iter().filter(|x| **x >= observed.pooled_mean_cosine).count() as f64;
    let p = (ge + 1.0) / (null_dist.len() as f64 + 1.0);
    Ok((observed.pooled_mean_cosine, mean, std, lo, hi, vec_with_p(null_dist, p)))
}

fn vec_with_p(mut v: Vec<f64>, p: f64) -> Vec<f64> {
    // Stash the p-value in the last slot so the caller can plumb it through
    // without changing the tuple shape. Cheap, contained convention.
    v.push(p);
    v
}

// ─── helpers ────────────────────────────────────────────────

/// All pair_styles that have at least one record for this element. Drops
/// `unknown` and `kim` — they are wrapper labels rather than functional forms,
/// and including them here would muddy the cross-style comparison.
fn element_pair_styles(conn: &Connection, element: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT pair_style FROM benchmarks
         WHERE element = ?1
           AND pair_style NOT IN ('unknown', 'kim')
         ORDER BY pair_style",
    )?;
    let rows: Vec<String> = stmt.query_map([element], |r| r.get::<_, String>(0))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

/// Power iteration for the dominant eigenvector of the error covariance matrix.
/// Mirrors the implementation in `hypothesis::transfer` — duplicated here
/// rather than re-exported because the inputs come pre-filtered by
/// (element, pair_style) and we want a self-contained diagnostic module.
fn compute_pc1(vectors: &[ErrorVector]) -> Option<Vec<f64>> {
    if vectors.is_empty() { return None; }
    let dim = vectors[0].errors.len();
    let n = vectors.len();
    if dim < 2 || n < 2 { return None; }

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

    let mut pc = vec![1.0; dim];
    let norm = (dim as f64).sqrt();
    for p in &mut pc { *p /= norm; }

    for _ in 0..100 {
        let mut new_pc = vec![0.0; dim];
        for i in 0..dim {
            for j in 0..dim { new_pc[i] += cov[i][j] * pc[j]; }
        }
        let mag = new_pc.iter().map(|x| x * x).sum::<f64>().sqrt();
        if mag < 1e-15 { return None; }
        for p in &mut new_pc { *p /= mag; }
        pc = new_pc;
    }
    Some(pc)
}

fn cosine(a: &[f64], b: &[f64]) -> f64 {
    let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let ma = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let mb = b.iter().map(|x| x * x).sum::<f64>().sqrt();
    if ma < 1e-15 || mb < 1e-15 { 0.0 } else { dot / (ma * mb) }
}

fn random_unit_vector(rng: &mut Xorshift64, dim: usize) -> Vec<f64> {
    let mut v = Vec::with_capacity(dim);
    for _ in 0..dim {
        let u1 = rng.next_f64().max(1e-12);
        let u2 = rng.next_f64();
        let z = (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos();
        v.push(z);
    }
    let mag = v.iter().map(|x| x * x).sum::<f64>().sqrt();
    if mag < 1e-15 { return random_unit_vector(rng, dim); }
    for x in &mut v { *x /= mag; }
    v
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cosine_identical_unit_vector() {
        let a = vec![1.0, 0.0, 0.0];
        assert!((cosine(&a, &a).abs() - 1.0).abs() < 1e-10);
    }

    #[test]
    fn cosine_orthogonal_zero() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        assert!(cosine(&a, &b).abs() < 1e-10);
    }
}
