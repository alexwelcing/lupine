"""Independent synthetic growth-hint structural checks.

Local, central and end records are packed by this reviewer's existing builder.
No implementation-author fixture, actual workbook/capture/receipt, network,
production guard, member payload reader or XML parser is used.
"""
from __future__ import annotations

from copy import deepcopy
from contextlib import ExitStack, redirect_stderr
import gc
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import socket
import struct
import sys
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
import zlib

DISCOVERY = next(p for p in Path(__file__).absolute().parents
                 if p.name == "discovery" and (p / "AGENTS.md").is_file())
REQUIRED = ("[Content_Types].xml", "_rels/.rels", "xl/workbook.xml",
            "xl/_rels/workbook.xml.rels")
SCRIPT = DISCOVERY / "scripts/li_v3_growth_hint_shape.py"
if not SCRIPT.is_file():
    SCRIPT = (DISCOVERY / ".cache/phase2-growth-hint-candidate-v1/promotion/scripts/"
              "li_v3_growth_hint_shape.py")


def entry(name, *, method=0, flags=0, content=b"PRIVATE_PAYLOAD_CANARY", **changes):
    """Declare local and central metadata separately to expose mismatch cases."""
    name = name.encode("ascii") if isinstance(name, str) else name
    if method == 8:
        compressor = zlib.compressobj(level=6, wbits=-15)
        payload = compressor.compress(content) + compressor.flush()
    else:
        payload = content
    base = {
        "version": 20, "flags": flags, "method": method,
        "time": 0, "date": 33, "crc": zlib.crc32(content),
        "compressed": len(payload), "size": len(content), "name": name,
        "extra": b"", "signature": b"PK\x03\x04",
    }
    result = {"local": deepcopy(base), "central": deepcopy(base), "payload": payload}
    result["central"].update(signature=b"PK\x01\x02", made_by=20,
                             comment=b"", disk=0, internal=0,
                             external=0o100600 << 16, offset=None)
    for side, values in changes.items():
        if side in ("local", "central"):
            result[side].update(values)
        else:
            result[side] = values
    return result


def raw_zip(entries=None, *, prefix=b"", gap=b"", end=None):
    """Pack local, central and EOCD records without using ZipFile as the writer."""
    entries = entries if entries is not None else [entry(name) for name in REQUIRED]
    local_parts = [prefix]
    offsets = []
    cursor = len(prefix)
    for item in entries:
        offsets.append(cursor)
        value = item["local"]
        header = struct.pack(
            "<4s5H3L2H", value["signature"], value["version"], value["flags"],
            value["method"], value["time"], value["date"], value["crc"],
            value["compressed"], value["size"], len(value["name"]), len(value["extra"]))
        part = header + value["name"] + value["extra"] + item["payload"]
        local_parts.append(part)
        cursor += len(part)
    local_parts.append(gap)
    cursor += len(gap)
    directory_offset = cursor
    central_parts = []
    for item, offset in zip(entries, offsets):
        value = item["central"]
        header = struct.pack(
            "<4s6H3L5H2L", value["signature"], value["made_by"], value["version"],
            value["flags"], value["method"], value["time"], value["date"],
            value["crc"], value["compressed"], value["size"], len(value["name"]),
            len(value["extra"]), len(value["comment"]), value["disk"], value["internal"],
            value["external"], offset if value["offset"] is None else value["offset"])
        central_parts.append(header + value["name"] + value["extra"] + value["comment"])
    directory = b"".join(central_parts)
    footer = {
        "signature": b"PK\x05\x06", "disk": 0, "directory_disk": 0,
        "disk_count": len(entries), "count": len(entries), "directory_size": len(directory),
        "directory_offset": directory_offset, "comment_length": 0,
    }
    footer.update(end or {})
    packed_end = struct.pack(
        "<4s4H2LH", footer["signature"], footer["disk"], footer["directory_disk"],
        footer["disk_count"], footer["count"], footer["directory_size"],
        footer["directory_offset"], footer["comment_length"])
    return b"".join(local_parts) + directory + packed_end


