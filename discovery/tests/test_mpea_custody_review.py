"""Independent synthetic-only review of the header-only MPEA custodian.

No original CSV request or read is permitted by this test module.
"""
from __future__ import annotations

from contextlib import redirect_stdout, redirect_stderr
from copy import deepcopy
from hashlib import md5, sha256
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import urllib.request
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "mpea_custody.py"
spec = importlib.util.spec_from_file_location("mpea_custody_independent_review", SCRIPT)
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
with patch.object(urllib.request.OpenerDirector, "open", side_effect=AssertionError("network forbidden during import")):
    spec.loader.exec_module(m)

CANARY = "PRIVATE_HEADER_OR_BODY_873640912579"


def fixture_spec(raw):
    return m.SourceSpec(version=9, file_id=25797305, name="MPEA_dataset.csv",
                        size=len(raw), md5=md5(raw).hexdigest())


def inspect(raw):
    return m.inspect_bytes(raw, fixture_spec(raw))


class MPEAIndependentReview(unittest.TestCase):
    def assert_safe(self, report, raw):
        m.validate_public_report(report, spec=fixture_spec(raw))
        public = json.dumps(report, sort_keys=True)
        self.assertNotIn(CANARY, public)
        return report

    def header_report(self, raw):
        report = self.assert_safe(inspect(raw), raw)
        self.assertEqual(report["status"], "BLOCKED_SCHEMA")
        self.assertEqual(set(report["header"]), {"columns", "column_count", "bom", "terminator"})
        self.assertEqual(report["header"]["column_count"], len(report["header"]["columns"]))
        for index, column in enumerate(report["header"]["columns"]):
            self.assertEqual(set(column), {"position", "status", "token"})
            self.assertEqual(column["position"], index)
        return report

    def test_all_recognized_tokens_never_promote_complete_schema(self):
        labels = ["PROPERTY: Type of phases", "PROPERTY: Type of test",
                  "PROPERTY: Elongation (%)", "DOI", "FORMULA", "YS (MPa)",
                  "UTS (MPa)", "Elongation (%)"]
        raw = (",".join(labels) + "\n" + CANARY).encode()
        report = self.header_report(raw)
        self.assertEqual([c["token"] for c in report["header"]["columns"]], labels)
        self.assertEqual(report["header"]["column_count"], 8)

    def test_invalid_utf8_and_csv_after_header_are_not_decoded(self):
        for terminator in (b"\n", b"\r\n"):
            with self.subTest(terminator=terminator):
                raw = b"DOI,FORMULA" + terminator + b'\xff\xfe\x00"unterminated,' + CANARY.encode()
                report = self.header_report(raw)
                self.assertEqual([c["token"] for c in report["header"]["columns"]], ["DOI", "FORMULA"])

    def test_unknown_header_spelling_length_and_numeric_canaries_are_withheld(self):
        headers = []
        for token in (CANARY, "X", "938462.88729", "a" * 256):
            raw = ("DOI," + token + ",FORMULA\n" + CANARY).encode()
            report = self.header_report(raw)
            column = report["header"]["columns"][1]
            self.assertEqual(column, {"position": 1, "status": "UNKNOWN_COLUMN", "token": None})
            headers.append(report["header"])
        self.assertTrue(all(header == headers[0] for header in headers))

    def test_quoted_commas_newlines_and_doubled_quotes_stay_one_private_token(self):
        for private in (b'"private,comma"', b'"private\nline"', b'"private\r\nline"', b'"private""quote"'):
            with self.subTest(private_kind=len(private)):
                raw = b"DOI," + private + b",FORMULA\r\n\xff"
                report = self.header_report(raw)
                self.assertEqual(report["header"]["column_count"], 3)
                self.assertEqual(report["header"]["columns"][1]["token"], None)
                self.assertEqual(report["header"]["columns"][2]["token"], "FORMULA")

    def test_bom_and_decoded_quoted_known_tokens(self):
        raw = b'\xef\xbb\xbf"DOI","FORMULA"\r\n\xff'
        report = self.header_report(raw)
        self.assertIs(report["header"]["bom"], True)
        self.assertEqual([c["token"] for c in report["header"]["columns"]], ["DOI", "FORMULA"])
        ordinary = self.header_report(b"DOI,FORMULA\n")
        self.assertIs(ordinary["header"]["bom"], False)

    def test_duplicates_empty_fields_and_malformed_quote_state_block_safely(self):
        fixtures = [b'DOI,"DOI"\n', b"DOI,,FORMULA\n", b"DOI,\n", b'""\n',
                    b'"DOI"X,FORMULA\n', b'DO"I,FORMULA\n', b'"DOI,FORMULA\n',
                    b"DOI\rFORMULA\n", b"DOI,\xff\n"]
        for raw in fixtures:
            with self.subTest(fixture_index=fixtures.index(raw)):
                report = self.assert_safe(inspect(raw), raw)
                self.assertNotEqual(report["status"], "BLOCKED_SCHEMA")
                self.assertIsNone(report["header"])

    def test_unicode_char_limit_is_distinct_from_encoded_byte_limit(self):
        raw = ("DOI," + "🌲" * 256 + "\n").encode()
        self.header_report(raw)
        overlong = ("DOI," + "🌲" * 257 + "\n").encode()
        report = self.assert_safe(inspect(overlong), overlong)
        self.assertNotEqual(report["status"], "BLOCKED_SCHEMA")
        self.assertIsNone(report["header"])

    def test_column_limit_never_truncates_to_success(self):
        at_limit = (",".join("private" + str(i) for i in range(128)) + "\n").encode()
        report = self.header_report(at_limit)
        self.assertEqual(report["header"]["column_count"], 128)
        over = (",".join("private" + str(i) for i in range(129)) + "\n").encode()
        result = self.assert_safe(inspect(over), over)
        self.assertNotEqual(result["status"], "BLOCKED_SCHEMA")
        self.assertIsNone(result["header"])

    def test_whole_identity_is_checked_before_header_scanner(self):
        raw = b"DOI,FORMULA\n" + CANARY.encode()
        proper = fixture_spec(raw)
        for bad in (m.SourceSpec(9, 25797305, "MPEA_dataset.csv", len(raw) + 1, proper.md5),
                    m.SourceSpec(9, 25797305, "MPEA_dataset.csv", len(raw), "0" * 32)):
            with self.subTest(size=bad.size):
                with patch.object(m, "scan_header", side_effect=AssertionError("scanner must not run")) as scanner:
                    report = m.inspect_bytes(raw, bad)
                scanner.assert_not_called()
                self.assertNotEqual(report["status"], "BLOCKED_SCHEMA")
                self.assertIsNone(report["header"])
                self.assertNotIn(CANARY, json.dumps(report))

    def test_header_byte_scan_limit_blocks_before_decoding(self):
        raw = b'"' + b"\xff" * (4 * 65536 + 4)
        report = self.assert_safe(inspect(raw), raw)
        self.assertNotEqual(report["status"], "BLOCKED_SCHEMA")
        self.assertIsNone(report["header"])



    def test_header_record_character_cap_includes_escaped_csv_text(self):
        tokens = [chr(0x100 + i) + '"' * 255 for i in range(128)]
        text = ",".join('"' + token.replace('"', '""') + '"' for token in tokens)
        self.assertGreater(len(text), 65536)
        self.assertTrue(all(len(token) == 256 for token in tokens))
        raw = (text + "\n").encode()
        result = self.assert_safe(inspect(raw), raw)
        self.assertEqual(result["reason"], "HEADER_LIMIT")
        self.assertIsNone(result["header"])

    def test_recognition_is_exact_without_trim_prefix_guess_or_casefold(self):
        raw = b"doi,FORMULA ,PROPERTY: YS (MPa)\n"
        report = self.header_report(raw)
        self.assertEqual([c["token"] for c in report["header"]["columns"]], [None, None, None])

    def test_resealed_public_flags_and_scalar_container_channels_are_rejected(self):
        raw = b"DOI,private\n"
        report = inspect(raw)
        changes = [
            ("scope", "data_rows_decoded", True),
            ("scope", "row_metadata_extracted", True),
            ("scope", "scientific_eligibility_decisions", True),
            ("scope", "target_numeric_validity_checked", True),
            ("scope", "full_schema_established", True),
            ("scope", "fits", 1),
            ("scope", "fits", False),
            ("scope", "splits", 1),
            ("scope", "row_count", 0),
            ("scope", "numeric_completeness", {"sha256": "a" * 64}),
            ("header", "column_count", True),
            ("header", "bom", {"sha256": "a" * 64}),
            ("parser_profile", "max_columns", True),
            ("observed", "bytes", True),
            ("source", "version", True),
        ]
        for section, key, value in changes:
            with self.subTest(section=section, key=key, value_kind=type(value).__name__):
                bad = deepcopy(report)
                bad[section][key] = value
                bad.pop("content_sha256")
                bad["content_sha256"] = sha256(m.canonical_bytes(bad)).hexdigest()
                with self.assertRaises(m.CustodyError) as cm:
                    m.validate_public_report(bad, spec=fixture_spec(raw))
                self.assertEqual(str(cm.exception), "PUBLIC_SCHEMA_INVALID")
        for value in (CANARY, {"md5": "a" * 32}, [], 41):
            bad = deepcopy(report)
            bad["header"]["columns"][1]["token"] = value
            bad.pop("content_sha256")
            bad["content_sha256"] = sha256(m.canonical_bytes(bad)).hexdigest()
            with self.assertRaises(m.CustodyError):
                m.validate_public_report(bad, spec=fixture_spec(raw))

    def test_header_positions_and_unknown_field_extensions_are_closed(self):
        raw = b"DOI,private,FORMULA\n"
        base = inspect(raw)
        alterations = []
        for field, value in (("position", True), ("position", 0), ("position", 10)):
            bad = deepcopy(base)
            bad["header"]["columns"][1][field] = value
            alterations.append(bad)
        bad = deepcopy(base)
        bad["header"]["columns"][1]["length"] = len(CANARY)
        alterations.append(bad)
        bad = deepcopy(base)
        bad["header"]["columns"][1]["sha256"] = sha256(CANARY.encode()).hexdigest()
        alterations.append(bad)
        for bad in alterations:
            bad.pop("content_sha256")
            bad["content_sha256"] = sha256(m.canonical_bytes(bad)).hexdigest()
            with self.assertRaises(m.CustodyError):
                m.validate_public_report(bad, spec=fixture_spec(raw))

    def test_write_sink_revalidates_and_does_not_overwrite(self):
        raw = b"DOI,FORMULA\n"
        report = inspect(raw)
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "public.json"
            bad = deepcopy(report)
            bad["scope"]["fits"] = 1
            bad.pop("content_sha256")
            bad["content_sha256"] = sha256(m.canonical_bytes(bad)).hexdigest()
            with self.assertRaises(m.CustodyError):
                m.write_public(bad, output, spec=fixture_spec(raw))
            self.assertFalse(output.exists())
            m.write_public(report, output, spec=fixture_spec(raw))
            before = output.read_bytes()
            m.write_public(report, output, spec=fixture_spec(raw))
            self.assertEqual(output.read_bytes(), before)
            output.write_text(CANARY)
            with self.assertRaises(m.CustodyError) as cm:
                m.write_public(report, output, spec=fixture_spec(raw))
            self.assertNotIn(CANARY, str(cm.exception))
            self.assertEqual(output.read_text(), CANARY)

    def test_legacy_md5_and_sha_bind_the_same_whole_synthetic_file(self):
        raw = b"DOI,FORMULA\n" + b"\xff" + CANARY.encode()
        report = inspect(raw)
        self.assertEqual(report["observed"], {"bytes": len(raw), "md5": md5(raw).hexdigest(),
                                              "sha256": sha256(raw).hexdigest()})
        self.assertIs(report["scope"]["dataset_bytes_acquired"], True)
        self.assertIs(report["scope"]["data_rows_decoded"], False)
        self.assertIsNone(report["scope"]["row_count"])
        self.assertIsNone(report["scope"]["numeric_completeness"])
        with patch.object(m, "scan_header") as scanner:
            bad = m.inspect_bytes(raw + b"X", fixture_spec(raw))
        scanner.assert_not_called()
        self.assertEqual(bad["reason"], "SIZE_MISMATCH")
        self.assertIs(bad["scope"]["dataset_bytes_acquired"], True)
        self.assertIs(bad["scope"]["header_decode_attempted"], False)

    def test_existing_conflicting_cache_is_not_replaced_or_refetched(self):
        raw = b"DOI,FORMULA\n"
        source = fixture_spec(raw)
        with tempfile.TemporaryDirectory() as directory, patch.object(m, "ROOT", Path(directory)):
            first = m.acquire_to_cache(fetch=lambda _: raw, spec=source)
            self.assertEqual(first["status"], "CAPTURED")
            destination = m._object_path(m.cache_root(), source)
            bad = b"X" * len(raw)
            destination.write_bytes(bad)
            with patch.object(m, "scan_header", side_effect=AssertionError("unverified parser access")) as scanner:
                with patch.object(m, "_fetch", side_effect=AssertionError("no refetch")) as fetch:
                    result = m.acquire_to_cache(spec=source, fetch=fetch)
                    header = m.inspect_cache(spec=source)
            scanner.assert_not_called()
            fetch.assert_not_called()
            self.assertEqual(result["reason"], "MD5_MISMATCH")
            self.assertEqual(header["reason"], "MD5_MISMATCH")
            self.assertEqual(destination.read_bytes(), bad)

    def test_cache_root_ancestors_and_object_symlink_escapes_reject(self):
        raw = b"DOI,FORMULA\n"
        source = fixture_spec(raw)
        with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as elsewhere:
            root = Path(directory)
            with patch.object(m, "ROOT", root):
                with self.assertRaises(m.CustodyError):
                    m.cache_root(Path(elsewhere))
                (root / ".cache").symlink_to(elsewhere, target_is_directory=True)
                with self.assertRaises(m.CustodyError):
                    m.cache_root()
                (root / ".cache").unlink()
                (root / ".cache").mkdir()
                (root / ".cache/mpea-custody").symlink_to(elsewhere, target_is_directory=True)
                with self.assertRaises(m.CustodyError):
                    m.cache_root()
                (root / ".cache/mpea-custody").unlink()
                cache = m.cache_root()
                cache.mkdir(parents=True)
                outside = Path(elsewhere) / "private.csv"
                outside.write_bytes(raw)
                destination = m._object_path(cache, source)
                destination.symlink_to(outside)
                result = m.inspect_cache(spec=source)
                self.assertEqual(result["reason"], "CACHE_PATH_INVALID")
                self.assertIsNone(result["observed"])

    def test_single_exact_redirect_and_opaque_query_not_public_errors(self):
        initial = urllib.request.Request(m.DOWNLOAD_URL)
        approved = "https://s3-eu-west-1.amazonaws.com/pfigshare-u-files/25797305/MPEA_dataset.csv?" + CANARY
        handler = m._PinnedRedirect()
        redirected = handler.redirect_request(initial, None, 302, "", {}, approved)
        self.assertEqual(redirected.full_url, approved)
        with self.assertRaises(m.CustodyError) as cm:
            handler.redirect_request(redirected, None, 302, "", {}, approved)
        self.assertNotIn(CANARY, str(cm.exception))
        bad_routes = [
            "http://s3-eu-west-1.amazonaws.com/pfigshare-u-files/25797305/MPEA_dataset.csv",
            "https://evil.invalid/pfigshare-u-files/25797305/MPEA_dataset.csv",
            "https://s3-eu-west-1.amazonaws.com:444/pfigshare-u-files/25797305/MPEA_dataset.csv",
            "https://user@s3-eu-west-1.amazonaws.com/pfigshare-u-files/25797305/MPEA_dataset.csv",
            "https://s3-eu-west-1.amazonaws.com/pfigshare-u-files/25797306/MPEA_dataset.csv",
            approved + "#private",
        ]
        for route in bad_routes:
            with self.subTest(route_index=bad_routes.index(route)):
                with self.assertRaises(m.CustodyError) as cm:
                    m._PinnedRedirect().redirect_request(initial, None, 302, "", {}, route)
                self.assertEqual(str(cm.exception), "FETCH_FAILED")

    def test_sanitized_fetch_cli_and_parser_failures_no_stdout_stderr_canary(self):
        raw = b"DOI,FORMULA\n"
        source = fixture_spec(raw)
        out, err = io.StringIO(), io.StringIO()
        with tempfile.TemporaryDirectory() as directory, patch.object(m, "ROOT", Path(directory)):
            with redirect_stdout(out), redirect_stderr(err):
                result = m.acquire_to_cache(spec=source, fetch=lambda _: (_ for _ in ()).throw(RuntimeError(CANARY)))
                with patch.object(m, "frozen_source_identity", side_effect=RuntimeError(CANARY)):
                    code = m.main(["header", "--output", str(Path(directory) / "public.json")])
                invalid = m.main([CANARY, "--output", str(Path(directory) / "invalid.json")])
            self.assertEqual(result["reason"], "FETCH_FAILED")
            self.assertEqual(code, 2)
            self.assertEqual(invalid, 2)
            self.assertFalse((Path(directory) / "public.json").exists())
            self.assertFalse((Path(directory) / "invalid.json").exists())
        self.assertNotIn(CANARY, json.dumps(result) + out.getvalue() + err.getvalue())
        self.assertEqual(err.getvalue(), "")


    def test_resealed_status_reason_pairs_cannot_forge_a_different_execution(self):
        raw = b"DOI,FORMULA\n"
        report = inspect(raw)
        combinations = [("BLOCKED_IO", "CAPTURE_VERIFIED"),
                        ("BLOCKED_GUARD", "SCHEMA_UNCONFIRMED"),
                        ("BLOCKED_SOURCE", "HEADER_ENCODING_INVALID"),
                        ("BLOCKED_SOURCE", "MD5_MISMATCH")]
        for status, reason in combinations:
            with self.subTest(status=status, reason=reason):
                bad = deepcopy(report)
                bad["status"], bad["reason"] = status, reason
                bad["action"] = "acquire"
                bad["header"] = None
                bad["scope"]["header_decode_attempted"] = False
                bad.pop("content_sha256")
                bad["content_sha256"] = sha256(m.canonical_bytes(bad)).hexdigest()
                with self.assertRaises(m.CustodyError):
                    m.validate_public_report(bad, spec=fixture_spec(raw))

    def test_fixture_pins_cannot_relax_version_file_name_or_boolean_identity(self):
        raw = b"DOI,FORMULA\n"
        digest = md5(raw).hexdigest()
        bad_specs = [m.SourceSpec(8, 25797305, "MPEA_dataset.csv", len(raw), digest),
                     m.SourceSpec(9, 25797306, "MPEA_dataset.csv", len(raw), digest),
                     m.SourceSpec(9, 25797305, CANARY, len(raw), digest),
                     m.SourceSpec(True, 25797305, "MPEA_dataset.csv", len(raw), digest),
                     m.SourceSpec(9, 25797305, "MPEA_dataset.csv", True, digest)]
        for source in bad_specs:
            with patch.object(m, "scan_header") as scanner:
                with self.assertRaises(m.CustodyError) as cm:
                    m.inspect_bytes(raw, source)
            scanner.assert_not_called()
            self.assertEqual(str(cm.exception), "INVENTORY_INVALID")


if __name__ == "__main__":
    unittest.main()
