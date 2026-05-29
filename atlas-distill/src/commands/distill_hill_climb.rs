//! Local-first Lupine Distill ribbon hill climb.
//!
//! This command is the in-app optimization loop for Distill policy mechanics.
//! It replays sealed MLIP policy cases against candidate hyperribbon limits and
//! ranks the candidates by accuracy improvement, intervention cost, and guard
//! behavior. Phoenix can ingest the report later, but it is not in the loop.

use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{bail, Context, Result};
use clap::{Args, ValueEnum};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use super::distill_policy::{
    decide_with_limits, PolicyDecision, PolicyLimits, PolicyRequest, SupportEvidence,
    DEFAULT_RIBBON_VERSION,
};

#[derive(Debug, Clone, Args)]
pub struct DistillHillClimbArgs {
    /// JSON or JSONL sealed replay cases. Each case carries prediction,
    /// support correction evidence, and reference values.
    #[arg(long)]
    pub cases: PathBuf,
    /// Optional report output. If omitted, writes pretty JSON to stdout.
    #[arg(long)]
    pub output: Option<PathBuf>,
    /// Optional path for only the winning PolicyLimits JSON object, suitable
    /// for `atlas-distill distill-policy --policy-limits`.
    #[arg(long)]
    pub selected_limits_output: Option<PathBuf>,
    /// Canonical ribbon family being tuned.
    #[arg(long, default_value = DEFAULT_RIBBON_VERSION)]
    pub ribbon_version: String,
    /// Objective to optimize. Acceleration uses the same scoring contract with
    /// a higher intervention-cost weight.
    #[arg(long, value_enum, default_value_t = HillClimbObjective::Accuracy)]
    objective: HillClimbObjective,
    /// Number of coordinate-search rounds.
    #[arg(long, default_value_t = 3)]
    pub rounds: usize,
    /// Number of best candidates retained between rounds.
    #[arg(long, default_value_t = 4)]
    pub beam_width: usize,
    /// Number of ranked candidates retained in the report.
    #[arg(long, default_value_t = 16)]
    pub report_top_k: usize,
}

#[derive(Debug, Copy, Clone, ValueEnum, Eq, PartialEq)]
enum HillClimbObjective {
    #[value(name = "accuracy")]
    Accuracy,
    #[value(name = "accuracy_accelerate", alias = "accuracy-accelerate")]
    AccuracyAccelerate,
}

