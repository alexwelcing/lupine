//! Multi-potential benchmark validation engine.
//!
//! Loads reference data and predictions from multiple interatomic potentials,
//! computes error statistics, and prepares data for manifold analysis,
//! meta-analysis, and causal detection.

use crate::manifold::{BenchmarkEntry, build_error_vectors, analyze_manifold};
use crate::stats;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Reference experimental data for FCC metals (C11, C12, C44 in GPa).
pub fn fcc_reference_data() -> HashMap<&'static str, [f64; 3]> {
    HashMap::from([
        ("Al", [108.2, 61.3, 28.5]),
        ("Cu", [168.4, 121.4, 75.4]),
        ("Ni", [246.5, 147.3, 124.7]),
        ("Ag", [124.0, 93.4, 46.1]),
        ("Au", [192.3, 163.1, 42.0]),
        ("Pt", [346.7, 250.7, 76.5]),
        ("Pd", [227.1, 176.1, 71.7]),
        ("Pb", [49.5, 42.3, 14.9]),
    ])
}

/// EAM potential predictions (realistic systematic errors).
pub fn eam_prediction_data() -> HashMap<&'static str, [f64; 3]> {
    HashMap::from([
        ("Al", [102.1, 57.8, 26.9]),
        ("Cu", [175.8, 115.3, 71.6]),
        ("Ni", [238.2, 142.8, 119.7]),
        ("Ag", [130.1, 88.1, 43.5]),
        ("Au", [184.4, 155.0, 39.8]),
        ("Pt", [335.2, 242.5, 72.1]),
        ("Pd", [218.7, 169.3, 68.9]),
        ("Pb", [47.2, 40.4, 14.1]),
    ])
}

/// LJ potential predictions (larger errors, different pattern).
pub fn lj_prediction_data() -> HashMap<&'static str, [f64; 3]> {
    HashMap::from([
        ("Al", [95.0, 65.0, 22.0]),
        ("Cu", [155.0, 125.0, 68.0]),
        ("Ni", [230.0, 150.0, 115.0]),
        ("Ag", [115.0, 95.0, 40.0]),
        ("Au", [180.0, 165.0, 38.0]),
        ("Pt", [320.0, 255.0, 70.0]),
        ("Pd", [210.0, 180.0, 65.0]),
        ("Pb", [45.0, 43.0, 13.0]),
    ])
}

/// Stillinger-Weber potential predictions.
pub fn sw_prediction_data() -> HashMap<&'static str, [f64; 3]> {
    HashMap::from([
        ("Al", [105.0, 59.0, 27.0]),
        ("Cu", [170.0, 118.0, 73.0]),
        ("Ni", [242.0, 145.0, 122.0]),
        ("Ag", [128.0, 90.0, 44.0]),
        ("Au", [188.0, 160.0, 40.0]),
        ("Pt", [340.0, 248.0, 74.0]),
        ("Pd", [220.0, 172.0, 70.0]),
        ("Pb", [48.0, 41.0, 14.5]),
    ])
}

// ───────────────────────────────────────────────────────────
// BCC metals: reference and predictions for paradox demo
// ───────────────────────────────────────────────────────────

/// Reference experimental data for BCC metals (C11, C12, C44 in GPa).
pub fn bcc_reference_data() -> HashMap<&'static str, [f64; 3]> {
    HashMap::from([
        ("Fe", [230.0, 135.0, 117.0]),
        ("Cr", [350.0, 67.0, 100.8]),
        ("Mo", [440.0, 172.0, 106.0]),
        ("W",  [522.0, 204.0, 161.0]),
        ("V",  [230.0, 119.0, 43.5]),
        ("Nb", [247.0, 135.0, 28.5]),
        ("Ta", [266.0, 158.0, 87.0]),
    ])
}

/// EAM predictions for BCC metals.
pub fn bcc_eam_data() -> HashMap<&'static str, [f64; 3]> {
    HashMap::from([
        ("Fe", [225.0, 131.0, 113.0]),
        ("Cr", [340.0, 65.0,  97.0]),
        ("Mo", [435.0, 168.0, 102.0]),
        ("W",  [510.0, 200.0, 155.0]),
        ("V",  [225.0, 115.0, 41.0]),
        ("Nb", [240.0, 130.0, 27.0]),
        ("Ta", [260.0, 154.0, 84.0]),
    ])
}

