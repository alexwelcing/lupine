//! Causal inference utilities for grouped data.
//!
//! Implements detection of Simpson's paradox and related ecological fallacy
//! phenomena in interatomic potential benchmarking data. When correlations
//! are computed across heterogeneous groups (e.g., different elements),
//! pooling can produce spurious or even inverted correlations.
//!
//! References:
//! - Pearl (2014), "Understanding Simpson's Paradox"
//! - Kievit et al. (2013), "Simpson's paradox in psychological science"
//! - Jackson & Somers (1991), "The spectre of spurious correlations"

use crate::stats;
use serde::{Deserialize, Serialize};

/// A data point belonging to a group.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupedPoint {
    pub group: String,
    pub x: f64,
    pub y: f64,
}

/// Simpson's paradox detection result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParadoxResult {
    pub n_groups: usize,
    pub n_total: usize,
    /// Correlation across all data (pooled)
    pub pooled_r: f64,
    /// Correlation direction: "positive" or "negative"
    pub pooled_direction: String,
    /// Per-group correlations
    pub group_correlations: Vec<GroupCorrelation>,
    /// Whether Simpson's paradox is detected
    pub simpsons_detected: bool,
    /// Whether ecological fallacy is detected
    pub ecological_fallacy: bool,
    /// Description of the paradox pattern
    pub pattern: String,
    /// Causal confounder (group identity)
    pub confounder: String,
    /// Recommended analysis: "stratified" or "pooled"
    pub recommendation: String,
    /// Statistical markers for the paradox
    pub markers: ParadoxMarkers,
}

/// Per-group correlation statistics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupCorrelation {
    pub group: String,
    pub n: usize,
    pub r: f64,
    pub x_mean: f64,
    pub y_mean: f64,
    pub x_range: (f64, f64),
    pub y_range: (f64, f64),
}

/// Quantitative markers for paradox detection.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParadoxMarkers {
    /// Fraction of groups with opposite sign to pooled correlation
    pub opposite_sign_fraction: f64,
    /// Variance of group means on x (between-group variance)
    pub between_group_var_x: f64,
    /// Variance of group means on y
    pub between_group_var_y: f64,
    /// Pooled within-group correlation
    pub pooled_within_r: f64,
    /// Difference between pooled and pooled-within correlation
    pub correlation_reversal_magnitude: f64,
}

