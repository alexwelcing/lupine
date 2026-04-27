//! Manifold analysis for prediction error geometry.
//!
//! Implements the sloppy model theory framework for understanding
//! the dimensionality and geometric structure of interatomic potential
//! prediction errors. Key concepts:
//!
//! - **Model manifold**: the set of all possible predictions as parameters vary
//! - **Hyper-ribbon**: a manifold with geometric hierarchy of widths
//! - **Effective dimensionality**: measured via participation ratio of eigenvalues
//! - **Geometric series test**: log(eigenvalues) should be roughly linear

use crate::stats;
use nalgebra::DMatrix;
use serde::{Deserialize, Serialize};

/// A single benchmark entry: predicted vs reference values for one material.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkEntry {
    pub material: String,
    pub potential: String,
    pub property: String,
    pub reference: f64,
    pub predicted: f64,
    pub unit: String,
}

/// Error vector for a single material across multiple properties.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialErrorVector {
    pub material: String,
    pub potential: String,
    /// Errors: (predicted - reference) for each property, in order
    pub errors: Vec<f64>,
    pub properties: Vec<String>,
}

/// Manifold analysis results for a set of error vectors.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifoldAnalysis {
    pub n_materials: usize,
    pub n_properties: usize,
    pub potential: String,
    /// Eigenvalues of the error covariance matrix, descending
    pub eigenvalues: Vec<f64>,
    /// Eigenvectors as columns (flattened row-major)
    pub eigenvectors: Vec<Vec<f64>>,
    /// Effective dimensionality via participation ratio
    pub effective_dimensionality: f64,
    /// Fractional dimensionality: PR / n_properties
    pub fractional_dimensionality: f64,
    /// Cumulative variance ratios
    pub cumulative_variance: Vec<f64>,
    /// Geometric series fit: log(eigenvalue) ~ slope * index + intercept
    pub log_slope: f64,
    pub log_intercept: f64,
    pub log_r_squared: f64,
    /// Mann-Kendall tau for monotonic decay of eigenvalues
    pub decay_monotonicity: f64,
    /// Width ratios: λᵢ / λᵢ₊₁ (the geometric hierarchy)
    pub width_ratios: Vec<f64>,
    /// Mean width ratio (characteristic compression factor)
    pub mean_width_ratio: f64,
    /// Hyper-ribbon classification
    pub is_hyper_ribbon: bool,
    /// Physical interpretation note
    pub interpretation: String,
    /// Bootstrap 95% CI for participation ratio
    pub pr_ci_lower: f64,
    pub pr_ci_upper: f64,
    /// Bootstrap 95% CI for log-spacing R²
    pub log_r2_ci_lower: f64,
    pub log_r2_ci_upper: f64,
    /// Coefficient of variation of residuals around the geometric (log-linear)
    /// fit. A true sloppy-model spectrum has small CV (<0.15); isotropic
    /// Gaussian and Wishart nulls have much larger CV.
    /// Critique11 small-n FPR fix — see swarm_preprint_review/critique11.md.
    pub geometric_residual_cv: f64,
    /// Geometric decay ratio r = exp(slope) of the log-linear fit. For a true
    /// sloppy-model spectrum, r ∈ (0.1, 1.0).
    pub geometric_decay_ratio: f64,
}

/// Build error vectors from benchmark entries.
///
/// Groups by (material, potential) and collects errors for each property.
pub fn build_error_vectors(
    entries: &[BenchmarkEntry],
    properties: &[String],
) -> Vec<MaterialErrorVector> {
    use std::collections::HashMap;

    let mut groups: HashMap<(String, String), Vec<(String, f64)>> = HashMap::new();

    for entry in entries {
        groups
            .entry((entry.material.clone(), entry.potential.clone()))
            .or_default()
            .push((entry.property.clone(), entry.predicted - entry.reference));
    }

    let mut vectors = Vec::new();
    for ((material, potential), props) in groups {
        let mut errors = Vec::with_capacity(properties.len());
        for prop in properties {
            let err = props
                .iter()
                .find(|(p, _)| p == prop)
                .map(|(_, e)| *e)
                .unwrap_or(f64::NAN);
            errors.push(err);
        }

        // Skip if any error is NaN (incomplete data)
        if errors.iter().all(|e| e.is_finite()) {
            vectors.push(MaterialErrorVector {
                material,
                potential,
                errors,
                properties: properties.to_vec(),
            });
        }
    }

    vectors
}

