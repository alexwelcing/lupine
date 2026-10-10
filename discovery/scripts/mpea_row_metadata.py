#!/usr/bin/env python3
"""Cache-only, target-opaque MPEA metadata custody; scientific schema unresolved.

A committed-source gate precedes production cache access. The fixture entry point
rejects the known real artifact and cannot enable production. No network API is
used. The pinned scanner only retains explicitly permitted metadata cell bytes.
"""
from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
import types

ROOT = next(p for p in Path(__file__).resolve().parents
            if p.name == "discovery" and (p / "AGENTS.md").is_file())
MAPPING_COMMIT = "d169b1070eaec916ebf9af221aa4596dd4b2cb1d"
MAPPING_PATH = "docs/mpea-column-mapping-v1.json"
HEADER_PATH = "reports/mpea-header-labels-v1.json"
SCANNER_SHA256 = "8aec58a1a48c173a0750137daf320d22abe04398108a74567c28ed7f2a093775"
# Literal, reviewed historical artifacts; no generated or acquired target values.
PRIOR_PINS = {'docs/mpea-column-mapping-v1.json': '812255e53cceec8c66bd2a4b11d5d1e556941a053c888a7970cf2e3ec6728f97', 'docs/mpea-column-mapping-v1.md': '488928f4ac88f241ae28b43527628415663d9a4df976432a36b1b7c5653dee6d', 'docs/mpea-custody-plan.md': '381406c91451ffb4592539b7bc66beb215bdb00cd852bf1a01106bebe7d1b895', 'docs/mpea-header-disclosure-amendment-v1.md': 'ce9c95e713b79ec2d8029f0da51c8d76c390f1b349de67b0e842034c42f9a525', 'reports/mpea-custody-acquisition-v1.json': '2bd6a5f44c28e97460a5ee0fca8eaf0e77a243cd72259e23fff2a75b264aca83', 'reports/mpea-custody-header-v1.json': '01f0e9899f8afb1517d0efd0d2bb4c43ca9df94daadc6a2d15664ac1bbe4d827', 'reports/mpea-custody-reproduction-v1.json': 'e4e29863b6a1fdddf6590548e0dc450d1c4e088d2612bbc3f931d970a5ba68c4', 'reports/mpea-header-labels-reproduction-v1.json': 'a67d63a839eb3ee9d0f8d8416b30eee994a24cce11a7c3d729b3c1c5ed758532', 'reports/mpea-header-labels-v1.json': '70f50fa99db6b39b769be392ec1c64c655f8f32d7587f04f522e6a794c4accee', 'reports/mpea-source-inventory.json': 'ce2e1487cb91436137086f7c9900d091eed30068f6c8e9595687458c3f12679c', 'scripts/mpea_custody.py': '046aac4812802d1abf656aa93d0b832e8011e2feb59574615957c2550fe11b98', 'scripts/mpea_header_labels.py': '0d1e37cfef2889ed955d30f0fd987ba9b06dc2a1f8bf89ba7085112355b287c7', 'tests/test_mpea_custody.py': 'cf2fc7a0bdaf9bd59589c123745aae6f353fa5837849e26d2a9438d62d090b19', 'tests/test_mpea_custody_review.py': '27cca2dc9ec6d96cbcbf06971fe352d6d4f5fb0572b33f8d6648a8ad4cb299bc', 'tests/test_mpea_header_labels.py': '1bd9f9f967925faac4479135adb7d10051a4cb60bd17932759e0d3c0dc441dc9', 'tests/test_mpea_header_labels_review.py': '6f118b84ea8f77a2d5659e7aacc15f582fc974dc070b67e939efadd4006a9341'}
NEW_PATHS = ("scripts/mpea_row_metadata.py", "scripts/mpea_row_scanner.py",
             "tests/test_mpea_row_metadata.py", "tests/test_mpea_row_metadata_review.py",
             "docs/mpea-row-metadata-amendment-v1.md")
FROZEN_PATHS = tuple(PRIOR_PINS) + NEW_PATHS
SOURCE_BYTES = 332126
SOURCE_MD5 = "6d29eb6018157b863ca0033ccec936d5"
SOURCE_SHA256 = "c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d"
SOURCE_BLOB = {"bytes": SOURCE_BYTES, "md5": SOURCE_MD5, "sha256": SOURCE_SHA256}
CACHE_PATH = ROOT / ".cache/mpea-custody/figshare-v9/25797305-6d29eb6018157b863ca0033ccec936d5.csv"
POSITIONS = {"formula": 1, "processing": 3, "test_mode": 9, "temperature": 10, "source": 20}
TREATMENTS = {"formula": "opaque_formula_equality", "processing": "closed_processing_token",
              "test_mode": "closed_test_mode", "temperature": "exact_temperature", "source": "opaque_source_equality"}