impl HillClimbObjective {
    fn as_str(self) -> &'static str {
        match self {
            Self::Accuracy => "accuracy",
            Self::AccuracyAccelerate => "accuracy_accelerate",
        }
    }

    fn speed_weight(self) -> f64 {
        match self {
            Self::Accuracy => 0.05,
            Self::AccuracyAccelerate => 0.25,
        }
    }

    fn blocked_penalty(self) -> f64 {
        match self {
            Self::Accuracy => 0.05,
            Self::AccuracyAccelerate => 0.10,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
struct HillClimbCase {
    #[serde(default)]
    schema: Option<String>,
    #[serde(default)]
    case_id: Option<String>,
    #[serde(default)]
    group_id: Option<String>,
    row_id: String,
    #[serde(default)]
    mlip_id: Option<String>,
    prediction: Value,
    #[serde(default)]
    support: Option<SupportEvidence>,
    #[serde(default)]
    context: Option<Value>,
    reference: Value,
    #[serde(default = "default_weight")]
    weight: f64,
}

#[derive(Debug, Clone, Serialize)]
struct HillClimbReport {
    schema: String,
    ribbon_family: String,
    objective: String,
    search: SearchConfigReport,
    cases: CaseSetReport,
    best_candidate: CandidateReport,
    candidates: Vec<CandidateReport>,
}

#[derive(Debug, Clone, Serialize)]
struct SearchConfigReport {
    rounds: usize,
    beam_width: usize,
    report_top_k: usize,
    coordinate_factors: Vec<f64>,
    scale_values: Vec<f64>,
    support_lift_values: Vec<f64>,
    support_distance_values: Vec<f64>,
    ribbon_feature_distance_values: Vec<f64>,
    ribbon_support_error_floor_values: Vec<f64>,
}

#[derive(Debug, Clone, Serialize)]
struct CaseSetReport {
    count: usize,
    row_counts: HashMap<String, usize>,
    mlip_counts: HashMap<String, usize>,
}

#[derive(Debug, Clone, Serialize)]
struct CandidateReport {
    rank: usize,
    candidate_id: String,
    policy_limits: PolicyLimits,
    objective_score: f64,
    accuracy_delta_mean: f64,
    accuracy_delta_min: f64,
    relative_lift_mean: f64,
    relative_lift_min: f64,
    group_relative_lift_mean: f64,
    group_relative_lift_min: f64,
    group_regression_rate: f64,
    group_count: usize,
    baseline_error_mean: f64,
    corrected_error_mean: f64,
    corrected_accuracy_mean: f64,
    runtime_proxy_mean: f64,
    regression_rate: f64,
    refusal_rate: f64,
    blocked_correction_rate: f64,
    intervention_rate: f64,
    case_count: usize,
    scoring_notes: Vec<String>,
    theorem_development_lanes: Vec<TheoremDevelopmentLane>,
}

#[derive(Debug, Clone)]
struct CandidateEvaluation {
    candidate_id: String,
    policy_limits: PolicyLimits,
    objective_score: f64,
    accuracy_delta_mean: f64,
    accuracy_delta_min: f64,
    relative_lift_mean: f64,
    relative_lift_min: f64,
    group_relative_lift_mean: f64,
    group_relative_lift_min: f64,
    group_regression_rate: f64,
    group_count: usize,
    baseline_error_mean: f64,
    corrected_error_mean: f64,
    corrected_accuracy_mean: f64,
    runtime_proxy_mean: f64,
    regression_rate: f64,
    refusal_rate: f64,
    blocked_correction_rate: f64,
    intervention_rate: f64,
    case_count: usize,
}

#[derive(Debug, Default)]
struct WeightedSums {
    weight: f64,
    objective: f64,
    accuracy_delta: f64,
    relative_lift: f64,
    baseline_error: f64,
    corrected_error: f64,
    corrected_accuracy: f64,
    runtime_proxy: f64,
    regressions: f64,
    refusals: f64,
    blocked: f64,
    interventions: f64,
    cases: usize,
    accuracy_delta_min: Option<f64>,
    relative_lift_min: Option<f64>,
}

#[derive(Debug, Default)]
struct GroupSums {
    baseline_error: f64,
    corrected_error: f64,
    count: usize,
}

#[derive(Debug, Clone, Serialize)]
struct TheoremDevelopmentLane {
    lane: String,
    signal: String,
    runtime_proxy: String,
    why_it_matters: String,
}

const FACTORS: [f64; 6] = [0.125, 0.25, 0.5, 0.75, 1.25, 1.5];
const SCALE_VALUES: [f64; 13] = [
    -1.25, -1.0, -0.75, -0.5, -0.25, -0.10, -0.05, 0.0, 0.25, 0.5, 0.75, 1.0, 1.25,
];
const SUPPORT_LIFT_VALUES: [f64; 6] = [0.0, 0.01, 0.02, 0.05, 0.10, 0.20];
const SUPPORT_DISTANCE_VALUES: [f64; 6] = [0.0, 0.25, 0.5, 0.75, 1.0, 1.5];
const RIBBON_FEATURE_DISTANCE_VALUES: [f64; 9] = [0.0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 5.0, 10.0];
const RIBBON_SUPPORT_ERROR_FLOOR_VALUES: [f64; 7] = [0.0, 0.01, 0.02, 0.05, 0.08, 0.10, 0.20];

pub fn run(args: DistillHillClimbArgs) -> Result<()> {
    if args.beam_width == 0 {
        bail!("--beam-width must be at least 1");
    }
    if args.report_top_k == 0 {
        bail!("--report-top-k must be at least 1");
    }

    let cases = load_cases(&args.cases)?;
    if cases.is_empty() {
        bail!("no hill-climb cases found in {}", args.cases.display());
    }
    let report = hill_climb(&cases, &args)?;
    let output = serde_json::to_string_pretty(&report)?;

    if let Some(path) = args.output.as_deref() {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(path, output)?;
    } else {
        println!("{output}");
    }

    if let Some(path) = args.selected_limits_output.as_deref() {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let limits = serde_json::to_string_pretty(&report.best_candidate.policy_limits)?;
        fs::write(path, limits)?;
    }
    Ok(())
}

fn load_cases(path: &Path) -> Result<Vec<HillClimbCase>> {
    let text =
        fs::read_to_string(path).with_context(|| format!("read cases {}", path.display()))?;
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }
    if trimmed.starts_with('[') {
        let cases: Vec<HillClimbCase> =
            serde_json::from_str(trimmed).context("parse hill-climb case JSON array")?;
        validate_cases(cases)
    } else {
        let mut cases = Vec::new();
        for (idx, line) in text.lines().enumerate() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            let case: HillClimbCase = serde_json::from_str(trimmed)
                .with_context(|| format!("parse hill-climb JSONL line {}", idx + 1))?;
            cases.push(case);
        }
        validate_cases(cases)
    }
}

