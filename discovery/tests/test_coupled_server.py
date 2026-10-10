"""HTTP coupled boundaries and synthetic replay controls under the hard worker."""
from copy import deepcopy
from importlib.resources import files
import json
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from lupine_discovery.benchmarks import case_catalog, get_case, get_case_outcomes
from lupine_discovery.cli import verify_certificate
from lupine_discovery.coupled_worker import CoupledWorkerError, guard_available, run_coupled
from lupine_discovery.server import make_server


@unittest.skipUnless(guard_available(), "Linux resource guards required")
class CoupledServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = make_server(0)
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

    def problem(self, case_id="coupled-shared-trend"):
        return get_case(case_id)["problem"]

    def select(self, problem):
        return self.request("/api/select", {"problem_raw": json.dumps(problem)})

    def replay(self, problem, outcomes):
        return self.request("/api/replay", {"problem_raw": json.dumps(problem),
                                             "outcomes_raw": json.dumps(outcomes)})

    def test_demo_seals_actual_pool_and_replay_are_reproducible(self):
        expected = [("coupled-shared-trend", "conditional_screened", ["B"]),
                    ("coupled-missing-point", "consistency_unresolved_all_retained", ["A", "B"]),
                    ("coupled-learned-relation", "unsupported_all_retained", ["A", "B"])]
        self.assertEqual(len(case_catalog()), 25)
        for case_id, state, retained in expected:
            with self.subTest(case_id=case_id):
                problem = self.problem(case_id)
                status, receipt = self.select(problem)
                self.assertEqual(status, 200)
                self.assertEqual(receipt["coupling"]["status"], state)
                self.assertEqual(receipt["selection"]["retained"], retained)
                self.assertTrue(verify_certificate(problem, receipt)["verified"])
                archived = json.loads(files("lupine_discovery").joinpath(
                    "resources/certificates", case_id + ".json").read_text())
                self.assertEqual(receipt, archived)
                self.assertNotIn("regret_bound", receipt["selection"])
                self.assertNotIn("incumbent", receipt["selection"])
                status, replay = self.request("/api/cases/" + case_id + "/replay",
                                               {"problem_raw": json.dumps(problem)})
                self.assertEqual(status, 200)
                self.assertEqual(replay["decision"]["certificate"], receipt)
                self.assertEqual(replay["decision"]["selection"]["retained"], retained)
                self.assertTrue(replay["outcome_audit"]["all_true_minimizers_retained"])
                if case_id != "coupled-shared-trend":
                    self.assertEqual(receipt["diagnostics"]["box_selection_diagnostic"]["retained"], ["B"])
                    for key in ("certified_feasible", "interval_infeasible", "interval_dominated",
                                "coupled_infeasible", "coupled_dominated"):
                        self.assertEqual(receipt["selection"][key], [])

    def test_false_common_world_loses_optimum_despite_full_marginal_coverage(self):
        problem = self.problem()
        truth = get_case_outcomes("coupled-shared-trend", problem)
        truth["outcomes"][1]["score"] = "2"
        status, report = self.replay(problem, truth)
        self.assertEqual(status, 200)
        self.assertEqual(report["decision"]["selection"]["retained"], ["B"])
        self.assertFalse(report["outcome_audit"]["all_true_minimizers_retained"])
        self.assertEqual(report["outcome_audit"]["true_minimizer_ids"], ["A"])
        self.assertEqual(report["outcome_audit"]["lost_optimum_ids"], ["A"])
        self.assertEqual(report["diagnostics"]["marginal_coverage"]["score_coverage"],
                         {"covered": 2, "checked": 2, "rate": "1"})
        self.assertEqual(report["provided_world_audit"]["status"], "provided_point_mismatch")
        self.assertEqual(report["provided_world_audit"]["scientific_validity"], "unestablished")

    def test_outcome_world_does_not_repair_missing_consistency_point(self):
        problem = self.problem("coupled-missing-point")
        status, report = self.replay(problem, get_case_outcomes("coupled-missing-point", problem))
        self.assertEqual(status, 200)
        self.assertEqual(report["provided_world_audit"]["status"], "provided_point_matches_reported_values")
        self.assertEqual(report["decision"]["selection"]["retained"], ["A", "B"])
        self.assertEqual(report["decision"]["certificate"]["coupling"]["status"],
                         "consistency_unresolved_all_retained")

    def test_legacy_object_selection_is_guarded_and_nested_replay_is_rejected(self):
        problem = self.problem()
        with patch("lupine_discovery.server.certificate", side_effect=AssertionError("unguarded selection")), \
             patch("lupine_discovery.server.run_coupled", wraps=run_coupled) as guarded:
            status, selected = self.request("/api/select", {"problem": problem})
        self.assertEqual(status, 200)
        self.assertEqual(selected["selection"]["retained"], ["B"])
        self.assertEqual(guarded.call_args.args[0], "select")
        with patch("lupine_discovery.server.replay_report", side_effect=AssertionError("unguarded replay")):
            status, result = self.request("/api/replay", {"problem": problem,
                "outcomes": get_case_outcomes("coupled-shared-trend", problem)})
        self.assertEqual(status, 400)
        self.assertEqual(result["error"]["code"], "raw_outcomes_required")
        self.assertFalse(result["error"]["decision_receipt_available"])

    def test_builtin_answers_open_only_after_guarded_selection(self):
        problem = self.problem()
        events = []
        def guarded(operation, *args):
            result = run_coupled(operation, *args)
            events.append(operation)
            return result
        def reveal(case_id, value):
            self.assertEqual(events, ["select"])
            events.append("answers_opened")
            return get_case_outcomes(case_id, value)
        with patch("lupine_discovery.server.run_coupled", side_effect=guarded), \
             patch("lupine_discovery.server.get_case_outcomes", side_effect=reveal):
            status, _ = self.request("/api/cases/coupled-shared-trend/replay",
                                     {"problem_raw": json.dumps(problem)})
        self.assertEqual(status, 200)
        self.assertEqual(events, ["select", "answers_opened", "replay"])

    def test_guard_failure_never_opens_answers_or_returns_stale_receipt(self):
        problem = self.problem()
        self.assertEqual(self.select(problem)[0], 200)
        with patch("lupine_discovery.server.run_coupled",
                   side_effect=CoupledWorkerError("guard_unavailable", "Synthetic unavailable guard")), \
             patch("lupine_discovery.server.get_case_outcomes", side_effect=AssertionError("truth opened")):
            status, result = self.request("/api/cases/coupled-shared-trend/replay",
                                         {"problem_raw": json.dumps(problem)})
        self.assertEqual(status, 503)
        self.assertEqual(set(result), {"error"})
        self.assertFalse(result["error"]["decision_receipt_available"])

    def test_raw_document_preserves_duplicate_rejection_and_limits(self):
        raw = json.dumps(self.problem())
        for changed in ('{"schema":"duplicate",' + raw[1:], raw + " " * (256 * 1024)):
            with self.subTest(length=len(changed)):
                status, result = self.request("/api/select", {"problem_raw": changed})
                self.assertIn(status, (400, 413))
                self.assertFalse(result["error"]["decision_receipt_available"])
                self.assertEqual(set(result), {"error"})
        status, result = self.request("/api/select", {"problem_raw": {"schema": "not text"}})
        self.assertEqual(status, 400)
        self.assertFalse(result["error"]["decision_receipt_available"])

    def test_changed_proof_or_outcome_seal_is_rejected(self):
        original = self.problem()
        changed = deepcopy(original)
        changed["screening"]["proofs"][0]["id"] = "different-local-proof-id"
        status, _ = self.request("/api/cases/coupled-shared-trend/replay",
                                 {"problem_raw": json.dumps(changed)})
        self.assertEqual(status, 400)
        outcomes = get_case_outcomes("coupled-shared-trend", original)
        outcomes["certificate_digest"] = "0" * 64
        status, result = self.replay(original, outcomes)
        self.assertEqual(status, 400)
        self.assertFalse(result["error"]["decision_receipt_available"])

    def test_partial_truth_cannot_establish_complete_optimum_retention(self):
        problem = self.problem()
        truth = get_case_outcomes("coupled-shared-trend", problem)
        truth["outcomes"][0]["score"] = None
        status, report = self.replay(problem, truth)
        self.assertEqual(status, 200)
        self.assertEqual(report["outcome_audit"]["outcome_completeness"], "partial")
        self.assertIsNone(report["outcome_audit"]["all_true_minimizers_retained"])
        self.assertIsNone(report["outcome_audit"]["true_minimizer_ids"])

    def test_domains_use_guard_and_unchanged_model_identity(self):
        problem = self.problem()
        status, manifest = self.request("/api/coupled-domains", {"problem_raw": json.dumps(problem)})
        self.assertEqual(status, 200)
        _, selected = self.select(problem)
        self.assertEqual(manifest["problem_digest"], selected["problem_digest"])
        self.assertEqual(manifest["instance_digest"], selected["model_identity"]["instance_digest"])
        self.assertEqual(set(manifest["candidate_domains"]), {"A", "B"})

    def test_outer_request_nesting_is_bounded_before_decoder(self):
        value = {}
        for _ in range(34):
            value = {"nested": value}
        status, result = self.request("/api/select", {"problem": value})
        self.assertEqual(status, 400)
        self.assertIn("nesting limit", result["error"]["message"])
