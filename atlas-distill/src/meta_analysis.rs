//! Meta-analysis framework for combining correlations across heterogeneous groups.
//!
//! Implements the standard methodology for random-effects meta-analysis of
//! correlations, including Fisher z-transformation, DerSimonian-Laird
//! estimator for between-study variance, and heterogeneity statistics (Q, I², τ²).
//!
//! References:
//! - Hedges & Olkin, Statistical Methods for Meta-Analysis (1985)
//! - Borenstein et al., Introduction to Meta-Analysis (2009)
//! - DerSimonian & Laird, Controlled Clinical Trials (1986)

use crate::stats;
use serde::{Deserialize, Serialize};

/// A single group's correlation data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupCorrelation {
    pub group_id: String,
    pub n: usize,
    pub r: f64,
}

/// Random-effects meta-analysis result for correlations.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaAnalysisResult {
    pub n_groups: usize,
    pub total_n: usize,
    /// Pooled correlation (back-transformed from Fisher z)
    pub pooled_r: f64,
    /// 95% CI lower bound for pooled r
    pub ci_lower: f64,
    /// 95% CI upper bound for pooled r
    pub ci_upper: f64,
    /// Pooled Fisher z
    pub pooled_z: f64,
    /// Standard error of pooled z
    pub se_z: f64,
    /// Q-statistic (homogeneity test)
    pub q_statistic: f64,
    /// Degrees of freedom for Q
    pub q_df: usize,
    /// p-value for Q (homogeneity test)
    pub q_pvalue: f64,
    /// I²: percentage of variance due to heterogeneity
    pub i_squared: f64,
    /// τ²: between-study variance (in z-space)
    pub tau_squared: f64,
    /// τ: standard deviation of true effects
    pub tau: f64,
    /// Individual group results with weights
    pub group_results: Vec<GroupMetaResult>,
    /// Prediction interval for true effect in a new group
    pub pred_interval_lower: f64,
    pub pred_interval_upper: f64,
    /// Model used: "fixed" or "random"
    pub model: String,
}

/// Per-group meta-analysis contributions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupMetaResult {
    pub group_id: String,
    pub n: usize,
    pub r: f64,
    pub z: f64,
    pub se_z: f64,
    pub weight_fixed: f64,
    pub weight_random: f64,
    pub influence_percent: f64,
}

/// Fixed-effects meta-analysis of correlations.
///
/// Assumes all groups estimate the same underlying true effect.
pub fn fixed_effects_meta(groups: &[GroupCorrelation]) -> MetaAnalysisResult {
    if groups.is_empty() {
        return empty_result();
    }

    let group_results: Vec<GroupMetaResult> = groups
        .iter()
        .map(|g| {
            let z = stats::fisher_z(g.r);
            let se_z = stats::fisher_z_variance(g.n).sqrt();
            let w = 1.0 / (se_z * se_z);
            GroupMetaResult {
                group_id: g.group_id.clone(),
                n: g.n,
                r: g.r,
                z,
                se_z,
                weight_fixed: w,
                weight_random: w,
                influence_percent: 0.0,
            }
        })
        .collect();

    let sum_w: f64 = group_results.iter().map(|g| g.weight_fixed).sum();
    let sum_wz: f64 = group_results.iter().map(|g| g.weight_fixed * g.z).sum();

    let pooled_z = sum_wz / sum_w;
    let se_z = (1.0 / sum_w).sqrt();

    // Compute influence percentages
    let mut result = compute_final_result(groups, group_results, pooled_z, se_z, 0.0, "fixed");

    // For fixed effects, prediction interval = CI
    result.pred_interval_lower = result.ci_lower;
    result.pred_interval_upper = result.ci_upper;

    result
}

