"""Synthetic-only target-opaque byte CSV prototype; no filesystem or network API.

This is not a production MPEA schema or identity recognizer. Metadata indices,
missing spellings and synthetic identity prefixes are explicit frozen inputs.
All target cells are inspected only for byte framing and engineering bounds.
"""
from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
import hashlib
import json
import re

MAX_SOURCE_BYTES = 332126
MAX_ROWS = 4096
MAX_COLUMNS = 128
MAX_FIELD_BYTES = 16384
MAX_RECORD_BYTES = 65536
MAX_TEMPERATURE_CHARS = 64
MAX_TEMPERATURE_BITS = 256
REAL_SOURCE_SHA256 = "c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d"
ROLES = ("source", "formula", "test_mode", "processing", "temperature")
IDENTITIES = ("source", "formula")
MODE = {b"T": "T", b"C": "C"}
PROCESSING = {value.encode("ascii"): value for value in ("CAST", "POWDER", "WROUGHT", "ANNEAL", "OTHER")}
DECIMAL = re.compile(rb"[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)\Z")
SCOPE = {"synthetic_fixture_only": True, "production_schema_authorized": False,
         "target_cells_text_decoded": False, "target_presence_checked": False,
         "target_numeric_validity_checked": False, "identity_semantics_validated": False,
         "scientific_eligibility_decisions": False, "fits": 0, "splits": 0}
ERRORS = frozenset({"SOURCE_TYPE", "SOURCE_LIMIT", "SOURCE_IDENTITY", "REAL_SOURCE_FORBIDDEN",
                    "INVALID_MAPPING", "HEADER_MISSING", "HEADER_MISMATCH", "FRAMING_INVALID",
                    "WIDTH_MISMATCH", "FIELD_LIMIT", "RECORD_LIMIT", "ROW_LIMIT"})


class MetadataError(ValueError):
    pass


def _hex(value, length):
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{%d}" % length, value) is not None


def _byte_tuple(values, *, max_count, max_length, allow_empty):
    if (not isinstance(values, tuple) or len(values) > max_count
            or any(not isinstance(value, bytes) or len(value) > max_length
                   or (not allow_empty and not value) for value in values)):
        raise MetadataError("INVALID_MAPPING")
    if len(set(values)) != len(values):
        raise MetadataError("INVALID_MAPPING")


@dataclass(frozen=True)
class SourceIdentity:
    size: int
    md5: str
    sha256: str

    def __post_init__(self):
        if (type(self.size) is not int or not 0 <= self.size <= MAX_SOURCE_BYTES
                or not _hex(self.md5, 32) or not _hex(self.sha256, 64)):
            raise MetadataError("SOURCE_IDENTITY")


@dataclass(frozen=True)
class ColumnRule:
    role: str
    index: int
    missing_tokens: tuple[bytes, ...]
    identity_prefixes: tuple[bytes, ...] = ()

    def __post_init__(self):
        if self.role not in ROLES or type(self.index) is not int or not 0 <= self.index < MAX_COLUMNS:
            raise MetadataError("INVALID_MAPPING")
        _byte_tuple(self.missing_tokens, max_count=16, max_length=64, allow_empty=True)
        _byte_tuple(self.identity_prefixes, max_count=8, max_length=32, allow_empty=False)
        if self.role in IDENTITIES:
            if (not self.identity_prefixes
                    or any(any(not 33 <= byte <= 126 for byte in token) for token in self.identity_prefixes)):
                raise MetadataError("INVALID_MAPPING")
        elif self.identity_prefixes:
            raise MetadataError("INVALID_MAPPING")


@dataclass(frozen=True)
class MetadataMapping:
    header_tokens: tuple[bytes, ...]
    columns: tuple[ColumnRule, ...]

    def __post_init__(self):
        _byte_tuple(self.header_tokens, max_count=MAX_COLUMNS, max_length=1024, allow_empty=False)
        if (not self.header_tokens or not isinstance(self.columns, tuple)
                or len(self.columns) > len(ROLES) or any(not isinstance(rule, ColumnRule) for rule in self.columns)
                or len({rule.index for rule in self.columns}) != len(self.columns)
                or len({rule.role for rule in self.columns}) != len(self.columns)
                or any(rule.index >= len(self.header_tokens) for rule in self.columns)):
            raise MetadataError("INVALID_MAPPING")