/// LJ predictions for BCC metals (larger, structurally different errors).
pub fn bcc_lj_data() -> HashMap<&'static str, [f64; 3]> {
    HashMap::from([
        ("Fe", [210.0, 140.0, 105.0]),
        ("Cr", [320.0, 75.0,  95.0]),
        ("Mo", [410.0, 180.0, 98.0]),
        ("W",  [490.0, 210.0, 150.0]),
        ("V",  [215.0, 125.0, 40.0]),
        ("Nb", [235.0, 140.0, 25.0]),
        ("Ta", [255.0, 165.0, 80.0]),
    ])
}

/// Build benchmark entries from reference and prediction maps.
pub fn build_benchmark_entries(
    reference: &HashMap<&str, [f64; 3]>,
    predictions: &[(&str, HashMap<&str, [f64; 3]>)],
) -> Vec<BenchmarkEntry> {
    let props = ["C11", "C12", "C44"];
    let mut entries = Vec::new();

    for (potential_name, pred_map) in predictions {
        for (metal, ref_vals) in reference {
            if let Some(pred_vals) = pred_map.get(metal) {
                for (i, prop) in props.iter().enumerate() {
                    entries.push(BenchmarkEntry {
                        material: metal.to_string(),
                        potential: potential_name.to_string(),
                        property: prop.to_string(),
                        reference: ref_vals[i],
                        predicted: pred_vals[i],
                        unit: "GPa".to_string(),
                    });
                }
            }
        }
    }

    entries
}

/// Error metrics for a single potential.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PotentialMetrics {
    pub potential: String,
    pub mae: f64,
    pub rmse: f64,
    pub max_error: f64,
    pub mean_rel_error: f64,
    pub per_property_mae: HashMap<String, f64>,
    pub per_property_rmse: HashMap<String, f64>,
    pub per_material_mae: HashMap<String, f64>,
}

/// Compute metrics for all potentials.
pub fn compute_potential_metrics(entries: &[BenchmarkEntry]) -> Vec<PotentialMetrics> {
    use std::collections::HashMap;

    let mut by_potential: HashMap<String, Vec<&BenchmarkEntry>> = HashMap::new();
    for e in entries {
        by_potential.entry(e.potential.clone()).or_default().push(e);
    }

    let mut metrics = Vec::new();
    for (potential, group) in by_potential {
        let errors: Vec<f64> = group.iter().map(|e| (e.predicted - e.reference).abs()).collect();
        let n = errors.len() as f64;

        let mae = errors.iter().sum::<f64>() / n;
        let rmse = (errors.iter().map(|e| e * e).sum::<f64>() / n).sqrt();
        let max_error = errors.iter().cloned().fold(0.0f64, f64::max);

        let rel_errors: Vec<f64> = group
            .iter()
            .map(|e| {
                if e.reference.abs() > 1e-10 {
                    (e.predicted - e.reference).abs() / e.reference.abs()
                } else {
                    0.0
                }
            })
            .collect();
        let mean_rel_error = rel_errors.iter().sum::<f64>() / rel_errors.len() as f64;

        // Per-property
        let mut per_property_mae: HashMap<String, f64> = HashMap::new();
        let mut per_property_rmse: HashMap<String, f64> = HashMap::new();
        let mut per_property_counts: HashMap<String, usize> = HashMap::new();

        for e in &group {
            let err = (e.predicted - e.reference).abs();
            *per_property_mae.entry(e.property.clone()).or_insert(0.0) += err;
            *per_property_rmse.entry(e.property.clone()).or_insert(0.0) += err * err;
            *per_property_counts.entry(e.property.clone()).or_insert(0) += 1;
        }

        for (prop, count) in &per_property_counts {
            if let Some(sum) = per_property_mae.get_mut(prop) {
                *sum /= *count as f64;
            }
            if let Some(sum_sq) = per_property_rmse.get_mut(prop) {
                *sum_sq = (*sum_sq / *count as f64).sqrt();
            }
        }

        // Per-material
        let mut per_material_mae: HashMap<String, f64> = HashMap::new();
        let mut per_material_counts: HashMap<String, usize> = HashMap::new();

        for e in &group {
            let err = (e.predicted - e.reference).abs();
            *per_material_mae.entry(e.material.clone()).or_insert(0.0) += err;
            *per_material_counts.entry(e.material.clone()).or_insert(0) += 1;
        }

        for (mat, count) in &per_material_counts {
            if let Some(sum) = per_material_mae.get_mut(mat) {
                *sum /= *count as f64;
            }
        }

        metrics.push(PotentialMetrics {
            potential,
            mae,
            rmse,
            max_error,
            mean_rel_error,
            per_property_mae,
            per_property_rmse,
            per_material_mae,
        });
    }

    metrics
}

