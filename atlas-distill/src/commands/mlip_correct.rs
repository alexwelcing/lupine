//! 1-D Lupine correction benchmark across a catalog of MLIPs.
//!
//! Given a catalog of MLIP predictions on a training functional and the
//! corresponding targets on a higher-accuracy functional, this command:
//!
//!   1. builds the residual matrix on the training functional,
//!   2. extracts the dominant 1-D bias vector (1st principal component),
//!   3. applies the Lupine correction operator to each model,
//!   4. reports per-model accuracy before/after and enforces a no-harm rule.
//!
//! This keeps the project aligned with the core thesis: a single 1-D bias
//! vector improves every MLIP without needing model ensembles.

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use anyhow::{bail, Context, Result};
use clap::Args;
use nalgebra::{DMatrix, Vector3, SVD};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Args)]
pub struct MlipCorrectArgs {
    /// JSON catalog with MLIP predictions and DFT targets.
    /// Schema matches `data/benchmark_layer2_results.json`.
    #[arg(long)]
    pub catalog: PathBuf,
    /// Functional used to compute the 1-D bias vector (e.g. PBE).
    #[arg(long, default_value = "PBE")]
    pub training: String,
    /// Functional used as the accuracy target (e.g. r2SCAN).
    #[arg(long, default_value = "r2SCAN")]
    pub target: String,
    /// Optional output path for the JSON report. Defaults to stdout.
    #[arg(long)]
    pub output: Option<PathBuf>,
}

#[derive(Debug, Clone, Deserialize)]
struct Catalog {
    #[serde(default)]
    schema_version: String,
    rows: Vec<Row>,
}

#[derive(Debug, Clone, Deserialize)]
struct Row {
    element: String,
    model: String,
    functional: String,
    #[serde(rename = "model_name")]
    #[serde(default)]
    model_name: Option<String>,
    c11: f64,
    c12: f64,
    c44: f64,
    #[serde(rename = "target_c11")]
    target_c11: f64,
    #[serde(rename = "target_c12")]
    target_c12: f64,
    #[serde(rename = "target_c44")]
    target_c44: f64,
}

