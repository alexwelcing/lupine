#!/usr/bin/env python3
"""Source-bound local MPEA features; production requires a prior freeze and CI.

No default execution, network reader, target decoding or synthetic/real toggle.
The local vector artifact is restricted to ignored .cache/mpea-features storage;
only a separate aggregate report may be published.
"""
from __future__ import annotations

import argparse
from fractions import Fraction
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

ROOT = next(p for p in Path(__file__).resolve().parents if p.name == "discovery" and (p / "AGENTS.md").is_file())
CODE_ROOT = Path(__file__).resolve().parents[1]
FORMULA_COMMIT = "a1e47024898072111f80e3ff911026306a50df2b"
EVIDENCE_COMMIT = "28b929f6ac74edaeccef148c7a1aa29b3b4bfdb0"
FORMULA_SCRIPT = "scripts/mpea_formula_tokens.py"
FORMULA_SCRIPT_SHA = "8f2bbaa34dccc9c50341f86863526cd3ad6380e97ff3d0e2ca07c0fbbe4c3139"
FORMULA_REPORT = "reports/mpea-formula-tokens-v1.json"
METADATA_REPORT = "reports/mpea-row-metadata-v1.json"
INPUT_PINS = {
    FORMULA_REPORT: "ce2b8d12464bac1c5e9533e136f09b3b65761188609279b40a78f31dbcc6d3a7",
    "reports/mpea-formula-reproduction-v1.json": "3453b69b906230a627b128e8af8c7ff2722740295981950f972ec581096017ec",
}
KERNEL_PINS = {
    "src/lupine_discovery/representation.py": "c65c0eed659025a0e41eb325e75182ac2b980c35ac43dfddaa501f4f3ddf3b9e",
    "scripts/mpea_features.py": "b24c0f1bb62fc56794e1232f973a6020ee42a0d3765d33cb51246f3c7a3a47d9",
}
NEW_PATHS = (*KERNEL_PINS, "scripts/mpea_feature_reader.py", "tests/test_representation.py",
             "tests/test_mpea_features.py", "tests/test_representation_independent.py",
             "tests/test_mpea_feature_reader.py", "tests/test_mpea_feature_reader_review.py",
             "docs/mpea-feature-adapter-contract-v1.md", "docs/mpea-feature-reader-v1.md")
SOURCE = {"bytes": 332126, "md5": "6d29eb6018157b863ca0033ccec936d5",
          "sha256": "c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d"}
CACHE = ROOT / ".cache/mpea-custody/figshare-v9/25797305-6d29eb6018157b863ca0033ccec936d5.csv"
LOCAL_ROOT = ROOT / ".cache/mpea-features"
LOCAL_CAP = 8 * 1048576
FIXED_SCOPE = {"formula_coefficients_numerically_converted": True, "declared_coefficients_normalized": True,
               "other_observation_cells_accumulated": False, "metadata_reused_from_pinned_public_receipt": True,
               "target_cells_text_decoded": False, "target_presence_checked": False,
               "target_missingness_computed": False, "physical_composition_established": False,
               "producer_lineage_established": False, "sampling_independence_established": False,
               "scientific_eligibility_decisions": False, "full_scientific_schema_established": False,
               "features_from_targets": False, "fits": 0, "splits": 0}
ROW_ERRORS = {"HEADER_MISSING", "HEADER_MISMATCH", "FRAMING_INVALID", "WIDTH_MISMATCH", "FIELD_LIMIT",
              "RECORD_LIMIT", "ROW_LIMIT", "METADATA_ROW_CONFLICT", "FORMULA_GROUP_CONFLICT"}
ERRORS = ROW_ERRORS | {"FROZEN_SOURCE_REQUIRED", "INPUT_IDENTITY_CONFLICT", "KERNEL_IDENTITY_CONFLICT",
                      "SOURCE_IDENTITY_CONFLICT", "CACHE_READ_FAILED", "LOCAL_SCHEMA_INVALID",
                      "PUBLIC_SCHEMA_INVALID", "LOCAL_OUTPUT_REQUIRED", "OUTPUT_CONFLICT",
                      "CLI_ARGUMENT_INVALID", "INTERNAL_FAILURE"}


