//! Versioned Lupine Distill ribbon policy engine.
//!
//! Python MLIP runners can keep owning ASE/backend integration, but the
//! canonical Distill decision surface lives here: a stable ribbon version,
//! deterministic guard/correction rules, and an auditable decision packet.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{bail, Context, Result};
use clap::Args;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};

pub(crate) const DEFAULT_RIBBON_VERSION: &str = "hyperribbon-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub(crate) struct PolicyLimits {
    pub(crate) max_energy_bias_ev_per_atom: f64,
    #[serde(default)]
    pub(crate) max_energy_zero_point_shift_ev_per_atom: f64,
    #[serde(default = "default_min_energy_zero_point_support_lift_fraction")]
    pub(crate) min_energy_zero_point_support_lift_fraction: f64,
    pub(crate) max_stress_bias_gpa: f64,
    pub(crate) max_force_bias_ev_per_angstrom: f64,
    pub(crate) max_force_norm_ev_per_angstrom: f64,
    pub(crate) max_stress_abs_gpa: f64,
    #[serde(default = "default_correction_scale")]
    pub(crate) energy_correction_scale: f64,
    #[serde(default = "default_correction_scale")]
    pub(crate) stress_correction_scale: f64,
    #[serde(default = "default_correction_scale")]
    pub(crate) force_correction_scale: f64,
    #[serde(default = "default_min_support_lift_fraction")]
    pub(crate) min_support_lift_fraction: f64,
    #[serde(default = "default_max_support_eval_distance_proxy")]
    pub(crate) max_support_eval_distance_proxy: f64,
    #[serde(default = "default_max_ribbon_feature_distance_proxy")]
    pub(crate) max_ribbon_feature_distance_proxy: f64,
    #[serde(default)]
    pub(crate) min_ribbon_support_error_before: f64,
    #[serde(default = "default_max_stiff_axis_drift_fraction")]
    pub(crate) max_stiff_axis_drift_fraction: f64,
    #[serde(default)]
    pub(crate) min_complement_residual_fraction: f64,
    #[serde(default = "default_max_projection_distance_proxy")]
    pub(crate) max_projection_distance_proxy: f64,
    #[serde(default = "default_min_projected_support_lift_fraction")]
    pub(crate) min_projected_support_lift_fraction: f64,
    #[serde(default)]
    pub(crate) require_material_root_overlap: bool,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub(crate) row_policy_overrides: BTreeMap<String, PolicyLimitOverride>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub(crate) struct PolicyLimitOverride {
    #[serde(default)]
    pub(crate) max_energy_bias_ev_per_atom: Option<f64>,
    #[serde(default)]
    pub(crate) max_energy_zero_point_shift_ev_per_atom: Option<f64>,
    #[serde(default)]
    pub(crate) min_energy_zero_point_support_lift_fraction: Option<f64>,
    #[serde(default)]
    pub(crate) max_stress_bias_gpa: Option<f64>,
    #[serde(default)]
    pub(crate) max_force_bias_ev_per_angstrom: Option<f64>,
    #[serde(default)]
    pub(crate) max_force_norm_ev_per_angstrom: Option<f64>,
    #[serde(default)]
    pub(crate) max_stress_abs_gpa: Option<f64>,
    #[serde(default)]
    pub(crate) energy_correction_scale: Option<f64>,
    #[serde(default)]
    pub(crate) stress_correction_scale: Option<f64>,
    #[serde(default)]
    pub(crate) force_correction_scale: Option<f64>,
    #[serde(default)]
    pub(crate) min_support_lift_fraction: Option<f64>,
    #[serde(default)]
    pub(crate) max_support_eval_distance_proxy: Option<f64>,
    #[serde(default)]
    pub(crate) max_ribbon_feature_distance_proxy: Option<f64>,
    #[serde(default)]
    pub(crate) min_ribbon_support_error_before: Option<f64>,
    #[serde(default)]
    pub(crate) max_stiff_axis_drift_fraction: Option<f64>,
    #[serde(default)]
    pub(crate) min_complement_residual_fraction: Option<f64>,
    #[serde(default)]
    pub(crate) max_projection_distance_proxy: Option<f64>,
    #[serde(default)]
    pub(crate) min_projected_support_lift_fraction: Option<f64>,
    #[serde(default)]
    pub(crate) require_material_root_overlap: Option<bool>,
}

impl Default for PolicyLimits {
    fn default() -> Self {
        Self {
            max_energy_bias_ev_per_atom: 0.5,
            max_energy_zero_point_shift_ev_per_atom: 0.0,
            min_energy_zero_point_support_lift_fraction:
                default_min_energy_zero_point_support_lift_fraction(),
            max_stress_bias_gpa: 25.0,
            max_force_bias_ev_per_angstrom: 1.0,
            max_force_norm_ev_per_angstrom: 200.0,
            max_stress_abs_gpa: 5000.0,
            energy_correction_scale: 1.0,
            stress_correction_scale: 1.0,
            force_correction_scale: 1.0,
            min_support_lift_fraction: 0.02,
            max_support_eval_distance_proxy: 1.0,
            max_ribbon_feature_distance_proxy: 1.0e9,
            min_ribbon_support_error_before: 0.0,
            max_stiff_axis_drift_fraction: default_max_stiff_axis_drift_fraction(),
            min_complement_residual_fraction: 0.0,
            max_projection_distance_proxy: default_max_projection_distance_proxy(),
            min_projected_support_lift_fraction: default_min_projected_support_lift_fraction(),
            require_material_root_overlap: false,
            row_policy_overrides: BTreeMap::new(),
        }
    }
}

impl PolicyLimits {
    pub(crate) fn validate(&self) -> Result<()> {
        let fields = [
            (
                "max_energy_bias_ev_per_atom",
                self.max_energy_bias_ev_per_atom,
            ),
            ("max_stress_bias_gpa", self.max_stress_bias_gpa),
            (
                "max_force_bias_ev_per_angstrom",
                self.max_force_bias_ev_per_angstrom,
            ),
            (
                "max_force_norm_ev_per_angstrom",
                self.max_force_norm_ev_per_angstrom,
            ),
            ("max_stress_abs_gpa", self.max_stress_abs_gpa),
        ];
        for (field, value) in fields {
            if !value.is_finite() || value <= 0.0 {
                bail!("policy limit {field} must be positive and finite");
            }
        }
        for (field, value) in [
            ("energy_correction_scale", self.energy_correction_scale),
            ("stress_correction_scale", self.stress_correction_scale),
            ("force_correction_scale", self.force_correction_scale),
        ] {
            if !value.is_finite() || !(-2.0..=2.0).contains(&value) {
                bail!("policy scale {field} must be finite and between -2 and 2");
            }
        }
        if !self.min_support_lift_fraction.is_finite()
            || !(0.0..=1.0).contains(&self.min_support_lift_fraction)
        {
            bail!("min_support_lift_fraction must be finite and between 0 and 1");
        }
        if !self.max_energy_zero_point_shift_ev_per_atom.is_finite()
            || self.max_energy_zero_point_shift_ev_per_atom < 0.0
        {
            bail!("max_energy_zero_point_shift_ev_per_atom must be non-negative and finite");
        }
        if !self.min_energy_zero_point_support_lift_fraction.is_finite()
            || !(0.0..=1.0).contains(&self.min_energy_zero_point_support_lift_fraction)
        {
            bail!("min_energy_zero_point_support_lift_fraction must be finite and between 0 and 1");
        }
        if !self.max_support_eval_distance_proxy.is_finite()
            || self.max_support_eval_distance_proxy < 0.0
        {
            bail!("max_support_eval_distance_proxy must be non-negative and finite");
        }
        if !self.max_ribbon_feature_distance_proxy.is_finite()
            || self.max_ribbon_feature_distance_proxy < 0.0
        {
            bail!("max_ribbon_feature_distance_proxy must be non-negative and finite");
        }
        if !self.min_ribbon_support_error_before.is_finite()
            || self.min_ribbon_support_error_before < 0.0
        {
            bail!("min_ribbon_support_error_before must be non-negative and finite");
        }
        if !self.max_stiff_axis_drift_fraction.is_finite()
            || !(0.0..=1.0).contains(&self.max_stiff_axis_drift_fraction)
        {
            bail!("max_stiff_axis_drift_fraction must be finite and between 0 and 1");
        }
        if !self.min_complement_residual_fraction.is_finite()
            || !(0.0..=1.0).contains(&self.min_complement_residual_fraction)
        {
            bail!("min_complement_residual_fraction must be finite and between 0 and 1");
        }
        if !self.max_projection_distance_proxy.is_finite()
            || self.max_projection_distance_proxy < 0.0
        {
            bail!("max_projection_distance_proxy must be non-negative and finite");
        }
        if !self.min_projected_support_lift_fraction.is_finite()
            || !(0.0..=1.0).contains(&self.min_projected_support_lift_fraction)
        {
            bail!("min_projected_support_lift_fraction must be finite and between 0 and 1");
        }
        for (row_id, limits_override) in &self.row_policy_overrides {
            if row_id.trim().is_empty() {
                bail!("row_policy_overrides row ids must be non-empty");
            }
            let mut row_limits = self.clone();
            row_limits.row_policy_overrides.clear();
            row_limits.apply_override(limits_override);
            row_limits
                .validate()
                .with_context(|| format!("invalid row_policy_overrides[{row_id}]"))?;
        }
        Ok(())
    }

    pub(crate) fn for_row(&self, row_id: &str) -> Result<Self> {
        let mut limits = self.clone();
        limits.row_policy_overrides.clear();
        if let Some(limits_override) = self.row_policy_overrides.get(row_id) {
            limits.apply_override(limits_override);
            limits
                .validate()
                .with_context(|| format!("invalid active policy limits for row {row_id}"))?;
        }
        Ok(limits)
    }

    fn apply_override(&mut self, limits_override: &PolicyLimitOverride) {
        if let Some(value) = limits_override.max_energy_bias_ev_per_atom {
            self.max_energy_bias_ev_per_atom = value;
        }
        if let Some(value) = limits_override.max_energy_zero_point_shift_ev_per_atom {
            self.max_energy_zero_point_shift_ev_per_atom = value;
        }
        if let Some(value) = limits_override.min_energy_zero_point_support_lift_fraction {
            self.min_energy_zero_point_support_lift_fraction = value;
        }
        if let Some(value) = limits_override.max_stress_bias_gpa {
            self.max_stress_bias_gpa = value;
        }
        if let Some(value) = limits_override.max_force_bias_ev_per_angstrom {
            self.max_force_bias_ev_per_angstrom = value;
        }
        if let Some(value) = limits_override.max_force_norm_ev_per_angstrom {
            self.max_force_norm_ev_per_angstrom = value;
        }
        if let Some(value) = limits_override.max_stress_abs_gpa {
            self.max_stress_abs_gpa = value;
        }
        if let Some(value) = limits_override.energy_correction_scale {
            self.energy_correction_scale = value;
        }
        if let Some(value) = limits_override.stress_correction_scale {
            self.stress_correction_scale = value;
        }
        if let Some(value) = limits_override.force_correction_scale {
            self.force_correction_scale = value;
        }
        if let Some(value) = limits_override.min_support_lift_fraction {
            self.min_support_lift_fraction = value;
        }
        if let Some(value) = limits_override.max_support_eval_distance_proxy {
            self.max_support_eval_distance_proxy = value;
        }
        if let Some(value) = limits_override.max_ribbon_feature_distance_proxy {
            self.max_ribbon_feature_distance_proxy = value;
        }
        if let Some(value) = limits_override.min_ribbon_support_error_before {
            self.min_ribbon_support_error_before = value;
        }
        if let Some(value) = limits_override.max_stiff_axis_drift_fraction {
            self.max_stiff_axis_drift_fraction = value;
        }
        if let Some(value) = limits_override.min_complement_residual_fraction {
            self.min_complement_residual_fraction = value;
        }
        if let Some(value) = limits_override.max_projection_distance_proxy {
            self.max_projection_distance_proxy = value;
        }
        if let Some(value) = limits_override.min_projected_support_lift_fraction {
            self.min_projected_support_lift_fraction = value;
        }
        if let Some(value) = limits_override.require_material_root_overlap {
            self.require_material_root_overlap = value;
        }
    }
}