fn validate_cases(cases: Vec<HillClimbCase>) -> Result<Vec<HillClimbCase>> {
    for case in &cases {
        if let Some(schema) = &case.schema {
            if schema != "lupine.distill.hill_climb_case.v1" {
                bail!("unsupported hill-climb case schema: {schema}");
            }
        }
        if !case.prediction.is_object() {
            bail!("case {} prediction must be a JSON object", case_label(case));
        }
        if !case.reference.is_object() {
            bail!("case {} reference must be a JSON object", case_label(case));
        }
        if !case.weight.is_finite() || case.weight <= 0.0 {
            bail!(
                "case {} weight must be positive and finite",
                case_label(case)
            );
        }
    }
    Ok(cases)
}

fn hill_climb(cases: &[HillClimbCase], args: &DistillHillClimbArgs) -> Result<HillClimbReport> {
    let mut seen = HashSet::new();
    let mut evaluated = Vec::new();
    let mut frontier = vec![PolicyLimits::default()];

    for _round in 0..=args.rounds {
        let mut round_candidates = Vec::new();
        for limits in &frontier {
            round_candidates.push(limits.clone());
            round_candidates.extend(neighbors(limits));
        }

        for limits in round_candidates {
            let candidate_id = candidate_id(&limits)?;
            if seen.insert(candidate_id.clone()) {
                evaluated.push(evaluate_candidate(
                    cases,
                    limits,
                    candidate_id,
                    &args.ribbon_version,
                    args.objective,
                )?);
            }
        }

        evaluated.sort_by(compare_evaluations);
        frontier = evaluated
            .iter()
            .take(args.beam_width)
            .map(|evaluation| evaluation.policy_limits.clone())
            .collect();
    }

    evaluated.sort_by(compare_evaluations);
    let candidate_reports: Vec<CandidateReport> = evaluated
        .iter()
        .take(args.report_top_k)
        .enumerate()
        .map(|(idx, evaluation)| candidate_report(idx + 1, evaluation))
        .collect();
    let Some(best_candidate) = candidate_reports.first().cloned() else {
        bail!("hill climb produced no candidate evaluations");
    };

    Ok(HillClimbReport {
        schema: "lupine.distill.hill_climb_report.v1".to_string(),
        ribbon_family: args.ribbon_version.clone(),
        objective: args.objective.as_str().to_string(),
        search: SearchConfigReport {
            rounds: args.rounds,
            beam_width: args.beam_width,
            report_top_k: args.report_top_k,
            coordinate_factors: FACTORS.to_vec(),
            scale_values: SCALE_VALUES.to_vec(),
            support_lift_values: SUPPORT_LIFT_VALUES.to_vec(),
            support_distance_values: SUPPORT_DISTANCE_VALUES.to_vec(),
            ribbon_feature_distance_values: RIBBON_FEATURE_DISTANCE_VALUES.to_vec(),
            ribbon_support_error_floor_values: RIBBON_SUPPORT_ERROR_FLOOR_VALUES.to_vec(),
        },
        cases: summarize_cases(cases),
        best_candidate,
        candidates: candidate_reports,
    })
}

