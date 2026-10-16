"""Independent generated ZIP/XML and fully mocked growth-envelope checks."""
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
import stat
import struct
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import urllib.request
import zipfile
import zlib

DISCOVERY = next(p for p in Path(__file__).absolute().parents
                 if p.name == "discovery" and (p / "AGENTS.md").is_file())
REQUIRED = ("[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels")
SCRIPT = DISCOVERY / "scripts/li_v3_growth_envelope.py"
if not SCRIPT.is_file():
    SCRIPT = DISCOVERY / ".cache/phase2-growth-envelope-candidate-v1/promotion/scripts/li_v3_growth_envelope.py"
GROWTH = DISCOVERY / "scripts/li_v3_growth_hint_shape.py"
if not GROWTH.is_file():
    GROWTH = DISCOVERY / ".cache/phase2-growth-hint-production-candidate-v1/promotion/scripts/li_v3_growth_hint_shape.py"


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

def tlv(header_id, payload=b"", declared=None):
    return struct.pack("<HH", header_id, len(payload) if declared is None else declared) + payload

def growth_body(pad_value=0, padding=b"", signature=0xA028):
    return struct.pack("<HH", signature, pad_value) + padding


CT = "http://schemas.openxmlformats.org/package/2006/content-types"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"
DOC = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/"
SS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml."
OPAQUE = ("xl/worksheets/sheet1.xml", "xl/sharedStrings.xml", "xl/worksheets/sheet2.xml")


def fixture_entries(*, extra_by_index=None, replacements=None, opaque=b"PRIVATE_OPAQUE_CANARY", method=0, flags=0):
    """Build minimal valid envelope XML independently from the published helper grammar."""
    types = (f'<Types xmlns="{CT}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
             f'<Override PartName="/xl/workbook.xml" ContentType="{MIME}sheet.main+xml"/>'
             f'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="{MIME}worksheet+xml"/>'
             f'<Override PartName="/xl/worksheets/sheet2.xml" ContentType="{MIME}worksheet+xml"/>'
             f'<Override PartName="/xl/sharedStrings.xml" ContentType="{MIME}sharedStrings+xml"/></Types>')
    root = (f'<Relationships xmlns="{REL}"><Relationship Id="root" Type="{DOC}officeDocument" '
            'Target="xl/workbook.xml"/></Relationships>')
    workbook = (f'<workbook xmlns="{SS}" xmlns:r="{DOC[:-1]}"><sheets>'
                '<sheet name="Column Descriptions" sheetId="9" r:id="right"/>'
                '<sheet name="References" sheetId="2" r:id="left"/></sheets></workbook>')
    relations = (f'<Relationships xmlns="{REL}"><Relationship Id="left" Type="{DOC}worksheet" Target="worksheets/sheet1.xml"/>'
                 f'<Relationship Id="right" Type="{DOC}worksheet" Target="worksheets/sheet2.xml"/>'
                 f'<Relationship Id="strings" Type="{DOC}sharedStrings" Target="sharedStrings.xml"/></Relationships>')
    contents = dict(zip(REQUIRED, (value.encode() for value in (types, root, workbook, relations))))
    contents.update({name: opaque for name in OPAQUE})
    contents.update(replacements or {})
    items = [entry(name, content=contents[name], method=method, flags=flags) for name in REQUIRED + OPAQUE]
    extras = {0: tlv(0xA220, growth_body(0, b"\0" * 512))} if extra_by_index is None else extra_by_index
    for index, extra in extras.items():
        items[index]["local"]["extra"] = extra
    return items


def fixture(**kwargs):
    return raw_zip(fixture_entries(**kwargs))


