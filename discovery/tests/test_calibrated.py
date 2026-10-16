import copy
from fractions import Fraction
from itertools import product
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from lupine_discovery.calibrated import parse_calibrated_problem
from lupine_discovery.cli import certificate, replay_report, verify_certificate
from lupine_discovery.evidence import digest
from lupine_discovery.serialization import loads, parse_problem


def problem():
    return {
        "schema": "lupine.discovery.calibrated_problem.v1",
        "scenario": {"id": "calibration-fixture", "objective": {
            "unit": "utility", "reference": "synthetic fixture", "direction": "minimize"},
            "constraints": {"budget": {"unit": "cost", "reference": "synthetic fixture"}}},
        "candidates": [{"id": "a", "score": 0, "constraints": {"budget": -2}},
                       {"id": "b", "score": 4, "constraints": {"budget": 0}},
                       {"id": "c", "score": -10, "constraints": {"budget": 2}}],
        "calibration": {"delta": "3/5", "predictor_id": "frozen-predictor-v1",
                        "calibration_id": "fixture-residuals-v1", "sampling_scope": "synthetic fixture",
                        "premise_status": "assumed_unverified",
                        "residuals": {"score": [1] * 9, "budget": [1] * 9}},
    }


def outcomes(value, rows=None):
    return {"schema": "lupine.discovery.outcomes.v1", "scenario_id": value["scenario"]["id"],
            "problem_digest": digest(value), "outcomes": copy.deepcopy(value["candidates"] if rows is None else rows)}