fn evaluate_candidate(
    cases: &[HillClimbCase],
    limits: PolicyLimits,
    candidate_id: String,
    ribbon_version: &str,
    objective: HillClimbObjective,
) -> Result<CandidateEvaluation> {
    let mut sums = WeightedSums::default();
    let mut groups: HashMap<String, GroupSums> = HashMap::new();
    for case in cases {
        let mut context = case.context.clone().unwrap_or_else(|| json!({}));
        if let Some(object) = context.as_object_mut() {
            object.insert(
                "source".to_string(),
                json!("atlas-distill distill-hill-climb"),
            );
            object.insert("case_id".to_string(), json!(case.case_id));
        }
        let request = PolicyRequest {
            schema: Some("lupine.distill.policy_request.v1".to_string()),
            ribbon_version: Some(ribbon_version.to_string()),
            row_id: case.row_id.clone(),
            mlip_id: case.mlip_id.clone(),
            prediction: case.prediction.clone(),
            support: case.support.clone(),
            context: Some(context),
        };
        let decision = decide_with_limits(&request, ribbon_version, &limits)?;
        let baseline_error = row_error(&case.row_id, &case.prediction, &case.reference)
            .with_context(|| format!("score baseline error for case {}", case_label(case)))?;
        let corrected_error = row_error(
            &case.row_id,
            &decision.corrected_prediction,
            &case.reference,
        )
        .with_context(|| format!("score corrected error for case {}", case_label(case)))?;
        let tolerance = row_tolerance(&case.row_id);
        let baseline_accuracy = normalized_accuracy(baseline_error, tolerance);
        let corrected_accuracy = normalized_accuracy(corrected_error, tolerance);
        let accuracy_delta = corrected_accuracy - baseline_accuracy;
        let relative_lift = relative_lift(baseline_error, corrected_error);
        let action_summary = summarize_actions(&decision);
        let runtime_proxy = runtime_proxy(&action_summary);
        let objective_score = case_objective(
            accuracy_delta,
            relative_lift,
            runtime_proxy,
            &action_summary,
            objective,
        );
        let weight = case.weight;

        sums.weight += weight;
        sums.objective += objective_score * weight;
        sums.accuracy_delta += accuracy_delta * weight;
        sums.relative_lift += relative_lift * weight;
        sums.baseline_error += baseline_error * weight;
        sums.corrected_error += corrected_error * weight;
        sums.corrected_accuracy += corrected_accuracy * weight;
        sums.runtime_proxy += runtime_proxy * weight;
        sums.regressions += if relative_lift < -1e-9 { weight } else { 0.0 };
        sums.refusals += if action_summary.refused { weight } else { 0.0 };
        sums.blocked += if action_summary.blocked { weight } else { 0.0 };
        sums.interventions += if action_summary.intervened {
            weight
        } else {
            0.0
        };
        sums.cases += 1;
        sums.accuracy_delta_min = Some(
            sums.accuracy_delta_min
                .map_or(accuracy_delta, |current| current.min(accuracy_delta)),
        );
        sums.relative_lift_min = Some(
            sums.relative_lift_min
                .map_or(relative_lift, |current| current.min(relative_lift)),
        );
        let group = groups.entry(group_id(case)).or_default();
        group.baseline_error += baseline_error;
        group.corrected_error += corrected_error;
        group.count += 1;
    }

    if sums.weight <= 0.0 {
        bail!("cannot evaluate candidate against zero total case weight");
    }
    let group_lifts: Vec<f64> = groups
        .values()
        .filter(|group| group.count > 0)
        .map(|group| {
            relative_lift(
                group.baseline_error / group.count as f64,
                group.corrected_error / group.count as f64,
            )
        })
        .collect();
    let group_count = group_lifts.len();
    let group_relative_lift_mean = if group_lifts.is_empty() {
        0.0
    } else {
        group_lifts.iter().sum::<f64>() / group_lifts.len() as f64
    };
    let group_relative_lift_min = group_lifts.iter().copied().reduce(f64::min).unwrap_or(0.0);
    let group_regression_rate = if group_lifts.is_empty() {
        0.0
    } else {
        group_lifts.iter().filter(|lift| **lift < -1e-9).count() as f64 / group_lifts.len() as f64
    };
    let mean_objective = sums.objective / sums.weight;
    let group_regression_penalty = 3.0 * group_regression_rate
        + if group_relative_lift_min < -1e-9 {
            2.0 * group_relative_lift_min.abs().min(2.0)
        } else {
            0.0
        };
    let objective_score =
        mean_objective + 0.55 * group_relative_lift_mean - group_regression_penalty;

    Ok(CandidateEvaluation {
        candidate_id,
        policy_limits: limits,
        objective_score,
        accuracy_delta_mean: sums.accuracy_delta / sums.weight,
        accuracy_delta_min: sums.accuracy_delta_min.unwrap_or(0.0),
        relative_lift_mean: sums.relative_lift / sums.weight,
        relative_lift_min: sums.relative_lift_min.unwrap_or(0.0),
        group_relative_lift_mean,
        group_relative_lift_min,
        group_regression_rate,
        group_count,
        baseline_error_mean: sums.baseline_error / sums.weight,
        corrected_error_mean: sums.corrected_error / sums.weight,
        corrected_accuracy_mean: sums.corrected_accuracy / sums.weight,
        runtime_proxy_mean: sums.runtime_proxy / sums.weight,
        regression_rate: sums.regressions / sums.weight,
        refusal_rate: sums.refusals / sums.weight,
        blocked_correction_rate: sums.blocked / sums.weight,
        intervention_rate: sums.interventions / sums.weight,
        case_count: sums.cases,
    })
}