fn default_correction_scale() -> f64 {
    1.0
}

fn default_min_support_lift_fraction() -> f64 {
    0.02
}

fn default_min_energy_zero_point_support_lift_fraction() -> f64 {
    0.95
}

fn default_max_support_eval_distance_proxy() -> f64 {
    1.0
}

fn default_max_ribbon_feature_distance_proxy() -> f64 {
    1.0e9
}

fn default_max_stiff_axis_drift_fraction() -> f64 {
    0.05
}

fn default_max_projection_distance_proxy() -> f64 {
    1.0e9
}

fn default_min_projected_support_lift_fraction() -> f64 {
    0.02
}

#[derive(Debug, Clone, Args)]
pub struct DistillPolicyArgs {
    /// JSON policy request emitted by an MLIP runner or local harness.
    #[arg(long)]
    pub request: Option<PathBuf>,
    /// JSONL policy requests for one runner cell. One request per line.
    #[arg(long)]
    pub request_jsonl: Option<PathBuf>,
    /// Optional decision output. Single requests write pretty JSON; JSONL
    /// requests write one compact decision per line. If omitted, writes to
    /// stdout.
    #[arg(long)]
    pub output: Option<PathBuf>,
    /// Canonical ribbon version to enforce when request omits one.
    #[arg(long, default_value = DEFAULT_RIBBON_VERSION)]
    pub ribbon_version: String,
    /// Optional JSON object containing PolicyLimits from a hill-climb report.
    #[arg(long)]
    pub policy_limits: Option<PathBuf>,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct PolicyRequest {
    #[serde(default)]
    pub(crate) schema: Option<String>,
    #[serde(default)]
    pub(crate) ribbon_version: Option<String>,
    pub(crate) row_id: String,
    #[serde(default)]
    pub(crate) mlip_id: Option<String>,
    pub(crate) prediction: Value,
    #[serde(default)]
    pub(crate) support: Option<SupportEvidence>,
    #[serde(default)]
    pub(crate) context: Option<Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct SupportEvidence {
    #[serde(default)]
    pub(crate) correction: Option<Value>,
    #[serde(default)]
    pub(crate) diagnostics: Option<Value>,
}

#[derive(Debug, Clone, Deserialize)]
struct RibbonResidualCorrection {
    #[serde(default)]
    schema: Option<String>,
    field: String,
    feature_names: Vec<String>,
    feature_mean: Vec<f64>,
    feature_scale: Vec<f64>,
    coefficients: Vec<Vec<f64>>,
    intercept: Vec<f64>,
    #[serde(default)]
    support_lift_fraction: Option<f64>,
    #[serde(default)]
    support_error_before: Option<f64>,
    #[serde(default)]
    support_eval_distance_proxy: Option<f64>,
    #[serde(default)]
    matrix_rank: Option<usize>,
    #[serde(default)]
    sample_count: Option<usize>,
    #[serde(default)]
    participation_ratio: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
struct RibbonProjectedResidualCorrection {
    #[serde(default)]
    schema: Option<String>,
    field: String,
    feature_names: Vec<String>,
    feature_mean: Vec<f64>,
    feature_scale: Vec<f64>,
    coefficients: Vec<Vec<f64>>,
    intercept: Vec<f64>,
    #[serde(default)]
    stiff_axis_basis: Vec<Vec<f64>>,
    #[serde(default)]
    complement_basis: Vec<Vec<f64>>,
    #[serde(default)]
    support_lift_fraction: Option<f64>,
    #[serde(default)]
    projected_support_lift_fraction: Option<f64>,
    #[serde(default)]
    complement_residual_fraction: Option<f64>,
    #[serde(default)]
    stiff_axis_drift_fraction: Option<f64>,
    #[serde(default)]
    projection_distance_proxy: Option<f64>,
    #[serde(default)]
    support_error_before: Option<f64>,
    #[serde(default)]
    support_eval_distance_proxy: Option<f64>,
    #[serde(default)]
    matrix_rank: Option<usize>,
    #[serde(default)]
    sample_count: Option<usize>,
    #[serde(default)]
    participation_ratio: Option<f64>,
    #[serde(default)]
    singular_values: Vec<f64>,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct PolicyDecision {
    pub(crate) schema: String,
    pub(crate) ribbon_version: String,
    pub(crate) decision_id: String,
    pub(crate) row_id: String,
    pub(crate) mlip_id: Option<String>,
    pub(crate) decision: String,
    pub(crate) actions: Vec<PolicyAction>,
    pub(crate) corrected_prediction: Value,
    pub(crate) applied_corrections: Map<String, Value>,
    pub(crate) refused: bool,
    pub(crate) theorem_hooks: Value,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct PolicyAction {
    pub(crate) action: String,
    pub(crate) reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) field: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) value: Option<Value>,
}

impl PolicyAction {
    fn accept(reason: &str) -> Self {
        Self {
            action: "accept".to_string(),
            reason: reason.to_string(),
            field: None,
            value: None,
        }
    }

    fn refuse(reason: &str, field: &str) -> Self {
        Self {
            action: "refuse".to_string(),
            reason: reason.to_string(),
            field: Some(field.to_string()),
            value: None,
        }
    }

    fn tighten(reason: &str, field: &str) -> Self {
        Self {
            action: "tighten".to_string(),
            reason: reason.to_string(),
            field: Some(field.to_string()),
            value: None,
        }
    }

    fn delta(field: &str, value: Value) -> Self {
        Self {
            action: "delta_correct".to_string(),
            reason: "support_gate_passed".to_string(),
            field: Some(field.to_string()),
            value: Some(value),
        }
    }

    fn blocked(field: &str, reason: &str, value: Value) -> Self {
        Self {
            action: "delta_correct_blocked".to_string(),
            reason: reason.to_string(),
            field: Some(field.to_string()),
            value: Some(value),
        }
    }
}

pub fn run(args: DistillPolicyArgs) -> Result<()> {
    let limits = load_policy_limits(args.policy_limits.as_deref())?;
    match (args.request.as_ref(), args.request_jsonl.as_ref()) {
        (Some(_), Some(_)) => bail!("use either --request or --request-jsonl, not both"),
        (Some(path), None) => {
            run_single(path, args.output.as_deref(), &args.ribbon_version, &limits)
        }
        (None, Some(path)) => {
            run_jsonl(path, args.output.as_deref(), &args.ribbon_version, &limits)
        }
        (None, None) => bail!("missing --request or --request-jsonl"),
    }
}

fn load_policy_limits(path: Option<&Path>) -> Result<PolicyLimits> {
    let Some(path) = path else {
        return Ok(PolicyLimits::default());
    };
    let text = fs::read_to_string(path)
        .with_context(|| format!("read policy limits {}", path.display()))?;
    let limits: PolicyLimits = serde_json::from_str(&text).context("parse policy limits JSON")?;
    limits.validate()?;
    Ok(limits)
}

fn run_single(
    request_path: &Path,
    output_path: Option<&Path>,
    ribbon_version: &str,
    limits: &PolicyLimits,
) -> Result<()> {
    let request_text = fs::read_to_string(request_path)
        .with_context(|| format!("read request {}", request_path.display()))?;
    let request: PolicyRequest =
        serde_json::from_str(&request_text).context("parse distill policy request JSON")?;
    let decision = decide_with_limits(&request, ribbon_version, limits)?;
    write_output(output_path, &serde_json::to_string_pretty(&decision)?, true)
}

fn run_jsonl(
    request_path: &Path,
    output_path: Option<&Path>,
    ribbon_version: &str,
    limits: &PolicyLimits,
) -> Result<()> {
    let request_text = fs::read_to_string(request_path)
        .with_context(|| format!("read request JSONL {}", request_path.display()))?;
    let mut decisions = Vec::new();
    for (idx, line) in request_text.lines().enumerate() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let request: PolicyRequest = serde_json::from_str(trimmed)
            .with_context(|| format!("parse distill policy request JSONL line {}", idx + 1))?;
        decisions.push(decide_with_limits(&request, ribbon_version, limits)?);
    }
    let mut output = String::new();
    for decision in decisions {
        output.push_str(&serde_json::to_string(&decision)?);
        output.push('\n');
    }
    write_output(output_path, &output, false)
}

fn write_output(output_path: Option<&Path>, output: &str, ensure_newline: bool) -> Result<()> {
    if let Some(path) = output_path {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(path, output)?;
    } else if ensure_newline {
        println!("{output}");
    } else {
        print!("{output}");
    }
    Ok(())
}

pub(crate) fn decide(
    request: &PolicyRequest,
    fallback_ribbon_version: &str,
) -> Result<PolicyDecision> {
    decide_with_limits(request, fallback_ribbon_version, &PolicyLimits::default())
}

pub(crate) fn decide_with_limits(
    request: &PolicyRequest,
    fallback_ribbon_version: &str,
    limits: &PolicyLimits,
) -> Result<PolicyDecision> {
    if let Some(schema) = &request.schema {
        if schema != "lupine.distill.policy_request.v1" {
            bail!("unsupported policy request schema: {schema}");
        }
    }
    if !request.prediction.is_object() {
        bail!("prediction must be a JSON object");
    }

    let ribbon_version = request
        .ribbon_version
        .as_deref()
        .unwrap_or(fallback_ribbon_version)
        .to_string();
    let mut corrected = request.prediction.clone();
    let mut actions = Vec::new();
    let mut applied = Map::new();
    let row_limits = limits.for_row(&request.row_id)?;

    apply_support_corrections(
        request,
        &mut corrected,
        &mut actions,
        &mut applied,
        &row_limits,
    )?;
    actions.extend(guard_prediction(&request.row_id, &corrected, &row_limits));
    if !actions.iter().any(|action| action.action == "accept")
        && !actions.iter().any(|action| action.action == "refuse")
        && !actions.iter().any(|action| action.action == "tighten")
    {
        actions.push(PolicyAction::accept("runtime_guards_passed"));
    }
    if actions
        .iter()
        .all(|action| action.action == "delta_correct" || action.action == "delta_correct_blocked")
    {
        actions.push(PolicyAction::accept("runtime_guards_passed"));
    }

    let refused = actions.iter().any(|action| action.action == "refuse");
    let decision = if refused {
        "refuse"
    } else if actions.iter().any(|action| action.action == "tighten") {
        "tighten"
    } else {
        "accept"
    };
    let base_policy_limits_id = policy_limits_id(limits)?;
    let active_policy_limits_id = policy_limits_id(&row_limits)?;
    let theorem_hooks = json!({
        "schema": "lupine.distill.theorem_hooks.v1",
        "ribbon_version": ribbon_version,
        "policy_limits_id": active_policy_limits_id,
        "base_policy_limits_id": base_policy_limits_id,
        "policy_limits": row_limits,
        "bridge": "outer_loop_proxy",
        "layerwise_exact": false,
        "support_diagnostics_present": request.support.as_ref().and_then(|s| s.diagnostics.as_ref()).is_some(),
        "policy_engine": "atlas-distill",
        "theorem_development_lanes": [
            {
                "lane": "stiff_axis_preservation",
                "status": if applied.contains_key("ribbon_projected_residual_correction_v1") { "measured" } else { "not_applied" },
                "runtime_proxy": "feature_space_projection"
            },
            {
                "lane": "orthogonal_complement_lift",
                "status": if applied.contains_key("ribbon_projected_residual_correction_v1") { "measured" } else { "not_applied" },
                "runtime_proxy": "projected_support_lift_fraction"
            },
            {
                "lane": "projection_tube_refusal",
                "status": "policy_gate",
                "runtime_proxy": "projection_distance_proxy"
            },
            {
                "lane": "vandermonde_decay",
                "status": "diagnostic",
                "runtime_proxy": "singular_values_and_participation_ratio"
            }
        ],
    });
    let decision_id = decision_id(
        &ribbon_version,
        &request.row_id,
        request.mlip_id.as_deref(),
        &corrected,
        &actions,
        &row_limits,
    )?;

    Ok(PolicyDecision {
        schema: "lupine.distill.policy_decision.v1".to_string(),
        ribbon_version,
        decision_id,
        row_id: request.row_id.clone(),
        mlip_id: request.mlip_id.clone(),
        decision: decision.to_string(),
        actions,
        corrected_prediction: corrected,
        applied_corrections: applied,
        refused,
        theorem_hooks,
    })
}

fn apply_support_corrections(
    request: &PolicyRequest,
    corrected: &mut Value,
    actions: &mut Vec<PolicyAction>,
    applied: &mut Map<String, Value>,
    limits: &PolicyLimits,
) -> Result<()> {
    let Some(correction) = request
        .support
        .as_ref()
        .and_then(|support| support.correction.as_ref())
    else {
        return Ok(());
    };

    let ribbon_fields =
        apply_ribbon_residual_correction(request, correction, corrected, actions, applied, limits);

    if request.row_id == "energy_volume"
        && !ribbon_fields
            .iter()
            .any(|field| field == "energy_ev_per_atom")
    {
        if let Some(bias) = number_field(correction, "energy_bias_ev_per_atom") {
            let scaled_bias = bias * limits.energy_correction_scale;
            if let Some(blocked) =
                support_gate_action(request, "energy_ev_per_atom", json!(scaled_bias), limits)
            {
                actions.push(blocked);
            } else if limits.energy_correction_scale == 0.0 {
                actions.push(PolicyAction::blocked(
                    "energy_ev_per_atom",
                    "blocked_zero_correction_scale",
                    json!(bias),
                ));
            } else if scaled_bias.abs()
                <= max_correction_for_request_field(request, "energy_ev_per_atom", limits)
            {
                if let Some(current) = number_field(corrected, "energy_ev_per_atom") {
                    let value = json!(current + scaled_bias);
                    set_field(corrected, "energy_ev_per_atom", value.clone())?;
                    applied.insert("energy_bias_ev_per_atom".to_string(), json!(scaled_bias));
                    actions.push(PolicyAction::delta(
                        "energy_ev_per_atom",
                        json!(scaled_bias),
                    ));
                }
            } else {
                actions.push(PolicyAction::blocked(
                    "energy_ev_per_atom",
                    "blocked_large_bias",
                    json!(scaled_bias),
                ));
            }
        }
    }

    if request.row_id == "relaxation_stability"
        && !ribbon_fields
            .iter()
            .any(|field| field == "relaxed_energy_ev_per_atom")
    {
        if let Some(bias) = number_field(correction, "relaxed_energy_bias_ev_per_atom") {
            let scaled_bias = bias * limits.energy_correction_scale;
            if let Some(blocked) = support_gate_action(
                request,
                "relaxed_energy_ev_per_atom",
                json!(scaled_bias),
                limits,
            ) {
                actions.push(blocked);
            } else if limits.energy_correction_scale == 0.0 {
                actions.push(PolicyAction::blocked(
                    "relaxed_energy_ev_per_atom",
                    "blocked_zero_correction_scale",
                    json!(bias),
                ));
            } else if scaled_bias.abs()
                <= max_correction_for_request_field(request, "relaxed_energy_ev_per_atom", limits)
            {
                if let Some(current) = number_field(corrected, "relaxed_energy_ev_per_atom") {
                    let value = json!(current + scaled_bias);
                    set_field(corrected, "relaxed_energy_ev_per_atom", value.clone())?;
                    applied.insert(
                        "relaxed_energy_bias_ev_per_atom".to_string(),
                        json!(scaled_bias),
                    );
                    actions.push(PolicyAction::delta(
                        "relaxed_energy_ev_per_atom",
                        json!(scaled_bias),
                    ));
                }
            } else {
                actions.push(PolicyAction::blocked(
                    "relaxed_energy_ev_per_atom",
                    "blocked_large_bias",
                    json!(scaled_bias),
                ));
            }
        }
    }

    if (request.row_id == "stress" || request.row_id == "elastic_constants")
        && !ribbon_fields.iter().any(|field| field == "stress_gpa")
    {
        if let Some(bias) = numeric_array_field(correction, "stress_bias_gpa") {
            let scaled_bias: Vec<f64> = bias
                .iter()
                .map(|value| value * limits.stress_correction_scale)
                .collect();
            let max_abs = scaled_bias
                .iter()
                .map(|value| value.abs())
                .fold(0.0, f64::max);
            if max_abs <= limits.max_stress_bias_gpa {
                if let Some(blocked) =
                    support_gate_action(request, "stress_gpa", json!(scaled_bias), limits)
                {
                    actions.push(blocked);
                } else if limits.stress_correction_scale == 0.0 {
                    actions.push(PolicyAction::blocked(
                        "stress_gpa",
                        "blocked_zero_correction_scale",
                        json!(bias),
                    ));
                } else if let Some(stress) = numeric_array_field(corrected, "stress_gpa") {
                    if stress.len() == bias.len() {
                        if let Some(current) = corrected.get("stress_gpa").cloned() {
                            let delta = same_shape_from_flat(&current, &scaled_bias)
                                .unwrap_or_else(|| json!(scaled_bias));
                            if let Some(value) = add_same_shape(&current, &delta) {
                                set_field(corrected, "stress_gpa", value)?;
                                applied.insert("stress_bias_gpa".to_string(), json!(scaled_bias));
                                actions.push(PolicyAction::delta("stress_gpa", json!(scaled_bias)));
                            }
                        }
                    }
                }
            } else {
                actions.push(PolicyAction::blocked(
                    "stress_gpa",
                    "blocked_large_bias",
                    json!(scaled_bias),
                ));
            }
        }
    }

    if request.row_id == "forces"
        && !ribbon_fields
            .iter()
            .any(|field| field == "forces_ev_per_angstrom")
    {
        if let Some(bias) = numeric_array_field(correction, "force_bias_ev_per_angstrom") {
            let scaled_bias: Vec<f64> = bias
                .iter()
                .map(|value| value * limits.force_correction_scale)
                .collect();
            let max_abs = scaled_bias
                .iter()
                .map(|value| value.abs())
                .fold(0.0, f64::max);
            if max_abs <= limits.max_force_bias_ev_per_angstrom {
                if let Some(blocked) = support_gate_action(
                    request,
                    "forces_ev_per_angstrom",
                    json!(scaled_bias),
                    limits,
                ) {
                    actions.push(blocked);
                } else if limits.force_correction_scale == 0.0 {
                    actions.push(PolicyAction::blocked(
                        "forces_ev_per_angstrom",
                        "blocked_zero_correction_scale",
                        json!(bias),
                    ));
                } else if let Some(forces) =
                    numeric_array_field(corrected, "forces_ev_per_angstrom")
                {
                    if forces.len() == bias.len() || (bias.len() == 3 && forces.len() % 3 == 0) {
                        if let Some(current) = corrected.get("forces_ev_per_angstrom").cloned() {
                            let delta = if bias.len() == 3 && forces.len() % 3 == 0 {
                                json!(scaled_bias)
                            } else {
                                same_shape_from_flat(&current, &scaled_bias)
                                    .unwrap_or_else(|| json!(scaled_bias))
                            };
                            if let Some(value) = add_force_bias(&current, &delta) {
                                set_field(corrected, "forces_ev_per_angstrom", value)?;
                                applied.insert(
                                    "force_bias_ev_per_angstrom".to_string(),
                                    json!(scaled_bias),
                                );
                                actions.push(PolicyAction::delta(
                                    "forces_ev_per_angstrom",
                                    json!(scaled_bias),
                                ));
                            }
                        }
                    }
                }
            } else {
                actions.push(PolicyAction::blocked(
                    "forces_ev_per_angstrom",
                    "blocked_large_bias",
                    json!(scaled_bias),
                ));
            }
        }
    }
    Ok(())
}

fn apply_ribbon_residual_correction(
    request: &PolicyRequest,
    correction: &Value,
    corrected: &mut Value,
    actions: &mut Vec<PolicyAction>,
    applied: &mut Map<String, Value>,
    limits: &PolicyLimits,
) -> Vec<String> {
    if projected_ribbon_enabled(request) {
        if let Some(model_value) = correction.get("ribbon_projected_residual_correction_v1") {
            let Some(mut blocked) = try_apply_projected_ribbon_residual_correction(
                request,
                model_value,
                corrected,
                actions,
                applied,
                limits,
            ) else {
                return Vec::new();
            };
            if blocked.reason.is_empty() {
                return blocked
                    .field
                    .take()
                    .map(|field| vec![field])
                    .unwrap_or_default();
            }
            let field = blocked
                .field
                .clone()
                .unwrap_or_else(|| "unknown".to_string());
            actions.push(blocked);
            return vec![field];
        }
    }
    let Some(model_value) = correction.get("ribbon_residual_correction_v1") else {
        return Vec::new();
    };
    let Some(mut blocked) = try_apply_ribbon_residual_correction(
        request,
        model_value,
        corrected,
        actions,
        applied,
        limits,
    ) else {
        return Vec::new();
    };
    if blocked.reason.is_empty() {
        return blocked
            .field
            .take()
            .map(|field| vec![field])
            .unwrap_or_default();
    }
    let field = blocked
        .field
        .clone()
        .unwrap_or_else(|| "unknown".to_string());
    actions.push(blocked);
    vec![field]
}

fn projected_ribbon_enabled(request: &PolicyRequest) -> bool {
    request
        .ribbon_version
        .as_deref()
        .is_some_and(|version| version.contains("spectral"))
        || request
            .context
            .as_ref()
            .and_then(|context| context.get("projected_ribbon_enabled"))
            .and_then(Value::as_bool)
            .unwrap_or(false)
}

fn try_apply_projected_ribbon_residual_correction(
    request: &PolicyRequest,
    model_value: &Value,
    corrected: &mut Value,
    actions: &mut Vec<PolicyAction>,
    applied: &mut Map<String, Value>,
    limits: &PolicyLimits,
) -> Option<PolicyAction> {
    let model: RibbonProjectedResidualCorrection = match serde_json::from_value(model_value.clone())
    {
        Ok(model) => model,
        Err(_) => {
            return Some(PolicyAction::blocked(
                "ribbon_projected_residual_correction_v1",
                "blocked_invalid_projected_ribbon_model",
                model_value.clone(),
            ))
        }
    };
    if model
        .schema
        .as_deref()
        .is_some_and(|schema| schema != "lupine.distill.ribbon_projected_residual_correction.v1")
    {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_unsupported_projected_ribbon_schema",
            model_value.clone(),
        ));
    }
    let Some(current) = corrected.get(&model.field).cloned() else {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_missing_prediction_field",
            model_value.clone(),
        ));
    };
    let current_values = numeric_values(&current);
    let force_broadcast = model.field == "forces_ev_per_angstrom"
        && model.intercept.len() == 3
        && current_values.len().is_multiple_of(3);
    if current_values.is_empty()
        || (!force_broadcast && current_values.len() != model.intercept.len())
    {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_projected_ribbon_output_shape_mismatch",
            json!({
                "field": model.field,
                "prediction_dim": current_values.len(),
                "model_dim": model.intercept.len(),
            }),
        ));
    }
    if model.feature_names.len() != model.feature_mean.len()
        || model.feature_names.len() != model.feature_scale.len()
        || model.coefficients.len() != model.intercept.len()
        || model
            .coefficients
            .iter()
            .any(|row| row.len() != model.feature_names.len())
    {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_invalid_projected_ribbon_dimensions",
            model_value.clone(),
        ));
    }
    if normalized_basis(&model.complement_basis, model.feature_names.len()).is_empty() {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_missing_complement_basis",
            model_value.clone(),
        ));
    }
    if let Some(blocked) = projected_ribbon_gate_action(request, &model, limits) {
        return Some(blocked);
    }
    let scale = correction_scale_for_field(&model.field, limits);
    if scale == 0.0 {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_zero_correction_scale",
            json!({"field": model.field}),
        ));
    }

    let mut features = Vec::with_capacity(model.feature_names.len());
    for (idx, name) in model.feature_names.iter().enumerate() {
        let Some(value) = feature_value(name, corrected) else {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_missing_projected_ribbon_feature",
                json!({"feature": name}),
            ));
        };
        let divisor = if model.feature_scale[idx].abs() < 1e-12 {
            1.0
        } else {
            model.feature_scale[idx]
        };
        features.push((value - model.feature_mean[idx]) / divisor);
    }

    let complement_features = project_onto_basis(&features, &model.complement_basis)?;
    let stiff_features = project_onto_basis(&features, &model.stiff_axis_basis)
        .unwrap_or_else(|| vec![0.0; features.len()]);
    let full_response = matrix_vector(&model.coefficients, &features);
    let stiff_response = matrix_vector(&model.coefficients, &stiff_features);
    let stiff_axis_signal_fraction =
        vector_norm(&stiff_response) / vector_norm(&full_response).max(1e-12);
    if stiff_axis_signal_fraction > limits.max_stiff_axis_drift_fraction {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_stiff_axis_signal",
            json!({
                "stiff_axis_signal_fraction": stiff_axis_signal_fraction,
                "max_stiff_axis_drift_fraction": limits.max_stiff_axis_drift_fraction,
            }),
        ));
    }

    let mut delta = Vec::with_capacity(model.intercept.len());
    for (row_idx, intercept) in model.intercept.iter().enumerate() {
        let correction = model.coefficients[row_idx]
            .iter()
            .zip(complement_features.iter())
            .fold(*intercept, |sum, (coef, value)| sum + coef * value)
            * scale;
        delta.push(correction);
    }
    let projected_stiff = project_onto_basis(&delta, &model.stiff_axis_basis).unwrap_or_default();
    let stiff_axis_drift_fraction = vector_norm(&projected_stiff) / vector_norm(&delta).max(1e-12);
    if stiff_axis_drift_fraction > limits.max_stiff_axis_drift_fraction {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_stiff_axis_drift",
            json!({
                "stiff_axis_drift_fraction": stiff_axis_drift_fraction,
                "max_stiff_axis_drift_fraction": limits.max_stiff_axis_drift_fraction,
            }),
        ));
    }

    let max_abs = delta.iter().map(|value| value.abs()).fold(0.0, f64::max);
    let max_allowed = max_ribbon_correction_for_field(
        request,
        &model.field,
        model
            .projected_support_lift_fraction
            .or(model.support_lift_fraction),
        limits,
    );
    if max_abs > max_allowed {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_large_projected_ribbon_correction",
            json!(delta),
        ));
    }
    let delta_value = same_shape_from_flat(&current, &delta).unwrap_or_else(|| json!(delta));
    let next_value = if model.field == "forces_ev_per_angstrom" {
        add_force_bias(&current, &delta_value)
    } else {
        add_same_shape(&current, &delta_value)
    };
    let Some(value) = next_value else {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_projected_ribbon_delta_shape_mismatch",
            json!(delta),
        ));
    };
    if set_field(corrected, &model.field, value).is_err() {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_invalid_prediction_object",
            json!(delta),
        ));
    }
    applied.insert(
        "ribbon_projected_residual_correction_v1".to_string(),
        json!({
            "field": model.field,
            "delta": delta,
            "scale": scale,
            "basis_space": "feature",
            "stiff_axis_signal_fraction": stiff_axis_signal_fraction,
            "stiff_axis_drift_fraction": stiff_axis_drift_fraction,
            "complement_residual_fraction": model.complement_residual_fraction,
            "projected_support_lift_fraction": model.projected_support_lift_fraction,
            "projection_distance_proxy": model.projection_distance_proxy,
            "matrix_rank": model.matrix_rank,
            "sample_count": model.sample_count,
            "participation_ratio": model.participation_ratio,
            "singular_values": model.singular_values,
            "correction_mode": "orthogonal_complement_projected_ribbon",
        }),
    );
    actions.push(PolicyAction::delta(&model.field, json!(delta)));
    Some(PolicyAction {
        action: "handled".to_string(),
        reason: String::new(),
        field: Some(model.field),
        value: None,
    })
}

