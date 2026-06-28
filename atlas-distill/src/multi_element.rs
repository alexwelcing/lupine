//! Multi-element periodic-table campaign harness.
//!
//! Discovers where the universal correction operator fails by running surrogate
//! experiments across the elements and crystal structures in the validation
//! dataset, fitting per-class corrections, and ranking the resulting residuals.

use nalgebra::DVector;
use std::collections::HashMap;

use crate::feedback_loop::ElasticFeedbackRun;
use crate::nist::NistPotential;
use crate::runner::{ComputationResult, LammpsTrace};
use crate::universal_feedback::{DirectionPolicy, TrainingRow, UniversalFeedbackLoop};
use crate::validation;

/// One row in the multi-element failure scorecard.
#[derive(Debug, Clone)]
pub struct ScorecardRow {
    pub class: String,
    pub element: String,
    pub structure: String,
    pub n_potentials: usize,
    pub max_residual: f64,
    pub mean_residual: f64,
    pub outlier_count: usize,
    pub outliers: Vec<String>,
}

impl ScorecardRow {
    /// True when every potential in this class is within the threshold.
    pub fn is_clean(&self) -> bool {
        self.outlier_count == 0
    }
}

/// Strategy for grouping samples into operator classes.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ClassStrategy {
    /// One class per element (e.g., "Al").
    ByElement,
    /// One class per element-structure pair (e.g., "Al-fcc").
    ByElementStructure,
}

/// A single surrogate potential family.
#[derive(Debug, Clone)]
pub struct SurrogateFamily {
    pub name: String,
    pub predictions: HashMap<String, [f64; 3]>,
}

/// Build the FCC surrogate families from validation data.
pub fn fcc_surrogate_families() -> Vec<SurrogateFamily> {
    vec![
        SurrogateFamily {
            name: "EAM".to_string(),
            predictions: validation::eam_prediction_data()
                .into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect(),
        },
        SurrogateFamily {
            name: "LJ".to_string(),
            predictions: validation::lj_prediction_data()
                .into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect(),
        },
        SurrogateFamily {
            name: "SW".to_string(),
            predictions: validation::sw_prediction_data()
                .into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect(),
        },
    ]
}

/// Build the BCC surrogate families from validation data.
pub fn bcc_surrogate_families() -> Vec<SurrogateFamily> {
    vec![
        SurrogateFamily {
            name: "EAM".to_string(),
            predictions: validation::bcc_eam_data()
                .into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect(),
        },
        SurrogateFamily {
            name: "LJ".to_string(),
            predictions: validation::bcc_lj_data()
                .into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect(),
        },
    ]
}

fn make_surrogate_potential(id: &str, pair_style: &str) -> NistPotential {
    NistPotential {
        id: id.to_string(),
        potid: id.to_string(),
        pair_style: pair_style.to_string(),
        units: "metal".to_string(),
        atom_style: "atomic".to_string(),
        status: String::new(),
        elements: vec![],
        symbols: vec![],
        dois: vec![],
        url: String::new(),
        poturl: String::new(),
        artifacts: vec![],
        file_count: 0,
    }
}

fn dummy_trace() -> LammpsTrace {
    LammpsTrace {
        run_id: "surrogate".to_string(),
        nist_potential_id: "surrogate".to_string(),
        potential_doi: "surrogate".to_string(),
        pair_style: "surrogate".to_string(),
        lammps_version: "surrogate".to_string(),
        input_script_hash: "0".to_string(),
        potential_file_hash: "0".to_string(),
        output_log_hash: "0".to_string(),
        crystal_structure: "surrogate".to_string(),
        lattice_constant: 0.0,
        temperature: 0.0,
        properties: vec!["C11".to_string(), "C12".to_string(), "C44".to_string()],
    }
}

/// Build `ComputationResult`s for one structure from surrogate families.
pub fn build_structure_results(
    structure: &str,
    reference: &HashMap<&str, [f64; 3]>,
    families: &[SurrogateFamily],
) -> Vec<ComputationResult> {
    let mut results = Vec::new();
    for family in families {
        for element in reference.keys() {
            if let Some(pred_vals) = family.predictions.get(*element) {
                let id = format!("{}-{}-{}", element, structure, family.name);
                results.push(ComputationResult {
                    potential: make_surrogate_potential(&id, &family.name),
                    trace: dummy_trace(),
                    c11: Some(pred_vals[0]),
                    c12: Some(pred_vals[1]),
                    c44: Some(pred_vals[2]),
                    a0: None,
                    ecoh: None,
                    success: true,
                    error_message: None,
                });
            }
        }
    }
    results
}