class FeatureReaderError(ValueError):
    pass


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True,
                       allow_nan=False) + "\n").encode("ascii")


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def _safe(path, code):
    path = Path(path).absolute()
    if path.resolve() != path or path.is_symlink():
        raise FeatureReaderError(code)
    return path


def _read(path, cap, code):
    try:
        path = _safe(path, code)
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(fd, "rb") as stream:
            if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                raise FeatureReaderError(code)
            raw = stream.read(cap + 1)
        if len(raw) > cap:
            raise FeatureReaderError(code)
        return raw
    except OSError:
        raise FeatureReaderError(code) from None


def _module(path, expected, name):
    raw = _read(path, 1048576, "KERNEL_IDENTITY_CONFLICT")
    if sha(raw) != expected:
        raise FeatureReaderError("KERNEL_IDENTITY_CONFLICT")
    module = types.ModuleType(name)
    module.__file__ = str(path)
    if "." in name:
        parent = name.rsplit(".", 1)[0]
        if parent not in sys.modules:
            namespace = types.ModuleType(parent)
            namespace.__path__ = []
            sys.modules[parent] = namespace
    sys.modules[name] = module
    exec(compile(raw, str(path), "exec"), module.__dict__)
    return module


def load_context():
    """Public receipts and exact source only; no experimental cache access."""
    formula = _module(ROOT / FORMULA_SCRIPT, FORMULA_SCRIPT_SHA, "_mpea_feature_frozen_formula")
    helper = formula.load_helpers()
    metadata, tokens = formula.load_references(helper)
    inputs = {}
    for path, expected in INPUT_PINS.items():
        raw = _read(ROOT / path, 2 * 1048576, "INPUT_IDENTITY_CONFLICT")
        if sha(raw) != expected:
            raise FeatureReaderError("INPUT_IDENTITY_CONFLICT")
        inputs[path] = helper._json(raw, "INPUT_IDENTITY_CONFLICT")
    previous = inputs[FORMULA_REPORT]
    formula.validate_public_report(previous, _helper=helper)
    if (previous["implementation"]["commit"] != FORMULA_COMMIT or previous["row_count"] != metadata["row_count"]
            or previous["observed"] != SOURCE or metadata["observed"] != SOURCE
            or any((a["ordinal"], a["record_id"]) != (b["ordinal"], b["record_id"])
                   for a, b in zip(previous["rows"], metadata["rows"]))):
        raise FeatureReaderError("INPUT_IDENTITY_CONFLICT")
    # Capture/execute the same pinned bytes. No synthetic guard or source identity
    # is rewritten; production uses only the kernel's source-free arithmetic API.
    representation = _module(CODE_ROOT / "src/lupine_discovery/representation.py",
                             KERNEL_PINS["src/lupine_discovery/representation.py"], "lupine_discovery.representation")
    features = _module(CODE_ROOT / "scripts/mpea_features.py", KERNEL_PINS["scripts/mpea_features.py"], "_mpea_feature_arithmetic")
    return {"formula": formula, "helper": helper, "metadata": metadata, "previous": previous,
            "tokens": tokens, "representation": representation, "features": features}