fn candidate_report(rank: usize, evaluation: &CandidateEvaluation) -> CandidateReport {
    CandidateReport {
        rank,
        candidate_id: evaluation.candidate_id.clone(),
        policy_limits: evaluation.policy_limits.clone(),
        objective_score: round6(evaluation.objective_score),
        accuracy_delta_mean: round6(evaluation.accuracy_delta_mean),
        accuracy_delta_min: round6(evaluation.accuracy_delta_min),
        relative_lift_mean: round6(evaluation.relative_lift_mean),
        relative_lift_min: round6(evaluation.relative_lift_min),
        group_relative_lift_mean: round6(evaluation.group_relative_lift_mean),
        group_relative_lift_min: round6(evaluation.group_relative_lift_min),
        group_regression_rate: round6(evaluation.group_regression_rate),
        group_count: evaluation.group_count,
        baseline_error_mean: round6(evaluation.baseline_error_mean),
        corrected_error_mean: round6(evaluation.corrected_error_mean),
        corrected_accuracy_mean: round6(evaluation.corrected_accuracy_mean),
        runtime_proxy_mean: round6(evaluation.runtime_proxy_mean),
        regression_rate: round6(evaluation.regression_rate),
        refusal_rate: round6(evaluation.refusal_rate),
        blocked_correction_rate: round6(evaluation.blocked_correction_rate),
        intervention_rate: round6(evaluation.intervention_rate),
        case_count: evaluation.case_count,
        scoring_notes: vec![
            "accuracy is normalized per row from sealed reference error".to_string(),
            "relative_lift rewards row-native material error reduction, so larger physical wins dominate small no-ops".to_string(),
            "any per-case regression carries a large objective penalty and is surfaced as regression_rate/min_relative_lift".to_string(),
            "group_relative_lift scores the published cell/pair surface, preventing per-structure search from diverging from report evidence".to_string(),
            "runtime_proxy is outer_loop_policy_replay, not backend layer timing".to_string(),
            "refusal, blocked correction, and intervention costs are part of the objective"
                .to_string(),
        ],
        theorem_development_lanes: theorem_development_lanes(),
    }
}

fn compare_evaluations(a: &CandidateEvaluation, b: &CandidateEvaluation) -> Ordering {
    b.objective_score
        .partial_cmp(&a.objective_score)
        .unwrap_or(Ordering::Equal)
        .then_with(|| {
            a.group_regression_rate
                .partial_cmp(&b.group_regression_rate)
                .unwrap_or(Ordering::Equal)
        })
        .then_with(|| {
            b.group_relative_lift_mean
                .partial_cmp(&a.group_relative_lift_mean)
                .unwrap_or(Ordering::Equal)
        })
        .then_with(|| {
            b.accuracy_delta_mean
                .partial_cmp(&a.accuracy_delta_mean)
                .unwrap_or(Ordering::Equal)
        })
        .then_with(|| {
            a.refusal_rate
                .partial_cmp(&b.refusal_rate)
                .unwrap_or(Ordering::Equal)
        })
        .then_with(|| {
            b.runtime_proxy_mean
                .partial_cmp(&a.runtime_proxy_mean)
                .unwrap_or(Ordering::Equal)
        })
        .then_with(|| a.candidate_id.cmp(&b.candidate_id))
}

#[derive(Debug, Default)]
struct ActionSummary {
    refused: bool,
    blocked: bool,
    tightened: bool,
    delta_corrected: bool,
    intervened: bool,
}

fn summarize_actions(decision: &PolicyDecision) -> ActionSummary {
    let mut summary = ActionSummary::default();
    for action in &decision.actions {
        match action.action.as_str() {
            "refuse" => summary.refused = true,
            "delta_correct_blocked" => summary.blocked = true,
            "tighten" => summary.tightened = true,
            "delta_correct" => summary.delta_corrected = true,
            _ => {}
        }
    }
    summary.intervened =
        summary.refused || summary.blocked || summary.tightened || summary.delta_corrected;
    summary
}

fn case_objective(
    accuracy_delta: f64,
    relative_lift: f64,
    runtime_proxy: f64,
    action_summary: &ActionSummary,
    objective: HillClimbObjective,
) -> f64 {
    let refusal_penalty = if action_summary.refused { 0.75 } else { 0.0 };
    let blocked_penalty = if action_summary.blocked {
        objective.blocked_penalty()
    } else {
        0.0
    };
    let tighten_penalty = if action_summary.tightened { 0.10 } else { 0.0 };
    let material_lift_reward = 0.35 * relative_lift.max(0.0);
    let regression_penalty = if relative_lift < -1e-9 {
        1.25 + relative_lift.abs().min(2.0)
    } else {
        0.0
    };
    accuracy_delta + material_lift_reward + objective.speed_weight() * (runtime_proxy - 1.0)
        - regression_penalty
        - refusal_penalty
        - blocked_penalty
        - tighten_penalty
}