def changed_first(**changes):
    return raw_zip([entry(REQUIRED[0], **changes)] + [entry(name) for name in REQUIRED[1:]])


def replace_local_area(raw, replacement):
    """Keep a genuine central directory while replacing its claimed local area."""
    footer = list(struct.unpack("<4s4H2LH", raw[-22:]))
    directory = raw[footer[6]:footer[6] + footer[5]]
    footer[6] = len(replacement)
    return replacement + directory + struct.pack("<4s4H2LH", *footer)


def tlv(header_id, payload=b"", declared=None):
    return struct.pack("<HH", header_id, len(payload) if declared is None else declared) + payload


def with_extra(area, index=0, **changes):
    entries = [entry(name) for name in REQUIRED]
    entries[index]["local"]["extra"] = area
    for side, fields in changes.items():
        entries[index][side].update(fields)
    return raw_zip(entries)


def growth_body(pad_value=0, padding=b"", signature=0xA028):
    return struct.pack("<HH", signature, pad_value) + padding


def growth_zip(pad_value=0, padding=b"", signature=0xA028, index=0):
    return with_extra(tlv(0xA220, growth_body(pad_value, padding, signature)), index)


def load_module():
    name = "li_growth_hint_shape_independent_review"
    spec = importlib.util.spec_from_file_location(name, SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class GrowthHintShapeReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_module()

    def inspect(self, raw):
        result = self.module.inspect_synthetic_growth_hint(raw)
        self.assertEqual(result["schema"], "lupine.discovery.li_v3.growth_hint_shape.synthetic.v1")
        self.assertEqual(result["profile"], "li_v3.single_local_growth_hint_shape.synthetic.v1")
        self.assertEqual(result["status"], "BLOCKED_SCHEMA")
        self.assertIs(result["synthetic_fixture"], True)
        self.assertIs(result["source_identity_verified"], False)
        self.assertIsNone(result["observed"])
        self.assertEqual(result["production_prerequisite_status"], "UNBOUND")
        self.assertEqual(result["initial_padding_semantics"], "UNBOUND")
        self.assertIs(result["archive_acceptance_established"], False)
        self.assertEqual(result["scientific_evaluation_status"], "BLOCKED")
        self.assertNotIn("field_headers", result)
        for key in ("row_count", "paired_count", "source_group_count", "overlap_count"):
            self.assertIsNone(result[key])
        self.assertEqual(result["overlap_status"], "NOT_ASSESSED")
        for key in ("exactly_one_a220_record", "payload_length_at_least_four",
                    "signature_matches", "padding_all_zero"):
            self.assertTrue(result[key] is None or type(result[key]) is bool)
        exposure = result["exposure"]
        for key in ("xml_decoded", "worksheet_cells_decoded", "shared_strings_decoded",
                    "target_numeric_validity_checked", "scientific_eligibility_decisions",
                    "sampling_independence_established", "member_names_published"):
            self.assertIs(exposure[key], False)
        self.assertEqual(exposure["members_decompressed"], [])
        self.assertEqual(exposure["fits"], 0)
        self.assertEqual(exposure["splits"], 0)
        self.assertNotIn("PRIVATE_", json.dumps(result))
        return result

    def assert_match(self, result):
        self.assertEqual(result["reason"], "GROWTH_HINT_SHAPE_MATCH")
        self.assertEqual(result["growth_hint_shape"], "MATCHES_RETAINED_APPNOTE_SHAPE")
        for key in ("exactly_one_a220_record", "payload_length_at_least_four",
                    "signature_matches", "padding_all_zero"):
            self.assertIs(result[key], True)
        for key in ("local_extra_payload_interpreted", "growth_hint_locator_started",
                    "growth_hint_locator_completed", "growth_hint_payload_interpretation_started",
                    "growth_hint_fixed_words_interpreted", "growth_hint_padding_scan_started",
                    "growth_hint_padding_scan_completed", "growth_hint_payload_interpretation_completed"):
            self.assertIs(result["exposure"][key], True)

    def test_literal_little_endian_shape_at_first_middle_and_last_required_entry(self):
        # Handwritten bytes provide an oracle independent of growth_body's pack call.
        area = b"\x20\xa2\x04\x00\x28\xa0\x00\x00"
        for index in range(4):
            with self.subTest(index=index):
                result = self.inspect(with_extra(area, index))
                self.assert_match(result)

    def test_signature_byte_order_and_every_single_bit_difference(self):
        signatures = {0, 0xFFFF, 0x28A0} | {0xA028 ^ (1 << i) for i in range(16)}
        for signature in sorted(signatures):
            with self.subTest(signature=signature):
                result = self.inspect(growth_zip(65535, b"\0" * 5, signature))
                self.assertEqual(result["reason"], "GROWTH_SIGNATURE_MISMATCH")
                self.assertEqual(result["growth_hint_shape"], "DOES_NOT_MATCH")
                self.assertIs(result["signature_matches"], False)
                self.assertIsNone(result["padding_all_zero"])
                self.assertTrue(result["exposure"]["growth_hint_fixed_words_interpreted"])
                self.assertTrue(result["exposure"]["local_extra_payload_interpreted"])
                self.assertFalse(result["exposure"]["growth_hint_padding_scan_started"])
                self.assertFalse(result["exposure"]["growth_hint_payload_interpretation_completed"])

    def test_unsigned_pad_value_boundaries_are_withheld_and_not_length_constraints(self):
        values = {0, 1, 2, 127, 128, 255, 256, 257, 32767, 32768, 32769, 65534, 65535}
        values |= {n for bit in range(16) for n in ((1 << bit) - 1, 1 << bit, (1 << bit) + 1)
                   if 0 <= n <= 65535}
        for padding in (b"", b"\0", b"\0" * 19):
            baseline = self.inspect(growth_zip(0, padding))
            self.assert_match(baseline)
            for value in sorted(values):
                with self.subTest(padding_length=len(padding), pad_value=value):
                    result = self.inspect(growth_zip(value, padding))
                    self.assertEqual(result, baseline)

    def test_payload_size_zero_through_four_and_maximum_realizable_span(self):
        for size in range(4):
            with self.subTest(size=size):
                result = self.inspect(with_extra(tlv(0xA220, b"\x28\xa0\0\0"[:size])))
                self.assertEqual(result["reason"], "GROWTH_PAYLOAD_TOO_SHORT")
                self.assertEqual(result["growth_hint_shape"], "DOES_NOT_MATCH")
                self.assertIs(result["payload_length_at_least_four"], False)
                self.assertIsNone(result["signature_matches"])
                self.assertFalse(result["exposure"]["growth_hint_payload_interpretation_started"])
                self.assertFalse(result["exposure"]["local_extra_payload_interpreted"])
        self.assert_match(self.inspect(growth_zip(65535)))
        self.assert_match(self.inspect(growth_zip(0, b"\0" * 65527)))
        result = self.inspect(with_extra(tlv(0xA220, growth_body(0, b"\0" * 65527), declared=65535)))
        self.assertEqual(result["reason"], "GROWTH_PREDECESSOR_BLOCKED")
        self.assertEqual(result["predecessor_reason"], "EXTRA_DATA_TRUNCATED")
        self.assertFalse(result["exposure"]["growth_hint_payload_interpretation_started"])

    def test_nonzero_padding_first_middle_last_and_all_nonzero_byte_values(self):
        for position in (0, 4, 8):
            for value in (1, 127, 128, 255):
                padding = bytearray(9)
                padding[position] = value
                with self.subTest(position=position, value=value):
                    result = self.inspect(growth_zip(65535, bytes(padding)))
                    self.assertEqual(result["reason"], "GROWTH_PADDING_NONZERO")
                    self.assertEqual(result["growth_hint_shape"], "DOES_NOT_MATCH")
                    self.assertIs(result["signature_matches"], True)
                    self.assertIs(result["padding_all_zero"], False)
                    self.assertTrue(result["exposure"]["growth_hint_padding_scan_completed"])
                    self.assertTrue(result["exposure"]["growth_hint_payload_interpretation_completed"])
        for value in range(1, 256):
            with self.subTest(single_nonzero=value):
                result = self.inspect(growth_zip(0, bytes([value])))
                self.assertIs(result["padding_all_zero"], False)

    def test_padding_failure_public_projection_does_not_reveal_pad_value_or_byte_position(self):
        results = []
        for value in (0, 1, 255, 256, 65535):
            for padding in (b"\x01\0\0", b"\0\xff\0", b"\0\0\x80"):
                results.append(self.inspect(growth_zip(value, padding)))
        self.assertTrue(all(result == results[0] for result in results))

    def test_unknown_duplicate_and_mixed_outer_records_refused_before_payload(self):
        body = growth_body(0, b"PRIVATE_PAYLOAD_CANARY")
        areas = [tlv(0, body), tlv(0xFFFF, body), tlv(0x20A2, body),
                 tlv(0xA220, body) + tlv(0xA220, body),
                 tlv(0xA220, body) + tlv(1), tlv(1) + tlv(0xA220, body),
                 tlv(0xA220, body) + tlv(0x5455)]
        for index, area in enumerate(areas):
            with self.subTest(case=index):
                result = self.inspect(with_extra(area))
                self.assertEqual(result["reason"], "GROWTH_FIELD_SELECTION_BLOCKED")
                self.assertIs(result["exactly_one_a220_record"], False)
                self.assertEqual(result["growth_hint_shape"], "NOT_CHECKED")
                for flag in ("growth_hint_locator_started", "growth_hint_payload_interpretation_started",
                             "local_extra_payload_interpreted"):
                    self.assertFalse(result["exposure"][flag])

    def test_g29_header_truncation_record_limit_and_prior_profile_gates_unchanged(self):
        area = tlv(0xA220, growth_body())
        cases = [(raw_zip(), "PREDECESSOR_PATH_MISMATCH"),
                 (with_extra(area, central={"flags": 1}), "PREDECESSOR_PATH_MISMATCH"),
                 (with_extra(area, local={"signature": b"NOPE"}), "PREDECESSOR_PATH_MISMATCH"),
                 (with_extra(b"x"), "EXTRA_HEADER_TRUNCATED"),
                 (with_extra(tlv(0xA220, b"x", declared=4)), "EXTRA_DATA_TRUNCATED"),
                 (with_extra(tlv(0xA220) * 257), "EXTRA_RECORD_LIMIT")]
        for raw, expected in cases:
            with self.subTest(expected=expected):
                result = self.inspect(raw)
                self.assertEqual(result["predecessor_reason"], expected)
                self.assertEqual(result["reason"], "GROWTH_PREDECESSOR_BLOCKED")
                self.assertEqual(result["growth_hint_shape"], "NOT_CHECKED")
                self.assertFalse(result["exposure"]["growth_hint_locator_started"])
                self.assertFalse(result["exposure"]["local_extra_payload_interpreted"])

    def test_stored_deflated_flag_profiles_retain_same_structural_result(self):
        for method, flags in [(0, value) for value in (0, 0x800)] + [
                (8, value) for value in (0, 2, 4, 6, 0x800, 0x802, 0x804, 0x806)]:
            with self.subTest(method=method, flags=flags):
                entries = [entry(name, method=method, flags=flags) for name in REQUIRED]
                entries[2]["local"]["extra"] = tlv(0xA220, growth_body(65535, b"\0" * 9))
                self.assert_match(self.inspect(raw_zip(entries)))

    def test_first_selected_entry_controls_shape_without_later_member_approval(self):
        entries = [entry(name) for name in REQUIRED]
        entries[1]["local"]["extra"] = tlv(0xA220, growth_body(0, b"\0"))
        entries[2]["local"]["extra"] = tlv(0xA220, growth_body(0, b"bad"))
        entries[3]["local"]["signature"] = b"NOPE"
        self.assert_match(self.inspect(raw_zip(entries)))

    def test_padding_scan_visits_entire_remainder_after_first_nonzero(self):
        raw = growth_zip(0, b"\x01" + b"\0" * 30)
        visited = []
        def scan(start, end):
            for position in range(start, end):
                visited.append(position)
                yield position
        with patch.object(self.module, "range", side_effect=scan, create=True):
            result = self.inspect(raw)
        padding_start = 30 + len(REQUIRED[0].encode()) + 8
        self.assertEqual(visited, list(range(padding_start, padding_start + 31)))
        self.assertEqual(result["reason"], "GROWTH_PADDING_NONZERO")
        self.assertTrue(result["exposure"]["growth_hint_padding_scan_completed"])

    def test_second_locator_failure_preserves_prior_and_attempt_exposure(self):
        original = self.module.predecessor._locate
        calls = []
        def locate(raw, exposure):
            calls.append(1)
            if len(calls) == 2:
                exposure["local_header_locator_started"] = True
                raise RuntimeError("PRIVATE_LOCATOR_CANARY")
            return original(raw, exposure)
        with patch.object(self.module.predecessor, "_locate", side_effect=locate):
            result = self.inspect(growth_zip())
        self.assertEqual(len(calls), 2)
        self.assertEqual(result["reason"], "GROWTH_PAYLOAD_INSPECTION_FAILED")
        self.assertEqual(result["growth_hint_shape"], "NOT_ESTABLISHED")
        self.assertTrue(result["exposure"]["local_header_locator_completed"])
        self.assertTrue(result["exposure"]["local_extra_header_walk_completed"])
        self.assertTrue(result["exposure"]["growth_hint_locator_started"])
        self.assertFalse(result["exposure"]["growth_hint_locator_completed"])
        self.assertFalse(result["exposure"]["growth_hint_payload_interpretation_started"])

    def test_relocated_span_mismatch_blocks_before_fixed_word_decode(self):
        original = self.module.predecessor._locate
        for mutation in ("boolean_start", "negative_start", "beyond_raw", "length_disagrees"):
            calls = []
            def locate(raw, exposure):
                calls.append(1)
                start, end = original(raw, exposure)
                if len(calls) == 2:
                    return {"boolean_start": (True, end), "negative_start": (-1, end),
                            "beyond_raw": (start, len(raw) + 1),
                            "length_disagrees": (start + 1, end)}[mutation]
                return start, end
            with self.subTest(mutation=mutation), \
                    patch.object(self.module.predecessor, "_locate", side_effect=locate):
                result = self.inspect(growth_zip())
            self.assertEqual(result["reason"], "GROWTH_SPAN_MISMATCH")
            self.assertFalse(result["exposure"]["growth_hint_payload_interpretation_started"])
            self.assertFalse(result["exposure"]["local_extra_payload_interpreted"])

    def test_fixed_word_failure_preserves_interpretation_attempt(self):
        original = struct.unpack_from
        payload_start = 30 + len(REQUIRED[0].encode()) + 4
        def unpack(fmt, raw, offset=0):
            if fmt == "<HH" and offset == payload_start:
                raise RuntimeError("PRIVATE_FIXED_WORD_CANARY")
            return original(fmt, raw, offset)
        with patch.object(self.module.struct, "unpack_from", side_effect=unpack):
            result = self.inspect(growth_zip(65535, b"\0" * 3))
        self.assertEqual(result["reason"], "GROWTH_PAYLOAD_INSPECTION_FAILED")
        self.assertEqual(result["growth_hint_shape"], "NOT_ESTABLISHED")
        self.assertTrue(result["exposure"]["growth_hint_payload_interpretation_started"])
        self.assertTrue(result["exposure"]["local_extra_payload_interpreted"])
        self.assertFalse(result["exposure"]["growth_hint_fixed_words_interpreted"])
        self.assertFalse(result["exposure"]["growth_hint_padding_scan_started"])
        self.assertFalse(result["exposure"]["growth_hint_payload_interpretation_completed"])
        self.assertIsNone(result["signature_matches"])

    def test_partial_padding_scan_failure_keeps_completed_prefix_exposure(self):
        def scan(start, end):
            yield start
            yield start + 1
            raise RuntimeError("PRIVATE_SCAN_CANARY")
        with patch.object(self.module, "range", side_effect=scan, create=True):
            result = self.inspect(growth_zip(7, b"\0" * 12))
        self.assertEqual(result["reason"], "GROWTH_PAYLOAD_INSPECTION_FAILED")
        self.assertEqual(result["growth_hint_shape"], "NOT_ESTABLISHED")
        self.assertTrue(result["signature_matches"])
        self.assertIsNone(result["padding_all_zero"])
        self.assertTrue(result["exposure"]["growth_hint_fixed_words_interpreted"])
        self.assertTrue(result["exposure"]["growth_hint_padding_scan_started"])
        self.assertFalse(result["exposure"]["growth_hint_padding_scan_completed"])
        self.assertFalse(result["exposure"]["growth_hint_payload_interpretation_completed"])

    def test_member_decompression_xml_network_and_production_helpers_forbidden(self):
        raw = growth_zip(65535, b"\0" * 10)
        forbidden = AssertionError("PRIVATE_FORBIDDEN_API_CANARY")
        with ExitStack() as stack:
            for name in ("open", "read", "extract", "extractall", "testzip"):
                stack.enter_context(patch.object(zipfile.ZipFile, name, side_effect=forbidden))
            for name in ("decompress", "decompressobj"):
                stack.enter_context(patch.object(zlib, name, side_effect=forbidden))
            for name in ("fromstring", "parse", "iterparse", "XML"):
                stack.enter_context(patch.object(ET, name, side_effect=forbidden))
            stack.enter_context(patch.object(socket, "socket", side_effect=forbidden))
            stack.enter_context(patch.object(socket, "create_connection", side_effect=forbidden))
            stack.enter_context(patch.object(socket, "getaddrinfo", side_effect=forbidden))
            stack.enter_context(patch.object(urllib.request, "urlopen", side_effect=forbidden))
            guards = [stack.enter_context(patch.object(self.module.predecessor, name, side_effect=forbidden))
                      for name in ("production_context", "diagnose", "_validate_prerequisite")]
            guards.append(stack.enter_context(patch.object(self.module.predecessor.custody,
                                                           "_read_relative", side_effect=forbidden)))
            result = self.inspect(raw)
            for guard in guards:
                guard.assert_not_called()
        self.assert_match(result)

    def test_type_size_and_known_actual_identity_barriers_use_synthetic_bytes(self):
        prior = self.module.predecessor
        for raw in (None, "", bytearray(), memoryview(b""), 1, False):
            with self.subTest(raw_type=type(raw).__name__):
                with self.assertRaisesRegex(prior.custody.CustodyError, "^RAW_TYPE_INVALID$"):
                    self.module.inspect_synthetic_growth_hint(raw)
        with self.assertRaisesRegex(prior.custody.CustodyError, "^SOURCE_SIZE_MISMATCH$"):
            self.module.inspect_synthetic_growth_hint(b"x" * (prior.custody.SOURCE_BYTES + 1))
        with patch.object(prior.hashlib, "sha256", return_value=SimpleNamespace(
                hexdigest=lambda: prior.header_diagnostic.OBJECT_SHA256)):
            with self.assertRaisesRegex(prior.custody.CustodyError, "^SYNTHETIC_REAL_SOURCE_FORBIDDEN$"):
                self.module.inspect_synthetic_growth_hint(b"unrelated fixture bytes")
        with patch.object(prior.hashlib, "md5", return_value=SimpleNamespace(
                hexdigest=lambda: prior.custody.SOURCE_MD5)):
            with self.assertRaisesRegex(prior.custody.CustodyError, "^SYNTHETIC_REAL_SOURCE_FORBIDDEN$"):
                self.module.inspect_synthetic_growth_hint(b"x" * prior.custody.SOURCE_BYTES)

    def test_archive_close_failure_preserves_predecessor_exposure_and_blocks_new_stage(self):
        original = zipfile.ZipFile.close
        def fail_open(archive):
            if archive.fp is not None:
                raise RuntimeError("PRIVATE_CLOSE_CANARY")
            return original(archive)
        stderr, unraisable = io.StringIO(), []
        with redirect_stderr(stderr), patch.object(sys, "unraisablehook", side_effect=unraisable.append), \
                patch.object(zipfile.ZipFile, "close", fail_open):
            result = self.inspect(growth_zip())
            gc.collect()
        self.assertEqual(result["reason"], "GROWTH_PREDECESSOR_BLOCKED")
        self.assertEqual(result["predecessor_reason"], "PREDECESSOR_CLEANUP_FAILED")
        self.assertTrue(result["exposure"]["directory_name_decoding_completed"])
        self.assertTrue(result["exposure"]["archive_close_started"])
        self.assertFalse(result["exposure"]["archive_close_completed"])
        self.assertEqual(result["exposure"]["archive_close_error"], "ARCHIVE_CLOSE_FAILED")
        self.assertFalse(result["exposure"]["growth_hint_locator_started"])
        self.assertFalse(result["exposure"]["local_extra_payload_interpreted"])
        self.assertEqual(stderr.getvalue(), "")
        self.assertEqual(unraisable, [])

    def test_no_production_api_or_prerequisite_override_is_exposed(self):
        self.assertIsNone(self.module.PRODUCTION_PREREQUISITE)
        for name in ("production_context", "diagnose", "main"):
            self.assertFalse(hasattr(self.module, name))
        for override in ("path", "url", "source", "prerequisite", "producer"):
            with self.subTest(override=override):
                with self.assertRaises(TypeError):
                    self.module.inspect_synthetic_growth_hint(growth_zip(), **{override: "PRIVATE_OVERRIDE_CANARY"})

    def test_all_25_public_predecessor_audit_pins_match_code_bytes(self):
        self.assertEqual(len(self.module.PREDECESSOR_FILES), 25)
        for relative, digest in self.module.PREDECESSOR_FILES.items():
            with self.subTest(relative=relative):
                self.assertFalse(relative.startswith(".cache/"))
                self.assertEqual(hashlib.sha256((DISCOVERY / relative).read_bytes()).hexdigest(), digest)

    def test_report_state_is_fresh_after_mutation_and_a_prior_rejection(self):
        first = self.inspect(growth_zip())
        first["signature_matches"] = "mutated"
        first["exposure"]["members_decompressed"].append("mutated")
        first["predecessor_classification"]["categories"].append("mutated")
        second = self.inspect(growth_zip(signature=0))
        self.assertEqual(second["reason"], "GROWTH_SIGNATURE_MISMATCH")
        self.assertEqual(second["exposure"]["members_decompressed"], [])
        self.assertEqual(second["predecessor_classification"]["categories"], ["LOCAL_EXTRA_PRESENT"])
        self.assert_match(self.inspect(growth_zip()))


if __name__ == "__main__":
    unittest.main()