def frozen_source_identity(context):
    if Path(__file__).absolute() != ROOT / "scripts/mpea_feature_reader.py":
        raise FeatureReaderError("FROZEN_SOURCE_REQUIRED")
    try:
        def git(*args):
            return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, timeout=10).stdout
        old = context["formula"].frozen_source_identity(context["helper"])
        if old["files"] != context["previous"]["implementation"]["files"]:
            raise FeatureReaderError("FROZEN_SOURCE_REQUIRED")
        commit = git("rev-parse", "HEAD").decode("ascii").strip()
        prefix = git("rev-parse", "--show-prefix").decode("utf-8").strip()
        git("merge-base", "--is-ancestor", FORMULA_COMMIT, commit)
        git("merge-base", "--is-ancestor", EVIDENCE_COMMIT, commit)
        files = dict(old["files"])
        for path in (*INPUT_PINS, *NEW_PATHS):
            raw = _read(ROOT / path, 2 * 1048576, "FROZEN_SOURCE_REQUIRED")
            if raw != git("show", commit + ":" + prefix + path):
                raise FeatureReaderError("FROZEN_SOURCE_REQUIRED")
            if path in INPUT_PINS and raw != git("show", EVIDENCE_COMMIT + ":" + prefix + path):
                raise FeatureReaderError("FROZEN_SOURCE_REQUIRED")
            files[path] = sha(raw)
        identity = {"mode": "committed_source", "commit": commit, "files": files}
        _identity(identity, context)
        return identity
    except (OSError, UnicodeError, subprocess.SubprocessError, ValueError):
        raise FeatureReaderError("FROZEN_SOURCE_REQUIRED") from None


def _profile(context):
    kernel = context["features"]
    return {"id": "mpea.declared_coefficients.local.v1", "axes": list(kernel.AXES),
            "processing_axes": list(kernel.PROCESSING_AXES), "columns": 23, "allowed_positions": {"formula": 1},
            "max_terms": 256, "max_digits": 128, "max_decimal_places": 64, "max_integer_bits": 1024,
            "max_raw_field_bytes": 16384, "max_raw_record_bytes": 65536, "max_rows": 4096,
            "local_storage": "ignored_local_only", "interpretation": "normalized_declared_lexical_coefficients"}


def _inputs(context):
    return {"formula_producer_commit": FORMULA_COMMIT, "formula_receipts_commit": EVIDENCE_COMMIT,
            "files": {**context["formula"].REFERENCE_PINS, **INPUT_PINS},
            "mapping_sha256": context["previous"]["reference"]["mapping_sha256"],
            "header_receipt_sha256": context["previous"]["reference"]["header_receipt_sha256"],
            "source_doi": "10.6084/m9.figshare.12642953.v9", "license": "CC BY 4.0"}


def _seal(record):
    return {**record, "content_sha256": sha(canonical(record))}


def _base(context, identity):
    return {"source": dict(SOURCE), "inputs": _inputs(context), "implementation": identity,
            "profile": _profile(context), "scope": dict(FIXED_SCOPE)}