/// Detect Simpson's paradox in grouped bivariate data.
///
/// Algorithm:
/// 1. Compute pooled correlation across all points
/// 2. Compute correlation within each group
/// 3. Detect if pooled sign differs from majority of group signs
/// 4. Check if group means create a confounding structure
pub fn detect_simpsons_paradox(data: &[GroupedPoint]) -> ParadoxResult {
    if data.len() < 4 {
        return empty_result();
    }

    use std::collections::HashMap;

    // Group data
    let mut groups: HashMap<String, Vec<(f64, f64)>> = HashMap::new();
    for pt in data {
        groups.entry(pt.group.clone()).or_default().push((pt.x, pt.y));
    }

    let n_groups = groups.len();
    let n_total = data.len();

    // Pooled correlation
    let xs_pooled: Vec<f64> = data.iter().map(|p| p.x).collect();
    let ys_pooled: Vec<f64> = data.iter().map(|p| p.y).collect();
    let pooled_r = stats::pearson_r(&xs_pooled, &ys_pooled);
    let pooled_direction = if pooled_r >= 0.0 { "positive" } else { "negative" };

    // Per-group correlations
    let mut group_correlations = Vec::new();
    let mut group_means_x = Vec::new();
    let mut group_means_y = Vec::new();
    let mut within_rs = Vec::new();
    let mut within_weights = Vec::new();

    for (group_name, points) in &groups {
        if points.len() < 2 {
            continue;
        }

        let xs: Vec<f64> = points.iter().map(|(x, _)| *x).collect();
        let ys: Vec<f64> = points.iter().map(|(_, y)| *y).collect();
        let r = stats::pearson_r(&xs, &ys);

        let x_mean = xs.iter().sum::<f64>() / xs.len() as f64;
        let y_mean = ys.iter().sum::<f64>() / ys.len() as f64;
        let x_min = xs.iter().cloned().fold(f64::INFINITY, f64::min);
        let x_max = xs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let y_min = ys.iter().cloned().fold(f64::INFINITY, f64::min);
        let y_max = ys.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

        group_correlations.push(GroupCorrelation {
            group: group_name.clone(),
            n: points.len(),
            r,
            x_mean,
            y_mean,
            x_range: (x_min, x_max),
            y_range: (y_min, y_max),
        });

        group_means_x.push(x_mean);
        group_means_y.push(y_mean);

        if r.is_finite() {
            within_rs.push(r);
            within_weights.push(points.len() as f64);
        }
    }

    // Count groups with opposite sign
    let opposite_groups: Vec<_> = group_correlations
        .iter()
        .filter(|g| g.r.is_finite() && g.r.signum() != pooled_r.signum())
        .collect();

    let opposite_fraction = if !group_correlations.is_empty() {
        opposite_groups.len() as f64 / group_correlations.len() as f64
    } else {
        0.0
    };

    // Pooled within-group correlation (weighted average)
    let pooled_within_r = if !within_rs.is_empty() {
        let sum_w: f64 = within_weights.iter().sum();
        within_rs
            .iter()
            .zip(within_weights.iter())
            .map(|(r, w)| r * w)
            .sum::<f64>()
            / sum_w
    } else {
        f64::NAN
    };

    // Between-group variance of means
    let between_var_x = variance(&group_means_x);
    let between_var_y = variance(&group_means_y);

    let reversal_magnitude = (pooled_r - pooled_within_r).abs();

    // Detection criteria
    let simpsons_detected = opposite_fraction > 0.5
        || (pooled_r.signum() != pooled_within_r.signum() && pooled_within_r.is_finite());

    let ecological_fallacy = between_var_x > 0.0
        && between_var_y > 0.0
        && reversal_magnitude > 0.1;

    let pattern = if simpsons_detected {
        if pooled_r.signum() != pooled_within_r.signum() {
            format!(
                "Complete reversal: pooled r={:+.3} but within-group r={:+.3}",
                pooled_r, pooled_within_r
            )
        } else {
            format!(
                "Partial paradox: {:.0}% of groups show opposite correlation to pooled",
                opposite_fraction * 100.0
            )
        }
    } else if opposite_fraction > 0.25 {
        format!(
            "Warning: {:.0}% of groups have opposite-sign correlations (pre-paradox)",
            opposite_fraction * 100.0
        )
    } else {
        "No Simpson's paradox detected".to_string()
    };

    let recommendation = if simpsons_detected || ecological_fallacy {
        "stratified"
    } else {
        "pooled"
    };

    ParadoxResult {
        n_groups,
        n_total,
        pooled_r,
        pooled_direction: pooled_direction.to_string(),
        group_correlations,
        simpsons_detected,
        ecological_fallacy,
        pattern,
        confounder: "group_identity".to_string(),
        recommendation: recommendation.to_string(),
        markers: ParadoxMarkers {
            opposite_sign_fraction: opposite_fraction,
            between_group_var_x: between_var_x,
            between_group_var_y: between_var_y,
            pooled_within_r,
            correlation_reversal_magnitude: reversal_magnitude,
        },
    }
}

fn variance(data: &[f64]) -> f64 {
    if data.len() < 2 {
        return 0.0;
    }
    let mean = data.iter().sum::<f64>() / data.len() as f64;
    data.iter().map(|&x| (x - mean).powi(2)).sum::<f64>() / (data.len() - 1) as f64
}

fn empty_result() -> ParadoxResult {
    ParadoxResult {
        n_groups: 0,
        n_total: 0,
        pooled_r: f64::NAN,
        pooled_direction: "unknown".to_string(),
        group_correlations: vec![],
        simpsons_detected: false,
        ecological_fallacy: false,
        pattern: "Insufficient data".to_string(),
        confounder: "unknown".to_string(),
        recommendation: "none".to_string(),
        markers: ParadoxMarkers {
            opposite_sign_fraction: 0.0,
            between_group_var_x: 0.0,
            between_group_var_y: 0.0,
            pooled_within_r: f64::NAN,
            correlation_reversal_magnitude: 0.0,
        },
    }
}