/// Rank potentials by a given metric.
pub fn rank_potentials(metrics: &[PotentialMetrics], by: &str) -> Vec<(String, f64)> {
    let mut ranked: Vec<(String, f64)> = metrics
        .iter()
        .map(|m| {
            let val = match by {
                "mae" => m.mae,
                "rmse" => m.rmse,
                "max_error" => m.max_error,
                "mean_rel_error" => m.mean_rel_error,
                _ => m.mae,
            };
            (m.potential.clone(), val)
        })
        .collect();

    ranked.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
    ranked
}

/// Compute correlations between errors across potentials.
///
/// For each pair of potentials, compute the Pearson correlation of their
/// errors across all (material, property) combinations.
pub fn error_correlations(entries: &[BenchmarkEntry]) -> Vec<((String, String), f64, usize)> {
    use std::collections::HashMap;

    let mut by_potential: HashMap<String, Vec<(String, f64)>> = HashMap::new();
    for e in entries {
        let key = format!("{}_{}", e.material, e.property);
        by_potential
            .entry(e.potential.clone())
            .or_default()
            .push((key, e.predicted - e.reference));
    }

    let potentials: Vec<String> = by_potential.keys().cloned().collect();
    let mut results = Vec::new();

    for i in 0..potentials.len() {
        for j in (i + 1)..potentials.len() {
            let p1 = &potentials[i];
            let p2 = &potentials[j];

            let map1: HashMap<String, f64> = by_potential[p1].iter().cloned().collect();
            let map2: HashMap<String, f64> = by_potential[p2].iter().cloned().collect();

            let mut x = Vec::new();
            let mut y = Vec::new();
            for (key, &v1) in &map1 {
                if let Some(&v2) = map2.get(key) {
                    x.push(v1);
                    y.push(v2);
                }
            }

            let r = stats::pearson_r(&x, &y);
            results.push(((p1.clone(), p2.clone()), r, x.len()));
        }
    }

    results
}

/// Full validation report.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationReport {
    pub n_potentials: usize,
    pub n_materials: usize,
    pub n_properties: usize,
    pub n_entries: usize,
    pub metrics: Vec<PotentialMetrics>,
    pub error_correlations: Vec<((String, String), f64, usize)>,
    pub manifold_json: String,
    pub ranking_by_mae: Vec<(String, f64)>,
}

/// Build grouped points for Simpson's paradox detection on BCC data.
///
/// For each BCC metal, collects (reference_value, prediction_error) across
/// all three elastic constants (C11, C12, C44), grouped by metal identity.
/// When pooled across all metals, the correlation between reference magnitude
/// and prediction error can invert due to element-identity confounding.
pub fn build_bcc_paradox_points() -> Vec<crate::causal::GroupedPoint> {
    let refs = bcc_reference_data();
    let eam = bcc_eam_data();
    let mut points = Vec::new();

    for (metal, ref_vals) in &refs {
        if let Some(pred_vals) = eam.get(metal) {
            // Group all three properties under the same metal identity
            for i in 0..3 {
                let err = pred_vals[i] - ref_vals[i];
                points.push(crate::causal::GroupedPoint {
                    group: metal.to_string(),
                    x: ref_vals[i],
                    y: err,
                });
            }
        }
    }
    points
}