def _inspect(raw, context, identity):
    """Private captured-byte path; no production enable/identity substitution option."""
    if type(raw) is not bytes or len(raw) > SOURCE["bytes"]:
        raise FeatureReaderError("SOURCE_IDENTITY_CONFLICT")
    observed = {"bytes": len(raw), "md5": hashlib.md5(raw).hexdigest(), "sha256": sha(raw)}
    if observed != SOURCE:
        raise FeatureReaderError("SOURCE_IDENTITY_CONFLICT")
    scanner = context["helper"].load_scanner()
    mapping = scanner.MetadataMapping(context["tokens"], (scanner.ColumnRule("formula", 1, (), (b"unused:",)),))
    try:
        records = scanner._frame(raw, mapping)
    except scanner.MetadataError as error:
        raise FeatureReaderError(str(error) if str(error) in ROW_ERRORS else "INTERNAL_FAILURE") from None
    metadata, previous, kernel = context["metadata"], context["previous"], context["features"]
    if len(records) != metadata["row_count"] or len(records) != previous["row_count"]:
        raise FeatureReaderError("METADATA_ROW_CONFLICT")
    groups = {}
    rows = []
    for ordinal, record in enumerate(records):
        token = record[1]
        recognized = context["formula"].recognizes_formula(token)
        expected = {"status": "UNRESOLVED", "value": None}
        if recognized:
            if token not in groups:
                groups[token] = len(groups)
            expected = {"status": "TOKEN_GROUP", "value": groups[token]}
        prior_formula = previous["rows"][ordinal]
        prior_metadata = metadata["rows"][ordinal]
        record_id = SOURCE["sha256"] + ":" + str(ordinal)
        if (prior_formula["formula"] != expected or prior_formula["record_id"] != record_id
                or prior_metadata["record_id"] != record_id):
            raise FeatureReaderError("FORMULA_GROUP_CONFLICT")
        feature = kernel.parse_formula_coefficients(token)
        if (feature.status == "UNRESOLVED") != (expected["status"] == "UNRESOLVED"):
            raise FeatureReaderError("FORMULA_GROUP_CONFLICT")
        copied = {key: prior_metadata[key] for key in ("source", "processing", "test_mode", "temperature")}
        copied["formula"] = expected
        processing = kernel.encode_processing(copied["processing"]["status"], copied["processing"]["value"])
        rows.append({"ordinal": ordinal, "record_id": record_id, "metadata": copied,
                     "composition": {"status": feature.status, "reason": feature.reason,
                         "values": None if feature.vector is None else [str(x) for x in feature.vector.values]},
                     "processing_indicator": list(processing.indicator)})
    local = _seal({"schema": "lupine.discovery.mpea.local_features.v1", **_base(context, identity),
                   "row_count": len(rows), "rows": rows})
    validate_local_artifact(local, _context=context)
    public = _public_from_local(local, context)
    validate_public_report(public, _context=context)
    return local, public


def extract_cache():
    context = load_context()
    identity = frozen_source_identity(context)
    raw = _read(CACHE, SOURCE["bytes"], "CACHE_READ_FAILED")
    return _inspect(raw, context, identity)


def _keys(value, keys, code):
    if type(value) is not dict or set(value) != set(keys):
        raise FeatureReaderError(code)


def _identity(identity, context):
    code = "FROZEN_SOURCE_REQUIRED"
    _keys(identity, {"mode", "commit", "files"}, code)
    previous = context["previous"]["implementation"]["files"]
    expected_paths = set(previous) | set(INPUT_PINS) | set(NEW_PATHS)
    if (identity["mode"] != "committed_source" or type(identity["commit"]) is not str
            or re.fullmatch(r"[0-9a-f]{40}", identity["commit"]) is None
            or type(identity["files"]) is not dict or set(identity["files"]) != expected_paths
            or any(type(value) is not str or re.fullmatch(r"[0-9a-f]{64}", value) is None for value in identity["files"].values())
            or any(identity["files"][path] != value for path, value in {**previous, **INPUT_PINS, **KERNEL_PINS}.items())):
        raise FeatureReaderError(code)


def _common(record, context, code):
    _identity(record["implementation"], context)
    for key, expected in _base(context, record["implementation"]).items():
        if canonical(record[key]) != canonical(expected):
            raise FeatureReaderError(code)
    if (type(record["row_count"]) is not int or record["row_count"] != context["metadata"]["row_count"]
            or record["content_sha256"] != sha(canonical({k: v for k, v in record.items() if k != "content_sha256"}))):
        raise FeatureReaderError(code)