/// Random-effects meta-analysis of correlations (DerSimonian-Laird).
///
/// Allows the true effect to vary across groups.
pub fn random_effects_meta(groups: &[GroupCorrelation]) -> MetaAnalysisResult {
    if groups.is_empty() {
        return empty_result();
    }

    // Step 1: Compute fixed-effects weights and pooled estimate
    let fixed = fixed_effects_meta(groups);

    // Step 2: Compute Q statistic
    let q = fixed.q_statistic;
    let df = groups.len().saturating_sub(1);

    // Step 3: DerSimonian-Laird estimator for τ²
    let sum_w: f64 = fixed.group_results.iter().map(|g| g.weight_fixed).sum();
    let sum_w2: f64 = fixed
        .group_results
        .iter()
        .map(|g| g.weight_fixed * g.weight_fixed)
        .sum();

    let tau_sq = if df > 0 {
        let num = q - df as f64;
        let denom = sum_w - sum_w2 / sum_w;
        if num > 0.0 && denom > 0.0 {
            num / denom
        } else {
            0.0
        }
    } else {
        0.0
    };

    let _tau = tau_sq.sqrt();

    // Step 4: Random-effects weights: w_i* = 1 / (se_z² + τ²)
    let group_results: Vec<GroupMetaResult> = groups
        .iter()
        .map(|g| {
            let z = stats::fisher_z(g.r);
            let se_z = stats::fisher_z_variance(g.n).sqrt();
            let w_fixed = 1.0 / (se_z * se_z);
            let w_random = 1.0 / (se_z * se_z + tau_sq);
            GroupMetaResult {
                group_id: g.group_id.clone(),
                n: g.n,
                r: g.r,
                z,
                se_z,
                weight_fixed: w_fixed,
                weight_random: w_random,
                influence_percent: 0.0,
            }
        })
        .collect();

    let sum_wr: f64 = group_results.iter().map(|g| g.weight_random).sum();
    let sum_wrz: f64 = group_results.iter().map(|g| g.weight_random * g.z).sum();

    let pooled_z = sum_wrz / sum_wr;
    let se_z = (1.0 / sum_wr).sqrt();

    compute_final_result(groups, group_results, pooled_z, se_z, tau_sq, "random")
}

fn compute_final_result(
    groups: &[GroupCorrelation],
    mut group_results: Vec<GroupMetaResult>,
    pooled_z: f64,
    se_z: f64,
    tau_sq: f64,
    model: &str,
) -> MetaAnalysisResult {
    let total_n = groups.iter().map(|g| g.n).sum();
    let n_groups = groups.len();
    let df = n_groups.saturating_sub(1);

    // Back-transform pooled r
    let pooled_r = stats::fisher_z_inverse(pooled_z);

    // 95% CI in z-space, then back-transform
    let z_crit = 1.96;
    let ci_lower_z = pooled_z - z_crit * se_z;
    let ci_upper_z = pooled_z + z_crit * se_z;
    let ci_lower = stats::fisher_z_inverse(ci_lower_z);
    let ci_upper = stats::fisher_z_inverse(ci_upper_z);

    // Q statistic
    let q = groups
        .iter()
        .zip(&group_results)
        .map(|(_g, gr)| {
            let w = gr.weight_fixed;
            w * (gr.z - pooled_z).powi(2)
        })
        .sum();

    // I² = (Q - df) / Q × 100%, clamped to [0, 100]
    let i_squared = if q > 1e-10 && df > 0 {
        let raw: f64 = f64::max((q - df as f64) / q * 100.0, 0.0);
        raw.min(100.0)
    } else {
        0.0
    };

    // p-value for Q (chi-square with df)
    let q_pvalue = chi_square_pvalue(q, df);

    // Influence percentages
    let sum_w: f64 = group_results
        .iter()
        .map(|g| {
            if model == "random" {
                g.weight_random
            } else {
                g.weight_fixed
            }
        })
        .sum();
    for g in &mut group_results {
        let w = if model == "random" {
            g.weight_random
        } else {
            g.weight_fixed
        };
        g.influence_percent = if sum_w > 0.0 {
            (w / sum_w) * 100.0
        } else {
            0.0
        };
    }

    // Prediction interval (random effects only)
    let tau = tau_sq.sqrt();
    let pred_interval_lower = if model == "random" && tau_sq > 0.0 {
        stats::fisher_z_inverse(pooled_z - z_crit * (se_z.powi(2) + tau_sq).sqrt())
    } else {
        ci_lower
    };
    let pred_interval_upper = if model == "random" && tau_sq > 0.0 {
        stats::fisher_z_inverse(pooled_z + z_crit * (se_z.powi(2) + tau_sq).sqrt())
    } else {
        ci_upper
    };

    MetaAnalysisResult {
        n_groups,
        total_n,
        pooled_r,
        ci_lower,
        ci_upper,
        pooled_z,
        se_z,
        q_statistic: q,
        q_df: df,
        q_pvalue,
        i_squared,
        tau_squared: tau_sq,
        tau,
        group_results,
        pred_interval_lower,
        pred_interval_upper,
        model: model.to_string(),
    }
}

