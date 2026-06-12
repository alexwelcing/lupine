//! Statistical significance engine — permutation tests + bootstrap CIs.
//!
//! For every "supported" claim the engine emits, we want a corresponding null
//! distribution that answers the question: *would a label-shuffled / element-
//! shuffled / resampled-without-structure version of this dataset produce the
//! same statistic by chance?* If the observed statistic falls in the upper
//! tail of the null distribution, we have empirical p-value-grade evidence.
//!
//! No external RNG dependency: a small xorshift64* generator is sufficient
//! for permutation tests where we just need uncorrelated index shuffles. We
//! seed from system time so re-runs produce slightly different distributions,
//! but the central tendencies converge well within 1,000 iterations.

use anyhow::Result;
use rusqlite::Connection;
use serde::Serialize;

use crate::db::query::{self, ErrorVector};
use crate::hypothesis::{fingerprint, manifold, transfer};

// ─── RNG ────────────────────────────────────────────────────

#[derive(Clone)]
pub struct Xorshift64 {
    state: u64,
}

impl Xorshift64 {
    pub fn new(seed: u64) -> Self {
        Self { state: seed | 1 }
    }
    pub fn from_time() -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0xdead_beef_cafe_babe);
        Self::new(now)
    }
    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        x.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }
    pub fn next_f64(&mut self) -> f64 {
        // 53-bit mantissa
        (self.next_u64() >> 11) as f64 / ((1u64 << 53) as f64)
    }
    pub fn range(&mut self, lo: usize, hi: usize) -> usize {
        if hi <= lo { return lo; }
        lo + (self.next_u64() as usize % (hi - lo))
    }
    /// Fisher-Yates in place.
    pub fn shuffle<T>(&mut self, slice: &mut [T]) {
        let n = slice.len();
        for i in (1..n).rev() {
            let j = self.next_u64() as usize % (i + 1);
            slice.swap(i, j);
        }
    }
}

// ─── Result type ────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct NullModelResult {
    pub test_name: String,
    pub grouping_key: String,
    pub method: String,
    pub observed: f64,
    pub null_mean: f64,
    pub null_std: f64,
    pub null_ci_low: f64,
    pub null_ci_high: f64,
    pub p_value: f64,
    pub n_iterations: usize,
    pub null_distribution: Vec<f64>,
    /// True if observed > 95% of the null distribution (one-tailed, upper).
    pub significant: bool,
}

fn summarize(observed: f64, samples: &[f64]) -> (f64, f64, f64, f64, f64) {
    let n = samples.len() as f64;
    let mean = samples.iter().sum::<f64>() / n;
    let var = samples.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / n.max(1.0);
    let std = var.sqrt();

    let mut sorted = samples.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let pct = |q: f64| -> f64 {
        let idx = (q * (sorted.len() as f64 - 1.0)).round() as usize;
        sorted.get(idx).copied().unwrap_or(0.0)
    };
    let ci_low = pct(0.025);
    let ci_high = pct(0.975);

    // One-tailed (upper) p-value: P(null >= observed).
    let ge = samples.iter().filter(|x| **x >= observed).count() as f64;
    let p_value = (ge + 1.0) / (n + 1.0);

    (mean, std, ci_low, ci_high, p_value)
}

// ─── Fingerprint null model ────────────────────────────────
//
// Hypothesis: pair_style is encoded in the (C11, C12, C44) error geometry.
// Null: shuffle pair_style assignments across potentials (preserving the
//   per-style count). If LOO accuracy survives the shuffle, we don't have a
//   real fingerprint — we have a coincidence of cluster sizes.

pub fn fingerprint_null(
    conn: &Connection,
    element: Option<&str>,
    n_iterations: usize,
) -> Result<NullModelResult> {
    // Observed accuracy from the real classifier.
    let observed = fingerprint::test_fingerprint(conn, element)?;
    let observed_acc = observed.loo_accuracy;
    let n_potentials = observed.n_potentials;

    // Pull the same vectors the test consumed so the null operates on the
    // identical sample (no benchmark-set drift between runs).
    let vectors = query::error_vectors_for_properties(
        conn, element, None, Some(&["C11", "C12", "C44"]),
    )?;
    if vectors.len() < 4 {
        anyhow::bail!("fingerprint null: need >=4 potentials, got {}", vectors.len());
    }

    let mut rng = Xorshift64::from_time();
    let mut null_dist = Vec::with_capacity(n_iterations);

    for _ in 0..n_iterations {
        let mut shuffled = vectors.clone();
        // Permute pair_style labels across the same vector set.
        let mut labels: Vec<String> = shuffled.iter().map(|v| v.pair_style.clone()).collect();
        rng.shuffle(&mut labels);
        for (v, l) in shuffled.iter_mut().zip(labels.into_iter()) {
            v.pair_style = l;
        }
        let acc = loo_accuracy(&shuffled);
        null_dist.push(acc);
    }

    let (mean, std, lo, hi, p) = summarize(observed_acc, &null_dist);
    let element_tag = element.unwrap_or("all");
    let _ = n_potentials; // kept for future per-element provenance
    Ok(NullModelResult {
        test_name: "fingerprint".into(),
        grouping_key: format!("element:{}", element_tag),
        method: "label_shuffle".into(),
        observed: observed_acc,
        null_mean: mean,
        null_std: std,
        null_ci_low: lo,
        null_ci_high: hi,
        p_value: p,
        n_iterations,
        significant: observed_acc > hi,
        null_distribution: null_dist,
    })
}