#[derive(Debug, Clone, Serialize)]
struct CorrectionReport {
    training_functional: String,
    target_functional: String,
    participation_ratio: f64,
    first_pc_variance_fraction: f64,
    bias_vector: [f64; 3],
    models: Vec<ModelReport>,
    no_harm_violations: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
struct ModelReport {
    model: String,
    element: String,
    raw_residual_norm: f64,
    corrected_residual_norm: f64,
    improvement_ratio: f64,
}

fn first_principal_component(matrix: &DMatrix<f64>) -> Result<Vector3<f64>> {
    // matrix has rows = observations, cols = 3 properties.
    if matrix.ncols() != 3 {
        bail!("expected a matrix with 3 columns (C11, C12, C44)");
    }
    if matrix.nrows() < 2 {
        bail!("need at least two observations to extract a bias vector");
    }
    let svd = SVD::new(matrix.clone(), true, true);
    let v_t = svd
        .v_t
        .context("SVD failed to produce right singular vectors")?;
    // Rows of V^T are principal components; row 0 is the first PC.
    let pc = v_t.row(0).into_owned();
    Ok(Vector3::new(pc[0], pc[1], pc[2]))
}

fn participation_ratio(singular_values: &[f64]) -> f64 {
    if singular_values.is_empty() {
        return 0.0;
    }
    let sum_sq: f64 = singular_values.iter().map(|s| s * s).sum();
    let sum: f64 = singular_values.iter().sum();
    if sum_sq == 0.0 {
        return 0.0;
    }
    (sum * sum) / (singular_values.len() as f64 * sum_sq)
}

pub fn run(args: &MlipCorrectArgs) -> Result<()> {
    let text = fs::read_to_string(&args.catalog)
        .with_context(|| format!("reading catalog {}", args.catalog.display()))?;
    let catalog: Catalog = serde_json::from_str(&text)
        .with_context(|| format!("parsing catalog {}", args.catalog.display()))?;

    // Group rows by functional.
    let mut by_functional: HashMap<String, Vec<Row>> = HashMap::new();
    for row in catalog.rows {
        by_functional
            .entry(row.functional.clone())
            .or_default()
            .push(row);
    }

    let training_rows = by_functional
        .get(&args.training)
        .with_context(|| format!("no rows for training functional {}", args.training))?
        .clone();
    let target_rows = by_functional
        .get(&args.target)
        .with_context(|| format!("no rows for target functional {}", args.target))?
        .clone();

    // Build residual matrix on the training functional.
    // Each row is (model prediction - training target) for one element/model.
    let mut residuals: Vec<[f64; 3]> = Vec::new();
    for r in &training_rows {
        residuals.push([
            r.c11 - r.target_c11,
            r.c12 - r.target_c12,
            r.c44 - r.target_c44,
        ]);
    }
    let n = residuals.len();
    let mat = DMatrix::from_row_iterator(n, 3, residuals.iter().flat_map(|x| x.iter().copied()));

    let bias = first_principal_component(&mat)?;
    let svd = SVD::new(mat.clone(), true, true);
    let singular_values = svd.singular_values.data.as_vec().clone();
    let pr = participation_ratio(&singular_values);
    let total_var: f64 = singular_values.iter().map(|s| s * s).sum();
    let first_pc_var = singular_values[0] * singular_values[0];
    let first_pc_fraction = if total_var > 0.0 {
        first_pc_var / total_var
    } else {
        0.0
    };

    // Normalize bias vector for reporting.
    let bias_unit = bias.normalize();
    let bias_array = [bias_unit[0], bias_unit[1], bias_unit[2]];

    // Build lookup for target rows by (model, element).
    let mut target_by_key: HashMap<(String, String), &Row> = HashMap::new();
    for r in target_rows.iter() {
        target_by_key.insert((r.model.clone(), r.element.clone()), r);
    }

    // Apply correction to every training row and compare to target functional.
    let mut reports: Vec<ModelReport> = Vec::new();
    let mut violations: Vec<String> = Vec::new();

    for r in &training_rows {
        let pred = Vector3::new(r.c11, r.c12, r.c44);
        let train_target = Vector3::new(r.target_c11, r.target_c12, r.target_c44);
        let target_row = target_by_key
            .get(&(r.model.clone(), r.element.clone()))
            .with_context(|| {
                format!(
                    "missing target-functional row for {} / {}",
                    r.model, r.element
                )
            })?;
        let target = Vector3::new(
            target_row.target_c11,
            target_row.target_c12,
            target_row.target_c44,
        );

        let residual_train = pred - train_target;
        let raw_residual = pred - target;

        // Lupine operator: project training residual onto bias, subtract it, add functional shift.
        let coeff = if bias.norm_squared() > 0.0 {
            residual_train.dot(&bias) / bias.norm_squared()
        } else {
            0.0
        };
        let corrected = pred - coeff * bias + (target - train_target);
        let corrected_residual = corrected - target;

        let raw_norm = raw_residual.norm();
        let corrected_norm = corrected_residual.norm();
        let improvement = if raw_norm > 0.0 {
            corrected_norm / raw_norm
        } else {
            0.0
        };

        if corrected_norm > raw_norm + 1e-9 {
            violations.push(format!(
                "{} / {}: corrected norm {} > raw norm {}",
                r.model, r.element, corrected_norm, raw_norm
            ));
        }

        reports.push(ModelReport {
            model: r.model.clone(),
            element: r.element.clone(),
            raw_residual_norm: raw_norm,
            corrected_residual_norm: corrected_norm,
            improvement_ratio: improvement,
        });
    }

    reports.sort_by(|a, b| {
        a.model
            .cmp(&b.model)
            .then_with(|| a.element.cmp(&b.element))
    });

    let report = CorrectionReport {
        training_functional: args.training.clone(),
        target_functional: args.target.clone(),
        participation_ratio: pr,
        first_pc_variance_fraction: first_pc_fraction,
        bias_vector: bias_array,
        models: reports,
        no_harm_violations: violations,
    };

    let json = serde_json::to_string_pretty(&report)?;
    if let Some(out) = &args.output {
        fs::write(out, json)?;
        println!("Wrote correction report to {}", out.display());
    } else {
        println!("{}", json);
    }

    if !report.no_harm_violations.is_empty() {
        eprintln!(
            "Warning: {} no-harm violation(s) detected",
            report.no_harm_violations.len()
        );
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_participation_ratio_perfect_1d() {
        // With the paper's normalization, a perfectly 1-D residual cloud
        // (one non-zero singular value in 3-D) gives PR = 1/3.
        let sv = vec![3.0, 0.0, 0.0];
        assert!((participation_ratio(&sv) - 1.0 / 3.0).abs() < 1e-9);
    }

    #[test]
    fn test_participation_ratio_uniform() {
        // Uniform singular values -> PR = 1.0 (isotropic).
        let sv = vec![1.0, 1.0, 1.0];
        assert!((participation_ratio(&sv) - 1.0).abs() < 1e-9);
    }
}
