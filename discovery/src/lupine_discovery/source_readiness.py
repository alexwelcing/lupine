"""Bounded documentary snapshot; no source access or scientific admission."""
from hashlib import sha256
from importlib.resources import files
import json


SCHEMA = "lupine.source-readiness.v1"
UNAVAILABLE_SCHEMA = "lupine.source-readiness.unavailable.v1"
SNAPSHOT_COMMIT = "88d512cbf40a7a7d11fb45aa24cd5462f8a7e81d"
RESOURCE_PATH = "resources/source-readiness-v1.json"
SNAPSHOT_SHA256 = "74e8ca924e2eb4524aea2e54362bf78e88208fa8699cdb38a3ad795c91bf2c24"
MAX_DOCUMENT_BYTES = 32 * 1024
MAX_DEPTH = 8
MAX_TEXT_LENGTH = 1024
MAX_ARRAY_LENGTH = 16
SOURCE_IDS = ("li-tensile-v3", "dryad-dielectric")
_SOURCE_KEYS = frozenset({"id", "title", "data_kind", "status", "scientific_admission",
    "completed_actions", "unexecuted_actions", "blockers", "exposure",
    "license_declaration", "evidence_urls"})
_ARRAY_KEYS = frozenset({"completed_actions", "unexecuted_actions", "blockers",
                         "exposure", "evidence_urls"})
_PREFIX = "https://github.com/alexwelcing/lupine/blob/" + SNAPSHOT_COMMIT + "/discovery/"


class SourceReadinessError(ValueError):
    """Closed failure code; no source contents or local paths in the message."""

    def __init__(self, code):
        if code not in {"SOURCE_READINESS_RESOURCE_MISSING",
                        "SOURCE_READINESS_RESOURCE_UNREADABLE",
                        "SOURCE_READINESS_RESOURCE_INVALID"}:
            raise ValueError("unknown source-readiness failure code")
        self.code = code
        super().__init__(code)


def _invalid():
    raise SourceReadinessError("SOURCE_READINESS_RESOURCE_INVALID")


def _text(value):
    if (type(value) is not str or not 1 <= len(value) <= MAX_TEXT_LENGTH
            or value != value.strip() or any(not 32 <= ord(c) <= 126 for c in value)):
        _invalid()


def validate_source_readiness(value):
    """Return a detached exact snapshot; reject altered, stale or extra claims.

    The digest binds reviewed documentary content, not scientific truth. A new
    snapshot needs a reviewed pin change; there is no automatic data refresh.
    """
    if type(value) is not dict or set(value) != {"schema", "snapshot_commit", "sources"}:
        _invalid()
    _text(value["schema"])
    _text(value["snapshot_commit"])
    if value["schema"] != SCHEMA or value["snapshot_commit"] != SNAPSHOT_COMMIT:
        _invalid()
    sources = value["sources"]
    if type(sources) is not list or len(sources) != len(SOURCE_IDS):
        _invalid()
    for index, source in enumerate(sources):
        if type(source) is not dict or set(source) != _SOURCE_KEYS:
            _invalid()
        for key in sorted(_SOURCE_KEYS):
            field = source[key]
            if key in _ARRAY_KEYS:
                if type(field) is not list or not 1 <= len(field) <= MAX_ARRAY_LENGTH:
                    _invalid()
                for item in field:
                    _text(item)
            else:
                _text(field)
        if (source["id"] != SOURCE_IDS[index]
                or source["status"] != ("BLOCKED_SCHEMA", "BLOCKED_ACCESS")[index]
                or source["scientific_admission"] != "NOT_ADMITTED"):
            _invalid()
        if any(not url.startswith(_PREFIX) for url in source["evidence_urls"]):
            _invalid()
    canonical = json.dumps(value, sort_keys=True, separators=(",", ":"),
                           ensure_ascii=True, allow_nan=False).encode("ascii")
    if len(canonical) > MAX_DOCUMENT_BYTES or sha256(canonical).hexdigest() != SNAPSHOT_SHA256:
        _invalid()
    return json.loads(canonical)


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            _invalid()
        result[key] = value
    return result


def _non_string_scalar(_token):
    _invalid()


def loads_source_readiness(raw):
    """Strict UTF-8 JSON, bounded before decoding; all payload scalars are text."""
    if type(raw) is not bytes or len(raw) > MAX_DOCUMENT_BYTES:
        _invalid()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        _invalid()
    # A quote-aware depth prepass bounds JSON recursion without interpreting
    # escapes or treating delimiters within string values as container syntax.
    depth, quoted, escaped = 0, False, False
    for character in text:
        if quoted:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                quoted = False
        elif character == '"':
            quoted = True
        elif character in "[{":
            depth += 1
            if depth > MAX_DEPTH:
                _invalid()
        elif character in "]}":
            depth -= 1
            if depth < 0:
                _invalid()
    try:
        value = json.loads(text, object_pairs_hook=_pairs,
            parse_int=_non_string_scalar, parse_float=_non_string_scalar,
            parse_constant=_non_string_scalar)
    except (json.JSONDecodeError, RecursionError):
        _invalid()
    return validate_source_readiness(value)


def load_source_readiness():
    """Read only the fixed package resource, bounded to one document."""
    try:
        with files("lupine_discovery").joinpath(RESOURCE_PATH).open("rb") as handle:
            raw = handle.read(MAX_DOCUMENT_BYTES + 1)
    except FileNotFoundError as exc:
        raise SourceReadinessError("SOURCE_READINESS_RESOURCE_MISSING") from exc
    except OSError as exc:
        raise SourceReadinessError("SOURCE_READINESS_RESOURCE_UNREADABLE") from exc
    return loads_source_readiness(raw)


def source_readiness_report():
    """CLI/HTTP shape: validated snapshot or explicit non-success availability."""
    try:
        return load_source_readiness()
    except SourceReadinessError as exc:
        return {"schema": UNAVAILABLE_SCHEMA,
                "status": "INVALID" if exc.code == "SOURCE_READINESS_RESOURCE_INVALID" else "UNAVAILABLE",
                "reason": exc.code, "scientific_admission": "NOT_ADMITTED"}