/// Stand-alone LOO classifier for a vector of (pair_style, errors) — used by
/// the null-model loop without going through the DB.
fn loo_accuracy(vectors: &[ErrorVector]) -> f64 {
    use std::collections::HashMap;
    let mut families: HashMap<String, Vec<&ErrorVector>> = HashMap::new();
    for v in vectors {
        families.entry(v.pair_style.clone()).or_default().push(v);
    }
    families.retain(|_, members| members.len() >= 2);
    if families.len() < 2 {
        return 0.0;
    }

    let classifiable: Vec<&ErrorVector> = vectors.iter()
        .filter(|v| families.contains_key(&v.pair_style))
        .collect();

    let mut correct = 0usize;
    let mut total = 0usize;
    for test_vec in &classifiable {
        let mut best_family = String::new();
        let mut best_dist = f64::MAX;

        for (ps, members) in &families {
            let excluded: Vec<&&ErrorVector> = members.iter()
                .filter(|m| m.potential_id != test_vec.potential_id)
                .collect();
            if excluded.is_empty() { continue; }

            let dim = test_vec.errors.len();
            let mut centroid = vec![0.0; dim];
            for m in &excluded {
                for (i, e) in m.errors.iter().enumerate() {
                    centroid[i] += e;
                }
            }
            let n = excluded.len() as f64;
            for c in &mut centroid { *c /= n; }

            let dist: f64 = test_vec.errors.iter().zip(centroid.iter())
                .map(|(x, y)| (x - y).powi(2))
                .sum::<f64>()
                .sqrt();
            if dist < best_dist {
                best_dist = dist;
                best_family = ps.clone();
            }
        }
        if best_family == test_vec.pair_style { correct += 1; }
        total += 1;
    }
    if total == 0 { 0.0 } else { correct as f64 / total as f64 }
}

// ─── Transfer null model ────────────────────────────────────
//
// Hypothesis: PC1 axes are conserved across elements within a pair_style.
// Null: for each (element, pair_style) PC1 vector, replace it with a random
//   unit vector in 3D and recompute the mean cosine. If real cosine survives,
//   we don't have alignment — we have a coincidence.

pub fn transfer_null(
    conn: &Connection,
    pair_style: Option<&str>,
    n_iterations: usize,
) -> Result<NullModelResult> {
    let observed = transfer::test_transfer(conn, pair_style)?;
    let observed_cos = observed.mean_cosine_similarity;
    let n_compares = observed.comparisons.len();

    let dim = observed.comparisons.first()
        .map(|c| c.pc1_a.len())
        .unwrap_or(3);

    let mut rng = Xorshift64::from_time();
    let mut null_dist = Vec::with_capacity(n_iterations);

    for _ in 0..n_iterations {
        // For each comparison, draw two random unit vectors in `dim` dims and
        // compute their cosine similarity. Mean across all comparisons.
        let mut sum = 0.0;
        for _ in 0..n_compares {
            let a = random_unit_vector(&mut rng, dim);
            let b = random_unit_vector(&mut rng, dim);
            sum += cosine(&a, &b).abs();
        }
        let null_mean_cos = if n_compares > 0 { sum / n_compares as f64 } else { 0.0 };
        null_dist.push(null_mean_cos);
    }

    let (mean, std, lo, hi, p) = summarize(observed_cos, &null_dist);
    let style_tag = pair_style.unwrap_or("all");
    Ok(NullModelResult {
        test_name: "transfer".into(),
        grouping_key: format!("style:{}", style_tag),
        method: "random_unit_vector".into(),
        observed: observed_cos,
        null_mean: mean,
        null_std: std,
        null_ci_low: lo,
        null_ci_high: hi,
        p_value: p,
        n_iterations,
        significant: observed_cos > hi,
        null_distribution: null_dist,
    })
}

