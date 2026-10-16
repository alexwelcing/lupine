#!/usr/bin/env python3
"""Independent reconstruction of the completed jarvis-gap-formation-v1 result.

This post-run audit reads the full local replay and its frozen predictions.
It imports no selector, calibration, replay, or dashboard implementation. It
reconstructs archive truth from each policy's recorded reveals, then checks
every budget against that truth. It is scoped to the completed finite-radius,
50-primary/50-shift-panel result identified below, not arbitrary future runs.
No target table or raw archive is opened. The public receipt contains counts,
identities and gate decisions, never individual target observations.
"""
from __future__ import annotations

import argparse
from collections import Counter
from fractions import Fraction
import hashlib
import json
from math import comb
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
SCIENTIFIC_ID = "cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900"
BUDGETS = (0, 1, 2, 4, 8, 20)
POLICIES = {"interval", "nominal_5nn", "nearest_1nn"} | {f"random_{i}" for i in range(100)}
COMPARATORS = ("nominal_5nn", "nearest_1nn", "random_0")


class AuditFailure(ValueError):
    pass


def require(condition, label):
    if not condition:
        raise AuditFailure(label)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False, allow_nan=False).encode("utf-8")


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read_exact(path):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, "duplicate JSON key")
            result[key] = value
        return result
    def reject(_):
        raise AuditFailure("nonexact JSON number in audit input")
    raw = Path(path).read_bytes()
    return json.loads(raw, object_pairs_hook=pairs, parse_float=reject, parse_constant=reject), raw


def ratio(value):
    require(not isinstance(value, bool) and isinstance(value, (int, str)), "invalid exact scalar")
    return Fraction(value)


def median(values):
    values = sorted(values)
    require(bool(values), "empty median outside this audit's scope")
    middle = len(values) // 2
    return values[middle] if len(values) % 2 else (values[middle-1] + values[middle]) / 2


