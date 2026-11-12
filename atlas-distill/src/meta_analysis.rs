//! Fixed- and random-effects meta-analysis of correlation coefficients across
//! independent groups.
//!
//! Each group's correlation r_i (sample size n_i) is Fisher z-transformed,
//! z_i = atanh(r_i), with sampling variance v_i = 1/(n_i − 3) and weight
//! w_i = 1/v_i. Pooled values and interval ends are back-transformed with tanh.
//!
//! - Fixed effect: μ̂_FE = Σ w_i z_i / Σ w_i, SE = (Σ w_i)^−½.
//! - Heterogeneity, reported identically by both models (as metafor's QE):
//!   Cochran's Q = Σ w_i (z_i − μ̂_FE)², with fixed-effect weights around the
//!   fixed-effect mean; df = k − 1; p = P(χ²_df ≥ Q); I² = max(0, (Q − df)/Q),
//!   reported in percent.
//! - Random effects (DerSimonian–Laird): τ² = max(0, (Q − df) / (Σw − Σw²/Σw)),
//!   w*_i = 1/(v_i + τ²), μ̂_RE = Σ w*_i z_i / Σ w*_i, SE = (Σ w*_i)^−½.
//! - 95% confidence interval: μ̂ ± z_0.975 · SE.
//! - 95% prediction interval for the effect in a new group (random effects;
//!   Higgins, Thompson & Spiegelhalter 2009): μ̂_RE ± t_{k−2, 0.975} ·
//!   sqrt(τ² + SE²). It is undefined when k < 3 and is then NaN (serialized
//!   as JSON `null`). The fixed-effect model has no between-group variance, so
//!   its prediction interval equals its confidence interval.
//!
//! Scope: this pools correlations, not error magnitudes such as MAE, and it
//! assumes the groups are independent. Rows that share materials or models
//! (for example C11, C12 and C44 of the same metal) are not independent, and
//! intervals built on such rows are anti-conservative. Groups need n ≥ 4
//! ([`MIN_GROUP_N`]): with n ≤ 3 the sampling variance 1/(n − 3) is undefined,
//! so both estimators leave such groups out entirely. They do not count toward
//! k, df, I², the prediction interval, `n_groups` or `total_n`.
//!
//! The unit tests compare every reported statistic, to 1e-6, with an
//! independent numpy/scipy implementation in
//! `tests/reference/meta_reference.py` (committed output:
//! `tests/reference/meta_reference.json`).
//!
//! References:
//! - Hedges & Olkin, Statistical Methods for Meta-Analysis (1985)
//! - DerSimonian & Laird, Controlled Clinical Trials 7, 177–188 (1986)
//! - Borenstein et al., Introduction to Meta-Analysis (2009)
//! - Higgins, Thompson & Spiegelhalter, J. R. Stat. Soc. A 172, 137–159 (2009)

use crate::stats;
use serde::{Deserialize, Serialize};

/// Two-sided 95% critical value of the standard normal distribution, Φ⁻¹(0.975).
pub const Z_975: f64 = 1.959_963_984_540_054;

/// Smallest group size with a finite Fisher-z sampling variance, 1/(n − 3).
pub const MIN_GROUP_N: usize = 4;

/// A single group's correlation data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupCorrelation {
    pub group_id: String,
    pub n: usize,
    pub r: f64,
}

/// Meta-analysis result for correlations (fixed or random effects).
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
    /// Cochran's Q (fixed-effect weights around the fixed-effect mean; the
    /// same value in both models)
    pub q_statistic: f64,
    /// Degrees of freedom for Q (k − 1)
    pub q_df: usize,
    /// p-value for Q, P(χ²_df ≥ Q); NaN when df = 0
    pub q_pvalue: f64,
    /// I² in percent, max(0, (Q − df)/Q) × 100 (the same value in both models)
    pub i_squared: f64,
    /// τ²: between-group variance in z-space (DerSimonian–Laird; 0 for fixed)
    pub tau_squared: f64,
    /// τ: standard deviation of true effects in z-space
    pub tau: f64,
    /// Individual group results with weights
    pub group_results: Vec<GroupMetaResult>,
    /// 95% prediction interval for the true effect in a new group. Random
    /// effects: t with k − 2 df, NaN when k < 3. Fixed effects: equals the CI.
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

/// Cochran's Q and the statistics derived from it.
#[derive(Debug, Clone, Copy)]
struct Heterogeneity {
    q: f64,
    df: usize,
    p: f64,
    i_squared: f64,
}

/// Groups with n ≥ [`MIN_GROUP_N`]. Smaller groups would get zero weight but
/// still inflate k, df, I² and the prediction interval, so they are dropped.
fn usable_groups(groups: &[GroupCorrelation]) -> Vec<GroupCorrelation> {
    groups
        .iter()
        .filter(|g| g.n >= MIN_GROUP_N)
        .cloned()
        .collect()
}

/// Fixed-effects meta-analysis of correlations.
///
/// Assumes all groups estimate the same underlying true effect. Groups with
/// n < [`MIN_GROUP_N`] are left out (see the module docs).
pub fn fixed_effects_meta(groups: &[GroupCorrelation]) -> MetaAnalysisResult {
    let groups = &usable_groups(groups);
    if groups.is_empty() {
        return empty_result();
    }

    let group_results = per_group(groups, 0.0);
    let het = heterogeneity(&group_results);
    let (pooled_z, se_z) = pooled(&group_results, |g| g.weight_fixed);

    let mut result = compute_final_result(groups, group_results, pooled_z, se_z, 0.0, het, "fixed");

    // No between-group variance in this model: prediction interval = CI.
    result.pred_interval_lower = result.ci_lower;
    result.pred_interval_upper = result.ci_upper;

    result
}

