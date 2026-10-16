"""Constructed bytes only; never reads the experimental source or cache."""
from dataclasses import FrozenInstanceError
from fractions import Fraction
import contextlib
import importlib.util
import io
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

PATH = Path(__file__).resolve().parents[1] / "scripts" / "mpea_target_custody.py"
SPEC = importlib.util.spec_from_file_location("fixture_target_custody", PATH)
c = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = c
SPEC.loader.exec_module(c)


def fixture(targets, roles=None, eligible=None, modifications=None, suffix=b"", eol=b"\n", bom=b""):
    header = tuple(f"fixture-column-{i}".encode() for i in range(23))
    records = []
    for i, (ys, el) in enumerate(targets):
        fields = [b"" for _ in range(23)]
        fields[11], fields[13] = ys, el
        for index, replacement in (modifications or {}).get(i, {}).items():
            fields[index] = replacement
        records.append(b",".join(fields))
    raw = bom + eol.join([b",".join(header), *records]) + eol + suffix
    source = c.FixtureSource.from_bytes(raw)
    roles = roles or ["DEVELOPMENT"] * len(targets)
    eligible = eligible or [True] * len(targets)
    routes = c.FixtureRoutes(source, header, tuple(c.RowRoute(
        i, f"{source.sha256}:{i}", i, roles[i], eligible[i]) for i in range(len(targets))))
    return raw, routes


class TargetParserTests(unittest.TestCase):
    def test_exact_finite_decimal_forms_and_units(self):
        for text, expected in [(b".5", Fraction(1, 2)), (b"1.", Fraction(1)),
            (b" +12.50e-1\t", Fraction(5, 4)), (b"7", Fraction(7)),
            (b"000.1000", Fraction(1, 10)), (b"3.125E+2", Fraction(625, 2))]:
            with self.subTest(text=text):
                value = c.parse_target(text, "elongation")
                self.assertEqual(value.status, "VALID")
                self.assertEqual(value.value, expected)

    def test_signed_zero_is_valid_but_caps_apply_first(self):
        for text in (b"0", b"-0", b"-0e2", b"+.000", b"0e256", b"-0e-256"):
            self.assertEqual(c.parse_target(text, "yield_strength").value, Fraction(0))
        for text in (b"0e257", b"0e0000", b"0e999999999"):
            with patch.object(c, "_power10", side_effect=AssertionError("power reached")):
                self.assertEqual(c.parse_target(text, "yield_strength").reason, "EXPONENT_LIMIT")

    def test_missing_unsupported_nonfinite_and_negative_are_distinct(self):
        cases = [(b" \t", "MISSING", "EMPTY_TOKEN"),
            (b"NA", "UNSUPPORTED_LEXICAL", "NOT_POINT_DECIMAL"),
            (b"1/2", "UNSUPPORTED_LEXICAL", "NOT_POINT_DECIMAL"),
            (b"1-2", "UNSUPPORTED_LEXICAL", "NOT_POINT_DECIMAL"),
            (b"<1", "UNSUPPORTED_LEXICAL", "NOT_POINT_DECIMAL"),
            (b"1 +/- 0.1", "UNSUPPORTED_LEXICAL", "NOT_POINT_DECIMAL"),
            (b"7%", "UNSUPPORTED_LEXICAL", "NOT_POINT_DECIMAL"),
            (b"1\n", "UNSUPPORTED_LEXICAL", "NOT_POINT_DECIMAL"),
            (b"\xc2\xa0", "UNSUPPORTED_LEXICAL", "NON_ASCII_TOKEN"),
            (b"NaN", "UNSUPPORTED_NONFINITE", "NONFINITE_TOKEN"),
            (b"-INFINITY", "UNSUPPORTED_NONFINITE", "NONFINITE_TOKEN"),
            (b"+inf", "UNSUPPORTED_NONFINITE", "NONFINITE_TOKEN"),
            (b"-0.01", "SEMANTIC_CONFLICT", "NEGATIVE_YS")]
        for raw, status, reason in cases:
            with self.subTest(raw=raw):
                out = c.parse_target(raw, "yield_strength")
                self.assertEqual((out.status, out.reason, out.value), (status, reason, None))
        self.assertEqual(c.parse_target(b"-1", "elongation").reason, "NEGATIVE_ELONGATION")

    def test_resource_preflight_and_reduced_bit_limit(self):
        with patch.object(c, "_power10", side_effect=AssertionError("expensive conversion")):
            for raw, reason in [(b"1" * 129, "TOKEN_BYTES_LIMIT"),
                                (b"1e-257", "EXPONENT_LIMIT"), (b"1e0001", "EXPONENT_LIMIT")]:
                self.assertEqual(c.parse_target(raw, "yield_strength").reason, reason)
        self.assertEqual(c.parse_target(b"1e154", "yield_strength").status, "VALID")
        self.assertEqual(c.parse_target(b"1e155", "yield_strength").reason, "TARGET_BITS_LIMIT")
        self.assertEqual(c.parse_target(b"1e-155", "yield_strength").reason, "TARGET_BITS_LIMIT")
        # Reduction precedes the 512-bit check.
        self.assertEqual(c.parse_target(b"100e-155", "yield_strength").value, Fraction(1, 10**153))

    def test_immutable_target_shape_and_constant_failures(self):
        for args in [("VALID", "FINITE_NONNEGATIVE_RECORDED_POINT", True),
            ("VALID", "FINITE_NONNEGATIVE_RECORDED_POINT", -1),
            ("VALID", "FINITE_NONNEGATIVE_RECORDED_POINT", Fraction(-1)),
            ("MISSING", "EMPTY_TOKEN", Fraction(0)), ([], "sentinel-923874", None)]:
            with self.assertRaisesRegex(c.CustodyError, "^SCHEMA_INVALID$"):
                c.Target(*args)
        out = c.parse_target(b"1", "yield_strength")
        with self.assertRaises(FrozenInstanceError):
            out.value = Fraction(9)
        self.assertEqual(str(c.CustodyError("sentinel-923874")), "INTERNAL_FAILURE")


