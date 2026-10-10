"""Bound statistical wire receipts without constructing statistical models.

These checks establish transport shape and identity links. They neither assess
calibration outcomes nor verify the statistical premises. Exact recomputation
belongs to the guarded child's separate verification operation.
"""
from fractions import Fraction
import re

from . import __version__
from .decision_pool import PREMISES, PHYSICAL_ATTESTATION, CONDITIONAL_GUARANTEE
from .evidence import digest


CERTIFICATE_SCHEMA = "lupine.discovery.decision_pool_certificate.v1"
REPLAY_SCHEMA = "lupine.discovery.decision_pool_replay.v1"
_SHA = re.compile(r"[0-9a-f]{64}\Z")
_NUMBER = re.compile(r"-?(?:0|[1-9][0-9]*)(?:/[1-9][0-9]*)?\Z")
_CALIBRATION_REASONS = frozenset({"unsupported_sampling_premise", "incomplete_calibration_truth",
    "required_rank_exceeds_calibration_count", "finite_order_statistic_under_unverified_premises", "no_pool_reduction"})
_SELECTION_REASONS = _CALIBRATION_REASONS | {"retained_all_unsupported_premise",
    "retained_all_incomplete_calibration", "retained_all_insufficient_calibration",
    "future_universe_empty", "statistical_empty_pool"}
_REPLAY_INTERPRETATION = [
    "This audit compares the actual fixed pool with supplied finite-panel outcomes, not attested physical truth.",
    "A realized loss is possible under the marginal theorem; one success or failure alone does not verify or refute exchangeability.",
    "The claim concerns a procedure marginally over calibration and one future panel, not a verified probability for this realized pool.",
    "Vacuous empty or infeasible panels are separate from feasible-panel successes; no aggregate coverage is inferred.",
]


def _require(condition):
    if not condition:
        raise ValueError("invalid statistical-pool receipt identity or shape")


def _fields(value, names):
    _require(type(value) is dict and set(value) == set(names.split()))


def _same(left, right):
    return digest(left) == digest(right)


def _checksum(value):
    _require(type(value) is str and _SHA.fullmatch(value) is not None)


def _text(value):
    _require(type(value) is str and bool(value.strip()) and len(value) <= 2048)


def _count(value, maximum=4096):
    _require(type(value) is int and 0 <= value <= maximum)


def _rational(value, optional=False):
    if value is None and optional:
        return None
    _require(type(value) is str and len(value) <= 320 and _NUMBER.fullmatch(value) is not None)
    number = Fraction(value)
    _require(str(number) == value and number.numerator.bit_length() <= 512
             and number.denominator.bit_length() <= 512)
    return number


def _ids(value, maximum=64):
    _require(type(value) is list and len(value) <= maximum)
    for item in value:
        _text(item)
    _require(len(set(value)) == len(value))


def _identity(kind, values):
    return digest({"contract": "decision_pool.python.v1", "kind": kind, **values})


def _sealed(value, key):
    _checksum(value.get(key))
    _require(value[key] == digest({k: v for k, v in value.items() if k != key}))


def _panel(panel, protocol_digest):
    _fields(panel, "panel_id universe_id protocol_digest feature_manifest_digest candidate_ids ranked_ids panel_digest")
    for key in ("panel_id", "universe_id"):
        _text(panel[key])
    _checksum(panel["feature_manifest_digest"])
    _require(panel["protocol_digest"] == protocol_digest)
    _ids(panel["candidate_ids"])
    _ids(panel["ranked_ids"])
    _require(panel["candidate_ids"] == sorted(panel["candidate_ids"]))
    _require(set(panel["ranked_ids"]) == set(panel["candidate_ids"]))
    _require(panel["panel_digest"] == _identity("panel", {k: v for k, v in panel.items() if k != "panel_digest"}))


def _outcomes(outcomes, panel, constraints):
    _fields(outcomes, "panel_digest source_reference rows outcomes_digest")
    _text(outcomes["source_reference"])
    _require(outcomes["panel_digest"] == panel["panel_digest"])
    rows = outcomes["rows"]
    _require(type(rows) is list and len(rows) == len(panel["candidate_ids"]))
    for expected_id, row in zip(panel["candidate_ids"], rows):
        _fields(row, "candidate_id score constraints")
        _require(row["candidate_id"] == expected_id)
        _rational(row["score"], optional=True)
        _require(type(row["constraints"]) is dict and set(row["constraints"]) == set(constraints))
        for value in row["constraints"].values():
            _rational(value, optional=True)
    _require(outcomes["outcomes_digest"] == _identity("outcomes", {k: v for k, v in outcomes.items() if k != "outcomes_digest"}))


