"""Projection HTTP integration, guarded execution, and answer custody ordering."""
from copy import deepcopy
from http.client import HTTPConnection
import json
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from lupine_discovery import server
from lupine_discovery.benchmarks import get_case, get_case_outcomes
from lupine_discovery.coupled_worker import CoupledWorkerError, guard_available, run_coupled


@unittest.skipUnless(guard_available(), "Linux resource guards required")
class ProjectionServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = server.make_server(0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request(self, path, value):
        request = Request(self.url + path, data=json.dumps(value).encode(),
                          headers={"Content-Type": "application/json"})
        try:
            response = urlopen(request, timeout=15)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read())

    def problem(self, case_id="projection-shared-field"):
        return get_case(case_id)["problem"]

    def test_three_builtin_projection_cases_round_trip_original_wrapper(self):
        for case_id, retained in (("projection-shared-field", ["B"]),
                                  ("projection-missing-bound", ["A", "B"]),
                                  ("projection-tie", ["A", "B"])):
            with self.subTest(case_id=case_id):
                problem = self.problem(case_id)
                raw = json.dumps(problem)
                status, receipt = self.request("/api/select", {"problem_raw": raw})
                self.assertEqual(status, 200, receipt)
                self.assertEqual(receipt["selection"]["retained"], retained)
                status, verified = self.request("/api/verify", {"problem_raw": raw,
                    "certificate_raw": json.dumps(receipt)})
                self.assertEqual(status, 200, verified)
                self.assertTrue(verified["verified"])
                self.assertEqual(verified["certificate_digest"], receipt["certificate_digest"])
                status, report = self.request(f"/api/cases/{case_id}/replay", {"problem_raw": raw})
                self.assertEqual(status, 200, report)
                self.assertEqual(report["decision"]["certificate"], receipt)
                self.assertTrue(report["outcome_audit"]["all_true_minimizers_retained"])
                if case_id == "projection-missing-bound":
                    self.assertIsNone(receipt["prepared_problem"])
                    self.assertEqual(report["provided_world_audit"]["status"], "unavailable_no_prepared_model")

    def test_builtin_selection_seals_before_answer_resource_is_opened(self):
        problem = self.problem()
        events = []
        def guarded(operation, *args, **kwargs):
            result = run_coupled(operation, *args, **kwargs)
            events.append(operation + "_completed")
            return result
        def open_answers(case_id, original):
            self.assertEqual(events, ["select_completed"])
            self.assertEqual(original, problem)
            events.append("answers_opened")
            return get_case_outcomes(case_id, original)
        with patch.object(server, "run_coupled", side_effect=guarded), \
             patch.object(server, "get_case_outcomes", side_effect=open_answers):
            status, report = self.request("/api/cases/projection-shared-field/replay",
                                           {"problem_raw": json.dumps(problem)})
        self.assertEqual(status, 200, report)
        self.assertEqual(events, ["select_completed", "answers_opened", "replay_completed"])

    def test_builtin_failure_never_opens_answers_or_returns_previous_selection(self):
        for code in ("guard_unavailable", "worker_timeout", "worker_output_limit"):
            with self.subTest(code=code), \
                 patch.object(server, "run_coupled", side_effect=CoupledWorkerError(code, "synthetic guard failure")), \
                 patch.object(server, "get_case_outcomes") as open_answers:
                status, report = self.request("/api/cases/projection-shared-field/replay",
                                               {"problem_raw": json.dumps(self.problem())})
                self.assertEqual(status, 503)
                self.assertEqual(set(report), {"error"})
                self.assertFalse(report["error"]["decision_receipt_available"])
                open_answers.assert_not_called()

    def test_nested_selection_stays_guarded_and_nested_custom_replay_is_rejected(self):
        problem = self.problem()
        with patch.object(server, "certificate", side_effect=AssertionError("parent selection")), \
             patch.object(server, "run_coupled", wraps=run_coupled) as guarded:
            status, result = self.request("/api/select", {"problem": problem})
        self.assertEqual(status, 200, result)
        self.assertEqual(result["selection"]["retained"], ["B"])
        self.assertEqual(guarded.call_args.args[0], "select")
        with patch.object(server, "replay_report", side_effect=AssertionError("parent replay")):
            status, result = self.request("/api/replay", {"problem": problem,
                "outcomes": get_case_outcomes("projection-shared-field", problem)})
        self.assertEqual(status, 400)
        self.assertEqual(result["error"]["code"], "raw_outcomes_required")
        self.assertFalse(result["error"]["decision_receipt_available"])

    def test_direct_truth_reports_lost_optimum_despite_marginal_coverage(self):
        problem = self.problem()
        truth = get_case_outcomes("projection-shared-field", problem)
        for row in truth["outcomes"]:
            row["score"] = "3" if row["id"] == "A" else "4"
        status, report = self.request("/api/replay", {"problem_raw": json.dumps(problem),
                                                       "outcomes_raw": json.dumps(truth)})
        self.assertEqual(status, 200, report)
        self.assertEqual(report["decision"]["selection"]["retained"], ["B"])
        self.assertFalse(report["outcome_audit"]["all_true_minimizers_retained"])
        self.assertEqual(report["outcome_audit"]["lost_optimum_ids"], ["A"])
        self.assertEqual(report["diagnostics"]["marginal_coverage"]["score_coverage"]["rate"], "1")
        self.assertEqual(report["provided_world_audit"]["status"], "provided_point_mismatch")

    def test_metadata_edit_breaks_export_verification_even_when_kernel_is_unchanged(self):
        problem = self.problem()
        status, receipt = self.request("/api/select", {"problem_raw": json.dumps(problem)})
        self.assertEqual(status, 200)
        changed = deepcopy(problem)
        changed["projection"]["sources"][0]["source_uri"] += ":changed"
        status, report = self.request("/api/verify", {"problem_raw": json.dumps(changed),
                                                     "certificate_raw": json.dumps(receipt)})
        self.assertEqual(status, 400)
        self.assertFalse(report["error"]["decision_receipt_available"])
        self.assertNotIn("verified", report)

    def test_verify_envelope_can_carry_full_receipt_cap_without_raising_other_route_caps(self):
        raw = json.dumps(self.problem())
        status, receipt = self.request("/api/select", {"problem_raw": raw})
        self.assertEqual(status, 200)
        # A valid receipt padded with JSON whitespace nearly fills its own cap;
        # the HTTP envelope additionally contains the original problem.
        text = json.dumps(receipt)
        text = " " * (server.MAX_CERTIFICATE_BYTES - len(text) - 1) + text
        self.assertGreater(len(json.dumps({"problem_raw": raw, "certificate_raw": text})), server.MAX_BODY_BYTES)
        status, result = self.request("/api/verify", {"problem_raw": raw, "certificate_raw": text})
        self.assertEqual(status, 200, result)
        self.assertTrue(result["verified"])
        connection = HTTPConnection("127.0.0.1", self.server.server_address[1], timeout=15)
        try:
            # Oversize Content-Length is refused without waiting for its body.
            connection.putrequest("POST", "/api/select")
            connection.putheader("Content-Type", "application/json")
            connection.putheader("Content-Length", str(server.MAX_BODY_BYTES + 1))
            connection.endheaders()
            response = connection.getresponse()
            self.assertEqual(response.status, 413)
            response.read()
        finally:
            connection.close()

    def test_invalid_projection_and_proof_upload_do_not_open_builtin_answers(self):
        problem = self.problem()
        problem["screening"]["proofs"] = [{"kind": "invented"}]
        with patch.object(server, "get_case_outcomes") as answers:
            status, report = self.request("/api/cases/projection-shared-field/replay",
                                           {"problem_raw": json.dumps(problem)})
        self.assertEqual(status, 400)
        self.assertFalse(report["error"]["decision_receipt_available"])
        answers.assert_not_called()
        status, report = self.request("/api/coupled-domains", {"problem_raw": json.dumps(self.problem())})
        self.assertEqual(status, 400)
        self.assertFalse(report["error"]["decision_receipt_available"])


if __name__ == "__main__":
    unittest.main()