def validate_local_artifact(record, *, _context=None):
    code = "LOCAL_SCHEMA_INVALID"
    try:
        context = _context or load_context()
        _keys(record, {"schema", "source", "inputs", "implementation", "profile", "scope", "row_count", "rows", "content_sha256"}, code)
        if record["schema"] != "lupine.discovery.mpea.local_features.v1":
            raise FeatureReaderError(code)
        _common(record, context, code)
        if type(record["rows"]) is not list or len(record["rows"]) != record["row_count"]:
            raise FeatureReaderError(code)
        known_groups = {}
        for ordinal, row in enumerate(record["rows"]):
            _keys(row, {"ordinal", "record_id", "metadata", "composition", "processing_indicator"}, code)
            if type(row["ordinal"]) is not int or row["ordinal"] != ordinal or row["record_id"] != SOURCE["sha256"] + ":" + str(ordinal):
                raise FeatureReaderError(code)
            expected = {key: context["metadata"]["rows"][ordinal][key] for key in ("source", "processing", "test_mode", "temperature")}
            expected["formula"] = context["previous"]["rows"][ordinal]["formula"]
            if canonical(row["metadata"]) != canonical(expected):
                raise FeatureReaderError(code)
            kernel = context["features"]
            processing = kernel.encode_processing(expected["processing"]["status"], expected["processing"]["value"])
            if canonical(row["processing_indicator"]) != canonical(list(processing.indicator)):
                raise FeatureReaderError(code)
            item = row["composition"]
            _keys(item, {"status", "reason", "values"}, code)
            vector = None
            if item["values"] is not None:
                if type(item["values"]) is not list or len(item["values"]) != 118:
                    raise FeatureReaderError(code)
                exact = []
                for value in item["values"]:
                    if (type(value) is not str or len(value) > 640
                            or re.fullmatch(r"(?:0|[1-9][0-9]*)(?:/[1-9][0-9]*)?", value) is None):
                        raise FeatureReaderError(code)
                    numerator, _, denominator = value.partition("/")
                    if len(numerator) > 309 or len(denominator) > 309:
                        raise FeatureReaderError(code)
                    number = Fraction(int(numerator), int(denominator) if denominator else 1)
                    if max(number.numerator.bit_length(), number.denominator.bit_length()) > 1024 or str(number) != value:
                        raise FeatureReaderError(code)
                    exact.append(number)
                vector = context["representation"].NormalizedVector(kernel.AXES, tuple(exact))
            feature = kernel.FeatureResult(item["status"], item["reason"], vector)
            if feature.reason == "FIELD_LIMIT":
                raise FeatureReaderError(code)
            if (feature.status == "UNRESOLVED") != (expected["formula"]["status"] == "UNRESOLVED"):
                raise FeatureReaderError(code)
            group = expected["formula"]["value"]
            if group is not None:
                if group in known_groups and canonical(known_groups[group]) != canonical(item):
                    raise FeatureReaderError(code)
                known_groups[group] = item
        return True
    except (ValueError, TypeError, KeyError, OverflowError, RecursionError):
        raise FeatureReaderError(code) from None


def _counts(local):
    statuses = {key: 0 for key in ("KNOWN", "UNRESOLVED", "UNRESOLVED_LIMIT")}
    reasons = {}
    processing = {key: 0 for key in ("CAST", "POWDER", "WROUGHT", "ANNEAL", "OTHER", "UNRESOLVED")}
    unknown_source = 0
    for row in local["rows"]:
        item = row["composition"]
        statuses[item["status"]] += 1
        reasons[item["reason"]] = reasons.get(item["reason"], 0) + 1
        category = row["metadata"]["processing"]
        processing[category["value"] if category["status"] == "KNOWN" else "UNRESOLVED"] += 1
        unknown_source += row["metadata"]["source"]["status"] == "UNRESOLVED"
    return {"composition_status_counts": statuses, "composition_reason_counts": reasons,
            "processing_category_counts": processing, "unknown_source_rows": unknown_source}


def _public_from_local(local, context):
    raw = canonical(local)
    return _seal({"schema": "lupine.discovery.mpea.feature_readiness.v1", **_base(context, local["implementation"]),
                  "status": "FEATURES_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED", "reason": "SCIENTIFIC_SCHEMA_UNRESOLVED",
                  "row_count": local["row_count"], "counts": _counts(local),
                  "local_artifact_identity": {"storage": "ignored_local_only", "bytes": len(raw), "sha256": sha(raw),
                      "content_sha256": local["content_sha256"]}, "all_rows_preserved": True,
                  "per_row_features_published": False})