fn empty_result() -> MetaAnalysisResult {
    MetaAnalysisResult {
        n_groups: 0,
        total_n: 0,
        pooled_r: f64::NAN,
        ci_lower: f64::NAN,
        ci_upper: f64::NAN,
        pooled_z: f64::NAN,
        se_z: f64::NAN,
        q_statistic: f64::NAN,
        q_df: 0,
        q_pvalue: f64::NAN,
        i_squared: f64::NAN,
        tau_squared: f64::NAN,
        tau: f64::NAN,
        group_results: vec![],
        pred_interval_lower: f64::NAN,
        pred_interval_upper: f64::NAN,
        model: "none".to_string(),
    }
}

/// Approximate chi-square CDF for p-value computation.
/// Uses the regularized lower incomplete gamma function approximation.
fn chi_square_pvalue(x: f64, df: usize) -> f64 {
    if df == 0 || x < 0.0 {
        return f64::NAN;
    }
    if x == 0.0 {
        return 1.0;
    }

    let df_f = df as f64;

    // Wilson-Hilferty approximation works well for most practical cases
    let z = ((x / df_f).powf(1.0 / 3.0) - (1.0 - 2.0 / (9.0 * df_f))) / (2.0 / (9.0 * df_f)).sqrt();
    let p = 1.0 - normal_cdf(z);

    // For very small df and moderate x, refine with direct series
    if df <= 3 && x < 10.0 {
        let k = df_f / 2.0;
        let lambda = x / 2.0;

        let mut term = 1.0;
        let mut sum = 1.0;
        for n in 1..1000 {
            term *= lambda / (k + n as f64);
            sum += term;
            if term < 1e-15 {
                break;
            }
        }

        let gamma_k = gamma_approx(k);
        let lower_gamma = sum * lambda.powf(k) * (-lambda).exp();
        let upper_gamma = (gamma_k - lower_gamma).max(0.0);

        return (upper_gamma / gamma_k).clamp(0.0, 1.0);
    }

    p.clamp(0.0, 1.0)
}

/// Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
fn normal_cdf(x: f64) -> f64 {
    let b1 = 0.319381530;
    let b2 = -0.356563782;
    let b3 = 1.781477937;
    let b4 = -1.821255978;
    let b5 = 1.330274429;
    let p = 0.2316419;
    let c = 0.39894228;

    if x >= 0.0 {
        let t = 1.0 / (1.0 + p * x);
        1.0 - c * (-x * x / 2.0).exp() * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1)
    } else {
        1.0 - normal_cdf(-x)
    }
}

/// Gamma function approximation (Lanczos approximation for small arguments).
fn gamma_approx(z: f64) -> f64 {
    if z <= 0.0 {
        return f64::NAN;
    }
    if z < 1.0 {
        // Reflection formula
        return std::f64::consts::PI / (gamma_approx(1.0 - z) * (std::f64::consts::PI * z).sin());
    }

    // Lanczos approximation coefficients
    let p = [
        676.520_368_121_885_1,
        -1_259.139_216_722_402_8,
        771.323_428_777_653_1,
        -176.615_029_162_140_6,
        12.507_343_278_686_905,
        -0.138_571_095_265_720_12,
        9.984_369_192_007_10e-6,
        1.505_632_735_149_311_6e-7,
    ];

    let z = z - 1.0;
    let mut x = 0.999_999_999_999_809_9;
    for (i, &pi) in p.iter().enumerate() {
        x += pi / (z + i as f64 + 1.0);
    }

    let t = z + p.len() as f64 - 0.5;
    (2.0 * std::f64::consts::PI).sqrt() * t.powf(z + 0.5) * (-t).exp() * x
}

/// Detect whether fixed-effects or random-effects is more appropriate.
///
/// Returns recommendation and a brief justification.
pub fn recommend_model(result: &MetaAnalysisResult) -> (&'static str, String) {
    if result.i_squared > 50.0 {
        (
            "random",
            format!(
                "I² = {:.1}% indicates substantial heterogeneity. Random-effects model is appropriate.",
                result.i_squared
            ),
        )
    } else if result.i_squared > 25.0 {
        (
            "random",
            format!(
                "I² = {:.1}% indicates moderate heterogeneity. Random-effects model is preferred.",
                result.i_squared
            ),
        )
    } else {
        (
            "fixed",
            format!(
                "I² = {:.1}% indicates low heterogeneity. Fixed-effects model is sufficient.",
                result.i_squared
            ),
        )
    }
}

