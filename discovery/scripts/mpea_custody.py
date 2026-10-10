#!/usr/bin/env python3
"""Pinned MPEA custody: verify whole bytes, inspect only one CSV header, stop.

No data-row decoding, science, or schema inference occurs here. Production
network acquisition requires this producer, its tests and contract at a clean
committed source checkpoint. Pure/injected APIs support synthetic review.
"""
from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


ROOT = next(p for p in Path(__file__).resolve().parents
            if p.name == "discovery" and (p / "AGENTS.md").is_file())
INVENTORY_SHA256 = "ce2e1487cb91436137086f7c9900d091eed30068f6c8e9595687458c3f12679c"
DOWNLOAD_URL = "https://ndownloader.figshare.com/files/25797305"
REDIRECT_HOST = "s3-eu-west-1.amazonaws.com"
REDIRECT_PATH = "/pfigshare-u-files/25797305/MPEA_dataset.csv"
MAX_COLUMNS = 128
MAX_TOKEN_CHARS = 256
MAX_HEADER_CHARS = 65536
MAX_HEADER_BYTES = 4 * MAX_HEADER_CHARS + 3
HEADER_TOKENS = frozenset({"PROPERTY: Type of phases", "PROPERTY: Type of test",
                         "PROPERTY: Elongation (%)", "DOI", "FORMULA", "YS (MPa)",
                         "UTS (MPa)", "Elongation (%)"})
FROZEN_PATHS = ("scripts/mpea_custody.py", "tests/test_mpea_custody.py",
                "tests/test_mpea_custody_review.py", "docs/mpea-custody-plan.md",
                "reports/mpea-source-inventory.json")
FLAGS = {"data_rows_decoded": False, "row_metadata_extracted": False,
         "scientific_eligibility_decisions": False, "target_numeric_validity_checked": False,
         "full_schema_established": False, "fits": 0, "splits": 0}
REASONS = frozenset({"SCHEMA_UNCONFIRMED", "CAPTURE_VERIFIED", "RAW_TYPE_INVALID",
                    "SIZE_MISMATCH", "MD5_MISMATCH", "HEADER_MISSING", "HEADER_LIMIT",
                    "HEADER_QUOTING_INVALID", "HEADER_ENCODING_INVALID", "HEADER_BOM_INVALID",
                    "HEADER_NUL_INVALID", "HEADER_DUPLICATE", "HEADER_EMPTY_TOKEN",
                    "CACHE_PATH_INVALID", "CACHE_READ_FAILED", "CACHE_WRITE_FAILED",
                    "CACHE_MISSING", "FETCH_FAILED", "FROZEN_SOURCE_REQUIRED",
                    "INVENTORY_INVALID", "CLI_ARGUMENT_INVALID", "INTERNAL_FAILURE"})
STATUSES = frozenset({"BLOCKED_SCHEMA", "CAPTURED", "BLOCKED_SOURCE", "BLOCKED_HEADER",
                     "BLOCKED_IO", "BLOCKED_GUARD"})


class CustodyError(ValueError):
    """Only constant codes may cross the CLI/public receipt boundary."""


@dataclass(frozen=True)
class SourceSpec:
    version: int
    file_id: int
    name: str
    size: int
    md5: str


SOURCE = SourceSpec(9, 25797305, "MPEA_dataset.csv", 332126,
                    "6d29eb6018157b863ca0033ccec936d5")


def _spec(spec):
    if (not isinstance(spec, SourceSpec) or type(spec.version) is not int or spec.version != 9
            or type(spec.file_id) is not int or spec.file_id != 25797305
            or spec.name != "MPEA_dataset.csv" or type(spec.size) is not int
            or not 0 < spec.size <= SOURCE.size or not _hex(spec.md5, 32)):
        raise CustodyError("INVENTORY_INVALID")
    return spec


def _hex(value, n=64):
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{%d}" % n, value) is not None


def canonical_bytes(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True,
                       allow_nan=False) + "\n").encode("ascii")


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def _source(spec):
    _spec(spec)
    return {"article_id": 12642953, "version": spec.version,
            "doi": "10.6084/m9.figshare.12642953.v9", "file_id": spec.file_id,
            "name": spec.name, "declared_bytes": spec.size, "declared_md5": spec.md5,
            "download_url": DOWNLOAD_URL, "license": "CC BY 4.0"}


