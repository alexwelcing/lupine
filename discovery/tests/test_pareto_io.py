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

from lupine_discovery.cli import certificate, replay_report, verify_certificate
from lupine_discovery.evidence import digest
from lupine_discovery.pareto_io import parse_pareto_problem
from lupine_discovery.serialization import loads


def problem():
    return {
        "schema": "lupine.discovery.pareto_problem.v1",
        "scenario": {"id": "pareto-fixture", "objectives": {
            "cost": {"unit": "cost", "reference": "fixture", "direction": "minimize"},
            "failure": {"unit": "rate", "reference": "fixture", "direction": "minimize"}},
            "constraints": {"temperature": {"unit": "K", "reference": "signed margin"}}},
        "candidates": [
            {"id": "a", "objectives": {"cost": [0, 0], "failure": [3, 3]}, "constraints": {"temperature": [-1, -1]}},
            {"id": "a-twin", "objectives": {"cost": [0, 0], "failure": [3, 3]}, "constraints": {"temperature": [-1, -1]}},
            {"id": "b", "objectives": {"cost": [3, 3], "failure": [0, 0]}, "constraints": {"temperature": [-1, -1]}},
            {"id": "bad", "objectives": {"cost": [4, 4], "failure": [4, 4]}, "constraints": {"temperature": [-1, -1]}},
            {"id": "infeasible", "objectives": {"cost": [-1, -1], "failure": [-1, -1]}, "constraints": {"temperature": [1, 1]}},
        ],
    }


def outcomes(value):
    return {"schema": "lupine.discovery.pareto_outcomes.v1", "scenario_id": value["scenario"]["id"],
            "problem_digest": digest(value), "outcomes": [
                {"id": row["id"], "objectives": {key: pair[0] for key, pair in row["objectives"].items()},
                 "constraints": {key: pair[0] for key, pair in row["constraints"].items()}}
                for row in value["candidates"]]}


def oracle(rows):
    feasible = {row["id"]: tuple(Fraction(row["objectives"][key]) for key in ("cost", "failure"))
                for row in rows if all(Fraction(val) <= 0 for val in row["constraints"].values())}
    return sorted(cid for cid, vector in feasible.items() if not any(
        other != vector and all(left <= right for left, right in zip(other, vector))
        for other in feasible.values()))


