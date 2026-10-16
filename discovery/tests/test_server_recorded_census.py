"""Real HTTP delivery of the fixed, public historical stored-label census.

Resources come from the imported package, so these tests also work against an
installed wheel. They never invoke the census producer or open private labels.
"""
from hashlib import sha256
from importlib.resources import files
import json
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from lupine_discovery import server


PUBLIC_CENSUS_SHA256 = "a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a"


class RecordedCensusHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.package = files("lupine_discovery")
        cls.public_bytes = cls.package.joinpath("resources", "recorded-census-v1.json").read_bytes()
        cls.public = json.loads(cls.public_bytes)
        cls.http = server.make_server(0)
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f"http://127.0.0.1:{cls.http.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join(timeout=2)

    def get(self, path, headers=None):
        request = Request(self.url + path, headers=headers or {})
        try:
            response = urlopen(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            return response.status, response.read(), response.headers

    def assert_security_headers(self, headers, body):
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(headers["Referrer-Policy"], "no-referrer")
        self.assertEqual(int(headers["Content-Length"]), len(body))
        directives = {value.strip() for value in headers["Content-Security-Policy"].split(";")}
        for required in ("default-src 'self'", "script-src 'self'", "connect-src 'self'",
                         "object-src 'none'", "frame-ancestors 'none'", "base-uri 'none'"):
            self.assertIn(required, directives)
        self.assertNotIn("'unsafe-inline'", headers["Content-Security-Policy"])
        self.assertNotIn("'unsafe-eval'", headers["Content-Security-Policy"])

    def test_full_resource_is_delivered_without_rounding_or_projection(self):
        self.assertEqual(sha256(self.public_bytes).hexdigest(), PUBLIC_CENSUS_SHA256)
        status, raw, headers = self.get("/api/benchmarks")
        self.assertEqual(status, 200)
        self.assertEqual(headers.get_content_type(), "application/json")
        body = json.loads(raw)
        self.assertEqual(json.dumps(body["recorded_census"], sort_keys=True),
                         json.dumps(self.public, sort_keys=True))
        self.assertEqual(len(body["recorded_census"]["groups"]), 16)
        self.assertEqual(len(body["recorded_census"]["reference_equality"]), 36)
        for group in body["recorded_census"]["groups"]:
            self.assertEqual(group["count"], 9)
            for name in ("sum_signed_discrepancy", "sum_absolute_discrepancy",
                         "sum_squared_discrepancy", "mean_signed_discrepancy",
                         "mean_absolute_discrepancy", "mean_squared_discrepancy"):
                self.assertEqual(set(group[name]), {"numerator", "denominator"})
                self.assertIs(type(group[name]["numerator"]), str)
                self.assertIs(type(group[name]["denominator"]), str)
        self.assert_security_headers(headers, raw)

    def test_historical_limits_and_reference_uncertainty_survive_http(self):
        status, raw, _ = self.get("/api/benchmarks")
        self.assertEqual(status, 200)
        body = json.loads(raw)
        census = body["recorded_census"]
        self.assertEqual(body["release_status"], "research_preview_not_release_certified")
        self.assertEqual(census["scientific_status"], "NOT_ADMITTED")
        self.assertEqual(census["actual_reference_choice"], "UNKNOWN")
        self.assertEqual(census["sign_convention"], "STORED_PREDICTION_MINUS_STORED_REFERENCE")
        self.assertEqual(census["metric_interpretation"],
                         "EXACT_DESCRIPTIVE_STORED_LABEL_DISCREPANCIES_NOT_PHYSICAL_ERROR_ESTIMATES")
        self.assertFalse(census["synthetic"])
        self.assertFalse(census["binder_executed"])
        self.assertFalse(census["reference_choice_reconstructed"])
        self.assertFalse(census["reference_or_bound_objects_read"])
        self.assertFalse(census["exposure"]["fresh_holdout_claim"])
        self.assertTrue(census["exposure"]["historical_target_bearing_labels_and_citations"])
        self.assertIsNone(census["model_ranking_or_winner"])
        self.assertIsNone(census["tolerance_success_criterion"])
        self.assertNotIn("positions", census)
        for equality in census["reference_equality"]:
            self.assertEqual(equality["actual_reference_choice"], "UNKNOWN")
            self.assertFalse(equality["common_physical_truth_established"])

    def test_optional_missing_census_omits_only_that_report(self):
        status, raw, _ = self.get("/api/benchmarks")
        self.assertEqual(status, 200)
        expected = json.loads(raw)
        del expected["recorded_census"]
        package = self.package

        class AbsentReport:
            def is_file(self):
                return False

            def read_text(self, **_kwargs):
                raise AssertionError("missing optional census must not be read")

        class ResourcesWithoutCensus:
            def joinpath(self, *parts):
                if "/".join(parts) == "resources/recorded-census-v1.json":
                    return AbsentReport()
                return package.joinpath(*parts)

        with patch.object(server, "files", return_value=ResourcesWithoutCensus()):
            status, raw, _ = self.get("/api/benchmarks")
        self.assertEqual(status, 200)
        self.assertNotIn("recorded_census", json.loads(raw))
        self.assertEqual(json.loads(raw), expected)

    def test_packaged_asset_and_entrypoint_are_served_under_csp(self):
        for route, name, content_type in (("/recorded-census.js", "recorded-census.js", "text/javascript"),
                                          ("/", "index.html", "text/html")):
            with self.subTest(route=route):
                expected = self.package.joinpath("web", name).read_bytes()
                status, raw, headers = self.get(route)
                self.assertEqual(status, 200)
                self.assertEqual(raw, expected)
                self.assertEqual(headers.get_content_type(), content_type)
                self.assert_security_headers(headers, raw)
                if name == "index.html":
                    self.assertIn(b'src="/recorded-census.js"', raw)
                else:
                    self.assertIn(b"window.LupineRecordedCensus", raw)

    def test_private_and_arbitrary_resource_routes_never_open_files(self):
        routes = ("/census-private.json", "/private.json", "/api/recorded-census/private",
                  "/resources/census-private.json", "/resources/recorded-census-v1.json",
                  "/../resources/census-private.json", "/%2e%2e/resources/census-private.json",
                  "/recorded-census.js/../census-private.json")
        with patch.object(server, "files", side_effect=AssertionError("unknown route opened resources")) as reader:
            for route in routes:
                with self.subTest(route=route):
                    status, raw, headers = self.get(route)
                    self.assertEqual(status, 404)
                    self.assertEqual(json.loads(raw), {"error": {"message": "Not found."}})
                    self.assert_security_headers(headers, raw)
            reader.assert_not_called()

    def test_census_api_and_asset_keep_loopback_guards_before_resource_access(self):
        with patch.object(server, "files", side_effect=AssertionError("rejected request opened resources")) as reader:
            for route in ("/api/benchmarks", "/recorded-census.js"):
                for headers in ({"Host": "outside.invalid"}, {"Origin": "https://outside.invalid"}):
                    with self.subTest(route=route, headers=headers):
                        status, raw, response_headers = self.get(route, headers)
                        self.assertEqual(status, 403)
                        self.assertEqual(set(json.loads(raw)), {"error"})
                        self.assert_security_headers(response_headers, raw)
            reader.assert_not_called()


if __name__ == "__main__":
    unittest.main()
