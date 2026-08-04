//! Binary alloy surrogate campaign harness.
//!
//! Extends the multi-element periodic-table coverage to binary alloys, with a
//! particular focus on Mg-Li.  Reference elastic constants are drawn from the
//! literature; predictions are synthetic stand-ins that mimic the systematic
//! errors of common interatomic-potential families (EAM, LJ, MEAM-like).
//!
//! Key references:
//!   * I. S. Winter et al., Phys. Rev. Materials 1, 033606 (2017) — bcc Li-Mg
//!     elastic constants vs composition.
//!   * A. Mahata et al., Comput. Mater. Sci. 112 (2016) 371-381 — hcp Mg-Li
//!     elastic constants from MD.
//!   * W. A. Counts et al., Acta Mater. 57 (2009) 69-76 — ab initio design of
//!     bcc Mg-Li alloys.
//!   * D. Raabe et al., Mater. Sci. Eng. A 732 (2018) 327-334 — Mg-Li phase
//!     stability and elasticity across several ordered structures.

use nalgebra::DVector;
use std::collections::HashMap;

use crate::feedback_loop::{BatchCorrection, CorrectedResult, ElasticFeedbackRun};
use crate::nist::NistPotential;
use crate::runner::{ComputationResult, LammpsTrace};
use crate::universal_feedback::{DirectionPolicy, TrainingRow, UniversalFeedbackLoop};

/// One row in the alloy failure scorecard.
#[derive(Debug, Clone)]
pub struct AlloyScorecardRow {
    pub class: String,
    pub composition: String,
    pub structure: String,
    pub n_potentials: usize,
    pub max_residual: f64,
    pub mean_residual: f64,
    pub outlier_count: usize,
    pub outliers: Vec<String>,
}

impl AlloyScorecardRow {
    pub fn is_clean(&self) -> bool {
        self.outlier_count == 0
    }
}

/// Strategy for grouping alloy samples into operator classes.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AlloyClassStrategy {
    /// One class per composition (e.g., "MgLi-50").
    ByComposition,
    /// One class per composition-structure pair (e.g., "MgLi-50-bcc").
    ByCompositionStructure,
}

/// Reference elastic constants for binary alloy systems.
///
/// Values are [C11, C12, C44] in GPa.  Keys are `<system>-<structure>-<label>`.
pub fn alloy_reference_data() -> HashMap<&'static str, [f64; 3]> {
    let mut m = HashMap::new();

    // --- Mg-Li: bcc solid solution (Winter et al. 2017, Table I) ----------
    // Composition is given in at.% Mg.
    m.insert("MgLi-bcc-Li", [17.9, 13.2, 11.7]);
    m.insert("MgLi-bcc-50Mg", [39.9, 18.8, 28.6]);
    m.insert("MgLi-bcc-68.75Mg", [39.8, 25.7, 34.3]);
    m.insert("MgLi-bcc-75Mg", [38.7, 27.3, 37.8]);
    m.insert("MgLi-bcc-87.5Mg", [36.5, 31.1, 29.8]);
    m.insert("MgLi-bcc-93.75Mg", [35.0, 32.8, 29.9]);
    m.insert("MgLi-bcc-Mg", [34.0, 36.1, 28.4]);

    // --- Mg-Li: ordered / hcp phases (Raabe 2018; Mahata 2016) ----------
    // Li1Mg2 in two ordered bcc-like configurations from Raabe et al.
    m.insert("MgLi-bcc-Li1Mg2-a", [41.0, 24.0, 37.0]);
    m.insert("MgLi-bcc-Li1Mg2-b", [41.7, 24.8, 36.4]);
    // hcp Mg-Li from Mahata et al. 2016.
    m.insert("MgLi-hcp-MgLi", [55.67, 33.36, 12.89]);

    // --- Other canonical binary alloys (approximate DFT/literature values) -
    m.insert("AlCu-fcc-Al3Cu", [150.0, 100.0, 70.0]);
    m.insert("AlCu-fcc-AlCu", [135.0, 95.0, 62.0]);
    m.insert("AlCu-fcc-Cu3Al", [165.0, 115.0, 78.0]);

    m.insert("FeCr-bcc-FeCr", [280.0, 120.0, 100.0]);
    m.insert("FeCr-bcc-Cr3Fe", [320.0, 90.0, 110.0]);
    m.insert("FeCr-bcc-Fe3Cr", [260.0, 135.0, 105.0]);

    m.insert("NiAl-fcc-Ni3Al", [253.0, 153.0, 128.0]);
    m.insert("NiAl-fcc-NiAl", [210.0, 130.0, 110.0]);
    m.insert("NiAl-fcc-Al3Ni", [150.0, 95.0, 75.0]);

    m
}