def _assessment(assessment, panel, outcomes, protocol):
    _fields(assessment, "panel_digest outcomes_digest assessment_digest status reason m score feasible minimizers missing")
    _require(assessment["panel_digest"] == panel["panel_digest"]
             and assessment["outcomes_digest"] == outcomes["outcomes_digest"])
    _count(assessment["m"], 64)
    _require(assessment["m"] == len(panel["candidate_ids"]))
    missing = assessment["missing"]
    _require(type(missing) is list and len(missing) <= 64 * 9)
    for pair in missing:
        _require(type(pair) is list and len(pair) == 2 and pair[0] in panel["candidate_ids"]
                 and pair[1] in {"score", *protocol["constraint_scopes"]})
    if assessment["status"] == "complete":
        _require(not missing and assessment["reason"] in {"feasible_minimizers", "empty_universe", "no_feasible_candidate"})
        _require(0 <= _rational(assessment["score"]) <= 1)
        for key in ("feasible", "minimizers"):
            _ids(assessment[key])
            _require(assessment[key] == sorted(assessment[key]))
        _require(set(assessment["minimizers"]) <= set(assessment["feasible"]) <= set(panel["candidate_ids"]))
    else:
        _require(assessment["status"] == "incomplete" and assessment["reason"] == "missing_truth"
                 and bool(missing) and all(assessment[key] is None for key in ("score", "feasible", "minimizers")))
    values = {k: v for k, v in assessment.items() if k != "assessment_digest"}
    _require(assessment["assessment_digest"] == _identity("assessment", {"protocol_digest": protocol["protocol_digest"], **values}))