/// Random-effects meta-analysis of correlations (DerSimonian–Laird).
///
/// Allows the true effect to vary across groups. Q, its p-value and I² are
/// computed with fixed-effect weights around the fixed-effect mean, exactly as
/// in [`fixed_effects_meta`]; only τ², the pooled estimate, its CI and the
/// prediction interval differ between the two models. Groups with
/// n < [`MIN_GROUP_N`] are left out (see the module docs).
pub fn random_effects_meta(groups: &[GroupCorrelation]) -> MetaAnalysisResult {
    let groups = &usable_groups(groups);
    if groups.is_empty() {
        return empty_result();
    }

    // Heterogeneity and τ² come from the fixed-effect fit.
    let fixed_groups = per_group(groups, 0.0);
    let het = heterogeneity(&fixed_groups);
    let tau_sq = dersimonian_laird_tau_sq(&fixed_groups, het);

    // Random-effects weights w*_i = 1 / (v_i + τ²).
    let group_results = per_group(groups, tau_sq);
    let (pooled_z, se_z) = pooled(&group_results, |g| g.weight_random);

    let mut result =
        compute_final_result(groups, group_results, pooled_z, se_z, tau_sq, het, "random");

    // Prediction interval (Higgins, Thompson & Spiegelhalter 2009).
    let k = groups.len();
    if k >= 3 {
        let half_width = t_quantile(0.975, (k - 2) as f64) * (tau_sq + se_z * se_z).sqrt();
        result.pred_interval_lower = stats::fisher_z_inverse(pooled_z - half_width);
        result.pred_interval_upper = stats::fisher_z_inverse(pooled_z + half_width);
    }

    result
}

/// Fisher z, standard error and weights for each group. `tau_sq` = 0 gives
/// fixed-effect weights in both weight fields.
fn per_group(groups: &[GroupCorrelation], tau_sq: f64) -> Vec<GroupMetaResult> {
    groups
        .iter()
        .map(|g| {
            let v = stats::fisher_z_variance(g.n);
            GroupMetaResult {
                group_id: g.group_id.clone(),
                n: g.n,
                r: g.r,
                z: stats::fisher_z(g.r),
                se_z: v.sqrt(),
                weight_fixed: 1.0 / v,
                weight_random: 1.0 / (v + tau_sq),
                influence_percent: 0.0,
            }
        })
        .collect()
}

/// Inverse-variance pooled z and its standard error under the given weights.
fn pooled(
    group_results: &[GroupMetaResult],
    weight: impl Fn(&GroupMetaResult) -> f64,
) -> (f64, f64) {
    let sum_w: f64 = group_results.iter().map(&weight).sum();
    let sum_wz: f64 = group_results.iter().map(|g| weight(g) * g.z).sum();
    (sum_wz / sum_w, (1.0 / sum_w).sqrt())
}

/// Cochran's Q with fixed-effect weights around the fixed-effect mean, its
/// chi-square p-value and I².
fn heterogeneity(group_results: &[GroupMetaResult]) -> Heterogeneity {
    let df = group_results.len().saturating_sub(1);
    let (mu_fe, _) = pooled(group_results, |g| g.weight_fixed);
    let q: f64 = group_results
        .iter()
        .map(|g| g.weight_fixed * (g.z - mu_fe).powi(2))
        .sum();
    let i_squared = if df > 0 && q > 0.0 {
        ((q - df as f64) / q).max(0.0) * 100.0
    } else {
        0.0
    };
    Heterogeneity {
        q,
        df,
        p: chi_square_pvalue(q, df),
        i_squared,
    }
}

/// DerSimonian–Laird τ² = max(0, (Q − df) / (Σw − Σw²/Σw)), fixed-effect w.
fn dersimonian_laird_tau_sq(fixed_groups: &[GroupMetaResult], het: Heterogeneity) -> f64 {
    if het.df == 0 {
        return 0.0;
    }
    let sum_w: f64 = fixed_groups.iter().map(|g| g.weight_fixed).sum();
    let sum_w2: f64 = fixed_groups.iter().map(|g| g.weight_fixed.powi(2)).sum();
    let c = sum_w - sum_w2 / sum_w;
    if c > 0.0 {
        ((het.q - het.df as f64) / c).max(0.0)
    } else {
        0.0
    }
}