/// Synthetic prediction maps for three potential families.
pub fn alloy_prediction_data(family: &str) -> HashMap<&'static str, [f64; 3]> {
    let refs = alloy_reference_data();
    let mut preds = HashMap::new();

    // Family-specific systematic errors (GPa offsets and scaling).
    let transform: fn([f64; 3]) -> [f64; 3] = match family {
        "EAM" => |[c11, c12, c44]| {
            // EAM tends to overestimate C11/C12 and underestimate C44.
            [c11 * 1.08 + 2.0, c12 * 1.05 + 1.5, c44 * 0.92 - 0.5]
        },
        "LJ" => |[c11, c12, c44]| {
            // LJ imposes the unphysical C12 = C44 constraint; distort both.
            let avg = (c12 + c44) / 2.0;
            [c11 * 0.95 - 3.0, avg * 1.10 + 2.0, avg * 0.85 - 1.0]
        },
        "MEAM" => |[c11, c12, c44]| {
            // MEAM-like predictions are closer but still biased in shear.
            [c11 * 1.02 + 0.5, c12 * 0.98 - 0.5, c44 * 1.06 + 0.5]
        },
        _ => |v| v,
    };

    for (key, vals) in refs {
        preds.insert(key, transform(vals));
    }
    preds
}

/// A surrogate potential family for alloys.
#[derive(Debug, Clone)]
pub struct AlloySurrogateFamily {
    pub name: String,
    pub predictions: HashMap<String, [f64; 3]>,
}

pub fn alloy_surrogate_families() -> Vec<AlloySurrogateFamily> {
    vec![
        AlloySurrogateFamily {
            name: "EAM".to_string(),
            predictions: alloy_prediction_data("EAM")
                .into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect(),
        },
        AlloySurrogateFamily {
            name: "LJ".to_string(),
            predictions: alloy_prediction_data("LJ")
                .into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect(),
        },
        AlloySurrogateFamily {
            name: "MEAM".to_string(),
            predictions: alloy_prediction_data("MEAM")
                .into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect(),
        },
    ]
}