fn runtime_proxy(action_summary: &ActionSummary) -> f64 {
    if action_summary.refused {
        return 0.0;
    }
    let mut proxy = 1.03;
    if action_summary.delta_corrected {
        proxy -= 0.06;
    }
    if action_summary.blocked {
        proxy -= 0.04;
    }
    if action_summary.tightened {
        proxy -= 0.18;
    }
    f64::max(proxy, 0.25)
}

fn row_error(row_id: &str, prediction: &Value, reference: &Value) -> Option<f64> {
    match row_id {
        "energy_volume" => scalar_abs_error(prediction, reference, "energy_ev_per_atom")
            .or_else(|| scalar_abs_error(prediction, reference, "relaxed_energy_ev_per_atom")),
        "stress" => rmse_field(prediction, reference, "stress_gpa"),
        "elastic_constants" => rmse_field(prediction, reference, "elastic_constants_gpa")
            .or_else(|| rmse_field(prediction, reference, "stress_gpa")),
        "forces" => rmse_field(prediction, reference, "forces_ev_per_angstrom"),
        "relaxation_stability" => relaxation_error(prediction, reference),
        _ => common_numeric_rmse(prediction, reference),
    }
}

fn scalar_abs_error(prediction: &Value, reference: &Value, field: &str) -> Option<f64> {
    let predicted = prediction.get(field)?.as_f64()?;
    let actual = reference.get(field)?.as_f64()?;
    Some((predicted - actual).abs())
}

fn rmse_field(prediction: &Value, reference: &Value, field: &str) -> Option<f64> {
    rmse_values(prediction.get(field)?, reference.get(field)?)
}

fn common_numeric_rmse(prediction: &Value, reference: &Value) -> Option<f64> {
    let prediction_object = prediction.as_object()?;
    let reference_object = reference.as_object()?;
    let mut squared = Vec::new();
    for (key, predicted_value) in prediction_object {
        let Some(reference_value) = reference_object.get(key) else {
            continue;
        };
        let Some(rmse) = rmse_values(predicted_value, reference_value) else {
            continue;
        };
        squared.push(rmse * rmse);
    }
    if squared.is_empty() {
        None
    } else {
        Some((squared.iter().sum::<f64>() / squared.len() as f64).sqrt())
    }
}

fn relaxation_error(prediction: &Value, reference: &Value) -> Option<f64> {
    let mut components = Vec::new();
    if let Some(expected) = reference
        .get("relaxation_converged")
        .and_then(Value::as_bool)
    {
        let observed = prediction
            .get("relaxation_converged")
            .and_then(Value::as_bool)?;
        components.push(if observed == expected { 0.0 } else { 1.0 });
    }
    if let Some(error) = scalar_abs_error(prediction, reference, "relaxed_energy_ev_per_atom") {
        components.push(error / row_tolerance("energy_volume"));
    }
    if let Some(error) = rmse_field(prediction, reference, "forces_ev_per_angstrom") {
        components.push(error / row_tolerance("forces"));
    }
    if components.is_empty() {
        common_numeric_rmse(prediction, reference)
    } else {
        Some(components.iter().sum::<f64>() / components.len() as f64)
    }
}

fn rmse_values(prediction: &Value, reference: &Value) -> Option<f64> {
    let predicted = numeric_values(prediction);
    let actual = numeric_values(reference);
    if predicted.is_empty() || predicted.len() != actual.len() {
        return None;
    }
    let squared_sum = predicted
        .iter()
        .zip(actual.iter())
        .map(|(predicted, actual)| {
            let delta = predicted - actual;
            delta * delta
        })
        .sum::<f64>();
    Some((squared_sum / predicted.len() as f64).sqrt())
}

fn numeric_values(value: &Value) -> Vec<f64> {
    match value {
        Value::Number(number) => number.as_f64().into_iter().collect(),
        Value::Array(items) => items.iter().flat_map(numeric_values).collect(),
        _ => Vec::new(),
    }
}

fn normalized_accuracy(error: f64, tolerance: f64) -> f64 {
    if !error.is_finite() {
        return 0.0;
    }
    1.0 / (1.0 + error / tolerance)
}

fn relative_lift(baseline_error: f64, corrected_error: f64) -> f64 {
    if !baseline_error.is_finite() || !corrected_error.is_finite() || baseline_error.abs() <= 1e-12
    {
        return 0.0;
    }
    (baseline_error - corrected_error) / baseline_error.abs()
}

fn row_tolerance(row_id: &str) -> f64 {
    match row_id {
        "energy_volume" => 0.05,
        "stress" => 5.0,
        "elastic_constants" => 5.0,
        "forces" => 0.10,
        "relaxation_stability" => 1.0,
        _ => 1.0,
    }
}

