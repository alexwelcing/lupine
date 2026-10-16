"""Shared source-free stage execution; every source/role capability is injected.

Only the unchanged study kernel predicts, ranks, calibrates and evaluates. This
module opens no files and draws no entropy. Source-specific wrappers authenticate
inputs and seal stages; target custody enforces each consumer's access boundary.
"""
from types import MappingProxyType
import mpea_fixture_driver as helpers

kernel = helpers.kernel
ROLES = helpers.ROLES
_targets = helpers._targets
_target_payload = helpers._target_payload
_target_aggregate = helpers._target_aggregate
_panels = helpers._panels
_compact_rank = helpers._compact_rank
_compact_plan = helpers._compact_plan
_compact_replay = helpers._compact_replay
fail = helpers.fail


def execute(case,store,custodian,seal,emit,*,sampling_premise,references,result_type,stage_gate=None,stage_evidence=None):
    fit,ranks,completeness,plans=None,(),None,()
    aggregates={role:None for role in ROLES}
    emit({"event": "TARGET_PHASE_BEGIN"})
    rows = custodian.development()
    aggregates["DEVELOPMENT"] = _target_aggregate(rows)
    aggregate = aggregates["DEVELOPMENT"]
    reasons = tuple(code for condition, code in (
        (aggregate["complete_row_count"] < 50, "DEVELOPMENT_ROWS_BELOW_50"),
        (aggregate["complete_group_count"] < 15, "DEVELOPMENT_GROUPS_BELOW_15")) if condition)
    development_status = "NO_GO_INSUFFICIENT_DEVELOPMENT" if reasons else "COMPLETE"
    seal("development", {"rows": _target_payload(rows), "aggregate": aggregate,
                         "status": development_status, "reasons": reasons},
         status=development_status, reasons=reasons)
    if reasons:
        return result_type(development_status, store, None, (), None, (), None,
                             MappingProxyType(aggregates), tuple(custodian.access), reasons)
    # Model access starts only after the parsed development artifact closes.
    store.require("development")
    if stage_gate is not None:stage_gate()
    feature_map = {row.record_id: row for row in case.features}
    fit = kernel.fit_development(tuple(kernel.DevelopmentRow(feature_map[row.record_id], row)
                                       for row in _targets(rows)))
    if fit.status != "COMPLETE" or fit.reasons:
        fail("INTERNAL_FAILURE")
    ranks = tuple(kernel.rank_panel(fit, panel) for role in ROLES for panel in _panels(case, role))
    rank_sha = seal("rank_freeze", {"fit_digest": fit.fit_digest, "threshold": fit.threshold,
        "processing_medians": fit.processing_medians, "global_medians": fit.global_medians,
        "ranks": [_compact_rank(rank) for rank in ranks]})
    role_by_group = {str(row.source_group): row.role for row in case.routes.rows if row.condition_eligible}
    calibration_ranks = tuple(r for r in ranks if role_by_group[r.panel.source_group] == "CALIBRATION")
    future_ranks = tuple(r for r in ranks if role_by_group[r.panel.source_group] == "EVALUATION")
    completeness, reserved_aggregates, identities = custodian.reserved(
        tuple(r.panel for r in calibration_ranks + future_ranks), rank_sha)
    aggregates.update(reserved_aggregates)
    seal("reserved", {"completeness_digest": completeness.completeness_digest,
        "all_40_endpoints_defined": completeness.all_defined, "complete_ids": completeness.complete_ids,
        "target_aggregates": reserved_aggregates, "vault_identities": identities})
    calibration_targets = custodian.calibration()
    resolved_references=references(rank_sha) if callable(references) else references
    plans = tuple(kernel.calibrate_population(fit, calibration_ranks, calibration_targets,
        future_ranks, completeness, population, sampling_premise, rank_sha,
        *resolved_references)
        for population in ("primary", "secondary"))
    if stage_evidence is not None:stage_evidence("calibration",plans)
    seal("calibration", {"plan_digests": [plan.plan_digest for plan in plans],
        "all_future_decisions_sealed": True, "plans": [_compact_plan(plan) for plan in plans]})
    evaluator = custodian.evaluator(plans)
    runs = []
    for plan in plans:
        one = []
        for schedule in plan.schedules:
            oracle = evaluator.policy(plan.plan_digest, schedule.panel_id, schedule.policy_id)
            for record_id in schedule.reveal_ids:
                token = oracle.request(record_id)
                oracle.reveal(token)
            one.append(oracle.finish())
        runs.append(tuple(one))
    seal("replay", {"completed_policy_runs": sum(map(len, runs)), "runs": runs,
                    "all_policy_runs_complete": evaluator.complete})
    truth = custodian.audit_truth(evaluator)
    replays = tuple(kernel.audit_replay(plan, one, truth) for plan, one in zip(plans, runs))
    evaluation = kernel.evaluate_study(*replays)
    # Compact exact assessment without recursively embedding plans/fits again.
    assessment = {name: getattr(evaluation, name) for name in evaluation.__dataclass_fields__
                  if name not in ("primary", "secondary")}
    seal("evaluation", {"evaluation": assessment,
         "population_audits": [_compact_replay(replay) for replay in replays],
         "access": custodian.access})
    return result_type("COMPLETE", store, fit, ranks, completeness, plans, evaluation,
                         MappingProxyType(aggregates), tuple(custodian.access))