fn make_alloy_potential(id: &str, pair_style: &str) -> NistPotential {
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

fn dummy_alloy_trace() -> LammpsTrace {
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

/// Parse the canonical key into (system, structure, composition).
///
/// The composition itself may contain '-' (e.g. `Li1Mg2-a`), so we split only
/// on the first two dashes.
fn parse_alloy_key(key: &str) -> Option<(&str, &str, &str)> {
    let first = key.find('-')?;
    let system = &key[..first];
    let rest = &key[first + 1..];
    let second = rest.find('-')?;
    let structure = &rest[..second];
    let composition = &rest[second + 1..];
    Some((system, structure, composition))
}

/// Build `ComputationResult`s for all alloys from surrogate families.
pub fn build_alloy_results(families: &[AlloySurrogateFamily]) -> Vec<ComputationResult> {
    let refs = alloy_reference_data();
    let mut results = Vec::new();

    for family in families {
        for key in refs.keys() {
            if let Some(pred) = family.predictions.get(*key) {
                let id = format!("{}-{}", key, family.name);
                results.push(ComputationResult {
                    potential: make_alloy_potential(&id, &family.name),
                    trace: dummy_alloy_trace(),
                    c11: Some(pred[0]),
                    c12: Some(pred[1]),
                    c44: Some(pred[2]),
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

/// Reference target vector for an alloy key.
pub fn alloy_target(key: &str) -> Option<DVector<f64>> {
    alloy_reference_data()
        .get(key)
        .map(|v| DVector::from_vec(vec![v[0], v[1], v[2]]))
}

fn class_key(composition: &str, structure: &str, strategy: AlloyClassStrategy) -> String {
    match strategy {
        AlloyClassStrategy::ByComposition => composition.to_string(),
        AlloyClassStrategy::ByCompositionStructure => format!("{}-{}", composition, structure),
    }
}

fn parse_result_id(id: &str) -> Option<(String, String, String, String)> {
    // id = "<reference_key>-<family>"; family names contain no '-'.
    let pos = id.rfind('-')?;
    let ref_key = &id[..pos];
    let family = &id[pos + 1..];
    let (system, structure, composition) = parse_alloy_key(ref_key)?;
    Some((
        system.to_string(),
        structure.to_string(),
        composition.to_string(),
        family.to_string(),
    ))
}

fn target_for_result(r: &ComputationResult) -> Option<DVector<f64>> {
    let pos = r.potential.id.rfind('-')?;
    let ref_key = &r.potential.id[..pos];
    alloy_target(ref_key)
}

/// Run an alloy surrogate campaign and return a failure scorecard.
pub fn run_alloy_surrogate_campaign(
    strategy: AlloyClassStrategy,
    threshold: f64,
) -> Vec<AlloyScorecardRow> {
    run_alloy_campaign_with_fit_fn(strategy, threshold, |results, target, class| {
        ElasticFeedbackRun::fit_with_policy(
            results,
            target,
            class,
            DirectionPolicy::LearnedPcaAffine { rank: 2 },
        )
    })
}

fn run_alloy_campaign_with_fit_fn(
    strategy: AlloyClassStrategy,
    threshold: f64,
    fit_fn: impl Fn(&[ComputationResult], DVector<f64>, String) -> ElasticFeedbackRun,
) -> Vec<AlloyScorecardRow> {
    let families = alloy_surrogate_families();
    let results = build_alloy_results(&families);

    let mut by_class: HashMap<String, (String, String, Vec<ComputationResult>)> = HashMap::new();
    for r in results {
        let (_, structure, composition, _family) = match parse_result_id(&r.potential.id) {
            Some(x) => x,
            None => continue,
        };
        let key = class_key(&composition, &structure, strategy);
        by_class
            .entry(key.clone())
            .or_insert_with(|| (composition, structure, Vec::new()))
            .2
            .push(r);
    }

    let mut rows = Vec::new();
    for (class, (composition, structure, results)) in by_class {
        let target = match target_for_result(&results[0]) {
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

        rows.push(AlloyScorecardRow {
            class,
            composition,
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

/// Entry in the transferability matrix.
#[derive(Debug, Clone)]
pub struct TransferabilityEntry {
    pub train_class: String,
    pub test_class: String,
    pub n_test: usize,
    pub outlier_count: usize,
    pub baseline_outliers: usize,
    pub outlier_reduction_percent: f64,
    pub max_residual: f64,
    pub mean_residual: f64,
}

/// Transferability report: for every ordered pair of classes, fit the operator
/// on `train_class` and evaluate it on `test_class`.
pub fn alloy_transferability_report(threshold: f64) -> Vec<TransferabilityEntry> {
    let families = alloy_surrogate_families();
    let results = build_alloy_results(&families);

    let mut by_class: HashMap<String, Vec<ComputationResult>> = HashMap::new();
    for r in results {
        let (_, structure, composition, _family) = match parse_result_id(&r.potential.id) {
            Some(x) => x,
            None => continue,
        };
        let key = format!("{}-{}", composition, structure);
        by_class.entry(key).or_default().push(r);
    }

    let mut entries = Vec::new();
    let classes: Vec<String> = by_class.keys().cloned().collect();

    for train_class in &classes {
        let train_results = by_class.get(train_class).unwrap();
        // Ensure we can resolve a target for this class; otherwise skip.
        if target_for_result(&train_results[0]).is_none() {
            continue;
        }

        let operator = UniversalFeedbackLoop::fit(
            &train_results
                .iter()
                .filter_map(|r| {
                    let t = target_for_result(r)?;
                    let raw = DVector::from_vec(vec![r.c11?, r.c12?, r.c44?]);
                    Some(TrainingRow {
                        class: train_class.clone(),
                        raw,
                        shift: DVector::zeros(3),
                        target: t,
                    })
                })
                .collect::<Vec<_>>(),
            DirectionPolicy::LearnedPcaAffine { rank: 2 },
        );

        // Compute baseline (uncorrected) outliers once per train class loop.
        let mut baseline_by_class: HashMap<String, (usize, usize)> = HashMap::new();
        for test_class in &classes {
            let test_results = by_class.get(test_class).unwrap();
            let mut baseline_outliers = 0;
            let mut n = 0;
            for r in test_results {
                let raw = match (r.c11, r.c12, r.c44) {
                    (Some(a), Some(b), Some(c)) => DVector::from_vec(vec![a, b, c]),
                    _ => continue,
                };
                let target = match target_for_result(r) {
                    Some(t) => t,
                    None => continue,
                };
                let rnorm = (raw - target).norm();
                n += 1;
                if rnorm > threshold {
                    baseline_outliers += 1;
                }
            }
            baseline_by_class.insert(test_class.clone(), (baseline_outliers, n));
        }

        for test_class in &classes {
            let test_results = by_class.get(test_class).unwrap();

            let mut outlier_count = 0;
            let mut max_residual = 0.0f64;
            let mut sum_residual = 0.0f64;
            let mut n = 0;

            for r in test_results {
                let raw = match (r.c11, r.c12, r.c44) {
                    (Some(a), Some(b), Some(c)) => DVector::from_vec(vec![a, b, c]),
                    _ => continue,
                };
                let target = match target_for_result(r) {
                    Some(t) => t,
                    None => continue,
                };
                let rnorm = operator.residual_norm(train_class, &raw, &DVector::zeros(3), &target);
                max_residual = max_residual.max(rnorm);
                sum_residual += rnorm;
                n += 1;
                if rnorm > threshold {
                    outlier_count += 1;
                }
            }

            let (baseline_outliers, _) =
                baseline_by_class.get(test_class).copied().unwrap_or((0, n));
            let reduction = if baseline_outliers == 0 {
                100.0
            } else {
                (baseline_outliers.saturating_sub(outlier_count)) as f64 / baseline_outliers as f64
                    * 100.0
            };

            entries.push(TransferabilityEntry {
                train_class: train_class.clone(),
                test_class: test_class.clone(),
                n_test: n,
                outlier_count,
                baseline_outliers,
                outlier_reduction_percent: reduction,
                max_residual,
                mean_residual: if n > 0 { sum_residual / n as f64 } else { 0.0 },
            });
        }
    }

    entries
}

/// Helper to evaluate a correction operator on a set of raw results.
fn evaluate_operator_on_class(
    operator: &UniversalFeedbackLoop,
    operator_class: &str,
    results: &[ComputationResult],
    threshold: f64,
) -> BatchCorrection {
    let mut corrected = Vec::new();
    let mut outliers = Vec::new();
    let zero_shift = DVector::zeros(3);

    for (idx, r) in results.iter().enumerate() {
        let raw = match (r.c11, r.c12, r.c44) {
            (Some(a), Some(b), Some(c)) => DVector::from_vec(vec![a, b, c]),
            _ => continue,
        };
        let target = match target_for_result(r) {
            Some(t) => t,
            None => continue,
        };
        let corrected_vec = operator.correct(operator_class, &raw, &zero_shift, &target);
        let residual_norm = (&target - &corrected_vec).norm();

        corrected.push(CorrectedResult {
            potential: r.potential.clone(),
            trace: r.trace.clone(),
            raw,
            corrected: corrected_vec,
            target,
            residual_norm,
        });

        if residual_norm > threshold {
            outliers.push((idx, r.potential.id.clone(), residual_norm));
        }
    }

    BatchCorrection {
        n: corrected.len(),
        corrected,
        outliers,
        threshold,
    }
}

/// Fit a single global operator across all alloy classes and evaluate per class.
pub fn run_alloy_global_transfer_campaign(threshold: f64) -> Vec<AlloyScorecardRow> {
    let families = alloy_surrogate_families();
    let results = build_alloy_results(&families);

    let mut by_class: HashMap<String, Vec<ComputationResult>> = HashMap::new();
    for r in results {
        let (_, structure, composition, _family) = match parse_result_id(&r.potential.id) {
            Some(x) => x,
            None => continue,
        };
        let key = format!("{}-{}", composition, structure);
        by_class.entry(key).or_default().push(r);
    }

    // One global class key used for every training row.
    let global_class = "all-alloys".to_string();
    let train_rows: Vec<TrainingRow> = by_class
        .values()
        .flatten()
        .filter_map(|r| {
            let raw = DVector::from_vec(vec![r.c11?, r.c12?, r.c44?]);
            let target = target_for_result(r)?;
            Some(TrainingRow {
                class: global_class.clone(),
                raw,
                shift: DVector::zeros(3),
                target,
            })
        })
        .collect();

    let operator =
        UniversalFeedbackLoop::fit(&train_rows, DirectionPolicy::LearnedPcaAffine { rank: 3 });

    let mut rows = Vec::new();
    for (class, results) in by_class {
        let parts: Vec<&str> = class.split('-').collect();
        let (composition, structure) = (parts[0].to_string(), parts[1].to_string());
        let batch = evaluate_operator_on_class(&operator, &global_class, &results, threshold);

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

        rows.push(AlloyScorecardRow {
            class,
            composition,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_alloy_reference_data_contains_mgli() {
        let refs = alloy_reference_data();
        assert!(refs.contains_key("MgLi-bcc-50Mg"));
        assert!(refs.contains_key("MgLi-hcp-MgLi"));
    }

    #[test]
    fn test_alloy_campaign_covers_all_classes() {
        let rows = run_alloy_surrogate_campaign(AlloyClassStrategy::ByCompositionStructure, 1.0);
        // 7 bcc MgLi + 2 ordered bcc + 1 hcp + 3 AlCu + 3 FeCr + 3 NiAl = 19 classes.
        assert_eq!(rows.len(), 19);
    }

    #[test]
    fn test_global_transfer_reduces_outliers() {
        let threshold = 1.0;
        let per_class =
            run_alloy_surrogate_campaign(AlloyClassStrategy::ByCompositionStructure, threshold);
        let global = run_alloy_global_transfer_campaign(threshold);

        let per_class_total: usize = per_class.iter().map(|r| r.outlier_count).sum();
        let global_total: usize = global.iter().map(|r| r.outlier_count).sum();

        assert!(
            global_total <= per_class_total,
            "global alloy operator should not increase outliers: global={}, per-class={}",
            global_total,
            per_class_total
        );
    }

    #[test]
    fn test_transferability_report_is_square() {
        let entries = alloy_transferability_report(1.0);
        let n_classes = entries
            .iter()
            .map(|e| &e.train_class)
            .collect::<std::collections::HashSet<_>>()
            .len();
        assert_eq!(entries.len(), n_classes * n_classes);
    }
}