def _certificate(result):
    _fields(result, "schema engine_version adapter_version profile_id scenario_id problem_digest certificate_digest protocol calibration future_panel selection assumptions physical_attestation")
    _require(result["schema"] == CERTIFICATE_SCHEMA and result["engine_version"] == __version__
             and result["adapter_version"] == "decision-pool-adapter-v1"
             and result["profile_id"] == "decision-pool-local-v1")
    _checksum(result["problem_digest"])
    _sealed(result, "certificate_digest")
    _require(_same(result["assumptions"], list(PREMISES)) and result["physical_attestation"] == PHYSICAL_ATTESTATION)
    protocol = result["protocol"]
    _fields(protocol, "protocol_id scenario_id ranker_id ranking_rule_id tie_rule_id generator_id freeze_reference sampling_scope objective_scope constraint_scopes premise_status protocol_digest")
    for key in ("protocol_id", "scenario_id", "ranker_id", "ranking_rule_id", "tie_rule_id", "generator_id", "freeze_reference", "sampling_scope"):
        _text(protocol[key])
    _require(result["scenario_id"] == protocol["scenario_id"] and protocol["premise_status"] in {"assumed_unverified", "unsupported"})
    constraints = protocol["constraint_scopes"]
    _require(type(constraints) is dict and len(constraints) <= 8 and "score" not in constraints)
    for quantity, scope in [("score", protocol["objective_scope"]), *constraints.items()]:
        _fields(scope, "scenario_id quantity unit reference")
        for value in scope.values():
            _text(value)
        _require(scope["scenario_id"] == protocol["scenario_id"] and scope["quantity"] == quantity)
    _require(protocol["protocol_digest"] == _identity("protocol", {k: v for k, v in protocol.items() if k != "protocol_digest"}))
    calibration = result["calibration"]
    _fields(calibration, "alpha n complete_count k threshold status premise_status reasons guarantee_status conditional_guarantee calibration_digest panels")
    _require(0 < _rational(calibration["alpha"]) < 1)
    for key in ("n", "complete_count", "k"):
        _count(calibration[key], 65)
    _require(calibration["n"] <= 64 and 1 <= calibration["k"] <= calibration["n"] + 1
             and calibration["complete_count"] <= calibration["n"])
    _require(type(calibration["panels"]) is list and len(calibration["panels"]) == calibration["n"])
    _require(calibration["premise_status"] == protocol["premise_status"])
    threshold = _rational(calibration["threshold"], optional=True)
    _require(threshold is None or 0 <= threshold <= 1)
    _ids(calibration["reasons"], maximum=16)
    _require(set(calibration["reasons"]) <= _CALIBRATION_REASONS)
    _require(calibration["status"] in {"finite_conditional", "insufficient_calibration", "incomplete_calibration", "unsupported_premise"})
    status = calibration["status"]
    expected_guarantee = ("conditional_single_panel_marginal" if status == "finite_conditional" else
                          "deterministic_all_universe" if status == "insufficient_calibration" else
                          "no_calibrated_guarantee")
    _require(calibration["guarantee_status"] == expected_guarantee
             and calibration["conditional_guarantee"] == (CONDITIONAL_GUARANTEE if status == "finite_conditional" else None))
    if status == "unsupported_premise":
        _require(calibration["premise_status"] == "unsupported" and threshold is None)
    else:
        _require(calibration["premise_status"] == "assumed_unverified")
        if status == "incomplete_calibration":
            _require(calibration["complete_count"] < calibration["n"] and threshold is None)
        elif status == "insufficient_calibration":
            _require(calibration["complete_count"] == calibration["n"] and calibration["k"] > calibration["n"] and threshold == 1)
        else:
            _require(calibration["complete_count"] == calibration["n"] and calibration["k"] <= calibration["n"] and threshold is not None)
    panel_ids, universes, assessments, slots, complete_count = set(), {}, [], 0, 0
    for entry in calibration["panels"]:
        _fields(entry, "panel outcomes assessment")
        panel, outcomes = entry["panel"], entry["outcomes"]
        _panel(panel, protocol["protocol_digest"])
        _outcomes(outcomes, panel, constraints)
        _assessment(entry["assessment"], panel, outcomes, protocol)
        _require(panel["panel_id"] not in panel_ids)
        panel_ids.add(panel["panel_id"])
        _require(universes.setdefault(panel["universe_id"], panel["candidate_ids"]) == panel["candidate_ids"])
        slots += len(panel["candidate_ids"])
        complete_count += entry["assessment"]["status"] == "complete"
        assessments.append(entry["assessment"]["assessment_digest"])
    _require(calibration["complete_count"] == complete_count)
    cal_values = {k: v for k, v in calibration.items() if k not in {"panels", "calibration_digest"}}
    _require(calibration["calibration_digest"] == _identity("calibration", {
        "protocol_digest": protocol["protocol_digest"], "panel_assessments": assessments,
        "assumptions": result["assumptions"], "physical_attestation": result["physical_attestation"], **cal_values}))
    panel = result["future_panel"]
    _panel(panel, protocol["protocol_digest"])
    _require(panel["panel_id"] not in panel_ids and slots + len(panel["candidate_ids"]) <= 4096)
    _require(universes.setdefault(panel["universe_id"], panel["candidate_ids"]) == panel["candidate_ids"])
    selection = result["selection"]
    _fields(selection, "m original_ids ranked_ids retained not_retained retained_count retained_fraction threshold calibration_status premise_status reasons guarantee_status conditional_guarantee decision_digest")
    _count(selection["m"], 64)
    _count(selection["retained_count"], 64)
    _require(selection["m"] == len(panel["candidate_ids"]) and _same(selection["original_ids"], panel["candidate_ids"])
             and _same(selection["ranked_ids"], panel["ranked_ids"]))
    for key in ("retained", "not_retained", "reasons"):
        _ids(selection[key])
    _require(set(selection["reasons"]) <= _SELECTION_REASONS)
    _require(selection["retained_count"] == len(selection["retained"])
             and selection["retained"] + selection["not_retained"] == panel["ranked_ids"])
    fraction = str(Fraction(selection["retained_count"], selection["m"])) if selection["m"] else None
    _require(selection["retained_fraction"] == fraction and selection["calibration_status"] == calibration["status"])
    for key in ("threshold", "premise_status", "guarantee_status", "conditional_guarantee"):
        _require(_same(selection[key], calibration[key]))
    selected_values = {k: v for k, v in selection.items() if k not in {
        "ranked_ids", "not_retained", "retained_count", "retained_fraction", "decision_digest"}}
    _require(selection["decision_digest"] == _identity("decision", {
        "calibration_digest": calibration["calibration_digest"], "panel_digest": panel["panel_digest"],
        "assumptions": result["assumptions"], "physical_attestation": result["physical_attestation"], **selected_values}))


