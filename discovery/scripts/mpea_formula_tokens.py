#!/usr/bin/env python3
"""Formula-only supplemental lexical custody; no scientific schema promotion.

Production is fixed-cache and committed-source gated. Development fixtures
reject the known experimental artifact. No network, formula normalization,
numeric count conversion, target decoding or legacy extractor call is used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import stat
import subprocess
import sys
import types

ROOT = next(p for p in Path(__file__).resolve().parents
            if p.name == "discovery" and (p / "AGENTS.md").is_file())
BASELINE_COMMIT = "ec32247f404d7d2b0a916ff7012bded2accb48c8"
HELPER_PATH = "scripts/mpea_row_metadata.py"
HELPER_SHA256 = "d50ce1cf06761cd080ca0fcc6516c07ef71e0a4106bba73660642c846915e33b"
SCANNER_SHA256 = "8aec58a1a48c173a0750137daf320d22abe04398108a74567c28ed7f2a093775"
BASELINE_EXTRA_PINS = {
    "docs/mpea-row-metadata-amendment-v1.md": "7111870342b9aa5f8e6b78f481b691de9d2ae1052f38cf095fe16f1e9fa3a06e",
    "tests/test_mpea_row_metadata.py": "10998dc11338e1cfb1af4563f61efaa89a764ff5974a9c97c34d55a877143854",
    "tests/test_mpea_row_metadata_review.py": "9a32ec3ad0e566887239c01047b1a5a1d5cb0249fd2888bb76faa90018f9c8c1",
}
REFERENCE_PINS = {
    "reports/mpea-row-metadata-v1.json": "36e9831f2a015b2c295ce6228dd9b7bce5ba7df0f2645c343da2134ab7898c55",
    "reports/mpea-row-metadata-reproduction-v1.json": "f01271d82a27fe114c443009d919ffa232e5fc32d8176dcd4c1b8c01870cd793",
    "docs/mpea-formula-format-evidence.md": "04e5645cc3dbbd1b1d1b3b5d0fdef72ae050cd097646746e1d185f27659eb056",
    "reports/mpea-formula-format-evidence-v1.json": "e67256aa7cef2f5b8ecb101defefb448cde0c8d30787bac41bb45c1564c4757f",
}
NEW_PATHS = ("scripts/mpea_formula_tokens.py", "tests/test_mpea_formula_tokens.py",
             "tests/test_mpea_formula_tokens_review.py", "docs/mpea-formula-amendment-v1.md")
SOURCE_BYTES = 332126
SOURCE_SHA256 = "c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d"
SOURCE_BLOB = {"bytes": SOURCE_BYTES, "md5": "6d29eb6018157b863ca0033ccec936d5", "sha256": SOURCE_SHA256}
CACHE_PATH = ROOT / ".cache/mpea-custody/figshare-v9/25797305-6d29eb6018157b863ca0033ccec936d5.csv"
PROFILE = {"id": "mpea.formula_explicit_count_ascii_space.v1", "columns": 23,
           "allowed_positions": {"formula": 1}, "max_source_bytes": SOURCE_BYTES,
           "max_observation_rows": 4096, "max_raw_field_bytes": 16384,
           "max_raw_record_bytes": 65536, "identity_policy": "exact_lexical_token.v1",
           "count_policy": "required_positive_plain_decimal_no_numeric_conversion",
           "separator": "single_ASCII_space", "legacy_grammar_union": False}
TERM = re.compile(rb"([A-Z][a-z]?)([0-9]+(?:\.[0-9]+)?)\Z")
MARKERS = frozenset((b"", b"NaN", b"nan", b"NAN", b"NA", b"N/A", b"NR", b"None", b"null", b"-"))
ASCII_WHITESPACE = frozenset(b" \t\r\n\v\f")
ELEMENTS = frozenset(x.encode("ascii") for x in (
    "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn "
    "Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce "
    "Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn "
    "Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og"
).split())
FIXED_SCOPE = {"nonformula_observation_cells_accumulated": False, "target_cells_text_decoded": False,
               "target_numeric_validity_checked": False, "target_presence_checked": False,
               "target_missingness_computed": False, "formula_counts_numerically_converted": False,
               "formula_normalization_performed": False, "identity_semantics_validated": False,
               "producer_lineage_established": False, "sampling_independence_established": False,
               "physical_compatibility_established": False, "full_scientific_schema_established": False,
               "scientific_eligibility_decisions": False, "features_selected": False,
               "fits": 0, "splits": 0}
ROW_ERRORS = frozenset({"HEADER_MISSING", "HEADER_MISMATCH", "FRAMING_INVALID", "WIDTH_MISMATCH",
                        "FIELD_LIMIT", "RECORD_LIMIT", "ROW_LIMIT", "PRIOR_ROW_COUNT_CONFLICT"})
ERRORS = ROW_ERRORS | {"SOURCE_IDENTITY_CONFLICT", "REAL_SOURCE_FORBIDDEN", "FROZEN_SOURCE_REQUIRED",
                      "HELPER_IDENTITY_CONFLICT", "REFERENCE_IDENTITY_CONFLICT", "CACHE_READ_FAILED",
                      "PUBLIC_SCHEMA_INVALID", "PUBLIC_OUTPUT_CONFLICT", "CLI_ARGUMENT_INVALID", "INTERNAL_FAILURE"}


class FormulaError(ValueError):
    pass


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical_bytes(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True,
                       allow_nan=False) + "\n").encode("ascii")


def _hex(value, length=64):
    return type(value) is str and re.fullmatch(r"[0-9a-f]{%d}" % length, value) is not None


def _keys(value, keys):
    if type(value) is not dict or set(value) != set(keys):
        raise FormulaError("PUBLIC_SCHEMA_INVALID")


def _safe_path(path, error):
    path = Path(path).absolute()
    if path.is_symlink() or path.resolve() != path:
        raise FormulaError(error)
    return path


def _bounded_file(path, cap, error):
    try:
        path = _safe_path(path, error)
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(fd, "rb") as stream:
            if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                raise FormulaError(error)
            raw = stream.read(cap + 1)
        if len(raw) > cap:
            raise FormulaError(error)
        return raw
    except OSError:
        raise FormulaError(error) from None


def _blob(value):
    _keys(value, {"bytes", "md5", "sha256"})
    if (type(value["bytes"]) is not int or not 0 <= value["bytes"] <= SOURCE_BYTES
            or not _hex(value["md5"], 32) or not _hex(value["sha256"])):
        raise FormulaError("PUBLIC_SCHEMA_INVALID")


def load_helpers():
    """Execute captured, hash-checked frozen source; never call its extractor."""
    path = ROOT / HELPER_PATH
    raw = _bounded_file(path, 1048576, "HELPER_IDENTITY_CONFLICT")
    if sha256(raw) != HELPER_SHA256:
        raise FormulaError("HELPER_IDENTITY_CONFLICT")
    module = types.ModuleType("_mpea_formula_frozen_helpers")
    module.__file__ = str(path)
    exec(compile(raw, str(path), "exec"), module.__dict__)
    if module.SCANNER_SHA256 != SCANNER_SHA256 or module.SOURCE_BLOB != SOURCE_BLOB:
        raise FormulaError("HELPER_IDENTITY_CONFLICT")
    return module


def load_references(helper):
    values = {}
    for path, expected in REFERENCE_PINS.items():
        raw = _bounded_file(ROOT / path, 2 * 1048576, "REFERENCE_IDENTITY_CONFLICT")
        if sha256(raw) != expected:
            raise FormulaError("REFERENCE_IDENTITY_CONFLICT")
        if path.endswith(".json"):
            values[path] = helper._json(raw, "REFERENCE_IDENTITY_CONFLICT")
    previous = values["reports/mpea-row-metadata-v1.json"]
    helper.validate_public_report(previous)
    if (previous["implementation"]["commit"] != BASELINE_COMMIT
            or previous["row_count"] != 1545 or previous["observed"] != SOURCE_BLOB
            or any(row["formula"] != {"status": "UNRESOLVED", "value": None} for row in previous["rows"])):
        raise FormulaError("REFERENCE_IDENTITY_CONFLICT")
    return previous, helper.load_mapping()


def _implementation(value, helper):
    _keys(value, {"mode", "commit", "files"})
    if value["mode"] == "synthetic_fixture":
        if value["commit"] is not None or value["files"] != {}:
            raise FormulaError("PUBLIC_SCHEMA_INVALID")
    elif value["mode"] == "committed_source":
        expected_paths = set(helper.FROZEN_PATHS) | set(REFERENCE_PINS) | set(NEW_PATHS)
        if (not _hex(value["commit"], 40) or type(value["files"]) is not dict
                or set(value["files"]) != expected_paths or any(not _hex(x) for x in value["files"].values())
                or any(value["files"][p] != h for p, h in {**helper.PRIOR_PINS, **BASELINE_EXTRA_PINS, **REFERENCE_PINS,
                    HELPER_PATH: HELPER_SHA256, "scripts/mpea_row_scanner.py": SCANNER_SHA256}.items())):
            raise FormulaError("PUBLIC_SCHEMA_INVALID")
    else:
        raise FormulaError("PUBLIC_SCHEMA_INVALID")


def frozen_source_identity(helper):
    """All original/new source and reference checks occur before cache access."""
    if Path(__file__).absolute() != ROOT / NEW_PATHS[0]:
        raise FormulaError("FROZEN_SOURCE_REQUIRED")
    try:
        def git(*args):
            return subprocess.run(["git", *args], cwd=ROOT, check=True,
                                  capture_output=True, timeout=10).stdout
        prior, _ = load_references(helper)
        old = helper.frozen_source_identity()
        if old["files"] != prior["implementation"]["files"]:
            raise FormulaError("FROZEN_SOURCE_REQUIRED")
        commit = git("rev-parse", "HEAD").decode("ascii").strip()
        prefix = git("rev-parse", "--show-prefix").decode("utf-8").strip()
        git("merge-base", "--is-ancestor", BASELINE_COMMIT, commit)
        hashes = dict(old["files"])
        for path in (*REFERENCE_PINS, *NEW_PATHS):
            raw = _bounded_file(ROOT / path, 2 * 1048576, "FROZEN_SOURCE_REQUIRED")
            if raw != git("show", commit + ":" + prefix + path):
                raise FormulaError("FROZEN_SOURCE_REQUIRED")
            hashes[path] = sha256(raw)
        identity = {"mode": "committed_source", "commit": commit, "files": hashes}
        _implementation(identity, helper)
        return identity
    except (OSError, UnicodeError, subprocess.SubprocessError, ValueError):
        raise FormulaError("FROZEN_SOURCE_REQUIRED") from None


def recognizes_formula(token):
    """Lexical recognition only; no arithmetic, normalization or raw-token output."""
    if type(token) is not bytes or len(token) > PROFILE["max_raw_field_bytes"]:
        return False
    if token in MARKERS or all(byte in ASCII_WHITESPACE for byte in token):
        return False
    for term in token.split(b" "):
        matched = TERM.fullmatch(term)
        if matched is None or matched[1] not in ELEMENTS or not any(49 <= x <= 57 for x in matched[2]):
            return False
    return True


def _reference(expected, helper):
    return {"expected_blob": dict(expected), "baseline_commit": BASELINE_COMMIT,
            "reference_files": dict(REFERENCE_PINS), "scanner_sha256": SCANNER_SHA256,
            "mapping_sha256": helper.PRIOR_PINS[helper.MAPPING_PATH],
            "header_receipt_sha256": helper.PRIOR_PINS[helper.HEADER_PATH],
            "original_formula_recognized_rows": 0, "original_metadata_rows": 1545,
            "source_doi": "10.6084/m9.figshare.12642953.v9", "license": "CC BY 4.0"}


def _seal(report, helper):
    report["content_sha256"] = sha256(canonical_bytes(report))
    validate_public_report(report, _helper=helper)
    return report


def _inspect(raw, expected, identity, tokens, helper, scanner):
    if type(raw) is not bytes or len(raw) > SOURCE_BYTES:
        raise FormulaError("SOURCE_IDENTITY_CONFLICT")
    _blob(expected)
    _implementation(identity, helper)
    observed = {"bytes": len(raw), "md5": hashlib.md5(raw).hexdigest(), "sha256": sha256(raw)}
    report = {"schema": "lupine.discovery.mpea.formula_tokens.v1", "status": "BLOCKED_SOURCE",
              "reason": "SOURCE_IDENTITY_CONFLICT", "reference": _reference(expected, helper),
              "observed": observed, "implementation": identity,
              "profile": json.loads(canonical_bytes(PROFILE)), "scope": dict(FIXED_SCOPE),
              "rows": None, "row_count": None}
    report["scope"].update(captured_source_bytes_read=True, observation_byte_framing_attempted=False,
                          all_observation_rows_framed=False, formula_tokens_processed=False,
                          all_rows_preserved=False, synthetic_fixture=identity["mode"] == "synthetic_fixture")
    if observed != expected:
        return _seal(report, helper)
    # The scanner's fixed mapping container requires an unused identity prefix.
    # _frame uses only the index, never the scanner's identity/temperature helpers.
    mapping = scanner.MetadataMapping(tokens, (scanner.ColumnRule("formula", 1, (), (b"unused:",)),))
    report["scope"]["observation_byte_framing_attempted"] = True
    try:
        records = scanner._frame(raw, mapping)
    except scanner.MetadataError as error:
        report.update(status="BLOCKED_ROWS", reason=str(error) if str(error) in ROW_ERRORS else "INTERNAL_FAILURE")
        return _seal(report, helper)
    if identity["mode"] == "committed_source" and len(records) != 1545:
        report.update(status="BLOCKED_ROWS", reason="PRIOR_ROW_COUNT_CONFLICT")
        return _seal(report, helper)
    groups = {}
    rows = []
    for ordinal, record in enumerate(records):
        token = record[1]
        item = {"status": "UNRESOLVED", "value": None}
        if recognizes_formula(token):
            if token not in groups:
                groups[token] = len(groups)
            item = {"status": "TOKEN_GROUP", "value": groups[token]}
        rows.append({"ordinal": ordinal, "record_id": observed["sha256"] + ":" + str(ordinal), "formula": item})
    report.update(status="FORMULA_TOKENS_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED", reason="SCIENTIFIC_SCHEMA_UNRESOLVED",
                  rows=rows, row_count=len(rows))
    report["scope"].update(all_observation_rows_framed=True, formula_tokens_processed=True, all_rows_preserved=True)
    return _seal(report, helper)


def inspect_fixture(raw, *, expected_blob):
    _blob(expected_blob)
    if type(raw) is not bytes or len(raw) > SOURCE_BYTES:
        raise FormulaError("SOURCE_IDENTITY_CONFLICT")
    if expected_blob["sha256"] == SOURCE_SHA256 or sha256(raw) == SOURCE_SHA256:
        raise FormulaError("REAL_SOURCE_FORBIDDEN")
    helper = load_helpers()
    _, tokens = load_references(helper)
    scanner = helper.load_scanner()
    return _inspect(raw, expected_blob, {"mode": "synthetic_fixture", "commit": None, "files": {}},
                    tokens, helper, scanner)


def extract_cache():
    helper = load_helpers()
    identity = frozen_source_identity(helper)
    _, tokens = load_references(helper)
    scanner = helper.load_scanner()
    raw = _bounded_file(CACHE_PATH, SOURCE_BYTES, "CACHE_READ_FAILED")
    return _inspect(raw, dict(SOURCE_BLOB), identity, tokens, helper, scanner)


def _validate(report, helper):
    _keys(report, {"schema", "status", "reason", "reference", "observed", "implementation", "profile",
                   "scope", "rows", "row_count", "content_sha256"})
    if report["schema"] != "lupine.discovery.mpea.formula_tokens.v1":
        raise FormulaError("PUBLIC_SCHEMA_INVALID")
    _implementation(report["implementation"], helper)
    synthetic = report["implementation"]["mode"] == "synthetic_fixture"
    _keys(report["reference"], _reference(SOURCE_BLOB, helper))
    expected = report["reference"]["expected_blob"]
    _blob(expected)
    _blob(report["observed"])
    if (canonical_bytes(report["reference"]) != canonical_bytes(_reference(expected, helper))
            or canonical_bytes(report["profile"]) != canonical_bytes(PROFILE)
            or (not synthetic and canonical_bytes(expected) != canonical_bytes(SOURCE_BLOB))
            or (synthetic and SOURCE_SHA256 in {expected["sha256"], report["observed"]["sha256"]})):
        raise FormulaError("PUBLIC_SCHEMA_INVALID")
    scope = report["scope"]
    dynamic = {"captured_source_bytes_read", "observation_byte_framing_attempted", "all_observation_rows_framed",
               "formula_tokens_processed", "all_rows_preserved", "synthetic_fixture"}
    _keys(scope, set(FIXED_SCOPE) | dynamic)
    if (any(type(scope[k]) is not type(v) or scope[k] != v for k, v in FIXED_SCOPE.items())
            or any(type(scope[k]) is not bool for k in dynamic)
            or scope["captured_source_bytes_read"] is not True or scope["synthetic_fixture"] is not synthetic):
        raise FormulaError("PUBLIC_SCHEMA_INVALID")
    verified = canonical_bytes(report["observed"]) == canonical_bytes(expected)
    if report["status"] == "FORMULA_TOKENS_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED":
        if (not verified or report["reason"] != "SCIENTIFIC_SCHEMA_UNRESOLVED"
                or not all(scope[k] for k in dynamic - {"synthetic_fixture"})
                or type(report["row_count"]) is not int or not 0 <= report["row_count"] <= 4096
                or (not synthetic and report["row_count"] != 1545)
                or type(report["rows"]) is not list or len(report["rows"]) != report["row_count"]):
            raise FormulaError("PUBLIC_SCHEMA_INVALID")
        seen = set()
        for ordinal, row in enumerate(report["rows"]):
            _keys(row, {"ordinal", "record_id", "formula"})
            if (type(row["ordinal"]) is not int or row["ordinal"] != ordinal
                    or row["record_id"] != report["observed"]["sha256"] + ":" + str(ordinal)):
                raise FormulaError("PUBLIC_SCHEMA_INVALID")
            item = row["formula"]
            _keys(item, {"status", "value"})
            if item["status"] == "UNRESOLVED":
                if item["value"] is not None:
                    raise FormulaError("PUBLIC_SCHEMA_INVALID")
            elif item["status"] == "TOKEN_GROUP":
                value = item["value"]
                if type(value) is not int or not 0 <= value <= len(seen):
                    raise FormulaError("PUBLIC_SCHEMA_INVALID")
                seen.add(value)
            else:
                raise FormulaError("PUBLIC_SCHEMA_INVALID")
    else:
        if (report["rows"] is not None or report["row_count"] is not None
                or any(scope[k] for k in ("all_observation_rows_framed", "formula_tokens_processed", "all_rows_preserved"))):
            raise FormulaError("PUBLIC_SCHEMA_INVALID")
        if report["status"] == "BLOCKED_SOURCE":
            valid = not verified and not scope["observation_byte_framing_attempted"] and report["reason"] == "SOURCE_IDENTITY_CONFLICT"
        elif report["status"] == "BLOCKED_ROWS":
            valid = verified and scope["observation_byte_framing_attempted"] and report["reason"] in ROW_ERRORS | {"INTERNAL_FAILURE"}
        else:
            valid = False
        if not valid:
            raise FormulaError("PUBLIC_SCHEMA_INVALID")
    if not _hex(report["content_sha256"]) or report["content_sha256"] != sha256(canonical_bytes(
            {k: v for k, v in report.items() if k != "content_sha256"})):
        raise FormulaError("PUBLIC_SCHEMA_INVALID")
    return True


def validate_public_report(report, *, _helper=None):
    try:
        return _validate(report, _helper or load_helpers())
    except (ValueError, TypeError, KeyError, OverflowError, RecursionError):
        raise FormulaError("PUBLIC_SCHEMA_INVALID") from None


def write_public(report, path):
    validate_public_report(report)
    raw = canonical_bytes(report)
    directory_fd = None
    temporary_name = None
    try:
        path = _safe_path(path, "PUBLIC_OUTPUT_CONFLICT")
        if path.exists():
            if _bounded_file(path, 2 * 1048576, "PUBLIC_OUTPUT_CONFLICT") != raw:
                raise FormulaError("PUBLIC_OUTPUT_CONFLICT")
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        _safe_path(path.parent, "PUBLIC_OUTPUT_CONFLICT")
        directory_fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        captured = os.fstat(directory_fd)
        _safe_path(path, "PUBLIC_OUTPUT_CONFLICT")
        current = os.stat(path.parent, follow_symlinks=False)
        if (captured.st_dev, captured.st_ino) != (current.st_dev, current.st_ino):
            raise FormulaError("PUBLIC_OUTPUT_CONFLICT")
        while True:
            name = ".mpea-formula-" + secrets.token_hex(16)
            try:
                fd = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                             0o600, dir_fd=directory_fd)
                temporary_name = name
                break
            except FileExistsError:
                continue
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        _safe_path(path, "PUBLIC_OUTPUT_CONFLICT")
        current = os.stat(path.parent, follow_symlinks=False)
        if (captured.st_dev, captured.st_ino) != (current.st_dev, current.st_ino):
            raise FormulaError("PUBLIC_OUTPUT_CONFLICT")
        os.link(temporary_name, path.name, src_dir_fd=directory_fd,
                dst_dir_fd=directory_fd, follow_symlinks=False)
    except OSError:
        raise FormulaError("PUBLIC_OUTPUT_CONFLICT") from None
    finally:
        if directory_fd is not None:
            try:
                if temporary_name is not None:
                    os.unlink(temporary_name, dir_fd=directory_fd)
            finally:
                os.close(directory_fd)


class _Parser(argparse.ArgumentParser):
    def error(self, message):
        raise FormulaError("CLI_ARGUMENT_INVALID")


def main(argv=None):
    parser = _Parser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    try:
        args = parser.parse_args(argv)
        report = extract_cache()
        write_public(report, args.output)
        print(json.dumps({"status": report["status"], "reason": report["reason"],
                          "receipt_sha256": sha256(canonical_bytes(report))}, sort_keys=True))
        return 2
    except Exception as error:
        code = str(error) if isinstance(error, FormulaError) and str(error) in ERRORS else "INTERNAL_FAILURE"
        print(json.dumps({"status": "BLOCKED", "reason": code}, sort_keys=True))
        return 2


if __name__ == "__main__":
    sys.exit(main())