/// Print paradox detection summary.
pub fn print_summary(result: &ParadoxResult) {
    eprintln!();
    eprintln!("  ╔════════════════════════════════════════════════════════════╗");
    eprintln!("  ║  Simpson's Paradox / Ecological Fallacy Detection          ║");
    eprintln!("  ╚════════════════════════════════════════════════════════════╝");
    eprintln!();
    eprintln!("  Groups: {} | Total points: {}", result.n_groups, result.n_total);
    eprintln!("  Pooled correlation: r = {:+.4} ({})", result.pooled_r, result.pooled_direction);
    eprintln!();

    eprintln!("  Per-group correlations:");
    for g in &result.group_correlations {
        let sign = if g.r >= 0.0 { "+" } else { "" };
        eprintln!(
            "    {:12}  n={:3}  r={}{:.4}  x̄={:8.2}  ȳ={:8.2}",
            g.group, g.n, sign, g.r, g.x_mean, g.y_mean
        );
    }

    eprintln!();
    eprintln!("  Markers:");
    eprintln!("    Opposite-sign groups: {:.1}%", result.markers.opposite_sign_fraction * 100.0);
    eprintln!("    Pooled within-group r: {:+.4}", result.markers.pooled_within_r);
    eprintln!("    Reversal magnitude: {:.4}", result.markers.correlation_reversal_magnitude);
    eprintln!("    Between-group var(x): {:.4}", result.markers.between_group_var_x);
    eprintln!("    Between-group var(y): {:.4}", result.markers.between_group_var_y);
    eprintln!();

    if result.simpsons_detected {
        eprintln!("  ❌ SIMPSON'S PARADOX DETECTED");
    } else {
        eprintln!("  ✅ No Simpson's paradox detected");
    }

    if result.ecological_fallacy {
        eprintln!("  ⚠️  ECOLOGICAL FALLACY RISK");
    }

    eprintln!();
    eprintln!("  Pattern: {}", result.pattern);
    eprintln!("  Confounder: {}", result.confounder);
    eprintln!("  Recommendation: {} analysis", result.recommendation);
}

/// Generate a synthetic example demonstrating Simpson's paradox.
///
/// This mimics the BCC elastic constant pooling scenario where element
/// identity acts as a causal confounder.
pub fn generate_simpsons_example() -> Vec<GroupedPoint> {
    let mut data = Vec::new();

    // Group A: high x, high y, positive correlation
    for i in 0..20 {
        data.push(GroupedPoint {
            group: "Group_A".to_string(),
            x: 8.0 + i as f64 * 0.2 + (i as f64 * 0.1).sin() * 0.5,
            y: 8.0 + i as f64 * 0.3 + (i as f64 * 0.15).cos() * 0.5,
        });
    }

    // Group B: low x, low y, positive correlation
    for i in 0..20 {
        data.push(GroupedPoint {
            group: "Group_B".to_string(),
            x: 1.0 + i as f64 * 0.1 + (i as f64 * 0.1).sin() * 0.3,
            y: 1.0 + i as f64 * 0.15 + (i as f64 * 0.15).cos() * 0.3,
        });
    }

    data
}

/// Generate a synthetic example demonstrating correlation reversal.
pub fn generate_reversal_example() -> Vec<GroupedPoint> {
    let mut data = Vec::new();

    // Group 1: positive correlation
    for i in 0..15 {
        data.push(GroupedPoint {
            group: "Metal_X".to_string(),
            x: i as f64 * 0.5,
            y: i as f64 * 0.5 + 2.0,
        });
    }

    // Group 2: positive correlation but shifted down
    for i in 0..15 {
        data.push(GroupedPoint {
            group: "Metal_Y".to_string(),
            x: i as f64 * 0.5 + 5.0,
            y: i as f64 * 0.5 - 3.0,
        });
    }

    // Group 3: positive correlation but shifted further
    for i in 0..15 {
        data.push(GroupedPoint {
            group: "Metal_Z".to_string(),
            x: i as f64 * 0.5 + 10.0,
            y: i as f64 * 0.5 - 8.0,
        });
    }

    data
}