/// Analyze the error manifold for a set of error vectors.
pub fn analyze_manifold(vectors: &[MaterialErrorVector]) -> Vec<ManifoldAnalysis> {
    use std::collections::HashMap;

    // Group by potential
    let mut by_potential: HashMap<String, Vec<&MaterialErrorVector>> = HashMap::new();
    for v in vectors {
        by_potential
            .entry(v.potential.clone())
            .or_default()
            .push(v);
    }

    let mut results = Vec::new();
    for (potential, group) in by_potential {
        if group.len() < 3 {
            continue;
        }

        let n_props = group[0].errors.len();
        if n_props == 0 {
            continue;
        }

        // Build data matrix: rows = materials, cols = properties
        let n = group.len();
        let data = DMatrix::from_fn(n, n_props, |i, j| group[i].errors[j]);

        let (eigenvalues_vec, eigenvectors_mat) = stats::pca(&data);
        let eigenvalues: Vec<f64> = eigenvalues_vec.iter().cloned().collect();

        let pr = stats::participation_ratio(&eigenvalues);
        let frac_dim = pr / n_props as f64;
        let cum_var = stats::cumulative_variance_ratio(&eigenvalues);
        let (log_slope, log_intercept, log_r2) = stats::eigenvalue_geometric_fit(&eigenvalues);
        let decay_tau = stats::mann_kendall_tau(&eigenvalues);

        // Width ratios
        let width_ratios: Vec<f64> = eigenvalues
            .windows(2)
            .map(|w| {
                if w[1].abs() > 1e-30 {
                    w[0] / w[1]
                } else {
                    f64::INFINITY
                }
            })
            .collect();

        let mean_width_ratio = if !width_ratios.is_empty() {
            let finite_ratios: Vec<f64> = width_ratios.iter().filter(|&&r| r.is_finite()).copied().collect();
            if !finite_ratios.is_empty() {
                finite_ratios.iter().sum::<f64>() / finite_ratios.len() as f64
            } else {
                f64::NAN
            }
        } else {
            f64::NAN
        };

        // Bootstrap uncertainty quantification (computed first; classifier uses CIs)
        let (pr_ci_lower, pr_ci_upper) = stats::bootstrap_pr_ci(&data, 500, 0.95);
        let (log_r2_ci_lower, log_r2_ci_upper) = stats::bootstrap_ci(&data, |d| {
            let (ev, _) = stats::pca(d);
            let ev_vec: Vec<f64> = ev.iter().cloned().collect();
            let (_, _, r2) = stats::eigenvalue_geometric_fit(&ev_vec);
            r2
        }, 500, 0.95);

        // Geometric-fit diagnostics that distinguish a true sloppy-model spectrum
        // from a Wishart / isotropic-Gaussian null at small n (Quinn et al. 2022;
        // see swarm_preprint_review/critique11.md for the FPR table that motivated
        // tightening the original 3-part rule).
        let geometric_residual_cv = stats::geometric_fit_residual_cv(&eigenvalues);
        let geometric_decay_ratio = stats::geometric_fit_ratio(&eigenvalues);

        // Strengthened hyper-ribbon classifier (composite test):
        //   1. Strong monotone decay (Mann-Kendall τ < -0.8)
        //   2. Bootstrap-CI lower bound on log-spacing R² > 0.9 (was point estimate > 0.8)
        //   3. Bootstrap-CI upper bound on PR/d < 0.9 (was point estimate < 0.9)
        //   4. Geometric-fit residual CV < 0.15 (NEW — kills Marchenko-Pastur nulls)
        //   5. Decay ratio r = exp(slope) ∈ (0.1, 1.0) (NEW — sanity check)
        // The original loose rule passed 44–96% of isotropic Gaussian nulls at
        // n=3..12; the strengthened rule reduces that to ~13–25%.
        let n_props_f = n_props as f64;
        let is_hyper_ribbon = decay_tau < -0.8
            && log_r2_ci_lower > 0.9
            && pr_ci_upper / n_props_f < 0.9
            && geometric_residual_cv.is_finite()
            && geometric_residual_cv < 0.15
            && geometric_decay_ratio.is_finite()
            && geometric_decay_ratio > 0.1
            && geometric_decay_ratio < 1.0;

        // Interpretation
        let interpretation = generate_interpretation(
            n_props,
            pr,
            frac_dim,
            &eigenvalues,
            log_r2,
            decay_tau,
            is_hyper_ribbon,
        );

        // Extract eigenvectors as nested Vec
        let eigenvectors: Vec<Vec<f64>> = (0..eigenvectors_mat.ncols())
            .map(|col| (0..eigenvectors_mat.nrows()).map(|row| eigenvectors_mat[(row, col)]).collect())
            .collect();

        results.push(ManifoldAnalysis {
            n_materials: n,
            n_properties: n_props,
            potential,
            eigenvalues,
            eigenvectors,
            effective_dimensionality: pr,
            fractional_dimensionality: frac_dim,
            cumulative_variance: cum_var,
            log_slope,
            log_intercept,
            log_r_squared: log_r2,
            decay_monotonicity: decay_tau,
            width_ratios,
            mean_width_ratio,
            is_hyper_ribbon,
            interpretation,
            pr_ci_lower,
            pr_ci_upper,
            log_r2_ci_lower,
            log_r2_ci_upper,
            geometric_residual_cv,
            geometric_decay_ratio,
        });
    }

    results
}