def validate_public_report(report, *, _context=None):
    code = "PUBLIC_SCHEMA_INVALID"
    try:
        context = _context or load_context()
        _keys(report, {"schema", "source", "inputs", "implementation", "profile", "scope", "status", "reason",
                       "row_count", "counts", "local_artifact_identity", "all_rows_preserved", "per_row_features_published", "content_sha256"}, code)
        _common(report, context, code)
        if (report["schema"] != "lupine.discovery.mpea.feature_readiness.v1"
                or report["status"] != "FEATURES_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED"
                or report["reason"] != "SCIENTIFIC_SCHEMA_UNRESOLVED" or report["all_rows_preserved"] is not True
                or report["per_row_features_published"] is not False):
            raise FeatureReaderError(code)
        counts = report["counts"]
        _keys(counts, {"composition_status_counts", "composition_reason_counts", "processing_category_counts", "unknown_source_rows"}, code)
        _keys(counts["composition_status_counts"], {"KNOWN", "UNRESOLVED", "UNRESOLVED_LIMIT"}, code)
        _keys(counts["processing_category_counts"], context["features"].PROCESSING_AXES, code)
        reasons = {"DECLARED_COEFFICIENTS_NORMALIZED", "MISSING_FORMULA", "UNSUPPORTED_GRAMMAR",
                   "TERM_LIMIT", "DIGIT_LIMIT", "SCALE_LIMIT", "ARITHMETIC_LIMIT"}
        if type(counts["composition_reason_counts"]) is not dict or not set(counts["composition_reason_counts"]) <= reasons:
            raise FeatureReaderError(code)
        for group in ("composition_status_counts", "composition_reason_counts", "processing_category_counts"):
            values = counts[group].values()
            if any(type(x) is not int or x < 0 for x in values) or sum(values) != report["row_count"]:
                raise FeatureReaderError(code)
        if type(counts["unknown_source_rows"]) is not int or not 0 <= counts["unknown_source_rows"] <= report["row_count"]:
            raise FeatureReaderError(code)
        reason_counts = counts["composition_reason_counts"]
        status_counts = counts["composition_status_counts"]
        if (status_counts["KNOWN"] != reason_counts.get("DECLARED_COEFFICIENTS_NORMALIZED", 0)
                or status_counts["UNRESOLVED"] != sum(reason_counts.get(k, 0) for k in ("MISSING_FORMULA", "UNSUPPORTED_GRAMMAR"))
                or status_counts["UNRESOLVED_LIMIT"] != sum(reason_counts.get(k, 0) for k in reasons - {
                    "DECLARED_COEFFICIENTS_NORMALIZED", "MISSING_FORMULA", "UNSUPPORTED_GRAMMAR"})
                or status_counts["UNRESOLVED"] != sum(row["formula"]["status"] == "UNRESOLVED" for row in context["previous"]["rows"])):
            raise FeatureReaderError(code)
        original_processing = dict.fromkeys(context["features"].PROCESSING_AXES, 0)
        for row in context["metadata"]["rows"]:
            item = row["processing"]
            original_processing[item["value"] if item["status"] == "KNOWN" else "UNRESOLVED"] += 1
        if (canonical(counts["processing_category_counts"]) != canonical(original_processing)
                or counts["unknown_source_rows"] != sum(row["source"]["status"] == "UNRESOLVED" for row in context["metadata"]["rows"])):
            raise FeatureReaderError(code)
        identity = report["local_artifact_identity"]
        _keys(identity, {"storage", "bytes", "sha256", "content_sha256"}, code)
        if (identity["storage"] != "ignored_local_only" or type(identity["bytes"]) is not int
                or not 0 < identity["bytes"] <= LOCAL_CAP
                or any(type(identity[k]) is not str or re.fullmatch(r"[0-9a-f]{64}", identity[k]) is None for k in ("sha256", "content_sha256"))):
            raise FeatureReaderError(code)
        return True
    except (ValueError, TypeError, KeyError, OverflowError, RecursionError):
        raise FeatureReaderError(code) from None


