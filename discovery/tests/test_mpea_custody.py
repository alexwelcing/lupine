"""Synthetic producer, provenance and captured-buffer checks; no dataset access."""
from __future__ import annotations

from contextlib import redirect_stdout
from copy import deepcopy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/mpea_custody.py"
spec = importlib.util.spec_from_file_location("mpea_custody_producer_tests", SCRIPT)
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
spec.loader.exec_module(m)


def fixture(raw):
    return m.SourceSpec(9, 25797305, "MPEA_dataset.csv", len(raw), hashlib.md5(raw).hexdigest())


def reseal(value):
    value.pop("content_sha256", None)
    value["content_sha256"] = m.sha256(m.canonical_bytes(value))
    return value


class MPEACustodyProducerTests(unittest.TestCase):
    def test_scratch_default_fetch_is_blocked_before_any_network(self):
        with patch.object(m, "__file__", str(m.ROOT / ".cache/synthetic-custody.py")), \
             patch.object(m, "build_opener", side_effect=AssertionError("network forbidden")) as network:
            with self.assertRaisesRegex(m.CustodyError, "FROZEN_SOURCE_REQUIRED"):
                m._fetch(m.SOURCE)
            result = m.acquire_to_cache()
        network.assert_not_called()
        self.assertEqual(result["reason"], "FROZEN_SOURCE_REQUIRED")
        self.assertEqual(result["status"], "BLOCKED_GUARD")
        self.assertIsNone(result["observed"])

    def test_pinned_inventory_bytes_are_verified_before_decoding(self):
        value = m.load_inventory()
        self.assertEqual(value["archive"]["file"]["id"], 25797305)
        with patch.object(Path, "read_bytes", return_value=b"PRIVATE_INVALID_INVENTORY"), \
             patch.object(m.json, "loads", side_effect=AssertionError("must not decode")) as decode:
            with self.assertRaisesRegex(m.CustodyError, "INVENTORY_INVALID"):
                m.load_inventory()
        decode.assert_not_called()

    def test_clean_git_checkpoint_binds_all_files_and_dirty_or_missing_blocks(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "discovery"
            root.mkdir()
            (root / "AGENTS.md").write_text("Synthetic fixture only.\n")
            for relative in m.FROZEN_PATHS:
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("synthetic " + relative + "\n")
            def git(*args):
                return subprocess.run(["git", *args], cwd=root, check=True, capture_output=True).stdout
            git("init", "-q")
            git("-c", "user.name=Custody Test", "-c", "user.email=custody@example.invalid", "add", ".")
            git("-c", "user.name=Custody Test", "-c", "user.email=custody@example.invalid", "commit", "-qm", "synthetic")
            with patch.object(m, "ROOT", root), patch.object(m, "__file__", str(root / m.FROZEN_PATHS[0])), \
                 patch.object(m, "load_inventory", return_value={}):
                identity = m.frozen_source_identity()
                self.assertEqual(identity["commit"], git("rev-parse", "HEAD").decode().strip())
                self.assertEqual(identity["files"], {rel: m.sha256((root / rel).read_bytes()) for rel in m.FROZEN_PATHS})
                target = root / m.FROZEN_PATHS[1]
                original = target.read_bytes()
                target.write_bytes(original + b"dirty")
                with self.assertRaisesRegex(m.CustodyError, "FROZEN_SOURCE_REQUIRED"):
                    m.frozen_source_identity()
                target.write_bytes(original)
                target.unlink()
                with self.assertRaisesRegex(m.CustodyError, "FROZEN_SOURCE_REQUIRED"):
                    m.frozen_source_identity()

    def test_checkpoint_rejects_symlink_source_even_if_bytes_agree(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "scripts").mkdir()
            other = root / "other.py"
            other.write_text("synthetic\n")
            source = root / m.FROZEN_PATHS[0]
            source.symlink_to(other)
            def git(*args, **kwargs):
                command = args[0]
                stdout = b"a" * 40 + b"\n" if command[-1] == "HEAD" else b"\n"
                return subprocess.CompletedProcess(command, 0, stdout, b"")
            with patch.object(m, "ROOT", root), patch.object(m, "__file__", str(source)), \
                 patch.object(m, "load_inventory", return_value={}), patch.object(m.subprocess, "run", side_effect=git):
                with self.assertRaisesRegex(m.CustodyError, "FROZEN_SOURCE_REQUIRED"):
                    m.frozen_source_identity()

    def test_acquire_then_header_inspect_has_distinct_action_flags(self):
        raw = b"DOI,FORMULA\n\xff\x00\"PRIVATE_BODY"
        source = fixture(raw)
        with tempfile.TemporaryDirectory() as temporary, patch.object(m, "ROOT", Path(temporary)):
            capture = m.acquire_to_cache(fetch=lambda requested: raw, spec=source)
            header = m.inspect_cache(spec=source)
        self.assertEqual(capture["status"], "CAPTURED")
        self.assertFalse(capture["scope"]["header_decode_attempted"])
        self.assertEqual(header["status"], "BLOCKED_SCHEMA")
        self.assertTrue(header["scope"]["header_decode_attempted"])
        self.assertEqual(capture["observed"], header["observed"])
        self.assertNotIn("PRIVATE_BODY", json.dumps(header))
        self.assertFalse(header["scope"]["data_rows_decoded"])

    def test_inspect_uses_same_captured_bytes_if_cache_changes_before_scan(self):
        original = b"DOI,FORMULA\n\xffORIGINAL_BODY"
        replacement = b"DOI,PRIVATE_REPLACEMENT\n123"
        source = fixture(original)
        with tempfile.TemporaryDirectory() as temporary, patch.object(m, "ROOT", Path(temporary)):
            m.acquire_to_cache(fetch=lambda requested: original, spec=source)
            path = m._object_path(m.cache_root(), source)
            scan = m.scan_header
            def replace_after_capture(captured):
                path.write_bytes(replacement)
                self.assertEqual(captured, original)
                return scan(captured)
            with patch.object(m, "scan_header", side_effect=replace_after_capture) as scanner:
                result = m.inspect_cache(spec=source)
            scanner.assert_called_once_with(original)
            self.assertEqual(path.read_bytes(), replacement)
        self.assertEqual(result["observed"]["sha256"], m.sha256(original))
        self.assertEqual([entry["token"] for entry in result["header"]["columns"]], ["DOI", "FORMULA"])
        self.assertNotIn("PRIVATE_REPLACEMENT", json.dumps(result))

    def test_acquisition_refuses_object_created_during_fetch(self):
        raw = b"DOI\nSYNTHETIC_BODY"
        source = fixture(raw)
        with tempfile.TemporaryDirectory() as temporary, patch.object(m, "ROOT", Path(temporary)):
            path = m._object_path(m.cache_root(), source)
            def fetch(requested):
                path.parent.mkdir(parents=True)
                path.write_bytes(b"CONCURRENT_PRIVATE_CONFLICT")
                return raw
            result = m.acquire_to_cache(fetch=fetch, spec=source)
            self.assertEqual(path.read_bytes(), b"CONCURRENT_PRIVATE_CONFLICT")
        self.assertEqual(result["status"], "BLOCKED_IO")
        self.assertEqual(result["reason"], "CACHE_WRITE_FAILED")
        self.assertTrue(result["source_verified"])
        self.assertTrue(result["scope"]["dataset_bytes_acquired"])
        self.assertEqual(result["observed"]["sha256"], m.sha256(raw))

    def test_write_failure_retains_captured_exposure_but_redacts_error(self):
        raw = b"DOI\nPRIVATE_BODY"
        source = fixture(raw)
        with tempfile.TemporaryDirectory() as temporary, patch.object(m, "ROOT", Path(temporary)), \
             patch.object(Path, "mkdir", side_effect=OSError("PRIVATE_ERROR_CANARY")):
            result = m.acquire_to_cache(fetch=lambda requested: raw, spec=source)
        self.assertEqual(result["reason"], "CACHE_WRITE_FAILED")
        self.assertTrue(result["source_verified"])
        self.assertTrue(result["scope"]["dataset_bytes_acquired"])
        self.assertFalse(result["scope"]["header_decode_attempted"])
        self.assertEqual(result["observed"]["sha256"], m.sha256(raw))
        self.assertNotIn("PRIVATE", json.dumps(result))

    def test_public_sink_is_idempotent_and_refuses_conflicting_bytes(self):
        raw = b"DOI\nPRIVATE_BODY"
        source = fixture(raw)
        report = m.inspect_bytes(raw, source)
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "report.json"
            m.write_public(report, path, spec=source)
            before = path.read_bytes()
            m.write_public(report, path, spec=source)
            self.assertEqual(path.read_bytes(), before)
            path.write_bytes(b"PRESERVE_EXISTING")
            with self.assertRaisesRegex(m.CustodyError, "PUBLIC_OUTPUT_CONFLICT"):
                m.write_public(report, path, spec=source)
            self.assertEqual(path.read_bytes(), b"PRESERVE_EXISTING")

    def test_resealed_reason_status_mismatch_is_rejected(self):
        raw = b"DOI\nBODY"
        source = fixture(raw)
        report = m.inspect_bytes(raw, source)
        for status, reason in (("BLOCKED_IO", "CAPTURE_VERIFIED"), ("BLOCKED_SOURCE", "MD5_MISMATCH"),
                               ("BLOCKED_GUARD", "FROZEN_SOURCE_REQUIRED"), ("BLOCKED_IO", "FETCH_FAILED")):
            with self.subTest(status=status, reason=reason):
                forged = deepcopy(report)
                forged.update(status=status, reason=reason, header=None)
                forged["scope"]["header_decode_attempted"] = False
                with self.assertRaisesRegex(m.CustodyError, "PUBLIC_SCHEMA_INVALID"):
                    m.validate_public_report(reseal(forged), spec=source)

    def test_private_implementation_payload_cannot_cross_public_boundary(self):
        raw = b"DOI\nBODY"
        for identity in ({"mode": "synthetic_unfrozen", "commit": None, "files": {}, "private": "SECRET"},
                         {"mode": "committed_source", "commit": "a" * 40, "files": {"SECRET": "b" * 64}}):
            with self.subTest(shape=list(identity)):
                with self.assertRaisesRegex(m.CustodyError, "PUBLIC_SCHEMA_INVALID"):
                    m.inspect_bytes(raw, fixture(raw), implementation=identity)

    def test_eof_header_is_bounded_and_remains_schema_blocked(self):
        for raw in (b"DOI,FORMULA", b'"DOI","FORMULA"'):
            report = m.inspect_bytes(raw, fixture(raw))
            self.assertEqual(report["header"]["terminator"], "EOF")
            self.assertEqual(report["status"], "BLOCKED_SCHEMA")
            self.assertIsNone(report["scope"]["row_count"])

    def test_cli_checkpoint_failure_is_constant_and_never_opens_network(self):
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as temporary, redirect_stdout(output), \
             patch.object(m, "__file__", str(m.ROOT / ".cache/synthetic-custody.py")), \
             patch.object(m, "build_opener", side_effect=AssertionError("forbidden")) as network:
            destination = Path(temporary) / "receipt.json"
            code = m.main(["acquire", "--output", str(destination)])
            self.assertFalse(destination.exists())
        network.assert_not_called()
        self.assertEqual(code, 2)
        self.assertEqual(json.loads(output.getvalue()), {"status": "BLOCKED", "reason": "FROZEN_SOURCE_REQUIRED"})


if __name__ == "__main__":
    unittest.main()