fn try_apply_ribbon_residual_correction(
    request: &PolicyRequest,
    model_value: &Value,
    corrected: &mut Value,
    actions: &mut Vec<PolicyAction>,
    applied: &mut Map<String, Value>,
    limits: &PolicyLimits,
) -> Option<PolicyAction> {
    let model: RibbonResidualCorrection = match serde_json::from_value(model_value.clone()) {
        Ok(model) => model,
        Err(_) => {
            return Some(PolicyAction::blocked(
                "ribbon_residual_correction_v1",
                "blocked_invalid_ribbon_model",
                model_value.clone(),
            ))
        }
    };
    if model
        .schema
        .as_deref()
        .is_some_and(|schema| schema != "lupine.distill.ribbon_residual_correction.v1")
    {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_unsupported_ribbon_model_schema",
            model_value.clone(),
        ));
    }
    let Some(current) = corrected.get(&model.field).cloned() else {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_missing_prediction_field",
            model_value.clone(),
        ));
    };
    let current_values = numeric_values(&current);
    let force_broadcast = model.field == "forces_ev_per_angstrom"
        && model.intercept.len() == 3
        && current_values.len().is_multiple_of(3);
    if current_values.is_empty()
        || (!force_broadcast && current_values.len() != model.intercept.len())
    {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_ribbon_output_shape_mismatch",
            json!({
                "field": model.field,
                "prediction_dim": current_values.len(),
                "model_dim": model.intercept.len(),
            }),
        ));
    }
    if model.feature_names.len() != model.feature_mean.len()
        || model.feature_names.len() != model.feature_scale.len()
        || model.coefficients.len() != model.intercept.len()
        || model
            .coefficients
            .iter()
            .any(|row| row.len() != model.feature_names.len())
    {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_invalid_ribbon_dimensions",
            model_value.clone(),
        ));
    }
    if let Some(blocked) = ribbon_gate_action(request, &model, limits) {
        return Some(blocked);
    }
    let scale = correction_scale_for_field(&model.field, limits);
    if scale == 0.0 {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_zero_correction_scale",
            json!({"field": model.field}),
        ));
    }

    let mut features = Vec::with_capacity(model.feature_names.len());
    for (idx, name) in model.feature_names.iter().enumerate() {
        let Some(value) = feature_value(name, corrected) else {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_missing_ribbon_feature",
                json!({"feature": name}),
            ));
        };
        let divisor = if model.feature_scale[idx].abs() < 1e-12 {
            1.0
        } else {
            model.feature_scale[idx]
        };
        features.push((value - model.feature_mean[idx]) / divisor);
    }

    let mut delta = Vec::with_capacity(model.intercept.len());
    for (row_idx, intercept) in model.intercept.iter().enumerate() {
        let correction = model.coefficients[row_idx]
            .iter()
            .zip(features.iter())
            .fold(*intercept, |sum, (coef, value)| sum + coef * value)
            * scale;
        delta.push(correction);
    }
    let max_abs = delta.iter().map(|value| value.abs()).fold(0.0, f64::max);
    let max_allowed =
        max_ribbon_correction_for_field(request, &model.field, model.support_lift_fraction, limits);
    if max_abs > max_allowed {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_large_ribbon_correction",
            json!(delta),
        ));
    }
    let delta_value = same_shape_from_flat(&current, &delta).unwrap_or_else(|| json!(delta));
    let next_value = if model.field == "forces_ev_per_angstrom" {
        add_force_bias(&current, &delta_value)
    } else {
        add_same_shape(&current, &delta_value)
    };
    let Some(value) = next_value else {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_ribbon_delta_shape_mismatch",
            json!(delta),
        ));
    };
    if set_field(corrected, &model.field, value).is_err() {
        return Some(PolicyAction::blocked(
            &model.field,
            "blocked_invalid_prediction_object",
            json!(delta),
        ));
    }
    applied.insert(
        "ribbon_residual_correction_v1".to_string(),
        json!({
            "field": model.field,
            "delta": delta,
            "scale": scale,
            "matrix_rank": model.matrix_rank,
            "sample_count": model.sample_count,
            "participation_ratio": model.participation_ratio,
            "correction_mode": correction_mode_for_applied_correction(
                request,
                &model.field,
                model.support_lift_fraction,
                limits
            ),
        }),
    );
    actions.push(PolicyAction::delta(&model.field, json!(delta)));
    Some(PolicyAction {
        action: "handled".to_string(),
        reason: String::new(),
        field: Some(model.field),
        value: None,
    })
}