def _synthetic_identity():
    return {"mode": "synthetic_unfrozen", "commit": None, "files": {}}


def _identity(identity):
    _keys(identity, {"mode", "commit", "files"})
    if identity["mode"] == "synthetic_unfrozen":
        if identity["commit"] is not None or identity["files"] != {}:
            raise CustodyError("PUBLIC_SCHEMA_INVALID")
    elif identity["mode"] == "committed_source":
        if (not _hex(identity["commit"], 40) or not isinstance(identity["files"], dict)
                or set(identity["files"]) != set(FROZEN_PATHS)
                or not all(_hex(x) for x in identity["files"].values())):
            raise CustodyError("PUBLIC_SCHEMA_INVALID")
    else:
        raise CustodyError("PUBLIC_SCHEMA_INVALID")


def load_inventory():
    try:
        raw = (ROOT / "reports/mpea-source-inventory.json").read_bytes()
        if sha256(raw) != INVENTORY_SHA256:
            raise CustodyError("INVENTORY_INVALID")
        value = json.loads(raw)
        file = value["archive"]["file"]
        if (value["archive"]["version"] != SOURCE.version or file["id"] != SOURCE.file_id
                or file["name"] != SOURCE.name or file["declared_bytes"] != SOURCE.size
                or file["supplied_md5"] != SOURCE.md5
                or file["repository_computed_md5"] != SOURCE.md5
                or file["download_url"] != DOWNLOAD_URL
                or value["archive"]["license"]["name"] != "CC BY 4.0"):
            raise CustodyError("INVENTORY_INVALID")
        return value
    except (OSError, ValueError, KeyError, TypeError):
        raise CustodyError("INVENTORY_INVALID") from None


def frozen_source_identity():
    """No network: require the reviewed production paths to equal committed bytes."""
    if Path(__file__).resolve() != (ROOT / FROZEN_PATHS[0]).resolve():
        raise CustodyError("FROZEN_SOURCE_REQUIRED")
    load_inventory()
    try:
        commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, check=True,
                                capture_output=True, timeout=10).stdout.decode("ascii").strip()
        prefix = subprocess.run(["git", "rev-parse", "--show-prefix"], cwd=ROOT, check=True,
                                capture_output=True, timeout=10).stdout.decode("utf-8").strip()
        hashes = {}
        for relative in FROZEN_PATHS:
            path = ROOT / relative
            if path.is_symlink():
                raise CustodyError("FROZEN_SOURCE_REQUIRED")
            captured = path.read_bytes()
            committed = subprocess.run(["git", "show", commit + ":" + prefix + relative],
                                       cwd=ROOT, check=True, capture_output=True, timeout=10).stdout
            if captured != committed:
                raise CustodyError("FROZEN_SOURCE_REQUIRED")
            hashes[relative] = sha256(captured)
        identity = {"mode": "committed_source", "commit": commit, "files": hashes}
        _identity(identity)
        return identity
    except (OSError, UnicodeError, subprocess.SubprocessError, ValueError):
        raise CustodyError("FROZEN_SOURCE_REQUIRED") from None