def mapping_digest(mapping):
    value = {"profile": "synthetic.target_opaque_csv.v1",
             "header_tokens_hex": [token.hex() for token in mapping.header_tokens],
             "columns": [{"role": rule.role, "index": rule.index,
                          "missing_tokens_hex": [token.hex() for token in rule.missing_tokens],
                          "identity_prefixes_hex": [token.hex() for token in rule.identity_prefixes]}
                         for rule in sorted(mapping.columns, key=lambda rule: rule.index)],
             "temperature_unit": "degC", "caps": [MAX_SOURCE_BYTES, MAX_ROWS, MAX_COLUMNS,
                                                     MAX_FIELD_BYTES, MAX_RECORD_BYTES,
                                                     MAX_TEMPERATURE_CHARS, MAX_TEMPERATURE_BITS]}
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode("ascii")).hexdigest()


def _frame(raw, mapping):
    """Retain only header and explicitly mapped cell bytes, never target cells."""
    width = len(mapping.header_tokens)
    selected = {rule.index for rule in mapping.columns}
    records = []
    header_seen = False
    fields = []
    cell = bytearray()
    state = "start"
    i = 3 if raw.startswith(b"\xef\xbb\xbf") else 0
    record_start = i
    field_start = i

    def append(byte):
        if not header_seen or len(fields) in selected:
            cell.append(byte)

    def finish_field():
        nonlocal cell
        if len(fields) >= width:
            raise MetadataError("WIDTH_MISMATCH")
        fields.append(bytes(cell) if not header_seen or len(fields) in selected else None)
        cell = bytearray()

    def finish_record():
        nonlocal header_seen, fields
        if len(fields) != width:
            raise MetadataError("WIDTH_MISMATCH")
        if not header_seen:
            if tuple(fields) != mapping.header_tokens:
                raise MetadataError("HEADER_MISMATCH")
            header_seen = True
        else:
            if len(records) >= MAX_ROWS:
                raise MetadataError("ROW_LIMIT")
            records.append(tuple(fields))
        fields = []

    while i < len(raw):
        byte = raw[i]
        outside_end = state != "quoted" and byte in (10, 13)
        outside_separator = state != "quoted" and byte == 44
        if i - record_start > MAX_RECORD_BYTES or i - field_start > MAX_FIELD_BYTES:
            raise MetadataError("RECORD_LIMIT" if i - record_start > MAX_RECORD_BYTES else "FIELD_LIMIT")
        if outside_end:
            if byte == 13 and (i + 1 >= len(raw) or raw[i + 1] != 10):
                raise MetadataError("FRAMING_INVALID")
            finish_field()
            finish_record()
            i += 2 if byte == 13 else 1
            state = "start"
            record_start = field_start = i
            continue
        if outside_separator:
            if i - record_start >= MAX_RECORD_BYTES:
                raise MetadataError("RECORD_LIMIT")
            finish_field()
            i += 1
            field_start = i
            state = "start"
            continue
        if i - record_start >= MAX_RECORD_BYTES or i - field_start >= MAX_FIELD_BYTES:
            raise MetadataError("RECORD_LIMIT" if i - record_start >= MAX_RECORD_BYTES else "FIELD_LIMIT")
        if state == "quoted":
            if byte == 34:
                state = "after_quote"
            else:
                append(byte)
        elif state == "after_quote":
            if byte != 34:
                raise MetadataError("FRAMING_INVALID")
            append(34)
            state = "quoted"
        elif byte == 34:
            if state != "start":
                raise MetadataError("FRAMING_INVALID")
            state = "quoted"
        else:
            append(byte)
            state = "unquoted"
        i += 1
    if state == "quoted":
        raise MetadataError("FRAMING_INVALID")
    if i > record_start or fields:
        finish_field()
        finish_record()
    if not header_seen:
        raise MetadataError("HEADER_MISSING")
    return records


def _state(status, value=None):
    return {"status": status, "value": value}