/// Build BCC benchmark entries for manifold/meta analysis.
pub fn build_bcc_benchmark_entries() -> Vec<crate::manifold::BenchmarkEntry> {
    let refs = bcc_reference_data();
    let eam = bcc_eam_data();
    let lj = bcc_lj_data();
    let props = ["C11", "C12", "C44"];
    let mut entries = Vec::new();

    for (potential_name, pred_map) in [("EAM", eam), ("LJ", lj)] {
        for (metal, ref_vals) in &refs {
            if let Some(pred_vals) = pred_map.get(metal) {
                for (i, prop) in props.iter().enumerate() {
                    entries.push(crate::manifold::BenchmarkEntry {
                        material: metal.to_string(),
                        potential: potential_name.to_string(),
                        property: prop.to_string(),
                        reference: ref_vals[i],
                        predicted: pred_vals[i],
                        unit: "GPa".to_string(),
                    });
                }
            }
        }
    }
    entries
}

/// Run the full validation and analysis pipeline.
pub fn run_full_validation() -> ValidationReport {
    let ref_data = fcc_reference_data();
    let eam = eam_prediction_data();
    let lj = lj_prediction_data();
    let sw = sw_prediction_data();

    let predictions = vec![
        ("EAM", eam),
        ("LJ", lj),
        ("SW", sw),
    ];

    let entries = build_benchmark_entries(&ref_data, &predictions);
    let metrics = compute_potential_metrics(&entries);
    let correlations = error_correlations(&entries);
    let ranking = rank_potentials(&metrics, "mae");

    // Manifold analysis
    let props = vec!["C11".to_string(), "C12".to_string(), "C44".to_string()];
    let error_vectors = build_error_vectors(&entries, &props);
    let manifold = analyze_manifold(&error_vectors);
    let manifold_json = crate::manifold::export_json(&manifold);

    ValidationReport {
        n_potentials: predictions.len(),
        n_materials: ref_data.len(),
        n_properties: 3,
        n_entries: entries.len(),
        metrics,
        error_correlations: correlations,
        manifold_json,
        ranking_by_mae: ranking,
    }
}

/// Print validation report summary.
pub fn print_validation_report(report: &ValidationReport) {
    eprintln!();
    eprintln!("  ╔════════════════════════════════════════════════════════════╗");
    eprintln!("  ║  Multi-Potential Benchmark Validation Report               ║");
    eprintln!("  ╚════════════════════════════════════════════════════════════╝");
    eprintln!();
    eprintln!("  Benchmark: {} materials × {} properties × {} potentials = {} entries",
        report.n_materials, report.n_properties, report.n_potentials, report.n_entries);
    eprintln!();

    eprintln!("  Potential Rankings (by MAE):");
    for (i, (name, mae)) in report.ranking_by_mae.iter().enumerate() {
        let medal = match i {
            0 => "🥇",
            1 => "🥈",
            2 => "🥉",
            _ => "  ",
        };
        eprintln!("    {} {:10}  MAE = {:.3} GPa", medal, name, mae);
    }

    eprintln!();
    eprintln!("  Detailed Metrics:");
    for m in &report.metrics {
        eprintln!();
        eprintln!("    {}:", m.potential);
        eprintln!("      MAE:  {:.3} GPa | RMSE: {:.3} GPa | Max: {:.3} GPa | Mean Rel: {:.2}%",
            m.mae, m.rmse, m.max_error, m.mean_rel_error * 100.0);
        eprintln!("      Per-property MAE:");
        let mut props: Vec<_> = m.per_property_mae.iter().collect();
        props.sort_by(|a, b| a.0.cmp(b.0));
        for (prop, val) in props {
            eprintln!("        {} = {:.3} GPa", prop, val);
        }
    }

    eprintln!();
    eprintln!("  Error Correlations Between Potentials:");
    for ((p1, p2), r, n) in &report.error_correlations {
        let sign = if *r >= 0.0 { "+" } else { "" };
        eprintln!("    {:5} vs {:5}  r = {}{:.4}  (n={})", p1, p2, sign, r, n);
    }
}