def scan_header(raw):
    """Strict byte framing of one header only; decoded tokens stay private.

    The body can be invalid UTF-8. It is never decoded or passed to csv.reader.
    Callers handling real bytes must verify the complete source before this call.
    """
    if not isinstance(raw, bytes):
        raise CustodyError("RAW_TYPE_INVALID")
    start = 3 if raw.startswith(b"\xef\xbb\xbf") else 0
    state, columns, end, terminator = "start", 1, None, "EOF"
    i = start
    while i < len(raw):
        if i - start >= MAX_HEADER_BYTES:
            raise CustodyError("HEADER_LIMIT")
        byte = raw[i]
        if byte == 0:
            raise CustodyError("HEADER_NUL_INVALID")
        if state != "quoted" and byte in (10, 13):
            if byte == 13:
                if i + 1 >= len(raw) or raw[i+1] != 10:
                    raise CustodyError("HEADER_QUOTING_INVALID")
                terminator = "CRLF"
            else:
                terminator = "LF"
            end = i
            break
        if state == "quoted":
            if byte == 34:
                state = "after_quote"
        elif state == "after_quote":
            if byte == 34:
                state = "quoted"
            elif byte == 44:
                columns += 1
                state = "start"
            else:
                raise CustodyError("HEADER_QUOTING_INVALID")
        elif byte == 44:
            columns += 1
            state = "start"
        elif byte == 34:
            if state != "start":
                raise CustodyError("HEADER_QUOTING_INVALID")
            state = "quoted"
        else:
            state = "unquoted"
        if columns > MAX_COLUMNS:
            raise CustodyError("HEADER_LIMIT")
        i += 1
    if state == "quoted":
        raise CustodyError("HEADER_QUOTING_INVALID")
    if end is None:
        end = len(raw)
    if end == start:
        raise CustodyError("HEADER_MISSING")
    try:
        text = raw[start:end].decode("utf-8", errors="strict")
    except UnicodeError:
        raise CustodyError("HEADER_ENCODING_INVALID") from None
    if len(text) > MAX_HEADER_CHARS:
        raise CustodyError("HEADER_LIMIT")
    if "\ufeff" in text:
        raise CustodyError("HEADER_BOM_INVALID")
    try:
        rows = list(csv.reader(io.StringIO(text + "\n", newline=""), strict=True))
    except csv.Error:
        raise CustodyError("HEADER_QUOTING_INVALID") from None
    if len(rows) != 1:
        raise CustodyError("HEADER_QUOTING_INVALID")
    tokens = rows[0]
    if len(tokens) != columns or len(tokens) > MAX_COLUMNS or any(len(t) > MAX_TOKEN_CHARS for t in tokens):
        raise CustodyError("HEADER_LIMIT")
    if any(not token for token in tokens):
        raise CustodyError("HEADER_EMPTY_TOKEN")
    if len(set(tokens)) != len(tokens):
        raise CustodyError("HEADER_DUPLICATE")
    return {"tokens": tuple(tokens), "bom": bool(start), "terminator": terminator}


def _base(raw, spec, implementation, action):
    _spec(spec)
    if isinstance(raw, bytes) and len(raw) > SOURCE.size + 1:
        raise CustodyError("SIZE_MISMATCH")
    implementation = _synthetic_identity() if implementation is None else implementation
    _identity(implementation)
    observed = {"bytes": len(raw), "sha256": sha256(raw), "md5": hashlib.md5(raw).hexdigest()} if isinstance(raw, bytes) else None
    return {"schema": "lupine.discovery.mpea.header_custody.v1", "action": action,
            "source": _source(spec), "observed": observed,
            "source_verified": False, "status": "BLOCKED_SOURCE", "reason": "RAW_TYPE_INVALID",
            "implementation": json.loads(canonical_bytes(implementation)),
            "inventory_sha256": INVENTORY_SHA256,
            "parser_profile": {"id": "mpea.header_only.v1", "max_columns": MAX_COLUMNS,
                               "max_token_characters": MAX_TOKEN_CHARS, "max_header_characters": MAX_HEADER_CHARS,
                               "max_header_bytes": MAX_HEADER_BYTES},
            "scope": {**FLAGS, "dataset_bytes_acquired": isinstance(raw, bytes),
                      "header_decode_attempted": False, "row_count": None,
                      "numeric_completeness": None}, "header": None}


def _verify(raw, spec):
    if not isinstance(raw, bytes):
        return "RAW_TYPE_INVALID"
    if len(raw) != spec.size:
        return "SIZE_MISMATCH"
    if hashlib.md5(raw).hexdigest() != spec.md5:
        return "MD5_MISMATCH"
    return None


def _seal(report, spec):
    report["content_sha256"] = sha256(canonical_bytes(report))
    validate_public_report(report, spec=spec)
    return report


