//! Live LAMMPS feedback loop with the universal correction operator.
//!
//! Bridges `runner::ComputationResult` to `universal_feedback::UniversalFeedbackLoop`:
//! after a LAMMPS campaign produces raw elastic-constant predictions, this module
//! fits a class-aware correction subspace on the residuals and returns corrected,
//! provenance-aware results.

use nalgebra::DVector;

use crate::nist::NistPotential;
use crate::runner::{ComputationResult, LammpsTrace};
use crate::universal_feedback::{DirectionPolicy, TrainingRow, UniversalFeedbackLoop};

/// A corrected LAMMPS computation.
#[derive(Debug, Clone)]
pub struct CorrectedResult {
    pub potential: NistPotential,
    pub trace: LammpsTrace,
    /// Raw elastic-constant vector [C11, C12, C44] from LAMMPS.
    pub raw: DVector<f64>,
    /// Corrected elastic-constant vector.
    pub corrected: DVector<f64>,
    /// Reference (experimental) elastic-constant vector.
    pub target: DVector<f64>,
    /// Norm of the corrected residual `‖target - corrected‖`.
    pub residual_norm: f64,
}

impl CorrectedResult {
    /// True when the corrected residual is below `threshold`.
    pub fn is_within(&self, threshold: f64) -> bool {
        self.residual_norm <= threshold
    }
}

/// Stateful feedback loop for a single element / class.
#[derive(Debug, Clone)]
pub struct ElasticFeedbackRun {
    operator: UniversalFeedbackLoop,
    target: DVector<f64>,
    class: String,
    /// Optional global operator applied before the class operator.
    global_operator: Option<UniversalFeedbackLoop>,
}

impl ElasticFeedbackRun {
    /// Fit the correction operator on a set of LAMMPS results using a rank-2
    /// learned subspace.
    ///
    /// `target` is the reference elastic-constant vector [C11, C12, C44].
    /// `class` is the class key passed to the universal operator (typically the
    /// element symbol or element-structure pair).
    pub fn fit(results: &[ComputationResult], target: DVector<f64>, class: String) -> Self {
        Self::fit_with_policy(
            results,
            target,
            class,
            DirectionPolicy::LearnedPca { rank: 2 },
        )
    }

    /// Fit with an arbitrary direction policy.
    pub fn fit_with_policy(
        results: &[ComputationResult],
        target: DVector<f64>,
        class: String,
        policy: DirectionPolicy,
    ) -> Self {
        let rows: Vec<TrainingRow> = results
            .iter()
            .filter_map(|r| elastic_row(r, &target, &class))
            .collect();
        let operator = UniversalFeedbackLoop::fit(&rows, policy);
        Self {
            operator,
            target,
            class,
            global_operator: None,
        }
    }

    /// Fit adaptively: try increasing PCA rank until the class has no outliers
    /// or `max_rank` is reached.  This is one data-driven fix discovered by the
    /// diagnostics harness.
    pub fn fit_adaptive(
        results: &[ComputationResult],
        target: DVector<f64>,
        class: String,
        max_rank: usize,
        threshold: f64,
    ) -> Self {
        for rank in 1..=max_rank {
            let run = Self::fit_with_policy(
                results,
                target.clone(),
                class.clone(),
                DirectionPolicy::LearnedPca { rank },
            );
            let batch = run.correct_batch(results, threshold);
            if batch.is_zero_outliers() {
                return run;
            }
        }
        Self::fit_with_policy(
            results,
            target,
            class,
            DirectionPolicy::LearnedPca { rank: max_rank },
        )
    }