class RoutingTests(unittest.TestCase):
    def test_development_role_and_condition_filter_precede_decoding(self):
        raw, routes = fixture([(b"1", b"2"), (b"\xffEVAL-831994", b"\xff"),
            (b"\xffNOT-T25", b"\xff"), (b"\xffCAL", b"\xff")],
            roles=["DEVELOPMENT", "EVALUATION", "DEVELOPMENT", "CALIBRATION"],
            eligible=[True, True, False, True], modifications={0: {4: b"\xffOTHER-CELL"}})
        original = c.parse_target
        calls = []
        def observe(value, name):
            calls.append((value, name))
            return original(value, name)
        with patch.object(c, "parse_target", side_effect=observe):
            rows = c.parse_fixture_targets(raw, routes, frozenset({"DEVELOPMENT"}))
        self.assertEqual(calls, [(b"1", "yield_strength"), (b"2", "elongation")])
        self.assertEqual([row.route.ordinal for row in rows], [0])
        self.assertEqual(len(routes.rows), 4)

    def test_reserved_parse_is_symmetric_and_preserves_bad_rows(self):
        raw, routes = fixture([(b"9", b"1"), (b"", b"2"), (b"-1", b"nan")],
                              roles=["DEVELOPMENT", "CALIBRATION", "EVALUATION"])
        rows = c.parse_fixture_targets(raw, routes, frozenset({"CALIBRATION", "EVALUATION"}))
        self.assertEqual(len(rows), 2)
        self.assertFalse(any(row.complete for row in rows))
        summary = c.summarize_targets(rows)
        self.assertEqual(summary["row_count"], 2)
        self.assertEqual(summary["target_status_counts"]["yield_strength"]["MISSING"], 1)
        self.assertEqual(summary["target_status_counts"]["yield_strength"]["SEMANTIC_CONFLICT"], 1)
        self.assertEqual(summary["target_status_counts"]["elongation"]["UNSUPPORTED_NONFINITE"], 1)
        self.assertNotIn("rows", summary)

    def test_source_verified_before_framing_and_no_reopening(self):
        raw, routes = fixture([(b"1", b"2")])
        with patch.object(c, "_authorized_cells", side_effect=AssertionError("unverified parse")):
            with self.assertRaisesRegex(c.CustodyError, "^SOURCE_IDENTITY_MISMATCH$"):
                c.parse_fixture_targets(raw+b'"BROKEN', routes, frozenset({"DEVELOPMENT"}))
        with patch("builtins.open", side_effect=AssertionError("unexpected filesystem")):
            self.assertTrue(c.parse_fixture_targets(raw, routes, frozenset({"DEVELOPMENT"}))[0].complete)

    def test_late_framing_error_precedes_every_numeric_decoder(self):
        for suffix in (b'"broken', b"extra,columns\n", b"\r"):
            raw, routes = fixture([(b"1", b"2")], suffix=suffix)
            with patch.object(c, "parse_target", side_effect=AssertionError("partial interpretation")):
                with self.assertRaises(c.CustodyError):
                    c.parse_fixture_targets(raw, routes, frozenset({"DEVELOPMENT"}))

    def test_quoted_cells_bom_crlf_and_embedded_newline(self):
        raw, routes = fixture([(b'"1.5"', b'"2\n3"')],
                              modifications={0: {4: b'"ignored\r\n\xff"'}},
                              eol=b"\r\n", bom=b"\xef\xbb\xbf")
        rows = c.parse_fixture_targets(raw, routes, frozenset({"DEVELOPMENT"}))
        self.assertEqual(rows[0].yield_strength.value, Fraction(3, 2))
        self.assertEqual(rows[0].elongation.reason, "NOT_POINT_DECIMAL")

    def test_linkage_and_access_rejection_sanitized_without_logs(self):
        raw, routes = fixture([(b"1", b"2")])
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            for roles in (frozenset({"CALIBRATION"}), {"DEVELOPMENT"}, frozenset(ROLES := c.ROLES)):
                with self.assertRaisesRegex(c.CustodyError, "^UNAUTHORIZED_TARGET_ACCESS$"):
                    c.parse_fixture_targets(raw, routes, roles)
            with self.assertRaisesRegex(c.CustodyError, "^METADATA_LINKAGE_CONFLICT$"):
                c.FixtureRoutes(routes.source, routes.header,
                    (c.RowRoute(0, "not-source:sentinel-928345", 0, "DEVELOPMENT", True),))
        self.assertEqual(stdout.getvalue()+stderr.getvalue(), "")

    def test_actual_archive_identity_and_malformed_scalar_containers_rejected(self):
        with self.assertRaisesRegex(c.CustodyError, "^SYNTHETIC_FIXTURE_REQUIRED$"):
            c.FixtureSource(332126, "6d29eb6018157b863ca0033ccec936d5", c.REAL_SOURCE_SHA256)
        raw, routes = fixture([(b"1", b"2")])
        for header in ([*routes.header], ([], *routes.header[1:])):
            with self.assertRaisesRegex(c.CustodyError, "^SCHEMA_INVALID$"):
                c.FixtureRoutes(routes.source, header, routes.rows)
        with self.assertRaisesRegex(c.CustodyError, "^METADATA_LINKAGE_CONFLICT$"):
            c.RowRoute(True, "bad", 0, "DEVELOPMENT", True)

    def test_source_byte_cap_precedes_hashing_and_identifiers_are_bounded(self):
        with patch.object(c, "sha256", side_effect=AssertionError("unbounded hash")):
            for raw in (b"", b"x" * (c.MAX_SOURCE_BYTES + 1)):
                with self.assertRaisesRegex(c.CustodyError, "^SCHEMA_INVALID$"):
                    c.FixtureSource.from_bytes(raw)
        for record_id, group in (("x" * 71, 0), ("x", 10 ** 1000)):
            with self.assertRaisesRegex(c.CustodyError, "^METADATA_LINKAGE_CONFLICT$"):
                c.RowRoute(0, record_id, group, "DEVELOPMENT", True)


if __name__ == "__main__":
    unittest.main()