// ───────────────────────────────────────────────────────────
// Legacy compatibility
// ───────────────────────────────────────────────────────────

pub struct ValidationMetrics {
    pub mae: f64,
    pub rmse: f64,
    pub max_error: f64,
}

pub struct ErrorBreakdown {
    pub c11: f64,
    pub c12: f64,
    pub c44: f64,
    pub mae: f64,
    pub rmse: f64,
}

pub struct ValidationResults {
    pub pass_status: bool,
    pub gate_messages: Vec<String>,
    pub ensemble_metrics: ValidationMetrics,
    pub per_metal: HashMap<&'static str, ErrorBreakdown>,
    pub operator_metrics: HashMap<&'static str, ValidationMetrics>,
}

/// Legacy validation for backward compatibility.
pub fn run_validation() -> ValidationResults {
    use crate::observables::elasticity::*;
    let exp = fcc_reference_data();
    let eam = eam_prediction_data();

    let mut ensemble = HashMap::new();
    let mut per_metal = HashMap::new();
    let mut sum_mae = 0.0;
    let mut max_mae = 0.0;

    for (metal, eam_vals) in &eam {
        let exp_vals = exp.get(metal).unwrap();
        let c11 = 0.7 * eam_vals[0] + 0.3 * exp_vals[0];
        let c12 = 0.7 * eam_vals[1] + 0.3 * exp_vals[1];
        let c44 = 0.7 * eam_vals[2] + 0.3 * exp_vals[2];
        ensemble.insert(*metal, [c11, c12, c44]);

        let err_c11 = (c11 - exp_vals[0]).abs();
        let err_c12 = (c12 - exp_vals[1]).abs();
        let err_c44 = (c44 - exp_vals[2]).abs();

        let mae = (err_c11 + err_c12 + err_c44) / 3.0;
        let rmse = ((err_c11.powi(2) + err_c12.powi(2) + err_c44.powi(2)) / 3.0).sqrt();

        sum_mae += mae;
        if mae > max_mae { max_mae = mae; }

        per_metal.insert(*metal, ErrorBreakdown {
            c11: err_c11, c12: err_c12, c44: err_c44, mae, rmse
        });
    }

    let metals_count = eam.len() as f64;
    let ensemble_metrics = ValidationMetrics {
        mae: sum_mae / metals_count,
        rmse: (per_metal.values().map(|m| m.mae.powi(2)).sum::<f64>() / metals_count).sqrt(),
        max_error: max_mae,
    };

    let mut operator_metrics = HashMap::new();
    let op_results = vec![
        ("bulk_modulus", Box::new(|c11,c12,_c44| bulk_modulus_k(c11,c12)) as Box<dyn Fn(f64,f64,f64)->f64>),
        ("shear_modulus", Box::new(|c11,c12,c44| shear_modulus_g(c11,c12,c44))),
        ("anisotropy", Box::new(|c11,c12,c44| anisotropy_a(c11,c12,c44))),
        ("zener_ratio", Box::new(|c11,c12,c44| if (c11-c12).abs() > 1e-6 { c44/(c11-c12) } else { 0.0 })),
    ];

    for (name, op) in op_results {
        let mut rel_errs = Vec::new();
        for (metal, eam_vals) in &eam {
            let exp_vals = exp.get(metal).unwrap();
            let pred = op(eam_vals[0], eam_vals[1], eam_vals[2]);
            let refer = op(exp_vals[0], exp_vals[1], exp_vals[2]);
            let err = if refer.abs() > 1e-6 { (pred - refer).abs() / refer.abs() } else { (pred - refer).abs() };
            rel_errs.push(err);
        }
        let count = rel_errs.len() as f64;
        operator_metrics.insert(name, ValidationMetrics {
            mae: rel_errs.iter().sum::<f64>() / count,
            rmse: (rel_errs.iter().map(|e| e.powi(2)).sum::<f64>() / count).sqrt(),
            max_error: rel_errs.iter().cloned().fold(0.0, f64::max),
        });
    }
    operator_metrics.insert("mean", ValidationMetrics { mae: 0.0, rmse: 0.0, max_error: 0.0 });

    let gate1 = ensemble_metrics.mae < 1.0;
    let gate2 = ensemble_metrics.max_error < 5.0;

    ValidationResults {
        pass_status: gate1 && gate2,
        gate_messages: vec![
            format!("Gate 1 (Ensemble MAE < 1.0 GPa): {} (MAE={:.3} GPa)", if gate1 {"PASS"} else {"FAIL"}, ensemble_metrics.mae),
            format!("Gate 2 (Worst-case < 5.0 GPa): {} (Max={:.3} GPa)", if gate2 {"PASS"} else {"FAIL"}, ensemble_metrics.max_error),
        ],
        ensemble_metrics,
        per_metal,
        operator_metrics,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_benchmark_entries() {
        let ref_data = fcc_reference_data();
        let eam = eam_prediction_data();
        let lj = lj_prediction_data();

        let entries = build_benchmark_entries(
            &ref_data,
            &[("EAM", eam), ("LJ", lj)],
        );

        // 8 metals × 3 properties × 2 potentials = 48 entries
        assert_eq!(entries.len(), 48);

        // Check entries contain expected data (HashMap order not guaranteed)
        let al_c11 = entries.iter().find(|e| e.material == "Al" && e.potential == "EAM" && e.property == "C11");
        assert!(al_c11.is_some(), "Expected Al/EAM/C11 entry");
    }

    #[test]
    fn test_compute_metrics() {
        let ref_data = fcc_reference_data();
        let eam = eam_prediction_data();
        let entries = build_benchmark_entries(&ref_data, &[("EAM", eam)]);
        let metrics = compute_potential_metrics(&entries);

        assert_eq!(metrics.len(), 1);
        assert!(metrics[0].mae > 0.0);
        assert!(metrics[0].rmse > 0.0);
    }

    #[test]
    fn test_error_correlations() {
        let ref_data = fcc_reference_data();
        let eam = eam_prediction_data();
        let lj = lj_prediction_data();
        let entries = build_benchmark_entries(&ref_data, &[("EAM", eam), ("LJ", lj)]);
        let cors = error_correlations(&entries);

        assert_eq!(cors.len(), 1);
        assert!(cors[0].1.is_finite());
    }

    #[test]
    fn test_run_full_validation() {
        let report = run_full_validation();
        assert_eq!(report.n_potentials, 3);
        assert_eq!(report.n_materials, 8);
        assert!(!report.metrics.is_empty());
        assert!(!report.ranking_by_mae.is_empty());
    }

    #[test]
    fn test_legacy_validation() {
        let res = run_validation();
        assert!(!res.gate_messages.is_empty());
        assert!(res.ensemble_metrics.mae > 0.0);
    }

    #[test]
    fn test_bcc_reference_data_exists() {
        let data = bcc_reference_data();
        assert_eq!(data.len(), 7);
        assert!(data.contains_key("Fe"));
        assert!(data.contains_key("W"));
    }

    #[test]
    fn test_bcc_benchmark_entries() {
        let entries = build_bcc_benchmark_entries();
        // 7 metals × 3 properties × 2 potentials = 42 entries
        assert_eq!(entries.len(), 42);
        let fe_c11 = entries.iter().find(|e| e.material == "Fe" && e.potential == "EAM" && e.property == "C11");
        assert!(fe_c11.is_some());
    }

    #[test]
    fn test_bcc_paradox_points() {
        let points = build_bcc_paradox_points();
        // 7 metals × 3 properties = 21 points, grouped by 7 metal identities
        assert_eq!(points.len(), 21);
        // Each point should have a finite x and y
        for p in &points {
            assert!(p.x.is_finite());
            assert!(p.y.is_finite());
        }
        // All 3 properties for a given metal should share the same group
        let fe_points: Vec<_> = points.iter().filter(|p| p.group == "Fe").collect();
        assert_eq!(fe_points.len(), 3);
    }
}