def load_module():
    if "li_v3_growth_hint_shape" not in sys.modules:
        spec = importlib.util.spec_from_file_location("li_v3_growth_hint_shape", GROWTH)
        growth = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = growth
        spec.loader.exec_module(growth)
    spec = importlib.util.spec_from_file_location("growth_envelope_independent_review", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class GrowthEnvelopeReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_module()

    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.default_guards = []
        for owner, names in ((self.module.growth, ("production_context",)),
                             (self.module.predecessor, ("production_context",)),
                             (self.module.custody, ("_read_relative", "_output_directory", "_absent_at", "_write_at", "_verify_source")),
                             (self.module.subprocess, ("run",)), (self.module.custody.os, ("close",)),
                             (socket, ("socket", "create_connection", "getaddrinfo")),
                             (urllib.request, ("urlopen",))):
            for name in names:
                self.default_guards.append(self.stack.enter_context(patch.object(owner, name, side_effect=AssertionError("UNMOCKED_PRODUCTION_OPERATION"))))
        self.addCleanup(self.assert_default_guards_unused)

    def assert_default_guards_unused(self):
        for guard in self.default_guards:
            guard.assert_not_called()

    def inspect(self, raw):
        result = self.module.inspect_synthetic_envelope(raw)
        self.assert_science_blocked(result)
        return result

    def assert_science_blocked(self, result):
        self.assertEqual(result["status"], "BLOCKED_SCHEMA")
        self.assertEqual(result["initial_padding_semantics"], "UNBOUND")
        for key in ("row_count", "paired_count", "source_group_count", "overlap_count"):
            self.assertIsNone(result[key])
        self.assertEqual(result["overlap_status"], "NOT_ASSESSED")
        for key in ("worksheet_cells_decoded", "shared_strings_decoded", "formulas_executed",
                    "target_numeric_validity_checked", "scientific_eligibility_decisions", "sampling_independence_established"):
            self.assertFalse(result["exposure"][key])
        self.assertEqual(result["exposure"]["fits"], 0)
        self.assertEqual(result["exposure"]["splits"], 0)
        self.assertNotIn("PRIVATE_", json.dumps(result))

    def assert_valid(self, result, extras=1):
        self.assertEqual(result["engineering_status"], "ENVELOPE_VALID")
        self.assertEqual(result["reason"], "SCHEMA_UNCONFIRMED")
        self.assertTrue(result["archive_profile_accepted"])
        self.assertEqual(result["member_count"], 7)
        self.assertEqual(result["sheet_count"], 2)
        self.assertEqual(result["recognized_roles"], {"References": {"present": True, "ordinal": 2},
                         "Column Descriptions": {"present": True, "ordinal": 1}})
        exposure = result["exposure"]
        self.assertEqual(exposure["local_extra_areas_started"], extras)
        self.assertEqual(exposure["local_extra_areas_completed"], extras)
        for key in ("decompression_started", "decompression_completed", "xml_decoding_started", "xml_decoding_completed"):
            self.assertEqual(exposure[key], list(REQUIRED))
        for key in ("archive_open_started", "archive_open_completed", "header_checks_started", "header_checks_completed",
                    "archive_close_started", "archive_close_completed", "envelope_checks_completed"):
            self.assertTrue(exposure[key])
        self.assertIsNone(exposure["archive_close_error"])

    def test_generated_known_envelope_roles_and_exact_four_member_reads(self):
        original = zipfile.ZipFile.open
        opened = []
        def member_open(archive, name, *args, **kwargs):
            opened.append(name)
            self.assertIn(name, REQUIRED)
            return original(archive, name, *args, **kwargs)
        with patch.object(zipfile.ZipFile, "open", member_open):
            result = self.inspect(fixture())
        self.assert_valid(result)
        self.assertEqual(opened, list(REQUIRED))
        self.assertEqual(result["selected_growth_check"]["reason"], "GROWTH_HINT_SHAPE_MATCH")
        self.assertTrue(result["exposure"]["selected_growth"]["archive_close_completed"])

    def test_every_entry_may_have_shape_and_ordinary_zero_extra_entries_remain_allowed(self):
        area = tlv(0xA220, growth_body(65535))
        for indices in ((0,), (1,), (3,), (6,), tuple(range(7))):
            with self.subTest(indices=indices):
                result = self.inspect(fixture(extra_by_index={index: area for index in indices}))
                self.assert_valid(result, len(indices))
        result = self.inspect(fixture(extra_by_index={}))
        self.assertEqual(result["reason"], "GROWTH_PREDECESSOR_BLOCKED")
        self.assertFalse(result["exposure"]["archive_open_started"])

    def test_later_second_middle_last_local_areas_are_fully_checked(self):
        good = tlv(0xA220, growth_body(17))
        bad_areas = {"unknown": tlv(1, growth_body()), "duplicate": good * 2,
                     "mixed": good + tlv(1), "header_short": b"\x20\xa2\x04",
                     "body_short": tlv(0xA220, b"123"), "data_truncated": tlv(0xA220, growth_body(), declared=5),
                     "signature": tlv(0xA220, growth_body(signature=0x28A0)),
                     "first_nonzero": tlv(0xA220, growth_body(17, b"\x01\0\0")),
                     "middle_nonzero": tlv(0xA220, growth_body(17, b"\0\x80\0")),
                     "last_nonzero": tlv(0xA220, growth_body(17, b"\0\0\xff"))}
        for index in (1, 3, 6):
            for label, area in bad_areas.items():
                with self.subTest(index=index, case=label):
                    result = self.inspect(fixture(extra_by_index={0: tlv(0xA220, growth_body(0, b"\0" * 512)), index: area}))
                    self.assertEqual(result["reason"], "LOCAL_GROWTH_SHAPE_UNSUPPORTED")
                    self.assertEqual(result["selected_growth_check"]["reason"], "GROWTH_HINT_SHAPE_MATCH")
                    exposure = result["exposure"]
                    self.assertEqual(exposure["local_extra_areas_started"], 2)
                    self.assertEqual(exposure["local_extra_areas_completed"], 1)
                    self.assertFalse(exposure["header_checks_completed"])
                    self.assertTrue(exposure["archive_close_completed"])
                    self.assertFalse(result["archive_profile_accepted"])
                    self.assertEqual(exposure["decompression_started"], [])
                    self.assertGreaterEqual(exposure["local_growth_fixed_words_interpreted"], 1)
                    self.assertFalse(exposure["local_growth_payload_interpretation_completed"])

    def test_empty_padding_and_exact_maximum_local_span(self):
        for padding in (b"", b"\0" * 65527):
            with self.subTest(padding_length=len(padding)):
                area = tlv(0xA220, growth_body(65535, padding))
                self.assertEqual(len(area), 8 + len(padding))
                result = self.inspect(fixture(extra_by_index={0: tlv(0xA220, growth_body()), 6: area}))
                self.assert_valid(result, 2)
                self.assertEqual(result["exposure"]["local_growth_padding_scans_completed"], 2)

    def test_unsigned_initial_value_has_no_public_shape_effect(self):
        reports = []
        for value in (0, 1, 255, 256, 32767, 32768, 65534, 65535):
            result = self.inspect(fixture(extra_by_index={0: tlv(0xA220, growth_body(value)),
                                                        6: tlv(0xA220, growth_body(65535 - value, b"\0" * 7))}))
            self.assert_valid(result, 2)
            del result["observed"]
            reports.append(result)
        self.assertTrue(all(result == reports[0] for result in reports))

    def test_opaque_worksheet_shared_string_bytes_do_not_affect_projection(self):
        reports = []
        for opaque in (b"PRIVATE_OPAQUE_CANARY", b"\xff\x00\x01", b'<invalid><c><v>9999999</v></c>PRIVATE_BAD_XML'):
            result = self.inspect(fixture(opaque=opaque))
            self.assert_valid(result)
            del result["observed"]
            reports.append(result)
        self.assertTrue(all(result == reports[0] for result in reports))

    def test_method_and_option_flags_still_follow_compatible_profile(self):
        for method, flags in ((0, 0), (0, 0x800), (8, 0), (8, 2), (8, 4), (8, 6), (8, 0x800), (8, 0x806)):
            with self.subTest(method=method, flags=flags):
                self.assert_valid(self.inspect(fixture(method=method, flags=flags)))

    def test_retained_later_central_predicates_reject_before_xml(self):
        mutations = {"encryption": {"flags": 1}, "descriptor": {"flags": 8},
                     "store_options": {"flags": 2}, "unsupported_method": {"method": 12},
                     "version": {"version": 21}, "central_extra": {"extra": tlv(0xA220, growth_body())},
                     "comment": {"comment": b"PRIVATE_COMMENT_CANARY"},
                     "symlink": {"external": (stat.S_IFLNK | 0o777) << 16},
                     "directory_bit": {"external": 0x10}, "stored_size": {"size": 1},
                     "offset": {"offset": 1}}
        for label, changes in mutations.items():
            items = fixture_entries(); items[-1]["central"].update(changes)
            with self.subTest(case=label):
                result = self.inspect(raw_zip(items))
                self.assertFalse(result["archive_profile_accepted"])
                self.assertTrue(result["exposure"]["archive_open_completed"])
                self.assertTrue(result["exposure"]["archive_close_completed"])
                self.assertEqual(result["exposure"]["decompression_started"], [])
                self.assertEqual(result["selected_growth_check"]["reason"], "GROWTH_HINT_SHAPE_MATCH")

    def test_retained_later_local_predicates_reject_before_payload_and_xml(self):
        mutations = {"signature": {"signature": b"xxxx"}, "version": {"version": 19},
                     "flags": {"flags": 0x800}, "method": {"method": 8}, "time": {"time": 1},
                     "date": {"date": 34}, "crc": {"crc": 0}, "compressed": {"compressed": 1},
                     "size": {"size": 1}, "name": {"name": b"xl/worksheets/sheet9.xml"}}
        for label, changes in mutations.items():
            items = fixture_entries(); items[-1]["local"].update(changes)
            items[-1]["local"]["extra"] = tlv(0xA220, growth_body())
            with self.subTest(case=label):
                result = self.inspect(raw_zip(items))
                self.assertEqual(result["reason"], "ZIP_LAYOUT_UNSUPPORTED")
                self.assertEqual(result["exposure"]["local_extra_areas_started"], 1)
                self.assertEqual(result["exposure"]["decompression_started"], [])
                self.assertTrue(result["exposure"]["archive_close_completed"])

    def direct_headers(self, raw):
        report, holder, failure = self.module._new_report(raw, True, {}), [], None
        try:
            self.module._growth_zip_structure(raw, report["exposure"], holder)
        except (self.module.CustodyError, self.module.GrowthEnvelopeError) as error:
            failure = str(error)
            report["reason"] = failure
        finally:
            self.module._close_owned_archive(holder, report)
        return failure, report

    def test_retained_eocd_contiguity_required_names_and_count_boundaries(self):
        good = fixture_entries()
        cases = [("short", b""), ("disk", raw_zip(good, end={"disk": 1})),
                 ("count_disagreement", raw_zip(good, end={"disk_count": 6})),
                 ("comment", raw_zip(good, end={"comment_length": 1})),
                 ("directory_size", raw_zip(good, end={"directory_size": 1})),
                 ("prefix", raw_zip(good, prefix=b"x")), ("gap", raw_zip(good, gap=b"x")),
                 ("missing", raw_zip([item for item in good if item["central"]["name"] != b"xl/workbook.xml"])),
                 ("duplicate", raw_zip(good + [deepcopy(good[-1])]))]
        for name in ("../PRIVATE_FILENAME_CANARY.xml", "xl/worksheets/", "xl/unknown.xml", "xl\\workbook.xml"):
            items = deepcopy(good); items[-1] = entry(name)
            cases.append((name, raw_zip(items)))
        for label, raw in cases:
            with self.subTest(case=label):
                failure, report = self.direct_headers(raw)
                self.assertIsNotNone(failure)
                if report["exposure"]["archive_open_completed"]:
                    self.assertTrue(report["exposure"]["archive_close_completed"])
                self.assertEqual(report["exposure"]["decompression_started"], [])
        for count in (128, 129):
            items = [entry(name) for name in REQUIRED]
            items += [entry(f"xl/worksheets/sheet{n}.xml") for n in range(1, count - 3)]
            failure, report = self.direct_headers(raw_zip(items))
            self.assertEqual(failure, None if count == 128 else "ZIP_LIMIT")
            self.assertIs(report["exposure"]["archive_open_started"], count == 128)

    def test_local_shape_helper_bounds_and_complete_scan_exposure(self):
        area = tlv(0xA220, growth_body(0, b"\0" * 4))
        for start, end in ((True, len(area)), (0, True), (-1, 8), (0, 0), (0, len(area) + 1),
                           (0, 3), (0, 65536)):
            exposure = self.module._new_report(None, True, {})["exposure"]
            with self.subTest(start=start, end=end):
                with self.assertRaisesRegex(self.module.GrowthEnvelopeError, "^LOCAL_GROWTH_SHAPE_UNSUPPORTED$"):
                    self.module._local_growth_shape(area + b"\0" * 65536, start, end, exposure)
                self.assertEqual(exposure["local_extra_areas_started"], 1)
                self.assertEqual(exposure["local_extra_areas_completed"], 0)
        for at in (0, 7, 15):
            padding = bytearray(16); padding[at] = 255
            raw = tlv(0xA220, growth_body(65535, bytes(padding)))
            exposure = self.module._new_report(None, True, {})["exposure"]
            with self.subTest(nonzero=at):
                with self.assertRaises(self.module.GrowthEnvelopeError):
                    self.module._local_growth_shape(raw, 0, len(raw), exposure)
                self.assertEqual(exposure["local_growth_padding_scans_started"], 1)
                self.assertEqual(exposure["local_growth_padding_scans_completed"], 1)
                self.assertEqual(exposure["local_extra_areas_completed"], 0)

    def test_type_size_and_known_actual_identity_barriers_precede_inspection(self):
        module = self.module
        with patch.object(module, "_inspect", side_effect=AssertionError("INSPECT_BEFORE_GUARD")) as inspect:
            for raw, reason in ((bytearray(), "RAW_TYPE_INVALID"), (None, "RAW_TYPE_INVALID"),
                                (b"x" * (module.custody.SOURCE_BYTES + 1), "SOURCE_SIZE_MISMATCH")):
                with self.subTest(reason=reason), self.assertRaisesRegex(module.CustodyError, "^" + reason + "$"):
                    module.inspect_synthetic_envelope(raw)
            with patch.object(module.hashlib, "sha256", return_value=SimpleNamespace(hexdigest=lambda: module.header_diagnostic.OBJECT_SHA256)):
                with self.assertRaisesRegex(module.CustodyError, "^SYNTHETIC_REAL_SOURCE_FORBIDDEN$"):
                    module.inspect_synthetic_envelope(b"synthetic")
            with patch.object(module.hashlib, "md5", return_value=SimpleNamespace(hexdigest=lambda: module.custody.SOURCE_MD5)):
                with self.assertRaisesRegex(module.CustodyError, "^SYNTHETIC_REAL_SOURCE_FORBIDDEN$"):
                    module.inspect_synthetic_envelope(b"x" * module.custody.SOURCE_BYTES)
            inspect.assert_not_called()

    def test_xml_malformed_and_crc_failure_retain_exact_partial_exposure(self):
        for index in range(4):
            raw = fixture(replacements={REQUIRED[index]: b"<malformed>"})
            with self.subTest(index=index, failure="parse"):
                result = self.inspect(raw)
                self.assertEqual(result["reason"], "XML_INVALID")
                exposure = result["exposure"]
                self.assertEqual(exposure["decompression_completed"], list(REQUIRED[:index + 1]))
                self.assertEqual(exposure["xml_decoding_started"], list(REQUIRED[:index + 1]))
                self.assertEqual(exposure["xml_decoding_completed"], list(REQUIRED[:index]))
                self.assertTrue(exposure["archive_close_completed"])
                self.assertFalse(result["archive_profile_accepted"])
        items = fixture_entries()
        items[2]["payload"] = b"X" + items[2]["payload"][1:]
        result = self.inspect(raw_zip(items))
        self.assertEqual(result["reason"], "XML_INVALID")
        self.assertEqual(result["exposure"]["decompression_started"], list(REQUIRED[:3]))
        self.assertEqual(result["exposure"]["decompression_completed"], list(REQUIRED[:2]))
        self.assertEqual(result["exposure"]["xml_decoding_started"], list(REQUIRED[:2]))
        self.assertTrue(result["exposure"]["archive_close_completed"])

    def test_retained_xml_profile_content_relationship_and_workbook_rules(self):
        original = fixture_entries()
        xmls = {REQUIRED[index]: original[index]["payload"] for index in range(4)}
        cases = [(0, b'<!DOCTYPE Types><Types/>', "XML_PROFILE_UNSUPPORTED"),
                 (0, xmls[REQUIRED[0]].replace(b'ContentType="application/', b'ContentType="bad/', 1), "CONTENT_TYPES_UNSUPPORTED"),
                 (1, xmls[REQUIRED[1]].replace(b'Target="xl/workbook.xml"', b'Target="https://PRIVATE_REMOTE_CANARY" TargetMode="External"'), "RELATIONSHIP_UNSUPPORTED"),
                 (2, xmls[REQUIRED[2]].replace(b'name="References"', b'name="Column Descriptions"'), "WORKBOOK_UNSUPPORTED"),
                 (3, xmls[REQUIRED[3]].replace(b'Id="right"', b'Id="left"'), "RELATIONSHIP_UNSUPPORTED")]
        for index, value, reason in cases:
            with self.subTest(reason=reason):
                result = self.inspect(fixture(replacements={REQUIRED[index]: value}))
                self.assertEqual(result["reason"], reason)
                self.assertFalse(result["archive_profile_accepted"])
                self.assertTrue(result["exposure"]["archive_close_completed"])

    def test_archive_closes_on_header_and_xml_failures(self):
        original = zipfile.ZipFile
        for failure in ("header", "xml", "none"):
            instances = []
            def factory(*args, **kwargs):
                archive = original(*args, **kwargs); instances.append(archive); return archive
            items = fixture_entries()
            if failure == "header":
                items[-1]["local"]["extra"] = tlv(1)
            elif failure == "xml":
                items = fixture_entries(replacements={REQUIRED[2]: b"<bad>"})
            with self.subTest(failure=failure), patch.object(zipfile, "ZipFile", side_effect=factory):
                result = self.inspect(raw_zip(items))
            self.assertEqual(len(instances), 2)
            self.assertTrue(all(archive.fp is None for archive in instances))
            self.assertTrue(result["exposure"]["archive_close_completed"])

    def test_close_failure_preserves_prior_reason_exposure_and_no_destructor_channel(self):
        original_class, original_close = zipfile.ZipFile, zipfile.ZipFile.close
        for failure in ("header", "xml", "none"):
            instances, close_faults, stderr = [], [], io.StringIO()
            def factory(*args, **kwargs):
                archive = original_class(*args, **kwargs); instances.append(archive); return archive
            def close(archive):
                if len(instances) == 2 and archive is instances[1] and archive.fp is not None:
                    close_faults.append(True)
                    raise OSError("PRIVATE_CLOSE_CANARY")
                return original_close(archive)
            items = fixture_entries()
            expected_prior = "SCHEMA_UNCONFIRMED"
            if failure == "header":
                items[-1]["local"]["extra"] = tlv(1); expected_prior = "LOCAL_GROWTH_SHAPE_UNSUPPORTED"
            elif failure == "xml":
                items = fixture_entries(replacements={REQUIRED[2]: b"<bad>"}); expected_prior = "XML_INVALID"
            with self.subTest(failure=failure), redirect_stderr(stderr), \
                    patch.object(zipfile, "ZipFile", side_effect=factory), patch.object(original_class, "close", close):
                result = self.inspect(raw_zip(items))
                self.assertEqual(result["reason"], "ARCHIVE_CLOSE_FAILED")
                self.assertEqual(result["validation_reason_before_cleanup"], expected_prior)
                self.assertEqual(result["engineering_status"], "BLOCKED_CLEANUP")
                self.assertFalse(result["archive_profile_accepted"])
                for key in ("member_count", "sheet_count", "recognized_roles", "sheet_relationship_status"):
                    self.assertIsNone(result[key])
                self.assertTrue(result["exposure"]["archive_close_started"])
                self.assertFalse(result["exposure"]["archive_close_completed"])
                self.assertEqual(result["exposure"]["archive_close_error"], "ARCHIVE_CLOSE_FAILED")
                self.assertTrue(all(archive.fp is None for archive in instances))
                instances.clear(); gc.collect()
            self.assertEqual(len(close_faults), 1)
            self.assertEqual(stderr.getvalue(), "")

    def test_selected_cleanup_failure_blocks_full_envelope_without_losing_exposure(self):
        original = zipfile.ZipFile.close
        faults, stderr = [], io.StringIO()
        def close(archive):
            if archive.fp is not None:
                faults.append(True)
                raise OSError("PRIVATE_SELECTED_CLOSE_CANARY")
            return original(archive)
        with redirect_stderr(stderr), patch.object(zipfile.ZipFile, "close", close):
            result = self.inspect(fixture())
            gc.collect()
        self.assertEqual(result["reason"], "GROWTH_PREDECESSOR_BLOCKED")
        self.assertEqual(result["exposure"]["selected_growth"]["archive_close_error"], "ARCHIVE_CLOSE_FAILED")
        self.assertFalse(result["exposure"]["archive_open_started"])
        self.assertEqual(result["exposure"]["decompression_started"], [])
        self.assertEqual(len(faults), 1); self.assertEqual(stderr.getvalue(), "")

    def test_full_archive_constructor_and_infolist_failures_preserve_lifecycle(self):
        original = zipfile.ZipFile
        for mode in ("constructor", "infolist"):
            created = []
            def factory(*args, **kwargs):
                if len(created) == 1 and mode == "constructor":
                    raise OSError("PRIVATE_CONSTRUCTOR_CANARY")
                archive = original(*args, **kwargs); created.append(archive)
                if len(created) == 2:
                    archive.infolist = lambda: (_ for _ in ()).throw(ValueError("PRIVATE_INFOLIST_CANARY"))
                return archive
            with self.subTest(mode=mode), patch.object(zipfile, "ZipFile", side_effect=factory):
                result = self.inspect(fixture())
            self.assertEqual(result["reason"], "ZIP_INVALID")
            exposure = result["exposure"]
            self.assertTrue(exposure["archive_open_started"])
            self.assertIs(exposure["archive_open_completed"], mode == "infolist")
            self.assertFalse(exposure["directory_name_decoding_completed"])
            self.assertIs(exposure["archive_close_completed"], mode == "infolist")
            self.assertTrue(all(archive.fp is None for archive in created))

    def production_case(self, *, run="1", raw=None, failure=None, occupied=None):
        """Mock every production dependency before entering the current wrapper."""
        module, custody = self.module, self.module.custody
        raw = fixture() if raw is None else raw
        reads, writes, destinations, events = [], [], [], []
        occupied = set() if occupied is None else occupied
        def read(path, cap):
            reads.append((path, cap)); events.append(("read", path))
            if path == module.PREREQUISITE:
                return b"synthetic prerequisite"
            if path == custody.CAPTURE:
                return b"synthetic capture"
            if path == custody.OBJECT:
                if failure == "read":
                    raise custody.CustodyError("FILE_READ_FAILED")
                return raw
            raise AssertionError("UNEXPECTED_SYNTHETIC_READ_PATH")
        def destination(path):
            destinations.append(path)
            return Path("/synthetic-output") / str(run) / "public.json"
        def absent(fd, name):
            events.append(("absence", name))
            if str(run) in occupied or failure == "occupied":
                raise custody.CustodyError("OUTPUT_CONFLICT")
        def write(fd, name, value):
            occupied.add(str(run))
            if failure == "partial_write":
                writes.append(value[:29]); raise custody.CustodyError("FILE_WRITE_FAILED")
            if failure == "write":
                raise custody.CustodyError("FILE_WRITE_FAILED")
            writes.append(value)
        with ExitStack() as stack:
            context = stack.enter_context(patch.object(module, "production_context", return_value={"mode": "mocked_current_context"}))
            validator = stack.enter_context(patch.object(module, "_validate_prerequisite", return_value=module.PREREQUISITE_SHA256))
            stack.enter_context(patch.object(custody, "_receipt_path", side_effect=destination))
            directory = stack.enter_context(patch.object(custody, "_output_directory", return_value=321))
            absence = stack.enter_context(patch.object(custody, "_absent_at", side_effect=absent))
            stack.enter_context(patch.object(custody, "_read_relative", side_effect=read))
            capture = stack.enter_context(patch.object(module.header_diagnostic, "_validate_capture"))
            identity = stack.enter_context(patch.object(custody, "_verify_source", return_value={"mode": "mocked_identity"}))
            writer = stack.enter_context(patch.object(custody, "_write_at", side_effect=write))
            close = stack.enter_context(patch.object(custody.os, "close"))
            faults = {"context": (context, custody.CustodyError("FROZEN_SOURCE_REQUIRED")),
                      "prerequisite": (validator, module.GrowthEnvelopeError("GROWTH_PREREQUISITE_INVALID")),
                      "capture": (capture, custody.CustodyError("CAPTURE_RECEIPT_INVALID")),
                      "identity": (identity, custody.CustodyError("SOURCE_SHA256_MISMATCH")),
                      "close": (close, OSError("PRIVATE_DESCRIPTOR_CLOSE_CANARY"))}
            if failure in faults:
                faults[failure][0].side_effect = faults[failure][1]
            result = module.envelope(run)
            calls = {"context": context.call_count, "directory": directory.call_count,
                     "absence": absence.call_count, "write": writer.call_count, "close": close.call_count,
                     "identity_args": identity.call_args_list}
        return result, reads, writes, destinations, events, calls

    def assert_guard(self, result, reason):
        self.assertEqual(result["status"], "BLOCKED_GUARD")
        self.assertEqual(result["engineering_status"], "BLOCKED_GUARD")
        self.assertEqual(result["reason"], reason)
        self.assertFalse(result["archive_profile_accepted"])
        for key in ("member_count", "sheet_count", "recognized_roles", "sheet_relationship_status"):
            self.assertIsNone(result[key])
        self.assertNotIn("PRIVATE_", json.dumps(result))

    def test_mocked_production_slots_identity_order_and_fixed_selected_field_gate(self):
        raw = fixture()
        for run in ("1", "2"):
            with self.subTest(run=run):
                result, reads, writes, destinations, events, calls = self.production_case(run=run, raw=raw)
                self.assert_valid(result)
                self.assert_science_blocked(result)
                self.assertFalse(result["synthetic_fixture"])
                self.assertTrue(result["source_identity_verified"])
                self.assertEqual(reads, [(self.module.PREREQUISITE, 65536), (self.module.custody.CAPTURE, 65536),
                                       (self.module.custody.OBJECT, self.module.custody.SOURCE_BYTES)])
                self.assertEqual(destinations, [f".cache/li-v3-custody/growth-envelope-v1/{run}/public.json"])
                self.assertEqual(events[0], ("absence", "public.json"))
                self.assertEqual(calls["identity_args"][0].args, (raw, self.module.header_diagnostic.OBJECT_SHA256))
                self.assertEqual(json.loads(writes[0]), result)
                self.assertEqual(calls["close"], 1)
        for padding in (0, 511, 513):
            result, _, writes, _, _, _ = self.production_case(raw=fixture(extra_by_index={0: tlv(0xA220, growth_body(0, b"\0" * padding))}))
            self.assertEqual(result["reason"], "GROWTH_PREDECESSOR_FIELDS_MISMATCH")
            self.assertFalse(result["exposure"]["archive_open_started"])
            self.assertEqual(len(writes), 1)
            self.assertFalse(result["exposure"]["selected_growth"]["growth_hint_payload_interpretation_started"])

    def test_mocked_production_guard_failures_stop_before_later_reads(self):
        expected = {"context": (0, "FROZEN_SOURCE_REQUIRED"), "occupied": (0, "OUTPUT_CONFLICT"),
                    "prerequisite": (1, "GROWTH_PREREQUISITE_INVALID"), "capture": (2, "CAPTURE_RECEIPT_INVALID"),
                    "read": (3, "FILE_READ_FAILED"), "identity": (3, "SOURCE_SHA256_MISMATCH")}
        for failure, (count, reason) in expected.items():
            with self.subTest(failure=failure):
                result, reads, writes, _, _, calls = self.production_case(failure=failure)
                self.assert_guard(result, reason); self.assertEqual(len(reads), count); self.assertEqual(writes, [])
                self.assertIs(result["exposure"]["raw_buffer_read_started"], failure in ("read", "identity"))
                self.assertIs(result["exposure"]["raw_buffer_read_completed"], failure == "identity")
                self.assertIs(result["exposure"]["target_bearing_source_bytes_read"],
                              None if failure == "read" else failure == "identity")
                self.assertFalse(result["exposure"]["archive_open_started"])
        for run in (None, 1, True, "0", "3", "../1"):
            result, reads, _, destinations, _, calls = self.production_case(run=run)
            self.assert_guard(result, "CLI_ARGUMENT_INVALID")
            self.assertEqual(reads, []); self.assertEqual(destinations, []); self.assertEqual(calls["context"], 0)

    def test_mocked_write_close_failure_and_replay_keep_exposure_without_acceptance(self):
        for failure in ("write", "partial_write", "close"):
            occupied = set()
            with self.subTest(failure=failure):
                result, _, writes, _, _, calls = self.production_case(failure=failure, occupied=occupied)
                self.assert_guard(result, "INTERNAL_FAILURE" if failure == "close" else "FILE_WRITE_FAILED")
                self.assertTrue(result["exposure"]["envelope_checks_completed"])
                self.assertTrue(result["exposure"]["archive_close_completed"])
                self.assertEqual(result["exposure"]["xml_decoding_completed"], list(REQUIRED))
                self.assertEqual(calls["close"], 1)
                if failure == "partial_write":
                    self.assertEqual(len(writes[0]), 29)
                elif failure == "close":
                    self.assertTrue(json.loads(writes[0])["archive_profile_accepted"])
                result, reads, writes, _, _, _ = self.production_case(occupied=occupied)
                self.assert_guard(result, "OUTPUT_CONFLICT")
                self.assertEqual(reads, []); self.assertEqual(writes, [])

    def test_prerequisite_bridge_closed_constants_and_error_projection_without_io(self):
        module = self.module
        self.assertEqual(module.PREREQUISITE_SHA256, "52fe2d25f0c739c1c5137f0514f07f4ee0be35dffd7ef9141b19fe5ee5520d2e")
        self.assertEqual(module.PREREQUISITE_PRODUCER, "d0505b9b358a4bdeafbd742f1aeeb6c2b955abf3")
        with patch.object(module.growth, "_validate_prerequisite", return_value=module.PREREQUISITE_SHA256) as validator:
            self.assertEqual(module._validate_prerequisite(b"synthetic"), module.PREREQUISITE_SHA256)
            validator.assert_called_once_with(b"synthetic")
        for key in ("PREREQUISITE", "PREREQUISITE_SHA256", "PREREQUISITE_PRODUCER"):
            with self.subTest(key=key), patch.object(module.growth, key, "different"), \
                    patch.object(module.growth, "_validate_prerequisite") as validator:
                with self.assertRaisesRegex(module.GrowthEnvelopeError, "^GROWTH_PREREQUISITE_INVALID$"):
                    module._validate_prerequisite(b"synthetic")
                validator.assert_not_called()
        with patch.object(module.growth, "_validate_prerequisite", side_effect=ValueError("PRIVATE_RECEIPT_CANARY")):
            with self.assertRaisesRegex(module.GrowthEnvelopeError, "^GROWTH_PREREQUISITE_INVALID$"):
                module._validate_prerequisite(b"synthetic")
        self.assertEqual(str(module.GrowthEnvelopeError("PRIVATE_NEW_CODE")), "INTERNAL_FAILURE")

    def test_mocked_source_context_binds_four_files_head_and_detaches_inherited_maps(self):
        module = self.module
        prior = {"mode": "committed_source", "commit": "a" * 40,
                 "files": dict(module.GROWTH_FILES), "legacy_files": {"synthetic": "b" * 64}}
        raw = {path: ("mock source " + path).encode() for path in module.FROZEN_PATHS}
        for fault in (None, "prior", "index", "head"):
            fake = deepcopy(prior)
            if fault == "prior": fake["files"] = {}
            def git(command, **kwargs):
                if command == ["git", "rev-parse", "--show-prefix"]: value = b"discovery/\n"
                elif command == ["git", "rev-parse", "HEAD"]: value = (("b" if fault == "head" else "a") * 40).encode() + b"\n"
                else:
                    revision, path = command[2].split(":", 1)
                    value = raw[path.removeprefix("discovery/")]
                    if fault == "index" and not revision: value += b"changed"
                return SimpleNamespace(stdout=value)
            with self.subTest(fault=fault), patch.object(module, "__file__", str(module.ROOT / module.FROZEN_PATHS[0])), \
                    patch.object(module.growth, "production_context", return_value=fake), \
                    patch.object(module.custody, "_read_relative", side_effect=lambda path, cap: raw[path]), \
                    patch.object(module.subprocess, "run", side_effect=git):
                if fault is None:
                    result = module.production_context()
                    self.assertEqual(result["files"], {path: hashlib.sha256(value).hexdigest() for path, value in raw.items()})
                    self.assertIsNot(result["legacy_files"], fake["legacy_files"])
                    result["legacy_files"]["synthetic"] = "changed"
                    self.assertEqual(fake["legacy_files"]["synthetic"], "b" * 64)
                    self.assertIsNot(result["growth_shape_files"], module.GROWTH_FILES)
                else:
                    with self.assertRaisesRegex(module.CustodyError, "^FROZEN_SOURCE_REQUIRED$"):
                        module.production_context()
        with patch.object(module, "__file__", str(module.ROOT / "uncommitted-candidate.py")):
            with self.assertRaisesRegex(module.CustodyError, "^FROZEN_SOURCE_REQUIRED$"):
                module.production_context()


if __name__ == "__main__":
    unittest.main()