/// Print meta-analysis summary.
pub fn print_summary(result: &MetaAnalysisResult) {
    eprintln!();
    eprintln!("  ╔════════════════════════════════════════════════════════════╗");
    eprintln!(
        "  ║  Meta-Analysis of Correlations ({})                     ║",
        result.model.to_uppercase()
    );
    eprintln!("  ╚════════════════════════════════════════════════════════════╝");
    eprintln!();
    eprintln!(
        "  Groups: {} | Total N: {}",
        result.n_groups, result.total_n
    );
    eprintln!();
    eprintln!("  Pooled correlation: r = {:.4}", result.pooled_r);
    eprintln!("  95% CI: [{:.4}, {:.4}]", result.ci_lower, result.ci_upper);
    eprintln!();
    eprintln!("  Heterogeneity:");
    eprintln!(
        "    Q = {:.3} (df = {}, p = {:.4})",
        result.q_statistic, result.q_df, result.q_pvalue
    );
    eprintln!("    I² = {:.1}%", result.i_squared);
    eprintln!("    τ² = {:.4}", result.tau_squared);
    eprintln!("    τ  = {:.4}", result.tau);
    eprintln!();

    if result.model == "random" {
        eprintln!(
            "  95% Prediction interval: [{:.4}, {:.4}]",
            result.pred_interval_lower, result.pred_interval_upper
        );
        eprintln!();
    }

    eprintln!("  Group contributions:");
    for g in &result.group_results {
        eprintln!(
            "    {:12}  r={:+.4}  z={:+.4}  w={:8.3}  {:5.1}%",
            g.group_id,
            g.r,
            g.z,
            if result.model == "random" {
                g.weight_random
            } else {
                g.weight_fixed
            },
            g.influence_percent
        );
    }

    let (rec, reason) = recommend_model(result);
    eprintln!();
    eprintln!("  ▸ Recommendation: {}-effects model", rec);
    eprintln!("  ▸ {}", reason);
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_fixed_effects_homogeneous() {
        // All groups have similar correlations
        let groups = vec![
            GroupCorrelation {
                group_id: "A".to_string(),
                n: 50,
                r: 0.60,
            },
            GroupCorrelation {
                group_id: "B".to_string(),
                n: 50,
                r: 0.62,
            },
            GroupCorrelation {
                group_id: "C".to_string(),
                n: 50,
                r: 0.58,
            },
        ];

        let result = fixed_effects_meta(&groups);
        assert!(result.pooled_r > 0.55 && result.pooled_r < 0.65);
        assert!(
            result.i_squared < 10.0,
            "Homogeneous data should have low I²"
        );
    }

    #[test]
    fn test_random_effects_heterogeneous() {
        // Groups have very different correlations
        let groups = vec![
            GroupCorrelation {
                group_id: "A".to_string(),
                n: 50,
                r: 0.80,
            },
            GroupCorrelation {
                group_id: "B".to_string(),
                n: 50,
                r: 0.20,
            },
            GroupCorrelation {
                group_id: "C".to_string(),
                n: 50,
                r: -0.30,
            },
        ];

        let fixed = fixed_effects_meta(&groups);
        let random = random_effects_meta(&groups);

        assert!(fixed.i_squared > 90.0, "Should detect high heterogeneity");
        assert!(
            random.tau_squared > 0.1,
            "Should estimate substantial between-study variance"
        );
        assert!(random.pred_interval_upper > random.ci_upper);
        assert!(random.pred_interval_lower < random.ci_lower);
    }

    #[test]
    fn test_fisher_z_backtransform_consistency() {
        let groups = vec![GroupCorrelation {
            group_id: "X".to_string(),
            n: 100,
            r: 0.5,
        }];

        let result = fixed_effects_meta(&groups);
        let expected_z = stats::fisher_z(0.5);
        assert_relative_eq!(result.pooled_z, expected_z, epsilon = 1e-6);
        assert_relative_eq!(result.pooled_r, 0.5, epsilon = 1e-4);
    }

    #[test]
    fn test_empty_groups() {
        let result = random_effects_meta(&[]);
        assert!(result.pooled_r.is_nan());
    }

    #[test]
    fn test_normal_cdf_properties() {
        assert_relative_eq!(normal_cdf(0.0), 0.5, epsilon = 1e-4);
        assert_relative_eq!(normal_cdf(1.96), 0.975, epsilon = 1e-2);
        assert_relative_eq!(normal_cdf(-1.96), 0.025, epsilon = 1e-2);
    }

    #[test]
    fn test_chi_square_pvalue_extreme() {
        // Large Q with small df → small p-value
        let p = chi_square_pvalue(20.0, 2);
        assert!(p < 0.01, "p should be small for extreme Q, got {}", p);
    }
}
