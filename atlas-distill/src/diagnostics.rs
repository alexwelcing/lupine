//! Residual diagnostics for the multi-element correction pipeline.
//!
//! Discovers systematic failure modes by clustering corrected residuals across
//! elements, structures, and potential families, and produces a human-readable
//! diagnostic report.

use nalgebra::DMatrix;
use std::collections::HashMap;

use crate::feedback_loop::CorrectedResult;
use crate::multi_element::{run_surrogate_campaign, ClassStrategy, ScorecardRow};
use crate::stats;

/// A single residual vector and its metadata.
#[derive(Debug, Clone)]
pub struct ResidualPoint {
    pub element: String,
    pub structure: String,
    pub potential_family: String,
    /// `target - corrected` in [C11, C12, C44] space.
    pub residual: [f64; 3],
    pub norm: f64,
}

/// Diagnostic report generated from a multi-element campaign.
#[derive(Debug, Clone)]
pub struct DiagnosticReport {
    pub n_samples: usize,
    pub n_outliers: usize,
    pub outlier_threshold: f64,
    pub per_structure_outliers: HashMap<String, usize>,
    pub per_family_outliers: HashMap<String, usize>,
    pub worst_classes: Vec<ScorecardRow>,
    pub pca_eigenvalues: Vec<f64>,
    pub pca_first_component: Vec<f64>,
}

impl DiagnosticReport {
    /// True when no systematic outliers remain.
    pub fn is_clean(&self) -> bool {
        self.n_outliers == 0
    }

    /// Pretty-print a short summary.
    pub fn summary(&self) -> String {
        let mut s = String::new();
        s.push_str(&format!(
            "Diagnostic report: {} samples, {} outliers (threshold = {} GPa)\n",
            self.n_samples, self.n_outliers, self.outlier_threshold
        ));
        s.push_str("Outliers by structure:\n");
        for (structure, count) in &self.per_structure_outliers {
            s.push_str(&format!("  {}: {}\n", structure, count));
        }
        s.push_str("Outliers by potential family:\n");
        for (family, count) in &self.per_family_outliers {
            s.push_str(&format!("  {}: {}\n", family, count));
        }
        if let Some(worst) = self.worst_classes.first() {
            s.push_str(&format!(
                "Worst class: {} (max residual = {:.2} GPa)\n",
                worst.class, worst.max_residual
            ));
        }
        if !self.pca_eigenvalues.is_empty() {
            let total: f64 = self.pca_eigenvalues.iter().sum();
            let ratio = if total > 0.0 {
                self.pca_eigenvalues[0] / total
            } else {
                0.0
            };
            s.push_str(&format!(
                "PCA: first component explains {:.1}% of residual variance\n",
                ratio * 100.0
            ));
        }
        s
    }
}

/// Extract residual points from a collection of corrected results.
///
/// `potential_family` is parsed from `potential.id` of the form
/// `<element>-<structure>-<family>`.
pub fn extract_residual_points(corrected: &[CorrectedResult]) -> Vec<ResidualPoint> {
    corrected
        .iter()
        .map(|c| {
            let residual_vec = &c.target - &c.corrected;
            let parts: Vec<&str> = c.potential.id.split('-').collect();
            let family = parts.get(2).copied().unwrap_or("unknown").to_string();
            ResidualPoint {
                element: c
                    .potential
                    .id
                    .split('-')
                    .next()
                    .unwrap_or("unknown")
                    .to_string(),
                structure: parts.get(1).copied().unwrap_or("unknown").to_string(),
                potential_family: family,
                residual: [residual_vec[0], residual_vec[1], residual_vec[2]],
                norm: c.residual_norm,
            }
        })
        .collect()
}

/// Run diagnostics on the surrogate multi-element campaign.
pub fn run_diagnostics(threshold: f64) -> DiagnosticReport {
    let rows = run_surrogate_campaign(ClassStrategy::ByElementStructure, threshold);

    // Collect all residual points from scorecard rows.
    let mut points: Vec<ResidualPoint> = Vec::new();
    let mut per_structure: HashMap<String, usize> = HashMap::new();
    let mut per_family: HashMap<String, usize> = HashMap::new();

    for row in &rows {
        *per_structure.entry(row.structure.clone()).or_default() += row.outlier_count;
        // Parse family names from outlier ids.
        for outlier_id in &row.outliers {
            let family = outlier_id
                .split('-')
                .nth(2)
                .unwrap_or("unknown")
                .to_string();
            *per_family.entry(family).or_default() += 1;
        }
    }

    // For PCA, we need residual vectors. Re-run a per-class campaign to gather them.
    // This is cheap: the surrogate dataset is tiny.
    let class_points = collect_all_residual_points(threshold);
    points.extend(class_points);

    let (eigenvalues, eigenvectors) = pca_on_residuals(&points);
    let first_component = if eigenvectors.nrows() > 0 {
        eigenvectors.column(0).iter().copied().collect()
    } else {
        vec![]
    };

    DiagnosticReport {
        n_samples: points.len(),
        n_outliers: points.iter().filter(|p| p.norm > threshold).count(),
        outlier_threshold: threshold,
        per_structure_outliers: per_structure,
        per_family_outliers: per_family,
        worst_classes: rows,
        pca_eigenvalues: eigenvalues.iter().copied().collect(),
        pca_first_component: first_component,
    }
}