class CalibratedTests(unittest.TestCase):
    def test_finite_exact_allocation_and_existing_core(self):
        value = problem()
        result = certificate(value)
        calibration = result["calibration"]
        self.assertEqual(result["schema"], "lupine.discovery.calibrated_certificate.v1")
        self.assertEqual(calibration["status"], "finite_conditional")
        self.assertEqual(calibration["reasons"], [])
        for key, expected in {"calibration_count": 9, "candidate_count": 3, "target_count": 2,
                              "event_count": 6, "epsilon": "1/10", "rank": 9,
                              "minimum_finite_calibration_count": "9"}.items():
            self.assertEqual(calibration["plan"][key], expected)
        self.assertEqual(calibration["targets"]["budget"]["radius"], "1")
        self.assertEqual(result["selection"], certificate(result["prepared_problem"])["selection"])
        self.assertEqual(result["selection"]["retained"], ["a"])
        self.assertEqual(result["selection"]["dominated"], ["b"])
        self.assertEqual(result["selection"]["certified_infeasible"], ["c"])
        self.assertEqual(result["problem_digest"], digest(value))
        self.assertNotEqual(result["problem_digest"], digest(result["prepared_problem"]))
        self.assertEqual(result["certificate_digest"], digest({k: v for k, v in result.items() if k != "certificate_digest"}))
        self.assertTrue(verify_certificate(value, result)["verified"])
        parse_problem(result["prepared_problem"])

    def test_conditional_retention_and_regret_against_independent_worlds(self):
        value = problem()
        value["candidates"][1]["score"] = 1
        value["candidates"][2]["score"] = -1
        value["candidates"][2]["constraints"]["budget"] = 0
        receipt = certificate(value)
        # Exhaust every endpoint/center choice independently of core membership.
        for errors in product((-1, 0, 1), repeat=6):
            rows = [{"id": row["id"], "score": row["score"] + errors[2*i],
                     "constraints": {"budget": row["constraints"]["budget"] + errors[2*i+1]}}
                    for i, row in enumerate(value["candidates"])]
            feasible = [row for row in rows if row["constraints"]["budget"] <= 0]
            best = min(row["score"] for row in feasible)
            expected = sorted(row["id"] for row in feasible if row["score"] == best)
            report = replay_report(value, outcomes(value, rows))["evaluation"]
            self.assertEqual(report["true_minimizers"], expected)
            self.assertTrue(set(expected) <= set(receipt["selection"]["retained"]))
            self.assertTrue(report["regret_bound_holds"])
            self.assertEqual(report["selection"], receipt["selection"])

    def test_constraint_and_candidate_counts_cannot_underallocate(self):
        value = problem()
        value["candidates"].append({"id": "d", "score": -100, "constraints": {"budget": -10}})
        result = certificate(value)
        self.assertEqual(result["calibration"]["plan"]["event_count"], 8)
        self.assertEqual(result["calibration"]["status"], "abstained")
        value = problem()
        value["scenario"]["constraints"]["second"] = {"unit": "u", "reference": "r"}
        for row in value["candidates"]:
            row["constraints"]["second"] = 0
        value["calibration"]["residuals"]["second"] = [0] * 9
        result = certificate(value)
        self.assertEqual(result["calibration"]["plan"]["event_count"], 9)
        self.assertEqual(result["calibration"]["status"], "abstained")

    def test_insufficient_abstains_without_calling_selector_or_fake_bounds(self):
        value = problem()
        value["calibration"]["delta"] = "1/100"
        with patch("lupine_discovery.cli.select", side_effect=AssertionError("no selector")), \
             patch("lupine_discovery.calibrated.evaluate", side_effect=AssertionError("no interval replay")):
            result = certificate(value)
            replay = replay_report(value, outcomes(value))
        selection = result["selection"]
        self.assertEqual(selection["retained"], ["a", "b", "c"])
        self.assertEqual(selection["possible_feasible"], selection["retained"])
        for key in ("certified_feasible", "certified_infeasible", "dominated"):
            self.assertEqual(selection[key], [])
        for key in ("incumbent", "threshold", "regret_bound"):
            self.assertIsNone(selection[key])
        self.assertIsNone(result["prepared_problem"])
        self.assertEqual(result["calibration"]["reasons"], ["required_rank_exceeds_calibration_count"])
        self.assertIsNone(result["calibration"]["targets"]["score"]["radius"])
        audit = replay["evaluation"]
        self.assertEqual(audit["selection"], selection)
        self.assertEqual(audit["empirical_soundness"], "not_evaluated_abstention")
        self.assertEqual(audit["true_minimizers"], ["a"])
        self.assertTrue(audit["all_true_minimizers_retained"])
        for key in ("score_coverage", "constraint_coverage", "incumbent_regret", "regret_bound_holds"):
            self.assertIsNone(audit[key])
        self.assertEqual(audit["score_coverage_count"], 0)
        self.assertEqual(audit["pool_fraction"], "1")

    def test_unsupported_abstains_even_with_finite_arithmetic(self):
        value = problem()
        value["calibration"]["premise_status"] = "unsupported"
        result = certificate(value)
        calibration = result["calibration"]
        self.assertEqual(calibration["plan"]["outcome_kind"], "finite")
        self.assertEqual(calibration["plan"]["premise_status"], "unsupported")
        self.assertEqual(calibration["status"], "abstained")
        self.assertEqual(calibration["reasons"], ["sampling_scope_unsupported"])
        self.assertIsNone(result["prepared_problem"])
        self.assertEqual(result["selection"]["retained"], ["a", "b", "c"])
        self.assertEqual(result["physical_attestation"], "not_established_by_this_program")
        self.assertEqual(result["evidence_assessment"]["a"]["state"], "missing_premises")

    def test_zero_residual_rows_and_combined_abstention_reasons(self):
        value = problem()
        value["calibration"]["premise_status"] = "unsupported"
        value["calibration"]["residuals"] = {"score": [], "budget": []}
        result = certificate(value)
        self.assertEqual(result["calibration"]["plan"]["rank"], 1)
        self.assertEqual(result["calibration"]["reasons"], ["sampling_scope_unsupported", "required_rank_exceeds_calibration_count"])

    def test_no_premise_is_promoted_by_finite_output(self):
        result = certificate(problem())
        self.assertEqual(result["calibration"]["premise_status"], "assumed_unverified")
        self.assertEqual(result["calibration"]["plan"]["guarantee_status"], "conditional_arithmetic_only")
        self.assertEqual(result["physical_attestation"], "not_established_by_this_program")
        self.assertEqual(result["evidence_assessment"]["a"]["state"], "missing_premises")

    def test_extra_fields_hidden_outcomes_and_denominators_rejected(self):
        for location, key, val in [
            ((), "outcomes", []), ((), "evidence", []), ((), "guarantee", "supported"),
            (("calibration",), "candidate_count", 1), (("calibration",), "target_count", 1),
            (("calibration",), "epsilon", "1/2"), (("calibration",), "calibration_count", 999),
            (("calibration",), "guarantee_status", "proved"),
            (("candidates", 0), "truth", 42), (("scenario", "objective"), "physical_attestation", True),
        ]:
            value = problem()
            node = value
            for part in location:
                node = node[part]
            node[key] = val
            with self.subTest(location=location, key=key), self.assertRaises((ValueError, TypeError)):
                certificate(value)

    def test_strict_scopes_containers_counts_and_exact_scalars(self):
        mutations = [
            lambda p: p.update(candidates=[]),
            lambda p: p.update(candidates=tuple(p["candidates"])),
            lambda p: p["candidates"].append(copy.deepcopy(p["candidates"][0])),
            lambda p: p["scenario"]["objective"].update(direction="maximize"),
            lambda p: p["scenario"]["objective"].update(unit=" "),
            lambda p: p["scenario"]["constraints"].update(score={"unit": "u", "reference": "r"}),
            lambda p: p["candidates"][0].update(constraints={}),
            lambda p: p["candidates"][0].update(id=""),
            lambda p: p["candidates"][0].update(score=0.1),
            lambda p: p["candidates"][0].update(score=True),
            lambda p: p["calibration"].update(predictor_id=""),
            lambda p: p["calibration"].update(sampling_scope=[]),
            lambda p: p["calibration"].update(premise_status="supported"),
            lambda p: p["calibration"].update(delta=0),
            lambda p: p["calibration"].update(delta=0.5),
            lambda p: p["calibration"]["residuals"].update(score="111111111"),
            lambda p: p["calibration"]["residuals"].update(score=[1] * 8),
            lambda p: p["calibration"]["residuals"].update(score=[1] * 8 + [-1]),
            lambda p: p["calibration"]["residuals"].update(score=[1] * 8 + [True]),
            lambda p: p["calibration"]["residuals"].update(other=[1] * 9),
            lambda p: p.update(description={}),
        ]
        for mutate in mutations:
            for unsupported in (False, True):
                value = problem()
                if unsupported:
                    value["calibration"]["premise_status"] = "unsupported"
                mutate(value)
                with self.subTest(mutation=mutate, unsupported=unsupported), self.assertRaises((ValueError, TypeError)):
                    parse_calibrated_problem(value)
        with self.assertRaises(ValueError):
            loads('{"calibration":{"delta":"1/2","delta":"1/3"}}')

    def test_arbitrary_precision_and_ties(self):
        value = problem()
        value["candidates"] = [{"id": "b", "score": "9007199254740993/9007199254740992", "constraints": {"budget": -1}},
                               {"id": "a", "score": "1", "constraints": {"budget": -1}}]
        value["calibration"]["residuals"] = {"score": [0] * 9, "budget": [0] * 9}
        result = certificate(value)
        self.assertEqual(result["selection"]["retained"], ["a"])
        value["candidates"][0]["score"] = "1"
        self.assertEqual(certificate(value)["selection"]["retained"], ["a", "b"])

    def test_derived_sample_requirement_preserves_large_wire_integer(self):
        value = problem()
        value["scenario"]["constraints"] = {}
        value["candidates"] = [{"id": "a", "score": 0, "constraints": {}}]
        value["calibration"]["delta"] = "1/100000000000000000"
        value["calibration"]["residuals"] = {"score": []}
        receipt = certificate(value)
        required = receipt["calibration"]["plan"]["minimum_finite_calibration_count"]
        self.assertIsInstance(required, str)
        self.assertEqual(required, "99999999999999999")
        wire_roundtrip = loads(json.dumps(receipt))
        self.assertTrue(verify_certificate(value, wire_roundtrip)["verified"])
        # A browser-style lossy integer conversion changes the sealed result.
        wire_roundtrip["calibration"]["plan"]["minimum_finite_calibration_count"] = str(int(float(required)))
        with self.assertRaises(ValueError):
            verify_certificate(value, wire_roundtrip)

    def test_certificate_tampering_and_scope_rebinding_rejected(self):
        value = problem()
        receipt = certificate(value)
        for key, val in [("prepared_problem", None), ("calibration", {}), ("problem_digest", "0" * 64)]:
            changed = copy.deepcopy(receipt)
            changed[key] = val
            changed["certificate_digest"] = digest({k: v for k, v in changed.items() if k != "certificate_digest"})
            with self.assertRaises(ValueError):
                verify_certificate(value, changed)
        for key in ("unit", "reference"):
            changed = copy.deepcopy(value)
            changed["scenario"]["objective"][key] += "-changed"
            with self.assertRaises(ValueError):
                verify_certificate(changed, receipt)
        no_constraints = problem()
        no_constraints["scenario"]["constraints"] = {}
        no_constraints["calibration"]["residuals"] = {"score": [1] * 9}
        for row in no_constraints["candidates"]:
            row["constraints"] = {}
        changed = certificate(no_constraints)
        changed["calibration"]["plan"]["target_count"] = True
        with self.assertRaises(ValueError):
            verify_certificate(no_constraints, changed)

    def test_replay_uses_original_seal_and_decides_before_truth(self):
        value = problem()
        original = certificate(value)
        from lupine_discovery import calibrated
        real_parse = calibrated.parse_outcomes
        events = []
        def recorded_certificate(problem_value):
            events.append("selected")
            return original
        def guarded_outcomes(*args):
            self.assertEqual(events, ["selected"])
            return real_parse(*args)
        with patch.object(calibrated, "calibrated_certificate", recorded_certificate), \
             patch.object(calibrated, "parse_outcomes", guarded_outcomes):
            replay_report(value, outcomes(value))
        hidden = outcomes(value)
        hidden["outcomes"][2]["constraints"]["budget"] = -2
        hidden["outcomes"][2]["score"] = -1000
        report = replay_report(value, hidden)["evaluation"]
        self.assertEqual(report["selection"], original["selection"])
        self.assertFalse(report["all_true_minimizers_retained"])
        self.assertEqual(report["empirical_soundness"], "refuted_on_observed_outcomes")
        hidden["problem_digest"] = digest(original["prepared_problem"])
        with self.assertRaises(ValueError):
            replay_report(value, hidden)

    def test_abstention_partial_infeasible_and_invalid_truth(self):
        value = problem()
        value["calibration"]["premise_status"] = "unsupported"
        partial = replay_report(value, outcomes(value, [{"id": "a", "score": 0, "constraints": {}}]))["evaluation"]
        self.assertEqual(partial["outcome_completeness"], "partial")
        self.assertIsNone(partial["true_minimizers"])
        self.assertIsNone(partial["all_true_minimizers_retained"])
        self.assertIsNone(partial["per_candidate"]["a"]["true_feasible"])
        rows = [{"id": row["id"], "score": 0, "constraints": {"budget": 1}} for row in value["candidates"]]
        no_feasible = replay_report(value, outcomes(value, rows))["evaluation"]
        self.assertEqual(no_feasible["true_minimizers"], [])
        self.assertIsNone(no_feasible["all_true_minimizers_retained"])
        for rows in [[{"id": "outside", "score": 0, "constraints": {}}],
                     [{"id": "a", "score": 0, "constraints": {"unknown": 0}}],
                     [value["candidates"][0], value["candidates"][0]]]:
            with self.assertRaises(ValueError):
                replay_report(value, outcomes(value, rows))

    def test_cli_select_verify_replay(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            value = problem()
            (root / "problem.json").write_text(json.dumps(value))
            (root / "outcomes.json").write_text(json.dumps(outcomes(value)))
            command = [sys.executable, "-m", "lupine_discovery"]
            for args in [
                ["select", str(root / "problem.json"), "--output", str(root / "certificate.json")],
                ["verify", str(root / "problem.json"), str(root / "certificate.json")],
                ["replay", str(root / "problem.json"), str(root / "outcomes.json")],
            ]:
                executed = subprocess.run(command + args, capture_output=True, text=True)
                self.assertEqual(executed.returncode, 0, executed.stderr)
            self.assertEqual(json.loads(executed.stdout)["calibration"]["status"], "finite_conditional")


if __name__ == "__main__":
    unittest.main()