PROFILE = {"id": "mpea.target_opaque_metadata.v1", "columns": 23, "max_source_bytes": SOURCE_BYTES,
           "max_observation_rows": 4096, "max_raw_field_bytes": 16384, "max_raw_record_bytes": 65536,
           "max_temperature_characters": 64, "max_temperature_bits": 256,
           "allowed_positions": POSITIONS, "identity_policy": "exact_lexical_token.v1"}
MARKERS = frozenset((b"", b"NaN", b"nan", b"NAN", b"NA", b"N/A", b"NR", b"None", b"null", b"-"))
ASCII_WHITESPACE = frozenset(b" \t\r\n\v\f")
ELEMENTS = frozenset(x.encode("ascii") for x in (
    "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn "
    "Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce "
    "Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn "
    "Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og"
).split())
FORMULA_PART = re.compile(rb"([A-Z][a-z]?)([0-9]+(?:\.[0-9]+)?)?")
DOI = re.compile(rb"(?:https?://(?:dx\.)?doi\.org/)?10\.[0-9]{4,9}/[!-~]+\Z")
MODE = {b"T": "T", b"C": "C"}
PROCESSING = {x.encode("ascii"): x for x in ("CAST", "POWDER", "WROUGHT", "ANNEAL", "OTHER")}
FIXED_SCOPE = {"target_cells_text_decoded": False, "target_numeric_validity_checked": False,
               "target_presence_checked": False, "target_missingness_computed": False,
               "identity_semantics_validated": False, "sampling_independence_established": False,
               "physical_compatibility_established": False, "full_scientific_schema_established": False,
               "scientific_eligibility_decisions": False, "features_selected": False,
               "fits": 0, "splits": 0}
ROW_ERRORS = frozenset({"HEADER_MISSING", "HEADER_MISMATCH", "FRAMING_INVALID", "WIDTH_MISMATCH",
                        "FIELD_LIMIT", "RECORD_LIMIT", "ROW_LIMIT"})
ERRORS = ROW_ERRORS | {"FROZEN_SOURCE_REQUIRED", "SCANNER_IDENTITY_CONFLICT", "MAPPING_IDENTITY_CONFLICT",
                      "SOURCE_IDENTITY_CONFLICT", "REAL_SOURCE_FORBIDDEN", "CACHE_READ_FAILED",
                      "PUBLIC_SCHEMA_INVALID", "PUBLIC_OUTPUT_CONFLICT", "CLI_ARGUMENT_INVALID", "INTERNAL_FAILURE"}


class MetadataError(ValueError):
    """Public errors have only fixed, non-data-bearing codes."""


def canonical_bytes(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True,
                       allow_nan=False) + "\n").encode("ascii")


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def _hex(value, length=64):
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{%d}" % length, value) is not None


def _keys(value, keys):
    if type(value) is not dict or set(value) != set(keys):
        raise MetadataError("PUBLIC_SCHEMA_INVALID")


def _safe_path(path, error):
    path = Path(path).absolute()
    if path.is_symlink() or path.resolve() != path:
        raise MetadataError(error)
    return path


def _bounded_file(path, cap, error):
    """One bounded read of at most cap+1 bytes, from a non-symlink regular file."""
    try:
        path = _safe_path(path, error)
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(fd, "rb") as stream:
            if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                raise MetadataError(error)
            raw = stream.read(cap + 1)
        if len(raw) > cap:
            raise MetadataError(error)
        return raw
    except OSError:
        raise MetadataError(error) from None


def _json(raw, error):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise MetadataError(error)
            result[key] = value
        return result
    try:
        return json.loads(raw, object_pairs_hook=pairs,
                          parse_constant=lambda _: (_ for _ in ()).throw(MetadataError(error)))
    except (ValueError, UnicodeError, RecursionError):
        raise MetadataError(error) from None


def _blob(value):
    _keys(value, {"bytes", "md5", "sha256"})
    if (type(value["bytes"]) is not int or not 0 <= value["bytes"] <= SOURCE_BYTES
            or not _hex(value["md5"], 32) or not _hex(value["sha256"])):
        raise MetadataError("PUBLIC_SCHEMA_INVALID")