fn neighbors(limits: &PolicyLimits) -> Vec<PolicyLimits> {
    let mut out = Vec::new();
    for field in 0..5 {
        for factor in FACTORS {
            let mut candidate = limits.clone();
            match field {
                0 => {
                    candidate.max_energy_bias_ev_per_atom =
                        scaled(candidate.max_energy_bias_ev_per_atom, factor, 0.01, 3.0)
                }
                1 => {
                    candidate.max_stress_bias_gpa =
                        scaled(candidate.max_stress_bias_gpa, factor, 0.25, 200.0)
                }
                2 => {
                    candidate.max_force_bias_ev_per_angstrom =
                        scaled(candidate.max_force_bias_ev_per_angstrom, factor, 0.01, 10.0)
                }
                3 => {
                    candidate.max_force_norm_ev_per_angstrom = scaled(
                        candidate.max_force_norm_ev_per_angstrom,
                        factor,
                        10.0,
                        1000.0,
                    )
                }
                4 => {
                    candidate.max_stress_abs_gpa =
                        scaled(candidate.max_stress_abs_gpa, factor, 100.0, 20000.0)
                }
                _ => unreachable!(),
            }
            out.push(candidate);
        }
    }
    for field in 0..3 {
        for value in SCALE_VALUES {
            let mut candidate = limits.clone();
            match field {
                0 => candidate.energy_correction_scale = value,
                1 => candidate.stress_correction_scale = value,
                2 => candidate.force_correction_scale = value,
                _ => unreachable!(),
            }
            out.push(candidate);
        }
    }
    for value in SUPPORT_LIFT_VALUES {
        let mut candidate = limits.clone();
        candidate.min_support_lift_fraction = value;
        out.push(candidate);
    }
    for value in SUPPORT_DISTANCE_VALUES {
        let mut candidate = limits.clone();
        candidate.max_support_eval_distance_proxy = value;
        out.push(candidate);
    }
    for value in RIBBON_FEATURE_DISTANCE_VALUES {
        let mut candidate = limits.clone();
        candidate.max_ribbon_feature_distance_proxy = value;
        out.push(candidate);
    }
    for value in RIBBON_SUPPORT_ERROR_FLOOR_VALUES {
        let mut candidate = limits.clone();
        candidate.min_ribbon_support_error_before = value;
        out.push(candidate);
    }
    out
}

fn scaled(value: f64, factor: f64, min: f64, max: f64) -> f64 {
    (value * factor).clamp(min, max)
}

fn candidate_id(limits: &PolicyLimits) -> Result<String> {
    let bytes = serde_json::to_vec(limits)?;
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let hex = format!("{:x}", hasher.finalize());
    Ok(format!("ribbon-{}", &hex[..16]))
}

fn summarize_cases(cases: &[HillClimbCase]) -> CaseSetReport {
    let mut row_counts = HashMap::new();
    let mut mlip_counts = HashMap::new();
    for case in cases {
        *row_counts.entry(case.row_id.clone()).or_insert(0) += 1;
        *mlip_counts
            .entry(
                case.mlip_id
                    .clone()
                    .unwrap_or_else(|| "unknown".to_string()),
            )
            .or_insert(0) += 1;
    }
    CaseSetReport {
        count: cases.len(),
        row_counts,
        mlip_counts,
    }
}

fn case_label(case: &HillClimbCase) -> String {
    case.case_id.clone().unwrap_or_else(|| {
        format!(
            "{}:{}",
            case.mlip_id.as_deref().unwrap_or("unknown"),
            case.row_id
        )
    })
}

fn group_id(case: &HillClimbCase) -> String {
    case.group_id.clone().unwrap_or_else(|| {
        format!(
            "{}:{}",
            case.row_id,
            case.mlip_id.as_deref().unwrap_or("unknown")
        )
    })
}

fn default_weight() -> f64 {
    1.0
}

fn round6(value: f64) -> f64 {
    (value * 1_000_000.0).round() / 1_000_000.0
}