def inspect_bytes(raw, spec=SOURCE, *, implementation=None):
    report = _base(raw, spec, implementation, "header")
    failure = _verify(raw, spec)
    if failure:
        report["reason"] = failure
        return _seal(report, spec)
    report["source_verified"] = True
    report["scope"]["header_decode_attempted"] = True
    try:
        private = scan_header(raw)
        report["header"] = {"columns": [{"position": i, "status": "RECOGNIZED" if token in HEADER_TOKENS else "UNKNOWN_COLUMN",
                                         "token": token if token in HEADER_TOKENS else None}
                                        for i, token in enumerate(private["tokens"])],
                            "column_count": len(private["tokens"]), "bom": private["bom"],
                            "terminator": private["terminator"]}
        report.update(status="BLOCKED_SCHEMA", reason="SCHEMA_UNCONFIRMED")
    except CustodyError as error:
        code = str(error)
        report.update(status="BLOCKED_HEADER", reason=code if code in REASONS else "INTERNAL_FAILURE")
    return _seal(report, spec)


def _keys(value, expected):
    if not isinstance(value, dict) or set(value) != expected:
        raise CustodyError("PUBLIC_SCHEMA_INVALID")


def _validate_public_report(report, *, spec=SOURCE):
    """Closed schema, closed strings, strict booleans/integers and fixed action flags."""
    _spec(spec)
    _keys(report, {"schema", "action", "source", "observed", "source_verified", "status", "reason",
                   "implementation", "inventory_sha256", "parser_profile", "scope", "header", "content_sha256"})
    if (report["schema"] != "lupine.discovery.mpea.header_custody.v1"
            or report["action"] not in {"acquire", "header"} or report["status"] not in STATUSES
            or report["reason"] not in REASONS or type(report["source_verified"]) is not bool
            or canonical_bytes(report["source"]) != canonical_bytes(_source(spec))
            or report["inventory_sha256"] != INVENTORY_SHA256):
        raise CustodyError("PUBLIC_SCHEMA_INVALID")
    _identity(report["implementation"])
    expected_profile = _base(None, spec, None, "header")["parser_profile"]
    if canonical_bytes(report["parser_profile"]) != canonical_bytes(expected_profile):
        raise CustodyError("PUBLIC_SCHEMA_INVALID")
    scope = report["scope"]
    _keys(scope, set(FLAGS) | {"dataset_bytes_acquired", "header_decode_attempted", "row_count", "numeric_completeness"})
    if (any(type(scope[k]) is not type(v) or scope[k] != v for k, v in FLAGS.items())
            or type(scope["dataset_bytes_acquired"]) is not bool
            or type(scope["header_decode_attempted"]) is not bool
            or scope["row_count"] is not None or scope["numeric_completeness"] is not None):
        raise CustodyError("PUBLIC_SCHEMA_INVALID")
    observed = report["observed"]
    if observed is not None:
        _keys(observed, {"bytes", "sha256", "md5"})
        if (type(observed["bytes"]) is not int or not 0 <= observed["bytes"] <= SOURCE.size + 1
                or not _hex(observed["sha256"]) or not _hex(observed["md5"], 32)):
            raise CustodyError("PUBLIC_SCHEMA_INVALID")
    if scope["dataset_bytes_acquired"] is not (observed is not None):
        raise CustodyError("PUBLIC_SCHEMA_INVALID")
    verified = observed is not None and observed["bytes"] == spec.size and observed["md5"] == spec.md5
    if report["source_verified"] is not verified:
        raise CustodyError("PUBLIC_SCHEMA_INVALID")
    header = report["header"]
    if header is not None:
        _keys(header, {"columns", "column_count", "bom", "terminator"})
        if (not isinstance(header["columns"], list) or type(header["column_count"]) is not int
                or not 1 <= header["column_count"] <= MAX_COLUMNS
                or header["column_count"] != len(header["columns"])
                or type(header["bom"]) is not bool or header["terminator"] not in {"LF", "CRLF", "EOF"}):
            raise CustodyError("PUBLIC_SCHEMA_INVALID")
        known = set()
        for i, column in enumerate(header["columns"]):
            _keys(column, {"position", "status", "token"})
            if type(column["position"]) is not int or column["position"] != i:
                raise CustodyError("PUBLIC_SCHEMA_INVALID")
            if column["status"] == "RECOGNIZED":
                if not isinstance(column["token"], str) or column["token"] not in HEADER_TOKENS or column["token"] in known:
                    raise CustodyError("PUBLIC_SCHEMA_INVALID")
                known.add(column["token"])
            elif column["status"] != "UNKNOWN_COLUMN" or column["token"] is not None:
                raise CustodyError("PUBLIC_SCHEMA_INVALID")
    if report["status"] == "BLOCKED_SCHEMA":
        valid = (report["reason"] == "SCHEMA_UNCONFIRMED" and report["action"] == "header"
                 and verified and scope["header_decode_attempted"] and header is not None)
    elif report["status"] == "CAPTURED":
        valid = report["reason"] == "CAPTURE_VERIFIED" and report["action"] == "acquire" and verified and not scope["header_decode_attempted"] and header is None
    elif report["status"] == "BLOCKED_HEADER":
        valid = report["reason"].startswith("HEADER_") and report["action"] == "header" and verified and scope["header_decode_attempted"] and header is None
    elif report["status"] == "BLOCKED_SOURCE":
        expected = ("RAW_TYPE_INVALID" if observed is None else
                    "SIZE_MISMATCH" if observed["bytes"] != spec.size else "MD5_MISMATCH")
        valid = not verified and report["reason"] == expected and not scope["header_decode_attempted"] and header is None
    elif report["status"] == "BLOCKED_GUARD":
        valid = (report["reason"] in {"FROZEN_SOURCE_REQUIRED", "INVENTORY_INVALID"}
                 and observed is None and not scope["header_decode_attempted"] and header is None)
    else:
        reason = report["reason"]
        valid = (not scope["header_decode_attempted"] and header is None
                 and reason in {"CACHE_PATH_INVALID", "CACHE_READ_FAILED", "CACHE_WRITE_FAILED",
                                "CACHE_MISSING", "FETCH_FAILED", "INTERNAL_FAILURE"}
                 and (observed is None or (reason == "CACHE_WRITE_FAILED" and verified))
                 and (reason != "FETCH_FAILED" or report["action"] == "acquire")
                 and (reason != "CACHE_MISSING" or report["action"] == "header"))
    if not valid or not _hex(report["content_sha256"]) or report["content_sha256"] != sha256(canonical_bytes({k: v for k, v in report.items() if k != "content_sha256"})):
        raise CustodyError("PUBLIC_SCHEMA_INVALID")
    return True