def _implementation(identity):
    _keys(identity, {"mode", "commit", "files"})
    if identity["mode"] == "synthetic_fixture":
        if identity["commit"] is not None or identity["files"] != {}:
            raise MetadataError("PUBLIC_SCHEMA_INVALID")
    elif identity["mode"] == "committed_source":
        if (not _hex(identity["commit"], 40) or type(identity["files"]) is not dict
                or set(identity["files"]) != set(FROZEN_PATHS)
                or any(not _hex(x) for x in identity["files"].values())
                or any(identity["files"][p] != h for p, h in PRIOR_PINS.items())
                or identity["files"][NEW_PATHS[1]] != SCANNER_SHA256):
            raise MetadataError("PUBLIC_SCHEMA_INVALID")
    else:
        raise MetadataError("PUBLIC_SCHEMA_INVALID")


def frozen_source_identity():
    """No cache access: compare every frozen path with the current committed tree."""
    if Path(__file__).absolute() != ROOT / NEW_PATHS[0]:
        raise MetadataError("FROZEN_SOURCE_REQUIRED")
    try:
        def git(*args):
            return subprocess.run(["git", *args], cwd=ROOT, check=True,
                                  capture_output=True, timeout=10).stdout
        commit = git("rev-parse", "HEAD").decode("ascii").strip()
        prefix = git("rev-parse", "--show-prefix").decode("utf-8").strip()
        git("merge-base", "--is-ancestor", MAPPING_COMMIT, commit)
        hashes = {}
        for relative in FROZEN_PATHS:
            captured = _bounded_file(ROOT / relative, 2 * 1048576, "FROZEN_SOURCE_REQUIRED")
            if captured != git("show", commit + ":" + prefix + relative):
                raise MetadataError("FROZEN_SOURCE_REQUIRED")
            hashes[relative] = sha256(captured)
            if relative in PRIOR_PINS and captured != git("show", MAPPING_COMMIT + ":" + prefix + relative):
                raise MetadataError("FROZEN_SOURCE_REQUIRED")
        result = {"mode": "committed_source", "commit": commit, "files": hashes}
        _implementation(result)
        return result
    except (OSError, UnicodeError, subprocess.SubprocessError, ValueError):
        raise MetadataError("FROZEN_SOURCE_REQUIRED") from None


def load_scanner():
    """Execute exactly the captured hash-checked source, with fixed limits."""
    path = Path(__file__).parent / "mpea_row_scanner.py"
    raw = _bounded_file(path, 1048576, "SCANNER_IDENTITY_CONFLICT")
    if sha256(raw) != SCANNER_SHA256:
        raise MetadataError("SCANNER_IDENTITY_CONFLICT")
    module = types.ModuleType("_mpea_frozen_row_scanner")
    module.__file__ = str(path)
    sys.modules[module.__name__] = module
    exec(compile(raw, str(path), "exec"), module.__dict__)
    if ((module.MAX_SOURCE_BYTES, module.MAX_ROWS, module.MAX_COLUMNS, module.MAX_FIELD_BYTES,
         module.MAX_RECORD_BYTES, module.MAX_TEMPERATURE_CHARS, module.MAX_TEMPERATURE_BITS)
            != (SOURCE_BYTES, 4096, 128, 16384, 65536, 64, 256)):
        raise MetadataError("SCANNER_IDENTITY_CONFLICT")
    return module


def load_mapping():
    """Read only previously public, literal-hash-bound mapping/header metadata."""
    values = {}
    for path in (MAPPING_PATH, HEADER_PATH):
        raw = _bounded_file(ROOT / path, 131072, "MAPPING_IDENTITY_CONFLICT")
        if sha256(raw) != PRIOR_PINS[path]:
            raise MetadataError("MAPPING_IDENTITY_CONFLICT")
        values[path] = _json(raw, "MAPPING_IDENTITY_CONFLICT")
    mapping, receipt = values[MAPPING_PATH], values[HEADER_PATH]
    try:
        columns = mapping["columns"]
        tokens = tuple(item["token"].encode("utf-8") for item in columns)
        if (len(columns) != 23 or any(type(c["position"]) is not int or c["position"] != i for i, c in enumerate(columns))
                or receipt["header"]["column_count"] != 23
                or tokens != tuple(c["token"].encode("utf-8") for c in receipt["header"]["columns"])
                or mapping["header_receipt"]["sha256"] != PRIOR_PINS[HEADER_PATH]
                or mapping["source"]["sha256"] != SOURCE_SHA256
                or receipt["observed"] != SOURCE_BLOB
                or any(c["prospective_metadata_treatment"] != (
                    TREATMENTS[next(role for role, pos in POSITIONS.items() if pos == i)]
                    if i in POSITIONS.values() else "withhold") for i, c in enumerate(columns))):
            raise MetadataError("MAPPING_IDENTITY_CONFLICT")
        return tokens
    except (KeyError, TypeError, UnicodeError, StopIteration):
        raise MetadataError("MAPPING_IDENTITY_CONFLICT") from None


