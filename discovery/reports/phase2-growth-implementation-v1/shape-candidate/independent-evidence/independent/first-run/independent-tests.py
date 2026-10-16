"""Independent synthetic and mocked growth-hint production-binding checks.

Raw ZIP fixtures originate in this reviewer's earlier independent builder.
All production guard chains, reads, Git subprocesses and descriptor operations
are mocked before invocation; no real custody object or receipt is accessed.
"""
from __future__ import annotations

from copy import deepcopy
from contextlib import ExitStack, redirect_stderr, redirect_stdout
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
    SCRIPT = (DISCOVERY / ".cache/phase2-growth-hint-production-candidate-v1/promotion/scripts/"
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
    spec = importlib.util.spec_from_file_location("growth_hint_production_independent_review", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class GrowthHintProductionReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_module()

    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.default_guards = []
        forbidden = AssertionError("UNMOCKED_PRODUCTION_DEPENDENCY")
        for owner, names in ((self.module.predecessor, ("production_context",)),
                             (self.module.custody, ("_read_relative", "_output_directory", "_absent_at", "_write_at", "_verify_source")),
                             (self.module.subprocess, ("run",)),
                             (self.module.custody.os, ("close",)),
                             (socket, ("socket", "create_connection", "getaddrinfo")),
                             (urllib.request, ("urlopen",))):
            for name in names:
                self.default_guards.append(self.stack.enter_context(patch.object(owner, name, side_effect=forbidden)))
        self.addCleanup(self.assert_default_guards_unused)

    def assert_default_guards_unused(self):
        for guard in self.default_guards:
            guard.assert_not_called()

    def identity(self, commit=None):
        return {"mode": "committed_source", "commit": commit or self.module.PREREQUISITE_PRODUCER,
                **deepcopy(self.module.EXPECTED_PRIOR_GROUPS)}

    def prerequisite_value(self):
        """Minimal synthetic applicability object, not an actual public receipt."""
        prior = self.module.predecessor
        value = {"schema": prior.SCHEMA, "profile": prior.PROFILE,
                 "status": "BLOCKED_SCHEMA", "reason": "LOCAL_EXTRA_HEADERS_COMPLETE",
                 "source_identity_verified": True, "synthetic_fixture": False,
                 "predecessor_classification": deepcopy(prior.EXPECTED_CLASSIFICATION),
                 "field_headers": [{"header_id": 41504, "data_size": 516}],
                 "implementation": self.identity(), "exposure": {}}
        for key in ("raw_buffer_read_started", "raw_buffer_read_completed", "target_bearing_source_bytes_read",
                    "archive_close_started", "archive_close_completed", "local_header_locator_started",
                    "local_header_locator_completed", "local_extra_header_walk_started", "local_extra_header_walk_completed"):
            value["exposure"][key] = True
        for key in ("local_extra_payload_interpreted", "xml_decoded", "worksheet_cells_decoded",
                    "shared_strings_decoded", "target_numeric_validity_checked", "scientific_eligibility_decisions",
                    "sampling_independence_established"):
            value["exposure"][key] = False
        value["exposure"].update(archive_close_error=None, members_decompressed=[])
        return value

    def assert_scientific_blocks(self, result):
        self.assertEqual(result["initial_padding_semantics"], "UNBOUND")
        self.assertFalse(result["archive_acceptance_established"])
        self.assertEqual(result["scientific_evaluation_status"], "BLOCKED")
        for key in ("row_count", "paired_count", "source_group_count", "overlap_count"):
            self.assertIsNone(result[key])
        self.assertEqual(result["overlap_status"], "NOT_ASSESSED")
        self.assertNotIn("field_headers", result)
        for key in ("xml_decoded", "worksheet_cells_decoded", "shared_strings_decoded",
                    "target_numeric_validity_checked", "scientific_eligibility_decisions",
                    "sampling_independence_established"):
            self.assertFalse(result["exposure"][key])
        self.assertEqual(result["exposure"]["members_decompressed"], [])
        self.assertEqual(result["exposure"]["fits"], 0)
        self.assertEqual(result["exposure"]["splits"], 0)
        self.assertNotIn("PRIVATE_", json.dumps(result))

    def assert_guard(self, result, reason):
        self.assertEqual(result["status"], "BLOCKED_GUARD")
        self.assertEqual(result["reason"], reason)
        self.assertEqual(result["growth_hint_shape"], "NOT_ESTABLISHED")
        for key in ("exactly_one_a220_record", "payload_length_at_least_four", "signature_matches", "padding_all_zero"):
            self.assertIsNone(result[key])
        self.assert_scientific_blocks(result)

    def test_fixed_binding_constants_and_all_public_predecessor_pins(self):
        module = self.module
        self.assertEqual(module.PREREQUISITE_SHA256, "52fe2d25f0c739c1c5137f0514f07f4ee0be35dffd7ef9141b19fe5ee5520d2e")
        self.assertEqual(module.PREREQUISITE_PRODUCER, "d0505b9b358a4bdeafbd742f1aeeb6c2b955abf3")
        self.assertEqual(module.PREREQUISITE, ".cache/li-v3-custody/local-extra-headers-v1/1/public.json")
        self.assertEqual(module._expected_fields(), [{"header_id": 41504, "data_size": 516}])
        self.assertEqual(len(module.PREDECESSOR_FILES), 25)
        union = {}
        for mapping in module.EXPECTED_PRIOR_GROUPS.values():
            self.assertTrue(set(union).isdisjoint(mapping))
            union.update(mapping)
        self.assertEqual(union, module.PREDECESSOR_FILES)
        for relative, digest in module.PREDECESSOR_FILES.items():
            with self.subTest(relative=relative):
                self.assertFalse(relative.startswith(".cache/"))
                self.assertEqual(hashlib.sha256((DISCOVERY / relative).read_bytes()).hexdigest(), digest)

    def test_prerequisite_exact_bytes_type_and_size_gate_before_json(self):
        module = self.module
        raw = module.custody.canonical(self.prerequisite_value())
        digest = hashlib.sha256(raw).hexdigest()
        with patch.object(module, "PREREQUISITE_SHA256", digest):
            self.assertEqual(module._validate_prerequisite(raw), digest)
            for value in (raw + b" ", raw[:-1], bytearray(raw), None, "", b"x" * 65537):
                with self.subTest(value_type=type(value).__name__), \
                        patch.object(module.json, "loads", side_effect=AssertionError("JSON_BEFORE_IDENTITY")) as loads:
                    with self.assertRaisesRegex(ValueError, "^GROWTH_PREREQUISITE_INVALID$"):
                        module._validate_prerequisite(value)
                    loads.assert_not_called()

    def test_prerequisite_canonical_json_rejects_duplicate_keys_and_pretty_encoding(self):
        module = self.module
        value = self.prerequisite_value()
        canonical = module.custody.canonical(value)
        variants = [json.dumps(value, indent=2).encode(), canonical[:-1],
                    b'{"status":"BLOCKED_SCHEMA",' + canonical[1:]]
        for raw in variants:
            with self.subTest(length=len(raw)), patch.object(module, "PREREQUISITE_SHA256", hashlib.sha256(raw).hexdigest()):
                with self.assertRaisesRegex(ValueError, "^GROWTH_PREREQUISITE_INVALID$"):
                    module._validate_prerequisite(raw)

    def test_prerequisite_applicability_rejects_status_producer_field_and_exposure_forgery(self):
        module = self.module
        cases = []
        for key, value in (("schema", "other"), ("profile", "other"), ("status", "READY"),
                           ("reason", "other"), ("source_identity_verified", 1), ("synthetic_fixture", 0),
                           ("predecessor_classification", {})):
            data = self.prerequisite_value(); data[key] = value; cases.append((key, data))
        fields_cases = [None, [], [{"header_id": 41504, "data_size": 515}],
                        [{"header_id": 41504, "data_size": 517}], [{"header_id": 1, "data_size": 516}],
                        [{"header_id": 41504.0, "data_size": 516}], [{"header_id": 41504, "data_size": 516.0}],
                        [{"header_id": 41504, "data_size": 516, "extra": 1}],
                        [{"header_id": 41504, "data_size": 516}] * 2]
        for index, fields in enumerate(fields_cases):
            data = self.prerequisite_value(); data["field_headers"] = fields; cases.append((f"fields{index}", data))
        for key, value in (("commit", "b" * 40), ("mode", "other")):
            data = self.prerequisite_value(); data["implementation"][key] = value; cases.append((key, data))
        for key, value in (("archive_close_completed", False), ("raw_buffer_read_completed", None),
                           ("local_extra_header_walk_completed", 1), ("local_extra_payload_interpreted", True),
                           ("archive_close_error", "ARCHIVE_CLOSE_FAILED"), ("members_decompressed", ["synthetic"])):
            data = self.prerequisite_value(); data["exposure"][key] = value; cases.append((key, data))
        for label, data in cases:
            raw = module.custody.canonical(data)
            with self.subTest(label=label), patch.object(module, "PREREQUISITE_SHA256", hashlib.sha256(raw).hexdigest()):
                with self.assertRaisesRegex(ValueError, "^GROWTH_PREREQUISITE_INVALID$"):
                    module._validate_prerequisite(raw)

    def test_prior_identity_closed_groups_and_commit_types_without_io(self):
        module = self.module
        self.assertEqual(module._prior_identity(self.identity(), module.PREREQUISITE_PRODUCER), module.PREREQUISITE_PRODUCER)
        cases = [None, [], {**self.identity(), "extra": {}}, {**self.identity(), "commit": 1},
                 {**self.identity(), "commit": "A" * 40}]
        for group in module.EXPECTED_PRIOR_GROUPS:
            data = self.identity(); data[group] = dict(data[group]); data[group][next(iter(data[group]))] = "0" * 64
            cases.append(data)
            data = self.identity(); del data[group]; cases.append(data)
        for value in cases:
            with self.subTest(kind=type(value).__name__):
                with self.assertRaisesRegex(module.custody.CustodyError, "^FROZEN_SOURCE_REQUIRED$"):
                    module._prior_identity(value)

    def production_case(self, *, run="1", raw=None, failure=None, occupied=None):
        """Every external dependency is mocked before production wrapper invocation."""
        module, custody = self.module, self.module.custody
        raw = growth_zip(65535, b"\0" * 512, index=2) if raw is None else raw
        occupied = set() if occupied is None else occupied
        reads, writes, events, destinations = [], [], [], []
        original_validator = module._validate_prerequisite
        def read(relative, cap):
            reads.append((relative, cap)); events.append(("read", relative))
            if relative == module.PREREQUISITE:
                if failure == "prerequisite_read":
                    raise custody.CustodyError("FILE_READ_FAILED")
                return b"synthetic prerequisite placeholder"
            if relative == custody.CAPTURE:
                if failure == "capture_read":
                    raise custody.CustodyError("FILE_READ_FAILED")
                return b"synthetic capture placeholder"
            if relative == custody.OBJECT:
                if failure == "object_read":
                    raise custody.CustodyError("FILE_READ_FAILED")
                return raw
            raise AssertionError("unexpected synthetic read path")
        def destination(relative):
            destinations.append(relative); events.append(("destination", relative))
            return Path("/synthetic-only-output") / str(run) / "public.json"
        def absent(fd, name):
            events.append(("absent", name))
            if str(run) in occupied or failure == "output_conflict":
                raise custody.CustodyError("OUTPUT_CONFLICT")
        def write(fd, name, data):
            events.append(("write", name)); occupied.add(str(run))
            if failure == "partial_write":
                writes.append((fd, name, data[:37]))
                raise custody.CustodyError("FILE_WRITE_FAILED")
            if failure == "write":
                raise custody.CustodyError("FILE_WRITE_FAILED")
            if failure == "write_unexpected":
                raise OSError("PRIVATE_WRITE_CANARY")
            writes.append((fd, name, data))
        with ExitStack() as stack:
            context = stack.enter_context(patch.object(module, "production_context", return_value={"mode": "synthetic_test_stub", "commit": "a" * 40}))
            validator = stack.enter_context(patch.object(module, "_validate_prerequisite", return_value=module.PREREQUISITE_SHA256))
            path = stack.enter_context(patch.object(custody, "_receipt_path", side_effect=destination))
            directory = stack.enter_context(patch.object(custody, "_output_directory", return_value=123))
            absent_mock = stack.enter_context(patch.object(custody, "_absent_at", side_effect=absent))
            reader = stack.enter_context(patch.object(custody, "_read_relative", side_effect=read))
            capture = stack.enter_context(patch.object(module.predecessor.header_diagnostic, "_validate_capture"))
            stack.enter_context(patch.object(module.predecessor.compatible, "_capture_identity", return_value={"synthetic_test_stub": True}))
            verify = stack.enter_context(patch.object(custody, "_verify_source", return_value={"synthetic_test_stub": True}))
            writer = stack.enter_context(patch.object(custody, "_write_at", side_effect=write))
            close = stack.enter_context(patch.object(custody.os, "close"))
            failures = {
                "context": (context, custody.CustodyError("FROZEN_SOURCE_REQUIRED")),
                "directory": (directory, custody.CustodyError("PATH_INVALID")),
                "capture": (capture, custody.CustodyError("CAPTURE_RECEIPT_INVALID")),
                "identity": (verify, custody.CustodyError("SOURCE_SHA256_MISMATCH")),
                "descriptor_close": (close, OSError("PRIVATE_CLOSE_CANARY")),
            }
            if failure in failures:
                failures[failure][0].side_effect = failures[failure][1]
            if failure == "prerequisite":
                validator.side_effect = lambda value: original_validator(b"not an authorized synthetic prerequisite")
            if failure == "predecessor_exception":
                def fail_prior(value, report):
                    report["exposure"].update(header_checks_started=True, directory_name_decoding_started=True)
                    raise RuntimeError("PRIVATE_PREDECESSOR_CANARY")
                stack.enter_context(patch.object(module.predecessor, "_inspect", side_effect=fail_prior))
            result = module.diagnose(run)
            calls = {"context": context.call_count, "prerequisite": validator.call_count,
                     "directory": directory.call_count, "absent": absent_mock.call_count,
                     "capture": capture.call_count, "verify": verify.call_count,
                     "write": writer.call_count, "close": close.call_count,
                     "verify_args": verify.call_args_list, "capture_args": capture.call_args_list}
        return result, reads, writes, calls, destinations, events

    def test_invalid_runs_reject_before_any_mocked_dependency(self):
        for run in (None, True, 1, 2, "0", "3", "01", "../1", "1\n"):
            with self.subTest(run=run):
                result, reads, writes, calls, destinations, _ = self.production_case(run=run)
                self.assert_guard(result, "CLI_ARGUMENT_INVALID")
                self.assertEqual(reads, []); self.assertEqual(writes, []); self.assertEqual(destinations, [])
                self.assertEqual(calls["context"], 0)
                self.assertEqual(calls["close"], 0)

    def test_mocked_positive_binds_exact_bytes_fields_capture_and_two_fixed_slots(self):
        raw = growth_zip(65535, b"\0" * 512, index=2)
        for run in ("1", "2"):
            with self.subTest(run=run):
                result, reads, writes, calls, destinations, events = self.production_case(run=run, raw=raw)
                self.assertEqual(result["schema"], "lupine.discovery.li_v3.growth_hint_shape.v1")
                self.assertEqual(result["profile"], "li_v3.single_local_growth_hint_shape.v1")
                self.assertFalse(result["synthetic_fixture"])
                self.assertTrue(result["source_identity_verified"])
                self.assertEqual(result["status"], "BLOCKED_SCHEMA")
                self.assertEqual(result["reason"], "GROWTH_HINT_SHAPE_MATCH")
                self.assertEqual(result["production_prerequisite_status"], "VERIFIED")
                self.assertEqual(result["prerequisite_receipt_sha256"], self.module.PREREQUISITE_SHA256)
                self.assertEqual(result["prerequisite_producer_commit"], self.module.PREREQUISITE_PRODUCER)
                self.assertEqual(reads, [(self.module.PREREQUISITE, 65536),
                    (self.module.custody.CAPTURE, 65536), (self.module.custody.OBJECT, self.module.custody.SOURCE_BYTES)])
                self.assertEqual(destinations, [f".cache/li-v3-custody/growth-hint-shape-v1/{run}/public.json"])
                self.assertEqual(calls["verify_args"][0].args, (raw, self.module.predecessor.header_diagnostic.OBJECT_SHA256))
                self.assertEqual(calls["capture_args"][0].args, (b"synthetic capture placeholder",))
                self.assertEqual(len(writes), 1); self.assertEqual(calls["close"], 1)
                self.assertEqual(json.loads(writes[0][2]), result)
                self.assertLess(events.index(("read", self.module.PREREQUISITE)), events.index(("absent", "public.json")))
                self.assert_scientific_blocks(result)

    def test_prerequisite_first_order_stops_before_capture_and_object(self):
        expectations = {
            "context": (0, 0, 0, "FROZEN_SOURCE_REQUIRED"),
            "prerequisite_read": (1, 0, 0, "FILE_READ_FAILED"),
            "prerequisite": (1, 0, 0, "GROWTH_PREREQUISITE_INVALID"),
            "directory": (1, 1, 0, "PATH_INVALID"),
            "output_conflict": (1, 1, 1, "OUTPUT_CONFLICT"),
            "capture_read": (2, 1, 1, "FILE_READ_FAILED"),
            "capture": (2, 1, 1, "CAPTURE_RECEIPT_INVALID"),
        }
        for failure, (read_count, directories, closes, reason) in expectations.items():
            with self.subTest(failure=failure):
                result, reads, writes, calls, _, _ = self.production_case(failure=failure)
                self.assert_guard(result, reason)
                self.assertEqual(len(reads), read_count)
                self.assertEqual(calls["directory"], directories); self.assertEqual(calls["close"], closes)
                self.assertEqual(writes, [])
                self.assertFalse(result["exposure"]["raw_buffer_read_started"])
                self.assertFalse(result["exposure"]["growth_hint_payload_interpretation_started"])

    def test_partial_read_and_identity_failure_preserve_source_exposure(self):
        for failure, complete, target in (("object_read", False, None), ("identity", True, True)):
            with self.subTest(failure=failure):
                result, reads, writes, calls, _, _ = self.production_case(failure=failure)
                self.assert_guard(result, "FILE_READ_FAILED" if failure == "object_read" else "SOURCE_SHA256_MISMATCH")
                self.assertEqual(len(reads), 3); self.assertEqual(writes, []); self.assertEqual(calls["close"], 1)
                self.assertTrue(result["exposure"]["raw_buffer_read_started"])
                self.assertIs(result["exposure"]["raw_buffer_read_completed"], complete)
                self.assertIs(result["exposure"]["target_bearing_source_bytes_read"], target)
                self.assertFalse(result["exposure"]["growth_hint_payload_interpretation_started"])

    def test_same_buffer_field_list_must_match_fixed_prior_even_when_shape_would_match(self):
        raws = [growth_zip(0, b"\0" * padding) for padding in (0, 511, 513)]
        raws += [with_extra(tlv(1, growth_body(0, b"\0" * 512))),
                 with_extra(tlv(0xA220, growth_body(0, b"\0" * 512)) * 2),
                 with_extra(tlv(0xA220, growth_body(0, b"\0" * 512)) + tlv(1))]
        for index, raw in enumerate(raws):
            with self.subTest(index=index):
                result, _, writes, _, _, _ = self.production_case(raw=raw)
                self.assertEqual(result["status"], "BLOCKED_SCHEMA")
                self.assertEqual(result["reason"], "GROWTH_PREDECESSOR_FIELDS_MISMATCH")
                self.assertEqual(result["growth_hint_shape"], "NOT_CHECKED")
                self.assertTrue(result["exposure"]["local_extra_header_walk_completed"])
                self.assertFalse(result["exposure"]["growth_hint_payload_interpretation_started"])
                self.assertEqual(len(writes), 1)
                self.assert_scientific_blocks(result)

    def test_synthetic_interface_keeps_unbound_arbitrary_bounded_lengths(self):
        for padding_length in (0, 511, 512, 513):
            with self.subTest(padding_length=padding_length):
                result = self.module.inspect_synthetic_growth_hint(growth_zip(65535, b"\0" * padding_length))
                self.assertTrue(result["synthetic_fixture"])
                self.assertFalse(result["source_identity_verified"])
                self.assertEqual(result["production_prerequisite_status"], "UNBOUND")
                self.assertEqual(result["reason"], "GROWTH_HINT_SHAPE_MATCH")
                self.assert_scientific_blocks(result)

    def test_same_buffer_predecessor_negative_and_exception_cannot_be_replayed_as_match(self):
        raw = with_extra(tlv(0xA220, growth_body(0, b"\0" * 512)), central={"flags": 1})
        result, _, writes, _, _, _ = self.production_case(raw=raw)
        self.assertEqual(result["reason"], "GROWTH_PREDECESSOR_BLOCKED")
        self.assertEqual(result["predecessor_reason"], "PREDECESSOR_PATH_MISMATCH")
        self.assertFalse(result["exposure"]["growth_hint_payload_interpretation_started"])
        self.assertEqual(len(writes), 1)
        result, _, writes, _, _, _ = self.production_case(failure="predecessor_exception")
        self.assert_guard(result, "INTERNAL_FAILURE")
        self.assertTrue(result["exposure"]["header_checks_started"])
        self.assertTrue(result["exposure"]["directory_name_decoding_started"])
        self.assertEqual(writes, [])

    def test_nonmatching_signature_or_padding_is_retained_as_scientifically_blocked(self):
        for raw, reason, scan in ((growth_zip(0, b"\0" * 512, signature=0), "GROWTH_SIGNATURE_MISMATCH", False),
                                  (growth_zip(0, b"\0" * 511 + b"\x01"), "GROWTH_PADDING_NONZERO", True)):
            with self.subTest(reason=reason):
                result, _, writes, _, _, _ = self.production_case(raw=raw)
                self.assertEqual(result["status"], "BLOCKED_SCHEMA")
                self.assertEqual(result["reason"], reason)
                self.assertEqual(result["growth_hint_shape"], "DOES_NOT_MATCH")
                self.assertTrue(result["exposure"]["growth_hint_fixed_words_interpreted"])
                self.assertIs(result["exposure"]["growth_hint_padding_scan_completed"], scan)
                self.assertEqual(len(writes), 1)
                self.assert_scientific_blocks(result)

    def test_write_and_descriptor_close_failures_clear_shape_but_keep_exposure(self):
        for failure in ("write", "partial_write", "write_unexpected", "descriptor_close"):
            stderr = io.StringIO()
            with self.subTest(failure=failure), redirect_stderr(stderr):
                result, _, writes, calls, _, _ = self.production_case(failure=failure)
            self.assert_guard(result, "FILE_WRITE_FAILED" if failure in ("write", "partial_write") else "INTERNAL_FAILURE")
            for flag in ("raw_buffer_read_started", "raw_buffer_read_completed", "growth_hint_fixed_words_interpreted",
                         "growth_hint_padding_scan_completed", "growth_hint_payload_interpretation_completed"):
                self.assertTrue(result["exposure"][flag])
            self.assertEqual(calls["close"], 1); self.assertEqual(stderr.getvalue(), "")
            if failure == "descriptor_close":
                self.assertEqual(len(writes), 1)
                written = json.loads(writes[0][2])
                self.assertEqual(written["reason"], "GROWTH_HINT_SHAPE_MATCH")
                self.assertEqual(written["status"], "BLOCKED_SCHEMA")
            elif failure == "partial_write":
                self.assertEqual(len(writes), 1); self.assertEqual(len(writes[0][2]), 37)
            else:
                self.assertEqual(writes, [])

    def test_exclusive_slot_replay_stops_after_prerequisite_with_no_new_raw_read(self):
        for first_failure in (None, "partial_write", "descriptor_close"):
            with self.subTest(first_failure=first_failure):
                occupied = set()
                self.production_case(failure=first_failure, occupied=occupied)
                result, reads, writes, calls, _, _ = self.production_case(occupied=occupied)
                self.assert_guard(result, "OUTPUT_CONFLICT")
                self.assertEqual(reads, [(self.module.PREREQUISITE, 65536)])
                self.assertEqual(writes, []); self.assertEqual(calls["write"], 0)
                self.assertFalse(result["exposure"]["raw_buffer_read_started"])

    def context_case(self, *, defect=None):
        """Run only this module's context against fake bytes, Git, and prior identity."""
        module = self.module
        identity = self.identity()
        if defect == "prior_identity":
            identity["files"] = {}
        prefix = "synthetic/discovery/"
        source_bytes = {path: ("synthetic source: " + path).encode() for path in module.FROZEN_PATHS}
        reads, commands = [], []
        def read(path, cap):
            reads.append((path, cap))
            if defect == "source_read":
                raise OSError("PRIVATE_SOURCE_READ_CANARY")
            return source_bytes[path]
        def git(command, **kwargs):
            commands.append((command, kwargs))
            if defect == "git_exception":
                raise OSError("PRIVATE_GIT_CANARY")
            if command == ["git", "rev-parse", "--show-prefix"]:
                raw = prefix.encode() + b"\n"
            elif command == ["git", "rev-parse", "HEAD"]:
                raw = (("b" * 40) if defect == "head_changed" else identity["commit"]).encode() + b"\n"
            else:
                self.assertEqual(command[:2], ["git", "show"])
                revision, relative = command[2].split(":", 1)
                self.assertTrue(relative.startswith(prefix))
                raw = source_bytes[relative[len(prefix):]]
                if (defect == "committed_mismatch" and revision) or (defect == "index_mismatch" and not revision):
                    raw += b"changed"
            return SimpleNamespace(stdout=raw)
        with ExitStack() as stack:
            stack.enter_context(patch.object(module, "__file__", str(module.ROOT / module.FROZEN_PATHS[0])))
            prior = stack.enter_context(patch.object(module.predecessor, "production_context", return_value=identity))
            reader = stack.enter_context(patch.object(module.custody, "_read_relative", side_effect=read))
            runner = stack.enter_context(patch.object(module.subprocess, "run", side_effect=git))
            if defect == "prior_error":
                prior.side_effect = RuntimeError("PRIVATE_PRIOR_CANARY")
            if defect is None:
                result = module.production_context()
            else:
                with self.assertRaisesRegex(module.custody.CustodyError, "^FROZEN_SOURCE_REQUIRED$"):
                    module.production_context()
                result = None
        return result, identity, source_bytes, reads, commands

    def test_context_stub_binds_all_four_files_commit_and_index_with_detached_maps(self):
        result, prior, raw, reads, commands = self.context_case()
        self.assertEqual(reads, [(path, 2 * 1024 * 1024) for path in self.module.FROZEN_PATHS])
        self.assertEqual(result["files"], {path: hashlib.sha256(value).hexdigest() for path, value in raw.items()})
        self.assertEqual(len(commands), 10)
        self.assertEqual(commands[-1][0], ["git", "rev-parse", "HEAD"])
        for command, kwargs in commands:
            self.assertEqual(kwargs, {"cwd": self.module.ROOT, "capture_output": True, "check": True, "timeout": 15})
        for group in self.module.EXPECTED_PRIOR_GROUPS:
            result_group = "local_extra_files" if group == "files" else group
            self.assertEqual(result[result_group], prior[group])
            self.assertIsNot(result[result_group], prior[group])
            result[result_group]["synthetic-added"] = "changed"
            self.assertNotIn("synthetic-added", prior[group])
            self.assertNotIn("synthetic-added", self.module.EXPECTED_PRIOR_GROUPS[group])
        expected = self.module._expected_fields()
        expected[0]["data_size"] = 0
        self.assertEqual(self.module._expected_fields(), [{"header_id": 41504, "data_size": 516}])

    def test_context_stub_rejects_prior_and_each_source_consistency_failure(self):
        for defect in ("prior_identity", "prior_error", "source_read", "git_exception",
                       "committed_mismatch", "index_mismatch", "head_changed"):
            with self.subTest(defect=defect):
                _, _, _, reads, commands = self.context_case(defect=defect)
                if defect in ("prior_identity", "prior_error"):
                    self.assertEqual(reads, []); self.assertEqual(commands, [])
                if defect == "head_changed":
                    self.assertEqual(len(reads), 4); self.assertEqual(len(commands), 10)

    def test_context_candidate_location_rejected_before_any_dependency(self):
        with patch.object(self.module, "__file__", str(self.module.ROOT / "synthetic-uncommitted.py")):
            with self.assertRaisesRegex(self.module.custody.CustodyError, "^FROZEN_SOURCE_REQUIRED$"):
                self.module.production_context()

    def test_closed_cli_rejects_arguments_without_production_and_emits_canonical_guard(self):
        module = self.module
        invalid = ([], ["diagnose"], ["capture", "--run", "1"], ["diagnose", "--run", "3"],
                   ["diagnose", "--run", "1", "--output", "/PRIVATE_PATH_CANARY"])
        for argv in invalid:
            out, err = io.StringIO(), io.StringIO()
            with self.subTest(argv=argv), patch.object(module, "diagnose", side_effect=AssertionError("CLI_BYPASS")) as diagnose, \
                    redirect_stdout(out), redirect_stderr(err):
                self.assertEqual(module.main(argv), 2)
            diagnose.assert_not_called()
            report = json.loads(out.getvalue())
            self.assert_guard(report, "CLI_ARGUMENT_INVALID")
            self.assertEqual(out.getvalue().encode(), module.custody.canonical(report))
            self.assertEqual(err.getvalue(), "")
        report = module._result(module.predecessor._base(False))
        out = io.StringIO()
        with patch.object(module, "diagnose", return_value=report) as diagnose, redirect_stdout(out):
            self.assertEqual(module.main(["diagnose", "--run", "2"]), 2)
        diagnose.assert_called_once_with("2")
        self.assertEqual(out.getvalue().encode(), module.custody.canonical(report))

    def test_no_zip_member_decompression_xml_or_network_for_synthetic_wrapper_run(self):
        raw = growth_zip(1234, b"\0" * 512)
        with ExitStack() as stack:
            guarded = []
            for owner, names in ((zipfile.ZipFile, ("open", "read", "extract", "extractall")),
                                 (zlib, ("decompress", "decompressobj")),
                                 (ET, ("fromstring", "parse", "iterparse"))):
                for name in names:
                    guarded.append(stack.enter_context(patch.object(owner, name, side_effect=AssertionError("FORBIDDEN_MEMBER_OR_XML"))))
            result, _, _, _, _, _ = self.production_case(raw=raw)
            self.assertEqual(result["reason"], "GROWTH_HINT_SHAPE_MATCH")
            for guard in guarded:
                guard.assert_not_called()

    def test_new_error_code_stays_closed_without_mutating_predecessor_errors(self):
        self.assertEqual(str(self.module.GrowthHintError("GROWTH_PREREQUISITE_INVALID")), "GROWTH_PREREQUISITE_INVALID")
        self.assertEqual(str(self.module.GrowthHintError("PRIVATE_ERROR_CANARY")), "INTERNAL_FAILURE")
        self.assertEqual(str(self.module.custody.CustodyError("GROWTH_PREREQUISITE_INVALID")), "INTERNAL_FAILURE")


if __name__ == "__main__":
    unittest.main()
