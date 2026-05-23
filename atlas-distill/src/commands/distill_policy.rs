//! Versioned Lupine Distill ribbon policy engine.
//!
//! Python MLIP runners can keep owning ASE/backend integration, but the
//! canonical Distill decision surface lives here: a stable ribbon version,
//! deterministic guard/correction rules, and an auditable decision packet.

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
    pub(crate) max_stress_bias_gpa: f64,
    pub(crate) max_force_bias_ev_per_angstrom: f64,
    pub(crate) max_force_norm_ev_per_angstrom: f64,
    pub(crate) max_stress_abs_gpa: f64,
}

impl Default for PolicyLimits {
    fn default() -> Self {
        Self {
            max_energy_bias_ev_per_atom: 0.5,
            max_stress_bias_gpa: 25.0,
            max_force_bias_ev_per_angstrom: 1.0,
            max_force_norm_ev_per_angstrom: 200.0,
            max_stress_abs_gpa: 5000.0,
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
        Ok(())
    }
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

    apply_support_corrections(request, &mut corrected, &mut actions, &mut applied, limits)?;
    actions.extend(guard_prediction(&request.row_id, &corrected, limits));
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
    let policy_limits_id = policy_limits_id(limits)?;
    let theorem_hooks = json!({
        "schema": "lupine.distill.theorem_hooks.v1",
        "ribbon_version": ribbon_version,
        "policy_limits_id": policy_limits_id,
        "policy_limits": limits,
        "bridge": "outer_loop_proxy",
        "layerwise_exact": false,
        "support_diagnostics_present": request.support.as_ref().and_then(|s| s.diagnostics.as_ref()).is_some(),
        "policy_engine": "atlas-distill",
    });
    let decision_id = decision_id(
        &ribbon_version,
        &request.row_id,
        request.mlip_id.as_deref(),
        &corrected,
        &actions,
        limits,
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

    if request.row_id == "energy_volume" {
        if let Some(bias) = number_field(correction, "energy_bias_ev_per_atom") {
            if bias.abs() <= limits.max_energy_bias_ev_per_atom {
                if let Some(current) = number_field(corrected, "energy_ev_per_atom") {
                    let value = json!(current + bias);
                    set_field(corrected, "energy_ev_per_atom", value.clone())?;
                    applied.insert("energy_bias_ev_per_atom".to_string(), json!(bias));
                    actions.push(PolicyAction::delta("energy_ev_per_atom", json!(bias)));
                }
            } else {
                actions.push(PolicyAction::blocked(
                    "energy_ev_per_atom",
                    "blocked_large_bias",
                    json!(bias),
                ));
            }
        }
    }

    if request.row_id == "stress" || request.row_id == "elastic_constants" {
        if let Some(bias) = numeric_array_field(correction, "stress_bias_gpa") {
            let max_abs = bias.iter().map(|value| value.abs()).fold(0.0, f64::max);
            if max_abs <= limits.max_stress_bias_gpa {
                if let Some(stress) = numeric_array_field(corrected, "stress_gpa") {
                    if stress.len() == bias.len() {
                        if let (Some(current), Some(delta)) = (
                            corrected.get("stress_gpa").cloned(),
                            correction.get("stress_bias_gpa").cloned(),
                        ) {
                            if let Some(value) = add_same_shape(&current, &delta) {
                                set_field(corrected, "stress_gpa", value)?;
                                applied.insert("stress_bias_gpa".to_string(), json!(bias));
                                actions.push(PolicyAction::delta("stress_gpa", json!(bias)));
                            }
                        }
                    }
                }
            } else {
                actions.push(PolicyAction::blocked(
                    "stress_gpa",
                    "blocked_large_bias",
                    json!(bias),
                ));
            }
        }
    }

    if request.row_id == "forces" {
        if let Some(bias) = numeric_array_field(correction, "force_bias_ev_per_angstrom") {
            let max_abs = bias.iter().map(|value| value.abs()).fold(0.0, f64::max);
            if max_abs <= limits.max_force_bias_ev_per_angstrom {
                if let Some(forces) = numeric_array_field(corrected, "forces_ev_per_angstrom") {
                    if forces.len() == bias.len() {
                        if let (Some(current), Some(delta)) = (
                            corrected.get("forces_ev_per_angstrom").cloned(),
                            correction.get("force_bias_ev_per_angstrom").cloned(),
                        ) {
                            if let Some(value) = add_same_shape(&current, &delta) {
                                set_field(corrected, "forces_ev_per_angstrom", value)?;
                                applied
                                    .insert("force_bias_ev_per_angstrom".to_string(), json!(bias));
                                actions.push(PolicyAction::delta(
                                    "forces_ev_per_angstrom",
                                    json!(bias),
                                ));
                            }
                        }
                    }
                }
            } else {
                actions.push(PolicyAction::blocked(
                    "forces_ev_per_angstrom",
                    "blocked_large_bias",
                    json!(bias),
                ));
            }
        }
    }
    Ok(())
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
    fn tightens_failed_relaxation() {
        let req = request(
            "relaxation_stability",
            json!({"relaxation_converged": false, "forces_ev_per_angstrom": [[1.0, 0.0, 0.0]]}),
            json!({}),
        );
        let decision = decide(&req, DEFAULT_RIBBON_VERSION).unwrap();
        assert_eq!(decision.decision, "tighten");
    }
}
