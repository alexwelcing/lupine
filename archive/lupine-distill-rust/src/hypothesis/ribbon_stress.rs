//! Ribbon Stress Tests — probing the limits of hyper-ribbon geometry.
//!
//! Unlike the basic manifold test (which just checks PR < dim), these tests
//! ask *why*, *when*, and *where* the ribbon breaks:
//!
//!   1. **Stability**    — Does PR persist under 50% jackknife resampling?
//!   2. **Ablation**     — Which property drives the ribbon? Remove one at a time.
//!   3. **Influence**    — Does one outlier potential dominate the ribbon?
//!   4. **Alignment**    — Do different pair_styles produce *parallel* ribbons?
//!   5. **Threshold**    — What's the minimum N before the ribbon appears?

use anyhow::Result;
use rusqlite::Connection;
use serde::Serialize;

use crate::db::query::{self, ErrorVector};
use crate::hypothesis::manifold::jacobi_eigenvalues_pub as jacobi_eigenvalues;
use crate::null_model::Xorshift64;

// ────────────────────────────────────────────────────────────
// Result types
// ────────────────────────────────────────────────────────────

/// Combined output from all five stress tests.
#[derive(Debug, Clone, Serialize)]
pub struct RibbonStressResult {
    pub stability: StabilityResult,
    pub ablation: AblationResult,
    pub influence: InfluenceResult,
    pub alignment: AlignmentResult,
    pub threshold: ThresholdResult,
    /// Overall: how many of the 5 tests support the ribbon?
    pub tests_supporting: usize,
    pub tests_total: usize,
}

// ── 1. Stability ────────────────────────────────────────────

/// Does PR stay low when we randomly drop 50% of potentials?
#[derive(Debug, Clone, Serialize)]
pub struct StabilityResult {
    pub full_pr: f64,
    pub n_resamples: usize,
    pub mean_pr: f64,
    pub std_pr: f64,
    pub min_pr: f64,
    pub max_pr: f64,
    /// Fraction of resamples where PR < dim * 0.5 (strict ribbon)
    pub ribbon_fraction: f64,
    pub stable: bool,
}

// ── 2. Ablation ─────────────────────────────────────────────