fn compute_final_result(
    groups: &[GroupCorrelation],
    mut group_results: Vec<GroupMetaResult>,
    pooled_z: f64,
    se_z: f64,
    tau_sq: f64,
    het: Heterogeneity,
    model: &str,
) -> MetaAnalysisResult {
    let total_n = groups.iter().map(|g| g.n).sum();
    let n_groups = groups.len();

    // Back-transform pooled r and the 95% CI.
    let pooled_r = stats::fisher_z_inverse(pooled_z);
    let ci_lower = stats::fisher_z_inverse(pooled_z - Z_975 * se_z);
    let ci_upper = stats::fisher_z_inverse(pooled_z + Z_975 * se_z);

    // Influence percentages under the model's own weights.
    let weight = |g: &GroupMetaResult| {
        if model == "random" {
            g.weight_random
        } else {
            g.weight_fixed
        }
    };
    let sum_w: f64 = group_results.iter().map(weight).sum();
    for g in &mut group_results {
        g.influence_percent = if sum_w > 0.0 {
            (weight(g) / sum_w) * 100.0
        } else {
            0.0
        };
    }

    MetaAnalysisResult {
        n_groups,
        total_n,
        pooled_r,
        ci_lower,
        ci_upper,
        pooled_z,
        se_z,
        q_statistic: het.q,
        q_df: het.df,
        q_pvalue: het.p,
        i_squared: het.i_squared,
        tau_squared: tau_sq,
        tau: tau_sq.sqrt(),
        group_results,
        // Set by the caller (model-specific).
        pred_interval_lower: f64::NAN,
        pred_interval_upper: f64::NAN,
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

// ---------------------------------------------------------------------------
// Distribution functions. The crate has no statistics dependency, so these
// are implemented here and tested against scipy (see the module docs).
// ---------------------------------------------------------------------------

/// Upper-tail chi-square probability P(χ²_df ≥ x). NaN for df = 0 or x < 0.
fn chi_square_pvalue(x: f64, df: usize) -> f64 {
    if df == 0 || x.is_nan() || x < 0.0 {
        return f64::NAN;
    }
    if x.is_infinite() {
        return 0.0;
    }
    gamma_q(df as f64 / 2.0, x / 2.0)
}

/// Quantile of Student's t distribution: the t with P(T_df ≤ t) = p.
///
/// Defined for 0 < p < 1 and finite df > 0; returns NaN otherwise. df = 1 and
/// df = 2 use closed forms. Other df use a Newton iteration on the upper tail
/// (regularized incomplete beta function), safeguarded by bisection; the
/// result agrees with `scipy.stats.t.ppf` to better than 1e-6 on the tested
/// grid (df 1–1000, p 0.025–0.9995).
pub fn t_quantile(p: f64, df: f64) -> f64 {
    if !(p > 0.0 && p < 1.0) || !(df > 0.0 && df.is_finite()) {
        return f64::NAN;
    }
    if p == 0.5 {
        return 0.0;
    }
    if p < 0.5 {
        -t_upper_quantile(p, df)
    } else {
        t_upper_quantile(1.0 - p, df)
    }
}

/// The t > 0 with P(T_df > t) = q, for 0 < q < 0.5.
fn t_upper_quantile(q: f64, df: f64) -> f64 {
    if df == 1.0 {
        // Cauchy: P(T > t) = 1/2 − atan(t)/π.
        return 1.0 / (std::f64::consts::PI * q).tan();
    }
    if df == 2.0 {
        // P(T > t) = (1 − t/sqrt(2 + t²)) / 2.
        return (1.0 - 2.0 * q) / (2.0 * q * (1.0 - q)).sqrt();
    }

    // Bracket the root: the upper tail falls from 0.5 at t = 0 towards 0.
    let mut lo = 0.0_f64;
    let mut hi = 1.0_f64;
    while t_upper_tail(hi, df) > q {
        lo = hi;
        hi *= 2.0;
        if !hi.is_finite() {
            return f64::INFINITY;
        }
    }

    let mut t = 0.5 * (lo + hi);
    for _ in 0..200 {
        let f = t_upper_tail(t, df) - q;
        if f == 0.0 {
            return t;
        }
        if f > 0.0 {
            lo = t;
        } else {
            hi = t;
        }
        // The tail decreases with slope −pdf(t).
        let newton = t + f / t_pdf(t, df);
        let next = if newton > lo && newton < hi {
            newton
        } else {
            0.5 * (lo + hi)
        };
        if (next - t).abs() <= 4.0 * f64::EPSILON * next.abs() || hi - lo <= 4.0 * f64::EPSILON * hi
        {
            return next;
        }
        t = next;
    }
    t
}

/// Upper-tail probability P(T_df > t) of Student's t, for t ≥ 0.
fn t_upper_tail(t: f64, df: f64) -> f64 {
    let t2 = t * t;
    let denom = df + t2;
    0.5 * beta_inc(df / 2.0, 0.5, df / denom, t2 / denom)
}

/// Density of Student's t distribution.
fn t_pdf(t: f64, df: f64) -> f64 {
    (ln_gamma((df + 1.0) / 2.0)
        - ln_gamma(df / 2.0)
        - 0.5 * (df * std::f64::consts::PI).ln()
        - (df + 1.0) / 2.0 * (t * t / df).ln_1p())
    .exp()
}

/// Lanczos approximation (g = 7, 9 terms) for ln Γ(x), x > 0.
const LANCZOS_G: f64 = 7.0;
const LANCZOS_COEF: [f64; 9] = [
    0.999_999_999_999_809_9,
    676.520_368_121_885_1,
    -1_259.139_216_722_402_8,
    771.323_428_777_653_1,
    -176.615_029_162_140_6,
    12.507_343_278_686_905,
    -0.138_571_095_265_720_12,
    9.984_369_578_019_572e-6,
    1.505_632_735_149_311_6e-7,
];

/// ln Γ(x) for x > 0 (relative error about 1e-15).
fn ln_gamma(x: f64) -> f64 {
    use std::f64::consts::PI;
    if x < 0.5 {
        // Reflection: Γ(x) Γ(1 − x) = π / sin(πx).
        return (PI / (PI * x).sin()).ln() - ln_gamma(1.0 - x);
    }
    let x = x - 1.0;
    let t = x + LANCZOS_G + 0.5;
    let mut a = LANCZOS_COEF[0];
    for (i, &c) in LANCZOS_COEF.iter().enumerate().skip(1) {
        a += c / (x + i as f64);
    }
    0.5 * (2.0 * PI).ln() + (x + 0.5) * t.ln() - t + a.ln()
}

/// Regularized upper incomplete gamma function Q(a, x) = Γ(a, x)/Γ(a).
fn gamma_q(a: f64, x: f64) -> f64 {
    if x <= 0.0 {
        return 1.0;
    }
    if x < a + 1.0 {
        1.0 - gamma_p_series(a, x)
    } else {
        gamma_q_continued_fraction(a, x)
    }
}

/// P(a, x) by its power series (converges quickly for x < a + 1).
fn gamma_p_series(a: f64, x: f64) -> f64 {
    let mut ap = a;
    let mut term = 1.0 / a;
    let mut sum = term;
    for _ in 0..10_000 {
        ap += 1.0;
        term *= x / ap;
        sum += term;
        if term.abs() < sum.abs() * f64::EPSILON {
            break;
        }
    }
    sum * (-x + a * x.ln() - ln_gamma(a)).exp()
}

/// Q(a, x) by its continued fraction (modified Lentz; for x ≥ a + 1).
fn gamma_q_continued_fraction(a: f64, x: f64) -> f64 {
    const TINY: f64 = 1e-300;
    let mut b = x + 1.0 - a;
    let mut c = 1.0 / TINY;
    let mut d = 1.0 / b;
    let mut h = d;
    for i in 1..10_000 {
        let an = -(i as f64) * (i as f64 - a);
        b += 2.0;
        d = an * d + b;
        if d.abs() < TINY {
            d = TINY;
        }
        c = b + an / c;
        if c.abs() < TINY {
            c = TINY;
        }
        d = 1.0 / d;
        let delta = d * c;
        h *= delta;
        if (delta - 1.0).abs() < f64::EPSILON {
            break;
        }
    }
    (-x + a * x.ln() - ln_gamma(a)).exp() * h
}

/// Regularized incomplete beta function I_x(a, b). `y` must equal 1 − x; it
/// is passed separately so callers can supply it without cancellation.
fn beta_inc(a: f64, b: f64, x: f64, y: f64) -> f64 {
    if x <= 0.0 {
        return 0.0;
    }
    if y <= 0.0 {
        return 1.0;
    }
    let front = (ln_gamma(a + b) - ln_gamma(a) - ln_gamma(b) + a * x.ln() + b * y.ln()).exp();
    if x < (a + 1.0) / (a + b + 2.0) {
        front * beta_continued_fraction(a, b, x) / a
    } else {
        1.0 - front * beta_continued_fraction(b, a, y) / b
    }
}

/// Continued fraction for I_x(a, b) (modified Lentz).
fn beta_continued_fraction(a: f64, b: f64, x: f64) -> f64 {
    const TINY: f64 = 1e-300;
    let qab = a + b;
    let qap = a + 1.0;
    let qam = a - 1.0;
    let mut c = 1.0;
    let mut d = 1.0 - qab * x / qap;
    if d.abs() < TINY {
        d = TINY;
    }
    d = 1.0 / d;
    let mut h = d;
    for m in 1..10_000 {
        let m = m as f64;
        let m2 = 2.0 * m;
        // Even step.
        let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1.0 + aa * d;
        if d.abs() < TINY {
            d = TINY;
        }
        c = 1.0 + aa / c;
        if c.abs() < TINY {
            c = TINY;
        }
        d = 1.0 / d;
        h *= d * c;
        // Odd step.
        let aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        d = 1.0 + aa * d;
        if d.abs() < TINY {
            d = TINY;
        }
        c = 1.0 + aa / c;
        if c.abs() < TINY {
            c = TINY;
        }
        d = 1.0 / d;
        let delta = d * c;
        h *= delta;
        if (delta - 1.0).abs() < f64::EPSILON {
            break;
        }
    }
    h
}

/// Standard normal CDF, Φ(x) = 1 − Q(½, x²/2)/2 for x ≥ 0 (by symmetry below 0).
#[cfg(test)]
fn normal_cdf(x: f64) -> f64 {
    let tail = 0.5 * gamma_q(0.5, 0.5 * x * x);
    if x >= 0.0 {
        1.0 - tail
    } else {
        tail
    }
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

fn format_pvalue(p: f64) -> String {
    if p.is_nan() {
        "n/a".to_string()
    } else if p < 1e-4 {
        format!("{:.2e}", p)
    } else {
        format!("{:.4}", p)
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
    eprintln!("  Heterogeneity (fixed-effect weights, both models):");
    eprintln!(
        "    Q = {:.3} (df = {}, p = {})",
        result.q_statistic,
        result.q_df,
        format_pvalue(result.q_pvalue)
    );
    eprintln!("    I² = {:.1}%", result.i_squared);
    eprintln!("    τ² = {:.4}", result.tau_squared);
    eprintln!("    τ  = {:.4}", result.tau);
    eprintln!();

    if result.model == "random" {
        if result.pred_interval_lower.is_nan() {
            eprintln!("  95% Prediction interval: undefined for fewer than 3 groups");
        } else {
            eprintln!(
                "  95% Prediction interval (t, k − 2 df): [{:.4}, {:.4}]",
                result.pred_interval_lower, result.pred_interval_upper
            );
        }
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
    use super::reference_data::{RefCase, CASES, CHI2_SF, T_QUANTILES, Z_975_REF};
    use super::*;
    use approx::assert_relative_eq;

    /// Tolerance for agreement with the independent reference implementation.
    const TOL: f64 = 1e-6;

    fn groups_of(case: &RefCase) -> Vec<GroupCorrelation> {
        case.n
            .iter()
            .zip(case.r)
            .enumerate()
            .map(|(i, (&n, &r))| GroupCorrelation {
                group_id: format!("G{}", i + 1),
                n,
                r,
            })
            .collect()
    }

    fn check(case: &str, what: &str, actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() <= TOL,
            "{case}: {what} = {actual:e}, reference {expected:e} (|diff| {:e} > {TOL:e})",
            (actual - expected).abs()
        );
    }

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

    #[test]
    fn test_groups_below_min_n_are_left_out() {
        // n = 3 has no finite sampling variance. It must not count toward
        // k, df, I² or the t_{k-2} prediction interval.
        let g = |id: &str, n: usize, r: f64| GroupCorrelation {
            group_id: id.to_string(),
            n,
            r,
        };
        let with_small = vec![g("A", 3, 0.5), g("B", 40, 0.6), g("C", 50, 0.7)];
        let without = vec![g("B", 40, 0.6), g("C", 50, 0.7)];
        for (a, b) in [
            (
                fixed_effects_meta(&with_small),
                fixed_effects_meta(&without),
            ),
            (
                random_effects_meta(&with_small),
                random_effects_meta(&without),
            ),
        ] {
            assert_eq!(a.n_groups, 2);
            assert_eq!(a.total_n, 90);
            assert_eq!(a.q_df, 1);
            assert_eq!(a.group_results.len(), 2);
            assert_eq!(a.pooled_z, b.pooled_z);
            assert_eq!(a.q_statistic, b.q_statistic);
            assert_eq!(a.i_squared, b.i_squared);
            assert_eq!(a.tau_squared, b.tau_squared);
        }
        // k = 2 usable groups: the random-effects prediction interval is undefined.
        let random = random_effects_meta(&with_small);
        assert!(random.pred_interval_lower.is_nan() && random.pred_interval_upper.is_nan());
        // Only groups below the minimum: nothing to pool.
        assert_eq!(fixed_effects_meta(&[g("A", 3, 0.5)]).n_groups, 0);
    }

    #[test]
    fn reference_cases_match_independent_implementation() {
        for case in CASES {
            let name = case.name;
            let groups = groups_of(case);
            let fixed = fixed_effects_meta(&groups);
            let random = random_effects_meta(&groups);

            for (model, res) in [("fixed", &fixed), ("random", &random)] {
                let tag = format!("{name}/{model}");
                check(&tag, "Q", res.q_statistic, case.q);
                assert_eq!(res.q_df, case.df, "{tag}: df");
                match case.p {
                    Some(p) => {
                        check(&tag, "p", res.q_pvalue, p);
                        assert!(
                            (res.q_pvalue - p).abs() <= TOL * p,
                            "{tag}: p = {:e}, reference {p:e} (relative)",
                            res.q_pvalue
                        );
                    }
                    None => assert!(res.q_pvalue.is_nan(), "{tag}: p should be NaN"),
                }
                check(&tag, "I²", res.i_squared, case.i2);
            }

            check(name, "fixed pooled z", fixed.pooled_z, case.fe_z);
            check(name, "fixed pooled r", fixed.pooled_r, case.fe_r);
            check(name, "fixed CI lower", fixed.ci_lower, case.fe_ci[0]);
            check(name, "fixed CI upper", fixed.ci_upper, case.fe_ci[1]);

            check(name, "τ²", random.tau_squared, case.tau2);
            check(name, "random pooled z", random.pooled_z, case.re_z);
            check(name, "random SE", random.se_z, case.re_se);
            check(name, "random pooled r", random.pooled_r, case.re_r);
            check(name, "random CI lower", random.ci_lower, case.re_ci[0]);
            check(name, "random CI upper", random.ci_upper, case.re_ci[1]);
            match case.re_pi {
                Some([lo, hi]) => {
                    check(name, "PI lower", random.pred_interval_lower, lo);
                    check(name, "PI upper", random.pred_interval_upper, hi);
                }
                None => assert!(
                    random.pred_interval_lower.is_nan() && random.pred_interval_upper.is_nan(),
                    "{name}: PI should be undefined"
                ),
            }
        }
    }

    #[test]
    fn reference_cases_cover_required_regimes() {
        let find = |name: &str| CASES.iter().find(|c| c.name == name).unwrap();

        let homogeneous = find("homogeneous_k5");
        assert!(homogeneous.q < homogeneous.df as f64);
        assert_eq!(homogeneous.tau2, 0.0);
        let res = random_effects_meta(&groups_of(homogeneous));
        assert_eq!(res.tau_squared, 0.0);
        assert_eq!(res.i_squared, 0.0);
        // τ² = 0 still gives a t-based PI, wider than the normal-based CI.
        assert!(res.pred_interval_lower < res.ci_lower && res.pred_interval_upper > res.ci_upper);

        assert!(find("heterogeneous_k6").tau2 > 0.0);
        assert_eq!(find("heterogeneous_k3").n.len(), 3);
        assert!(find("heterogeneous_k3").re_pi.is_some());
        assert!(find("k2_no_prediction_interval").re_pi.is_none());
    }

    #[test]
    fn random_effects_q_is_around_fixed_effect_mean() {
        // Unequal n, so the random-effects mean differs from the fixed-effect mean.
        let case = CASES.iter().find(|c| c.name == "heterogeneous_k6").unwrap();
        let groups = groups_of(case);
        let fixed = fixed_effects_meta(&groups);
        let random = random_effects_meta(&groups);
        assert!((random.pooled_z - fixed.pooled_z).abs() > 1e-3);

        assert_eq!(random.q_statistic, fixed.q_statistic);
        assert_eq!(random.q_pvalue, fixed.q_pvalue);
        assert_eq!(random.i_squared, fixed.i_squared);

        // The value the engine used to report: Q around the random-effects mean.
        // The fixed-effect mean minimises this sum, so it is strictly larger.
        let q_around_re: f64 = random
            .group_results
            .iter()
            .map(|g| g.weight_fixed * (g.z - random.pooled_z).powi(2))
            .sum();
        assert!(q_around_re > random.q_statistic);
    }

    #[test]
    fn prediction_interval_undefined_below_three_groups() {
        let two = vec![
            GroupCorrelation {
                group_id: "A".to_string(),
                n: 40,
                r: 0.3,
            },
            GroupCorrelation {
                group_id: "B".to_string(),
                n: 40,
                r: 0.6,
            },
        ];
        let res = random_effects_meta(&two);
        assert!(res.pooled_r.is_finite());
        assert!(res.pred_interval_lower.is_nan() && res.pred_interval_upper.is_nan());

        let one = random_effects_meta(&two[..1]);
        assert_eq!(one.q_df, 0);
        assert!(one.q_pvalue.is_nan());
        assert_eq!(one.i_squared, 0.0);
        assert_eq!(one.tau_squared, 0.0);
        assert!(one.pred_interval_lower.is_nan());

        // Serialized as JSON null, not as an invalid number.
        let json = serde_json::to_value(&res).unwrap();
        assert!(json["pred_interval_lower"].is_null());
    }

    #[test]
    fn t_quantile_matches_scipy() {
        for &(p, df, expected) in T_QUANTILES {
            let t = t_quantile(p, df);
            assert!(
                (t - expected).abs() <= TOL,
                "t_quantile({p}, {df}) = {t}, scipy {expected} (|diff| {:e})",
                (t - expected).abs()
            );
        }
    }

    #[test]
    fn t_quantile_domain_and_symmetry() {
        assert_eq!(t_quantile(0.5, 7.0), 0.0);
        for df in [1.0, 2.0, 3.5, 13.0] {
            assert_relative_eq!(t_quantile(0.1, df), -t_quantile(0.9, df), epsilon = 1e-12);
        }
        assert!(t_quantile(0.0, 5.0).is_nan());
        assert!(t_quantile(1.0, 5.0).is_nan());
        assert!(t_quantile(0.975, 0.0).is_nan());
        assert!(t_quantile(0.975, f64::INFINITY).is_nan());
        // Large df approaches the normal quantile.
        assert!((t_quantile(0.975, 1e6) - Z_975).abs() < 1e-5);
    }

    #[test]
    fn chi_square_pvalue_matches_scipy() {
        for &(x, df, expected) in CHI2_SF {
            let p = chi_square_pvalue(x, df);
            assert!(
                (p - expected).abs() <= 1e-12_f64.max(1e-9 * expected),
                "chi_square_pvalue({x}, {df}) = {p:e}, scipy {expected:e}"
            );
        }
        assert_eq!(chi_square_pvalue(0.0, 3), 1.0);
        assert!(chi_square_pvalue(1.0, 0).is_nan());
        assert!(chi_square_pvalue(-1.0, 2).is_nan());
    }

    #[test]
    fn normal_critical_value_matches_reference() {
        assert_eq!(Z_975, Z_975_REF);
        assert!((normal_cdf(Z_975) - 0.975).abs() < 1e-12);
    }

    #[test]
    fn ln_gamma_known_values() {
        assert_relative_eq!(ln_gamma(1.0), 0.0, epsilon = 1e-14);
        assert_relative_eq!(
            ln_gamma(0.5),
            std::f64::consts::PI.sqrt().ln(),
            epsilon = 1e-14
        );
        assert_relative_eq!(ln_gamma(10.0), 362_880.0_f64.ln(), epsilon = 1e-12);
        assert_relative_eq!(ln_gamma(0.1), 2.252_712_651_734_205_5, epsilon = 1e-12);
    }
}

/// Reference values from the independent numpy/scipy implementation in
/// `tests/reference/meta_reference.py` (committed output:
/// `tests/reference/meta_reference.json`). Regenerate the block below with
/// `python tests/reference/meta_reference.py --emit-rust`; check it with
/// `--check`.
#[cfg(test)]
#[rustfmt::skip]
mod reference_data {
    pub(super) struct RefCase {
        pub(super) name: &'static str,
        pub(super) n: &'static [usize],
        pub(super) r: &'static [f64],
        pub(super) q: f64,
        pub(super) df: usize,
        pub(super) p: Option<f64>,
        pub(super) i2: f64,
        pub(super) tau2: f64,
        pub(super) fe_z: f64,
        pub(super) fe_r: f64,
        pub(super) fe_ci: [f64; 2],
        pub(super) re_z: f64,
        pub(super) re_se: f64,
        pub(super) re_r: f64,
        pub(super) re_ci: [f64; 2],
        pub(super) re_pi: Option<[f64; 2]>,
    }

    // BEGIN GENERATED REFERENCE DATA (tests/reference/meta_reference.py --emit-rust)
    pub(super) const Z_975_REF: f64 = 1.959963984540054;

    pub(super) const CASES: &[RefCase] = &[
        RefCase {
            name: "homogeneous_k5",
            n: &[40, 55, 62, 75, 90],
            r: &[0.52, 0.47, 0.55, 0.5, 0.49],
            q: 0.39231729890433,
            df: 4,
            p: Some(0.9831010636478367),
            i2: 0.0,
            tau2: 0.0,
            fe_z: 0.5554397967941912,
            fe_r: 0.5045861170088151,
            fe_ci: [0.4166064593341506, 0.5832015823078793],
            re_z: 0.5554397967941912,
            re_se: 0.05707301455353496,
            re_r: 0.5045861170088151,
            re_ci: [0.4166064593341506, 0.5832015823078793],
            re_pi: Some([0.3573180249896273, 0.6273726313823965]),
        },
        RefCase {
            name: "heterogeneous_k6",
            n: &[25, 40, 60, 80, 120, 200],
            r: &[0.85, 0.3, 0.62, -0.1, 0.45, 0.7],
            q: 66.85095116257084,
            df: 5,
            p: Some(4.62722112695985e-13),
            i2: 92.52067485496084,
            tau2: 0.16204233277916194,
            fe_z: 0.5922193136037733,
            fe_r: 0.5314898840024151,
            fe_ci: [0.4661766970078989, 0.591040950776707],
            re_z: 0.5772614805986861,
            re_se: 0.17345875485435155,
            re_r: 0.5206721686602827,
            re_ci: [0.23293305899607217, 0.7245864524902702],
            re_pi: Some([-0.5647146398446392, 0.9462074486915564]),
        },
        RefCase {
            name: "heterogeneous_k3",
            n: &[30, 48, 41],
            r: &[0.21, 0.58, 0.74],
            q: 8.589738315672832,
            df: 2,
            p: Some(0.01363835605255825),
            i2: 76.71640361440579,
            tau2: 0.09173262651531404,
            fe_z: 0.6516787695604552,
            fe_r: 0.5727990181427374,
            fe_ci: [0.43399112424885516, 0.685042407202633],
            re_z: 0.6205117419070788,
            re_se: 0.19995077727057925,
            re_r: 0.5514842323885893,
            re_ci: [0.2247140981572179, 0.7667561789209459],
            re_pi: Some([-0.9993169298993597, 0.9999428966054374]),
        },
        RefCase {
            name: "k2_no_prediction_interval",
            n: &[35, 60],
            r: &[0.2, 0.7],
            q: 9.051355944453901,
            df: 1,
            p: Some(0.002625000676112924),
            i2: 88.95193155437957,
            tau2: 0.19642836596940713,
            fe_z: 0.6283547394190073,
            fe_r: 0.5569182856874881,
            fe_ci: [0.3974349141876986, 0.6837434303608343],
            re_z: 0.5453286089352216,
            re_se: 0.33212393642928895,
            re_r: 0.4970109196275649,
            re_ci: [-0.10523131263151683, 0.8325162738973735],
            re_pi: None,
        },
        RefCase {
            name: "elastic_15_elements",
            n: &[270, 216, 207, 249, 78, 81, 63, 72, 39, 63, 78, 105, 51, 39, 66],
            r: &[0.12191412027987447, 0.20412717774889413, 0.9557719281924468, 0.047746118064926506, 0.17906824997990378, 0.1883385429652027, 0.23926972755031067, 0.39816934989047575, 0.14266332074540525, 0.8229962676198475, 0.7033236482071523, 0.9564496589445777, 0.8964534867012272, 0.9864230181220723, 0.8911594675030412],
            q: 945.0290505648588,
            df: 14,
            p: Some(9.643742522890389e-193),
            i2: 98.51856405984219,
            tau2: 0.6341381556139218,
            fe_z: 0.6932701130014305,
            fe_r: 0.6000786709594264,
            fe_ci: [0.568127650424936, 0.6302232800580826],
            re_z: 0.8486449129000098,
            re_se: 0.20782014375198515,
            re_r: 0.6903608780476723,
            re_ci: [0.4147420604931655, 0.8499478488461594],
            re_pi: Some([-0.7302843303708512, 0.9895934724124595]),
        },
    ];

    /// (p, df, t) with P(T_df <= t) = p.
    pub(super) const T_QUANTILES: &[(f64, f64, f64)] = &[
        (0.025, 1.0, -12.706204736174705),
        (0.6, 1.0, 0.32491969623290634),
        (0.9, 1.0, 3.0776835371752544),
        (0.975, 1.0, 12.706204736174694),
        (0.995, 1.0, 63.656741162871526),
        (0.9995, 1.0, 636.6192487687897),
        (0.025, 2.0, -4.302652729749464),
        (0.6, 2.0, 0.2886751345948128),
        (0.9, 2.0, 1.8856180831641272),
        (0.975, 2.0, 4.302652729749462),
        (0.995, 2.0, 9.924843200918287),
        (0.9995, 2.0, 31.599054576445365),
        (0.025, 2.5, -3.5746548420036834),
        (0.6, 2.5, 0.2814595127485477),
        (0.9, 2.5, 1.7302509288071766),
        (0.975, 2.5, 3.5746548420036817),
        (0.995, 2.5, 7.163728138948783),
        (0.9995, 2.5, 18.277893528131457),
        (0.025, 3.0, -3.1824463052837086),
        (0.6, 3.0, 0.2766706623326898),
        (0.9, 3.0, 1.637744353696209),
        (0.975, 3.0, 3.1824463052837078),
        (0.995, 3.0, 5.840909309733355),
        (0.9995, 3.0, 12.923978636687961),
        (0.025, 4.0, -2.7764451051977943),
        (0.6, 4.0, 0.2707222947075976),
        (0.9, 4.0, 1.533206274058944),
        (0.975, 4.0, 2.7764451051977934),
        (0.995, 4.0, 4.604094871349992),
        (0.9995, 4.0, 8.610301581379522),
        (0.025, 5.0, -2.5705818356363155),
        (0.6, 5.0, 0.2671808657041451),
        (0.9, 5.0, 1.4758840488244815),
        (0.975, 5.0, 2.5705818356363146),
        (0.995, 5.0, 4.032142983555228),
        (0.9995, 5.0, 6.868826625881276),
        (0.025, 6.0, -2.4469118511449794),
        (0.6, 6.0, 0.2648345329335734),
        (0.9, 6.0, 1.4397557472651483),
        (0.975, 6.0, 2.4469118511449786),
        (0.995, 6.0, 3.7074280213248065),
        (0.9995, 6.0, 5.95881617881889),
        (0.025, 7.0, -2.3646242515927844),
        (0.6, 7.0, 0.2631668613520229),
        (0.9, 7.0, 1.4149239276505086),
        (0.975, 7.0, 2.364624251592784),
        (0.995, 7.0, 3.4994832973504924),
        (0.9995, 7.0, 5.407882520861828),
        (0.025, 7.3, -2.3450667365477034),
        (0.6, 7.3, 0.2627568052507191),
        (0.9, 7.3, 1.4089223177480423),
        (0.975, 7.3, 2.345066736547703),
        (0.995, 7.3, 3.451031655622185),
        (0.9995, 7.3, 5.283211758939497),
        (0.025, 8.0, -2.3060041352041662),
        (0.6, 8.0, 0.26192109674883235),
        (0.9, 8.0, 1.3968153097438654),
        (0.975, 8.0, 2.306004135204166),
        (0.995, 8.0, 3.355387331333395),
        (0.9995, 8.0, 5.041305433373456),
        (0.025, 9.0, -2.2621571627982053),
        (0.6, 9.0, 0.260955336473911),
        (0.9, 9.0, 1.3830287383966329),
        (0.975, 9.0, 2.262157162798205),
        (0.995, 9.0, 3.249835541592126),
        (0.9995, 9.0, 4.780912585931217),
        (0.025, 10.0, -2.2281388519862753),
        (0.6, 10.0, 0.2601848294920803),
        (0.9, 10.0, 1.372183641110336),
        (0.975, 10.0, 2.228138851986274),
        (0.995, 10.0, 3.16927267261695),
        (0.9995, 10.0, 4.586893858702708),
        (0.025, 11.0, -2.2009851600916392),
        (0.6, 11.0, 0.25955586047627044),
        (0.9, 11.0, 1.3634303180205407),
        (0.975, 11.0, 2.200985160091639),
        (0.995, 11.0, 3.1058065155392804),
        (0.9995, 11.0, 4.436979338234516),
        (0.025, 12.0, -2.1788128296672293),
        (0.6, 12.0, 0.25903274567688733),
        (0.9, 12.0, 1.356217334023205),
        (0.975, 12.0, 2.1788128296672284),
        (0.995, 12.0, 3.0545395893929013),
        (0.9995, 12.0, 4.3177912836062475),
        (0.025, 13.0, -2.160368656462793),
        (0.6, 13.0, 0.2585908577117678),
        (0.9, 13.0, 1.3501712887800552),
        (0.975, 13.0, 2.1603686564627913),
        (0.995, 13.0, 3.012275838716578),
        (0.9995, 13.0, 4.22083172770718),
        (0.025, 15.0, -2.131449545559776),
        (0.6, 15.0, 0.25788530093726125),
        (0.9, 15.0, 1.3406056078504558),
        (0.975, 15.0, 2.131449545559776),
        (0.995, 15.0, 2.946712883475238),
        (0.9995, 15.0, 4.072765195903846),
        (0.025, 20.0, -2.0859634472658652),
        (0.6, 20.0, 0.2567427538545021),
        (0.9, 20.0, 1.3253407069850465),
        (0.975, 20.0, 2.085963447265864),
        (0.995, 20.0, 2.8453397097861077),
        (0.9995, 20.0, 3.8495162749308744),
        (0.025, 25.0, -2.059538552753297),
        (0.6, 25.0, 0.2560596848271514),
        (0.9, 25.0, 1.31634507267387),
        (0.975, 25.0, 2.0595385527532972),
        (0.995, 25.0, 2.78743581367697),
        (0.9995, 25.0, 3.725143949728693),
        (0.025, 30.0, -2.042272456301238),
        (0.6, 30.0, 0.2556053649519128),
        (0.9, 30.0, 1.3104150253913955),
        (0.975, 30.0, 2.0422724563012378),
        (0.995, 30.0, 2.7499956535672254),
        (0.9995, 30.0, 3.6459586350420627),
        (0.025, 40.0, -2.0210753903062733),
        (0.6, 40.0, 0.25503868634581395),
        (0.9, 40.0, 1.3030770526071949),
        (0.975, 40.0, 2.021075390306273),
        (0.995, 40.0, 2.7044592674331622),
        (0.9995, 40.0, 3.550965760863349),
        (0.025, 60.0, -2.0002978220142604),
        (0.6, 60.0, 0.2544733949895309),
        (0.9, 60.0, 1.295821093515731),
        (0.975, 60.0, 2.0002978220142604),
        (0.995, 60.0, 2.6602830288550368),
        (0.9995, 60.0, 3.460200469196392),
        (0.025, 120.0, -1.9799304050824411),
        (0.6, 120.0, 0.25390952321492877),
        (0.9, 120.0, 1.288646233656378),
        (0.975, 120.0, 1.9799304050824402),
        (0.995, 120.0, 2.6174211451068654),
        (0.9995, 120.0, 3.373453768562533),
        (0.025, 1000.0, -1.9623390808264085),
        (0.6, 1000.0, 0.25341451583949876),
        (0.9, 1000.0, 1.2823987214609247),
        (0.975, 1000.0, 1.9623390808264083),
        (0.995, 1000.0, 2.580754698065951),
        (0.9995, 1000.0, 3.300282648423944),
    ];

    /// (x, df, P(chi2_df >= x)).
    pub(super) const CHI2_SF: &[(f64, usize, f64)] = &[
        (0.1, 3, 0.9918374237318764),
        (0.5, 1, 0.47950012218695337),
        (2.0, 4, 0.7357588823428847),
        (3.841458820694124, 1, 0.04999999999999989),
        (7.0, 7, 0.42887985755305486),
        (9.487729036781154, 4, 0.05000000000000006),
        (20.0, 2, 4.539992976248486e-05),
        (30.0, 10, 0.000856641210775301),
        (100.0, 50, 3.454931382984871e-05),
        (945.0, 14, 9.783042137665807e-193),
    ];
    // END GENERATED REFERENCE DATA
}