def audit(report_path, freeze_path):
    report, raw = read_exact(report_path)
    freeze, freeze_raw = read_exact(freeze_path)
    require(report["schema"] == "lupine.discovery.constrained.replay.v1", "wrong replay schema")
    require(report["scientific_result_sha256"] == SCIENTIFIC_ID, "outside the reviewed scientific-result scope")
    require(sha(canonical({k: v for k, v in report.items() if k != "report_content_sha256"}))
            == report["report_content_sha256"], "full report content seal mismatch")
    require(sha(canonical({k: v for k, v in freeze.items() if k != "receipt_sha256"}) + b"\n")
            == freeze["receipt_sha256"], "freeze content seal mismatch")
    require(report["freeze_receipt_sha256"] == freeze["receipt_sha256"], "report/freeze mismatch")
    for key in ("protocol_id", "protocol_commit", "protocol_sha256", "format_amendment_commit",
                "format_amendment_sha256", "source_format", "source_receipt_sha256", "metadata_sha256",
                "model_digest", "prediction_sha256", "target_seal", "calibration"):
        require(report[key] == freeze[key], f"frozen identity mismatch: {key}")
    require(report["protocol_id"] == "jarvis-gap-formation-v1", "wrong protocol")
    require(set(report["policies"]) == POLICIES and tuple(report["budgets"]) == BUDGETS,
            "policy or budget scope changed")
    plan = freeze["calibration"]
    epsilon = Fraction(1, 10) / (20 * 2)
    rank_value = (plan["count"] + 1) * (1 - epsilon)
    rank = -(-rank_value.numerator // rank_value.denominator)
    require(plan["count"] == 2048 and plan["rank"] == rank == 2044, "calibration rank/count mismatch")
    require(ratio(plan["epsilon"]) == epsilon and ratio(plan["delta"]) == Fraction(1, 10),
            "calibration risk allocation mismatch")
    require(plan["candidate_count"] == 20 and plan["target_count"] == 2 and plan["outcome_kind"] == "finite",
            "calibration scope mismatch")
    frozen = {panel["id"]: panel for panel in freeze["panels"]}
    require(len(frozen) == len(freeze["panels"]) == len(report["panels"]) == 100, "panel scope changed")
    roles = {"primary": [], "shift": []}
    seen_panels, seen_candidates, expected_access = set(), set(), []
    budgets_checked = histories_checked = reveals_checked = 0
    shift_ok = True
    for panel in report["panels"]:
        pid, role = panel["panel_id"], panel["role"]
        require(pid not in seen_panels and role in roles, "duplicate panel or invalid role")
        seen_panels.add(pid)
        fp = frozen[pid]
        require(fp["role"] == role and fp["operational_status"] == panel["operational_status"], "panel scope mismatch")
        require(set(panel["policies"]) == POLICIES, "incomplete policy collection")
        events = panel["policies"]["random_0"]["events"]
        truth = {event["revealed"]["jid"]: (ratio(event["revealed"]["gap"]),
                 ratio(event["revealed"]["formation"])) for event in events}
        require(len(truth) == len(events) == 20, "oracle truth reconstruction is incomplete")
        require(not seen_candidates & set(truth), "candidate reused across panels")
        seen_candidates.update(truth)
        feasible = {jid for jid, (_, formation) in truth.items() if formation <= 0}
        optimum = max((truth[jid][0] for jid in feasible), default=None)
        optimum_ids = {jid for jid in feasible if truth[jid][0] == optimum}
        require(optimum is not None, "no-feasible panel outside this specific completed-result scope")
        require(set(panel["truth"]["optimum_ids"]) == optimum_ids, "wrong tied optimum IDs")
        require(panel["truth"]["feasible_count"] == len(feasible), "wrong feasible count")
        require(set(panel["truth"]["feasible_ids"]) == feasible
                and panel["truth"]["archive_optimum_gap"] == str(optimum), "wrong archived feasible optimum")
        successes = {}
        for name in sorted(POLICIES):
            policy = panel["policies"][name]
            history, ids = policy["events"], []
            require(len(history) == policy["target_bundles"] == 20, "unequal policy budget")
            histories_checked += 1
            for ordinal, event in enumerate(history, 1):
                observation = event["revealed"]
                jid = observation["jid"]
                ids.append(jid)
                require(event["step"] == ordinal and observation["panel_id"] == pid
                        and observation["policy_id"] == name and event["jid"] == jid, "misbound reveal event")
                require(truth[jid] == (ratio(observation["gap"]), ratio(observation["formation"])),
                        "policies received inconsistent target bundles")
                expected_access.append((pid, name, jid, ordinal))
                reveals_checked += 1
            require(len(set(ids)) == 20 and set(ids) == set(truth), "duplicate/outside reveals")
            require(set(policy["budgets"]) == {str(b) for b in BUDGETS}, "budget snapshots missing")
            for budget in BUDGETS:
                state = policy["budgets"][str(budget)]
                chosen = set(ids[:budget])
                known = chosen & feasible
                best = max((truth[jid][0] for jid in known), default=None)
                regret = None if best is None else optimum - best
                success = regret is not None and regret <= Fraction(1, 10)
                require(state["revealed_ids"] == ids[:budget] and state["reveal_count"] == budget,
                        "budget history differs from authorized prefix")
                require(state["verified_feasible_hit"] == bool(known), "wrong feasible-hit indicator")
                require(state["revealed_feasible_count"] == len(known), "wrong revealed feasible count")
                require(state["best_verified_gap"] == (None if best is None else str(best)), "wrong best revealed gap")
                best_ids = sorted(jid for jid in known if truth[jid][0] == best)
                require(state["incumbent_ids"] == best_ids
                        and state["incumbent_display_id"] == (best_ids[0] if best_ids else None),
                        "revealed incumbent ties are not preserved")
                require(state["simple_regret"] == (None if regret is None else str(regret)), "wrong simple regret")
                require(state["within_0_1_ev_success"] == success, "wrong tolerance-success indicator")
                require(state["exact_optimum_recovered"] == (best == optimum), "wrong exact optimum recovery")
                require(state["all_optima_recovered"] == (optimum_ids <= chosen), "wrong all-ties recovery")
                if name == "interval" and role == "shift":
                    selection = state["selection"]
                    shift_ok &= (set(truth)-chosen <= set(selection["retained"])
                                 and selection["regret_bound"] is None and selection["unmeasured_guarantee"] is None)
                if budget == 4:
                    successes[name] = success
                budgets_checked += 1
        bounds = {candidate["jid"]: candidate for candidate in fp["candidates"]}
        require(set(bounds) == set(truth), "prediction/oracle identity mismatch")
        certified = {jid for jid, c in bounds.items() if ratio(c["constraint_interval"][1]) <= 0}
        possible = {jid for jid, c in bounds.items() if ratio(c["constraint_interval"][0]) <= 0}
        incumbent = min(certified, key=lambda jid: (ratio(bounds[jid]["score_interval"][1]), jid)) if certified else None
        threshold = ratio(bounds[incumbent]["score_interval"][1]) if incumbent is not None else None
        retained = {jid for jid in possible if threshold is None or ratio(bounds[jid]["score_interval"][0]) <= threshold}
        hits_gap = hits_formation = hits_joint = 0
        misses = []
        for jid, (gap, formation) in truth.items():
            score_low, score_high = map(ratio, bounds[jid]["score_interval"])
            constraint_low, constraint_high = map(ratio, bounds[jid]["constraint_interval"])
            gap_ok, formation_ok = -score_high <= gap <= -score_low, constraint_low <= formation <= constraint_high
            hits_gap += gap_ok
            hits_formation += formation_ok
            hits_joint += gap_ok and formation_ok
            if not gap_ok:
                misses.append((jid, "gap"))
            if not formation_ok:
                misses.append((jid, "formation"))
        coverage = panel["coverage"]
        require((coverage["gap_covered"], coverage["formation_covered"], coverage["candidate_joint_covered"])
                == (hits_gap, hits_formation, hits_joint), "wrong scalar/joint coverage")
        require(coverage["panel_simultaneous"] == (not misses), "wrong simultaneous-coverage indicator")
        require(sorted((miss["jid"], miss["property"]) for miss in coverage["misses"]) == sorted(misses),
                "missing or invented coverage failures")
        operational = retained if role == "primary" else set(truth)
        screening = panel["screening"]
        require(set(screening["selection"]["retained"]) == operational, "wrong initial operational pool")
        require(screening["all_optimum_retained"] == (optimum_ids <= operational), "wrong optimum-retention indicator")
        if role == "primary":
            require(screening["selection"]["incumbent"] == incumbent, "wrong certified incumbent")
            require(set(screening["selection"]["certified_feasible"]) == certified
                    and set(screening["selection"]["possible_feasible"]) == possible,
                    "wrong interval feasibility classification")
            regret_bound = None if threshold is None else threshold-min(ratio(bounds[jid]["score_interval"][0]) for jid in possible)
            require(screening["selection"]["regret_bound"] == (None if regret_bound is None else str(regret_bound)),
                    "wrong conditional regret bound")
        roles[role].append({"feasible": len(feasible), "mixed": 0 < len(feasible) < 20,
                            "simultaneous": not misses, "optimum_retained": optimum_ids <= operational,
                            "retained": len(operational), "successes": successes,
                            "infeasible_incumbent": role == "primary" and incumbent is not None and incumbent not in feasible})
    require(seen_panels == set(frozen), "missing frozen panel")
    actual_access = [(event["panel_id"], event["policy_id"], event["jid"], event["ordinal"])
                     for event in report["oracle_access_log"] if event["event"] == "oracle_reveal"]
    require(Counter(actual_access) == Counter(expected_access), "access log disagrees with policy histories")
    require([e["event"] for e in report["oracle_access_log"][:3]] ==
            ["freeze_receipt_verified", "execution_receipt_saved_before_targets", "custodian_target_seal_open"],
            "pre-reveal access boundary trace is missing")
    require(report["oracle_access_log"][-1]["event"] == "post_run_full_target_audit", "full audit is not last")
    comparisons = {}
    for role, rows in roles.items():
        arm, count = report["arms"][role], len(rows)
        require(count == 50, "arm size outside this completed-result scope")
        for field, expected in (("panel_count", count), ("candidate_count", 20*count),
                                ("feasible_candidate_count", sum(x["feasible"] for x in rows)),
                                ("mixed_feasibility_panel_count", sum(x["mixed"] for x in rows))):
            require(arm[field] == expected, f"wrong {role} aggregate: {field}")
        for field, indicator in (("panel_simultaneous_coverage", "simultaneous"),
                                 ("all_optimum_retention", "optimum_retained")):
            numerator = sum(row[indicator] for row in rows)
            require(arm[field]["numerator"] == numerator and arm[field]["denominator"] == count
                    and arm[field]["fraction"] == str(Fraction(numerator, count)), "wrong aggregate denominator or fraction")
        require(arm["median_retained_fraction"] == str(median([Fraction(row["retained"], 20) for row in rows])),
                "wrong median retained fraction")
        comparisons[role] = {}
        for comparator in COMPARATORS:
            pairs = [(row["successes"]["interval"], row["successes"][comparator]) for row in rows]
            wins = sum(left and not right for left, right in pairs)
            losses = sum(right and not left for left, right in pairs)
            ties = sum(left == right for left, right in pairs)
            pvalue = Fraction(sum(comb(wins+losses, k) for k in range(wins, wins+losses+1)),
                              2**(wins+losses)) if wins+losses else Fraction(1)
            difference = Fraction(wins-losses, count)
            observed = arm["paired_budget4"][comparator]
            require((wins, losses, ties) == (observed["wins"], observed["losses"], observed["ties"]), "wrong paired counts")
            require(observed["feasible_panel_denominator"] == count and observed["excluded_no_feasible_panels"] == 0,
                    "wrong paired denominator")
            require(str(difference) == observed["paired_success_fraction_difference"]
                    and str(pvalue) == observed["one_sided_sign_test_p"], "wrong paired difference or sign-test tail")
            comparisons[role][comparator] = {"gain": difference >= Fraction(1, 10), "sign": pvalue <= Fraction(1, 60)}
    primary = roles["primary"]
    recomputed = {
        "nontrivial_constrained_evidence": {
            "at_least_40_primary_panels": len(primary) >= 40,
            "at_least_5_percent_infeasible": Fraction(sum(20-row["feasible"] for row in primary), 20*len(primary)) >= Fraction(1, 20),
            "at_least_10_mixed_panels": sum(row["mixed"] for row in primary) >= 10},
        "observed_primary_screening": {
            "simultaneous_coverage_at_least_90_percent": Fraction(sum(row["simultaneous"] for row in primary), len(primary)) >= Fraction(9, 10),
            "all_optimum_retention_at_least_95_percent": Fraction(sum(row["optimum_retained"] for row in primary), len(primary)) >= Fraction(19, 20),
            "no_infeasible_certified_incumbent": not any(row["infeasible_incumbent"] for row in primary),
            "median_retained_fraction_at_most_80_percent": median([Fraction(row["retained"], 20) for row in primary]) <= Fraction(4, 5)},
        "recommendation_value": {**{f"{name}_gain": comparisons["primary"][name]["gain"] for name in COMPARATORS},
                                 **{f"{name}_provisional_sign_test": comparisons["primary"][name]["sign"] for name in COMPARATORS}},
        "shift_behavior": {"has_shift_panels": True,
                           "all_panels_abstain": all(p["operational_status"] == "abstain_unsupported_scope" for p in report["panels"] if p["role"] == "shift"),
                           "all_unrevealed_retained_and_no_finite_unmeasured_guarantee": shift_ok},
    }
    for name, checks in recomputed.items():
        require(report["gates"][name]["checks"] == checks, f"gate checks disagree: {name}")
        require(report["gates"][name]["status"] == ("PASS" if all(checks.values()) else "FAIL"), f"gate decision disagrees: {name}")
    engineering = report["gates"]["engineering_integrity"]
    require(engineering["status"] == "PASS" and all(engineering["checks"].values()), "engineering gate is not passed")
    require(engineering["validation"]["status"] == "verified_passed" and engineering["validation"]["exit_code"] == 0,
            "executed engineering receipt is not passed")
    return {"schema": "lupine.discovery.constrained.independent-audit.v1", "status": "PASS",
            "scientific_result_sha256": SCIENTIFIC_ID, "full_report_bytes_sha256": sha(raw),
            "report_content_sha256": report["report_content_sha256"], "freeze_bytes_sha256": sha(freeze_raw),
            "freeze_receipt_sha256": freeze["receipt_sha256"],
            "audit_script_sha256": sha(Path(__file__).read_bytes()),
            "checked": {"panels": len(seen_panels), "candidates": len(seen_candidates),
                        "policy_histories": histories_checked, "oracle_reveals": reveals_checked,
                        "budget_snapshots": budgets_checked, "calibration_rank": rank,
                        "independently_recomputed_gate_checks": recomputed},
            "gate_statuses": {name: gate["status"] for name, gate in report["gates"].items()},
            "scope": "Post-run arithmetic and recorded-history reconstruction for this identified completed finite-radius result. No selector/replay helpers imported.",
            "limits": ["Not an independent source experiment, physical validation, or proof of sampling assumptions.",
                       "Recorded access-order consistency is checked; a log alone is not proof of absence of hidden access.",
                       "Engineering test execution is recorded evidence, not re-executed by this audit.",
                       "No-feasible or unbounded cases are outside this specific result and cause rejection; separate engine tests cover them."],
            "reproduce": [sys.executable, "scripts/audit_constrained_result.py", "--report", str(report_path),
                          "--freeze", str(freeze_path), "--output", "reports/constrained-independent-audit.json"]}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, default=ROOT / ".cache/constrained/constrained-full-v1.json")
    parser.add_argument("--freeze", type=Path, default=ROOT / ".cache/constrained/jarvis-gap-formation-v1-format-compat/freeze.json")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    result = audit(args.report, args.freeze)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    raw = canonical(result) + b"\n"
    if args.output.exists():
        require(args.output.read_bytes() == raw, "existing independent audit differs; choose a fresh output path")
    else:
        with args.output.open("xb") as stream:
            stream.write(raw)
    print(json.dumps({"status": result["status"], "checked": {k: v for k, v in result["checked"].items()
                     if k != "independently_recomputed_gate_checks"}, "gate_statuses": result["gate_statuses"]}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
