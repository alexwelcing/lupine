"""Adversarial checks at the evidence/JSON/certificate boundary."""
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from lupine_discovery.cli import certificate, main, verify_certificate
from lupine_discovery.evidence import digest
from lupine_discovery.serialization import loads, parse_problem


def problem():
    return {"schema": "lupine.discovery.problem.v1", "scenario": {
        "id": "archive", "objective": {"unit": "arbitrary", "reference": "fixed-reference", "direction": "minimize"},
        "constraints": {}}, "candidates": [{"id": "a", "score": ["0", "2"], "constraints": {}}]}


class AdversarialIntegrationTests(unittest.TestCase):
    def test_nested_duplicate_keys_and_nonexact_numbers_rejected(self):
        for text in ('{"nested":{"x":1,"x":2}}', '{"x":0.1}', '{"x":NaN}', '{"x":Infinity}'):
            with self.subTest(text=text), self.assertRaises(ValueError):
                loads(text)

    def test_outcome_injection_into_problem_is_rejected(self):
        value = problem()
        value["outcomes"] = [{"id": "a", "score": "-100"}]
        with self.assertRaises(ValueError):
            parse_problem(value)

    def test_wrong_reference_evidence_cannot_authorize_links(self):
        value = problem()
        value["evidence"] = [{"id": "e", "kind": "published_measurement", "status": "reported",
            "scope": {"scenario_id": "archive", "quantity": "score", "unit": "arbitrary", "reference": "different-reference"},
            "statement": "reported interval", "source": {"uri": "https://example.invalid/paper"}}]
        value["candidates"][0]["evidence"] = {"score": ["e"]}
        with self.assertRaisesRegex(ValueError, "scope mismatch"):
            parse_problem(value)

    def test_certificate_digest_replacement_does_not_hide_decision_tampering(self):
        value = problem()
        forged = copy.deepcopy(certificate(value))
        forged["selection"]["retained"] = []
        forged["certificate_digest"] = digest({k: v for k, v in forged.items() if k != "certificate_digest"})
        with self.assertRaises(ValueError):
            verify_certificate(value, forged)

    def test_formal_label_and_hash_are_not_physical_attestation(self):
        value = problem()
        value["evidence"] = [{"id": "e", "kind": "formal_derivation", "status": "reported",
            "scope": {"scenario_id": "archive", "quantity": "score", "unit": "arbitrary", "reference": "fixed-reference"},
            "statement": "declared derivation", "source": {"uri": "local:claim", "sha256": "0" * 64}}]
        value["candidates"][0]["evidence"] = {"score": ["e"]}
        cert = certificate(value)
        self.assertEqual(cert["physical_attestation"], "not_established_by_this_program")
        self.assertEqual(cert["evidence_assessment"]["a"]["state"], "linked_evidence_not_physical_attestation")
        self.assertEqual(verify_certificate(value, cert)["scope"], "identity_and_exact_runtime_recomputation_only")

    def test_empty_universe_certificate_has_no_incumbent(self):
        value = problem()
        value["candidates"] = []
        cert = certificate(value)
        self.assertEqual(cert["selection"]["retained"], [])
        self.assertIsNone(cert["selection"]["incumbent"])
        self.assertIsNone(cert["selection"]["regret_bound"])

    def test_zero_denominator_is_cli_validation_error(self):
        value = problem()
        value["candidates"][0]["score"] = ["1/0", "2"]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "problem.json"
            path.write_text(json.dumps(value))
            with patch("sys.stderr", new_callable=io.StringIO):
                self.assertEqual(main(["select", str(path)]), 2)

    def test_replay_digest_identifies_exact_outcomes_evaluated(self):
        value = problem()
        initial = {"schema": "lupine.discovery.outcomes.v1", "scenario_id": "archive",
            "problem_digest": digest(value), "outcomes": [{"id": "a", "score": "1", "constraints": {}}]}
        replacement = copy.deepcopy(initial)
        replacement["outcomes"][0]["score"] = "999"
        reads = []
        def fake_read(path, *args, **kwargs):
            if path.name == "problem.json":
                return json.dumps(value)
            reads.append(path.name)
            return json.dumps(initial if len(reads) == 1 else replacement)
        with patch.object(Path, "read_text", fake_read), patch("sys.stdout", new_callable=io.StringIO) as output:
            self.assertEqual(main(["replay", "problem.json", "outcomes.json"]), 0)
        report = json.loads(output.getvalue())
        self.assertEqual(report["outcomes_digest"], digest(initial))
        self.assertEqual(len(reads), 1)


if __name__ == "__main__":
    unittest.main()