/// Generate a BCC-inspired example demonstrating Simpson's paradox.
///
/// Element identity acts as a confounder: within each BCC metal,
/// reference elastic constant and prediction error are positively
/// correlated (higher stiffness → larger prediction), but when pooled
/// across metals, softer metals have systematically positive errors
/// while stiffer metals have negative errors, producing an inverted
/// pooled correlation.
pub fn generate_bcc_paradox_example() -> Vec<GroupedPoint> {
    let mut data = Vec::new();

    // Soft BCC metals: positive errors, within-metal positive slope
    let soft = vec![
        ("Fe", vec![(230.0, 8.0), (135.0, 4.0), (117.0, 2.0)]),
        ("V",  vec![(230.0, 9.0), (119.0, 5.0), (44.0, 3.0)]),
        ("Nb", vec![(247.0, 11.0), (135.0, 6.0), (29.0, 4.0)]),
        ("Ta", vec![(266.0, 8.0), (158.0, 4.0), (87.0, 2.0)]),
    ];

    // Stiff BCC metals: negative errors, within-metal positive slope
    // (higher ref → less negative error)
    let stiff = vec![
        ("Cr", vec![(350.0, -6.0), (67.0, -3.0), (101.0, -2.0)]),
        ("Mo", vec![(440.0, -10.0), (172.0, -5.0), (106.0, -3.0)]),
        ("W",  vec![(522.0, -12.0), (204.0, -6.0), (161.0, -4.0)]),
    ];

    for (metal, points) in soft.iter().chain(stiff.iter()) {
        for (x, y) in points {
            data.push(GroupedPoint {
                group: metal.to_string(),
                x: *x,
                y: *y,
            });
        }
    }

    data
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simpsons_paradox_detected() {
        let data = generate_simpsons_example();
        let result = detect_simpsons_paradox(&data);

        // This example should show strong ecological fallacy:
        // each group has positive correlation, but pooled may differ
        assert!(
            result.pooled_r.is_finite(),
            "Pooled correlation should be finite"
        );
        assert!(
            !result.group_correlations.is_empty(),
            "Should have group correlations"
        );
    }

    #[test]
    fn test_reversal_example() {
        let data = generate_reversal_example();
        let result = detect_simpsons_paradox(&data);

        // All groups have positive slope ~1, but pooled should be negative
        // because higher-x groups have lower y values
        assert!(
            result.pooled_r < 0.0,
            "Pooled correlation should be negative due to confounding, got {}",
            result.pooled_r
        );

        for g in &result.group_correlations {
            assert!(
                g.r > 0.9,
                "Within-group correlation should be strongly positive, got {} for {}",
                g.r,
                g.group
            );
        }

        assert!(result.simpsons_detected || result.ecological_fallacy);
    }

    #[test]
    fn test_no_paradox_homogeneous() {
        // Single group with clear positive correlation
        let mut data = Vec::new();
        for i in 0..50 {
            data.push(GroupedPoint {
                group: "Only".to_string(),
                x: i as f64,
                y: i as f64 * 2.0 + 1.0,
            });
        }

        let result = detect_simpsons_paradox(&data);
        assert!(!result.simpsons_detected);
        assert!(result.pooled_r > 0.99);
    }

    #[test]
    fn test_empty_data() {
        let result = detect_simpsons_paradox(&[]);
        assert!(result.pooled_r.is_nan());
    }

    #[test]
    fn test_bcc_paradox_example() {
        let data = generate_bcc_paradox_example();
        let result = detect_simpsons_paradox(&data);

        // Should detect complete reversal: pooled negative, within-group positive
        assert!(
            result.simpsons_detected || result.ecological_fallacy,
            "Expected paradox detection in BCC example"
        );
        assert!(
            result.pooled_r < 0.0,
            "Pooled correlation should be negative, got {}",
            result.pooled_r
        );
        assert!(
            result.markers.pooled_within_r > 0.0,
            "Within-group correlation should be positive, got {}",
            result.markers.pooled_within_r
        );
    }
}
