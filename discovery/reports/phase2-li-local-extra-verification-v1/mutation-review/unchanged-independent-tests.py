"""Independent synthetic first-local-extra header checks.

Fixtures are packed here from raw local, central and end records, reusing only
this reviewer's earlier fixture builder. No author test fixture or actual source,
receipt, network resource, or private custody object is used.
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
SCRIPT = DISCOVERY / "scripts/li_v3_local_extra_headers.py"
if not SCRIPT.is_file():
    SCRIPT = (DISCOVERY / ".cache/phase2-li-local-extra-candidate-v1/promotion/scripts/"
              "li_v3_local_extra_headers.py")
REQUIRED = ("[Content_Types].xml", "_rels/.rels", "xl/workbook.xml",
            "xl/_rels/workbook.xml.rels")


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


def load_module():
    name = "li_local_extra_headers_independent_review"
    spec = importlib.util.spec_from_file_location(name, SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class LocalExtraHeadersReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_module()

    def inspect(self, raw):
        result = self.module.inspect_synthetic_local_extra(raw)
        self.assertEqual(result["schema"], "lupine.discovery.li_v3.local_extra_headers.v1")
        self.assertEqual(result["profile"], "li_v3.first_local_extra_headers.v1")
        self.assertEqual(result["status"], "BLOCKED_SCHEMA")
        self.assertIs(result["synthetic_fixture"], True)
        self.assertIs(result["source_identity_verified"], False)
        self.assertIsNone(result["observed"])
        for key in ("row_count", "paired_count", "source_group_count", "overlap_count"):
            self.assertIsNone(result[key])
        self.assertEqual(result["overlap_status"], "NOT_ASSESSED")
        exposure = result["exposure"]
        for key in ("xml_decoded", "worksheet_cells_decoded", "shared_strings_decoded",
                    "target_numeric_validity_checked", "scientific_eligibility_decisions",
                    "sampling_independence_established", "member_names_published",
                    "local_extra_payload_interpreted"):
            self.assertIs(exposure[key], False)
        self.assertEqual(exposure["members_decompressed"], [])
        self.assertEqual(exposure["fits"], 0)
        self.assertEqual(exposure["splits"], 0)
        self.assertNotIn("PRIVATE_", json.dumps(result))
        if result["field_headers"] is not None:
            for key in ("local_header_locator_started", "local_header_locator_completed",
                        "local_extra_header_walk_started", "local_extra_header_walk_completed"):
                self.assertIs(exposure[key], True)
            self.assertLessEqual(len(result["field_headers"]), 256)
            for header in result["field_headers"]:
                self.assertEqual(set(header), {"header_id", "data_size"})
                for value in header.values():
                    self.assertIs(type(value), int)
                    self.assertLessEqual(0, value)
                    self.assertLessEqual(value, 65535)
        return result

    def test_first_and_each_middle_entry_same_complete_inventory(self):
        area = tlv(0x0102, b"PRIVATE_BODY_CANARY") + tlv(0xABCD)
        expected = [{"header_id": 0x0102, "data_size": 19},
                    {"header_id": 0xABCD, "data_size": 0}]
        for index in range(4):
            with self.subTest(index=index):
                result = self.inspect(with_extra(area, index))
                self.assertEqual(result["field_headers"], expected)
                self.assertEqual(result["reason"], "LOCAL_EXTRA_HEADERS_COMPLETE")

    def test_all_unsigned_id_byte_boundaries_order_duplicates_and_zero_lengths(self):
        ids = [0, 1, 255, 256, 257, 0x7075, 0x6375, 0xA220,
               0xFFFF, 0xA220, 0, 0x9901, 0x000A, 0x5455]
        area = b"".join(tlv(value) for value in ids)
        result = self.inspect(with_extra(area))
        self.assertEqual(result["field_headers"], [
            {"header_id": value, "data_size": 0} for value in ids])

    def test_declared_length_is_little_endian_and_payload_is_opaque(self):
        for size in (0, 1, 255, 256, 257, 4096):
            with self.subTest(size=size):
                result = self.inspect(with_extra(tlv(0x0201, b"x" * size)))
                self.assertEqual(result["field_headers"], [{"header_id": 513, "data_size": size}])
        payload_a = b"PRIVATE_XML_CANARY<sheet><v>99999</v></sheet>"
        payload_b = b"\xff" * len(payload_a)
        self.assertEqual(self.inspect(with_extra(tlv(0x7075, payload_a))),
                         self.inspect(with_extra(tlv(0x7075, payload_b))))

    def test_complete_field_span_65535_bytes_and_data_length_65531(self):
        result = self.inspect(with_extra(tlv(65535, b"x" * 65531)))
        self.assertEqual(result["field_headers"], [{"header_id": 65535, "data_size": 65531}])
        self.assertEqual(result["reason"], "LOCAL_EXTRA_HEADERS_COMPLETE")

    def test_incomplete_headers_never_publish_completed_prefix(self):
        for prefix in (b"", tlv(10, b"safe")):
            for tail_size in (1, 2, 3):
                with self.subTest(prefix=bool(prefix), tail_size=tail_size):
                    result = self.inspect(with_extra(prefix + b"x" * tail_size))
                    self.assertEqual(result["reason"], "EXTRA_HEADER_TRUNCATED")
                    self.assertIsNone(result["field_headers"])

    def test_overlong_data_never_publishes_partial_inventory(self):
        for prefix in (b"", tlv(10)):
            for payload, declared in ((b"", 1), (b"x", 2), (b"x", 65535)):
                with self.subTest(prefix=bool(prefix), declared=declared):
                    result = self.inspect(with_extra(prefix + tlv(100, payload, declared)))
                    self.assertEqual(result["reason"], "EXTRA_DATA_TRUNCATED")
                    self.assertIsNone(result["field_headers"])

    def test_exact_record_limit_and_one_more_byte_or_record(self):
        area = tlv(7) * 256
        result = self.inspect(with_extra(area))
        self.assertEqual(result["field_headers"], [{"header_id": 7, "data_size": 0}] * 256)
        for suffix in (b"x", b"xyz", tlv(8), tlv(8, b"payload")):
            with self.subTest(suffix_length=len(suffix)):
                result = self.inspect(with_extra(area + suffix))
                self.assertEqual(result["reason"], "EXTRA_RECORD_LIMIT")
                self.assertIsNone(result["field_headers"])

    def test_first_extra_wins_without_later_profile_acceptance(self):
        entries = [entry(name) for name in REQUIRED]
        entries[1]["local"]["extra"] = tlv(100, b"x")
        entries[2]["local"].update(extra=tlv(999), signature=b"NOPE")
        entries[3]["central"]["name"] = b"PRIVATE_LATER_UNKNOWN_CANARY.xml"
        result = self.inspect(raw_zip(entries))
        self.assertEqual(result["field_headers"], [{"header_id": 100, "data_size": 1}])

    def test_public_inventory_does_not_depend_on_selected_allowed_member_name(self):
        results = []
        for name in ("xl/worksheets/sheet1.xml", "xl/worksheets/sheet999.xml"):
            selected = entry(name, local={"extra": tlv(0x7075, b"PRIVATE_PAYLOAD_CANARY")})
            result = self.inspect(raw_zip([selected] + [entry(n) for n in REQUIRED]))
            self.assertNotIn(name, json.dumps(result))
            results.append(result)
        self.assertEqual(results[0], results[1])

    def test_mixed_local_central_and_earlier_rejections_publish_no_inventory(self):
        area = tlv(1)
        cases = {
            "accepted_no_extra": raw_zip(),
            "local_signature": with_extra(area, local={"signature": b"NOPE"}),
            "local_name": with_extra(area, local={"name": b"different.xml"}),
            "local_compressed": with_extra(area, local={"compressed": 999999}),
            "central_extra": with_extra(area, central={"extra": tlv(4)}),
            "central_flags": with_extra(area, central={"flags": 1}),
            "central_offset": with_extra(area, central={"offset": 1}),
            "raw_short": b"PRIVATE_RAW_CANARY",
            "end_disk": raw_zip(end={"disk": 1}),
        }
        earlier = [entry(name) for name in REQUIRED]
        earlier[0]["local"]["signature"] = b"NOPE"
        earlier[2]["local"]["extra"] = area
        cases["earlier_local_rejection"] = raw_zip(earlier)
        for name, raw in cases.items():
            with self.subTest(case=name):
                result = self.inspect(raw)
                self.assertIsNone(result["field_headers"])
                self.assertNotEqual(result["reason"], "LOCAL_EXTRA_HEADERS_COMPLETE")

    def test_member_payload_apis_xml_and_network_forbidden(self):
        raw = with_extra(tlv(0x7075, b"PRIVATE_EXTRA_XML_CANARY"), index=2)
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
            stack.enter_context(patch.object(urllib.request, "urlopen", side_effect=forbidden))
            result = self.inspect(raw)
        self.assertEqual(result["reason"], "LOCAL_EXTRA_HEADERS_COMPLETE")

    def test_synthetic_input_type_and_size_guards(self):
        for raw in (None, "", bytearray(), memoryview(b""), 1, False):
            with self.subTest(type=type(raw).__name__):
                with self.assertRaisesRegex(self.module.custody.CustodyError, "^RAW_TYPE_INVALID$"):
                    self.module.inspect_synthetic_local_extra(raw)
        with self.assertRaisesRegex(self.module.custody.CustodyError, "^SOURCE_SIZE_MISMATCH$"):
            self.module.inspect_synthetic_local_extra(b"x" * (self.module.custody.SOURCE_BYTES + 1))

    def test_permitted_stored_deflated_flag_profiles_do_not_interpret_payload(self):
        for method, flags in [(0, n) for n in (0, 0x800)] + [
                (8, n) for n in (0, 2, 4, 6, 0x800, 0x802, 0x804, 0x806)]:
            with self.subTest(method=method, flags=flags):
                entries = [entry(name, method=method, flags=flags) for name in REQUIRED]
                entries[2]["local"]["extra"] = tlv(0xBEEF, b"opaque")
                result = self.inspect(raw_zip(entries))
                self.assertEqual(result["field_headers"], [{"header_id": 0xBEEF, "data_size": 6}])

    def test_128th_local_entry_and_member_limit(self):
        entries = [entry(name) for name in REQUIRED]
        entries.extend(entry(f"xl/worksheets/sheet{i}.xml") for i in range(1, 125))
        self.assertEqual(len(entries), 128)
        entries[-1]["local"]["extra"] = tlv(99)
        result = self.inspect(raw_zip(entries))
        self.assertEqual(result["field_headers"], [{"header_id": 99, "data_size": 0}])
        entries.append(entry("xl/worksheets/sheet999.xml"))
        result = self.inspect(raw_zip(entries))
        self.assertIsNone(result["field_headers"])
        self.assertEqual(result["reason"], "PREDECESSOR_PATH_MISMATCH")

    def test_predecessor_name_limit_cannot_be_bypassed_by_16_bit_locator(self):
        prefix, suffix = "xl/worksheets/sheet", ".xml"
        for name_size in (256, 257, 65535):
            with self.subTest(name_size=name_size):
                name = prefix + "1" * (name_size - len(prefix) - len(suffix)) + suffix
                entries = [entry(name)] + [entry(n) for n in REQUIRED]
                entries[1]["local"]["extra"] = tlv(88)
                result = self.inspect(raw_zip(entries))
                if name_size == 256:
                    self.assertEqual(result["field_headers"], [{"header_id": 88, "data_size": 0}])
                else:
                    self.assertIsNone(result["field_headers"])
                    self.assertEqual(result["reason"], "PREDECESSOR_PATH_MISMATCH")
                    self.assertEqual(result["predecessor_classification"]["reason"], "MEMBER_PATH_PROFILE")
                    self.assertFalse(result["exposure"]["local_header_locator_started"])
                self.assertNotIn(name, json.dumps(result))

    def test_exact_predecessor_result_and_cleanup_are_required_before_locator(self):
        expected = {
            "reason": "LOCAL_EXTRA_PRESENT", "categories": ["LOCAL_EXTRA_PRESENT"],
            "primary_categories": ["LOCAL_EXTRA_PRESENT"], "supplementary_local_categories": [],
            "compatible_reason": "ZIP_LAYOUT_UNSUPPORTED", "first_rejection_stage": "entry_local",
            "same_entry_local_checks": "CHECKED",
        }
        self.assertEqual(self.module.EXPECTED_CLASSIFICATION, expected)
        mutations = {
            "reason": "LOCAL_SIGNATURE", "categories": ["LOCAL_EXTRA_PRESENT", "LOCAL_SIGNATURE"],
            "primary_categories": [], "supplementary_local_categories": ["LOCAL_EXTRA_PRESENT"],
            "compatible_reason": "ZIP_INVALID", "first_rejection_stage": "entry_central",
            "same_entry_local_checks": "NOT_REACHED",
        }
        for key, value in mutations.items():
            with self.subTest(key=key):
                classification = deepcopy(expected)
                classification[key] = value
                def classify(raw, exposure):
                    exposure.update(header_checks_started=True, directory_name_decoding_started=True,
                                    directory_name_decoding_completed=True, archive_close_started=True,
                                    archive_close_completed=True)
                    return classification
                with patch.object(self.module.diagnostic, "_classify", side_effect=classify), \
                        patch.object(self.module, "_locate") as locate:
                    result = self.inspect(with_extra(tlv(1)))
                self.assertEqual(result["reason"], "PREDECESSOR_PATH_MISMATCH")
                self.assertEqual(result["predecessor_classification"], classification)
                self.assertIsNone(result["field_headers"])
                self.assertTrue(result["exposure"]["directory_name_decoding_completed"])
                locate.assert_not_called()
        for key, value in (("archive_close_started", False), ("archive_close_completed", False),
                           ("archive_close_completed", 1), ("archive_close_error", "ARCHIVE_CLOSE_FAILED")):
            with self.subTest(cleanup=key, value=value):
                def classify(raw, exposure):
                    exposure.update(header_checks_started=True, archive_close_started=True,
                                    archive_close_completed=True, archive_close_error=None)
                    exposure[key] = value
                    return deepcopy(expected)
                with patch.object(self.module.diagnostic, "_classify", side_effect=classify), \
                        patch.object(self.module, "_locate") as locate:
                    result = self.inspect(with_extra(tlv(1)))
                self.assertEqual(result["reason"], "PREDECESSOR_CLEANUP_FAILED")
                locate.assert_not_called()

    def test_locator_rejects_fixed_header_name_extra_and_compressed_crossings(self):
        baseline = with_extra(tlv(1))
        footer = list(struct.unpack("<4s4H2LH", baseline[-22:]))
        directory = footer[6]
        cases = {"short": b"x", "no_positive_extra": raw_zip()}
        for label, offset, fmt, value in (
                ("signature", 0, "<4s", b"NOPE"),
                ("name_crossing", 26, "<H", 65535),
                ("extra_crossing", 28, "<H", 65535),
                ("compressed_crossing", 18, "<L", 0xFFFFFFFF)):
            raw = bytearray(baseline)
            struct.pack_into(fmt, raw, offset, value)
            cases[label] = bytes(raw)
        for size in (0, 1, 29):
            cases[f"fixed_{size}"] = replace_local_area(baseline, b"x" * size)
        for label, index, value in (("count_zero", 4, 0), ("count_129", 4, 129),
                                    ("directory_oob", 6, 0xFFFFFFFF),
                                    ("directory_size", 5, footer[5] + 1)):
            changed = list(footer)
            changed[index] = value
            cases[label] = baseline[:-22] + struct.pack("<4s4H2LH", *changed)
        for label, raw in cases.items():
            with self.subTest(case=label):
                exposure = self.module._base(True)["exposure"]
                with self.assertRaisesRegex(self.module.LocalExtraError, "^LOCAL_EXTRA_LOCATOR_MISMATCH$"):
                    self.module._locate(raw, exposure)
                self.assertTrue(exposure["local_header_locator_started"])
                self.assertFalse(exposure["local_header_locator_completed"])
                self.assertFalse(exposure["local_extra_header_walk_started"])
        # The selected extra span can end exactly at the directory: zero data.
        zero = entry(REQUIRED[0], content=b"", local={"extra": tlv(1)})
        raw = raw_zip([zero])
        exposure = self.module._base(True)["exposure"]
        start, end = self.module._locate(raw, exposure)
        self.assertEqual(end, struct.unpack("<4s4H2LH", raw[-22:])[6])
        self.assertEqual(end - start, 4)

    def test_walk_only_unpacks_headers_and_stops_before_257th_header(self):
        original_unpack = struct.unpack_from
        payload = b"PRIVATE_BODY_CANARY" * 5
        raw = tlv(1, payload) + tlv(2, b"opaque") + tlv(1)
        offsets = []
        def unpack(fmt, buffer, offset=0):
            self.assertEqual(fmt, "<HH")
            self.assertIs(buffer, raw)
            offsets.append(offset)
            return original_unpack(fmt, buffer, offset)
        with patch.object(self.module.struct, "unpack_from", side_effect=unpack):
            fields = self.module._walk(raw, 0, len(raw), self.module._base(True)["exposure"])
        self.assertEqual(offsets, [0, 4 + len(payload), 14 + len(payload)])
        self.assertEqual(fields, [{"header_id": 1, "data_size": len(payload)},
                                 {"header_id": 2, "data_size": 6}, {"header_id": 1, "data_size": 0}])
        raw = tlv(1) * 257
        with patch.object(self.module.struct, "unpack_from", wraps=original_unpack) as unpack:
            with self.assertRaisesRegex(self.module.LocalExtraError, "^EXTRA_RECORD_LIMIT$"):
                self.module._walk(raw, 0, len(raw), self.module._base(True)["exposure"])
        self.assertEqual(unpack.call_count, 256)

    def test_walk_requires_bounded_nonempty_integer_span(self):
        raw = b"x" * 65536
        for start, end in ((False, 4), (0, True), (0.0, 4), (0, 4.0), (-1, 4),
                           (4, 4), (5, 4), (0, 65536), (0, 65537)):
            with self.subTest(start=start, end=end):
                exposure = self.module._base(True)["exposure"]
                with self.assertRaisesRegex(self.module.LocalExtraError, "^LOCAL_EXTRA_LOCATOR_MISMATCH$"):
                    self.module._walk(raw, start, end, exposure)
                self.assertTrue(exposure["local_extra_header_walk_started"])
                self.assertFalse(exposure["local_extra_header_walk_completed"])

    def test_partial_walk_and_locator_exceptions_keep_exposure_without_canary(self):
        for helper, started in (("_locate", "local_header_locator_started"),
                                ("_walk", "local_extra_header_walk_started")):
            with self.subTest(helper=helper):
                def fail(*args):
                    args[-1][started] = True
                    raise RuntimeError("PRIVATE_PARSE_CANARY")
                with patch.object(self.module, helper, side_effect=fail):
                    result = self.inspect(with_extra(tlv(1)))
                self.assertEqual(result["reason"], "LOCAL_EXTRA_PARSE_FAILED")
                self.assertTrue(result["exposure"][started])
                self.assertTrue(result["exposure"]["directory_name_decoding_completed"])
                self.assertTrue(result["exposure"]["archive_close_completed"])
                self.assertIsNone(result["field_headers"])

    def test_real_source_identity_barriers_use_synthetic_digest_stubs(self):
        with patch.object(self.module.hashlib, "sha256", return_value=SimpleNamespace(
                hexdigest=lambda: self.module.header_diagnostic.OBJECT_SHA256)):
            with self.assertRaisesRegex(self.module.custody.CustodyError, "^SYNTHETIC_REAL_SOURCE_FORBIDDEN$"):
                self.module.inspect_synthetic_local_extra(b"unrelated synthetic bytes")
        with patch.object(self.module.hashlib, "md5", return_value=SimpleNamespace(
                hexdigest=lambda: self.module.custody.SOURCE_MD5)):
            with self.assertRaisesRegex(self.module.custody.CustodyError, "^SYNTHETIC_REAL_SOURCE_FORBIDDEN$"):
                self.module.inspect_synthetic_local_extra(b"x" * self.module.custody.SOURCE_BYTES)

    def test_archive_close_failure_keeps_exposure_and_closes_exception_channel(self):
        original_close = zipfile.ZipFile.close
        def fail_while_open(archive):
            if archive.fp is not None:
                raise RuntimeError("PRIVATE_CLOSE_CANARY")
            return original_close(archive)
        stderr, unraisable = io.StringIO(), []
        with redirect_stderr(stderr), patch.object(sys, "unraisablehook", side_effect=unraisable.append), \
                patch.object(zipfile.ZipFile, "close", fail_while_open):
            result = self.inspect(with_extra(tlv(99)))
            gc.collect()
        self.assertEqual(result["reason"], "PREDECESSOR_CLEANUP_FAILED")
        self.assertTrue(result["exposure"]["directory_name_decoding_completed"])
        self.assertTrue(result["exposure"]["archive_close_started"])
        self.assertFalse(result["exposure"]["archive_close_completed"])
        self.assertEqual(result["exposure"]["archive_close_error"], "ARCHIVE_CLOSE_FAILED")
        self.assertFalse(result["exposure"]["local_header_locator_started"])
        self.assertIsNone(result["field_headers"])
        self.assertEqual(stderr.getvalue(), "")
        self.assertEqual(unraisable, [])

    def test_prerequisite_digest_and_producer_guard_with_synthetic_bytes_only(self):
        raw = json.dumps({"implementation": {"commit": self.module.PREREQUISITE_PRODUCER}}).encode()
        digest = hashlib.sha256(raw).hexdigest()
        with patch.object(self.module, "PREREQUISITE_SHA256", digest):
            self.assertEqual(self.module._validate_prerequisite(raw), digest)
            for changed in (raw[:-1], raw + b" ", bytearray(raw), None):
                with self.subTest(changed_type=type(changed).__name__):
                    with self.assertRaisesRegex(self.module.LocalExtraError, "^LOCAL_EXTRA_PREREQUISITE_INVALID$"):
                        self.module._validate_prerequisite(changed)
        for data in ({"implementation": {"commit": "b" * 40}}, {}, {"implementation": None}):
            raw = json.dumps(data).encode()
            with patch.object(self.module, "PREREQUISITE_SHA256", hashlib.sha256(raw).hexdigest()):
                with self.assertRaisesRegex(self.module.LocalExtraError, "^LOCAL_EXTRA_PREREQUISITE_INVALID$"):
                    self.module._validate_prerequisite(raw)
        self.assertEqual(self.module.PREREQUISITE_SHA256,
                         "4ee25afe053f68b4b9331a9ebc94bccb2e1d96e0ce5700d78a45866ef7b0cc12")
        self.assertEqual(self.module.PREREQUISITE_PRODUCER, "a6e87c198d8116d26c523e0e1b2eedce4aeb225b")

    def test_all_21_public_predecessor_source_pins_remain_exact(self):
        module = self.module
        pins = {}
        for mapping in (module.PRIOR_FILES, module.diagnostic.PRIOR_FILES,
                        module.compatible.PRIOR_FILES,
                        module.compatible.flag_diagnostic.PRIOR_FILES,
                        module.header_diagnostic.LEGACY_FILES):
            for relative, digest in mapping.items():
                self.assertNotIn(relative, pins)
                pins[relative] = digest
        self.assertEqual(len(pins), 21)
        for relative, digest in pins.items():
            with self.subTest(relative=relative):
                self.assertEqual(hashlib.sha256((DISCOVERY / relative).read_bytes()).hexdigest(), digest)

    def test_invalid_run_and_candidate_path_guard_precede_reads(self):
        with patch.object(self.module, "production_context") as context, \
                patch.object(self.module.custody, "_read_relative") as read:
            for run in (None, True, 1, 2, "0", "3", "01", "../1", "1\n"):
                result = self.module.diagnose(run)
                self.assertEqual(result["status"], "BLOCKED_GUARD")
                self.assertEqual(result["reason"], "CLI_ARGUMENT_INVALID")
                self.assertFalse(result["exposure"]["raw_buffer_read_started"])
            context.assert_not_called()
            read.assert_not_called()
        with patch.object(self.module, "__file__", str(self.module.ROOT / "wrong-path.py")), \
                patch.object(self.module.diagnostic, "production_context") as prior:
            with self.assertRaisesRegex(self.module.custody.CustodyError, "^FROZEN_SOURCE_REQUIRED$"):
                self.module.production_context()
            prior.assert_not_called()

    def simulated_production(self, failure=None):
        """Synthetic bytes and mocked descriptors only; no custody filesystem I/O."""
        module = self.module
        reads, writes = [], []
        raw = with_extra(tlv(77, b"opaque"), index=2)
        identity = {"mode": "committed_source", "commit": "a" * 40, "files": {}}
        def read(relative, cap):
            reads.append((relative, cap))
            if relative == module.PREREQUISITE:
                return b"synthetic prerequisite"
            if relative == module.custody.CAPTURE:
                return b"synthetic capture"
            if relative == module.custody.OBJECT:
                if failure == "object_read":
                    raise module.custody.CustodyError("FILE_READ_FAILED")
                return raw
            raise AssertionError("unexpected path")
        with ExitStack() as stack:
            context = stack.enter_context(patch.object(module, "production_context", return_value=identity))
            directory = stack.enter_context(patch.object(module.custody, "_output_directory", return_value=123))
            absent = stack.enter_context(patch.object(module.custody, "_absent_at"))
            stack.enter_context(patch.object(module.custody, "_read_relative", side_effect=read))
            prerequisite = stack.enter_context(patch.object(module, "_validate_prerequisite", return_value=module.PREREQUISITE_SHA256))
            capture = stack.enter_context(patch.object(module.header_diagnostic, "_validate_capture"))
            verify = stack.enter_context(patch.object(module.custody, "_verify_source", return_value={"fixture": True}))
            write = stack.enter_context(patch.object(module.custody, "_write_at", side_effect=lambda *args: writes.append(args)))
            close = stack.enter_context(patch.object(module.custody.os, "close"))
            failures = {
                "context": (context, module.custody.CustodyError("FROZEN_SOURCE_REQUIRED")),
                "output_conflict": (absent, module.custody.CustodyError("OUTPUT_CONFLICT")),
                "prerequisite": (prerequisite, module.LocalExtraError("LOCAL_EXTRA_PREREQUISITE_INVALID")),
                "capture": (capture, module.custody.CustodyError("CAPTURE_RECEIPT_INVALID")),
                "identity": (verify, module.custody.CustodyError("SOURCE_SHA256_MISMATCH")),
                "write": (write, module.custody.CustodyError("FILE_WRITE_FAILED")),
                "write_unexpected": (write, OSError("PRIVATE_WRITE_CANARY")),
                "descriptor_close": (close, OSError("PRIVATE_DESCRIPTOR_CLOSE_CANARY")),
            }
            if failure in failures:
                failures[failure][0].side_effect = failures[failure][1]
            result = module.diagnose("1")
            directory_calls, close_calls = directory.call_count, close.call_args_list
        return result, reads, writes, directory_calls, close_calls

    def test_production_guard_order_before_any_raw_read(self):
        expected = {"context": (0, 0, "FROZEN_SOURCE_REQUIRED"),
                    "output_conflict": (0, 1, "OUTPUT_CONFLICT"),
                    "prerequisite": (1, 1, "LOCAL_EXTRA_PREREQUISITE_INVALID"),
                    "capture": (2, 1, "CAPTURE_RECEIPT_INVALID")}
        for failure, (read_count, directory_count, reason) in expected.items():
            with self.subTest(failure=failure):
                result, reads, writes, directories, closes = self.simulated_production(failure)
                self.assertEqual(result["status"], "BLOCKED_GUARD")
                self.assertEqual(result["reason"], reason)
                self.assertEqual(len(reads), read_count)
                self.assertEqual(directories, directory_count)
                self.assertEqual(len(closes), directory_count)
                self.assertEqual(writes, [])
                self.assertFalse(result["exposure"]["raw_buffer_read_started"])
                self.assertIsNone(result["field_headers"])

    def test_partial_read_identity_and_write_failures_preserve_exposure(self):
        for failure, completed, target in (("object_read", False, None), ("identity", True, True),
                                           ("write", True, True), ("write_unexpected", True, True)):
            with self.subTest(failure=failure):
                result, reads, writes, _, _ = self.simulated_production(failure)
                self.assertEqual(result["status"], "BLOCKED_GUARD")
                self.assertEqual([name for name, _ in reads], [self.module.PREREQUISITE,
                                 self.module.custody.CAPTURE, self.module.custody.OBJECT])
                self.assertTrue(result["exposure"]["raw_buffer_read_started"])
                self.assertIs(result["exposure"]["raw_buffer_read_completed"], completed)
                self.assertIs(result["exposure"]["target_bearing_source_bytes_read"], target)
                self.assertEqual(writes, [])
                self.assertEqual(result["exposure"]["local_extra_header_walk_completed"],
                                 failure in ("write", "write_unexpected"))
                self.assertIsNone(result["field_headers"])
                self.assertNotIn("PRIVATE_", json.dumps(result))

    def test_simulated_success_and_descriptor_close_failure_have_honest_receipts(self):
        result, reads, writes, _, closes = self.simulated_production()
        self.assertEqual(result["status"], "BLOCKED_SCHEMA")
        self.assertEqual(result["reason"], "LOCAL_EXTRA_HEADERS_COMPLETE")
        self.assertEqual(result["field_headers"], [{"header_id": 77, "data_size": 6}])
        self.assertEqual(reads, [(self.module.PREREQUISITE, 65536),
                         (self.module.custody.CAPTURE, 65536),
                         (self.module.custody.OBJECT, self.module.custody.SOURCE_BYTES)])
        self.assertEqual(len(writes), 1)
        self.assertEqual(writes[0][:2], (123, "public.json"))
        self.assertEqual(json.loads(writes[0][2]), result)
        self.assertEqual(len(closes), 1)
        stderr = io.StringIO()
        with redirect_stderr(stderr):
            result, _, writes, _, _ = self.simulated_production("descriptor_close")
        self.assertEqual(result["status"], "BLOCKED_GUARD")
        self.assertEqual(result["reason"], "INTERNAL_FAILURE")
        self.assertTrue(result["exposure"]["raw_buffer_read_completed"])
        self.assertTrue(result["exposure"]["local_extra_header_walk_completed"])
        self.assertIsNone(result["field_headers"])
        self.assertEqual(stderr.getvalue(), "")
        self.assertNotIn("PRIVATE_", json.dumps(result))
        self.assertEqual(len(writes), 1)
        written = json.loads(writes[0][2])
        self.assertEqual(written["status"], "BLOCKED_SCHEMA")
        self.assertEqual(written["field_headers"], [{"header_id": 77, "data_size": 6}])

    def test_source_context_stubs_and_detached_pin_maps(self):
        module = self.module
        commit = "b" * 40
        blobs = {name: ("synthetic public source: " + name).encode() for name in module.FROZEN_PATHS}
        for failure in (None, "prior", "index", "head", "commit"):
            with self.subTest(failure=failure):
                prior_files = dict(module.PRIOR_FILES)
                if failure == "prior":
                    prior_files[next(iter(prior_files))] = "0" * 64
                def git(command, **kwargs):
                    if command[1:] == ["rev-parse", "--show-prefix"]:
                        return SimpleNamespace(stdout=b"discovery/\n")
                    self.assertEqual(command[1], "show")
                    revision, relative = command[2].split(":", 1)
                    raw = blobs[relative.removeprefix("discovery/")]
                    if (failure == "index" and revision == "") or (failure == "head" and revision == commit):
                        raw += b"changed"
                    return SimpleNamespace(stdout=raw)
                with patch.object(module, "__file__", str(module.ROOT / module.FROZEN_PATHS[0])), \
                        patch.object(module.diagnostic, "production_context", return_value={
                            "commit": "not-a-commit" if failure == "commit" else commit, "files": prior_files}), \
                        patch.object(module.custody, "_read_relative", side_effect=lambda name, cap: blobs[name]) as read, \
                        patch.object(module.subprocess, "run", side_effect=git):
                    if failure is None:
                        result = module.production_context()
                        self.assertEqual(result["commit"], commit)
                        self.assertEqual(result["files"], {name: hashlib.sha256(raw).hexdigest() for name, raw in blobs.items()})
                        result["diagnostic_files"][next(iter(result["diagnostic_files"]))] = "mutated"
                        self.assertNotIn("mutated", module.PRIOR_FILES.values())
                    else:
                        with self.assertRaisesRegex(module.custody.CustodyError, "^FROZEN_SOURCE_REQUIRED$"):
                            module.production_context()
                        if failure in ("prior", "commit"):
                            read.assert_not_called()

    def test_result_lists_and_exposure_are_fresh_between_calls(self):
        first = self.inspect(with_extra(tlv(1)))
        first["field_headers"][0]["header_id"] = 500
        first["predecessor_classification"]["categories"].append("mutated")
        first["exposure"]["members_decompressed"].append("mutated")
        second = self.inspect(with_extra(tlv(1)))
        self.assertEqual(second["field_headers"], [{"header_id": 1, "data_size": 0}])
        self.assertEqual(second["predecessor_classification"]["categories"], ["LOCAL_EXTRA_PRESENT"])
        self.assertEqual(second["exposure"]["members_decompressed"], [])


if __name__ == "__main__":
    unittest.main()