/// Which property, when removed, causes the biggest PR change?
#[derive(Debug, Clone, Serialize)]
pub struct AblationResult {
    pub full_pr: f64,
    pub full_dim: usize,
    pub ablations: Vec<PropertyAblation>,
    /// The property whose removal most increases PR (weakens ribbon)
    pub critical_property: Option<String>,
    /// The property whose removal most decreases PR (irrelevant dimension)
    pub redundant_property: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PropertyAblation {
    pub removed_property: String,
    pub remaining_dim: usize,
    pub pr: f64,
    pub delta_pr: f64,
    /// Variance explained by PC1 after removal
    pub pc1_fraction: f64,
}

// ── 3. Influence ────────────────────────────────────────────

/// Does one outlier potential dominate the ribbon direction?
#[derive(Debug, Clone, Serialize)]
pub struct InfluenceResult {
    pub full_pr: f64,
    pub n_potentials: usize,
    pub loo_prs: Vec<InfluenceEntry>,
    /// Max |delta_pr| across all LOO removals
    pub max_influence: f64,
    /// How many potentials, if removed, flip the ribbon (PR > dim * 0.5)
    pub n_ribbon_breakers: usize,
    pub robust: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct InfluenceEntry {
    pub removed_potential: String,
    pub pr_without: f64,
    pub delta_pr: f64,
}

// ── 4. Alignment ────────────────────────────────────────────

/// Do different pair_styles produce *parallel* or *divergent* ribbons?
#[derive(Debug, Clone, Serialize)]
pub struct AlignmentResult {
    pub comparisons: Vec<RibbonAlignment>,
    pub mean_cosine: f64,
    pub n_comparisons: usize,
    /// True if mean |cos| > 0.7 (ribbons are roughly parallel)
    pub ribbons_parallel: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct RibbonAlignment {
    pub group_a: String,
    pub group_b: String,
    pub cosine_similarity: f64,
    pub pr_a: f64,
    pub pr_b: f64,
}

// ── 5. Threshold ────────────────────────────────────────────

/// What's the minimum N (potentials) before PR converges?
#[derive(Debug, Clone, Serialize)]
pub struct ThresholdResult {
    pub convergence_curve: Vec<ThresholdPoint>,
    pub full_n: usize,
    pub full_pr: f64,
    /// Smallest N where PR is within 10% of the full-dataset PR
    pub convergence_n: Option<usize>,
    pub converged: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ThresholdPoint {
    pub n: usize,
    pub mean_pr: f64,
    pub std_pr: f64,
}

// ────────────────────────────────────────────────────────────
// Main entry
// ────────────────────────────────────────────────────────────

/// Run all 5 stress tests on the global error manifold.
pub fn test_ribbon_stress(conn: &Connection, iterations: usize) -> Result<RibbonStressResult> {
    let vecs = query::error_vectors(conn, None, None)?;
    anyhow::ensure!(vecs.len() >= 5, "need ≥5 error vectors for stress tests");

    let properties = &vecs[0].properties;

    let stability = test_stability(&vecs, iterations);
    let ablation = test_ablation(&vecs, properties);
    let influence = test_influence(&vecs);
    let alignment = test_alignment(conn)?;
    let threshold = test_threshold(&vecs, iterations);

    let mut supporting = 0;
    if stability.stable { supporting += 1; }
    if ablation.critical_property.is_some() { supporting += 1; } // has identifiable structure
    if influence.robust { supporting += 1; }
    if alignment.ribbons_parallel { supporting += 1; }
    if threshold.converged { supporting += 1; }

    Ok(RibbonStressResult {
        stability,
        ablation,
        influence,
        alignment,
        threshold,
        tests_supporting: supporting,
        tests_total: 5,
    })
}

// ────────────────────────────────────────────────────────────
// Implementation
// ────────────────────────────────────────────────────────────

fn compute_pr(data: &[Vec<f64>]) -> (f64, Vec<f64>) {
    let n = data.len();
    if n < 3 || data[0].is_empty() {
        return (1.0, vec![]);
    }
    let dim = data[0].len();

    // Mean
    let mut mean = vec![0.0; dim];
    for row in data {
        for (i, v) in row.iter().enumerate() {
            mean[i] += v;
        }
    }
    for m in &mut mean { *m /= n as f64; }

    // Centered
    let centered: Vec<Vec<f64>> = data.iter()
        .map(|r| r.iter().zip(&mean).map(|(v, m)| v - m).collect())
        .collect();

    // Covariance
    let mut cov = vec![vec![0.0; dim]; dim];
    for row in &centered {
        for i in 0..dim {
            for j in 0..dim {
                cov[i][j] += row[i] * row[j];
            }
        }
    }
    let denom = (n - 1).max(1) as f64;
    for i in 0..dim {
        for j in 0..dim {
            cov[i][j] /= denom;
        }
    }

    let eigs = jacobi_eigenvalues(&cov);
    let total: f64 = eigs.iter().sum();
    if total < 1e-15 {
        return (1.0, eigs);
    }
    let sum_sq: f64 = eigs.iter().map(|e| e * e).sum();
    let pr = if sum_sq > 1e-15 { total * total / sum_sq } else { 1.0 };
    (pr, eigs)
}

/// Extract raw error matrix from ErrorVectors.
fn to_matrix(vecs: &[ErrorVector]) -> Vec<Vec<f64>> {
    vecs.iter().map(|v| v.errors.clone()).collect()
}

// ── 1. Stability: jackknife 50% ─────────────────────────────

fn test_stability(vecs: &[ErrorVector], iterations: usize) -> StabilityResult {
    let mat = to_matrix(vecs);
    let (full_pr, _) = compute_pr(&mat);
    let dim = mat[0].len();
    let half = mat.len() / 2;

    let mut rng = Xorshift64::from_time();
    let mut prs = Vec::with_capacity(iterations);

    for _ in 0..iterations {
        // Sample half without replacement
        let mut indices: Vec<usize> = (0..mat.len()).collect();
        rng.shuffle(&mut indices);
        let subset: Vec<Vec<f64>> = indices[..half].iter()
            .map(|&i| mat[i].clone())
            .collect();
        let (pr, _) = compute_pr(&subset);
        prs.push(pr);
    }

    let mean_pr = prs.iter().sum::<f64>() / prs.len() as f64;
    let std_pr = (prs.iter().map(|p| (p - mean_pr).powi(2)).sum::<f64>() / prs.len() as f64).sqrt();
    let min_pr = prs.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_pr = prs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let ribbon_frac = prs.iter().filter(|&&p| p < dim as f64 * 0.5).count() as f64 / prs.len() as f64;

    StabilityResult {
        full_pr,
        n_resamples: iterations,
        mean_pr,
        std_pr,
        min_pr,
        max_pr,
        ribbon_fraction: ribbon_frac,
        // Stable if ≥90% of resamples maintain ribbon
        stable: ribbon_frac >= 0.90,
    }
}

// ── 2. Ablation: drop each property ─────────────────────────

fn test_ablation(vecs: &[ErrorVector], properties: &[String]) -> AblationResult {
    let mat = to_matrix(vecs);
    let (full_pr, _) = compute_pr(&mat);
    let dim = mat[0].len();

    let mut ablations = Vec::new();

    for skip_j in 0..dim {
        let reduced: Vec<Vec<f64>> = mat.iter()
            .map(|row| {
                row.iter().enumerate()
                    .filter(|(j, _)| *j != skip_j)
                    .map(|(_, v)| *v)
                    .collect()
            })
            .collect();

        let (pr, eigs) = compute_pr(&reduced);
        let total: f64 = eigs.iter().sum();
        let pc1_frac = if total > 1e-15 { eigs[0] / total } else { 0.0 };

        let prop_name = properties.get(skip_j)
            .cloned()
            .unwrap_or_else(|| format!("prop_{}", skip_j));

        ablations.push(PropertyAblation {
            removed_property: prop_name,
            remaining_dim: dim - 1,
            pr,
            delta_pr: pr - full_pr,
            pc1_fraction: pc1_frac,
        });
    }

    // Critical: largest positive delta (removal weakens ribbon most)
    let critical = ablations.iter()
        .max_by(|a, b| a.delta_pr.partial_cmp(&b.delta_pr).unwrap())
        .filter(|a| a.delta_pr > 0.01)
        .map(|a| a.removed_property.clone());

    // Redundant: largest negative delta (removal strengthens ribbon)
    let redundant = ablations.iter()
        .min_by(|a, b| a.delta_pr.partial_cmp(&b.delta_pr).unwrap())
        .filter(|a| a.delta_pr < -0.01)
        .map(|a| a.removed_property.clone());

    AblationResult {
        full_pr,
        full_dim: dim,
        ablations,
        critical_property: critical,
        redundant_property: redundant,
    }
}

// ── 3. Influence: LOO on each potential ─────────────────────

fn test_influence(vecs: &[ErrorVector]) -> InfluenceResult {
    let mat = to_matrix(vecs);
    let (full_pr, _) = compute_pr(&mat);
    let dim = mat[0].len();
    let n = mat.len();

    // Only LOO on a sample if N is large (cap at 100 for speed)
    let check_indices: Vec<usize> = if n > 100 {
        let mut rng = Xorshift64::from_time();
        let mut all: Vec<usize> = (0..n).collect();
        rng.shuffle(&mut all);
        all[..100].to_vec()
    } else {
        (0..n).collect()
    };

    let mut entries = Vec::new();
    let mut max_influence = 0.0f64;
    let mut n_breakers = 0usize;

    for &skip_i in &check_indices {
        let subset: Vec<Vec<f64>> = mat.iter().enumerate()
            .filter(|(i, _)| *i != skip_i)
            .map(|(_, row)| row.clone())
            .collect();
        let (pr, _) = compute_pr(&subset);
        let delta = pr - full_pr;

        if delta.abs() > max_influence {
            max_influence = delta.abs();
        }
        if pr > dim as f64 * 0.5 {
            n_breakers += 1;
        }

        entries.push(InfluenceEntry {
            removed_potential: vecs[skip_i].potential_id.clone(),
            pr_without: pr,
            delta_pr: delta,
        });
    }

    // Sort by absolute influence
    entries.sort_by(|a, b| b.delta_pr.abs().partial_cmp(&a.delta_pr.abs()).unwrap());
    // Keep top 20
    entries.truncate(20);

    InfluenceResult {
        full_pr,
        n_potentials: n,
        loo_prs: entries,
        max_influence,
        n_ribbon_breakers: n_breakers,
        // Robust if no single removal breaks the ribbon
        robust: n_breakers == 0,
    }
}

// ── 4. Alignment: PC1 direction across pair_styles ──────────

fn test_alignment(conn: &Connection) -> Result<AlignmentResult> {
    let styles = query::query_distinct(conn, "pair_style")?;

    // Compute PC1 direction for each pair_style with ≥5 potentials
    let mut group_pc1s: Vec<(String, Vec<f64>, f64)> = Vec::new();
    for style in &styles {
        if style == "unknown" { continue; }
        let vecs = query::error_vectors(conn, None, Some(style))?;
        if vecs.len() < 5 { continue; }

        let mat = to_matrix(&vecs);
        let dim = mat[0].len();
        let (pr, _) = compute_pr(&mat);

        // Get PC1 via power iteration on covariance
        let pc1 = power_iteration_pc1(&mat);
        if pc1.len() == dim {
            group_pc1s.push((style.clone(), pc1, pr));
        }
    }

    // Pairwise cosine similarity
    let mut comparisons = Vec::new();
    for i in 0..group_pc1s.len() {
        for j in (i + 1)..group_pc1s.len() {
            let cos = cosine_sim(&group_pc1s[i].1, &group_pc1s[j].1);
            comparisons.push(RibbonAlignment {
                group_a: group_pc1s[i].0.clone(),
                group_b: group_pc1s[j].0.clone(),
                cosine_similarity: cos,
                pr_a: group_pc1s[i].2,
                pr_b: group_pc1s[j].2,
            });
        }
    }

    let n_comp = comparisons.len();
    let mean_cos = if n_comp > 0 {
        comparisons.iter().map(|c| c.cosine_similarity.abs()).sum::<f64>() / n_comp as f64
    } else {
        0.0
    };

    Ok(AlignmentResult {
        comparisons,
        mean_cosine: mean_cos,
        n_comparisons: n_comp,
        ribbons_parallel: mean_cos > 0.7,
    })
}

/// Power iteration to extract the dominant eigenvector (PC1 direction).
fn power_iteration_pc1(data: &[Vec<f64>]) -> Vec<f64> {
    let n = data.len();
    let dim = if data.is_empty() { 0 } else { data[0].len() };
    if dim == 0 || n < 2 { return vec![]; }

    // Mean
    let mut mean = vec![0.0; dim];
    for row in data {
        for (i, v) in row.iter().enumerate() { mean[i] += v; }
    }
    for m in &mut mean { *m /= n as f64; }

    // Centered
    let centered: Vec<Vec<f64>> = data.iter()
        .map(|r| r.iter().zip(&mean).map(|(v, m)| v - m).collect())
        .collect();

    // Covariance
    let mut cov = vec![vec![0.0; dim]; dim];
    for row in &centered {
        for i in 0..dim {
            for j in 0..dim {
                cov[i][j] += row[i] * row[j];
            }
        }
    }
    let denom = (n - 1).max(1) as f64;
    for row in &mut cov {
        for v in row.iter_mut() { *v /= denom; }
    }

    // Power iteration
    let mut v = vec![1.0 / (dim as f64).sqrt(); dim];
    for _ in 0..200 {
        let mut new_v = vec![0.0; dim];
        for i in 0..dim {
            for j in 0..dim {
                new_v[i] += cov[i][j] * v[j];
            }
        }
        let norm: f64 = new_v.iter().map(|x| x * x).sum::<f64>().sqrt();
        if norm < 1e-15 { break; }
        for x in &mut new_v { *x /= norm; }
        v = new_v;
    }
    v
}

fn cosine_sim(a: &[f64], b: &[f64]) -> f64 {
    let dot: f64 = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let na: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let nb: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();
    if na < 1e-15 || nb < 1e-15 { return 0.0; }
    dot / (na * nb)
}

// ── 5. Threshold: PR convergence curve ──────────────────────

fn test_threshold(vecs: &[ErrorVector], iterations: usize) -> ThresholdResult {
    let mat = to_matrix(vecs);
    let n = mat.len();
    let (full_pr, _) = compute_pr(&mat);

    // Test at N = 5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500, all
    let checkpoints: Vec<usize> = [5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500]
        .iter()
        .cloned()
        .filter(|&cp| cp < n)
        .collect();

    let mut curve = Vec::new();
    let mut convergence_n = None;
    let sub_iters = iterations.min(50); // fewer resamples per checkpoint for speed

    let mut rng = Xorshift64::from_time();

    for &cp in &checkpoints {
        let mut prs = Vec::with_capacity(sub_iters);
        for _ in 0..sub_iters {
            let mut indices: Vec<usize> = (0..n).collect();
            rng.shuffle(&mut indices);
            let subset: Vec<Vec<f64>> = indices[..cp].iter()
                .map(|&i| mat[i].clone())
                .collect();
            let (pr, _) = compute_pr(&subset);
            prs.push(pr);
        }

        let mean = prs.iter().sum::<f64>() / prs.len() as f64;
        let std = (prs.iter().map(|p| (p - mean).powi(2)).sum::<f64>() / prs.len() as f64).sqrt();

        curve.push(ThresholdPoint { n: cp, mean_pr: mean, std_pr: std });

        // Check convergence: mean within 10% of full PR
        if convergence_n.is_none() && (mean - full_pr).abs() < full_pr * 0.10 + 0.05 {
            convergence_n = Some(cp);
        }
    }

    ThresholdResult {
        convergence_curve: curve,
        full_n: n,
        full_pr,
        convergence_n,
        converged: convergence_n.is_some(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema;
    use crate::test_fixtures;

    #[test]
    fn stability_holds_on_fixture_data() {
        let conn = schema::open_memory().unwrap();
        test_fixtures::seed_manifold_data(&conn).unwrap();

        let vecs = query::error_vectors(&conn, None, None).unwrap();
        let result = test_stability(&vecs, 50);

        assert!(result.stable || result.ribbon_fraction >= 0.50, "ribbon should be roughly stable under 50% jackknife, ribbon_frac={:.2}", result.ribbon_fraction);
    }

    #[test]
    fn ablation_identifies_structure() {
        let conn = schema::open_memory().unwrap();
        test_fixtures::seed_manifold_data(&conn).unwrap();

        let vecs = query::error_vectors(&conn, None, None).unwrap();
        let properties = &vecs[0].properties;
        let result = test_ablation(&vecs, properties);

        assert!(!result.ablations.is_empty(), "should have ablation results");
        assert_eq!(result.ablations.len(), result.full_dim);
    }

    #[test]
    fn influence_detects_no_single_breaker_on_ribbon_data() {
        let conn = schema::open_memory().unwrap();
        test_fixtures::seed_manifold_data(&conn).unwrap();

        // Use only the ribbon group (Cu/eam_alloy)
        let vecs = query::error_vectors(&conn, Some("Cu"), None).unwrap();
        if vecs.len() < 5 { return; } // skip if too few
        let result = test_influence(&vecs);

        // With a strong ribbon, no single LOO should break it
        assert!(result.robust, "Cu ribbon should be robust to LOO, breakers={}", result.n_ribbon_breakers);
    }

    #[test]
    fn threshold_converges_reasonably() {
        let conn = schema::open_memory().unwrap();
        test_fixtures::seed_full(&conn).unwrap();

        let vecs = query::error_vectors(&conn, None, None).unwrap();
        let result = test_threshold(&vecs, 20);

        assert!(!result.convergence_curve.is_empty(), "should have convergence curve");
        // With full fixture (~185 records), should converge
        assert!(result.converged, "PR should converge with fixture data, full_n={}", result.full_n);
    }
}