fn support_gate_action(
    request: &PolicyRequest,
    field: &str,
    value: Value,
    limits: &PolicyLimits,
) -> Option<PolicyAction> {
    let diagnostics = request
        .support
        .as_ref()
        .and_then(|support| support.diagnostics.as_ref())?;
    if diagnostics
        .get("applicability_gate")
        .and_then(Value::as_str)
        .is_some_and(|gate| gate.starts_with("blocked"))
    {
        return Some(PolicyAction::blocked(
            field,
            "blocked_support_applicability_gate",
            value,
        ));
    }
    if let Some(distance) = diagnostic_number(diagnostics, "support_eval_distance_proxy") {
        if distance > limits.max_support_eval_distance_proxy {
            return Some(PolicyAction::blocked(
                field,
                "blocked_support_eval_distance",
                json!(distance),
            ));
        }
    }
    if let Some(action) = material_root_overlap_action(field, diagnostics, limits) {
        return Some(action);
    }
    if let Some(lift) = support_lift_fraction(field, diagnostics) {
        if lift <= 0.0 {
            return Some(PolicyAction::blocked(
                field,
                "blocked_nonpositive_support_lift",
                json!(lift),
            ));
        }
        if lift < limits.min_support_lift_fraction {
            return Some(PolicyAction::blocked(
                field,
                "blocked_insufficient_support_lift",
                json!(lift),
            ));
        }
    }
    None
}