def validate_public_report(report, *, spec=SOURCE):
    try:
        return _validate_public_report(report, spec=spec)
    except (ValueError, TypeError, KeyError, OverflowError, RecursionError):
        raise CustodyError("PUBLIC_SCHEMA_INVALID") from None


def cache_root(path=None):
    root = ROOT.resolve()
    base = root / ".cache/mpea-custody"
    if (root / ".cache").resolve() != root / ".cache" or base.resolve() != base:
        raise CustodyError("CACHE_PATH_INVALID")
    requested = Path(path) if path is not None else base / "figshare-v9"
    if requested.is_symlink():
        raise CustodyError("CACHE_PATH_INVALID")
    resolved = requested.resolve()
    if base not in resolved.parents:
        raise CustodyError("CACHE_PATH_INVALID")
    return resolved


def _object_path(cache, spec):
    _spec(spec)
    path = cache / (str(spec.file_id) + "-" + spec.md5 + ".csv")
    if path.is_symlink() or cache not in path.resolve().parents:
        raise CustodyError("CACHE_PATH_INVALID")
    return path


class _PinnedRedirect(HTTPRedirectHandler):
    def __init__(self):
        super().__init__()
        self.count = 0

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urlsplit(newurl)
        if (self.count != 0 or req.full_url != DOWNLOAD_URL or parsed.scheme != "https"
                or parsed.netloc != REDIRECT_HOST or parsed.path != REDIRECT_PATH or parsed.fragment):
            raise CustodyError("FETCH_FAILED")
        self.count += 1
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _fetch(spec):
    if spec != SOURCE:
        raise CustodyError("INVENTORY_INVALID")
    frozen_source_identity()
    request = Request(DOWNLOAD_URL, headers={"User-Agent": "Lupine-MPEA-Custody/1"})
    with build_opener(_PinnedRedirect()).open(request, timeout=30) as response:
        return response.read(spec.size + 1)


