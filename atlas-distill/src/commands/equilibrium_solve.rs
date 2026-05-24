//! Equilibrium-solve baseline scoring for offset lattice relaxations.
//!
//! MLIP runners own the calculator and relaxation loop. Rust owns the sealed
//! reference contract, convergence scoring, anytime gain curve, failure class,
//! and viewer-ready artifact.

use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{bail, Context, Result};
use clap::Args;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Args)]
pub struct EquilibriumSolveArgs {
    /// JSON trajectory emitted by a local/GCP/HPC MLIP runner.
    #[arg(long)]
    pub trajectory: PathBuf,
    /// Optional score output. If omitted, writes pretty JSON to stdout.
    #[arg(long)]
    pub output: Option<PathBuf>,
    /// Step window used to measure marginal value of extra compute.
    #[arg(long, default_value_t = 200)]
    pub continuation_window_steps: usize,
    /// Normalized distance threshold for a solved equilibrium.
    ///
    /// The distance is averaged over normalized lattice/energy/force/stress
    /// components. A default of 0.5 means the final state is, on average,
    /// within half of the configured physical tolerances.
    #[arg(long, default_value_t = 0.5)]
    pub solved_distance_threshold: f64,
}

#[derive(Debug, Clone, Deserialize)]
struct EquilibriumTrajectory {
    #[serde(default)]
    schema: Option<String>,
    #[serde(default)]
    run_id: Option<String>,
    #[serde(default)]
    cell_id: Option<String>,
    #[serde(default)]
    variant_id: Option<String>,
    #[serde(default)]
    mlip_id: Option<String>,
    material_id: String,
    reference: EquilibriumReference,
    #[serde(default)]
    perturbation: Option<Value>,
    #[serde(default)]
    convergence: Option<ConvergenceSpec>,
    frames: Vec<EquilibriumFrame>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct EquilibriumReference {
    #[serde(default)]
    source: Option<String>,
    #[serde(default)]
    source_url: Option<String>,
    #[serde(default)]
    lattice_a_angstrom: Option<f64>,
    #[serde(default)]
    cell_angstrom: Option<Vec<Vec<f64>>>,
    #[serde(default)]
    positions_angstrom: Option<Vec<Vec<f64>>>,
    #[serde(default)]
    energy_ev_per_atom: Option<f64>,
    #[serde(default)]
    stress_gpa: Option<Vec<f64>>,
}

#[derive(Debug, Clone, Deserialize)]
struct ConvergenceSpec {
    #[serde(default)]
    force_threshold_ev_per_angstrom: Option<f64>,
    #[serde(default)]
    stress_threshold_gpa: Option<f64>,
    #[serde(default)]
    max_steps: Option<usize>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct EquilibriumFrame {
    step: usize,
    #[serde(default)]
    time_seconds: Option<f64>,
    #[serde(default)]
    force_calls: Option<usize>,
    #[serde(default)]
    lattice_a_angstrom: Option<f64>,
    #[serde(default)]
    cell_angstrom: Option<Vec<Vec<f64>>>,
    #[serde(default)]
    positions_angstrom: Option<Vec<Vec<f64>>>,
    #[serde(default)]
    energy_ev_per_atom: Option<f64>,
    #[serde(default)]
    forces_ev_per_angstrom: Option<Vec<Vec<f64>>>,
    #[serde(default)]
    stress_gpa: Option<Vec<f64>>,
    #[serde(default)]
    relaxation_converged: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
struct EquilibriumSolveReport {
    schema: String,
    run_id: Option<String>,
    cell_id: Option<String>,
    variant_id: Option<String>,
    mlip_id: Option<String>,
    material_id: String,
    reference: EquilibriumReference,
    perturbation: Option<Value>,
    score: EquilibriumScore,
    anytime_curve: Vec<CurvePoint>,
    viewer_artifact: ViewerArtifact,
    hyperribbon_evidence: HyperribbonEvidence,
}

#[derive(Debug, Clone, Serialize)]
struct EquilibriumScore {
    verdict: String,
    failure_class: String,
    start_distance: f64,
    final_distance: f64,
    best_distance: f64,
    final_closeness: f64,
    best_closeness: f64,
    improvement_fraction: f64,
    elapsed_seconds: Option<f64>,
    steps: usize,
    force_calls: Option<usize>,
    final_force_max_norm_ev_per_angstrom: Option<f64>,
    final_stress_rmse_gpa: Option<f64>,
    final_lattice_error_angstrom: Option<f64>,
    final_position_rmse_angstrom: Option<f64>,
    continuation_window_steps: usize,
    continuation_gain_fraction: Option<f64>,
    plateau_detected: bool,
}

#[derive(Debug, Clone, Serialize)]
struct CurvePoint {
    step: usize,
    time_seconds: Option<f64>,
    force_calls: Option<usize>,
    distance_to_reference: f64,
    closeness: f64,
    force_max_norm_ev_per_angstrom: Option<f64>,
    stress_rmse_gpa: Option<f64>,
    lattice_error_angstrom: Option<f64>,
    position_rmse_angstrom: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
struct ViewerArtifact {
    schema: String,
    material_id: String,
    mlip_id: Option<String>,
    reference: EquilibriumReference,
    frames: Vec<ViewerFrame>,
}

#[derive(Debug, Clone, Serialize)]
struct ViewerFrame {
    step: usize,
    time_seconds: Option<f64>,
    distance_to_reference: f64,
    closeness: f64,
    cell_angstrom: Option<Vec<Vec<f64>>>,
    positions_angstrom: Option<Vec<Vec<f64>>>,
    force_max_norm_ev_per_angstrom: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
struct HyperribbonEvidence {
    schema: String,
    evidence_kind: String,
    fault_line: String,
    continuation_value_kind: String,
    continuation_window_steps: usize,
    continuation_gain_fraction: Option<f64>,
    plateau_detected: bool,
    distance_components: Vec<String>,
}

#[derive(Debug, Clone)]
struct ScoredFrame {
    frame: EquilibriumFrame,
    distance: f64,
    closeness: f64,
    force_max_norm: Option<f64>,
    stress_rmse: Option<f64>,
    lattice_error: Option<f64>,
    position_rmse: Option<f64>,
}

const LATTICE_TOLERANCE_ANGSTROM: f64 = 0.02;
const POSITION_TOLERANCE_ANGSTROM: f64 = 0.03;
const ENERGY_TOLERANCE_EV_PER_ATOM: f64 = 0.02;
const FORCE_TOLERANCE_EV_PER_ANGSTROM: f64 = 0.03;
const STRESS_TOLERANCE_GPA: f64 = 0.5;
const FORCE_EXPLOSION_EV_PER_ANGSTROM: f64 = 200.0;
const STRESS_EXPLOSION_GPA: f64 = 5000.0;

pub fn run(args: EquilibriumSolveArgs) -> Result<()> {
    let trajectory = load_trajectory(&args.trajectory)?;
    let report = score_trajectory(&trajectory, &args)?;
    let output = serde_json::to_string_pretty(&report)?;
    if let Some(path) = args.output.as_deref() {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(path, output)?;
    } else {
        println!("{output}");
    }
    Ok(())
}

fn load_trajectory(path: &Path) -> Result<EquilibriumTrajectory> {
    let text =
        fs::read_to_string(path).with_context(|| format!("read trajectory {}", path.display()))?;
    let trajectory: EquilibriumTrajectory =
        serde_json::from_str(&text).context("parse equilibrium trajectory JSON")?;
    validate_trajectory(trajectory)
}

fn validate_trajectory(trajectory: EquilibriumTrajectory) -> Result<EquilibriumTrajectory> {
    if let Some(schema) = &trajectory.schema {
        if schema != "lupine.mlip.equilibrium_trajectory.v1" {
            bail!("unsupported equilibrium trajectory schema: {schema}");
        }
    }
    if trajectory.frames.is_empty() {
        bail!("equilibrium trajectory must contain at least one frame");
    }
    let mut previous_step = None;
    for frame in &trajectory.frames {
        if let Some(previous) = previous_step {
            if frame.step < previous {
                bail!("trajectory frames must be sorted by nondecreasing step");
            }
        }
        previous_step = Some(frame.step);
        if let Some(time) = frame.time_seconds {
            if !time.is_finite() || time < 0.0 {
                bail!("frame {} has invalid time_seconds", frame.step);
            }
        }
    }
    Ok(trajectory)
}

fn score_trajectory(
    trajectory: &EquilibriumTrajectory,
    args: &EquilibriumSolveArgs,
) -> Result<EquilibriumSolveReport> {
    let scored: Vec<ScoredFrame> = trajectory
        .frames
        .iter()
        .cloned()
        .map(|frame| score_frame(frame, &trajectory.reference))
        .collect::<Result<_>>()?;
    let first = scored.first().context("missing first scored frame")?;
    let final_frame = scored.last().context("missing final scored frame")?;
    let best = scored
        .iter()
        .min_by(|left, right| {
            left.distance
                .partial_cmp(&right.distance)
                .unwrap_or(std::cmp::Ordering::Equal)
        })
        .context("missing best scored frame")?;

    let continuation_gain =
        continuation_gain_fraction(&scored, args.continuation_window_steps, first.distance);
    let plateau_detected = continuation_gain
        .map(|gain| gain.abs() < 0.002)
        .unwrap_or(false);
    let failure_class = classify_failure(
        trajectory,
        &scored,
        args.solved_distance_threshold,
        final_frame,
    );
    let verdict = if failure_class == "solved" {
        "complete"
    } else {
        "failed-cell"
    };
    let elapsed_seconds = elapsed_seconds(first, final_frame);
    let force_calls = force_call_delta(first, final_frame);
    let curve: Vec<CurvePoint> = scored.iter().map(curve_point).collect();
    let distance_components = distance_components(&trajectory.reference, final_frame);

    Ok(EquilibriumSolveReport {
        schema: "lupine.distill.equilibrium_solve_score.v1".to_string(),
        run_id: trajectory.run_id.clone(),
        cell_id: trajectory.cell_id.clone(),
        variant_id: trajectory.variant_id.clone(),
        mlip_id: trajectory.mlip_id.clone(),
        material_id: trajectory.material_id.clone(),
        reference: trajectory.reference.clone(),
        perturbation: trajectory.perturbation.clone(),
        score: EquilibriumScore {
            verdict: verdict.to_string(),
            failure_class: failure_class.clone(),
            start_distance: round6(first.distance),
            final_distance: round6(final_frame.distance),
            best_distance: round6(best.distance),
            final_closeness: round6(final_frame.closeness),
            best_closeness: round6(best.closeness),
            improvement_fraction: round6(improvement_fraction(
                first.distance,
                final_frame.distance,
            )),
            elapsed_seconds: elapsed_seconds.map(round6),
            steps: final_frame.frame.step.saturating_sub(first.frame.step),
            force_calls,
            final_force_max_norm_ev_per_angstrom: final_frame.force_max_norm.map(round6),
            final_stress_rmse_gpa: final_frame.stress_rmse.map(round6),
            final_lattice_error_angstrom: final_frame.lattice_error.map(round6),
            final_position_rmse_angstrom: final_frame.position_rmse.map(round6),
            continuation_window_steps: args.continuation_window_steps,
            continuation_gain_fraction: continuation_gain.map(round6),
            plateau_detected,
        },
        anytime_curve: curve,
        viewer_artifact: ViewerArtifact {
            schema: "lupine.mlip.equilibrium_viewer.v1".to_string(),
            material_id: trajectory.material_id.clone(),
            mlip_id: trajectory.mlip_id.clone(),
            reference: trajectory.reference.clone(),
            frames: scored.iter().map(viewer_frame).collect(),
        },
        hyperribbon_evidence: HyperribbonEvidence {
            schema: "lupine.distill.hyperribbon_evidence.equilibrium_solve.v1".to_string(),
            evidence_kind: "offset_lattice_relaxation".to_string(),
            fault_line: failure_class,
            continuation_value_kind: "trailing_window_marginal_gain".to_string(),
            continuation_window_steps: args.continuation_window_steps,
            continuation_gain_fraction: continuation_gain.map(round6),
            plateau_detected,
            distance_components,
        },
    })
}

fn score_frame(frame: EquilibriumFrame, reference: &EquilibriumReference) -> Result<ScoredFrame> {
    let mut components = Vec::new();
    let mut lattice_error = None;
    if let (Some(predicted), Some(actual)) =
        (frame.lattice_a_angstrom, reference.lattice_a_angstrom)
    {
        let error = (predicted - actual).abs();
        lattice_error = Some(error);
        components.push(error / LATTICE_TOLERANCE_ANGSTROM);
    }
    if let (Some(predicted), Some(actual)) = (&frame.cell_angstrom, &reference.cell_angstrom) {
        let error = rmse_nested(predicted, actual)
            .with_context(|| format!("cell shape mismatch at step {}", frame.step))?;
        lattice_error = Some(lattice_error.map_or(error, |current| current.max(error)));
        components.push(error / LATTICE_TOLERANCE_ANGSTROM);
    }
    let position_rmse = if let (Some(predicted), Some(actual)) =
        (&frame.positions_angstrom, &reference.positions_angstrom)
    {
        let error = rmse_nested(predicted, actual)
            .with_context(|| format!("position shape mismatch at step {}", frame.step))?;
        components.push(error / POSITION_TOLERANCE_ANGSTROM);
        Some(error)
    } else {
        None
    };
    if let (Some(predicted), Some(actual)) =
        (frame.energy_ev_per_atom, reference.energy_ev_per_atom)
    {
        components.push((predicted - actual).abs() / ENERGY_TOLERANCE_EV_PER_ATOM);
    }
    let stress_rmse =
        if let (Some(predicted), Some(actual)) = (&frame.stress_gpa, &reference.stress_gpa) {
            let error = rmse_flat(predicted, actual)
                .with_context(|| format!("stress shape mismatch at step {}", frame.step))?;
            components.push(error / STRESS_TOLERANCE_GPA);
            Some(error)
        } else {
            None
        };
    let force_max_norm = frame.forces_ev_per_angstrom.as_ref().map(|forces| {
        forces
            .iter()
            .map(|force| vector_norm(force))
            .fold(0.0, f64::max)
    });
    if let Some(force_norm) = force_max_norm {
        components.push(force_norm / FORCE_TOLERANCE_EV_PER_ANGSTROM);
    }
    if components.is_empty() {
        bail!(
            "frame {} has no scoreable equilibrium components",
            frame.step
        );
    }
    let distance = components.iter().sum::<f64>() / components.len() as f64;
    let closeness = 1.0 / (1.0 + distance);
    Ok(ScoredFrame {
        frame,
        distance,
        closeness,
        force_max_norm,
        stress_rmse,
        lattice_error,
        position_rmse,
    })
}

fn classify_failure(
    trajectory: &EquilibriumTrajectory,
    scored: &[ScoredFrame],
    solved_distance_threshold: f64,
    final_frame: &ScoredFrame,
) -> String {
    if scored.iter().any(|frame| !frame.distance.is_finite()) {
        return "nonphysical".to_string();
    }
    if scored
        .iter()
        .filter_map(|frame| frame.force_max_norm)
        .any(|force| force > FORCE_EXPLOSION_EV_PER_ANGSTROM)
    {
        return "force_explosion".to_string();
    }
    if scored
        .iter()
        .filter_map(|frame| frame.stress_rmse)
        .any(|stress| stress > STRESS_EXPLOSION_GPA)
    {
        return "stress_explosion".to_string();
    }
    if energy_drifted(scored) {
        return "energy_drift".to_string();
    }
    if oscillating(scored) {
        return "oscillation".to_string();
    }

    let force_threshold = trajectory
        .convergence
        .as_ref()
        .and_then(|spec| spec.force_threshold_ev_per_angstrom)
        .unwrap_or(FORCE_TOLERANCE_EV_PER_ANGSTROM);
    let stress_threshold = trajectory
        .convergence
        .as_ref()
        .and_then(|spec| spec.stress_threshold_gpa)
        .unwrap_or(STRESS_TOLERANCE_GPA);
    let force_ok = final_frame
        .force_max_norm
        .map(|force| force <= force_threshold)
        .unwrap_or(true);
    let stress_ok = final_frame
        .stress_rmse
        .map(|stress| stress <= stress_threshold)
        .unwrap_or(true);
    let distance_ok = final_frame.distance <= solved_distance_threshold;

    if final_frame.frame.relaxation_converged == Some(true) && !distance_ok {
        return "wrong_equilibrium".to_string();
    }
    if distance_ok && force_ok && stress_ok {
        return "solved".to_string();
    }
    if let Some(max_steps) = trajectory
        .convergence
        .as_ref()
        .and_then(|spec| spec.max_steps)
    {
        if final_frame.frame.step >= max_steps {
            return "non_converged".to_string();
        }
    }
    "non_converged".to_string()
}

fn energy_drifted(scored: &[ScoredFrame]) -> bool {
    let energies: Vec<f64> = scored
        .iter()
        .filter_map(|frame| frame.frame.energy_ev_per_atom)
        .collect();
    if energies.len() < 3 {
        return false;
    }
    let first = energies[0];
    let last = *energies.last().unwrap_or(&first);
    last > first + ENERGY_TOLERANCE_EV_PER_ATOM
}

fn oscillating(scored: &[ScoredFrame]) -> bool {
    if scored.len() < 6 {
        return false;
    }
    let mut sign_changes = 0;
    let mut previous_sign = 0.0;
    for window in scored.windows(2) {
        let delta = window[1].distance - window[0].distance;
        if delta.abs() < 0.001 {
            continue;
        }
        let sign = delta.signum();
        if previous_sign != 0.0 && sign != previous_sign {
            sign_changes += 1;
        }
        previous_sign = sign;
    }
    sign_changes >= 4
}

fn continuation_gain_fraction(
    scored: &[ScoredFrame],
    window_steps: usize,
    start_distance: f64,
) -> Option<f64> {
    if scored.len() < 2 || window_steps == 0 || start_distance <= 0.0 {
        return None;
    }
    let final_step = scored.last()?.frame.step;
    let target_step = final_step.saturating_sub(window_steps);
    let prior = scored
        .iter()
        .rev()
        .find(|frame| frame.frame.step <= target_step)
        .unwrap_or_else(|| scored.first().expect("scored is nonempty"));
    let final_distance = scored.last()?.distance;
    Some((prior.distance - final_distance) / start_distance)
}

fn improvement_fraction(start_distance: f64, final_distance: f64) -> f64 {
    if start_distance <= 0.0 {
        return 0.0;
    }
    (start_distance - final_distance) / start_distance
}

fn curve_point(scored: &ScoredFrame) -> CurvePoint {
    CurvePoint {
        step: scored.frame.step,
        time_seconds: scored.frame.time_seconds,
        force_calls: scored.frame.force_calls,
        distance_to_reference: round6(scored.distance),
        closeness: round6(scored.closeness),
        force_max_norm_ev_per_angstrom: scored.force_max_norm.map(round6),
        stress_rmse_gpa: scored.stress_rmse.map(round6),
        lattice_error_angstrom: scored.lattice_error.map(round6),
        position_rmse_angstrom: scored.position_rmse.map(round6),
    }
}

fn viewer_frame(scored: &ScoredFrame) -> ViewerFrame {
    ViewerFrame {
        step: scored.frame.step,
        time_seconds: scored.frame.time_seconds,
        distance_to_reference: round6(scored.distance),
        closeness: round6(scored.closeness),
        cell_angstrom: scored.frame.cell_angstrom.clone(),
        positions_angstrom: scored.frame.positions_angstrom.clone(),
        force_max_norm_ev_per_angstrom: scored.force_max_norm.map(round6),
    }
}

fn distance_components(reference: &EquilibriumReference, final_frame: &ScoredFrame) -> Vec<String> {
    let mut components = Vec::new();
    if reference.lattice_a_angstrom.is_some() || reference.cell_angstrom.is_some() {
        components.push("lattice".to_string());
    }
    if reference.positions_angstrom.is_some() {
        components.push("positions".to_string());
    }
    if reference.energy_ev_per_atom.is_some() {
        components.push("energy".to_string());
    }
    if reference.stress_gpa.is_some() {
        components.push("stress".to_string());
    }
    if final_frame.force_max_norm.is_some() {
        components.push("force_residual".to_string());
    }
    components
}

fn elapsed_seconds(first: &ScoredFrame, final_frame: &ScoredFrame) -> Option<f64> {
    Some(final_frame.frame.time_seconds? - first.frame.time_seconds?)
}

fn force_call_delta(first: &ScoredFrame, final_frame: &ScoredFrame) -> Option<usize> {
    Some(
        final_frame
            .frame
            .force_calls?
            .saturating_sub(first.frame.force_calls?),
    )
}

fn rmse_nested(predicted: &[Vec<f64>], actual: &[Vec<f64>]) -> Result<f64> {
    if predicted.len() != actual.len() {
        bail!("outer length mismatch");
    }
    let mut squared_sum = 0.0;
    let mut count = 0;
    for (predicted_row, actual_row) in predicted.iter().zip(actual.iter()) {
        if predicted_row.len() != actual_row.len() {
            bail!("inner length mismatch");
        }
        for (predicted_value, actual_value) in predicted_row.iter().zip(actual_row.iter()) {
            let delta = predicted_value - actual_value;
            squared_sum += delta * delta;
            count += 1;
        }
    }
    if count == 0 {
        bail!("empty numeric array");
    }
    Ok((squared_sum / count as f64).sqrt())
}

fn rmse_flat(predicted: &[f64], actual: &[f64]) -> Result<f64> {
    if predicted.len() != actual.len() {
        bail!("length mismatch");
    }
    if predicted.is_empty() {
        bail!("empty numeric array");
    }
    let squared_sum = predicted
        .iter()
        .zip(actual.iter())
        .map(|(predicted_value, actual_value)| {
            let delta = predicted_value - actual_value;
            delta * delta
        })
        .sum::<f64>();
    Ok((squared_sum / predicted.len() as f64).sqrt())
}

fn vector_norm(values: &[f64]) -> f64 {
    values.iter().map(|value| value * value).sum::<f64>().sqrt()
}

fn round6(value: f64) -> f64 {
    (value * 1_000_000.0).round() / 1_000_000.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn args() -> EquilibriumSolveArgs {
        EquilibriumSolveArgs {
            trajectory: PathBuf::from("unused.json"),
            output: None,
            continuation_window_steps: 200,
            solved_distance_threshold: 0.25,
        }
    }

    fn trajectory() -> EquilibriumTrajectory {
        EquilibriumTrajectory {
            schema: Some("lupine.mlip.equilibrium_trajectory.v1".to_string()),
            run_id: Some("test-run".to_string()),
            cell_id: Some("al-fcc-offset".to_string()),
            variant_id: Some("baseline".to_string()),
            mlip_id: Some("mace".to_string()),
            material_id: "Al-fcc".to_string(),
            reference: EquilibriumReference {
                source: Some("fixture-dft".to_string()),
                source_url: None,
                lattice_a_angstrom: Some(4.05),
                cell_angstrom: Some(vec![
                    vec![4.05, 0.0, 0.0],
                    vec![0.0, 4.05, 0.0],
                    vec![0.0, 0.0, 4.05],
                ]),
                positions_angstrom: Some(vec![vec![0.0, 0.0, 0.0], vec![2.025, 2.025, 0.0]]),
                energy_ev_per_atom: Some(-3.36),
                stress_gpa: Some(vec![0.0, 0.0, 0.0, 0.0, 0.0, 0.0]),
            },
            perturbation: Some(
                json!({"strain_percent": 3.0, "atomic_displacement_angstrom": 0.08}),
            ),
            convergence: Some(ConvergenceSpec {
                force_threshold_ev_per_angstrom: Some(0.03),
                stress_threshold_gpa: Some(0.5),
                max_steps: Some(400),
            }),
            frames: vec![
                EquilibriumFrame {
                    step: 0,
                    time_seconds: Some(0.0),
                    force_calls: Some(0),
                    lattice_a_angstrom: Some(4.20),
                    cell_angstrom: Some(vec![
                        vec![4.20, 0.0, 0.0],
                        vec![0.0, 4.20, 0.0],
                        vec![0.0, 0.0, 4.20],
                    ]),
                    positions_angstrom: Some(vec![vec![0.08, 0.0, 0.0], vec![2.14, 1.96, 0.0]]),
                    energy_ev_per_atom: Some(-3.10),
                    forces_ev_per_angstrom: Some(vec![vec![0.20, 0.0, 0.0], vec![0.0, -0.18, 0.0]]),
                    stress_gpa: Some(vec![3.0, 2.0, 1.0, 0.0, 0.0, 0.0]),
                    relaxation_converged: Some(false),
                },
                EquilibriumFrame {
                    step: 200,
                    time_seconds: Some(2.0),
                    force_calls: Some(200),
                    lattice_a_angstrom: Some(4.052),
                    cell_angstrom: Some(vec![
                        vec![4.052, 0.0, 0.0],
                        vec![0.0, 4.052, 0.0],
                        vec![0.0, 0.0, 4.052],
                    ]),
                    positions_angstrom: Some(vec![vec![0.002, 0.0, 0.0], vec![2.026, 2.024, 0.0]]),
                    energy_ev_per_atom: Some(-3.358),
                    forces_ev_per_angstrom: Some(vec![vec![0.01, 0.0, 0.0], vec![0.0, -0.01, 0.0]]),
                    stress_gpa: Some(vec![0.1, 0.1, 0.0, 0.0, 0.0, 0.0]),
                    relaxation_converged: Some(true),
                },
            ],
        }
    }

    #[test]
    fn scores_offset_lattice_recovery() {
        let report = score_trajectory(&trajectory(), &args()).unwrap();
        assert_eq!(report.score.verdict, "complete");
        assert_eq!(report.score.failure_class, "solved");
        assert!(report.score.final_distance < report.score.start_distance);
        assert!(report.score.improvement_fraction > 0.90);
        assert_eq!(report.viewer_artifact.frames.len(), 2);
        assert!(report
            .hyperribbon_evidence
            .distance_components
            .contains(&"lattice".to_string()));
    }

    #[test]
    fn marks_wrong_equilibrium_when_runner_claims_converged_far_from_reference() {
        let mut trajectory = trajectory();
        let final_frame = trajectory.frames.last_mut().unwrap();
        final_frame.lattice_a_angstrom = Some(4.30);
        final_frame.relaxation_converged = Some(true);
        let report = score_trajectory(&trajectory, &args()).unwrap();
        assert_eq!(report.score.failure_class, "wrong_equilibrium");
    }
}