/// Build reference target vector for an element.
pub fn element_target(element: &str, structure: &str) -> Option<DVector<f64>> {
    let map: HashMap<&str, [f64; 3]> = match structure {
        "fcc" => validation::fcc_reference_data(),
        "bcc" => validation::bcc_reference_data(),
        _ => return None,
    };
    map.get(element)
        .map(|v| DVector::from_vec(vec![v[0], v[1], v[2]]))
}

/// Class key for a sample.
fn class_key(element: &str, structure: &str, strategy: ClassStrategy) -> String {
    match strategy {
        ClassStrategy::ByElement => element.to_string(),
        ClassStrategy::ByElementStructure => format!("{}-{}", element, structure),
    }
}

/// Run a surrogate multi-element campaign and produce a failure scorecard.
///
/// The scorecard is sorted from worst (largest max residual) to best.
pub fn run_surrogate_campaign(strategy: ClassStrategy, threshold: f64) -> Vec<ScorecardRow> {
    let fcc_ref = validation::fcc_reference_data();
    let bcc_ref = validation::bcc_reference_data();
    let fcc_families = fcc_surrogate_families();
    let bcc_families = bcc_surrogate_families();

    let fcc_results = build_structure_results("fcc", &fcc_ref, &fcc_families);
    let bcc_results = build_structure_results("bcc", &bcc_ref, &bcc_families);

    // Group all results by class.
    let mut by_class: HashMap<String, (String, String, Vec<ComputationResult>)> = HashMap::new();
    for r in fcc_results.into_iter().chain(bcc_results) {
        let element = r
            .potential
            .id
            .split('-')
            .next()
            .unwrap_or("unknown")
            .to_string();
        let structure = if r.potential.id.contains("-fcc-") {
            "fcc".to_string()
        } else {
            "bcc".to_string()
        };
        let key = class_key(&element, &structure, strategy);
        let entry = by_class
            .entry(key.clone())
            .or_insert_with(|| (element, structure, Vec::new()));
        entry.2.push(r);
    }

    let mut rows = Vec::new();

    for (class, (element, structure, results)) in by_class {
        let target = match element_target(&element, &structure) {
            Some(t) => t,
            None => continue,
        };

        let feedback = ElasticFeedbackRun::fit(&results, target, class.clone());
        let batch = feedback.correct_batch(&results, threshold);

        let mut outliers = Vec::new();
        for (idx, _id, _rnorm) in &batch.outliers {
            outliers.push(results[*idx].potential.id.clone());
        }

        let mean_residual = if batch.corrected.is_empty() {
            0.0
        } else {
            batch.corrected.iter().map(|c| c.residual_norm).sum::<f64>()
                / batch.corrected.len() as f64
        };

        rows.push(ScorecardRow {
            class,
            element,
            structure,
            n_potentials: batch.n,
            max_residual: batch
                .corrected
                .iter()
                .map(|c| c.residual_norm)
                .fold(0.0, f64::max),
            mean_residual,
            outlier_count: batch.outlier_count(),
            outliers,
        });
    }

    rows.sort_by(|a, b| {
        b.max_residual
            .partial_cmp(&a.max_residual)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    rows
}

/// Run both class strategies and compare them.
pub fn compare_class_strategies(threshold: f64) -> (Vec<ScorecardRow>, Vec<ScorecardRow>) {
    (
        run_surrogate_campaign(ClassStrategy::ByElement, threshold),
        run_surrogate_campaign(ClassStrategy::ByElementStructure, threshold),
    )
}

/// Run a surrogate campaign with adaptive PCA rank per class.
///
/// For each class, the operator starts at rank 1 and increases the subspace
/// dimension until either zero outliers remain or `max_rank` is reached.  This
/// directly addresses failure modes where a rank-2 subspace is insufficient.
pub fn run_surrogate_campaign_adaptive(
    strategy: ClassStrategy,
    threshold: f64,
    max_rank: usize,
) -> Vec<ScorecardRow> {
    run_surrogate_campaign_with_fit_fn(strategy, threshold, |results, target, class| {
        ElasticFeedbackRun::fit_adaptive(results, target, class, max_rank, threshold)
    })
}

/// Run a surrogate campaign with hierarchical correction.
///
/// A global correction subspace is learned across all samples, then each class
/// learns a residual subspace on the globally corrected predictions.  This
/// addresses the small-sample failure mode where individual classes have too
/// few potentials to span the residual space.
pub fn run_surrogate_campaign_hierarchical(
    strategy: ClassStrategy,
    threshold: f64,
    global_rank: usize,
    class_rank: usize,
) -> Vec<ScorecardRow> {
    run_surrogate_campaign_with_fit_fn(strategy, threshold, |results, target, class| {
        ElasticFeedbackRun::fit_hierarchical(results, target, class, global_rank, class_rank)
    })
}

fn run_surrogate_campaign_with_fit_fn(
    strategy: ClassStrategy,
    threshold: f64,
    fit_fn: impl Fn(&[ComputationResult], DVector<f64>, String) -> ElasticFeedbackRun,
) -> Vec<ScorecardRow> {
    let fcc_ref = validation::fcc_reference_data();
    let bcc_ref = validation::bcc_reference_data();
    let fcc_families = fcc_surrogate_families();
    let bcc_families = bcc_surrogate_families();

    let fcc_results = build_structure_results("fcc", &fcc_ref, &fcc_families);
    let bcc_results = build_structure_results("bcc", &bcc_ref, &bcc_families);

    let mut by_class: HashMap<String, (String, String, Vec<ComputationResult>)> = HashMap::new();
    for r in fcc_results.into_iter().chain(bcc_results) {
        let element = r
            .potential
            .id
            .split('-')
            .next()
            .unwrap_or("unknown")
            .to_string();
        let structure = if r.potential.id.contains("-fcc-") {
            "fcc".to_string()
        } else {
            "bcc".to_string()
        };
        let key = class_key(&element, &structure, strategy);
        let entry = by_class
            .entry(key.clone())
            .or_insert_with(|| (element, structure, Vec::new()));
        entry.2.push(r);
    }

    let mut rows = Vec::new();

    for (class, (element, structure, results)) in by_class {
        let target = match element_target(&element, &structure) {
            Some(t) => t,
            None => continue,
        };

        let feedback = fit_fn(&results, target, class.clone());
        let batch = feedback.correct_batch(&results, threshold);

        let mut outliers = Vec::new();
        for (idx, _id, _rnorm) in &batch.outliers {
            outliers.push(results[*idx].potential.id.clone());
        }

        let mean_residual = if batch.corrected.is_empty() {
            0.0
        } else {
            batch.corrected.iter().map(|c| c.residual_norm).sum::<f64>()
                / batch.corrected.len() as f64
        };

        rows.push(ScorecardRow {
            class,
            element,
            structure,
            n_potentials: batch.n,
            max_residual: batch
                .corrected
                .iter()
                .map(|c| c.residual_norm)
                .fold(0.0, f64::max),
            mean_residual,
            outlier_count: batch.outlier_count(),
            outliers,
        });
    }

    rows.sort_by(|a, b| {
        b.max_residual
            .partial_cmp(&a.max_residual)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    rows
}

/// Parse the potential family from a surrogate potential id.
fn family_of(result: &ComputationResult) -> String {
    result
        .potential
        .id
        .split('-')
        .nth(2)
        .unwrap_or("unknown")
        .to_string()
}

/// Fit one global correction operator per potential family across the whole
/// periodic-table surrogate dataset.
fn fit_family_operators(
    all_results: &[ComputationResult],
    family_rank: usize,
) -> HashMap<String, UniversalFeedbackLoop> {
    let mut by_family: HashMap<String, Vec<TrainingRow>> = HashMap::new();
    let zero_shift = nalgebra::DVector::zeros(3);

    for r in all_results {
        let family = family_of(r);
        let parts: Vec<&str> = r.potential.id.split('-').collect();
        let element = parts.first().copied().unwrap_or("unknown");
        let structure = parts.get(1).copied().unwrap_or("unknown");
        let Some(target) = element_target(element, structure) else {
            continue;
        };
        let Some(raw) = elastic_vector(r) else {
            continue;
        };
        by_family
            .entry(family.clone())
            .or_default()
            .push(TrainingRow {
                class: family,
                raw,
                shift: zero_shift.clone(),
                target,
            });
    }

    let mut operators = HashMap::new();
    for (family, rows) in by_family {
        let op =
            UniversalFeedbackLoop::fit(&rows, DirectionPolicy::LearnedPca { rank: family_rank });
        operators.insert(family, op);
    }
    operators
}

/// Apply a family-level correction to every result, returning new results whose
/// raw elastic constants are the family-corrected predictions.
fn apply_family_corrections(
    results: &[ComputationResult],
    family_ops: &HashMap<String, UniversalFeedbackLoop>,
) -> Vec<ComputationResult> {
    let zero_shift = nalgebra::DVector::zeros(3);

    results
        .iter()
        .filter_map(|r| {
            let family = family_of(r);
            let op = family_ops.get(&family)?;
            let parts: Vec<&str> = r.potential.id.split('-').collect();
            let element = parts.first().copied().unwrap_or("unknown");
            let structure = parts.get(1).copied().unwrap_or("unknown");
            let target = element_target(element, structure)?;
            let raw = elastic_vector(r)?;
            let corrected = op.correct(&family, &raw, &zero_shift, &target);
            Some(ComputationResult {
                potential: r.potential.clone(),
                trace: r.trace.clone(),
                c11: Some(corrected[0]),
                c12: Some(corrected[1]),
                c44: Some(corrected[2]),
                a0: r.a0,
                ecoh: r.ecoh,
                success: r.success,
                error_message: r.error_message.clone(),
            })
        })
        .collect()
}

/// Run a family-then-class hierarchical surrogate campaign.
///
/// First a per-family operator is learned across all elements; then each
/// element-structure class fits a residual subspace on the family-corrected
/// predictions.  This directly targets the systematic failure mode where a
/// potential family shares a biased error geometry across the periodic table.
pub fn run_surrogate_campaign_hierarchical_by_family(
    strategy: ClassStrategy,
    threshold: f64,
    family_rank: usize,
    class_rank: usize,
) -> Vec<ScorecardRow> {
    let fcc_ref = validation::fcc_reference_data();
    let bcc_ref = validation::bcc_reference_data();
    let fcc_families = fcc_surrogate_families();
    let bcc_families = bcc_surrogate_families();

    let fcc_results = build_structure_results("fcc", &fcc_ref, &fcc_families);
    let bcc_results = build_structure_results("bcc", &bcc_ref, &bcc_families);
    let all_results: Vec<ComputationResult> = fcc_results
        .iter()
        .chain(bcc_results.iter())
        .cloned()
        .collect();

    let family_ops = fit_family_operators(&all_results, family_rank);
    let fcc_corrected = apply_family_corrections(&fcc_results, &family_ops);
    let bcc_corrected = apply_family_corrections(&bcc_results, &family_ops);

    let mut by_class: HashMap<String, (String, String, Vec<ComputationResult>)> = HashMap::new();
    for r in fcc_corrected.into_iter().chain(bcc_corrected) {
        let element = r
            .potential
            .id
            .split('-')
            .next()
            .unwrap_or("unknown")
            .to_string();
        let structure = if r.potential.id.contains("-fcc-") {
            "fcc".to_string()
        } else {
            "bcc".to_string()
        };
        let key = class_key(&element, &structure, strategy);
        by_class
            .entry(key.clone())
            .or_insert_with(|| (element, structure, Vec::new()))
            .2
            .push(r);
    }

    let mut rows = Vec::new();
    for (class, (element, structure, results)) in by_class {
        let target = match element_target(&element, &structure) {
            Some(t) => t,
            None => continue,
        };

        let feedback = ElasticFeedbackRun::fit_with_policy(
            &results,
            target,
            class.clone(),
            DirectionPolicy::LearnedPcaAffine { rank: class_rank },
        );
        let batch = feedback.correct_batch(&results, threshold);

        let mut outliers = Vec::new();
        for (idx, _id, _rnorm) in &batch.outliers {
            outliers.push(results[*idx].potential.id.clone());
        }

        let mean_residual = if batch.corrected.is_empty() {
            0.0
        } else {
            batch.corrected.iter().map(|c| c.residual_norm).sum::<f64>()
                / batch.corrected.len() as f64
        };

        rows.push(ScorecardRow {
            class,
            element,
            structure,
            n_potentials: batch.n,
            max_residual: batch
                .corrected
                .iter()
                .map(|c| c.residual_norm)
                .fold(0.0, f64::max),
            mean_residual,
            outlier_count: batch.outlier_count(),
            outliers,
        });
    }

    rows.sort_by(|a, b| {
        b.max_residual
            .partial_cmp(&a.max_residual)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    rows
}

/// Extract the [C11, C12, C44] vector from a computation result.
fn elastic_vector(result: &ComputationResult) -> Option<nalgebra::DVector<f64>> {
    match (result.c11, result.c12, result.c44) {
        (Some(c11), Some(c12), Some(c44)) => Some(nalgebra::DVector::from_vec(vec![c11, c12, c44])),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scorecard_covers_all_elements() {
        let rows = run_surrogate_campaign(ClassStrategy::ByElementStructure, 10.0);
        // 8 FCC + 7 BCC = 15 element-structure classes.
        assert_eq!(rows.len(), 15);
    }

    #[test]
    fn test_element_structure_beats_element_only() {
        let threshold = 5.0;
        let (by_element, by_element_structure) = compare_class_strategies(threshold);

        let total_outliers_by_element: usize = by_element.iter().map(|r| r.outlier_count).sum();
        let total_outliers_by_es: usize =
            by_element_structure.iter().map(|r| r.outlier_count).sum();

        // Splitting by structure should not make things worse and usually helps
        // because FCC and BCC errors have different geometry.
        assert!(
            total_outliers_by_es <= total_outliers_by_element,
            "element-structure classes should reduce total outliers: es={}, e={}",
            total_outliers_by_es,
            total_outliers_by_element
        );
    }

    #[test]
    fn test_adaptive_rank_reduces_outliers() {
        let threshold = 1.0;
        let fixed = run_surrogate_campaign(ClassStrategy::ByElementStructure, threshold);
        let adaptive =
            run_surrogate_campaign_adaptive(ClassStrategy::ByElementStructure, threshold, 3);

        let fixed_total: usize = fixed.iter().map(|r| r.outlier_count).sum();
        let adaptive_total: usize = adaptive.iter().map(|r| r.outlier_count).sum();

        assert!(
            adaptive_total <= fixed_total,
            "adaptive rank should not increase outliers: adaptive={}, fixed={}",
            adaptive_total,
            fixed_total
        );
    }

    #[test]
    fn test_worst_class_is_reported() {
        let rows = run_surrogate_campaign(ClassStrategy::ByElementStructure, 1.0);
        assert!(!rows.is_empty());
        // The worst class should have the largest max residual.
        let worst = &rows[0];
        for row in &rows {
            assert!(worst.max_residual >= row.max_residual);
        }
    }

    #[test]
    fn test_family_hierarchical_reduces_outliers() {
        let threshold = 1.0;
        let fixed = run_surrogate_campaign(ClassStrategy::ByElementStructure, threshold);
        let hierarchical = run_surrogate_campaign_hierarchical_by_family(
            ClassStrategy::ByElementStructure,
            threshold,
            2,
            2,
        );

        let fixed_total: usize = fixed.iter().map(|r| r.outlier_count).sum();
        let hierarchical_total: usize = hierarchical.iter().map(|r| r.outlier_count).sum();

        assert!(
            hierarchical_total < fixed_total,
            "family hierarchical correction should reduce outliers: hierarchical={}, fixed={}",
            hierarchical_total,
            fixed_total
        );
    }

    #[test]
    fn test_family_hierarchical_drives_outliers_to_zero() {
        let threshold = 1.0;
        let hierarchical = run_surrogate_campaign_hierarchical_by_family(
            ClassStrategy::ByElementStructure,
            threshold,
            2,
            2,
        );

        let total: usize = hierarchical.iter().map(|r| r.outlier_count).sum();
        assert_eq!(
            total, 0,
            "affine hierarchical correction should eliminate all outliers, got {}",
            total
        );
        assert!(hierarchical.iter().all(|r| r.is_clean()));
    }
}
