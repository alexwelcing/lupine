"""Independent synthetic Li envelope/guard review; no observation or network access."""
from contextlib import ExitStack
from copy import deepcopy
from io import BytesIO, StringIO
import importlib.util
import json
import os
from pathlib import Path
import socket
import sys
import tempfile
import unittest
from unittest.mock import patch
import warnings
import zipfile

HERE = Path(__file__).resolve().parent
CANDIDATE = (HERE.parent / "scripts/li_v3_custody.py" if HERE.name == "tests" else
             HERE.parent / "phase2-li-custody-implementation-v1/promotion/scripts/li_v3_custody.py")
MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
DOC_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
TYPE_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
CANARY_A = "WITHHELD_TARGET_ALPHA_7319"
CANARY_B = "WITHHELD_TARGET_OMEGA_2648"
COMPONENTS = ("[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels")
MODULE = None
NETWORK_CALLS = []


def forbidden_network(*args, **kwargs):
    NETWORK_CALLS.append(True)
    raise AssertionError("independent review forbids real network")


def setUpModule():
    global MODULE
    guards = ExitStack()
    unittest.addModuleCleanup(guards.close)
    guards.enter_context(patch("socket.socket", side_effect=forbidden_network))
    guards.enter_context(patch("socket.getaddrinfo", side_effect=forbidden_network))
    spec = importlib.util.spec_from_file_location("independent_li_candidate", CANDIDATE)
    MODULE = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = MODULE
    unittest.addModuleCleanup(sys.modules.pop, spec.name, None)
    spec.loader.exec_module(MODULE)