    /// Fit a hierarchical operator: first learn a global correction subspace
    /// across all `results`, then fit a class-specific subspace on the remaining
    /// residuals.  This borrows strength across classes when each class has too
    /// few samples to span the full residual space.
    pub fn fit_hierarchical(
        results: &[ComputationResult],
        target: DVector<f64>,
        class: String,
        global_rank: usize,
        class_rank: usize,
    ) -> Self {
        let zero_shift = DVector::zeros(3);

        // Global operator trained on every sample with a shared class key.
        let global_rows: Vec<TrainingRow> = results
            .iter()
            .filter_map(|r| elastic_row(r, &target, "global"))
            .collect();
        let global_operator = UniversalFeedbackLoop::fit(
            &global_rows,
            DirectionPolicy::LearnedPca { rank: global_rank },
        );

        // Class-specific operator trained on the residual left after the global
        // correction.
        let class_rows: Vec<TrainingRow> = results
            .iter()
            .filter_map(|r| {
                let raw = elastic_vector(r)?;
                let globally_corrected =
                    global_operator.correct("global", &raw, &zero_shift, &target);
                Some(TrainingRow {
                    class: class.clone(),
                    raw: globally_corrected,
                    shift: zero_shift.clone(),
                    target: target.clone(),
                })
            })
            .collect();
        let operator = UniversalFeedbackLoop::fit(
            &class_rows,
            DirectionPolicy::LearnedPca { rank: class_rank },
        );

        Self {
            operator,
            target,
            class,
            global_operator: Some(global_operator),
        }
    }

    /// Apply the learned correction to a single LAMMPS result.
    pub fn correct(&self, result: &ComputationResult) -> Option<CorrectedResult> {
        let raw = elastic_vector(result)?;
        let zero_shift = DVector::zeros(3);
        let intermediate = match &self.global_operator {
            Some(global) => global.correct("global", &raw, &zero_shift, &self.target),
            None => raw.clone(),
        };
        let corrected =
            self.operator
                .correct(&self.class, &intermediate, &zero_shift, &self.target);
        let residual_norm = (&self.target - &corrected).norm();

        Some(CorrectedResult {
            potential: result.potential.clone(),
            trace: result.trace.clone(),
            raw,
            corrected,
            target: self.target.clone(),
            residual_norm,
        })
    }

    /// Correct a batch of results and report outliers.
    pub fn correct_batch(&self, results: &[ComputationResult], threshold: f64) -> BatchCorrection {
        let mut corrected = Vec::with_capacity(results.len());
        let mut outliers = Vec::new();

        for (idx, result) in results.iter().enumerate() {
            if let Some(c) = self.correct(result) {
                if !c.is_within(threshold) {
                    outliers.push((idx, c.potential.id.clone(), c.residual_norm));
                }
                corrected.push(c);
            }
        }

        BatchCorrection {
            n: corrected.len(),
            corrected,
            outliers,
            threshold,
        }
    }
}

/// Result of correcting a batch of computations.
#[derive(Debug, Clone)]
pub struct BatchCorrection {
    pub n: usize,
    pub corrected: Vec<CorrectedResult>,
    pub outliers: Vec<(usize, String, f64)>,
    pub threshold: f64,
}

impl BatchCorrection {
    pub fn outlier_count(&self) -> usize {
        self.outliers.len()
    }

    pub fn is_zero_outliers(&self) -> bool {
        self.outliers.is_empty()
    }
}

/// Run a full LAMMPS campaign and then apply the universal correction operator.
///
/// This is the live feedback-loop entry point: every expensive LAMMPS run
/// contributes both a raw prediction and a training residual, and the operator
/// returns corrected predictions with full provenance traces.
pub fn run_corrected_campaign(
    config: &crate::runner::RunnerConfig,
) -> anyhow::Result<(Vec<crate::runner::ComputationResult>, BatchCorrection)> {
    let raw_results = crate::runner::run_campaign(config)?;

    let refs = crate::runner::reference_data();
    let reference = refs
        .get(&config.element)
        .ok_or_else(|| anyhow::anyhow!("No reference data for {}", config.element))?;
    let target = DVector::from_vec(vec![reference.c11, reference.c12, reference.c44]);

    let feedback = ElasticFeedbackRun::fit(&raw_results, target, config.element.clone());
    let threshold = 10.0; // GPa — generous for a first pass; can be tightened per element
    let batch = feedback.correct_batch(&raw_results, threshold);

    Ok((raw_results, batch))
}

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

fn elastic_vector(result: &ComputationResult) -> Option<DVector<f64>> {
    match (result.c11, result.c12, result.c44) {
        (Some(c11), Some(c12), Some(c44)) => Some(DVector::from_vec(vec![c11, c12, c44])),
        _ => None,
    }
}