fn ribbon_gate_action(
    request: &PolicyRequest,
    model: &RibbonResidualCorrection,
    limits: &PolicyLimits,
) -> Option<PolicyAction> {
    if let Some(diagnostics) = request
        .support
        .as_ref()
        .and_then(|support| support.diagnostics.as_ref())
    {
        if diagnostics
            .get("applicability_gate")
            .and_then(Value::as_str)
            .is_some_and(|gate| gate.starts_with("blocked"))
        {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_support_applicability_gate",
                json!({"field": model.field}),
            ));
        }
        if let Some(distance) = diagnostic_number(diagnostics, "support_eval_distance_proxy") {
            if distance > limits.max_support_eval_distance_proxy {
                return Some(PolicyAction::blocked(
                    &model.field,
                    "blocked_support_eval_distance",
                    json!(distance),
                ));
            }
        }
        if let Some(action) = material_root_overlap_action(&model.field, diagnostics, limits) {
            return Some(action);
        }
    }
    if let Some(distance) = model.support_eval_distance_proxy {
        if distance > limits.max_support_eval_distance_proxy {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_support_eval_distance",
                json!(distance),
            ));
        }
    }
    if let Some(distance) = request
        .context
        .as_ref()
        .and_then(|context| diagnostic_number(context, "ribbon_feature_distance_proxy"))
    {
        if distance > limits.max_ribbon_feature_distance_proxy {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_ribbon_feature_distance",
                json!(distance),
            ));
        }
    }
    if let Some(before) = model.support_error_before {
        if before < limits.min_ribbon_support_error_before {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_ribbon_support_error_floor",
                json!({
                    "support_error_before": before,
                    "min_ribbon_support_error_before": limits.min_ribbon_support_error_before,
                }),
            ));
        }
    }
    if let Some(lift) = model.support_lift_fraction {
        if lift <= 0.0 {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_nonpositive_support_lift",
                json!(lift),
            ));
        }
        if lift < limits.min_support_lift_fraction {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_insufficient_support_lift",
                json!(lift),
            ));
        }
    }
    None
}

fn projected_ribbon_gate_action(
    request: &PolicyRequest,
    model: &RibbonProjectedResidualCorrection,
    limits: &PolicyLimits,
) -> Option<PolicyAction> {
    if let Some(diagnostics) = request
        .support
        .as_ref()
        .and_then(|support| support.diagnostics.as_ref())
    {
        if diagnostics
            .get("applicability_gate")
            .and_then(Value::as_str)
            .is_some_and(|gate| gate.starts_with("blocked"))
        {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_support_applicability_gate",
                json!({"field": model.field}),
            ));
        }
        if let Some(distance) = diagnostic_number(diagnostics, "support_eval_distance_proxy") {
            if distance > limits.max_support_eval_distance_proxy {
                return Some(PolicyAction::blocked(
                    &model.field,
                    "blocked_support_eval_distance",
                    json!(distance),
                ));
            }
        }
        if let Some(action) = material_root_overlap_action(&model.field, diagnostics, limits) {
            return Some(action);
        }
    }
    if let Some(distance) = model.support_eval_distance_proxy {
        if distance > limits.max_support_eval_distance_proxy {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_support_eval_distance",
                json!(distance),
            ));
        }
    }
    let projection_distance = request
        .context
        .as_ref()
        .and_then(|context| diagnostic_number(context, "projection_distance_proxy"))
        .or(model.projection_distance_proxy);
    if let Some(distance) = projection_distance {
        if distance > limits.max_projection_distance_proxy {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_projection_distance",
                json!({
                    "projection_distance_proxy": distance,
                    "max_projection_distance_proxy": limits.max_projection_distance_proxy,
                }),
            ));
        }
    }
    if let Some(before) = model.support_error_before {
        if before < limits.min_ribbon_support_error_before {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_ribbon_support_error_floor",
                json!({
                    "support_error_before": before,
                    "min_ribbon_support_error_before": limits.min_ribbon_support_error_before,
                }),
            ));
        }
    }
    if let Some(fraction) = model.complement_residual_fraction {
        if fraction < limits.min_complement_residual_fraction {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_insufficient_complement_residual_fraction",
                json!({
                    "complement_residual_fraction": fraction,
                    "min_complement_residual_fraction": limits.min_complement_residual_fraction,
                }),
            ));
        }
    }
    if let Some(fraction) = model.stiff_axis_drift_fraction {
        if fraction > limits.max_stiff_axis_drift_fraction {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_stiff_axis_drift",
                json!({
                    "stiff_axis_drift_fraction": fraction,
                    "max_stiff_axis_drift_fraction": limits.max_stiff_axis_drift_fraction,
                }),
            ));
        }
    }
    let lift = model
        .projected_support_lift_fraction
        .or(model.support_lift_fraction);
    if let Some(lift) = lift {
        if lift <= 0.0 {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_nonpositive_projected_support_lift",
                json!(lift),
            ));
        }
        if lift < limits.min_projected_support_lift_fraction {
            return Some(PolicyAction::blocked(
                &model.field,
                "blocked_insufficient_projected_support_lift",
                json!({
                    "projected_support_lift_fraction": lift,
                    "min_projected_support_lift_fraction": limits.min_projected_support_lift_fraction,
                }),
            ));
        }
    }
    None
}

fn support_lift_fraction(field: &str, diagnostics: &Value) -> Option<f64> {
    if let Some(value) = diagnostic_number(diagnostics, "support_lift_fraction") {
        return Some(value);
    }
    let (before_key, after_key) = match field {
        "energy_ev_per_atom" => ("energy_support_mae_before", "energy_support_mae_after"),
        "relaxed_energy_ev_per_atom" => (
            "relaxation_energy_support_mae_before",
            "relaxation_energy_support_mae_after",
        ),
        "stress_gpa" => (
            "stress_support_mae_before_gpa",
            "stress_support_mae_after_gpa",
        ),
        "forces_ev_per_angstrom" => ("force_support_rmse_before", "force_support_rmse_after"),
        _ => return None,
    };
    let before = diagnostic_number(diagnostics, before_key)?;
    let after = diagnostic_number(diagnostics, after_key)?;
    if before <= 1e-12 {
        return None;
    }
    Some(((before - after) / before).max(0.0))
}

fn material_root_overlap_action(
    field: &str,
    diagnostics: &Value,
    limits: &PolicyLimits,
) -> Option<PolicyAction> {
    if !limits.require_material_root_overlap {
        return None;
    }
    let eval_roots = diagnostic_string_array(diagnostics, "eval_material_roots");
    let support_roots = diagnostic_string_array(diagnostics, "support_material_roots");
    if eval_roots.is_empty() || support_roots.is_empty() {
        return Some(PolicyAction::blocked(
            field,
            "blocked_missing_material_root_diagnostics",
            json!({
                "eval_material_roots": eval_roots,
                "support_material_roots": support_roots,
            }),
        ));
    }
    let overlaps = eval_roots
        .iter()
        .any(|eval| support_roots.iter().any(|support| support == eval));
    if overlaps {
        None
    } else {
        Some(PolicyAction::blocked(
            field,
            "blocked_no_material_root_overlap",
            json!({
                "eval_material_roots": eval_roots,
                "support_material_roots": support_roots,
            }),
        ))
    }
}