def _unresolved(token):
    return token in MARKERS or bool(token) and all(c in ASCII_WHITESPACE for c in token)


def _formula(token):
    if _unresolved(token):
        return False
    at = 0
    while at < len(token):
        match = FORMULA_PART.match(token, at)
        if match is None or match[1] not in ELEMENTS:
            return False
        count = match[2]
        if count is not None and not any(49 <= c <= 57 for c in count):
            return False
        at = match.end()
    return at > 0


def _doi(token):
    return not _unresolved(token) and DOI.fullmatch(token) is not None


def _state(status, value=None):
    return {"status": status, "value": value}


def _groups(records, position, recognizer):
    private = {}
    result = []
    for record in records:
        token = record[position]
        if not recognizer(token):
            result.append(_state("UNRESOLVED"))
            continue
        if token not in private:
            private[token] = len(private)
        result.append(_state("TOKEN_GROUP", private[token]))
    return result


def _value(token, role, scanner):
    if _unresolved(token):
        return _state("UNRESOLVED")
    if role == "temperature":
        return scanner._temperature(token)
    table = MODE if role == "test_mode" else PROCESSING
    return _state("KNOWN", table[token]) if token in table else _state("UNRESOLVED")


def _reference(expected):
    return {"expected_blob": dict(expected), "mapping_commit": MAPPING_COMMIT,
            "mapping_sha256": PRIOR_PINS[MAPPING_PATH], "header_receipt_sha256": PRIOR_PINS[HEADER_PATH],
            "source_doi": "10.6084/m9.figshare.12642953.v9", "license": "CC BY 4.0"}


def _seal(report):
    report["content_sha256"] = sha256(canonical_bytes(report))
    validate_public_report(report)
    return report


def _inspect(raw, expected, identity, tokens, scanner):
    if type(raw) is not bytes or len(raw) > SOURCE_BYTES:
        raise MetadataError("SOURCE_IDENTITY_CONFLICT")
    _blob(expected)
    _implementation(identity)
    observed = {"bytes": len(raw), "md5": hashlib.md5(raw).hexdigest(), "sha256": sha256(raw)}
    report = {"schema": "lupine.discovery.mpea.row_metadata.v1", "status": "BLOCKED_SOURCE",
              "reason": "SOURCE_IDENTITY_CONFLICT", "reference": _reference(expected), "observed": observed,
              "implementation": identity, "profile": _json(canonical_bytes(PROFILE), "INTERNAL_FAILURE"), "scope": dict(FIXED_SCOPE),
              "rows": None, "row_count": None}
    report["scope"].update(captured_source_bytes_read=True, observation_byte_framing_attempted=False,
                          all_observation_rows_framed=False, allowed_metadata_processed=False,
                          all_rows_preserved=False, synthetic_fixture=identity["mode"] == "synthetic_fixture")
    if observed != expected:
        return _seal(report)
    # Prefixes merely satisfy the frozen scanner's synthetic mapping container;
    # _frame uses indices only. They are never applied as production recognizers.
    rules = tuple(scanner.ColumnRule(role, position, (), (b"unused:",) if role in {"source", "formula"} else ())
                  for role, position in POSITIONS.items())
    mapping = scanner.MetadataMapping(tokens, rules)
    report["scope"]["observation_byte_framing_attempted"] = True
    try:
        records = scanner._frame(raw, mapping)
    except scanner.MetadataError as error:
        report.update(status="BLOCKED_ROWS", reason=str(error) if str(error) in ROW_ERRORS else "INTERNAL_FAILURE")
        return _seal(report)
    source_groups = _groups(records, POSITIONS["source"], _doi)
    formula_groups = _groups(records, POSITIONS["formula"], _formula)
    report["rows"] = [dict(ordinal=i, record_id=observed["sha256"] + ":" + str(i),
                           source=source_groups[i], formula=formula_groups[i],
                           **{role: _value(record[POSITIONS[role]], role, scanner)
                              for role in ("test_mode", "processing", "temperature")})
                      for i, record in enumerate(records)]
    report.update(status="METADATA_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED", reason="SCIENTIFIC_SCHEMA_UNRESOLVED",
                  row_count=len(records))
    report["scope"].update(all_observation_rows_framed=True, allowed_metadata_processed=True, all_rows_preserved=True)
    return _seal(report)