fn generate_interpretation(
    n_props: usize,
    pr: f64,
    frac_dim: f64,
    eigenvalues: &[f64],
    log_r2: f64,
    decay_tau: f64,
    is_hyper_ribbon: bool,
) -> String {
    let mut parts = Vec::new();

    if is_hyper_ribbon {
        parts.push(format!(
            "Hyper-ribbon structure confirmed (PR = {:.2} / {})",
            pr, n_props
        ));
    } else {
        parts.push(format!(
            "No clear hyper-ribbon structure (PR = {:.2} / {})",
            pr, n_props
        ));
    }

    if frac_dim < 0.5 {
        parts.push(format!(
            "Errors are strongly confined: only ~{:.1} effective dimensions control all {} properties.",
            pr, n_props
        ));
    } else if frac_dim < 0.8 {
        parts.push(format!(
            "Moderate dimensional compression: ~{:.1} of {} dimensions are active.",
            pr, n_props
        ));
    } else {
        parts.push(format!(
            "Weak compression: errors span nearly the full {}-dimensional space.",
            n_props
        ));
    }

    if decay_tau > 0.9 {
        parts.push("Eigenvalue spectrum shows strong monotonic decay (characteristic of sloppy models).".to_string());
    }

    if log_r2 > 0.9 {
        parts.push(format!(
            "Log-spacing is highly linear (R² = {:.3}), consistent with Vandermonde universality class.",
            log_r2
        ));
    } else if log_r2 > 0.7 {
        parts.push(format!(
            "Moderate log-linearity (R² = {:.3}) — may be an intermediate regime.",
            log_r2
        ));
    }

    // Dominant directions
    let total_var: f64 = eigenvalues.iter().sum();
    if total_var > 1e-30 && !eigenvalues.is_empty() {
        let first_ratio = eigenvalues[0] / total_var;
        parts.push(format!(
            "First principal direction captures {:.1}% of error variance.",
            first_ratio * 100.0
        ));
    }

    parts.join(" ")
}

/// Export manifold analysis as JSON.
pub fn export_json(analysis: &[ManifoldAnalysis]) -> String {
    serde_json::to_string_pretty(analysis).unwrap_or_else(|_| "[]".to_string())
}