fn theorem_development_lanes() -> Vec<TheoremDevelopmentLane> {
    vec![
        TheoremDevelopmentLane {
            lane: "kimi.vandermonde_decay".to_string(),
            signal: "residual singular spectrum / participation ratio".to_string(),
            runtime_proxy: "ribbon_residual_correction_v1.participation_ratio and eigenvalues"
                .to_string(),
            why_it_matters:
                "Search should prefer corrections whose support residuals live on a thin, stable ribbon rather than arbitrary bias."
                    .to_string(),
        },
        TheoremDevelopmentLane {
            lane: "kimi.two_mode_inference".to_string(),
            signal: "projection distance versus refusal threshold".to_string(),
            runtime_proxy: "ribbon_feature_distance_proxy and support_eval_distance_proxy".to_string(),
            why_it_matters:
                "A bigger Distill win comes from correcting inside the tube and refusing outside it, not from globally pushing every backend."
                    .to_string(),
        },
        TheoremDevelopmentLane {
            lane: "lean.accuracy_commitment".to_string(),
            signal: "per-case accuracy gain and no-regression guard".to_string(),
            runtime_proxy: "accuracy_delta_min, relative_lift_min, regression_rate".to_string(),
            why_it_matters:
                "Lean build-lock commitments become useful when local search optimizes the same falsifiable condition before cloud spend."
                    .to_string(),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn args(objective: HillClimbObjective) -> DistillHillClimbArgs {
        DistillHillClimbArgs {
            cases: PathBuf::from("unused.jsonl"),
            output: None,
            selected_limits_output: None,
            ribbon_version: DEFAULT_RIBBON_VERSION.to_string(),
            objective,
            rounds: 2,
            beam_width: 3,
            report_top_k: 5,
        }
    }

    #[test]
    fn hill_climb_opens_energy_gate_when_support_is_predictive() {
        let cases = vec![HillClimbCase {
            schema: Some("lupine.distill.hill_climb_case.v1".to_string()),
            case_id: Some("energy-case".to_string()),
            group_id: None,
            row_id: "energy_volume".to_string(),
            mlip_id: Some("mace".to_string()),
            prediction: json!({"energy_ev_per_atom": 1.00}),
            support: Some(SupportEvidence {
                correction: Some(json!({"energy_bias_ev_per_atom": -0.65})),
                diagnostics: Some(json!({"support_eval_distance": 0.08})),
            }),
            context: None,
            reference: json!({"energy_ev_per_atom": 0.35}),
            weight: 1.0,
        }];

        let report = hill_climb(&cases, &args(HillClimbObjective::Accuracy)).unwrap();
        assert!(
            report
                .best_candidate
                .policy_limits
                .max_energy_bias_ev_per_atom
                > PolicyLimits::default().max_energy_bias_ev_per_atom
        );
        assert!(report.best_candidate.accuracy_delta_mean > 0.80);
    }

    #[test]
    fn acceleration_objective_prefers_lower_intervention_cost_for_equal_accuracy() {
        let cases = vec![HillClimbCase {
            schema: Some("lupine.distill.hill_climb_case.v1".to_string()),
            case_id: Some("zero-bias".to_string()),
            group_id: None,
            row_id: "energy_volume".to_string(),
            mlip_id: Some("chgnet".to_string()),
            prediction: json!({"energy_ev_per_atom": 0.10}),
            support: Some(SupportEvidence {
                correction: Some(json!({"energy_bias_ev_per_atom": 0.0})),
                diagnostics: None,
            }),
            context: None,
            reference: json!({"energy_ev_per_atom": 0.10}),
            weight: 1.0,
        }];

        let report = hill_climb(&cases, &args(HillClimbObjective::AccuracyAccelerate)).unwrap();
        assert_eq!(report.best_candidate.refusal_rate, 0.0);
        assert!(report.best_candidate.runtime_proxy_mean <= 1.03);
        assert!(report.best_candidate.corrected_accuracy_mean > 0.99);
    }

    #[test]
    fn objective_penalizes_case_level_regression_even_when_mean_can_hide_it() {
        let summary = ActionSummary::default();
        let improved = case_objective(
            0.02,
            0.10,
            runtime_proxy(&summary),
            &summary,
            HillClimbObjective::Accuracy,
        );
        let regressed = case_objective(
            0.02,
            -0.10,
            runtime_proxy(&summary),
            &summary,
            HillClimbObjective::Accuracy,
        );

        assert!(improved > regressed + 1.0);
        assert_eq!(relative_lift(10.0, 8.0), 0.2);
    }

    #[test]
    fn rejects_unknown_case_schema() {
        let cases = vec![HillClimbCase {
            schema: Some("wrong".to_string()),
            case_id: None,
            group_id: None,
            row_id: "energy_volume".to_string(),
            mlip_id: None,
            prediction: json!({"energy_ev_per_atom": 0.0}),
            support: None,
            context: None,
            reference: json!({"energy_ev_per_atom": 0.0}),
            weight: 1.0,
        }];

        let error = validate_cases(cases).unwrap_err().to_string();
        assert!(error.contains("unsupported hill-climb case schema"));
    }
}
