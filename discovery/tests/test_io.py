import copy
from fractions import Fraction
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from lupine_discovery.cli import certificate, verify_certificate
from lupine_discovery.evidence import Evidence, digest
from lupine_discovery.serialization import loads, parse_problem, parse_outcomes


def problem():
    return {"schema": "lupine.discovery.problem.v1",
            "scenario": {"id": "abstract-v1", "objective": {"unit": "utility", "reference": "fixture",
                          "direction": "minimize"}, "constraints": {"budget": {"unit": "cost", "reference": "fixture"}}},
            "candidates": [{"id": "a", "score": ["1", "2"], "constraints": {"budget": ["-2", "-1"]}},
                           {"id": "b", "score": ["3", "4"], "constraints": {"budget": ["-1", "1"]}},
                           {"id": "c", "score": ["0", "1"], "constraints": {"budget": ["1", "2"]}}]}


def evidence(scope, eid="e"):
    return {"id": eid, "kind": "published_measurement", "status": "reported", "scope": scope,
            "statement": "A declared source; linkage is not physical attestation.",
            "source": {"uri": "https://example.org/fixture"}}


class IOTests(unittest.TestCase):
    def test_explanation_and_tamper_evidence(self):
        p = problem()
        c = certificate(p)
        self.assertEqual(c["selection"]["retained"], ["a"])
        self.assertEqual(c["reasons"]["b"]["witness"], "a")
        self.assertEqual(c["reasons"]["c"]["constraints"], ["budget"])
        self.assertEqual(c["physical_attestation"], "not_established_by_this_program")
        self.assertTrue(verify_certificate(p, c)["verified"])
        c["selection"]["retained"] = ["b"]
        with self.assertRaises(ValueError):
            verify_certificate(p, c)

    def test_problem_identity_and_stability(self):
        p = problem()
        c = certificate(p)
        self.assertEqual(c, certificate(json.loads(json.dumps(p))))
        p["scenario"]["objective"]["unit"] = "different-unit"
        with self.assertRaises(ValueError):
            verify_certificate(p, c)

    def test_no_silent_float_duplicate_or_hidden_outcome(self):
        for text in ['{"n":0.1}', '{"n":NaN}', '{"x":1,"x":2}', '{"n":Infinity}']:
            with self.assertRaises(ValueError):
                loads(text)
        self.assertEqual(loads('{"n":"0.1"}')["n"], "0.1")
        p = problem()
        p["outcomes"] = []
        with self.assertRaises(ValueError):
            parse_problem(p)

    def test_missing_and_rejected_evidence_not_promoted(self):
        p = problem()
        self.assertEqual(certificate(p)["evidence_assessment"]["a"]["state"], "missing_premises")
        scope = {"scenario_id": "abstract-v1", "quantity": "score", "unit": "utility", "reference": "fixture"}
        record = evidence(scope)
        record["status"] = "rejected"
        p["evidence"] = [record]
        p["candidates"][0]["evidence"] = {"score": ["e"]}
        self.assertEqual(certificate(p)["evidence_assessment"]["a"]["state"], "rejected_premises")
        self.assertEqual(certificate(p)["physical_attestation"], "not_established_by_this_program")

    def test_scope_mismatch_and_broken_links(self):
        p = problem()
        scope = {"scenario_id": "abstract-v1", "quantity": "score", "unit": "utility", "reference": "fixture"}
        p["evidence"] = [evidence(scope)]
        p["candidates"][0]["evidence"] = {"score": ["e"]}
        parse_problem(p)
        for key in scope:
            changed = copy.deepcopy(p)
            changed["evidence"][0]["scope"][key] += "-mismatch"
            with self.assertRaises(ValueError):
                parse_problem(changed)
        p["candidates"][0]["evidence"] = {"score": ["nonexistent"]}
        with self.assertRaises(ValueError):
            parse_problem(p)

    def test_source_hash_is_identity_only(self):
        from hashlib import sha256
        record = evidence({"scenario_id": "x", "quantity": "score", "unit": "u", "reference": "r"})
        record["source"]["sha256"] = sha256(b"false scientific assertion").hexdigest()
        e = Evidence.from_dict(record)
        self.assertTrue(e.verify_source_bytes(b"false scientific assertion"))
        self.assertFalse(e.verify_source_bytes(b"different"))
        self.assertEqual(e.status, "reported")

    def test_outcomes_bind_to_sealed_input(self):
        p = problem()
        truth = {"schema": "lupine.discovery.outcomes.v1", "scenario_id": "abstract-v1",
                 "problem_digest": digest(p), "outcomes": [{"id": "a", "score": "3/2", "constraints": {}}]}
        self.assertEqual(parse_outcomes(truth, "abstract-v1", digest(p))[0].score, Fraction(3, 2))
        truth["problem_digest"] = "0" * 64
        with self.assertRaises(ValueError):
            parse_outcomes(truth, "abstract-v1", digest(p))

    def test_cli_round_trip_and_replay(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            p = problem()
            (base / "problem.json").write_text(json.dumps(p))
            command = [sys.executable, "-m", "lupine_discovery"]
            selected = subprocess.run(command + ["select", str(base / "problem.json"), "--output", str(base / "cert.json")], capture_output=True, text=True)
            self.assertEqual(selected.returncode, 0, selected.stderr)
            verified = subprocess.run(command + ["verify", str(base / "problem.json"), str(base / "cert.json")], capture_output=True, text=True)
            self.assertEqual(verified.returncode, 0, verified.stderr)
            self.assertTrue(json.loads(verified.stdout)["verified"])
            truth = {"schema": "lupine.discovery.outcomes.v1", "scenario_id": "abstract-v1",
                     "problem_digest": digest(p), "outcomes": [{"id": "a", "score": "3/2", "constraints": {"budget": "-1"}}]}
            (base / "truth.json").write_text(json.dumps(truth))
            replay = subprocess.run(command + ["replay", str(base / "problem.json"), str(base / "truth.json")], capture_output=True, text=True)
            self.assertEqual(replay.returncode, 0, replay.stderr)
            result = json.loads(replay.stdout)["evaluation"]
            self.assertEqual(result["outcome_completeness"], "partial")
            self.assertIsNone(result["all_true_minimizers_retained"])
