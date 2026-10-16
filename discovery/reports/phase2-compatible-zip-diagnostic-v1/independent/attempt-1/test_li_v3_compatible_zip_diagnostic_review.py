"""Independent synthetic raw-header checks for the compatible ZIP diagnostic.

All ZIP records originate in this file. No archived object, implementation-author
fixture, workbook values, network resource, or private custody receipt is used.
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
import struct
import sys
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import zipfile
import zlib


DISCOVERY = next(p for p in Path(__file__).absolute().parents
                 if p.name == "discovery" and (p / "AGENTS.md").is_file())
SCRIPT = DISCOVERY / "scripts/li_v3_compatible_zip_diagnostic.py"
if not SCRIPT.is_file():
    SCRIPT = (DISCOVERY / ".cache/phase2-li-compatible-diagnostic-candidate-v1/promotion/scripts/"
              "li_v3_compatible_zip_diagnostic.py")
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


def structural_cases():
    """Independent predicate families; category spelling is supplied by the API."""
    for key, value in (("signature", b"NOPE"), ("disk", 1), ("directory_disk", 1),
                       ("disk_count", 3), ("comment_length", 1), ("directory_size", 1),
                       ("directory_offset", 1)):
        yield "end_" + key, raw_zip(end={key: value}), "end"
    yield "empty_member_set", raw_zip([]), "limit"
    yield "central_count", raw_zip(end={"count": 5, "disk_count": 5}), "count"
    yield "private_path", raw_zip([entry("../PRIVATE_NAME_CANARY")] +
                                   [entry(name) for name in REQUIRED]), "path"
    yield "unknown_kind", raw_zip([entry("PRIVATE_NAME_CANARY.xml")] +
                                  [entry(name) for name in REQUIRED]), "kind"
    yield "duplicate_name", raw_zip([entry(name) for name in REQUIRED] +
                                    [entry(REQUIRED[0])]), "duplicate"
    for key, value in (("flags", 1), ("method", 99), ("version", 21),
                       ("extra", b"\x99\x99\x00\x00"),
                       ("comment", b"PRIVATE_COMMENT_CANARY"),
                       ("external", 0o120777 << 16),
                       ("size", 23), ("offset", 1)):
        yield "central_" + key, changed_first(central={key: value}), "central"
    for key, value in (("signature", b"NOPE"), ("version", 21), ("flags", 1),
                       ("method", 8), ("time", 2), ("date", 34), ("crc", 1),
                       ("compressed", 1), ("size", 1), ("extra", b"x"),
                       ("name", b"[Content_Types].xMl")):
        yield "local_" + key, changed_first(local={key: value}), "local"
    yield "short_local_area", replace_local_area(raw_zip(), b"abc"), "local_bounds"
    yield "gap_before_directory", raw_zip(gap=b"x"), "totals"
    yield "missing_required", raw_zip([entry(name) for name in REQUIRED[:-1]]), "required"


def load_module():
    name = "li_compatible_zip_diagnostic_independent_review"
    spec = importlib.util.spec_from_file_location(name, SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class CompatibleZipDiagnosticReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_module()

    def inspect(self, raw, *, compare=True):
        result = self.module.inspect_synthetic_headers(raw)
        self.assertEqual(result["status"], "BLOCKED_SCHEMA")
        self.assertTrue(result["synthetic_fixture"])
        self.assertFalse(result["source_identity_verified"])
        self.assertIsNone(result["observed"])
        self.assertEqual(result["categories"], result["primary_categories"] +
                         result["supplementary_local_categories"])
        self.assertEqual(result["reason"], result["primary_categories"][0])
        self.assertTrue(set(result["categories"]) <= self.module.CATEGORIES)
        self.assertIn(result["first_rejection_stage"], self.module.STAGES)
        self.assertIn(result["same_entry_local_checks"], self.module.LOCAL_SCOPES)
        for key in ("row_count", "paired_count", "source_group_count", "overlap_count"):
            self.assertIsNone(result[key])
        self.assertEqual(result["overlap_status"], "NOT_ASSESSED")
        for key in ("xml_decoded", "worksheet_cells_decoded", "shared_strings_decoded",
                    "target_numeric_validity_checked", "scientific_eligibility_decisions",
                    "sampling_independence_established", "member_names_published"):
            self.assertIs(result["exposure"][key], False)
        self.assertEqual(result["exposure"]["members_decompressed"], [])
        self.assertEqual(result["exposure"]["fits"], 0)
        self.assertEqual(result["exposure"]["splits"], 0)
        self.assertNotIn("PRIVATE_", json.dumps(result))
        if compare:
            archive = None
            try:
                archive, _ = self.module.compatible._compatible_zip_structure(raw)
                expected = "HEADER_PROFILE_ACCEPTED"
            except self.module.custody.CustodyError as error:
                expected = str(error)
            finally:
                if archive is not None:
                    archive.close()
            self.assertEqual(result["compatible_reason"], expected)
        return result

    def test_all_permitted_flag_combinations_and_opaque_payloads(self):
        for method, flags in [(0, n) for n in (0, 0x800)] + [
                (8, n) for n in (0, 2, 4, 6, 0x800, 0x802, 0x804, 0x806)]:
            with self.subTest(method=method, flags=flags):
                result = self.inspect(raw_zip([entry(name, method=method, flags=flags)
                                               for name in REQUIRED]))
                self.assertEqual(result["reason"], "HEADER_PROFILE_ACCEPTED")
                self.assertTrue(result["exposure"]["header_checks_completed"])

    def test_flag_method_bit_boundary_matrix(self):
        masks = set(range(16)) | {0xFFFF, 0x806, 0x800}
        masks |= {1 << bit for bit in range(16)}
        masks |= {(1 << a) | (1 << b) for a in range(16) for b in range(a + 1, 16)}
        masks |= {0x806 | (1 << bit) for bit in range(16)}
        for method in (0, 8, 12, 99):
            for flags in sorted(masks):
                with self.subTest(method=method, flags=flags):
                    raw = raw_zip([entry(REQUIRED[0], method=method, flags=flags)] +
                                  [entry(name) for name in REQUIRED[1:]])
                    result = self.inspect(raw)
                    permitted = method in (0, 8) and flags & ~(0x806 if method == 8 else 0x800) == 0
                    self.assertEqual(result["reason"] == "HEADER_PROFILE_ACCEPTED", permitted)
                    if not permitted:
                        expected = []
                        if flags & ~(0x806 if method == 8 else 0x800):
                            expected.append("MEMBER_FLAGS")
                        if method not in (0, 8):
                            expected.append("MEMBER_COMPRESSION")
                        self.assertEqual(result["primary_categories"], expected)
                        self.assertEqual(result["supplementary_local_categories"], [])

    def test_independent_header_field_matrix(self):
        stages = {"end": "end_record", "limit": "directory", "count": "directory",
                  "path": "member_path", "kind": "member_kind", "duplicate": "member_name",
                  "central": "entry_central", "local": "entry_local",
                  "local_bounds": "entry_local_bounds", "totals": "directory_totals",
                  "required": "directory_totals"}
        for name, raw, family in structural_cases():
            with self.subTest(case=name):
                result = self.inspect(raw)
                self.assertNotEqual(result["reason"], "HEADER_PROFILE_ACCEPTED")
                self.assertEqual(result["first_rejection_stage"], stages[family])

    def test_end_record_aggregation_stops_before_directory_decode(self):
        raw = raw_zip(end={"signature": b"NOPE", "disk": 1, "directory_disk": 1,
                           "comment_length": 1, "disk_count": 3, "directory_size": 1})
        with patch.object(self.module.zipfile, "ZipFile", side_effect=AssertionError("must not parse")):
            result = self.inspect(raw, compare=False)
        self.assertEqual(result["primary_categories"], ["END_SIGNATURE", "END_DISK", "DIRECTORY_DISK",
                         "END_COMMENT", "END_ENTRY_COUNT", "DIRECTORY_END_ALIGNMENT"])
        self.assertFalse(result["exposure"]["directory_name_decoding_started"])
        self.assertEqual(result["same_entry_local_checks"], "NOT_REACHED")

    def test_all_safe_same_entry_conjuncts_are_separate_and_ordered(self):
        raw = changed_first(flags=1, method=99,
            central={"version": 21, "extra": b"\x99\x99\0\0", "comment": b"PRIVATE_COMMENT_CANARY",
                     "external": (0o120777 << 16) | 0x10},
            local={"signature": b"NOPE", "version": 19, "flags": 4, "time": 2, "date": 34,
                   "method": 8, "crc": 1, "compressed": 65535, "size": 1,
                   "extra": b"x", "name": b"PRIVATE_LOCAL_NAME_CANARY"})
        result = self.inspect(raw)
        self.assertEqual(result["primary_categories"], ["MEMBER_FLAGS", "MEMBER_COMPRESSION", "MEMBER_VERSION",
                         "CENTRAL_EXTRA_PRESENT", "CENTRAL_COMMENT_PRESENT", "MEMBER_FILE_TYPE",
                         "MEMBER_DIRECTORY_ATTRIBUTE"])
        self.assertEqual(result["supplementary_local_categories"], ["LOCAL_SIGNATURE", "LOCAL_VERSION_AGREEMENT",
                         "LOCAL_FLAGS_AGREEMENT", "LOCAL_TIME_AGREEMENT", "LOCAL_DATE_AGREEMENT",
                         "LOCAL_METHOD_AGREEMENT", "LOCAL_CRC_AGREEMENT", "LOCAL_COMPRESSED_SIZE_AGREEMENT",
                         "LOCAL_UNCOMPRESSED_SIZE_AGREEMENT", "LOCAL_EXTRA_PRESENT", "LOCAL_NAME_AGREEMENT",
                         "MEMBER_DATA_BOUNDS"])
        self.assertEqual(result["same_entry_local_checks"], "CHECKED")

    def test_offset_and_local_bounds_prevent_unsafe_additional_reads(self):
        with patch.object(self.module, "_local_failures", side_effect=AssertionError("not safe")) as local:
            result = self.inspect(changed_first(central={"flags": 1, "offset": 1}))
            self.assertEqual(result["same_entry_local_checks"], "NOT_SAFE_OFFSET")
            self.assertEqual(result["primary_categories"], ["MEMBER_FLAGS", "LOCAL_OFFSET_LAYOUT"])
            raw = replace_local_area(changed_first(central={"flags": 1}), b"abc")
            result = self.inspect(raw)
            self.assertEqual(result["same_entry_local_checks"], "UNAVAILABLE_BOUNDS")
            self.assertEqual(result["primary_categories"], ["MEMBER_FLAGS"])
            self.assertEqual(result["supplementary_local_categories"], ["LOCAL_HEADER_BOUNDS"])
            local.assert_not_called()

    def test_local_parse_fault_preserves_primary_central_rejection(self):
        with patch.object(self.module, "_local_failures", side_effect=RuntimeError("PRIVATE_ERROR_CANARY")):
            result = self.inspect(changed_first(central={"flags": 1}), compare=False)
            self.assertEqual(result["reason"], "MEMBER_FLAGS")
            self.assertEqual(result["same_entry_local_checks"], "PARSE_ERROR")
            result = self.inspect(raw_zip(), compare=False)
            self.assertEqual(result["reason"], "HEADER_PARSE_ERROR")
            self.assertTrue(result["exposure"]["directory_name_decoding_completed"])
            self.assertTrue(result["exposure"]["archive_close_completed"])

    def test_first_rejection_never_classifies_a_later_member(self):
        first = entry(REQUIRED[0], central={"flags": 1})
        ordinary = self.inspect(raw_zip([first] + [entry(name) for name in REQUIRED[1:]]))
        later = self.inspect(raw_zip([first, entry("../PRIVATE_LATER_NAME", flags=0xFFFF)] +
                                     [entry(name) for name in REQUIRED[1:]]))
        self.assertEqual(ordinary, later)
        with patch.object(self.module, "_local_failures", wraps=self.module._local_failures) as local:
            self.inspect(raw_zip([first] + [entry(name) for name in REQUIRED[1:]]))
            self.assertEqual(local.call_count, 1)

    def test_final_group_aggregates_alignment_and_required_members(self):
        result = self.inspect(raw_zip([entry(name) for name in REQUIRED[:-1]], gap=b"x"))
        self.assertEqual(result["primary_categories"], ["LOCAL_DIRECTORY_ALIGNMENT", "REQUIRED_MEMBERS_ABSENT"])
        self.assertEqual(result["same_entry_local_checks"], "NOT_REACHED")

    def test_local_name_and_extra_length_bounds(self):
        for offset, expected in ((26, ["LOCAL_NAME_AGREEMENT", "MEMBER_DATA_BOUNDS"]),
                                 (28, ["LOCAL_EXTRA_PRESENT", "MEMBER_DATA_BOUNDS"])):
            with self.subTest(offset=offset):
                raw = bytearray(raw_zip())
                struct.pack_into("<H", raw, offset, 65535)
                result = self.inspect(bytes(raw))
                self.assertEqual(result["primary_categories"], expected)

    def test_member_count_limits_and_ignored_creator_metadata(self):
        entries = [entry(name) for name in REQUIRED]
        entries += [entry(f"xl/worksheets/sheet{n}.xml") for n in range(1, 125)]
        self.assertEqual(self.inspect(raw_zip(entries))["reason"], "HEADER_PROFILE_ACCEPTED")
        entries.append(entry("xl/worksheets/sheet125.xml"))
        self.assertEqual(self.inspect(raw_zip(entries))["reason"], "MEMBER_LIMIT")
        raw = changed_first(central={"made_by": 63, "internal": 1, "crc": 0}, local={"crc": 0})
        self.assertEqual(self.inspect(raw)["reason"], "HEADER_PROFILE_ACCEPTED")

    def test_no_member_payload_open_or_decompression_api(self):
        raw = raw_zip([entry(name, method=8, flags=0x806) for name in REQUIRED])
        with ExitStack() as stack:
            for name in ("open", "read", "extract", "extractall", "testzip"):
                stack.enter_context(patch.object(zipfile.ZipFile, name, side_effect=AssertionError("payload forbidden")))
            stack.enter_context(patch.object(self.module.custody, "_xml", side_effect=AssertionError("XML forbidden")))
            stack.enter_context(patch.object(zlib, "decompress", side_effect=AssertionError("decompress forbidden")))
            stack.enter_context(patch.object(zlib, "decompressobj", side_effect=AssertionError("decompress forbidden")))
            self.assertEqual(self.inspect(raw)["reason"], "HEADER_PROFILE_ACCEPTED")

    def test_metadata_parse_exception_is_closed_and_exposure_is_preserved(self):
        with patch.object(self.module.zipfile, "ZipFile", side_effect=ValueError("PRIVATE_ERROR_CANARY")):
            result = self.inspect(raw_zip(), compare=False)
        self.assertEqual(result["reason"], "HEADER_PARSE_ERROR")
        self.assertTrue(result["exposure"]["directory_name_decoding_started"])
        self.assertFalse(result["exposure"]["directory_name_decoding_completed"])
        self.assertFalse(result["exposure"]["archive_close_started"])

    def test_archive_close_fault_does_not_erase_classification_or_exposure(self):
        original = zipfile.ZipFile.close
        unraisable, attempted = [], []
        stderr = io.StringIO()
        def failing_close(archive):
            if archive.fp is not None:
                attempted.append(True)
                raise RuntimeError("PRIVATE_CLOSE_ERROR_CANARY")
            return original(archive)
        with patch.object(zipfile.ZipFile, "close", failing_close), redirect_stderr(stderr), \
                patch.object(sys, "unraisablehook", side_effect=lambda event: unraisable.append(event)):
            result = self.inspect(raw_zip(), compare=False)
            gc.collect()
        self.assertEqual(attempted, [True])
        self.assertEqual(unraisable, [])
        self.assertEqual(stderr.getvalue(), "")
        self.assertEqual(result["reason"], "HEADER_PROFILE_ACCEPTED")
        self.assertTrue(result["exposure"]["header_checks_completed"])
        self.assertTrue(result["exposure"]["archive_close_started"])
        self.assertFalse(result["exposure"]["archive_close_completed"])
        self.assertEqual(result["exposure"]["archive_close_error"], "ARCHIVE_CLOSE_FAILED")

    def test_synthetic_type_size_short_header_and_real_identity_guards(self):
        for raw in (None, "", bytearray(), memoryview(b""), 1, False):
            with self.subTest(raw_type=type(raw).__name__):
                with self.assertRaisesRegex(self.module.custody.CustodyError, "^RAW_TYPE_INVALID$"):
                    self.module.inspect_synthetic_headers(raw)
        with self.assertRaisesRegex(self.module.custody.CustodyError, "^SOURCE_SIZE_MISMATCH$"):
            self.module.inspect_synthetic_headers(b"x" * (self.module.custody.SOURCE_BYTES + 1))
        for count in range(22):
            result = self.inspect(b"x" * count)
            self.assertEqual(result["reason"], "HEADER_TOO_SHORT")
            self.assertFalse(result["exposure"]["directory_name_decoding_started"])
        with patch.object(self.module.hashlib, "sha256", return_value=SimpleNamespace(
                hexdigest=lambda: self.module.header_diagnostic.OBJECT_SHA256)):
            with self.assertRaisesRegex(self.module.custody.CustodyError, "^SYNTHETIC_REAL_SOURCE_FORBIDDEN$"):
                self.module.inspect_synthetic_headers(b"unrelated synthetic bytes")
        with patch.object(self.module.hashlib, "md5", return_value=SimpleNamespace(
                hexdigest=lambda: self.module.custody.SOURCE_MD5)):
            with self.assertRaisesRegex(self.module.custody.CustodyError, "^SYNTHETIC_REAL_SOURCE_FORBIDDEN$"):
                self.module.inspect_synthetic_headers(b"x" * self.module.custody.SOURCE_BYTES)

    def test_exact_prerequisite_digest_and_type_guard_with_synthetic_binding(self):
        raw = b'{"producer":"synthetic-only","status":"BLOCKED_SCHEMA"}\n'
        digest = hashlib.sha256(raw).hexdigest()
        with patch.object(self.module, "PREREQUISITE_SHA256", digest):
            self.assertEqual(self.module._validate_prerequisite(raw), digest)
            for changed in (raw[:-1], raw + b" ", raw.replace(b"synthetic-only", b"other-producer"),
                            bytearray(raw), None, b'{"producer":"synthetic-only","producer":"other"}\n'):
                with self.subTest(changed_type=type(changed).__name__):
                    with self.assertRaisesRegex(self.module.DiagnosticError, "^COMPATIBLE_PREREQUISITE_INVALID$"):
                        self.module._validate_prerequisite(changed)

    def test_public_prior_source_pins_and_closed_producer_binding(self):
        for relative, digest in self.module.PRIOR_FILES.items():
            with self.subTest(relative=relative):
                self.assertEqual(hashlib.sha256((DISCOVERY / relative).read_bytes()).hexdigest(), digest)
        self.assertEqual(self.module.PREREQUISITE_SHA256,
                         "7010e99afcafbf29d32d5ff7d3f356474c2a670571285d884b80441e91ce3d07")
        self.assertEqual(self.module.PREREQUISITE_PRODUCER, "4492858d9e55ddfa3cca2e208063799517948b13")

    def test_invalid_runs_do_not_reach_context_or_cache(self):
        with patch.object(self.module, "production_context") as context, \
                patch.object(self.module.custody, "_read_relative") as read:
            for run in (None, True, 1, 2, "0", "3", "01", "../1", "1\n"):
                result = self.module.diagnose(run)
                self.assertEqual(result["status"], "BLOCKED_GUARD")
                self.assertEqual(result["reason"], "CLI_ARGUMENT_INVALID")
                self.assertFalse(result["exposure"]["raw_buffer_read_started"])
            context.assert_not_called()
            read.assert_not_called()

    def simulated_production(self, failure=None):
        """Exercise guard sequencing with mocks and synthetic bytes; no cache I/O."""
        module = self.module
        reads, writes = [], []
        raw = raw_zip()
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
                "prerequisite": (prerequisite, module.DiagnosticError("COMPATIBLE_PREREQUISITE_INVALID")),
                "capture": (capture, module.custody.CustodyError("CAPTURE_RECEIPT_INVALID")),
                "identity": (verify, module.custody.CustodyError("SOURCE_SHA256_MISMATCH")),
                "write": (write, module.custody.CustodyError("FILE_WRITE_FAILED")),
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
                    "prerequisite": (1, 1, "COMPATIBLE_PREREQUISITE_INVALID"),
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

    def test_partial_read_identity_failure_and_write_failure_keep_exposure(self):
        for failure, completed, target in (("object_read", False, None), ("identity", True, True), ("write", True, True)):
            with self.subTest(failure=failure):
                result, reads, writes, _, _ = self.simulated_production(failure)
                self.assertEqual(result["status"], "BLOCKED_GUARD")
                self.assertEqual([name for name, _ in reads], [self.module.PREREQUISITE,
                                 self.module.custody.CAPTURE, self.module.custody.OBJECT])
                self.assertTrue(result["exposure"]["raw_buffer_read_started"])
                self.assertIs(result["exposure"]["raw_buffer_read_completed"], completed)
                self.assertIs(result["exposure"]["target_bearing_source_bytes_read"], target)
                self.assertEqual(writes, [])
                self.assertEqual(result["exposure"]["header_checks_started"], failure == "write")

    def test_simulated_production_success_is_fixed_slot_and_closed_header_only(self):
        result, reads, writes, _, closes = self.simulated_production()
        self.assertEqual(result["status"], "BLOCKED_SCHEMA")
        self.assertEqual(result["reason"], "HEADER_PROFILE_ACCEPTED")
        self.assertEqual(reads, [(self.module.PREREQUISITE, 65536),
                         (self.module.custody.CAPTURE, 65536),
                         (self.module.custody.OBJECT, self.module.custody.SOURCE_BYTES)])
        self.assertEqual(len(writes), 1)
        self.assertEqual(writes[0][:2], (123, "public.json"))
        self.assertEqual(json.loads(writes[0][2]), result)
        self.assertEqual(len(closes), 1)
        self.assertTrue(result["exposure"]["raw_buffer_read_completed"])
        self.assertEqual(result["exposure"]["members_decompressed"], [])

    def test_descriptor_close_failure_preserves_exposure_and_closes_error_channel(self):
        stderr = io.StringIO()
        with redirect_stderr(stderr):
            result, _, writes, _, _ = self.simulated_production("descriptor_close")
        self.assertEqual(result["status"], "BLOCKED_GUARD")
        self.assertEqual(result["reason"], "INTERNAL_FAILURE")
        self.assertTrue(result["exposure"]["raw_buffer_read_completed"])
        self.assertTrue(result["exposure"]["header_checks_completed"])
        self.assertEqual(result["primary_categories"], ["HEADER_PROFILE_ACCEPTED"])
        self.assertEqual(stderr.getvalue(), "")
        self.assertNotIn("PRIVATE_", json.dumps(result))
        # The earlier exclusive write precedes descriptor cleanup; no overwrite occurs.
        self.assertEqual(len(writes), 1)
        self.assertEqual(json.loads(writes[0][2])["status"], "BLOCKED_SCHEMA")

    def test_committed_source_context_positive_and_negative_stubs(self):
        module = self.module
        commit = "b" * 40
        blobs = {name: ("synthetic public file: " + name).encode() for name in module.FROZEN_PATHS}
        for failure in (None, "prior", "index", "head"):
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
                        patch.object(module.compatible, "production_context", return_value={"commit": commit, "files": prior_files}), \
                        patch.object(module.custody, "_read_relative", side_effect=lambda name, cap: blobs[name]) as read, \
                        patch.object(module.subprocess, "run", side_effect=git):
                    if failure is None:
                        result = module.production_context()
                        self.assertEqual(result["commit"], commit)
                        self.assertEqual(result["files"], {name: hashlib.sha256(raw).hexdigest() for name, raw in blobs.items()})
                        result["compatible_files"][next(iter(result["compatible_files"]))] = "mutated"
                        self.assertNotIn("mutated", module.PRIOR_FILES.values())
                    else:
                        with self.assertRaisesRegex(module.custody.CustodyError, "^FROZEN_SOURCE_REQUIRED$"):
                            module.production_context()
                        if failure == "prior":
                            read.assert_not_called()

    def test_report_lists_and_exposure_are_fresh(self):
        first = self.inspect(raw_zip())
        first["categories"].append("mutated")
        first["exposure"]["members_decompressed"].append("mutated")
        second = self.inspect(raw_zip())
        self.assertEqual(second["categories"], ["HEADER_PROFILE_ACCEPTED"])
        self.assertEqual(second["exposure"]["members_decompressed"], [])


if __name__ == "__main__":
    unittest.main()
