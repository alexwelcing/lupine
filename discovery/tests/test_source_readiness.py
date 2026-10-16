"""Published documentary state only; generated forgeries never open source data."""
from contextlib import ExitStack, redirect_stderr, redirect_stdout
import copy
import importlib
import io
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch
from urllib.request import urlopen


# This candidate runs before promotion, without copying unrelated package files.
# The same test resolves the normal package directly after promotion.
ROOT = next(p for p in Path(__file__).resolve().parents
            if (p / "pyproject.toml").is_file() and (p / "src/lupine_discovery/core.py").is_file())
PACKAGE = Path(__file__).resolve().parents[1] / "src/lupine_discovery"
sys.path.insert(0, str(ROOT / "src"))
import lupine_discovery
if PACKAGE != ROOT / "src/lupine_discovery":
    lupine_discovery.__path__.insert(0, str(PACKAGE))
from lupine_discovery import cli, server, source_readiness as readiness

RAW = (PACKAGE / readiness.RESOURCE_PATH).read_bytes()
EXPECTED = json.loads(RAW)


class SourceReadinessTests(unittest.TestCase):
    def setUp(self):
        self.resource = patch.object(readiness, "files", return_value=PACKAGE)
        self.resource.start()
        self.addCleanup(self.resource.stop)

    def invalid(self, value):
        with self.assertRaises(readiness.SourceReadinessError) as caught:
            readiness.validate_source_readiness(value)
        self.assertEqual(caught.exception.code, "SOURCE_READINESS_RESOURCE_INVALID")

    def command(self, args=None):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            status = cli.main(["source-readiness", *(args or [])])
        return status, out.getvalue(), err.getvalue()

    def test_fixed_snapshot_preserves_blocked_and_unexecuted_scope(self):
        value = readiness.load_source_readiness()
        self.assertEqual(value, EXPECTED)
        li, dryad = value["sources"]
        self.assertEqual([s["id"] for s in value["sources"]], ["li-tensile-v3", "dryad-dielectric"])
        self.assertEqual([s["status"] for s in value["sources"]], ["BLOCKED_SCHEMA", "BLOCKED_ACCESS"])
        self.assertEqual({s["scientific_admission"] for s in value["sources"]}, {"NOT_ADMITTED"})
        self.assertIn("exactly one actual layout command", " ".join(li["completed_actions"]))
        self.assertIn("A2: NOT_RUN.", li["unexecuted_actions"])
        self.assertIn("five XML parses started and four completed", " ".join(li["exposure"]))
        self.assertIn("not target-free", " ".join(li["exposure"]))
        self.assertIn("Offline PDF parser: NOT_RUN", " ".join(dryad["unexecuted_actions"]))
        self.assertIn("HTTP 403", " ".join(dryad["blockers"]))
        self.assertIn("CC0-1.0", dryad["license_declaration"])

    def test_validator_detaches_and_loader_does_not_cache_mutation(self):
        original = copy.deepcopy(EXPECTED)
        result = readiness.validate_source_readiness(original)
        result["sources"][0]["exposure"].clear()
        self.assertEqual(original, EXPECTED)
        self.assertEqual(readiness.load_source_readiness(), EXPECTED)

    def test_reordered_object_keys_are_same_documentary_identity(self):
        reordered = {key: EXPECTED[key] for key in reversed(EXPECTED)}
        raw = json.dumps(reordered, indent=4).encode()
        self.assertEqual(readiness.loads_source_readiness(raw), EXPECTED)

    def test_missing_empty_extra_and_reordered_sources_rejected(self):
        for change in (lambda v: v.pop("sources"), lambda v: v.update(sources=[]),
                       lambda v: v.update(attestation="scientifically_valid"),
                       lambda v: v["sources"].reverse(),
                       lambda v: v["sources"].append(copy.deepcopy(v["sources"][0])),
                       lambda v: v["sources"][0].pop("exposure"),
                       lambda v: v["sources"][0].update(measurement=0)):
            value = copy.deepcopy(EXPECTED)
            change(value)
            with self.subTest(change=change):
                self.invalid(value)

    def test_scientific_admission_and_success_forgery_rejected(self):
        for index in range(2):
            for key, altered in (("scientific_admission", "ADMITTED"), ("status", "READY"),
                                 ("status", "BLOCKED_SCHEMA" if index else "BLOCKED_ACCESS")):
                value = copy.deepcopy(EXPECTED)
                value["sources"][index][key] = altered
                self.invalid(value)

    def test_valid_shape_scope_forgeries_rejected(self):
        for key, altered in (("completed_actions", ["A1 and A2 both completed successfully."]),
                             ("unexecuted_actions", ["All actions completed."]),
                             ("blockers", ["No blockers remain."]),
                             ("exposure", ["No source cells or XML were exposed."]),
                             ("license_declaration", "All files and derivatives are verified CC0."),
                             ("title", "Li alloy creep measurements")):
            value = copy.deepcopy(EXPECTED)
            value["sources"][0][key] = altered
            self.invalid(value)

    def test_stale_commit_schema_and_evidence_urls_rejected(self):
        for key, value in (("snapshot_commit", "0" * 40), ("schema", "lupine.source-readiness.v2")):
            self.invalid({**EXPECTED, key: value})
        for replacement in ("https://github.com/alexwelcing/lupine/blob/main/discovery/reports/x",
                            "https://github.com.evil.invalid/alexwelcing/lupine/blob/88d/readme",
                            "javascript:alert(1)",
                            EXPECTED["sources"][0]["evidence_urls"][0] + "?claim=ready",
                            EXPECTED["sources"][0]["evidence_urls"][0].replace("README.md", "OTHER.md")):
            value = copy.deepcopy(EXPECTED)
            value["sources"][0]["evidence_urls"][0] = replacement
            self.invalid(value)

    def test_direct_input_strict_containers_and_scalars(self):
        class Dictionary(dict):
            pass
        class Text(str):
            pass
        self.invalid(Dictionary(EXPECTED))
        self.invalid({**EXPECTED, "sources": tuple(EXPECTED["sources"])})
        for key in ("schema", "snapshot_commit"):
            self.invalid({**EXPECTED, key: Text(EXPECTED[key])})
        for altered in (None, True, 0, 1.25, ["text"], {"text": "text"}, Text("text")):
            value = copy.deepcopy(EXPECTED)
            value["sources"][0]["title"] = altered
            self.invalid(value)

    def test_text_and_array_caps_and_unknowns_not_replaced(self):
        for altered in ("", " leading", "trailing ", "line\nbreak", "nonascii\u00e9", "x" * 1025):
            value = copy.deepcopy(EXPECTED)
            value["sources"][0]["title"] = altered
            self.invalid(value)
        for altered in ([], ["x"] * 17, None, ("unknown",)):
            value = copy.deepcopy(EXPECTED)
            value["sources"][0]["exposure"] = altered
            self.invalid(value)

    def test_decoder_rejects_duplicates_scalars_invalid_utf8_and_syntax(self):
        for raw in (b'{"schema":"x","schema":"x"}', b'{}', b'null', b'false',
                    b'{"n":1}', b'{"n":0.1}', b'{"n":1e1}', b'{"n":NaN}',
                    b'{"n":Infinity}', b'\xff', b'{} trailing', RAW[:-4]):
            with self.subTest(raw=raw[:50]), self.assertRaises(readiness.SourceReadinessError):
                readiness.loads_source_readiness(raw)

    def test_size_and_depth_are_checked_before_json_decode(self):
        for raw in (b" " * (readiness.MAX_DOCUMENT_BYTES + 1), b"[" * 9 + b"]" * 9):
            with patch.object(readiness.json, "loads", side_effect=AssertionError("decoder called")):
                with self.assertRaises(readiness.SourceReadinessError):
                    readiness.loads_source_readiness(raw)

    def test_prepass_does_not_count_quoted_delimiters(self):
        modified = copy.deepcopy(EXPECTED)
        modified["sources"][0]["title"] = "quoted [ { \\\" text " + "]" * 20
        raw = json.dumps(modified).encode()
        # A bad claim must reach normal validation rather than a depth error.
        with patch.object(readiness, "validate_source_readiness", return_value="decoded") as check:
            self.assertEqual(readiness.loads_source_readiness(raw), "decoded")
        check.assert_called_once_with(modified)

    def test_loader_has_one_fixed_bounded_read(self):
        handle = Mock()
        handle.__enter__ = Mock(return_value=handle)
        handle.__exit__ = Mock(return_value=False)
        handle.read.return_value = RAW
        resource = Mock()
        resource.joinpath.return_value.open.return_value = handle
        with patch.object(readiness, "files", return_value=resource) as files_call:
            self.assertEqual(readiness.load_source_readiness(), EXPECTED)
        files_call.assert_called_once_with("lupine_discovery")
        resource.joinpath.assert_called_once_with(readiness.RESOURCE_PATH)
        resource.joinpath.return_value.open.assert_called_once_with("rb")
        handle.read.assert_called_once_with(readiness.MAX_DOCUMENT_BYTES + 1)

    def test_missing_unreadable_and_invalid_resource_fail_closed(self):
        for exception, reason, status in (
                (FileNotFoundError("private path"), "MISSING", "UNAVAILABLE"),
                (PermissionError("private path"), "UNREADABLE", "UNAVAILABLE")):
            resource = Mock()
            resource.joinpath.return_value.open.side_effect = exception
            with patch.object(readiness, "files", return_value=resource):
                value = readiness.source_readiness_report()
            self.assertEqual(value, {"schema": readiness.UNAVAILABLE_SCHEMA, "status": status,
                "reason": "SOURCE_READINESS_RESOURCE_" + reason, "scientific_admission": "NOT_ADMITTED"})
            self.assertNotIn("sources", value)
            self.assertNotIn("private path", str(value))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "resources").mkdir()
            (root / readiness.RESOURCE_PATH).write_text('{"sources":[]}')
            with patch.object(readiness, "files", return_value=root):
                value = readiness.source_readiness_report()
            self.assertEqual(value["status"], "INVALID")
            self.assertEqual(value["reason"], "SOURCE_READINESS_RESOURCE_INVALID")
            self.assertNotIn("sources", value)

    def test_cli_exact_deterministic_stdout_and_output_file(self):
        one = self.command()
        two = self.command()
        self.assertEqual(one, two)
        self.assertEqual(one[0], 0)
        self.assertEqual(one[2], "")
        self.assertEqual(json.loads(one[1]), EXPECTED)
        self.assertEqual(one[1], json.dumps(EXPECTED, sort_keys=True, ensure_ascii=True, indent=2) + "\n")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "snapshot.json"
            self.assertEqual(self.command(["--output", str(path)]), (0, "", ""))
            self.assertEqual(path.read_bytes(), one[1].encode())

    def test_cli_failure_is_structured_exit_two_no_cached_snapshot(self):
        self.assertEqual(self.command()[0], 0)
        for reason in ("MISSING", "INVALID", "UNREADABLE"):
            with patch.object(readiness, "load_source_readiness", side_effect=readiness.SourceReadinessError(
                    "SOURCE_READINESS_RESOURCE_" + reason)):
                code, output, error = self.command()
            self.assertEqual(code, 2)
            self.assertEqual(error, "")
            self.assertNotIn("sources", json.loads(output))
            self.assertEqual(json.loads(output)["reason"], "SOURCE_READINESS_RESOURCE_" + reason)

    def test_cli_cannot_enter_acquisition_or_scientific_input_paths(self):
        with ExitStack() as stack:
            for name in ("_read_document", "certificate", "replay_report"):
                stack.enter_context(patch.object(cli, name, side_effect=AssertionError("input path")))
            stack.enter_context(patch("urllib.request.urlopen", side_effect=AssertionError("network")))
            self.assertEqual(self.command()[0], 0)

    def test_original_scalar_certificate_bytes_preserved(self):
        output = io.StringIO()
        with redirect_stdout(output):
            result = cli.main(["select", str(ROOT / "examples/abstract.json")])
        self.assertEqual(result, 0)
        self.assertEqual(output.getvalue(), (ROOT / "examples/abstract.certificate.json").read_text())


class SourceReadinessHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http = server.make_server(0)
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f"http://127.0.0.1:{cls.http.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join(timeout=2)

    def benchmark(self):
        with urlopen(self.url + "/api/benchmarks", timeout=10) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.headers["Cache-Control"], "no-store")
            return json.loads(response.read())

    def test_http_cli_full_resource_equality_and_existing_fields_unchanged(self):
        with patch.object(readiness, "files", return_value=PACKAGE), \
                patch.object(server, "run_known_answers", return_value={"sentinel": "known"}), \
                patch.object(server, "archived_reports", return_value=[{"sentinel": "archive"}]):
            output = io.StringIO()
            with redirect_stdout(output):
                self.assertEqual(cli.main(["source-readiness"]), 0)
            report = self.benchmark()
        self.assertEqual(report["source_readiness"], json.loads(output.getvalue()))
        self.assertEqual(report["source_readiness"], EXPECTED)
        self.assertEqual(report["known_answers"], {"sentinel": "known"})
        self.assertEqual(report["archived"], [{"sentinel": "archive"}])
        self.assertEqual(report["release_status"], "research_preview_not_release_certified")

    def test_http_failure_remains_explicit_after_success(self):
        with patch.object(readiness, "files", return_value=PACKAGE), \
                patch.object(server, "run_known_answers", return_value=[]), \
                patch.object(server, "archived_reports", return_value=[]):
            self.assertEqual(self.benchmark()["source_readiness"], EXPECTED)
            for reason in ("MISSING", "INVALID"):
                with patch.object(readiness, "load_source_readiness", side_effect=readiness.SourceReadinessError(
                        "SOURCE_READINESS_RESOURCE_" + reason)):
                    result = self.benchmark()["source_readiness"]
                self.assertEqual(result["schema"], readiness.UNAVAILABLE_SCHEMA)
                self.assertEqual(result["reason"], "SOURCE_READINESS_RESOURCE_" + reason)
                self.assertNotIn("sources", result)

    def test_static_asset_route_preserves_exact_bytes(self):
        # The actual UI belongs to a separate overlay; route a harmless fixture
        # through the real handler to check the path and response semantics.
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "web").mkdir()
            payload = b"/* synthetic route fixture; no operations */\n"
            (root / "web/source-readiness.js").write_bytes(payload)
            with patch.object(server, "files", return_value=root):
                with urlopen(self.url + "/source-readiness.js", timeout=10) as response:
                    self.assertEqual(response.read(), payload)
                    self.assertIn("text/javascript", response.headers["Content-Type"])
                    self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")


if __name__ == "__main__":
    unittest.main()