def _identity_groups(records, rule):
    if rule is None:
        return [_state("UNMAPPED") for _ in records]
    groups = {}
    output = []
    for record in records:
        token = record[rule.index]
        if token in rule.missing_tokens:
            output.append(_state("MISSING"))
        elif (not token or any(not 33 <= byte <= 126 for byte in token)
              or not any(token.startswith(prefix) and len(token) > len(prefix) for prefix in rule.identity_prefixes)):
            output.append(_state("UNRESOLVED"))
        else:
            if token not in groups:
                groups[token] = len(groups)
            output.append(_state("TOKEN_GROUP", groups[token]))
    return output


def _temperature(token):
    if len(token) > MAX_TEMPERATURE_CHARS:
        return _state("UNRESOLVED_LIMIT")
    if DECIMAL.fullmatch(token) is None:
        return _state("UNRESOLVED")
    significand = token
    negative = significand.startswith(b"-")
    unsigned = significand.lstrip(b"+-")
    integer, dot, fraction = unsigned.partition(b".")
    coefficient = int((integer or b"0") + fraction)
    scale = len(fraction)
    numerator = (-coefficient if negative else coefficient) * (10 ** max(0, -scale))
    denominator = 10 ** max(0, scale)
    exact = Fraction(numerator, denominator)
    if max(abs(exact.numerator).bit_length(), exact.denominator.bit_length()) > MAX_TEMPERATURE_BITS:
        return _state("UNRESOLVED_LIMIT")
    return _state("KNOWN", {"decimal": token.decode("ascii"), "numerator": str(exact.numerator),
                            "denominator": str(exact.denominator), "unit": "degC"})


def _metadata_value(record, rule):
    if rule is None:
        return _state("UNMAPPED")
    token = record[rule.index]
    if token in rule.missing_tokens:
        return _state("MISSING")
    if rule.role == "temperature":
        return _temperature(token)
    values = MODE if rule.role == "test_mode" else PROCESSING
    return _state("KNOWN", values[token]) if token in values else _state("UNRESOLVED")


def extract_metadata(raw, *, source, mapping):
    """Return all synthetic metadata or a closed failure with no successful prefix."""
    base = {"schema": "lupine.discovery.synthetic_row_metadata.v1", "status": "BLOCKED", "reason": None,
            "source_sha256": None, "mapping_sha256": None, "scope": dict(SCOPE), "rows": None, "row_count": None}
    try:
        if not isinstance(raw, bytes):
            raise MetadataError("SOURCE_TYPE")
        if len(raw) > MAX_SOURCE_BYTES:
            raise MetadataError("SOURCE_LIMIT")
        if not isinstance(source, SourceIdentity):
            raise MetadataError("SOURCE_IDENTITY")
        if not isinstance(mapping, MetadataMapping):
            raise MetadataError("INVALID_MAPPING")
        observed_sha256 = hashlib.sha256(raw).hexdigest()
        base["source_sha256"] = observed_sha256
        base["mapping_sha256"] = mapping_digest(mapping)
        if source.sha256 == REAL_SOURCE_SHA256 or observed_sha256 == REAL_SOURCE_SHA256:
            raise MetadataError("REAL_SOURCE_FORBIDDEN")
        if (len(raw) != source.size or observed_sha256 != source.sha256
                or hashlib.md5(raw).hexdigest() != source.md5):
            raise MetadataError("SOURCE_IDENTITY")
        records = _frame(raw, mapping)
        rules = {rule.role: rule for rule in mapping.columns}
        source_groups = _identity_groups(records, rules.get("source"))
        formula_groups = _identity_groups(records, rules.get("formula"))
        rows = [{"ordinal": i, "source": source_groups[i], "formula": formula_groups[i],
                 "test_mode": _metadata_value(record, rules.get("test_mode")),
                 "processing": _metadata_value(record, rules.get("processing")),
                 "temperature": _metadata_value(record, rules.get("temperature"))}
                for i, record in enumerate(records)]
        base.update(status="SYNTHETIC_METADATA_ONLY", reason="PRODUCTION_SCHEMA_NOT_AUTHORIZED",
                    rows=rows, row_count=len(rows))
    except MetadataError as error:
        base["reason"] = str(error) if str(error) in ERRORS else "INVALID_MAPPING"
    return base