def inspect_fixture(raw, *, expected_blob):
    """Synthetic fixtures only, fixed public 23-column mapping, no bypass flag."""
    _blob(expected_blob)
    if type(raw) is not bytes or len(raw) > SOURCE_BYTES:
        raise MetadataError("SOURCE_IDENTITY_CONFLICT")
    if expected_blob["sha256"] == SOURCE_SHA256 or sha256(raw) == SOURCE_SHA256:
        raise MetadataError("REAL_SOURCE_FORBIDDEN")
    return _inspect(raw, expected_blob, {"mode": "synthetic_fixture", "commit": None, "files": {}},
                    load_mapping(), load_scanner())


def extract_cache():
    """Only production entry: committed source, published metadata, then fixed cache."""
    identity = frozen_source_identity()
    tokens = load_mapping()
    scanner = load_scanner()
    raw = _bounded_file(CACHE_PATH, SOURCE_BYTES, "CACHE_READ_FAILED")
    return _inspect(raw, dict(SOURCE_BLOB), identity, tokens, scanner)


def _validate_public_report(report):
    _keys(report, {"schema", "status", "reason", "reference", "observed", "implementation", "profile",
                   "scope", "rows", "row_count", "content_sha256"})
    if report["schema"] != "lupine.discovery.mpea.row_metadata.v1":
        raise MetadataError("PUBLIC_SCHEMA_INVALID")
    _implementation(report["implementation"])
    synthetic = report["implementation"]["mode"] == "synthetic_fixture"
    reference = report["reference"]
    _keys(reference, _reference(SOURCE_BLOB))
    _blob(reference["expected_blob"])
    _blob(report["observed"])
    if (canonical_bytes(reference) != canonical_bytes(_reference(reference["expected_blob"]))
            or (not synthetic and canonical_bytes(reference["expected_blob"]) != canonical_bytes(SOURCE_BLOB))
            or (synthetic and (reference["expected_blob"]["sha256"] == SOURCE_SHA256
                              or report["observed"]["sha256"] == SOURCE_SHA256))
            or canonical_bytes(report["profile"]) != canonical_bytes(PROFILE)):
        raise MetadataError("PUBLIC_SCHEMA_INVALID")
    scope = report["scope"]
    dynamic = {"captured_source_bytes_read", "observation_byte_framing_attempted", "all_observation_rows_framed",
               "allowed_metadata_processed", "all_rows_preserved", "synthetic_fixture"}
    _keys(scope, set(FIXED_SCOPE) | dynamic)
    if (any(type(scope[k]) is not type(v) or scope[k] != v for k, v in FIXED_SCOPE.items())
            or any(type(scope[k]) is not bool for k in dynamic)
            or scope["captured_source_bytes_read"] is not True or scope["synthetic_fixture"] is not synthetic):
        raise MetadataError("PUBLIC_SCHEMA_INVALID")
    verified = canonical_bytes(report["observed"]) == canonical_bytes(reference["expected_blob"])
    success = report["status"] == "METADATA_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED"
    if success:
        if (not verified or report["reason"] != "SCIENTIFIC_SCHEMA_UNRESOLVED"
                or not all(scope[k] for k in dynamic - {"synthetic_fixture"})
                or type(report["row_count"]) is not int or not 0 <= report["row_count"] <= 4096
                or type(report["rows"]) is not list or len(report["rows"]) != report["row_count"]):
            raise MetadataError("PUBLIC_SCHEMA_INVALID")
        seen = {role: set() for role in ("source", "formula")}
        for ordinal, row in enumerate(report["rows"]):
            _keys(row, {"ordinal", "record_id"} | set(POSITIONS))
            if (type(row["ordinal"]) is not int or row["ordinal"] != ordinal
                    or row["record_id"] != report["observed"]["sha256"] + ":" + str(ordinal)):
                raise MetadataError("PUBLIC_SCHEMA_INVALID")
            for role in POSITIONS:
                item = row[role]
                _keys(item, {"status", "value"})
                status, value = item["status"], item["value"]
                if status == "UNRESOLVED" or (role == "temperature" and status == "UNRESOLVED_LIMIT"):
                    if value is not None:
                        raise MetadataError("PUBLIC_SCHEMA_INVALID")
                elif role in seen and status == "TOKEN_GROUP":
                    if type(value) is not int or value < 0 or value > len(seen[role]):
                        raise MetadataError("PUBLIC_SCHEMA_INVALID")
                    seen[role].add(value)
                elif role in {"test_mode", "processing"} and status == "KNOWN":
                    if type(value) is not str or value not in (MODE.values() if role == "test_mode" else PROCESSING.values()):
                        raise MetadataError("PUBLIC_SCHEMA_INVALID")
                elif role == "temperature" and status == "KNOWN":
                    _keys(value, {"decimal", "numerator", "denominator", "unit"})
                    lexical = value["decimal"]
                    if (type(lexical) is not str or len(lexical) > 64
                            or re.fullmatch(r"[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)", lexical) is None
                            or value["unit"] != "degC" or type(value["numerator"]) is not str
                            or type(value["denominator"]) is not str):
                        raise MetadataError("PUBLIC_SCHEMA_INVALID")
                    exact = Fraction(lexical)
                    if (max(abs(exact.numerator).bit_length(), exact.denominator.bit_length()) > 256
                            or value["numerator"] != str(exact.numerator) or value["denominator"] != str(exact.denominator)):
                        raise MetadataError("PUBLIC_SCHEMA_INVALID")
                else:
                    raise MetadataError("PUBLIC_SCHEMA_INVALID")
    else:
        if (report["rows"] is not None or report["row_count"] is not None
                or any(scope[k] for k in ("all_observation_rows_framed", "allowed_metadata_processed", "all_rows_preserved"))):
            raise MetadataError("PUBLIC_SCHEMA_INVALID")
        if report["status"] == "BLOCKED_SOURCE":
            valid = not verified and not scope["observation_byte_framing_attempted"] and report["reason"] == "SOURCE_IDENTITY_CONFLICT"
        elif report["status"] == "BLOCKED_ROWS":
            valid = verified and scope["observation_byte_framing_attempted"] and report["reason"] in ROW_ERRORS | {"INTERNAL_FAILURE"}
        else:
            valid = False
        if not valid:
            raise MetadataError("PUBLIC_SCHEMA_INVALID")
    if (not _hex(report["content_sha256"]) or report["content_sha256"] != sha256(canonical_bytes(
            {k: v for k, v in report.items() if k != "content_sha256"}))):
        raise MetadataError("PUBLIC_SCHEMA_INVALID")
    return True