fn diagnostic_string_array(diagnostics: &Value, key: &str) -> Vec<String> {
    diagnostics
        .get(key)
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(|item| item.trim().to_ascii_lowercase())
                .filter(|item| !item.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

fn diagnostic_number(diagnostics: &Value, key: &str) -> Option<f64> {
    diagnostics
        .get(key)
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
}

fn correction_scale_for_field(field: &str, limits: &PolicyLimits) -> f64 {
    match field {
        "energy_ev_per_atom" | "relaxed_energy_ev_per_atom" => limits.energy_correction_scale,
        "stress_gpa" | "elastic_constants_gpa" => limits.stress_correction_scale,
        "forces_ev_per_angstrom" => limits.force_correction_scale,
        _ => 1.0,
    }
}

fn max_correction_for_request_field(
    request: &PolicyRequest,
    field: &str,
    limits: &PolicyLimits,
) -> f64 {
    let base = max_correction_for_field(field, limits);
    if !is_energy_zero_point_field(field) {
        return base;
    }
    let lift = request
        .support
        .as_ref()
        .and_then(|support| support.diagnostics.as_ref())
        .and_then(|diagnostics| support_lift_fraction(field, diagnostics));
    if energy_zero_point_shift_allowed(request, field, lift, limits) {
        base.max(limits.max_energy_zero_point_shift_ev_per_atom)
    } else {
        base
    }
}

fn max_ribbon_correction_for_field(
    request: &PolicyRequest,
    field: &str,
    support_lift: Option<f64>,
    limits: &PolicyLimits,
) -> f64 {
    let base = max_correction_for_field(field, limits);
    if energy_zero_point_shift_allowed(request, field, support_lift, limits) {
        base.max(limits.max_energy_zero_point_shift_ev_per_atom)
    } else {
        base
    }
}

fn correction_mode_for_applied_correction(
    request: &PolicyRequest,
    field: &str,
    support_lift: Option<f64>,
    limits: &PolicyLimits,
) -> &'static str {
    if energy_zero_point_shift_allowed(request, field, support_lift, limits) {
        "material_family_zero_point"
    } else {
        "residual_ribbon"
    }
}

fn max_correction_for_field(field: &str, limits: &PolicyLimits) -> f64 {
    match field {
        "energy_ev_per_atom" | "relaxed_energy_ev_per_atom" => limits.max_energy_bias_ev_per_atom,
        "stress_gpa" | "elastic_constants_gpa" => limits.max_stress_bias_gpa,
        "forces_ev_per_angstrom" => limits.max_force_bias_ev_per_angstrom,
        _ => f64::INFINITY,
    }
}

fn energy_zero_point_shift_allowed(
    request: &PolicyRequest,
    field: &str,
    support_lift: Option<f64>,
    limits: &PolicyLimits,
) -> bool {
    if !is_energy_zero_point_field(field)
        || limits.max_energy_zero_point_shift_ev_per_atom <= limits.max_energy_bias_ev_per_atom
        || !matches!(
            request.row_id.as_str(),
            "energy_volume" | "relaxation_stability"
        )
    {
        return false;
    }
    let Some(diagnostics) = request
        .support
        .as_ref()
        .and_then(|support| support.diagnostics.as_ref())
    else {
        return false;
    };
    if diagnostics
        .get("applicability_gate")
        .and_then(Value::as_str)
        .is_some_and(|gate| gate.starts_with("blocked"))
    {
        return false;
    }
    if let Some(distance) = diagnostic_number(diagnostics, "support_eval_distance_proxy") {
        if distance > limits.max_support_eval_distance_proxy {
            return false;
        }
    }
    if material_root_overlap_action(field, diagnostics, limits).is_some() {
        return false;
    }
    if let Some(distance) = request
        .context
        .as_ref()
        .and_then(|context| diagnostic_number(context, "ribbon_feature_distance_proxy"))
    {
        if distance > limits.max_ribbon_feature_distance_proxy {
            return false;
        }
    }
    let lift = support_lift
        .or_else(|| support_lift_fraction(field, diagnostics))
        .unwrap_or(0.0);
    lift >= limits.min_energy_zero_point_support_lift_fraction
}

fn is_energy_zero_point_field(field: &str) -> bool {
    matches!(field, "energy_ev_per_atom" | "relaxed_energy_ev_per_atom")
}

fn guard_prediction(row_id: &str, prediction: &Value, limits: &PolicyLimits) -> Vec<PolicyAction> {
    let mut actions = Vec::new();
    for field in ["energy_ev_per_atom", "relaxed_energy_ev_per_atom"] {
        if let Some(value) = number_field(prediction, field) {
            if !value.is_finite() {
                actions.push(PolicyAction::refuse(&format!("nonfinite_{field}"), field));
            }
        }
    }
    if (row_id == "forces" || row_id == "relaxation_stability")
        && prediction.get("forces_ev_per_angstrom").is_some()
    {
        let forces = vector_norms(
            prediction
                .get("forces_ev_per_angstrom")
                .unwrap_or(&Value::Null),
        );
        if forces.iter().any(|value| !value.is_finite()) {
            actions.push(PolicyAction::refuse(
                "nonfinite_forces",
                "forces_ev_per_angstrom",
            ));
        } else if forces.iter().copied().fold(0.0, f64::max) > limits.max_force_norm_ev_per_angstrom
        {
            actions.push(PolicyAction::refuse(
                "force_norm_explosion",
                "forces_ev_per_angstrom",
            ));
        }
    }
    if prediction.get("stress_gpa").is_some() {
        let stress = numeric_values(prediction.get("stress_gpa").unwrap_or(&Value::Null));
        if stress.iter().any(|value| !value.is_finite()) {
            actions.push(PolicyAction::refuse("nonfinite_stress", "stress_gpa"));
        } else if stress.iter().map(|value| value.abs()).fold(0.0, f64::max)
            > limits.max_stress_abs_gpa
        {
            actions.push(PolicyAction::refuse("stress_explosion", "stress_gpa"));
        }
    }
    if row_id == "relaxation_stability"
        && prediction
            .get("relaxation_converged")
            .and_then(Value::as_bool)
            == Some(false)
    {
        actions.push(PolicyAction::tighten(
            "relaxation_not_converged",
            "relaxation_converged",
        ));
    }
    if !actions
        .iter()
        .any(|action| action.action == "refuse" || action.action == "tighten")
    {
        actions.push(PolicyAction::accept("runtime_guards_passed"));
    }
    actions
}

fn number_field(value: &Value, key: &str) -> Option<f64> {
    value.get(key).and_then(Value::as_f64)
}

fn numeric_array_field(value: &Value, key: &str) -> Option<Vec<f64>> {
    let values = numeric_values(value.get(key)?);
    if values.is_empty() {
        None
    } else {
        Some(values)
    }
}

fn numeric_values(value: &Value) -> Vec<f64> {
    match value {
        Value::Number(number) => number.as_f64().into_iter().collect(),
        Value::Array(items) => items.iter().flat_map(numeric_values).collect(),
        _ => Vec::new(),
    }
}

fn vector_norm(values: &[f64]) -> f64 {
    values.iter().map(|value| value * value).sum::<f64>().sqrt()
}

fn matrix_vector(matrix: &[Vec<f64>], vector: &[f64]) -> Vec<f64> {
    matrix
        .iter()
        .map(|row| {
            row.iter()
                .zip(vector.iter())
                .map(|(coef, value)| coef * value)
                .sum()
        })
        .collect()
}

fn normalized_basis(basis: &[Vec<f64>], dim: usize) -> Vec<Vec<f64>> {
    basis
        .iter()
        .filter(|axis| axis.len() == dim)
        .filter_map(|axis| {
            let norm = vector_norm(axis);
            if norm <= 1e-12 || !norm.is_finite() {
                None
            } else {
                Some(axis.iter().map(|value| value / norm).collect())
            }
        })
        .collect()
}

fn project_onto_basis(vector: &[f64], basis: &[Vec<f64>]) -> Option<Vec<f64>> {
    let axes = normalized_basis(basis, vector.len());
    if axes.is_empty() {
        return None;
    }
    let mut out = vec![0.0; vector.len()];
    for axis in axes {
        let dot = vector
            .iter()
            .zip(axis.iter())
            .map(|(value, axis_value)| value * axis_value)
            .sum::<f64>();
        for (idx, axis_value) in axis.iter().enumerate() {
            out[idx] += dot * axis_value;
        }
    }
    Some(out)
}

fn same_shape_from_flat(template: &Value, flat: &[f64]) -> Option<Value> {
    let mut idx = 0usize;
    let value = same_shape_from_flat_inner(template, flat, &mut idx)?;
    if idx == flat.len() {
        Some(value)
    } else {
        None
    }
}

fn same_shape_from_flat_inner(template: &Value, flat: &[f64], idx: &mut usize) -> Option<Value> {
    match template {
        Value::Number(_) => {
            let value = *flat.get(*idx)?;
            *idx += 1;
            Some(json!(value))
        }
        Value::Array(items) => {
            let mut out = Vec::with_capacity(items.len());
            for item in items {
                out.push(same_shape_from_flat_inner(item, flat, idx)?);
            }
            Some(Value::Array(out))
        }
        _ => None,
    }
}

fn feature_value(name: &str, prediction: &Value) -> Option<f64> {
    if name == "n_atoms" {
        return prediction
            .get("symbols")
            .and_then(Value::as_array)
            .map(|items| items.len() as f64)
            .or_else(|| {
                prediction
                    .get("forces_ev_per_angstrom")
                    .and_then(Value::as_array)
                    .map(|items| items.len() as f64)
            });
    }
    if let Some(field) = name.strip_prefix("scalar:") {
        return number_field(prediction, field);
    }
    if let Some(rest) = name.strip_prefix("component:") {
        let (field, index) = rest.rsplit_once(':')?;
        let index = index.parse::<usize>().ok()?;
        return numeric_values(prediction.get(field)?).get(index).copied();
    }
    if let Some(rest) = name.strip_prefix("force_mean:") {
        let axis = rest.parse::<usize>().ok()?;
        if axis >= 3 {
            return None;
        }
        let values = numeric_values(prediction.get("forces_ev_per_angstrom")?);
        if values.len() < 3 || !values.len().is_multiple_of(3) {
            return None;
        }
        let mut sum = 0.0;
        let mut count = 0usize;
        for chunk in values.chunks(3) {
            sum += chunk[axis];
            count += 1;
        }
        return Some(sum / count as f64);
    }
    if name == "force_rms" {
        let values = numeric_values(prediction.get("forces_ev_per_angstrom")?);
        if values.is_empty() {
            return None;
        }
        let mean_square =
            values.iter().map(|value| value * value).sum::<f64>() / values.len() as f64;
        return Some(mean_square.sqrt());
    }
    if name == "force_max_norm" {
        return vector_norms(prediction.get("forces_ev_per_angstrom")?)
            .into_iter()
            .reduce(f64::max);
    }
    number_field(prediction, name)
}

fn vector_norms(value: &Value) -> Vec<f64> {
    match value {
        Value::Array(items) if items.len() == 3 && items.iter().all(Value::is_number) => {
            let sum = items
                .iter()
                .filter_map(Value::as_f64)
                .map(|value| value * value)
                .sum::<f64>();
            vec![sum.sqrt()]
        }
        Value::Array(items) => items.iter().flat_map(vector_norms).collect(),
        Value::Number(number) => number.as_f64().into_iter().collect(),
        _ => Vec::new(),
    }
}

fn set_field(value: &mut Value, key: &str, field_value: Value) -> Result<()> {
    let Some(object) = value.as_object_mut() else {
        bail!("prediction must be a JSON object");
    };
    object.insert(key.to_string(), field_value);
    Ok(())
}

fn add_same_shape(value: &Value, delta: &Value) -> Option<Value> {
    match (value, delta) {
        (Value::Number(a), Value::Number(b)) => Some(json!(a.as_f64()? + b.as_f64()?)),
        (Value::Array(values), Value::Array(deltas)) if values.len() == deltas.len() => {
            let mut out = Vec::with_capacity(values.len());
            for (item, correction) in values.iter().zip(deltas.iter()) {
                out.push(add_same_shape(item, correction)?);
            }
            Some(Value::Array(out))
        }
        _ => None,
    }
}

fn add_force_bias(value: &Value, delta: &Value) -> Option<Value> {
    if let Some(corrected) = add_same_shape(value, delta) {
        return Some(corrected);
    }
    let bias = vector3(delta)?;
    let Value::Array(vectors) = value else {
        return None;
    };
    let mut out = Vec::with_capacity(vectors.len());
    for vector in vectors {
        let current = vector3(vector)?;
        out.push(json!([
            current[0] + bias[0],
            current[1] + bias[1],
            current[2] + bias[2]
        ]));
    }
    Some(Value::Array(out))
}

fn vector3(value: &Value) -> Option<[f64; 3]> {
    let Value::Array(items) = value else {
        return None;
    };
    if items.len() != 3 || !items.iter().all(Value::is_number) {
        return None;
    }
    Some([items[0].as_f64()?, items[1].as_f64()?, items[2].as_f64()?])
}

fn decision_id(
    ribbon_version: &str,
    row_id: &str,
    mlip_id: Option<&str>,
    corrected: &Value,
    actions: &[PolicyAction],
    limits: &PolicyLimits,
) -> Result<String> {
    let payload = json!({
        "ribbon_version": ribbon_version,
        "row_id": row_id,
        "mlip_id": mlip_id,
        "corrected_prediction": corrected,
        "actions": actions,
        "policy_limits": limits,
    });
    let bytes = serde_json::to_vec(&payload)?;
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    Ok(format!("sha256:{:x}", hasher.finalize()))
}

fn policy_limits_id(limits: &PolicyLimits) -> Result<String> {
    let bytes = serde_json::to_vec(limits)?;
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let hex = format!("{:x}", hasher.finalize());
    Ok(format!("ribbon-{}", &hex[..16]))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(row_id: &str, prediction: Value, correction: Value) -> PolicyRequest {
        PolicyRequest {
            schema: Some("lupine.distill.policy_request.v1".to_string()),
            ribbon_version: Some("hyperribbon-v1".to_string()),
            row_id: row_id.to_string(),
            mlip_id: Some("chgnet".to_string()),
            prediction,
            support: Some(SupportEvidence {
                correction: Some(correction),
                diagnostics: None,
            }),
            context: None,
        }
    }

    fn request_with_diagnostics(
        row_id: &str,
        prediction: Value,
        correction: Value,
        diagnostics: Value,
    ) -> PolicyRequest {
        let mut req = request(row_id, prediction, correction);
        req.support.as_mut().unwrap().diagnostics = Some(diagnostics);
        req
    }

    #[test]
    fn applies_small_energy_bias() {
        let req = request(
            "energy_volume",
            json!({"energy_ev_per_atom": 1.0}),
            json!({"energy_bias_ev_per_atom": -0.1}),
        );
        let decision = decide(&req, DEFAULT_RIBBON_VERSION).unwrap();
        assert_eq!(decision.ribbon_version, "hyperribbon-v1");
        assert_eq!(decision.decision, "accept");
        assert_eq!(
            decision.corrected_prediction["energy_ev_per_atom"],
            json!(0.9)
        );
        assert!(decision
            .actions
            .iter()
            .any(|action| action.action == "delta_correct"));
    }

    #[test]
    fn blocks_large_energy_bias_without_refusing_raw_prediction() {
        let req = request(
            "energy_volume",
            json!({"energy_ev_per_atom": 1.0}),
            json!({"energy_bias_ev_per_atom": -1.4}),
        );
        let decision = decide(&req, DEFAULT_RIBBON_VERSION).unwrap();
        assert_eq!(decision.decision, "accept");
        assert_eq!(
            decision.corrected_prediction["energy_ev_per_atom"],
            json!(1.0)
        );
        assert!(decision.applied_corrections.is_empty());
        assert!(decision
            .actions
            .iter()
            .any(|action| action.action == "delta_correct_blocked"));
    }

    #[test]
    fn selected_policy_limits_can_open_energy_gate() {
        let req = request(
            "energy_volume",
            json!({"energy_ev_per_atom": 1.0}),
            json!({"energy_bias_ev_per_atom": -0.65}),
        );
        let default_decision = decide(&req, DEFAULT_RIBBON_VERSION).unwrap();
        assert_eq!(
            default_decision.corrected_prediction["energy_ev_per_atom"],
            json!(1.0)
        );

        let mut limits = PolicyLimits::default();
        limits.max_energy_bias_ev_per_atom = 0.75;
        let selected_decision = decide_with_limits(&req, DEFAULT_RIBBON_VERSION, &limits).unwrap();
        assert_eq!(
            selected_decision.corrected_prediction["energy_ev_per_atom"],
            json!(0.35)
        );
        assert_eq!(
            selected_decision.theorem_hooks["policy_limits_id"],
            json!(policy_limits_id(&limits).unwrap())
        );
    }

    #[test]
    fn zero_point_gate_opens_large_energy_bias_only_with_material_support() {
        let req = request_with_diagnostics(
            "energy_volume",
            json!({"energy_ev_per_atom": 1.0}),
            json!({"energy_bias_ev_per_atom": -1.2}),
            json!({
                "applicability_gate": "passed",
                "support_eval_distance_proxy": 0.0,
                "eval_material_roots": ["ni-fcc"],
                "support_material_roots": ["ni-fcc"],
                "energy_support_mae_before": 1.2,
                "energy_support_mae_after": 0.01
            }),
        );
        let mut limits = PolicyLimits::default();
        limits.max_energy_zero_point_shift_ev_per_atom = 1.5;
        limits.require_material_root_overlap = true;

        let decision = decide_with_limits(&req, DEFAULT_RIBBON_VERSION, &limits).unwrap();

        assert_eq!(
            decision.corrected_prediction["energy_ev_per_atom"],
            json!(-0.19999999999999996)
        );
        assert!(decision
            .actions
            .iter()
            .any(|action| action.action == "delta_correct"));
    }

    #[test]
    fn zero_point_gate_still_blocks_cross_material_large_energy_bias() {
        let req = request_with_diagnostics(
            "energy_volume",
            json!({"energy_ev_per_atom": 1.0}),
            json!({"energy_bias_ev_per_atom": -1.2}),
            json!({
                "applicability_gate": "passed",
                "support_eval_distance_proxy": 0.0,
                "eval_material_roots": ["ni-fcc"],
                "support_material_roots": ["al"],
                "energy_support_mae_before": 1.2,
                "energy_support_mae_after": 0.01
            }),
        );
        let mut limits = PolicyLimits::default();
        limits.max_energy_zero_point_shift_ev_per_atom = 1.5;
        limits.require_material_root_overlap = true;

        let decision = decide_with_limits(&req, DEFAULT_RIBBON_VERSION, &limits).unwrap();

        assert_eq!(
            decision.corrected_prediction["energy_ev_per_atom"],
            json!(1.0)
        );
        assert!(decision.actions.iter().any(|action| {
            action.action == "delta_correct_blocked"
                && action.reason == "blocked_no_material_root_overlap"
        }));
    }

    #[test]
    fn row_policy_overrides_disable_correction_only_for_target_row() {
        let elastic_req = request(
            "elastic_constants",
            json!({"stress_gpa": [1.0, 2.0]}),
            json!({"stress_bias_gpa": [0.2, -0.2]}),
        );
        let stress_req = request(
            "stress",
            json!({"stress_gpa": [1.0, 2.0]}),
            json!({"stress_bias_gpa": [0.2, -0.2]}),
        );
        let mut limits = PolicyLimits::default();
        limits.row_policy_overrides.insert(
            "elastic_constants".to_string(),
            PolicyLimitOverride {
                stress_correction_scale: Some(0.0),
                ..PolicyLimitOverride::default()
            },
        );

        let elastic_decision =
            decide_with_limits(&elastic_req, DEFAULT_RIBBON_VERSION, &limits).unwrap();
        let stress_decision =
            decide_with_limits(&stress_req, DEFAULT_RIBBON_VERSION, &limits).unwrap();

        assert_eq!(
            elastic_decision.corrected_prediction["stress_gpa"],
            json!([1.0, 2.0])
        );
        assert_eq!(
            stress_decision.corrected_prediction["stress_gpa"],
            json!([1.2, 1.8])
        );
        assert!(elastic_decision.actions.iter().any(|action| {
            action.action == "delta_correct_blocked"
                && action.reason == "blocked_zero_correction_scale"
        }));
        assert_eq!(
            elastic_decision.theorem_hooks["base_policy_limits_id"],
            json!(policy_limits_id(&limits).unwrap())
        );
        assert_ne!(
            elastic_decision.theorem_hooks["policy_limits_id"],
            stress_decision.theorem_hooks["policy_limits_id"]
        );
    }

    #[test]
    fn refuses_force_explosion() {
        let req = request(
            "forces",
            json!({"forces_ev_per_angstrom": [[201.0, 0.0, 0.0]]}),
            json!({}),
        );
        let decision = decide(&req, DEFAULT_RIBBON_VERSION).unwrap();
        assert_eq!(decision.decision, "refuse");
        assert!(decision.refused);
    }

    #[test]
    fn preserves_force_shape_when_applying_bias() {
        let req = request(
            "forces",
            json!({"forces_ev_per_angstrom": [[1.0, 2.0, 3.0]]}),
            json!({"force_bias_ev_per_angstrom": [[0.1, -0.1, 0.0]]}),
        );
        let decision = decide(&req, DEFAULT_RIBBON_VERSION).unwrap();
        assert_eq!(
            decision.corrected_prediction["forces_ev_per_angstrom"],
            json!([[1.1, 1.9, 3.0]])
        );
    }

    #[test]
    fn broadcasts_vector_force_bias_to_all_atoms() {
        let req = request(
            "forces",
            json!({"forces_ev_per_angstrom": [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]}),
            json!({"force_bias_ev_per_angstrom": [0.1, -0.1, 0.0]}),
        );
        let decision = decide(&req, DEFAULT_RIBBON_VERSION).unwrap();
        assert_eq!(
            decision.corrected_prediction["forces_ev_per_angstrom"],
            json!([[1.1, 1.9, 3.0], [4.1, 4.9, 6.0]])
        );
        assert!(decision
            .actions
            .iter()
            .any(|action| action.action == "delta_correct"));
    }

    #[test]
    fn applies_ribbon_residual_correction_from_feature_model() {
        let req = request(
            "stress",
            json!({"energy_ev_per_atom": 2.0, "stress_gpa": [1.0, 2.0]}),
            json!({
                "ribbon_residual_correction_v1": {
                    "schema": "lupine.distill.ribbon_residual_correction.v1",
                    "field": "stress_gpa",
                    "feature_names": ["scalar:energy_ev_per_atom"],
                    "feature_mean": [1.0],
                    "feature_scale": [1.0],
                    "intercept": [0.1, -0.1],
                    "coefficients": [[0.2], [-0.2]],
                    "support_lift_fraction": 0.5,
                    "support_eval_distance_proxy": 0.0,
                    "matrix_rank": 1,
                    "sample_count": 4,
                    "participation_ratio": 1.0
                }
            }),
        );

        let decision = decide(&req, DEFAULT_RIBBON_VERSION).unwrap();

        assert_eq!(
            decision.corrected_prediction["stress_gpa"],
            json!([1.3, 1.7])
        );
        assert!(decision
            .applied_corrections
            .get("ribbon_residual_correction_v1")
            .is_some());
    }

    #[test]
    fn applies_projected_ribbon_from_orthogonal_complement_when_spectral() {
        let mut req = request(
            "energy_volume",
            json!({"energy_ev_per_atom": 1.0, "x": 10.0, "y": 2.0}),
            json!({
                "ribbon_projected_residual_correction_v1": {
                    "schema": "lupine.distill.ribbon_projected_residual_correction.v1",
                    "field": "energy_ev_per_atom",
                    "feature_names": ["x", "y"],
                    "feature_mean": [0.0, 0.0],
                    "feature_scale": [1.0, 1.0],
                    "intercept": [0.0],
                    "coefficients": [[0.0, 0.2]],
                    "stiff_axis_basis": [[1.0, 0.0]],
                    "complement_basis": [[0.0, 1.0]],
                    "projected_support_lift_fraction": 0.5,
                    "complement_residual_fraction": 1.0,
                    "stiff_axis_drift_fraction": 0.0,
                    "projection_distance_proxy": 0.0
                }
            }),
        );
        req.ribbon_version = Some("hyperribbon-mptrj-spectral-v4".to_string());

        let decision = decide(&req, "fallback").unwrap();

        assert_eq!(
            decision.corrected_prediction["energy_ev_per_atom"]
                .as_f64()
                .unwrap(),
            1.4
        );
        assert!(decision
            .applied_corrections
            .contains_key("ribbon_projected_residual_correction_v1"));
        assert_eq!(decision.actions[0].action, "delta_correct");
    }

    #[test]
    fn projected_ribbon_blocks_when_stiff_axis_signal_dominates() {
        let mut req = request(
            "energy_volume",
            json!({"energy_ev_per_atom": 1.0, "x": 10.0, "y": 2.0}),
            json!({
                "ribbon_projected_residual_correction_v1": {
                    "schema": "lupine.distill.ribbon_projected_residual_correction.v1",
                    "field": "energy_ev_per_atom",
                    "feature_names": ["x", "y"],
                    "feature_mean": [0.0, 0.0],
                    "feature_scale": [1.0, 1.0],
                    "intercept": [0.0],
                    "coefficients": [[0.2, 0.01]],
                    "stiff_axis_basis": [[1.0, 0.0]],
                    "complement_basis": [[0.0, 1.0]],
                    "projected_support_lift_fraction": 0.5,
                    "complement_residual_fraction": 1.0,
                    "stiff_axis_drift_fraction": 0.0,
                    "projection_distance_proxy": 0.0
                }
            }),
        );
        req.ribbon_version = Some("hyperribbon-mptrj-spectral-v4".to_string());

        let decision = decide(&req, "fallback").unwrap();

        assert_eq!(
            decision.corrected_prediction["energy_ev_per_atom"]
                .as_f64()
                .unwrap(),
            1.0
        );
        assert!(decision.actions.iter().any(|action| {
            action.action == "delta_correct_blocked" && action.reason == "blocked_stiff_axis_signal"
        }));
    }

    #[test]
    fn projected_ribbon_is_ignored_for_legacy_ribbon_versions() {
        let req = request(
            "energy_volume",
            json!({"energy_ev_per_atom": 1.0, "x": 10.0, "y": 2.0}),
            json!({
                "ribbon_projected_residual_correction_v1": {
                    "schema": "lupine.distill.ribbon_projected_residual_correction.v1",
                    "field": "energy_ev_per_atom",
                    "feature_names": ["x", "y"],
                    "feature_mean": [0.0, 0.0],
                    "feature_scale": [1.0, 1.0],
                    "intercept": [0.0],
                    "coefficients": [[0.0, 0.2]],
                    "stiff_axis_basis": [[1.0, 0.0]],
                    "complement_basis": [[0.0, 1.0]],
                    "projected_support_lift_fraction": 0.5,
                    "complement_residual_fraction": 1.0
                },
                "ribbon_residual_correction_v1": {
                    "schema": "lupine.distill.ribbon_residual_correction.v1",
                    "field": "energy_ev_per_atom",
                    "feature_names": ["x"],
                    "feature_mean": [0.0],
                    "feature_scale": [1.0],
                    "intercept": [0.0],
                    "coefficients": [[0.01]],
                    "support_lift_fraction": 0.5
                }
            }),
        );

        let decision = decide(&req, "fallback").unwrap();

        assert_eq!(
            decision.corrected_prediction["energy_ev_per_atom"]
                .as_f64()
                .unwrap(),
            1.1
        );
        assert!(decision
            .applied_corrections
            .contains_key("ribbon_residual_correction_v1"));
        assert!(!decision
            .applied_corrections
            .contains_key("ribbon_projected_residual_correction_v1"));
    }

    #[test]
    fn applies_signed_ribbon_orientation_scale() {
        let req = request(
            "energy_volume",
            json!({"energy_ev_per_atom": 2.0}),
            json!({
                "ribbon_residual_correction_v1": {
                    "schema": "lupine.distill.ribbon_residual_correction.v1",
                    "field": "energy_ev_per_atom",
                    "feature_names": ["scalar:energy_ev_per_atom"],
                    "feature_mean": [1.0],
                    "feature_scale": [1.0],
                    "intercept": [0.1],
                    "coefficients": [[0.2]],
                    "support_lift_fraction": 0.5,
                    "support_eval_distance_proxy": 0.0,
                    "matrix_rank": 1,
                    "sample_count": 4,
                    "participation_ratio": 1.0
                }
            }),
        );
        let mut limits = PolicyLimits::default();
        limits.energy_correction_scale = -0.5;

        let decision = decide_with_limits(&req, DEFAULT_RIBBON_VERSION, &limits).unwrap();

        assert_eq!(
            decision.corrected_prediction["energy_ev_per_atom"],
            json!(1.85)
        );
        assert_eq!(
            decision.applied_corrections["ribbon_residual_correction_v1"]["scale"],
            json!(-0.5)
        );
    }

    #[test]
    fn zero_point_gate_opens_large_energy_ribbon_with_high_support_lift() {
        let req = request_with_diagnostics(
            "energy_volume",
            json!({"energy_ev_per_atom": 1.0}),
            json!({
                "ribbon_residual_correction_v1": {
                    "schema": "lupine.distill.ribbon_residual_correction.v1",
                    "field": "energy_ev_per_atom",
                    "feature_names": ["scalar:energy_ev_per_atom"],
                    "feature_mean": [1.0],
                    "feature_scale": [1.0],
                    "intercept": [-0.96],
                    "coefficients": [[0.0]],
                    "support_lift_fraction": 0.99,
                    "support_eval_distance_proxy": 0.0,
                    "matrix_rank": 1,
                    "sample_count": 8,
                    "participation_ratio": 1.0
                }
            }),
            json!({
                "applicability_gate": "passed",
                "support_eval_distance_proxy": 0.0,
                "eval_material_roots": ["ni-fcc"],
                "support_material_roots": ["ni-fcc"]
            }),
        );
        let mut limits = PolicyLimits::default();
        limits.max_energy_zero_point_shift_ev_per_atom = 1.5;
        limits.require_material_root_overlap = true;

        let decision = decide_with_limits(&req, DEFAULT_RIBBON_VERSION, &limits).unwrap();

        assert_eq!(
            decision.corrected_prediction["energy_ev_per_atom"],
            json!(0.040000000000000036)
        );
        assert_eq!(
            decision.applied_corrections["ribbon_residual_correction_v1"]["correction_mode"],
            json!("material_family_zero_point")
        );
    }

    #[test]
    fn blocks_ribbon_residual_correction_without_support_lift() {
        let req = request(
            "stress",
            json!({"energy_ev_per_atom": 2.0, "stress_gpa": [1.0, 2.0]}),
            json!({
                "ribbon_residual_correction_v1": {
                    "schema": "lupine.distill.ribbon_residual_correction.v1",
                    "field": "stress_gpa",
                    "feature_names": ["scalar:energy_ev_per_atom"],
                    "feature_mean": [1.0],
                    "feature_scale": [1.0],
                    "intercept": [0.1, -0.1],
                    "coefficients": [[0.2], [-0.2]],
                    "support_lift_fraction": 0.0,
                    "support_eval_distance_proxy": 0.0
                }
            }),
        );

        let decision = decide(&req, DEFAULT_RIBBON_VERSION).unwrap();

        assert_eq!(
            decision.corrected_prediction["stress_gpa"],
            json!([1.0, 2.0])
        );
        assert!(decision.actions.iter().any(|action| {
            action.action == "delta_correct_blocked"
                && action.reason == "blocked_nonpositive_support_lift"
        }));
    }

    #[test]
    fn blocks_ribbon_residual_correction_outside_feature_domain() {
        let mut req = request(
            "stress",
            json!({"energy_ev_per_atom": 2.0, "stress_gpa": [1.0, 2.0]}),
            json!({
                "ribbon_residual_correction_v1": {
                    "schema": "lupine.distill.ribbon_residual_correction.v1",
                    "field": "stress_gpa",
                    "feature_names": ["scalar:energy_ev_per_atom"],
                    "feature_mean": [1.0],
                    "feature_scale": [1.0],
                    "intercept": [0.1, -0.1],
                    "coefficients": [[0.2], [-0.2]],
                    "support_lift_fraction": 0.5,
                    "support_eval_distance_proxy": 0.0
                }
            }),
        );
        req.context = Some(json!({"ribbon_feature_distance_proxy": 1.5}));
        let mut limits = PolicyLimits::default();
        limits.max_ribbon_feature_distance_proxy = 1.0;

        let decision = decide_with_limits(&req, DEFAULT_RIBBON_VERSION, &limits).unwrap();

        assert_eq!(
            decision.corrected_prediction["stress_gpa"],
            json!([1.0, 2.0])
        );
        assert!(decision.actions.iter().any(|action| {
            action.action == "delta_correct_blocked"
                && action.reason == "blocked_ribbon_feature_distance"
        }));
    }

    #[test]
    fn blocks_ribbon_residual_correction_below_support_error_floor() {
        let req = request(
            "energy_volume",
            json!({"energy_ev_per_atom": -5.0}),
            json!({
                "ribbon_residual_correction_v1": {
                    "schema": "lupine.distill.ribbon_residual_correction.v1",
                    "field": "energy_ev_per_atom",
                    "feature_names": ["scalar:energy_ev_per_atom"],
                    "feature_mean": [-5.0],
                    "feature_scale": [1.0],
                    "intercept": [0.02],
                    "coefficients": [[0.01]],
                    "support_lift_fraction": 0.99,
                    "support_error_before": 0.017,
                    "support_eval_distance_proxy": 0.0
                }
            }),
        );
        let mut limits = PolicyLimits::default();
        limits.min_ribbon_support_error_before = 0.05;

        let decision = decide_with_limits(&req, DEFAULT_RIBBON_VERSION, &limits).unwrap();

        assert_eq!(
            decision.corrected_prediction["energy_ev_per_atom"],
            json!(-5.0)
        );
        assert!(decision.actions.iter().any(|action| {
            action.action == "delta_correct_blocked"
                && action.reason == "blocked_ribbon_support_error_floor"
        }));
    }

    #[test]
    fn blocks_ribbon_residual_correction_without_material_root_overlap_when_required() {
        let mut req = request(
            "energy_volume",
            json!({"energy_ev_per_atom": -5.0}),
            json!({
                "ribbon_residual_correction_v1": {
                    "schema": "lupine.distill.ribbon_residual_correction.v1",
                    "field": "energy_ev_per_atom",
                    "feature_names": ["scalar:energy_ev_per_atom"],
                    "feature_mean": [-5.0],
                    "feature_scale": [1.0],
                    "intercept": [-0.1],
                    "coefficients": [[0.2]],
                    "support_lift_fraction": 0.5,
                    "support_eval_distance_proxy": 0.0
                }
            }),
        );
        req.support.as_mut().unwrap().diagnostics = Some(json!({
            "eval_material_roots": ["ni", "ni-fcc"],
            "support_material_roots": ["al-o", "f-li-ni-o"],
            "energy_support_mae_before": 1.0,
            "energy_support_mae_after": 0.2
        }));
        let mut limits = PolicyLimits::default();
        limits.require_material_root_overlap = true;

        let decision = decide_with_limits(&req, DEFAULT_RIBBON_VERSION, &limits).unwrap();

        assert_eq!(
            decision.corrected_prediction["energy_ev_per_atom"],
            json!(-5.0)
        );
        assert!(decision.actions.iter().any(|action| {
            action.action == "delta_correct_blocked"
                && action.reason == "blocked_no_material_root_overlap"
        }));
    }

    #[test]
    fn blocks_zero_support_lift_even_when_limits_are_open() {
        let req = request(
            "stress",
            json!({"energy_ev_per_atom": 2.0, "stress_gpa": [1.0, 2.0]}),
            json!({
                "ribbon_residual_correction_v1": {
                    "schema": "lupine.distill.ribbon_residual_correction.v1",
                    "field": "stress_gpa",
                    "feature_names": ["scalar:energy_ev_per_atom"],
                    "feature_mean": [1.0],
                    "feature_scale": [1.0],
                    "intercept": [0.1, -0.1],
                    "coefficients": [[0.2], [-0.2]],
                    "support_lift_fraction": 0.0,
                    "support_eval_distance_proxy": 0.0
                }
            }),
        );
        let mut limits = PolicyLimits::default();
        limits.min_support_lift_fraction = 0.0;

        let decision = decide_with_limits(&req, DEFAULT_RIBBON_VERSION, &limits).unwrap();

        assert_eq!(
            decision.corrected_prediction["stress_gpa"],
            json!([1.0, 2.0])
        );
        assert!(decision.actions.iter().any(|action| {
            action.action == "delta_correct_blocked"
                && action.reason == "blocked_nonpositive_support_lift"
        }));
    }

    #[test]
    fn tightens_failed_relaxation() {
        let req = request(
            "relaxation_stability",
            json!({"relaxation_converged": false, "forces_ev_per_angstrom": [[1.0, 0.0, 0.0]]}),
            json!({}),
        );
        let decision = decide(&req, DEFAULT_RIBBON_VERSION).unwrap();
        assert_eq!(decision.decision, "tighten");
    }

    #[test]
    fn applies_relaxation_energy_bias() {
        let req = request(
            "relaxation_stability",
            json!({"relaxation_converged": true, "relaxed_energy_ev_per_atom": 1.0}),
            json!({"relaxed_energy_bias_ev_per_atom": -0.1}),
        );
        let decision = decide(&req, DEFAULT_RIBBON_VERSION).unwrap();
        assert_eq!(
            decision.corrected_prediction["relaxed_energy_ev_per_atom"],
            json!(0.9)
        );
        assert!(decision
            .actions
            .iter()
            .any(|action| action.action == "delta_correct"));
    }
}