class ParetoIOTests(unittest.TestCase):
    def test_certificate_preserves_tradeoffs_ties_and_witnesses(self):
        value = problem()
        receipt = certificate(value)
        self.assertEqual(receipt["schema"], "lupine.discovery.pareto_certificate.v1")
        self.assertEqual(receipt["selection"]["retained"], ["a", "a-twin", "b"])
        self.assertEqual(receipt["selection"]["dominance_witnesses"], {"bad": "a"})
        self.assertEqual(receipt["reasons"]["bad"], {"reason": "certified_feasible_bound_dominance",
                                                   "witness": "a", "strict_objectives": ["cost", "failure"]})
        self.assertEqual(receipt["reasons"]["infeasible"]["constraints"], ["temperature"])
        self.assertEqual(receipt["physical_attestation"], "not_established_by_this_program")
        self.assertEqual(receipt["evidence_assessment"]["a"]["state"], "missing_premises")
        self.assertEqual(receipt["certificate_digest"], digest({key: val for key, val in receipt.items() if key != "certificate_digest"}))
        self.assertTrue(verify_certificate(value, receipt)["verified"])
        for forbidden in ("incumbent", "threshold", "regret_bound"):
            self.assertNotIn(forbidden, receipt["selection"])

    def test_complete_archive_truth_front_and_coverage(self):
        value = problem()
        report = replay_report(value, outcomes(value))
        self.assertEqual(report["schema"], "lupine.discovery.pareto_replay.v1")
        audit = report["evaluation"]
        self.assertEqual(audit["true_pareto_front"], ["a", "a-twin", "b"])
        self.assertTrue(audit["all_true_pareto_candidates_retained"])
        self.assertEqual(audit["objective_coverage"], {"cost": "1", "failure": "1"})
        self.assertEqual(audit["objective_coverage_count"], {"cost": 5, "failure": 5})
        self.assertEqual(audit["constraint_coverage_count"], 5)
        self.assertEqual(audit["dominance_witness_correctness"], {"bad": True})
        self.assertEqual(audit["certified_rejection_correctness"], {"infeasible": True})
        self.assertEqual(audit["empirical_soundness"], "supported_on_complete_finite_archive")
        for forbidden in ("true_feasible_optimum", "incumbent_regret", "regret_bound_holds", "score_coverage"):
            self.assertNotIn(forbidden, audit)

    def test_independent_front_oracle_in_256_sound_worlds(self):
        value = problem()
        value["candidates"] = [
            {"id": "a", "objectives": {"cost": [0, 1], "failure": [0, 1]}, "constraints": {"temperature": [-1, -1]}},
            {"id": "b", "objectives": {"cost": [1, 2], "failure": [-1, 0]}, "constraints": {"temperature": [-1, 1]}},
            {"id": "c", "objectives": {"cost": [2, 3], "failure": [2, 3]}, "constraints": {"temperature": [-1, 1]}},
        ]
        selected = certificate(value)["selection"]
        count = 0
        for choices in product((0, 1), repeat=8):
            hidden = outcomes(value)
            for i, row in enumerate(hidden["outcomes"]):
                for j, key in enumerate(("cost", "failure")):
                    row["objectives"][key] = value["candidates"][i]["objectives"][key][choices[2*i+j]]
                if i:
                    row["constraints"]["temperature"] = (-1, 1)[choices[5+i]]
            expected = oracle(hidden["outcomes"])
            audit = replay_report(value, hidden)["evaluation"]
            self.assertEqual(audit["true_pareto_front"], expected)
            self.assertTrue(set(expected) <= set(selected["retained"]))
            self.assertEqual(audit["selection"], selected)
            self.assertTrue(audit["all_true_pareto_candidates_retained"])
            count += 1
        self.assertEqual(count, 256)

    def test_partial_and_explicit_null_never_establish_global_front(self):
        value = problem()
        for missing in ("row", "objective", "constraint", "null_objective", "null_constraint"):
            hidden = outcomes(value)
            if missing == "row":
                hidden["outcomes"].pop(2)
            elif missing == "objective":
                del hidden["outcomes"][2]["objectives"]["failure"]
            elif missing == "constraint":
                hidden["outcomes"][2]["constraints"] = {}
            elif missing == "null_objective":
                hidden["outcomes"][2]["objectives"]["failure"] = None
            else:
                hidden["outcomes"][2]["constraints"]["temperature"] = None
            audit = replay_report(value, hidden)["evaluation"]
            with self.subTest(missing=missing):
                self.assertEqual(audit["outcome_completeness"], "partial")
                self.assertIsNone(audit["true_pareto_front"])
                self.assertIsNone(audit["all_true_pareto_candidates_retained"])
                self.assertEqual(audit["missing_truth_ids"], ["b"])
                self.assertEqual(audit["empirical_soundness"], "unresolved_missing_outcomes")
                self.assertNotIn("b", audit["observed_pareto_front"])

    def test_all_unknown_coverage_is_not_perfect_coverage(self):
        value = problem()
        hidden = outcomes(value)
        for row in hidden["outcomes"]:
            row["objectives"] = {"cost": None, "failure": None}
            row["constraints"] = {"temperature": None}
        audit = replay_report(value, hidden)["evaluation"]
        self.assertEqual(audit["objective_coverage"], {"cost": None, "failure": None})
        self.assertEqual(audit["objective_coverage_count"], {"cost": 0, "failure": 0})
        self.assertIsNone(audit["constraint_coverage"])
        self.assertEqual(audit["constraint_coverage_count"], 0)
        self.assertEqual(audit["observed_pareto_front"], [])
        self.assertIsNone(audit["dominance_witness_correctness"]["bad"])

    def test_negative_objective_and_constraint_controls_expose_lost_front(self):
        value = problem()
        original = certificate(value)["selection"]
        hidden = outcomes(value)
        hidden["outcomes"][3]["objectives"] = {"cost": -1, "failure": 2}
        audit = replay_report(value, hidden)["evaluation"]
        self.assertEqual(audit["selection"], original)
        self.assertEqual(audit["true_pareto_front"], ["b", "bad"])
        self.assertFalse(audit["all_true_pareto_candidates_retained"])
        self.assertFalse(audit["dominance_witness_correctness"]["bad"])
        self.assertEqual(audit["empirical_soundness"], "refuted_on_observed_outcomes")
        self.assertEqual(audit["objective_coverage"]["cost"], "4/5")
        hidden = outcomes(value)
        hidden["outcomes"][4]["constraints"]["temperature"] = -1
        audit = replay_report(value, hidden)["evaluation"]
        self.assertEqual(audit["true_pareto_front"], ["infeasible"])
        self.assertFalse(audit["all_true_pareto_candidates_retained"])
        self.assertFalse(audit["certified_rejection_correctness"]["infeasible"])

    def test_partial_observed_miss_refutes_and_known_violation_is_infeasible(self):
        value = problem()
        value["scenario"]["constraints"]["second"] = {"unit": "u", "reference": "r"}
        for row in value["candidates"]:
            row["constraints"]["second"] = [-1, 1]
        hidden = outcomes(value)
        hidden["outcomes"][0]["constraints"] = {"temperature": 2, "second": None}
        hidden["outcomes"][0]["objectives"]["failure"] = None
        audit = replay_report(value, hidden)["evaluation"]
        self.assertFalse(audit["per_candidate"]["a"]["true_feasible"])
        self.assertEqual(audit["empirical_soundness"], "refuted_on_observed_outcomes")
        self.assertIsNone(audit["true_pareto_front"])

    def test_replay_decides_before_parsing_separate_outcomes(self):
        from lupine_discovery import pareto_io
        value = problem()
        real_certificate = pareto_io.pareto_certificate
        real_parse = pareto_io.parse_pareto_outcomes
        events = []
        def recorded_certificate(problem_value):
            result = real_certificate(problem_value)
            events.append("selected")
            return result
        def guarded_parse(*args):
            self.assertEqual(events, ["selected"])
            return real_parse(*args)
        with patch.object(pareto_io, "pareto_certificate", recorded_certificate), \
             patch.object(pareto_io, "parse_pareto_outcomes", guarded_parse):
            replay_report(value, outcomes(value))

    def test_empty_and_fully_infeasible_archives_do_not_fake_success(self):
        value = problem()
        for row in value["candidates"]:
            row["constraints"]["temperature"] = [1, 1]
        audit = replay_report(value, outcomes(value))["evaluation"]
        self.assertEqual(audit["true_pareto_front"], [])
        self.assertIsNone(audit["all_true_pareto_candidates_retained"])
        self.assertEqual(audit["selection"]["retained"], [])
        value["candidates"] = []
        audit = replay_report(value, outcomes(value))["evaluation"]
        self.assertEqual(audit["true_pareto_front"], [])
        self.assertEqual(audit["empirical_soundness"], "not_evaluated_empty_universe")
        self.assertIsNone(audit["pool_fraction"])

    def test_scoped_evidence_never_promotes_physical_attestation(self):
        value = problem()
        record = {"id": "e", "kind": "published_measurement", "status": "reported",
                  "scope": {"scenario_id": "pareto-fixture", "quantity": "cost", "unit": "cost", "reference": "fixture"},
                  "statement": "Declared measurement; no enclosure proof", "source": {"uri": "https://example.org/fixture"}}
        value["evidence"] = [record]
        value["candidates"][0]["evidence"] = {"cost": ["e"]}
        result = certificate(value)
        self.assertEqual(result["evidence_assessment"]["a"]["missing_quantities"], ["failure", "temperature"])
        self.assertEqual(result["physical_attestation"], "not_established_by_this_program")
        for key in ("scenario_id", "quantity", "unit", "reference"):
            changed = copy.deepcopy(value)
            changed["evidence"][0]["scope"][key] += "-mismatch"
            with self.subTest(key=key), self.assertRaises(ValueError):
                certificate(changed)
        value["evidence"][0]["status"] = "rejected"
        self.assertEqual(certificate(value)["evidence_assessment"]["a"]["state"], "rejected_premises")

    def test_strict_schema_containers_intervals_and_cross_scope_conflicts(self):
        mutations = [
            lambda p: p.update(outcomes=[]),
            lambda p: p.update(weights={"cost": 1}),
            lambda p: p.update(candidates=tuple(p["candidates"])),
            lambda p: p["candidates"].append(copy.deepcopy(p["candidates"][0])),
            lambda p: p["scenario"].update(objectives={}),
            lambda p: p["scenario"]["objectives"]["cost"].update(direction="maximize"),
            lambda p: p["scenario"]["objectives"]["cost"].update(unit=""),
            lambda p: p["scenario"]["constraints"].update(cost={"unit": "cost", "reference": "fixture"}),
            lambda p: p["candidates"][0].update(objectives={"cost": [0, 0]}),
            lambda p: p["candidates"][0].update(constraints={}),
            lambda p: p["candidates"][0].update(score=[0, 0]),
            lambda p: p["candidates"][0]["objectives"].update(cost=[1, 0]),
            lambda p: p["candidates"][0]["objectives"].update(cost=[0.1, 1]),
            lambda p: p["candidates"][0]["objectives"].update(cost=[True, 1]),
            lambda p: p["candidates"][0].update(evidence={"unknown": []}),
            lambda p: p["candidates"][0].update(evidence={"cost": ["missing"]}),
            lambda p: p.update(evidence={}),
        ]
        for mutate in mutations:
            value = problem()
            mutate(value)
            with self.subTest(mutation=mutate), self.assertRaises((ValueError, TypeError)):
                parse_pareto_problem(value)
        for wire in ['{"cost":0.1}', '{"cost":NaN}', '{"cost":1,"cost":2}']:
            with self.assertRaises(ValueError):
                loads(wire)

    def test_outcome_binding_and_scope_reject_invalid_truth(self):
        for kind in ("seal", "scenario", "schema", "unknown_candidate", "duplicate", "unknown_objective",
                     "unknown_constraint", "boolean", "float", "container", "extra"):
            value = problem()
            hidden = outcomes(value)
            if kind == "seal": hidden["problem_digest"] = "0" * 64
            elif kind == "scenario": hidden["scenario_id"] += "-changed"
            elif kind == "schema": hidden["schema"] = "lupine.discovery.outcomes.v1"
            elif kind == "unknown_candidate": hidden["outcomes"][0]["id"] = "outside"
            elif kind == "duplicate": hidden["outcomes"].append(hidden["outcomes"][0])
            elif kind == "unknown_objective": hidden["outcomes"][0]["objectives"]["temperature"] = 0
            elif kind == "unknown_constraint": hidden["outcomes"][0]["constraints"]["cost"] = 0
            elif kind == "boolean": hidden["outcomes"][0]["objectives"]["cost"] = True
            elif kind == "float": hidden["outcomes"][0]["objectives"]["cost"] = 0.1
            elif kind == "container": hidden["outcomes"][0]["objectives"] = []
            else: hidden["outcomes"][0]["score"] = 0
            with self.subTest(kind=kind), self.assertRaises((ValueError, TypeError)):
                replay_report(value, hidden)

    def test_exact_rationals_and_tampered_receipts(self):
        value = problem()
        value["candidates"] = value["candidates"][:1]
        value["candidates"][0]["objectives"]["cost"] = ["9007199254740993/9007199254740992"] * 2
        value["candidates"].append(copy.deepcopy(value["candidates"][0]))
        value["candidates"][1]["id"] = "smaller"
        value["candidates"][1]["objectives"]["cost"] = [1, 1]
        result = certificate(value)
        self.assertEqual(result["selection"]["retained"], ["smaller"])
        self.assertEqual(replay_report(value, outcomes(value))["evaluation"]["true_pareto_front"], ["smaller"])
        changed = copy.deepcopy(result)
        changed["selection"]["retained"] = ["a"]
        changed["certificate_digest"] = digest({key: val for key, val in changed.items() if key != "certificate_digest"})
        with self.assertRaises(ValueError): verify_certificate(value, changed)
        value["scenario"]["objectives"]["cost"]["unit"] = "different"
        with self.assertRaises(ValueError): verify_certificate(value, result)

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
            self.assertTrue(json.loads(executed.stdout)["evaluation"]["all_true_pareto_candidates_retained"])


if __name__ == "__main__":
    unittest.main()