def _atomic(path, raw):
    directory_fd, temporary = None, None
    try:
        path = _safe(path, "OUTPUT_CONFLICT")
        if path.exists():
            if _read(path, LOCAL_CAP, "OUTPUT_CONFLICT") != raw:
                raise FeatureReaderError("OUTPUT_CONFLICT")
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        _safe(path, "OUTPUT_CONFLICT")
        directory_fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        captured = os.fstat(directory_fd)
        _safe(path, "OUTPUT_CONFLICT")
        current = os.stat(path.parent, follow_symlinks=False)
        if (captured.st_dev, captured.st_ino) != (current.st_dev, current.st_ino):
            raise FeatureReaderError("OUTPUT_CONFLICT")
        while True:
            name = ".mpea-feature-" + secrets.token_hex(16)
            try:
                fd = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=directory_fd)
                temporary = name
                break
            except FileExistsError:
                continue
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw); stream.flush(); os.fsync(stream.fileno())
        _safe(path, "OUTPUT_CONFLICT")
        current = os.stat(path.parent, follow_symlinks=False)
        if (captured.st_dev, captured.st_ino) != (current.st_dev, current.st_ino):
            raise FeatureReaderError("OUTPUT_CONFLICT")
        os.link(temporary, path.name, src_dir_fd=directory_fd, dst_dir_fd=directory_fd, follow_symlinks=False)
    except OSError:
        raise FeatureReaderError("OUTPUT_CONFLICT") from None
    finally:
        if directory_fd is not None:
            try:
                if temporary is not None:
                    os.unlink(temporary, dir_fd=directory_fd)
            finally:
                os.close(directory_fd)


def _output_paths(local_path, public_path):
    local_path = _safe(local_path, "LOCAL_OUTPUT_REQUIRED")
    if not local_path.is_relative_to(LOCAL_ROOT) or local_path == LOCAL_ROOT:
        raise FeatureReaderError("LOCAL_OUTPUT_REQUIRED")
    # A .cache spelling is insufficient: Git must confirm this exact path ignored.
    result = subprocess.run(["git", "check-ignore", "-q", str(local_path)], cwd=ROOT,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise FeatureReaderError("LOCAL_OUTPUT_REQUIRED")
    public_path = _safe(public_path, "OUTPUT_CONFLICT")
    if public_path == local_path:
        raise FeatureReaderError("OUTPUT_CONFLICT")
    return local_path, public_path


def write_outputs(local, public, local_path, public_path):
    context = load_context()
    validate_local_artifact(local, _context=context)
    validate_public_report(public, _context=context)
    if canonical(public) != canonical(_public_from_local(local, context)):
        raise FeatureReaderError("PUBLIC_SCHEMA_INVALID")
    local_path, public_path = _output_paths(local_path, public_path)
    raw = canonical(local)
    if len(raw) > LOCAL_CAP:
        raise FeatureReaderError("LOCAL_SCHEMA_INVALID")
    _atomic(local_path, raw)
    _atomic(public_path, canonical(public))


class _Parser(argparse.ArgumentParser):
    def error(self, message):
        raise FeatureReaderError("CLI_ARGUMENT_INVALID")


def main(argv=None):
    parser = _Parser(description=__doc__)
    parser.add_argument("--local-output", type=Path, required=True)
    parser.add_argument("--public-output", type=Path, required=True)
    try:
        args = parser.parse_args(argv)
        _output_paths(args.local_output, args.public_output)
        local, public = extract_cache()
        write_outputs(local, public, args.local_output, args.public_output)
        print(json.dumps({"status": public["status"], "reason": public["reason"],
                          "receipt_sha256": sha(canonical(public))}, sort_keys=True))
        return 2
    except Exception as error:
        code = str(error) if isinstance(error, FeatureReaderError) and str(error) in ERRORS else "INTERNAL_FAILURE"
        print(json.dumps({"status": "BLOCKED", "reason": code}, sort_keys=True))
        return 2


if __name__ == "__main__":
    sys.exit(main())