def validate_decision_pool_receipt(operation, result):
    """Validate bounded normalized identity records; do not rerun selection."""
    if operation == "select":
        _certificate(result)
        return
    _require(operation == "replay")
    _fields(result, "schema engine_version problem_digest certificate_digest outcomes_digest decision reported_outcomes outcome_audit interpretation physical_attestation replay_digest")
    _require(result["schema"] == REPLAY_SCHEMA and result["engine_version"] == __version__
             and result["physical_attestation"] == PHYSICAL_ATTESTATION)
    _sealed(result, "replay_digest")
    _checksum(result["outcomes_digest"])
    _fields(result["decision"], "certificate selection")
    receipt = result["decision"]["certificate"]
    _certificate(receipt)
    _require(result["problem_digest"] == receipt["problem_digest"] and result["certificate_digest"] == receipt["certificate_digest"]
             and _same(result["decision"]["selection"], receipt["selection"]))
    _outcomes(result["reported_outcomes"], receipt["future_panel"], receipt["protocol"]["constraint_scopes"])
    audit = result["outcome_audit"]
    _fields(audit, "assessment_digest status reason m missing reported_feasible_ids true_minimizer_ids true_optimum_value worst_minimizer_rank_fraction has_feasible_candidate all_true_minimizers_retained lost_minimizer_ids retention_test threshold_event_holds retained_count retained_fraction")
    assessment = {"panel_digest": receipt["future_panel"]["panel_digest"],
                  "outcomes_digest": result["reported_outcomes"]["outcomes_digest"],
                  "assessment_digest": audit["assessment_digest"], "status": audit["status"],
                  "reason": audit["reason"], "m": audit["m"], "missing": audit["missing"],
                  "score": audit["worst_minimizer_rank_fraction"], "feasible": audit["reported_feasible_ids"],
                  "minimizers": audit["true_minimizer_ids"]}
    _assessment(assessment, receipt["future_panel"], result["reported_outcomes"], receipt["protocol"])
    _require(_same(audit["retained_count"], receipt["selection"]["retained_count"])
             and _same(audit["retained_fraction"], receipt["selection"]["retained_fraction"]))
    _rational(audit["true_optimum_value"], optional=True)
    for key in ("has_feasible_candidate", "all_true_minimizers_retained", "threshold_event_holds"):
        _require(audit[key] is None or type(audit[key]) is bool)
    if audit["status"] == "incomplete":
        _require(all(audit[key] is None for key in ("true_optimum_value", "has_feasible_candidate", "all_true_minimizers_retained", "lost_minimizer_ids", "threshold_event_holds"))
                 and audit["retention_test"] == "unknown_incomplete_truth")
    else:
        _ids(audit["lost_minimizer_ids"])
        expected = [cid for cid in audit["true_minimizer_ids"] if cid not in receipt["selection"]["retained"]]
        _require(audit["lost_minimizer_ids"] == expected and audit["all_true_minimizers_retained"] is (not expected)
                 and audit["has_feasible_candidate"] is bool(audit["reported_feasible_ids"]))
        test = ("vacuous_empty_universe" if not audit["m"] else "vacuous_no_feasible_candidate" if not audit["reported_feasible_ids"]
                else "feasible_failure" if expected else "feasible_success")
        _require(audit["retention_test"] == test)
        minimizers = audit["true_minimizer_ids"]
        rows = {row["candidate_id"]: row for row in result["reported_outcomes"]["rows"]}
        expected_optimum = rows[minimizers[0]]["score"] if minimizers else None
        _require(audit["true_optimum_value"] == expected_optimum)
        threshold = receipt["selection"]["threshold"]
        event = (Fraction(audit["worst_minimizer_rank_fraction"]) <= Fraction(threshold)) if threshold is not None else None
        _require(audit["threshold_event_holds"] is event)
    _require(_same(result["interpretation"], _REPLAY_INTERPRETATION))
