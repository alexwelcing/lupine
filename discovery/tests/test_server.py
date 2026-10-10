"""Exercise the real HTTP boundary, including separation of hidden outcomes."""
import copy
import json
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from lupine_discovery.cli import certificate
from lupine_discovery.evidence import digest
from lupine_discovery.server import make_server


def fixture():
    return {"schema": "lupine.discovery.problem.v1",
            "scenario": {"id": "http-fixture", "objective": {
                "unit": "score", "reference": "synthetic", "direction": "minimize"}, "constraints": {}},
            "candidates": [{"id": "a", "score": [0, 1], "constraints": {}},
                           {"id": "b", "score": [2, 3], "constraints": {}}]}


class ServerTests(unittest.TestCase):
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

    def request(self, path, value=None, raw=None, headers=None):
        data = raw if raw is not None else json.dumps(value).encode() if value is not None else None
        request = Request(self.url + path, data=data,
                          headers={"Content-Type": "application/json", **(headers or {})})
        try:
            response = urlopen(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            payload = response.read()
            decoded = json.loads(payload) if "application/json" in response.headers.get_content_type() else payload
            return response.status, decoded, response.headers

    def test_selection_matches_cli_and_does_not_need_truth(self):
        problem = fixture()
        status, result, _ = self.request("/api/select", {"problem": problem})
        self.assertEqual(status, 200)
        self.assertEqual(result, certificate(problem))
        self.assertEqual(result["selection"]["retained"], ["a"])

    def test_replay_binds_outcomes_to_exact_problem(self):
        problem = fixture()
        outcomes = {"schema": "lupine.discovery.outcomes.v1", "scenario_id": "http-fixture",
                    "problem_digest": digest(problem), "outcomes": [
                        {"id": "a", "score": "1/2", "constraints": {}},
                        {"id": "b", "score": "5/2", "constraints": {}}]}
        status, report, _ = self.request("/api/replay", {"problem": problem, "outcomes": outcomes})
        self.assertEqual(status, 200)
        self.assertTrue(report["evaluation"]["all_true_minimizers_retained"])
        outcomes["problem_digest"] = "0" * 64
        self.assertEqual(self.request("/api/replay", {"problem": problem, "outcomes": outcomes})[0], 400)

    def test_case_get_never_exposes_outcomes_and_edited_case_cannot_reveal(self):
        status, catalog, _ = self.request("/api/catalog")
        self.assertEqual(status, 200)
        cid = next(c["id"] for c in catalog["cases"] if c["has_outcomes"])
        status, case, _ = self.request("/api/cases/" + cid)
        self.assertEqual(status, 200)
        self.assertNotIn("outcomes", case)
        self.assertNotIn("outcomes", case["problem"])
        path = "/api/cases/" + cid + "/replay"
        self.assertEqual(self.request(path, {"problem": case["problem"]})[0], 200)
        edited = copy.deepcopy(case["problem"])
        edited["description"] = "Edited after selection"
        self.assertEqual(self.request(path, {"problem": edited})[0], 400)

    def test_strict_wire_json_duplicate_and_float_rejected(self):
        for raw in (b'{"problem":{},"problem":{}}', b'{"problem":{"x":0.1}}', b'{bad'):
            self.assertEqual(self.request("/api/select", raw=raw)[0], 400)
        contaminated = fixture()
        contaminated["outcomes"] = []
        self.assertEqual(self.request("/api/select", {"problem": contaminated})[0], 400)

    def test_builtin_selection_precedes_answer_resource_read(self):
        from lupine_discovery.benchmarks import get_case, get_case_outcomes
        problem = get_case("tied-optima")["problem"]
        calls = []
        def select_first(value):
            result = certificate(value)
            calls.append("selected")
            return result
        def reveal(case_id, value):
            self.assertEqual(calls, ["selected"])
            calls.append("revealed")
            return get_case_outcomes(case_id, value)
        with patch("lupine_discovery.server.certificate", side_effect=select_first), \
             patch("lupine_discovery.server.get_case_outcomes", side_effect=reveal):
            self.assertEqual(self.request("/api/cases/tied-optima/replay", {"problem": problem})[0], 200)
        self.assertEqual(calls, ["selected", "revealed"])

    def test_benchmark_endpoint_executes_suite_and_keeps_archive_failures(self):
        status, report, _ = self.request("/api/benchmarks")
        self.assertEqual(status, 200)
        self.assertEqual(report["known_answers"]["summary"]["failed"], 0)
        self.assertGreater(report["known_answers"]["summary"]["total"], 1)
        self.assertEqual(report["release_status"], "research_preview_not_release_certified")
        self.assertFalse(all(t["test_simultaneous_coverage"] for t in report["archived"]["tasks"]))

    def test_foreign_origin_host_and_path_escape_rejected(self):
        self.assertEqual(self.request("/api/health", headers={"Host": "untrusted.example"})[0], 403)
        self.assertEqual(self.request("/api/select", {"problem": fixture()},
                                      headers={"Origin": "https://untrusted.example"})[0], 403)
        self.assertEqual(self.request("/../pyproject.toml")[0], 404)
        self.assertEqual(self.request("/api/cases/missing")[0], 404)

    def test_input_limits_and_media_type_are_explicit(self):
        self.assertEqual(self.request("/api/select", raw=b"{}", headers={"Content-Type": "text/plain"})[0], 415)
        problem = fixture()
        problem["candidates"] = problem["candidates"][:1] * 5001
        self.assertEqual(self.request("/api/select", {"problem": problem})[0], 400)
        status, _, headers = self.request("/api/health")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertIn("frame-ancestors 'none'", headers["Content-Security-Policy"])


if __name__ == "__main__":
    unittest.main()