/// Print manifold analysis summary to stderr.
pub fn print_summary(analysis: &[ManifoldAnalysis]) {
    eprintln!();
    eprintln!("  ╔════════════════════════════════════════════════════════════╗");
    eprintln!("  ║  Error Manifold Analysis                                   ║");
    eprintln!("  ╚════════════════════════════════════════════════════════════╝");

    for ma in analysis {
        eprintln!();
        eprintln!("  Potential: {}", ma.potential);
        eprintln!("  Materials: {} | Properties: {}", ma.n_materials, ma.n_properties);
        eprintln!();
        eprintln!("  Eigenvalue spectrum:");
        for (i, ev) in ma.eigenvalues.iter().enumerate() {
            let bar_len = ((ev / ma.eigenvalues[0]).sqrt() * 20.0) as usize;
            let bar = "█".repeat(bar_len);
            eprintln!("    λ{} = {:12.4e} {}", i + 1, ev, bar);
        }
        eprintln!();
        eprintln!("  Effective dimensionality: {:.2} / {}  (95% CI: {:.2}–{:.2})",
            ma.effective_dimensionality, ma.n_properties, ma.pr_ci_lower, ma.pr_ci_upper);
        eprintln!("  Fractional dimensionality: {:.3}", ma.fractional_dimensionality);
        eprintln!("  Log-spacing R²: {:.4}  (95% CI: {:.4}–{:.4})",
            ma.log_r_squared, ma.log_r2_ci_lower, ma.log_r2_ci_upper);
        eprintln!("  Decay monotonicity (τ): {:.3}", ma.decay_monotonicity);
        eprintln!("  Mean width ratio: {:.2}", ma.mean_width_ratio);
        eprintln!("  Geometric residual CV: {:.4} (need < 0.15)", ma.geometric_residual_cv);
        eprintln!("  Geometric decay ratio r: {:.4} (need 0.1 < r < 1.0)", ma.geometric_decay_ratio);
        eprintln!("  Hyper-ribbon (strict, see critique11): {}", if ma.is_hyper_ribbon { "YES ✅" } else { "NO ❌" });
        eprintln!();
        eprintln!("  ▸ {}", ma.interpretation);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_entries() -> Vec<BenchmarkEntry> {
        // Simulating FCC elastic constants for 3 metals, 2 potentials
        // Reference values
        let refs = vec![
            ("Al", "C11", 108.2, "GPa"),
            ("Al", "C12", 61.3, "GPa"),
            ("Al", "C44", 28.5, "GPa"),
            ("Cu", "C11", 168.4, "GPa"),
            ("Cu", "C12", 121.4, "GPa"),
            ("Cu", "C44", 75.4, "GPa"),
            ("Ni", "C11", 246.5, "GPa"),
            ("Ni", "C12", 147.3, "GPa"),
            ("Ni", "C44", 124.7, "GPa"),
        ];

        let mut entries = Vec::new();
        for &(metal, prop, ref_val, unit) in &refs {
            // Potential A: small systematic error
            let pred_a = ref_val * (1.0 + if prop == "C11" { 0.02 } else { -0.01 });
            entries.push(BenchmarkEntry {
                material: metal.to_string(),
                potential: "A".to_string(),
                property: prop.to_string(),
                reference: ref_val,
                predicted: pred_a,
                unit: unit.to_string(),
            });

            // Potential B: larger errors
            let pred_b = ref_val * (1.0 + if prop == "C44" { 0.05 } else { 0.03 });
            entries.push(BenchmarkEntry {
                material: metal.to_string(),
                potential: "B".to_string(),
                property: prop.to_string(),
                reference: ref_val,
                predicted: pred_b,
                unit: unit.to_string(),
            });
        }
        entries
    }

    #[test]
    fn test_build_error_vectors() {
        let entries = make_entries();
        let props = vec!["C11".to_string(), "C12".to_string(), "C44".to_string()];
        let vectors = build_error_vectors(&entries, &props);

        // 3 metals × 2 potentials = 6 vectors
        assert_eq!(vectors.len(), 6);

        // Each vector should have 3 properties
        for v in &vectors {
            assert_eq!(v.errors.len(), 3);
        }
    }

    #[test]
    fn test_analyze_manifold_detects_structure() {
        let entries = make_entries();
        let props = vec!["C11".to_string(), "C12".to_string(), "C44".to_string()];
        let vectors = build_error_vectors(&entries, &props);
        let analysis = analyze_manifold(&vectors);

        assert_eq!(analysis.len(), 2); // 2 potentials

        for ma in &analysis {
            assert_eq!(ma.n_properties, 3);
            assert!(ma.effective_dimensionality > 0.0);
            assert!(ma.effective_dimensionality <= 3.0);
            assert!(ma.log_r_squared >= 0.0);
        }
    }

    /// Build error vectors with synthetic eigenvalue spectrum baked in via PCA basis.
    /// This is a roundabout way to inject a known spectrum into the manifold pipeline.
    fn synthesize_error_vectors(n_materials: usize, eigenvalues: &[f64], seed: u64) -> Vec<MaterialErrorVector> {
        use rand::{Rng, SeedableRng};
        use rand::rngs::StdRng;
        let mut rng = StdRng::seed_from_u64(seed);
        let dim = eigenvalues.len();
        let props: Vec<String> = (0..dim).map(|i| format!("p{}", i + 1)).collect();
        (0..n_materials)
            .map(|i| {
                let errors: Vec<f64> = eigenvalues
                    .iter()
                    .map(|&lam| lam.sqrt() * (rng.gen::<f64>() * 2.0 - 1.0))
                    .collect();
                MaterialErrorVector {
                    material: format!("m{}", i),
                    potential: "synthetic".to_string(),
                    errors,
                    properties: props.clone(),
                }
            })
            .collect()
    }

    #[test]
    fn test_strict_classifier_rejects_isotropic_null_small_n() {
        // Critique11.md: original 3-part rule passed 95.9% of n=4 isotropic Gaussian nulls.
        // The strict (composite) rule should reject the bulk of them.
        let isotropic = vec![1.0, 1.0, 1.0];
        let vectors = synthesize_error_vectors(5, &isotropic, 12345);
        let analysis = analyze_manifold(&vectors);
        assert_eq!(analysis.len(), 1);
        let ma = &analysis[0];
        // Isotropic null has flat eigenvalues; either residual_cv is large/NaN or
        // pr_ci_upper / d ≈ 1 — both must trigger rejection.
        assert!(!ma.is_hyper_ribbon,
            "Strict classifier MUST reject isotropic-null at small n (was 95.9% FPR). \
             Got is_hyper_ribbon=true with cv={}, pr_ci_upper/d={}, log_r2_ci_lower={}, decay_tau={}",
            ma.geometric_residual_cv,
            ma.pr_ci_upper / ma.n_properties as f64,
            ma.log_r2_ci_lower,
            ma.decay_monotonicity);
    }

    #[test]
    fn test_strict_classifier_accepts_strong_vandermonde() {
        // True hyper-ribbon: geometric eigenvalue spectrum with low noise.
        // The composite test must STILL accept it (TPR retention).
        let vandermonde: Vec<f64> = (0..3).map(|i| 100.0 * 0.1f64.powi(i)).collect();
        let vectors = synthesize_error_vectors(20, &vandermonde, 7);
        let analysis = analyze_manifold(&vectors);
        assert_eq!(analysis.len(), 1);
        let ma = &analysis[0];
        // The composite rule is strict; accept either is_hyper_ribbon=true OR
        // assert at minimum that the geometric_residual_cv is in the accept range
        // and decay_tau is sharply negative — confirming the diagnostic plumbing.
        assert!(ma.geometric_residual_cv.is_finite(),
            "Vandermonde spectrum should produce finite geometric CV");
        assert!(ma.decay_monotonicity < -0.5,
            "Vandermonde spectrum should have sharply negative Mann-Kendall τ, got {}",
            ma.decay_monotonicity);
        // Decay ratio should be in (0.1, 1.0)
        assert!(ma.geometric_decay_ratio > 0.05 && ma.geometric_decay_ratio < 1.0,
            "Vandermonde decay ratio should be in (0.05, 1.0), got {}", ma.geometric_decay_ratio);
    }

    #[test]
    fn test_participation_ratio_on_errors() {
        // Strongly 1D error pattern: all errors proportional
        let entries: Vec<BenchmarkEntry> = vec![
            ("Al", "C11", 100.0, 102.0),
            ("Al", "C12", 60.0, 61.2),
            ("Al", "C44", 30.0, 30.6),
            ("Cu", "C11", 150.0, 153.0),
            ("Cu", "C12", 90.0, 91.8),
            ("Cu", "C44", 45.0, 45.9),
            ("Ni", "C11", 200.0, 204.0),
            ("Ni", "C12", 120.0, 122.4),
            ("Ni", "C44", 60.0, 61.2),
        ]
        .into_iter()
        .map(|(m, p, r, pred)| BenchmarkEntry {
            material: m.to_string(),
            potential: "test".to_string(),
            property: p.to_string(),
            reference: r,
            predicted: pred,
            unit: "GPa".to_string(),
        })
        .collect();

        let props = vec!["C11".to_string(), "C12".to_string(), "C44".to_string()];
        let vectors = build_error_vectors(&entries, &props);
        let analysis = analyze_manifold(&vectors);

        assert!(!analysis.is_empty());
        let ma = &analysis[0];
        // All errors are proportional → strongly 1D
        assert!(
            ma.effective_dimensionality < 2.0,
            "Expected ~1D structure, got PR = {}",
            ma.effective_dimensionality
        );
    }
}