def parts(*, unknown_name="Data", canary=CANARY_A):
    """Independent standard OOXML envelope; opaque members need not be XML."""
    sheet_names = (unknown_name, "References", "Column Descriptions")
    data = {}
    data["[Content_Types].xml"] = (
        f'<Types xmlns="{TYPE_NS}">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1,4))
        + '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
        '</Types>'
    ).encode()
    data["_rels/.rels"] = (
        f'<Relationships xmlns="{PKG_NS}">'
        f'<Relationship Id="rId1" Type="{DOC_NS}/officeDocument" Target="xl/workbook.xml"/>'
        '</Relationships>'
    ).encode()
    data["xl/workbook.xml"] = (
        f'<workbook xmlns="{MAIN_NS}" xmlns:r="{DOC_NS}"><sheets>'
        + ''.join(f'<sheet name="{name}" sheetId="{i}" r:id="rId{i}"/>' for i,name in enumerate(sheet_names,1))
        + '</sheets></workbook>'
    ).encode()
    data["xl/_rels/workbook.xml.rels"] = (
        f'<Relationships xmlns="{PKG_NS}">'
        + ''.join(f'<Relationship Id="rId{i}" Type="{DOC_NS}/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,4))
        + f'<Relationship Id="rId4" Type="{DOC_NS}/sharedStrings" Target="sharedStrings.xml"/>'
        '</Relationships>'
    ).encode()
    for i in range(1,4):
        data[f"xl/worksheets/sheet{i}.xml"] = (canary + " <not-well-formed-opaque-worksheet").encode()
    data["xl/sharedStrings.xml"] = (canary + " <not-well-formed-opaque-shared-strings").encode()
    return data


def archive(data, *, duplicate=None, compression=zipfile.ZIP_DEFLATED):
    stream = BytesIO()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        with zipfile.ZipFile(stream, "w", compression=compression) as output:
            for name, content in data.items():
                output.writestr(name, content)
            if duplicate is not None:
                output.writestr(duplicate, data[duplicate])
    return stream.getvalue()


class FakeResponse:
    def __init__(self, status, *, location=None, payload=b""):
        self.status = status
        self.headers = {} if location is None else {"Location": location}
        self.payload = BytesIO(payload)
        self.closed = False
        self.read_calls = []

    def read(self, count=-1):
        self.read_calls.append(count)
        return self.payload.read(count)

    def close(self):
        self.closed = True


class IndependentEnvelopeReview(unittest.TestCase):
    def tearDown(self):
        self.assertEqual(NETWORK_CALLS, [], "a candidate path attempted real network")

    def inspect(self, data):
        return MODULE.inspect_synthetic_envelope(archive(data))

    def assert_closed(self, result):
        self.assertEqual(result["status"], "BLOCKED_SCHEMA")
        serialized = json.dumps(result, sort_keys=True)
        for canary in (CANARY_A, CANARY_B):
            self.assertNotIn(canary, serialized)
        return serialized

    def assert_blocked_layout(self, data):
        result = self.inspect(data)
        self.assert_closed(result)
        self.assertEqual(result["engineering_status"], "BLOCKED_LAYOUT")
        return result

    def test_opaque_invalid_xml_and_unknown_names_do_not_change_semantics(self):
        first = self.inspect(parts(unknown_name=CANARY_A, canary=CANARY_A))
        second = self.inspect(parts(unknown_name=CANARY_B, canary=CANARY_B))
        self.assert_closed(first)
        self.assert_closed(second)
        self.assertEqual(first["engineering_status"], "ENVELOPE_VALID")
        self.assertEqual(second["engineering_status"], "ENVELOPE_VALID")
        # Whole-object byte counts and digests identify the changed buffers;
        # those declared custody fields are not the semantic projection.
        self.assertEqual(set(first["observed"]), {"bytes", "md5", "sha256"})
        self.assertEqual(set(second["observed"]), {"bytes", "md5", "sha256"})
        self.assertEqual({k:v for k,v in first.items() if k != "observed"},
                         {k:v for k,v in second.items() if k != "observed"})

    def test_zip_decompression_opens_only_the_four_approved_components(self):
        seen = []
        original = zipfile.ZipFile.open
        def allowed_open(instance, name, *args, **kwargs):
            actual = name.filename if isinstance(name, zipfile.ZipInfo) else name
            self.assertIn(actual, COMPONENTS, "unapproved ZIP payload was opened")
            seen.append(actual)
            return original(instance, name, *args, **kwargs)
        raw = archive(parts())
        with patch.object(zipfile.ZipFile, "open", allowed_open):
            result = MODULE.inspect_synthetic_envelope(raw)
        self.assert_closed(result)
        self.assertEqual(result["engineering_status"], "ENVELOPE_VALID")
        self.assertEqual(set(seen), set(COMPONENTS))

    def test_unsafe_paths_and_duplicate_members_fail_without_name_disclosure(self):
        for unsafe in ("../" + CANARY_A, "/" + CANARY_A, "xl/../" + CANARY_A,
                       "xl/" + CANARY_A + "\\hidden.xml"):
            with self.subTest(case="unsafe path"):
                data = parts()
                data[unsafe] = b"withheld"
                self.assert_blocked_layout(data)
        result = MODULE.inspect_synthetic_envelope(archive(parts(), duplicate="xl/workbook.xml"))
        self.assert_closed(result)
        self.assertEqual(result["engineering_status"], "BLOCKED_LAYOUT")

    def test_unknown_or_external_relationships_do_not_disclose_targets(self):
        for target in ("../" + CANARY_A + ".xml", "https://invalid.example/" + CANARY_A):
            data = parts()
            original = 'Target="worksheets/sheet1.xml"'
            replacement = f'Target="{target}"'
            if target.startswith("https:"):
                replacement += ' TargetMode="External"'
            data["xl/_rels/workbook.xml.rels"] = data["xl/_rels/workbook.xml.rels"].replace(
                original.encode(), replacement.encode())
            self.assert_blocked_layout(data)
        data = parts()
        data["xl/_rels/workbook.xml.rels"] = data["xl/_rels/workbook.xml.rels"].replace(
            b'Id="rId2"', b'Id="rId1"')
        self.assert_blocked_layout(data)
        data = parts()
        data["xl/workbook.xml"] = data["xl/workbook.xml"].replace(
            b'name="References"', b'name="Data"')
        self.assert_blocked_layout(data)

    def test_xml_entity_profiles_reject_before_interpreting_payload(self):
        for encoding in ("utf-8", "utf-16"):
            data = parts()
            text = data["xl/workbook.xml"].decode().replace('name="Data"', 'name="&secret;"')
            text = (f'<?xml version="1.0" encoding="{encoding}"?>'
                    f'<!DOCTYPE workbook [<!ENTITY secret "{CANARY_A}">]>' + text)
            data["xl/workbook.xml"] = text.encode(encoding)
            self.assert_blocked_layout(data)

    def test_member_and_actual_decompression_caps_fail_closed(self):
        data = parts()
        for ordinal in range(129 - len(data)):
            data[f"opaque{ordinal}.xml"] = CANARY_A.encode()
        self.assert_blocked_layout(data)
        data = parts()
        # A small compressed buffer expands beyond the 2 MiB member ceiling.
        data["xl/workbook.xml"] = b" " * (2 * 1024 * 1024 + 1)
        self.assert_blocked_layout(data)
        data = parts()
        data["xl/workbook.xml"] = (
            f'<workbook xmlns="{MAIN_NS}">'.encode() + b"<a>" * 65
            + b"</a>" * 65 + b"</workbook>")
        self.assert_blocked_layout(data)

    def test_filesystem_descriptor_helpers_refuse_links_conflicts_and_oversize(self):
        with tempfile.TemporaryDirectory(dir=HERE) as directory:
            root = Path(directory)
            root.joinpath("original").write_bytes(b"original fixture")
            root.joinpath("link").symlink_to(root / "original")
            fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY)
            try:
                self.assertEqual(MODULE._read_at(fd, "original", 100), b"original fixture")
                for name, cap in (("link", 100), ("original", 1)):
                    with self.assertRaises(Exception):
                        MODULE._read_at(fd, name, cap)
                for name in ("original", "link"):
                    with self.assertRaises(Exception):
                        MODULE._write_at(fd, name, b"replacement")
                self.assertEqual(root.joinpath("original").read_bytes(), b"original fixture")
                MODULE._write_at(fd, "new", b"synthetic only")
                self.assertEqual(root.joinpath("new").read_bytes(), b"synthetic only")
                self.assertEqual(root.joinpath("new").stat().st_mode & 0o777, 0o600)
            finally:
                os.close(fd)

    def test_ignored_source_guard_precedes_git_cache_or_network(self):
        with patch.object(MODULE, "__file__", str(HERE / "ignored-source.py")), \
                patch.object(MODULE, "_open_once", side_effect=AssertionError("transport invoked")) as network, \
                patch.object(MODULE.subprocess, "run", side_effect=AssertionError("git invoked")) as git:
            with self.assertRaises(Exception):
                MODULE.production_context()
            network.assert_not_called()
            git.assert_not_called()

    def test_fixed_redirect_rejects_near_matches_and_secret_error_text(self):
        base = "https://rgw.cscs.ch/mc-archive/b7/74/3ed4-0d28-4f55-ab74-6d85981537d7/data"
        approved = base + "?opaque=" + CANARY_A
        MODULE._validate_redirect(approved)
        variants = [
            approved.replace("https:", "http:"),
            approved.replace("rgw.cscs.ch", "rgw.cscs.ch.invalid.example"),
            approved.replace("/data?", "/different?"),
            approved + "#" + CANARY_B,
            approved.replace("https://", "https://" + CANARY_B + "@"),
        ]
        for location in variants:
            with self.subTest(case="unapproved redirect"):
                with self.assertRaises(Exception) as caught:
                    MODULE._validate_redirect(location)
                self.assertNotIn(CANARY_A, str(caught.exception))
                self.assertNotIn(CANARY_B, str(caught.exception))

    def test_second_redirect_is_rejected_without_body_read_or_follow(self):
        destination = "https://rgw.cscs.ch/mc-archive/b7/74/3ed4-0d28-4f55-ab74-6d85981537d7/data?opaque=" + CANARY_A
        first = FakeResponse(302, location=destination)
        second = FakeResponse(302, location="https://invalid.example/" + CANARY_B)
        with patch.object(MODULE, "_open_once", side_effect=[first, second]) as transport:
            with self.assertRaises(Exception) as caught:
                MODULE._fetch_fixed()
        self.assertEqual(transport.call_count, 2)
        self.assertEqual(first.read_calls, [])
        self.assertEqual(second.read_calls, [])
        self.assertTrue(first.closed)
        self.assertTrue(second.closed)
        self.assertNotIn(CANARY_A, str(caught.exception))
        self.assertNotIn(CANARY_B, str(caught.exception))


    def test_public_inventory_copy_cannot_mutate_trusted_nested_metadata(self):
        snapshot = deepcopy(MODULE.EXPECTED_INVENTORY)
        # Isolate this adversarial mutation so a failing candidate cannot
        # contaminate later tests or alter the imported module's real constants.
        with patch.object(MODULE, "EXPECTED_INVENTORY", deepcopy(snapshot)):
            report = self.inspect(parts())
            report["source"]["redirect"]["host"] = CANARY_A
            report["source"]["unresolved_publication_counts"]["archive_records"] = 0
            self.assertEqual(MODULE.EXPECTED_INVENTORY, snapshot)

    def synthetic_capture_receipt(self):
        identity = {"mode": "committed_source", "commit": "a" * 40,
                    "files": {path: "b" * 64 for path in MODULE.FROZEN_PATHS}}
        receipt = {
            "schema": "lupine.discovery.li_v3.capture.v1", "action": "capture",
            "status": "CAPTURED", "reason": "CAPTURE_VERIFIED",
            "source": deepcopy(MODULE.EXPECTED_INVENTORY),
            "inventory_sha256": MODULE.INVENTORY_SHA256,
            "implementation": deepcopy(identity),
            "observed": {"bytes": 183878, "md5": "041bbe095c54615e5a3c289facb18ce5", "sha256": "c" * 64},
            "source_identity_verified": True,
            "exposure": {"target_bearing_source_bytes_acquired": True,
                         "raw_workbook_buffer_read": True, "members_decompressed": [],
                         "worksheet_cells_decoded": False, "shared_strings_decoded": False,
                         "target_numeric_validity_checked": False,
                         "scientific_eligibility_decisions": False, "fits": 0, "splits": 0},
            "row_count": None, "paired_count": None, "source_group_count": None, "overlap_count": None,
        }
        return identity, receipt

    def inspect_capture_validation_only(self, identity, raw):
        """Reach the receipt validator with fake descriptors/readers only.

        The test deliberately stops before even a synthetic object is read.
        Production capture, real cache paths and real target-bearing bytes are
        unavailable throughout this adapter.
        """
        reads = []
        def fake_read(path, cap):
            reads.append(path)
            if path != MODULE.CAPTURE:
                raise AssertionError("VALIDATION_PASSED_TO_FAKE_OBJECT_BOUNDARY")
            return raw
        with tempfile.TemporaryDirectory(dir=HERE) as directory:
            with patch.object(MODULE, "production_context", return_value=identity), \
                    patch.object(MODULE, "_output_directory", side_effect=lambda unused: os.open(directory, os.O_RDONLY | os.O_DIRECTORY)), \
                    patch.object(MODULE, "_read_relative", side_effect=fake_read), \
                    patch.object(MODULE, "_open_once", side_effect=AssertionError("transport invoked")) as network:
                try:
                    MODULE.envelope(".cache/li-v3-custody/review/public.json")
                except Exception as error:
                    network.assert_not_called()
                    return error, reads
        raise AssertionError("validation-only adapter must stop before object access")

    def test_capture_receipt_closed_shape_types_and_exposure_before_object_read(self):
        identity, original = self.synthetic_capture_receipt()
        error, reads = self.inspect_capture_validation_only(identity, MODULE.canonical(original))
        self.assertIsInstance(error, AssertionError)
        self.assertEqual(str(error), "VALIDATION_PASSED_TO_FAKE_OBJECT_BOUNDARY")
        self.assertEqual(reads, [MODULE.CAPTURE, MODULE.OBJECT])
        variants = []
        altered = deepcopy(original)
        altered["unexpected"] = CANARY_A
        variants.append(altered)
        for key, value in (("source_identity_verified", 1), ("paired_count", 0),
                           ("action", "envelope")):
            altered = deepcopy(original)
            altered[key] = value
            variants.append(altered)
        for key, value in (("mode", "synthetic_fixture"), ("commit", "not-a-commit")):
            altered = deepcopy(original)
            altered["implementation"][key] = value
            variants.append(altered)
        for key, value in (("worksheet_cells_decoded", True), ("fits", False)):
            altered = deepcopy(original)
            altered["exposure"][key] = value
            variants.append(altered)
        altered = deepcopy(original)
        altered["observed"]["bytes"] = 183878.0
        variants.append(altered)
        altered = deepcopy(original)
        altered["source"]["version"] = 3.0
        variants.append(altered)
        for altered in variants:
            with self.subTest(case="noncanonical capture receipt"):
                error, reads = self.inspect_capture_validation_only(identity, MODULE.canonical(altered))
                self.assertIsInstance(error, MODULE.CustodyError)
                self.assertEqual(str(error), "CAPTURE_RECEIPT_INVALID")
                self.assertEqual(reads, [MODULE.CAPTURE])
                self.assertNotIn(CANARY_A, str(error))
        duplicate = MODULE.canonical(original).replace(
            b'"status":"CAPTURED"', b'"status":"CAPTURED","status":"CAPTURED"')
        error, reads = self.inspect_capture_validation_only(identity, duplicate)
        self.assertIsInstance(error, MODULE.CustodyError)
        self.assertEqual(str(error), "CAPTURE_RECEIPT_INVALID")
        self.assertEqual(reads, [MODULE.CAPTURE])


if __name__ == "__main__":
    unittest.main()
