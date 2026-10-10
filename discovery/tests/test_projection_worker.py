"""Projection wire operations use the existing isolated worker and transport seals.

The packaged inputs are constructed algebra examples, not physical measurements.
"""
from copy import deepcopy
import io
import json
import unittest
from unittest.mock import patch

from lupine_discovery import coupled_worker as worker
from lupine_discovery import projection_io
from lupine_discovery.benchmarks import get_case, get_case_outcomes
from lupine_discovery.evidence import digest


def reseal(value, key="certificate_digest"):
    value[key] = digest({k: v for k, v in value.items() if k != key})
    return value


def envelope(value):
    return json.dumps({"schema": worker.TRANSPORT_SCHEMA, "ok": True, "result": value}).encode()


@unittest.skipUnless(worker.guard_available(), "Linux resource guards required")
class ProjectionWorkerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.problem = get_case("projection-shared-field")["problem"]
        cls.raw = json.dumps(cls.problem)
        cls.receipt = worker.run_coupled("select", cls.raw)

    def assert_failure(self, function, expected=None):
        with self.assertRaises(worker.CoupledWorkerError) as caught:
            function()
        error = caught.exception
        if expected is not None:
            self.assertEqual(error.code, expected)
        self.assertEqual(set(error.payload()), {"error"})
        self.assertFalse(error.payload()["error"]["decision_receipt_available"])
        self.assertTrue(worker._SLOT.acquire(blocking=False))
        worker._SLOT.release()

    def test_real_child_preserves_original_relation_and_nested_seals(self):
        result = self.receipt
        self.assertEqual(result, projection_io.projection_certificate(self.problem))
        self.assertEqual(result["selection"]["retained"], ["B"])
        relation = result["projection"]["relation_record"]
        self.assertEqual(result["projection"]["input_digest"], digest(relation["declarations"]))
        self.assertEqual(result["projection"]["relation_digest"], digest(relation))
        self.assertEqual(result["coupled_certificate"]["problem_digest"], digest(result["prepared_problem"]))
        self.assertEqual(result["physical_attestation"], "not_established_by_this_program")

    def test_real_verify_recomputes_wrapper_and_accepts_receipt_booleans(self):
        verified = worker.run_coupled("verify", self.raw, raw_certificate=json.dumps(self.receipt))
        self.assertIs(verified["verified"], True)
        self.assertEqual(verified["certificate_digest"], self.receipt["certificate_digest"])
        changed = deepcopy(self.problem)
        changed["projection"]["sources"][0]["reference"] += " changed declaration"
        self.assert_failure(lambda: worker.run_coupled("verify", json.dumps(changed),
                            raw_certificate=json.dumps(self.receipt)), "invalid_input")

    def test_large_export_verification_has_separate_bounded_receipt_cap(self):
        # Whitespace changes bytes but not the identity of a valid JSON receipt.
        large = " " * worker.MAX_DOCUMENT_BYTES + json.dumps(self.receipt)
        self.assertGreater(len(large), worker.MAX_DOCUMENT_BYTES)
        self.assertTrue(worker.run_coupled("verify", self.raw, raw_certificate=large)["verified"])
        with patch.object(worker, "_bounded_process") as process:
            self.assert_failure(lambda: worker.run_coupled("verify", self.raw,
                raw_certificate=" " * (worker.MAX_CERTIFICATE_BYTES + 1)), "input_limit")
            process.assert_not_called()

    def test_projection_and_verification_share_existing_busy_slot(self):
        worker._SLOT.acquire()
        try:
            for operation, arguments in (("select", {}), ("verify", {"raw_certificate": json.dumps(self.receipt)})):
                with self.subTest(operation=operation), self.assertRaises(worker.CoupledWorkerError) as caught:
                    worker.run_coupled(operation, self.raw, **arguments)
                self.assertEqual((caught.exception.code, caught.exception.http_status), ("worker_busy", 429))
        finally:
            worker._SLOT.release()

    def test_compact_large_tied_universe_export_verifies_under_hard_guards(self):
        problem = deepcopy(self.problem)
        # Remove the anchor dimension to isolate output growth from repeated
        # candidate comparisons; all 64 candidates use the same exact score.
        problem["projection"]["anchors"] = []
        problem["projection"]["observations"] = problem["projection"]["observations"][:2]
        problem["screening"]["consistency_point"] = ["0"] * 3
        row = problem["projection"]["candidates"][0]
        problem["projection"]["candidates"] = [dict(deepcopy(row), candidate_id=f"{i:02d}" + "x" * 38)
                                                for i in range(64)]
        raw = json.dumps(problem)
        receipt = worker.run_coupled("select", raw)
        compact = json.dumps(receipt, separators=(",", ":"))
        self.assertEqual(len(receipt["selection"]["retained"]), 64)
        self.assertLess(len(compact), worker.MAX_CERTIFICATE_BYTES)
        self.assertGreater(len(json.dumps(receipt, indent=2)), worker.MAX_CERTIFICATE_BYTES)
        result = worker.run_coupled("verify", raw, raw_certificate=compact)
        self.assertTrue(result["verified"])
        self.assertEqual(result["certificate_digest"], receipt["certificate_digest"])

    def test_parent_adapter_is_never_called_for_selection_or_verification(self):
        with patch.object(projection_io, "build_projection", side_effect=AssertionError("parent built model")), \
             patch.object(projection_io, "projection_certificate", side_effect=AssertionError("parent selection")):
            result = worker.run_coupled("select", self.raw)
            verified = worker.run_coupled("verify", self.raw, raw_certificate=json.dumps(result))
        self.assertEqual(result, self.receipt)
        self.assertTrue(verified["verified"])

    def test_projection_framing_defers_outcome_bytes_until_selection_seal(self):
        outcomes = b'{"outcome_marker":"synthetic"}'
        frame = worker._frame("replay", self.raw, outcomes)
        offset = frame.index(b"\n") + 1 + len(self.raw.encode())
        events = []
        class GuardedStream(io.BytesIO):
            def read(self, size=-1):
                if self.tell() >= offset and "sealed" not in events:
                    raise AssertionError("outcomes read before projection selection seal")
                return super().read(size)
        def replay(problem, loader):
            self.assertEqual(problem, self.problem)
            events.append("sealed")
            self.assertEqual(loader(), {"outcome_marker": "synthetic"})
            events.append("outcomes_loaded")
            return "done"
        with patch.object(projection_io, "projection_replay_report", side_effect=replay):
            self.assertEqual(worker._dispatch(GuardedStream(frame)), "done")
        self.assertEqual(events, ["sealed", "outcomes_loaded"])

    def test_real_replay_keeps_missing_model_unavailable_and_ties_retained(self):
        for case_id, retained in (("projection-missing-bound", ["A", "B"]), ("projection-tie", ["A", "B"])):
            with self.subTest(case_id=case_id):
                problem = get_case(case_id)["problem"]
                report = worker.run_coupled("replay", json.dumps(problem),
                    json.dumps(get_case_outcomes(case_id, problem)))
                certificate = report["decision"]["certificate"]
                self.assertEqual(report["decision"]["selection"]["retained"], retained)
                self.assertTrue(report["outcome_audit"]["all_true_minimizers_retained"])
                self.assertEqual(report["replay_digest"], digest({k: v for k, v in report.items() if k != "replay_digest"}))
                if case_id == "projection-missing-bound":
                    self.assertIsNone(certificate["prepared_problem"])
                    self.assertIsNone(certificate["coupled_certificate"])
                    self.assertEqual(report["provided_world_audit"]["status"], "unavailable_no_prepared_model")
                    self.assertIsNone(report["diagnostics"]["box_selection_diagnostic"])
                else:
                    self.assertEqual(report["outcome_audit"]["true_minimizer_ids"], ["A", "B"])

    def test_malformed_child_nested_shapes_and_stale_seals_never_become_receipts(self):
        cases = []
        for field in ("candidates", "common_world"):
            value = deepcopy(self.receipt)
            value["prepared_problem"][field] = None
            cases.append(reseal(value))
        value = deepcopy(self.receipt)
        value["coupled_certificate"]["selection"]["retained"] = ["A"]
        cases.append(reseal(value))
        value = deepcopy(self.receipt)
        value["projection"]["relation_record"]["declarations"]["relation_reference"] = "resealed new source"
        value["projection"]["relation_digest"] = digest(value["projection"]["relation_record"])
        cases.append(reseal(value))
        for value in cases:
            with self.subTest(prepared=value.get("prepared_problem")), \
                 patch.object(worker, "_bounded_process", return_value=(0, envelope(value))):
                self.assert_failure(lambda: worker.run_coupled("select", self.raw), "worker_invalid_response")

    def test_no_model_cannot_smuggle_a_reduced_pool_in_a_resealed_child_result(self):
        problem = get_case("projection-missing-bound")["problem"]
        result = worker.run_coupled("select", json.dumps(problem))
        result["selection"]["retained"] = ["B"]
        reseal(result)
        with patch.object(worker, "_bounded_process", return_value=(0, envelope(result))):
            self.assert_failure(lambda: worker.run_coupled("select", json.dumps(problem)), "worker_invalid_response")

    def test_replay_seal_and_boolean_verification_are_checked(self):
        report = worker.run_coupled("replay", self.raw,
            json.dumps(get_case_outcomes("projection-shared-field", self.problem)))
        report["outcome_audit"]["all_true_minimizers_retained"] = False
        with patch.object(worker, "_bounded_process", return_value=(0, envelope(report))):
            self.assert_failure(lambda: worker.run_coupled("replay", self.raw, "{}"), "worker_invalid_response")
        verified = worker.run_coupled("verify", self.raw, raw_certificate=json.dumps(self.receipt))
        verified["verified"] = 1
        with patch.object(worker, "_bounded_process", return_value=(0, envelope(verified))):
            self.assert_failure(lambda: worker.run_coupled("verify", self.raw,
                raw_certificate=json.dumps(self.receipt)), "worker_invalid_response")

    def test_unsupported_schema_domains_and_supplied_proofs_fail_closed(self):
        changed = deepcopy(self.problem)
        changed["screening"]["proofs"] = [{"kind": "invented"}]
        for operation, raw in (("select", '{"schema":"unknown"}'), ("domains", self.raw),
                               ("select", json.dumps(changed))):
            with self.subTest(operation=operation):
                self.assert_failure(lambda: worker.run_coupled(operation, raw), "invalid_input")


if __name__ == "__main__":
    unittest.main()