def validate_public_report(report):
    try:
        return _validate_public_report(report)
    except (ValueError, TypeError, KeyError, OverflowError, RecursionError):
        raise MetadataError("PUBLIC_SCHEMA_INVALID") from None


def write_public(report, path):
    """Closed schema, ASCII escaping, atomic publication, no overwrite."""
    validate_public_report(report)
    raw = canonical_bytes(report)
    temporary = None
    try:
        path = _safe_path(path, "PUBLIC_OUTPUT_CONFLICT")
        if path.exists():
            if _bounded_file(path, 8 * 1048576, "PUBLIC_OUTPUT_CONFLICT") != raw:
                raise MetadataError("PUBLIC_OUTPUT_CONFLICT")
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        _safe_path(path.parent, "PUBLIC_OUTPUT_CONFLICT")
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".mpea-metadata-", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.link(temporary, path, follow_symlinks=False)
    except OSError:
        raise MetadataError("PUBLIC_OUTPUT_CONFLICT") from None
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


class _Parser(argparse.ArgumentParser):
    def error(self, message):
        raise MetadataError("CLI_ARGUMENT_INVALID")


def main(argv=None):
    parser = _Parser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    try:
        args = parser.parse_args(argv)
        report = extract_cache()
        write_public(report, args.output)
        print(json.dumps({"status": report["status"], "reason": report["reason"],
                          "receipt_sha256": sha256(canonical_bytes(report))}, sort_keys=True))
        return 2  # Scientific schema remains unresolved even on metadata success.
    except Exception as error:
        code = str(error) if isinstance(error, MetadataError) and str(error) in ERRORS else "INTERNAL_FAILURE"
        print(json.dumps({"status": "BLOCKED", "reason": code}, sort_keys=True))
        return 2


if __name__ == "__main__":
    sys.exit(main())