fn elastic_row(
    result: &ComputationResult,
    target: &DVector<f64>,
    class: &str,
) -> Option<TrainingRow> {
    let raw = elastic_vector(result)?;
    Some(TrainingRow {
        class: class.to_string(),
        raw,
        shift: DVector::zeros(3),
        target: target.clone(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::Rng;

    fn dummy_potential(id: &str) -> NistPotential {
        NistPotential {
            id: id.to_string(),
            potid: id.to_string(),
            pair_style: "eam/alloy".to_string(),
            units: "metal".to_string(),
            atom_style: "atomic".to_string(),
            status: String::new(),
            elements: vec!["Al".to_string()],
            symbols: vec!["Al".to_string()],
            dois: vec!["10.0000/test".to_string()],
            url: String::new(),
            poturl: String::new(),
            artifacts: vec![],
            file_count: 0,
        }
    }

    fn dummy_trace() -> LammpsTrace {
        LammpsTrace {
            run_id: "run-0".to_string(),
            nist_potential_id: "test".to_string(),
            potential_doi: "10.0000/test".to_string(),
            pair_style: "eam/alloy".to_string(),
            lammps_version: "2024".to_string(),
            input_script_hash: "0".to_string(),
            potential_file_hash: "0".to_string(),
            output_log_hash: "0".to_string(),
            crystal_structure: "fcc".to_string(),
            lattice_constant: 4.05,
            temperature: 0.0,
            properties: vec!["c11".to_string(), "c12".to_string(), "c44".to_string()],
        }
    }

    fn dummy_result(id: &str, c11: f64, c12: f64, c44: f64) -> ComputationResult {
        ComputationResult {
            potential: dummy_potential(id),
            trace: dummy_trace(),
            c11: Some(c11),
            c12: Some(c12),
            c44: Some(c44),
            a0: Some(4.05),
            ecoh: Some(-3.36),
            success: true,
            error_message: None,
        }
    }

    /// Synthetic campaign where errors live in a 2-D subspace of [C11,C12,C44].
    /// The feedback loop learns that subspace and drives outliers to 0.
    #[test]
    fn test_elastic_feedback_loop_zero_outliers() {
        let target = DVector::from_vec(vec![108.2, 61.3, 28.5]); // Al reference
        let mut rng = rand::thread_rng();

        // True error subspace spanned by:
        //   d1 = [1, 1, 0]  (bulk-like)
        //   d2 = [0, 0, 1]  (shear)
        let d1 = DVector::from_vec(vec![1.0, 1.0, 0.0]);
        let d2 = DVector::from_vec(vec![0.0, 0.0, 1.0]);

        let n_train = 60;
        let mut results: Vec<ComputationResult> = Vec::with_capacity(n_train);

        for i in 0..n_train {
            // Raw prediction = reference + class-aware error in span{d1,d2} + tiny noise.
            let a1: f64 = rng.gen_range(-2.0..2.0);
            let a2: f64 = rng.gen_range(-1.5..1.5);
            let noise = DVector::from_fn(3, |_i, _| rng.gen_range(-0.05..0.05));
            let raw = &target + a1 * &d1 + a2 * &d2 + noise;
            results.push(dummy_result(&format!("pot_{}", i), raw[0], raw[1], raw[2]));
        }

        let feedback = ElasticFeedbackRun::fit(&results, target.clone(), "Al".to_string());
        let batch = feedback.correct_batch(&results, 0.5);

        assert!(
            batch.is_zero_outliers(),
            "expected 0/{} outliers, got {}. max residual ≈ {}",
            batch.n,
            batch.outlier_count(),
            batch
                .corrected
                .iter()
                .map(|c| c.residual_norm)
                .fold(0.0, f64::max)
        );
    }

    #[test]
    fn test_incomplete_elastic_result_is_skipped() {
        let target = DVector::from_vec(vec![108.2, 61.3, 28.5]);
        let mut incomplete = dummy_result("bad", 100.0, 60.0, 30.0);
        incomplete.c44 = None;

        let feedback = ElasticFeedbackRun::fit(&[incomplete.clone()], target, "Al".to_string());
        assert!(feedback.correct(&incomplete).is_none());
    }
}