fn random_unit_vector(rng: &mut Xorshift64, dim: usize) -> Vec<f64> {
    // Box-Muller → unit-normalize; produces uniformly-distributed unit vectors
    // on S^{dim-1}.
    let mut v = Vec::with_capacity(dim);
    for _ in 0..dim {
        let u1 = rng.next_f64().max(1e-12);
        let u2 = rng.next_f64();
        let z = (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos();
        v.push(z);
    }
    let mag = v.iter().map(|x| x * x).sum::<f64>().sqrt();
    if mag < 1e-15 {
        return random_unit_vector(rng, dim);
    }
    for x in &mut v { *x /= mag; }
    v
}

fn cosine(a: &[f64], b: &[f64]) -> f64 {
    let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let ma = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let mb = b.iter().map(|x| x * x).sum::<f64>().sqrt();
    if ma < 1e-15 || mb < 1e-15 { 0.0 } else { dot / (ma * mb) }
}

// ─── Manifold bootstrap ────────────────────────────────────
//
// Hypothesis: the participation ratio of an (element, pair_style) error
// manifold is genuinely <= some value.
// Method: bootstrap-resample potentials with replacement and recompute PR
//   for each sample. Report PR ± 95% CI.

pub fn manifold_bootstrap(
    conn: &Connection,
    grouping_key: &str,
    n_iterations: usize,
) -> Result<NullModelResult> {
    // Parse "style:X" / "element:X" / "global"
    let (filter_element, filter_style): (Option<String>, Option<String>) = if let Some(rest) = grouping_key.strip_prefix("style:") {
        (None, Some(rest.to_string()))
    } else if let Some(rest) = grouping_key.strip_prefix("element:") {
        (Some(rest.to_string()), None)
    } else {
        (None, None)
    };

    let vectors = query::error_vectors(conn, filter_element.as_deref(), filter_style.as_deref())?;
    if vectors.len() < 3 {
        anyhow::bail!("manifold bootstrap: need >=3 potentials in {}, got {}", grouping_key, vectors.len());
    }

    let observed_pr = compute_pr(&vectors).unwrap_or(0.0);

    let mut rng = Xorshift64::from_time();
    let n = vectors.len();
    let mut null_dist = Vec::with_capacity(n_iterations);

    for _ in 0..n_iterations {
        let mut sample: Vec<ErrorVector> = Vec::with_capacity(n);
        for _ in 0..n {
            sample.push(vectors[rng.range(0, n)].clone());
        }
        if let Some(pr) = compute_pr(&sample) {
            null_dist.push(pr);
        }
    }

    if null_dist.is_empty() {
        anyhow::bail!("manifold bootstrap: all resamples were degenerate");
    }

    let (mean, std, lo, hi, _) = summarize(observed_pr, &null_dist);
    // For bootstrap, a "p-value" against PR=dim (ribbon refuted) is what we
    // actually want: how many resamples have PR >= dim?
    let dim = vectors[0].errors.len() as f64;
    let above = null_dist.iter().filter(|pr| **pr >= dim * 0.8).count() as f64;
    let p = (above + 1.0) / (null_dist.len() as f64 + 1.0);

    Ok(NullModelResult {
        test_name: "manifold".into(),
        grouping_key: grouping_key.to_string(),
        method: "bootstrap_pr".into(),
        observed: observed_pr,
        null_mean: mean,
        null_std: std,
        null_ci_low: lo,
        null_ci_high: hi,
        p_value: p,
        n_iterations: null_dist.len(),
        significant: hi < dim * 0.8,
        null_distribution: null_dist,
    })
}

/// Compute participation ratio from a vector set (lifted from manifold.rs but
/// without the I/O coupling). Returns None on degenerate input.
fn compute_pr(vectors: &[ErrorVector]) -> Option<f64> {
    if vectors.is_empty() { return None; }
    let n = vectors.len();
    let dim = vectors[0].errors.len();
    if dim < 2 || n < 3 { return None; }

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
    Some(total * total / sum_sq)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_xorshift_uniform_ish() {
        let mut rng = Xorshift64::new(42);
        let mut counts = [0usize; 10];
        for _ in 0..10_000 {
            counts[rng.range(0, 10)] += 1;
        }
        // Expect ~1000 per bin. Generous tolerance.
        for c in counts {
            assert!(c > 700 && c < 1300, "uneven: {:?}", counts);
        }
    }

    #[test]
    fn test_random_unit_vector_norm() {
        let mut rng = Xorshift64::new(1);
        for _ in 0..100 {
            let v = random_unit_vector(&mut rng, 3);
            let mag: f64 = v.iter().map(|x| x * x).sum::<f64>().sqrt();
            assert!((mag - 1.0).abs() < 1e-10);
        }
    }

    #[test]
    fn test_summarize_simple() {
        let observed = 2.0;
        let samples: Vec<f64> = (0..1000).map(|i| (i as f64) / 1000.0).collect();
        let (mean, _std, lo, hi, p) = summarize(observed, &samples);
        assert!((mean - 0.4995).abs() < 0.01);
        assert!(lo < 0.05);
        assert!(hi > 0.95);
        // observed=2.0 is far above any sample so p ≈ 1/(N+1)
        assert!(p < 0.002);
    }
}
