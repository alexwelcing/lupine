#!/usr/bin/env python3
"""Disclose one verified MPEA header's labels; cache-only, always schema-blocked.

Production requires a committed amendment and sources before any cache read.
The imported, hash-pinned custodian contains unused acquisition functions; this
extractor never calls them. Synthetic APIs must not receive the real source.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import types

ROOT = next(p for p in Path(__file__).resolve().parents
            if p.name == "discovery" and (p / "AGENTS.md").is_file())
ORIGINAL_COMMIT = "75caf5fc56ed3c8bb4a8da4cc913fc3816c3bb63"
ORIGINAL_FILES = {
    "scripts/mpea_custody.py": "046aac4812802d1abf656aa93d0b832e8011e2feb59574615957c2550fe11b98",
    "tests/test_mpea_custody.py": "cf2fc7a0bdaf9bd59589c123745aae6f353fa5837849e26d2a9438d62d090b19",
    "tests/test_mpea_custody_review.py": "27cca2dc9ec6d96cbcbf06971fe352d6d4f5fb0572b33f8d6648a8ad4cb299bc",
    "docs/mpea-custody-plan.md": "381406c91451ffb4592539b7bc66beb215bdb00cd852bf1a01106bebe7d1b895",
    "reports/mpea-source-inventory.json": "ce2e1487cb91436137086f7c9900d091eed30068f6c8e9595687458c3f12679c",
}
RECEIPTS = {
    "reports/mpea-custody-acquisition-v1.json": "2bd6a5f44c28e97460a5ee0fca8eaf0e77a243cd72259e23fff2a75b264aca83",
    "reports/mpea-custody-header-v1.json": "01f0e9899f8afb1517d0efd0d2bb4c43ca9df94daadc6a2d15664ac1bbe4d827",
}
NEW_PATHS = ("scripts/mpea_header_labels.py", "tests/test_mpea_header_labels.py",
             "tests/test_mpea_header_labels_review.py",
             "docs/mpea-header-disclosure-amendment-v1.md")
FROZEN_PATHS = tuple(ORIGINAL_FILES) + tuple(RECEIPTS) + NEW_PATHS
SOURCE_BYTES = 332126
SOURCE_MD5 = "6d29eb6018157b863ca0033ccec936d5"
SOURCE_SHA256 = "c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d"
KNOWN_TOKENS = frozenset({"PROPERTY: Type of phases", "PROPERTY: Type of test",
                         "PROPERTY: Elongation (%)", "DOI", "FORMULA", "YS (MPa)",
                         "UTS (MPa)", "Elongation (%)"})
PARSER_PROFILE = {"id": "mpea.header_only.v1", "max_columns": 128,
                  "max_token_characters": 256, "max_header_characters": 65536,
                  "max_header_bytes": 262147}
CONSTANT_FLAGS = {"data_rows_decoded": False, "row_metadata_extracted": False,
                  "target_numeric_validity_checked": False, "full_schema_established": False,
                  "scientific_eligibility_decisions": False, "fits": 0, "splits": 0,
                  "row_count": None, "numeric_completeness": None}
HEADER_ERRORS = frozenset({"HEADER_MISSING", "HEADER_LIMIT", "HEADER_QUOTING_INVALID",
                          "HEADER_ENCODING_INVALID", "HEADER_BOM_INVALID", "HEADER_NUL_INVALID",
                          "HEADER_DUPLICATE", "HEADER_EMPTY_TOKEN", "INITIAL_HEADER_MISMATCH"})
ERRORS = HEADER_ERRORS | {"FROZEN_SOURCE_REQUIRED", "PARSER_IDENTITY_CONFLICT",
                         "INITIAL_RECEIPT_CONFLICT", "SOURCE_IDENTITY_CONFLICT", "CACHE_PATH_INVALID",
                         "CACHE_READ_FAILED", "CACHE_MISSING", "PUBLIC_SCHEMA_INVALID",
                         "PUBLIC_OUTPUT_CONFLICT", "CLI_ARGUMENT_INVALID", "INTERNAL_FAILURE"}


class DisclosureError(ValueError):
    """Only closed error codes may cross a public boundary."""


def canonical_bytes(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True,
                       allow_nan=False) + "\n").encode("ascii")


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def _hex(value, length=64):
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{%d}" % length, value) is not None


def _keys(value, expected):
    if not isinstance(value, dict) or set(value) != set(expected):
        raise DisclosureError("PUBLIC_SCHEMA_INVALID")


def _bounded_file(path, cap, error, *, probe_overflow=True):
    try:
        if path.is_symlink() or path.resolve() != path.absolute():
            raise DisclosureError(error)
        with path.open("rb") as stream:
            raw = stream.read(cap + 1 if probe_overflow else cap)
        if len(raw) > cap:
            raise DisclosureError(error)
        return raw
    except OSError:
        raise DisclosureError(error) from None


def load_parser():
    """Check and execute the same captured source bytes; never invoke fetch."""
    path = ROOT / "scripts/mpea_custody.py"
    raw = _bounded_file(path, 1048576, "PARSER_IDENTITY_CONFLICT")
    if sha256(raw) != ORIGINAL_FILES["scripts/mpea_custody.py"]:
        raise DisclosureError("PARSER_IDENTITY_CONFLICT")
    module = types.ModuleType("_mpea_disclosure_frozen_parser")
    module.__file__ = str(path)
    sys.modules[module.__name__] = module
    exec(compile(raw, str(path), "exec"), module.__dict__)
    if (module.MAX_COLUMNS != 128 or module.MAX_TOKEN_CHARS != 256
            or module.MAX_HEADER_CHARS != 65536 or module.MAX_HEADER_BYTES != 262147
            or module.HEADER_TOKENS != KNOWN_TOKENS):
        raise DisclosureError("PARSER_IDENTITY_CONFLICT")
    return module


def _initial_header():
    known = {1: "FORMULA", 9: "PROPERTY: Type of test", 13: "PROPERTY: Elongation (%)"}
    return {"column_count": 23, "bom": False, "terminator": "LF",
            "columns": [{"position": i, "status": "RECOGNIZED" if i in known else "UNKNOWN_COLUMN",
                         "token": known.get(i)} for i in range(23)]}


def _reference():
    return {"source": {"article_id": 12642953, "version": 9, "file_id": 25797305,
                       "doi": "10.6084/m9.figshare.12642953.v9", "name": "MPEA_dataset.csv",
                       "license": "CC BY 4.0"},
            "expected_blob": {"bytes": SOURCE_BYTES, "md5": SOURCE_MD5, "sha256": SOURCE_SHA256},
            "initial_header": _initial_header(), "initial_receipt_sha256": dict(RECEIPTS)}


def _identity(identity):
    _keys(identity, {"mode", "commit", "files"})
    if identity["mode"] == "synthetic_fixture":
        if identity["commit"] is not None or identity["files"] != {}:
            raise DisclosureError("PUBLIC_SCHEMA_INVALID")
    elif identity["mode"] == "committed_source":
        if (not _hex(identity["commit"], 40) or not isinstance(identity["files"], dict)
                or set(identity["files"]) != set(FROZEN_PATHS)
                or not all(_hex(x) for x in identity["files"].values())
                or any(identity["files"][key] != value for key, value in {**ORIGINAL_FILES, **RECEIPTS}.items())):
            raise DisclosureError("PUBLIC_SCHEMA_INVALID")
    else:
        raise DisclosureError("PUBLIC_SCHEMA_INVALID")


def frozen_source_identity():
    if Path(__file__).resolve() != (ROOT / NEW_PATHS[0]).resolve():
        raise DisclosureError("FROZEN_SOURCE_REQUIRED")
    try:
        def git(*args):
            return subprocess.run(["git", *args], cwd=ROOT, check=True,
                                  capture_output=True, timeout=10).stdout
        commit = git("rev-parse", "HEAD").decode("ascii").strip()
        prefix = git("rev-parse", "--show-prefix").decode("utf-8").strip()
        hashes = {}
        for relative in FROZEN_PATHS:
            captured = _bounded_file(ROOT / relative, 1048576, "FROZEN_SOURCE_REQUIRED")
            if captured != git("show", commit + ":" + prefix + relative):
                raise DisclosureError("FROZEN_SOURCE_REQUIRED")
            hashes[relative] = sha256(captured)
        identity = {"mode": "committed_source", "commit": commit, "files": hashes}
        _identity(identity)
        return identity
    except (OSError, UnicodeError, subprocess.SubprocessError, ValueError):
        raise DisclosureError("FROZEN_SOURCE_REQUIRED") from None


def verify_initial_receipts(parser):
    captured = {}
    for relative, expected in RECEIPTS.items():
        raw = _bounded_file(ROOT / relative, 16384, "INITIAL_RECEIPT_CONFLICT")
        if sha256(raw) != expected:
            raise DisclosureError("INITIAL_RECEIPT_CONFLICT")
        try:
            value = json.loads(raw)
            parser.validate_public_report(value)
        except Exception:
            raise DisclosureError("INITIAL_RECEIPT_CONFLICT") from None
        if (value["observed"] != _reference()["expected_blob"]
                or value["implementation"] != {"mode": "committed_source", "commit": ORIGINAL_COMMIT,
                                               "files": ORIGINAL_FILES}):
            raise DisclosureError("INITIAL_RECEIPT_CONFLICT")
        captured[relative] = value
    acquisition, header = (captured[path] for path in RECEIPTS)
    if (acquisition["status"] != "CAPTURED" or header["status"] != "BLOCKED_SCHEMA"
            or canonical_bytes(header["header"]) != canonical_bytes(_initial_header())):
        raise DisclosureError("INITIAL_RECEIPT_CONFLICT")
    return _reference()


def _redact(private):
    return {"column_count": len(private["tokens"]), "bom": private["bom"],
            "terminator": private["terminator"],
            "columns": [{"position": i, "status": "RECOGNIZED" if token in KNOWN_TOKENS else "UNKNOWN_COLUMN",
                         "token": token if token in KNOWN_TOKENS else None}
                        for i, token in enumerate(private["tokens"])]}


def _inspect(raw, reference, implementation, parser):
    if not isinstance(raw, bytes) or len(raw) > SOURCE_BYTES + 1:
        raise DisclosureError("SOURCE_IDENTITY_CONFLICT")
    _identity(implementation)
    observed = {"bytes": len(raw), "md5": hashlib.md5(raw).hexdigest(), "sha256": sha256(raw)}
    report = {"schema": "lupine.discovery.mpea.header_labels.v1", "status": "BLOCKED_SOURCE",
              "reason": "SOURCE_IDENTITY_CONFLICT", "reference": reference, "observed": observed,
              "implementation": implementation, "parser_profile": dict(PARSER_PROFILE),
              "scope": {**CONSTANT_FLAGS, "captured_source_bytes_read": True,
                        "initial_receipts_verified": implementation["mode"] == "committed_source",
                        "header_decode_attempted": False, "first_record_labels_disclosed": False},
              "header": None}
    if canonical_bytes(observed) == canonical_bytes(reference["expected_blob"]):
        report["scope"]["header_decode_attempted"] = True
        try:
            private = parser.scan_header(raw)
            if canonical_bytes(_redact(private)) != canonical_bytes(reference["initial_header"]):
                raise DisclosureError("INITIAL_HEADER_MISMATCH")
            report["header"] = {"column_count": len(private["tokens"]), "bom": private["bom"],
                                "terminator": private["terminator"],
                                "columns": [{"position": i, "token": token} for i, token in enumerate(private["tokens"])]}
            report["scope"]["first_record_labels_disclosed"] = True
            report.update(status="BLOCKED_SCHEMA", reason="SCHEMA_UNCONFIRMED")
        except Exception as error:
            code = str(error) if isinstance(error, (DisclosureError, parser.CustodyError)) else "INTERNAL_FAILURE"
            report.update(status="BLOCKED_HEADER", reason=code if code in HEADER_ERRORS else "INTERNAL_FAILURE")
    report["content_sha256"] = sha256(canonical_bytes(report))
    validate_public_report(report)
    return report


def inspect_fixture(raw, *, expected_blob, initial_header):
    """Synthetic-only entry point, with no disk cache and no acquisition route."""
    _keys(expected_blob, {"bytes", "md5", "sha256"})
    if (type(expected_blob["bytes"]) is not int or not 0 <= expected_blob["bytes"] <= SOURCE_BYTES + 1
            or not _hex(expected_blob["md5"], 32) or not _hex(expected_blob["sha256"])):
        raise DisclosureError("PUBLIC_SCHEMA_INVALID")
    _validate_header(initial_header, redacted=True)
    if expected_blob["sha256"] == SOURCE_SHA256:
        raise DisclosureError("SOURCE_IDENTITY_CONFLICT")
    reference = _reference()
    reference.update(expected_blob=expected_blob, initial_header=initial_header, initial_receipt_sha256=None)
    identity = {"mode": "synthetic_fixture", "commit": None, "files": {}}
    return _inspect(raw, reference, identity, load_parser())


def disclose_cache(path=None):
    """Production checkpoint and receipt checks happen before the cache is opened."""
    identity = frozen_source_identity()
    parser = load_parser()
    reference = verify_initial_receipts(parser)
    try:
        cache = parser.cache_root(path)
        destination = parser._object_path(cache, parser.SOURCE)
        if not destination.exists():
            raise DisclosureError("CACHE_MISSING")
        raw = _bounded_file(destination, SOURCE_BYTES + 1, "CACHE_READ_FAILED", probe_overflow=False)
    except parser.CustodyError:
        raise DisclosureError("CACHE_PATH_INVALID") from None
    return _inspect(raw, reference, identity, parser)


def _validate_header(header, *, redacted):
    _keys(header, {"column_count", "bom", "terminator", "columns"})
    if (type(header["column_count"]) is not int or not 1 <= header["column_count"] <= 128
            or type(header["bom"]) is not bool or header["terminator"] not in {"LF", "CRLF", "EOF"}
            or not isinstance(header["columns"], list) or len(header["columns"]) != header["column_count"]):
        raise DisclosureError("PUBLIC_SCHEMA_INVALID")
    seen = set()
    for position, column in enumerate(header["columns"]):
        _keys(column, {"position", "token", "status"} if redacted else {"position", "token"})
        if type(column["position"]) is not int or column["position"] != position:
            raise DisclosureError("PUBLIC_SCHEMA_INVALID")
        token = column["token"]
        if redacted and column["status"] == "UNKNOWN_COLUMN" and token is None:
            continue
        if (not isinstance(token, str) or not 1 <= len(token) <= 256 or token in seen
                or "\x00" in token or "\ufeff" in token
                or (redacted and (column["status"] != "RECOGNIZED" or token not in KNOWN_TOKENS))):
            raise DisclosureError("PUBLIC_SCHEMA_INVALID")
        seen.add(token)


def _validate_public_report(report):
    _keys(report, {"schema", "status", "reason", "reference", "observed", "implementation",
                   "parser_profile", "scope", "header", "content_sha256"})
    if report["schema"] != "lupine.discovery.mpea.header_labels.v1":
        raise DisclosureError("PUBLIC_SCHEMA_INVALID")
    _identity(report["implementation"])
    production = report["implementation"]["mode"] == "committed_source"
    reference = report["reference"]
    _keys(reference, {"source", "expected_blob", "initial_header", "initial_receipt_sha256"})
    if (canonical_bytes(reference["source"]) != canonical_bytes(_reference()["source"])
            or (production and canonical_bytes(reference) != canonical_bytes(_reference()))
            or (not production and (reference["initial_receipt_sha256"] is not None
                                    or reference["expected_blob"]["sha256"] == SOURCE_SHA256))
            or canonical_bytes(report["parser_profile"]) != canonical_bytes(PARSER_PROFILE)):
        raise DisclosureError("PUBLIC_SCHEMA_INVALID")
    for observed in (reference["expected_blob"], report["observed"]):
        _keys(observed, {"bytes", "md5", "sha256"})
        if (type(observed["bytes"]) is not int or not 0 <= observed["bytes"] <= SOURCE_BYTES + 1
                or not _hex(observed["md5"], 32) or not _hex(observed["sha256"])):
            raise DisclosureError("PUBLIC_SCHEMA_INVALID")
    _validate_header(reference["initial_header"], redacted=True)
    scope = report["scope"]
    _keys(scope, set(CONSTANT_FLAGS) | {"captured_source_bytes_read", "initial_receipts_verified",
                                       "header_decode_attempted", "first_record_labels_disclosed"})
    if (any(type(scope[key]) is not type(value) or scope[key] != value for key, value in CONSTANT_FLAGS.items())
            or scope["captured_source_bytes_read"] is not True
            or scope["initial_receipts_verified"] is not production
            or type(scope["header_decode_attempted"]) is not bool
            or type(scope["first_record_labels_disclosed"]) is not bool):
        raise DisclosureError("PUBLIC_SCHEMA_INVALID")
    verified = canonical_bytes(report["observed"]) == canonical_bytes(reference["expected_blob"])
    header = report["header"]
    if report["status"] == "BLOCKED_SCHEMA":
        _validate_header(header, redacted=False)
        redacted = _redact({"tokens": [c["token"] for c in header["columns"]],
                            "bom": header["bom"], "terminator": header["terminator"]})
        valid = (verified and scope["header_decode_attempted"] and scope["first_record_labels_disclosed"]
                 and report["reason"] == "SCHEMA_UNCONFIRMED"
                 and canonical_bytes(redacted) == canonical_bytes(reference["initial_header"]))
    elif report["status"] == "BLOCKED_SOURCE":
        valid = (not verified and not scope["header_decode_attempted"] and not scope["first_record_labels_disclosed"]
                 and header is None and report["reason"] == "SOURCE_IDENTITY_CONFLICT")
    elif report["status"] == "BLOCKED_HEADER":
        valid = (verified and scope["header_decode_attempted"] and not scope["first_record_labels_disclosed"]
                 and header is None and report["reason"] in HEADER_ERRORS | {"INTERNAL_FAILURE"})
    else:
        valid = False
    if (not valid or not _hex(report["content_sha256"])
            or report["content_sha256"] != sha256(canonical_bytes({k: v for k, v in report.items() if k != "content_sha256"}))):
        raise DisclosureError("PUBLIC_SCHEMA_INVALID")
    return True


def validate_public_report(report):
    try:
        return _validate_public_report(report)
    except (ValueError, TypeError, KeyError, OverflowError, RecursionError):
        raise DisclosureError("PUBLIC_SCHEMA_INVALID") from None


def write_public(report, path):
    validate_public_report(report)
    raw = canonical_bytes(report)
    path = Path(path)
    try:
        if path.is_symlink() or path.resolve() != path.absolute():
            raise DisclosureError("PUBLIC_OUTPUT_CONFLICT")
        if path.exists():
            if _bounded_file(path, 1048576, "PUBLIC_OUTPUT_CONFLICT") != raw:
                raise DisclosureError("PUBLIC_OUTPUT_CONFLICT")
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("xb") as stream:
            stream.write(raw)
    except OSError:
        raise DisclosureError("PUBLIC_OUTPUT_CONFLICT") from None


class _Parser(argparse.ArgumentParser):
    def error(self, message):
        raise DisclosureError("CLI_ARGUMENT_INVALID")


def main(argv=None):
    parser = _Parser(description=__doc__)
    parser.add_argument("--cache", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    try:
        args = parser.parse_args(argv)
        report = disclose_cache(args.cache)
        write_public(report, args.output)
        print(json.dumps({"status": report["status"], "reason": report["reason"],
                          "receipt_sha256": sha256(canonical_bytes(report))}, sort_keys=True))
        return 2
    except Exception as error:
        code = str(error) if isinstance(error, DisclosureError) and str(error) in ERRORS else "INTERNAL_FAILURE"
        print(json.dumps({"status": "BLOCKED", "reason": code}, sort_keys=True))
        return 2


if __name__ == "__main__":
    sys.exit(main())