/// Recompute corrected results for every surrogate sample and return residual points.
fn collect_all_residual_points(_threshold: f64) -> Vec<ResidualPoint> {
    use crate::feedback_loop::ElasticFeedbackRun;
    use crate::multi_element::{
        bcc_surrogate_families, build_structure_results, element_target, fcc_surrogate_families,
    };
    use crate::validation;

    let fcc_ref = validation::fcc_reference_data();
    let bcc_ref = validation::bcc_reference_data();
    let fcc_results = build_structure_results("fcc", &fcc_ref, &fcc_surrogate_families());
    let bcc_results = build_structure_results("bcc", &bcc_ref, &bcc_surrogate_families());

    // Group by element-structure and correct.
    let mut by_class: HashMap<String, (String, String, Vec<crate::runner::ComputationResult>)> =
        HashMap::new();
    for r in fcc_results.into_iter().chain(bcc_results) {
        let element = r
            .potential
            .id
            .split('-')
            .next()
            .unwrap_or("unknown")
            .to_string();
        let structure = if r.potential.id.contains("-fcc-") {
            "fcc"
        } else {
            "bcc"
        }
        .to_string();
        let key = format!("{}-{}", element, structure);
        by_class
            .entry(key)
            .or_insert_with(|| (element, structure, Vec::new()))
            .2
            .push(r);
    }

    let mut points = Vec::new();
    for (class, (element, structure, results)) in by_class {
        if let Some(target) = element_target(&element, &structure) {
            let feedback = ElasticFeedbackRun::fit(&results, target, class);
            for result in &results {
                if let Some(c) = feedback.correct(result) {
                    let family = result.potential.id.split('-').nth(2).unwrap_or("unknown");
                    let residual_vec = &c.target - &c.corrected;
                    points.push(ResidualPoint {
                        element: element.clone(),
                        structure: structure.clone(),
                        potential_family: family.to_string(),
                        residual: [residual_vec[0], residual_vec[1], residual_vec[2]],
                        norm: c.residual_norm,
                    });
                }
            }
        }
    }
    points
}

/// Run PCA on residual vectors.
fn pca_on_residuals(points: &[ResidualPoint]) -> (nalgebra::DVector<f64>, nalgebra::DMatrix<f64>) {
    if points.is_empty() {
        return (nalgebra::DVector::zeros(0), nalgebra::DMatrix::zeros(0, 0));
    }
    let n = points.len();
    let mat = DMatrix::from_fn(n, 3, |i, j| points[i].residual[j]);
    stats::pca(&mat)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_diagnostics_runs() {
        let report = run_diagnostics(5.0);
        // We expect at least one sample.
        assert!(report.n_samples > 0);
        // Worst classes should be non-empty and sorted.
        assert!(!report.worst_classes.is_empty());
        for i in 1..report.worst_classes.len() {
            assert!(
                report.worst_classes[i - 1].max_residual >= report.worst_classes[i].max_residual
            );
        }
    }

    #[test]
    fn test_residual_points_extracted() {
        use crate::feedback_loop::CorrectedResult;
        use crate::nist::NistPotential;
        use crate::runner::LammpsTrace;
        use nalgebra::DVector;

        let c = CorrectedResult {
            potential: NistPotential {
                id: "Al-fcc-EAM".to_string(),
                potid: "Al-fcc-EAM".to_string(),
                pair_style: "eam".to_string(),
                units: "metal".to_string(),
                atom_style: "atomic".to_string(),
                status: String::new(),
                elements: vec!["Al".to_string()],
                symbols: vec!["Al".to_string()],
                dois: vec![],
                url: String::new(),
                poturl: String::new(),
                artifacts: vec![],
                file_count: 0,
            },
            trace: LammpsTrace {
                run_id: "t".to_string(),
                nist_potential_id: "t".to_string(),
                potential_doi: "t".to_string(),
                pair_style: "t".to_string(),
                lammps_version: "t".to_string(),
                input_script_hash: "0".to_string(),
                potential_file_hash: "0".to_string(),
                output_log_hash: "0".to_string(),
                crystal_structure: "fcc".to_string(),
                lattice_constant: 4.05,
                temperature: 0.0,
                properties: vec!["C11".to_string(), "C12".to_string(), "C44".to_string()],
            },
            raw: DVector::from_vec(vec![100.0, 60.0, 28.0]),
            corrected: DVector::from_vec(vec![108.0, 61.0, 28.5]),
            target: DVector::from_vec(vec![108.2, 61.3, 28.5]),
            residual_norm: 0.5,
        };
        let points = extract_residual_points(&[c]);
        assert_eq!(points.len(), 1);
        assert_eq!(points[0].element, "Al");
        assert_eq!(points[0].structure, "fcc");
        assert_eq!(points[0].potential_family, "EAM");
    }
}
