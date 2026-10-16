"""Synthetic source/target custody foundation; no files, network or entropy.

Constructed fixture bytes are required. The known experimental archive identity
is explicitly rejected. Framing follows the frozen metadata scanner's byte state
machine, with authorization decided before a data-cell byte is accumulated.
This module neither fits a model nor authorizes a production scientific run.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from fractions import Fraction
from hashlib import md5, sha256
import json
import re

REAL_SOURCE_SHA256 = "c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d"
MAX_SOURCE_BYTES = 332126
MAX_ROWS = 4096
MAX_COLUMNS = 128
MAX_FIELD_BYTES = 16384
MAX_RECORD_BYTES = 65536
TARGET_COLUMNS = (11, 13)
TARGET_NAMES = ("yield_strength", "elongation")
ROLES = frozenset({"DEVELOPMENT", "CALIBRATION", "EVALUATION",
                   "OUT_OF_SCOPE_TARGET_UNOPENED", "UNRESOLVED_SOURCE"})
REASONS = {
    "VALID": frozenset({"FINITE_NONNEGATIVE_RECORDED_POINT"}),
    "MISSING": frozenset({"EMPTY_TOKEN"}),
    "UNSUPPORTED_LEXICAL": frozenset({"NON_ASCII_TOKEN", "NOT_POINT_DECIMAL"}),
    "UNSUPPORTED_NONFINITE": frozenset({"NONFINITE_TOKEN"}),
    "UNRESOLVED_LIMIT": frozenset({"TOKEN_BYTES_LIMIT", "DECIMAL_DIGIT_LIMIT",
                                    "EXPONENT_LIMIT", "TARGET_BITS_LIMIT"}),
    "SEMANTIC_CONFLICT": frozenset({"NEGATIVE_YS", "NEGATIVE_ELONGATION"}),
}
ERROR_CODES = frozenset({"SCHEMA_INVALID", "SOURCE_IDENTITY_MISMATCH",
    "SYNTHETIC_FIXTURE_REQUIRED", "METADATA_LINKAGE_CONFLICT",
    "METADATA_COUNT_MISMATCH", "CSV_FRAMING_INVALID", "CSV_COUNT_MISMATCH",
    "UNAUTHORIZED_TARGET_ACCESS", "STAGE_ORDER_VIOLATION", "INTERNAL_FAILURE"})
_HEX = re.compile(r"[0-9a-f]{64}\Z")
_MD5 = re.compile(r"[0-9a-f]{32}\Z")
_DECIMAL = re.compile(rb"([+-]?)([0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE]([+-]?)([0-9]+))?\Z")
_NONFINITE = re.compile(rb"[+-]?(?:nan|inf|infinity)\Z", re.IGNORECASE)


class CustodyError(ValueError):
    def __init__(self, code):
        self.code = code if type(code) is str and code in ERROR_CODES else "INTERNAL_FAILURE"
        super().__init__(self.code)


def _fail(code):
    raise CustodyError(code) from None


def _digest(value):
    return sha256(json.dumps(value, ensure_ascii=True, sort_keys=True,
                             separators=(",", ":"), allow_nan=False).encode("ascii")).hexdigest()


def _positive_int(value, *, zero=False):
    return type(value) is int and (value >= 0 if zero else value > 0)


@dataclass(frozen=True)
class FixtureSource:
    byte_count: int
    md5: str
    sha256: str

    def __post_init__(self):
        if (not _positive_int(self.byte_count) or self.byte_count > MAX_SOURCE_BYTES
                or type(self.md5) is not str or _MD5.fullmatch(self.md5) is None
                or type(self.sha256) is not str or _HEX.fullmatch(self.sha256) is None):
            _fail("SCHEMA_INVALID")
        if self.sha256 == REAL_SOURCE_SHA256:
            _fail("SYNTHETIC_FIXTURE_REQUIRED")

    @classmethod
    def from_bytes(cls, raw):
        if type(raw) is not bytes or not 0 < len(raw) <= MAX_SOURCE_BYTES:
            _fail("SCHEMA_INVALID")
        return cls(len(raw), md5(raw).hexdigest(), sha256(raw).hexdigest())

    def verify(self, raw):
        if (type(raw) is not bytes or len(raw) != self.byte_count
                or sha256(raw).hexdigest() != self.sha256 or md5(raw).hexdigest() != self.md5):
            _fail("SOURCE_IDENTITY_MISMATCH")
        return raw  # immutable original bytes; do not reopen a source path


@dataclass(frozen=True)
class Target:
    status: str
    reason: str
    value: Fraction | None = None

    def __post_init__(self):
        if (type(self.status) is not str or self.status not in REASONS
                or type(self.reason) is not str or self.reason not in REASONS[self.status]):
            _fail("SCHEMA_INVALID")
        if self.status == "VALID":
            if (type(self.value) is not Fraction or self.value < 0
                    or max(self.value.numerator.bit_length(), self.value.denominator.bit_length()) > 512):
                _fail("SCHEMA_INVALID")
        elif self.value is not None:
            _fail("SCHEMA_INVALID")

    def canonical(self):
        return {"status": self.status, "reason": self.reason,
                "value": None if self.value is None else
                f"{self.value.numerator}/{self.value.denominator}"}


def _power10(exponent):
    """Narrow test seam: exponent must already have passed lexical preflight."""
    if type(exponent) is not int or not 0 <= exponent <= 384:
        _fail("INTERNAL_FAILURE")
    return 10 ** exponent


def parse_target(raw, target_name):
    """Interpret one authorized, quote-unescaped fixture target without repair."""
    if (type(raw) is not bytes or type(target_name) is not str
            or target_name not in TARGET_NAMES):
        _fail("SCHEMA_INVALID")
    if len(raw) > MAX_FIELD_BYTES:
        _fail("CSV_FRAMING_INVALID")
    start, end = 0, len(raw)
    while start < end and raw[start] in (9, 32):
        start += 1
    while end > start and raw[end-1] in (9, 32):
        end -= 1
    if start == end:
        return Target("MISSING", "EMPTY_TOKEN")
    if end-start > 128:
        return Target("UNRESOLVED_LIMIT", "TOKEN_BYTES_LIMIT")
    token = raw[start:end]
    if any(byte > 127 for byte in token):
        return Target("UNSUPPORTED_LEXICAL", "NON_ASCII_TOKEN")
    if _NONFINITE.fullmatch(token):
        return Target("UNSUPPORTED_NONFINITE", "NONFINITE_TOKEN")
    match = _DECIMAL.fullmatch(token)
    if match is None:
        return Target("UNSUPPORTED_LEXICAL", "NOT_POINT_DECIMAL")
    sign, mantissa, exp_sign, exp_digits = match.groups()
    digits = mantissa.replace(b".", b"")
    places = len(mantissa)-mantissa.index(b".")-1 if b"." in mantissa else 0
    if len(digits) > 128:
        return Target("UNRESOLVED_LIMIT", "DECIMAL_DIGIT_LIMIT")
    if exp_digits is not None and len(exp_digits) > 3:
        return Target("UNRESOLVED_LIMIT", "EXPONENT_LIMIT")
    exponent = 0
    for digit in exp_digits or b"":
        exponent = exponent*10 + digit-48
    if exponent > 256:
        return Target("UNRESOLVED_LIMIT", "EXPONENT_LIMIT")
    if exp_sign == b"-":
        exponent = -exponent
    power = exponent-places
    if abs(power) > 384:
        return Target("UNRESOLVED_LIMIT", "EXPONENT_LIMIT")
    integer = int(digits)  # only after byte/digit/exponent guards
    if integer == 0:
        return Target("VALID", "FINITE_NONNEGATIVE_RECORDED_POINT", Fraction(0))
    scale = _power10(abs(power))
    numerator, denominator = (integer*scale, 1) if power >= 0 else (integer, scale)
    if max(numerator.bit_length(), denominator.bit_length()) > 2048:
        return Target("UNRESOLVED_LIMIT", "TARGET_BITS_LIMIT")
    value = Fraction(numerator, denominator)
    if max(value.numerator.bit_length(), value.denominator.bit_length()) > 512:
        return Target("UNRESOLVED_LIMIT", "TARGET_BITS_LIMIT")
    if sign == b"-":
        return Target("SEMANTIC_CONFLICT", "NEGATIVE_YS" if target_name == "yield_strength"
                      else "NEGATIVE_ELONGATION")
    return Target("VALID", "FINITE_NONNEGATIVE_RECORDED_POINT", value)


@dataclass(frozen=True)
class RowRoute:
    ordinal: int
    record_id: str
    source_group: int | None
    role: str
    condition_eligible: bool

    def __post_init__(self):
        if (not _positive_int(self.ordinal, zero=True) or self.ordinal >= MAX_ROWS
                or type(self.record_id) is not str or len(self.record_id) > 70 or type(self.role) is not str
                or self.role not in ROLES or type(self.condition_eligible) is not bool
                or (self.source_group is not None and
                    (not _positive_int(self.source_group, zero=True) or self.source_group >= MAX_ROWS))):
            _fail("METADATA_LINKAGE_CONFLICT")
        if ((self.source_group is None) != (self.role == "UNRESOLVED_SOURCE")
                or (self.condition_eligible and self.role not in
                    {"DEVELOPMENT", "CALIBRATION", "EVALUATION"})):
            _fail("METADATA_LINKAGE_CONFLICT")

    def canonical(self):
        return {"ordinal": self.ordinal, "record_id": self.record_id,
                "source_group": self.source_group, "role": self.role,
                "condition_eligible": self.condition_eligible}


@dataclass(frozen=True)
class FixtureRoutes:
    source: FixtureSource
    header: tuple[bytes, ...]
    rows: tuple[RowRoute, ...]
    digest: str = field(init=False)

    def __post_init__(self):
        if (type(self.source) is not FixtureSource or type(self.header) is not tuple
                or len(self.header) != 23
                or any(type(x) is not bytes or not x or len(x) > 1024 for x in self.header)
                or len(set(self.header)) != 23
                or type(self.rows) is not tuple or not 0 < len(self.rows) <= MAX_ROWS
                or any(type(row) is not RowRoute for row in self.rows)):
            _fail("SCHEMA_INVALID")
        groups = {}
        for ordinal, row in enumerate(self.rows):
            if row.ordinal != ordinal or row.record_id != f"{self.source.sha256}:{ordinal}":
                _fail("METADATA_LINKAGE_CONFLICT")
            if row.source_group is not None:
                previous = groups.setdefault(row.source_group, row.role)
                if previous != row.role:
                    _fail("METADATA_LINKAGE_CONFLICT")
        identity = {"schema": "mpea.fixture_routes.v1",
                    "source": {"bytes": self.source.byte_count, "md5": self.source.md5,
                               "sha256": self.source.sha256},
                    "header_hex": [x.hex() for x in self.header],
                    "rows": [x.canonical() for x in self.rows],
                    "columns": list(TARGET_COLUMNS)}
        object.__setattr__(self, "digest", _digest(identity))


@dataclass(frozen=True)
class TargetRow:
    route: RowRoute
    yield_strength: Target
    elongation: Target

    def __post_init__(self):
        if (type(self.route) is not RowRoute or not self.route.condition_eligible
                or type(self.yield_strength) is not Target or type(self.elongation) is not Target):
            _fail("SCHEMA_INVALID")
        if (self.yield_strength.reason == "NEGATIVE_ELONGATION"
                or self.elongation.reason == "NEGATIVE_YS"):
            _fail("SCHEMA_INVALID")

    @property
    def complete(self):
        return self.yield_strength.status == self.elongation.status == "VALID"

    def canonical(self):
        return {"route": self.route.canonical(),
                "yield_strength": self.yield_strength.canonical(),
                "elongation": self.elongation.canonical(),
                "uncertainty_status": "NOT_INTERPRETED",
                "pairing_status": "CO_RECORDED_NOT_SPECIMEN_VERIFIED"}


def _authorized_cells(raw, routes, allowed_roles):
    """Frame all bytes, accumulating only header or role-and-column-authorized cells."""
    rows = routes.rows
    selected_records = []
    fields = []
    cell = bytearray()
    state = "start"
    header_seen = False
    ordinal = 0
    i = 3 if raw.startswith(b"\xef\xbb\xbf") else 0
    record_start = field_start = i

    def authorized():
        return (not header_seen or (ordinal < len(rows) and rows[ordinal].condition_eligible
            and rows[ordinal].role in allowed_roles and len(fields) in TARGET_COLUMNS))

    def append(byte):
        if authorized():
            cell.append(byte)

    def finish_field():
        nonlocal cell
        if len(fields) >= len(routes.header):
            _fail("CSV_COUNT_MISMATCH")
        fields.append(bytes(cell) if authorized() else None)
        cell = bytearray()

    def finish_record():
        nonlocal header_seen, fields, ordinal
        if len(fields) != len(routes.header):
            _fail("CSV_COUNT_MISMATCH")
        if not header_seen:
            if tuple(fields) != routes.header:
                _fail("CSV_FRAMING_INVALID")
            header_seen = True
        else:
            if ordinal >= len(rows) or ordinal >= MAX_ROWS:
                _fail("CSV_COUNT_MISMATCH")
            if rows[ordinal].condition_eligible and rows[ordinal].role in allowed_roles:
                selected_records.append((rows[ordinal], fields[11], fields[13]))
            ordinal += 1
        fields = []

    while i < len(raw):
        byte = raw[i]
        outside_end = state != "quoted" and byte in (10, 13)
        outside_separator = state != "quoted" and byte == 44
        if i-record_start > MAX_RECORD_BYTES or i-field_start > MAX_FIELD_BYTES:
            _fail("CSV_FRAMING_INVALID")
        if outside_end:
            if byte == 13 and (i+1 >= len(raw) or raw[i+1] != 10):
                _fail("CSV_FRAMING_INVALID")
            finish_field()
            finish_record()
            i += 2 if byte == 13 else 1
            state = "start"
            record_start = field_start = i
            continue
        if outside_separator:
            if i-record_start >= MAX_RECORD_BYTES:
                _fail("CSV_FRAMING_INVALID")
            finish_field()
            i += 1
            field_start = i
            state = "start"
            continue
        if i-record_start >= MAX_RECORD_BYTES or i-field_start >= MAX_FIELD_BYTES:
            _fail("CSV_FRAMING_INVALID")
        if state == "quoted":
            if byte == 34:
                state = "after_quote"
            else:
                append(byte)
        elif state == "after_quote":
            if byte != 34:
                _fail("CSV_FRAMING_INVALID")
            append(34)
            state = "quoted"
        elif byte == 34:
            if state != "start":
                _fail("CSV_FRAMING_INVALID")
            state = "quoted"
        else:
            append(byte)
            state = "unquoted"
        i += 1
    if state == "quoted":
        _fail("CSV_FRAMING_INVALID")
    if i > record_start or fields:
        finish_field()
        finish_record()
    if not header_seen or ordinal != len(rows):
        _fail("CSV_COUNT_MISMATCH")
    return tuple(selected_records)


def parse_fixture_targets(raw, routes, allowed_roles):
    """Pure fixture sink; caller must separately enforce persistent stage capability."""
    if (type(routes) is not FixtureRoutes or type(allowed_roles) is not frozenset
            or allowed_roles not in (frozenset({"DEVELOPMENT"}),
                                    frozenset({"CALIBRATION", "EVALUATION"}))):
        _fail("UNAUTHORIZED_TARGET_ACCESS")
    captured = routes.source.verify(raw)
    cells = _authorized_cells(captured, routes, allowed_roles)
    # No target interpretation occurs before complete framing/count verification.
    return tuple(TargetRow(route, parse_target(ys, "yield_strength"),
                           parse_target(el, "elongation")) for route, ys, el in cells)


def summarize_targets(rows):
    if type(rows) is not tuple or any(type(row) is not TargetRow for row in rows):
        _fail("SCHEMA_INVALID")
    if len({row.route.record_id for row in rows}) != len(rows):
        _fail("METADATA_LINKAGE_CONFLICT")
    counts = {name: {state: 0 for state in REASONS} for name in TARGET_NAMES}
    reasons = {name: {reason: 0 for choices in REASONS.values() for reason in sorted(choices)}
               for name in TARGET_NAMES}
    for row in rows:
        for name in TARGET_NAMES:
            target = getattr(row, name)
            counts[name][target.status] += 1
            reasons[name][target.reason] += 1
    return {"schema": "mpea.fixture_target_summary.v1", "row_count": len(rows),
            "complete_row_count": sum(row.complete for row in rows),
            "complete_source_group_count": len({row.route.source_group for row in rows if row.complete}),
            "target_status_counts": counts, "target_reason_counts": reasons,
            "scope": {"synthetic_fixture_only": True, "production_authorized": False,
                      "fits": 0, "physical_truth_established": False}}