def _blocked(action, reason, spec, implementation=None):
    report = _base(None, spec, implementation, action)
    report.update(status="BLOCKED_GUARD" if reason in {"FROZEN_SOURCE_REQUIRED", "INVENTORY_INVALID"} else "BLOCKED_IO",
                  reason=reason if reason in REASONS else "INTERNAL_FAILURE")
    return _seal(report, spec)


def acquire_to_cache(path=None, *, fetch=None, spec=SOURCE):
    implementation = None
    if fetch is None:
        try:
            implementation = frozen_source_identity()
        except CustodyError as error:
            return _blocked("acquire", str(error), spec)
    try:
        cache = cache_root(path)
        destination = _object_path(cache, spec)
        cached = destination.exists()
        if cached:
            with destination.open("rb") as stream:
                raw = stream.read(spec.size + 1)
        else:
            try:
                raw = (fetch or _fetch)(spec)
            except Exception:
                return _blocked("acquire", "FETCH_FAILED", spec, implementation)
        report = _base(raw, spec, implementation, "acquire")
        failure = _verify(raw, spec)
        if failure:
            report["reason"] = failure
            return _seal(report, spec)
        report["source_verified"] = True
        if not cached:
            try:
                cache.mkdir(parents=True, exist_ok=True)
                with destination.open("xb") as stream:
                    stream.write(raw)
            except OSError:
                report.update(status="BLOCKED_IO", reason="CACHE_WRITE_FAILED")
                return _seal(report, spec)
        report.update(status="CAPTURED", reason="CAPTURE_VERIFIED")
        return _seal(report, spec)
    except CustodyError as error:
        return _blocked("acquire", str(error), spec, implementation)
    except OSError:
        return _blocked("acquire", "CACHE_WRITE_FAILED", spec, implementation)


def inspect_cache(path=None, *, spec=SOURCE, implementation=None):
    try:
        destination = _object_path(cache_root(path), spec)
        if not destination.exists():
            return _blocked("header", "CACHE_MISSING", spec, implementation)
        with destination.open("rb") as stream:
            captured = stream.read(spec.size + 1)
        return inspect_bytes(captured, spec, implementation=implementation)
    except CustodyError as error:
        return _blocked("header", str(error), spec, implementation)
    except OSError:
        return _blocked("header", "CACHE_READ_FAILED", spec, implementation)


def write_public(report, path, *, spec=SOURCE):
    validate_public_report(report, spec=spec)
    raw = canonical_bytes(report)
    path = Path(path)
    if path.is_symlink():
        raise CustodyError("PUBLIC_OUTPUT_CONFLICT")
    if path.exists():
        if path.read_bytes() != raw:
            raise CustodyError("PUBLIC_OUTPUT_CONFLICT")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as stream:
        stream.write(raw)


class _Parser(argparse.ArgumentParser):
    def error(self, message):
        raise CustodyError("CLI_ARGUMENT_INVALID")


def main(argv=None):
    parser = _Parser(description=__doc__)
    parser.add_argument("action", choices=("acquire", "header"))
    parser.add_argument("--cache", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    try:
        args = parser.parse_args(argv)
        identity = frozen_source_identity()
        result = (acquire_to_cache(args.cache) if args.action == "acquire"
                  else inspect_cache(args.cache, implementation=identity))
        write_public(result, args.output)
        print(json.dumps({"status": result["status"], "reason": result["reason"],
                          "receipt_sha256": sha256(canonical_bytes(result))}, sort_keys=True))
        return 0 if result["status"] == "CAPTURED" else 2
    except Exception as error:
        code = str(error) if isinstance(error, CustodyError) and str(error) in REASONS else "INTERNAL_FAILURE"
        print(json.dumps({"status": "BLOCKED", "reason": code}, sort_keys=True))
        return 2


if __name__ == "__main__":
    sys.exit(main())
