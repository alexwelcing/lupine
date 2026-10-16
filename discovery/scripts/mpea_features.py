"""Synthetic-only formula feature adapter; no file reader or production entry.

Per-row vectors are local representations of declared coefficients. Only
aggregate_readiness is designed for initial public reporting. No input target,
formula repair, fit, predictor or physical validity claim is supported.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
import hashlib
import json
import re

from lupine_discovery.representation import (MAX_BITS, NormalizedVector,
                                           RepresentationError, normalize_coefficients)

AXES = tuple((
    "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn "
    "Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce "
    "Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn "
    "Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og"
).split())
PROCESSING_AXES = ("CAST", "POWDER", "WROUGHT", "ANNEAL", "OTHER", "UNRESOLVED")
MAX_TERMS, MAX_DIGITS, MAX_PLACES, MAX_FIELD_BYTES, MAX_ROWS = 256, 128, 64, 16384, 4096
DESCRIPTOR_VERSION = "mpea.declared_coefficients.synthetic.v1"
REAL_SOURCE_SHA256 = "c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d"
MARKERS = frozenset((b"", b"NaN", b"nan", b"NAN", b"NA", b"N/A", b"NR", b"None", b"null", b"-"))
WHITESPACE = frozenset(b" \t\r\n\v\f")
TERM = re.compile(rb"([A-Z][a-z]?)([0-9]+(?:\.[0-9]+)?)\Z")
PROFILE = (MAX_TERMS, MAX_DIGITS, MAX_PLACES, MAX_BITS, MAX_FIELD_BYTES, MAX_ROWS)


class FeatureError(ValueError):
    pass


def _hex(value):
    return type(value) is str and re.fullmatch(r"[0-9a-f]{64}", value) is not None


@dataclass(frozen=True)
class FeatureResult:
    status: str
    reason: str
    vector: NormalizedVector | None

    def __post_init__(self):
        if type(self.status) is not str or type(self.reason) is not str:
            raise FeatureError("INVALID_FEATURE_RESULT")
        if self.status == "KNOWN":
            if self.reason != "DECLARED_COEFFICIENTS_NORMALIZED" or type(self.vector) is not NormalizedVector or self.vector.axes != AXES:
                raise FeatureError("INVALID_FEATURE_RESULT")
        elif self.status in {"UNRESOLVED", "UNRESOLVED_LIMIT"}:
            reasons = {"UNRESOLVED": {"MISSING_FORMULA", "UNSUPPORTED_GRAMMAR"},
                       "UNRESOLVED_LIMIT": {"FIELD_LIMIT", "TERM_LIMIT", "DIGIT_LIMIT", "SCALE_LIMIT", "ARITHMETIC_LIMIT"}}
            if self.vector is not None or self.reason not in reasons[self.status]:
                raise FeatureError("INVALID_FEATURE_RESULT")
        else:
            raise FeatureError("INVALID_FEATURE_RESULT")


@dataclass(frozen=True)
class ProcessingEncoding:
    status: str
    category: str | None
    indicator: tuple[int, ...]

    def __post_init__(self):
        if type(self.status) is not str or self.category is not None and type(self.category) is not str:
            raise FeatureError("INVALID_PROCESSING_STATE")
        if self.status == "KNOWN" and self.category in PROCESSING_AXES[:-1]:
            index = PROCESSING_AXES.index(self.category)
        elif self.status == "UNRESOLVED" and self.category is None:
            index = 5
        else:
            raise FeatureError("INVALID_PROCESSING_STATE")
        expected = tuple(int(i == index) for i in range(6))
        if not isinstance(self.indicator, (tuple, list)) or any(type(x) is not int for x in self.indicator) or tuple(self.indicator) != expected:
            raise FeatureError("INVALID_PROCESSING_STATE")
        object.__setattr__(self, "indicator", expected)


def encode_processing(status, category):
    if type(status) is not str or category is not None and type(category) is not str:
        raise FeatureError("INVALID_PROCESSING_STATE")
    if status == "KNOWN" and category in PROCESSING_AXES[:-1]:
        index = PROCESSING_AXES.index(category)
    elif status == "UNRESOLVED" and category is None:
        index = 5
    else:
        raise FeatureError("INVALID_PROCESSING_STATE")
    return ProcessingEncoding(status, category, tuple(int(i == index) for i in range(6)))


def _lexical_terms(token):
    if type(token) is not bytes:
        raise FeatureError("FORMULA_BYTES_REQUIRED")
    if len(token) > MAX_FIELD_BYTES:
        return None, "FIELD_LIMIT"
    if token in MARKERS or all(byte in WHITESPACE for byte in token):
        return None, "MISSING_FORMULA"
    terms = []
    for item in token.split(b" "):
        match = TERM.fullmatch(item)
        if match is None or match[1].decode("ascii") not in AXES or not any(49 <= c <= 57 for c in match[2]):
            return None, "UNSUPPORTED_GRAMMAR"
        terms.append((match[1].decode("ascii"), match[2]))
    return terms, None


def _compile_terms(terms):
    if len(terms) > MAX_TERMS:
        return FeatureResult("UNRESOLVED_LIMIT", "TERM_LIMIT", None)
    parsed = []
    for element, count in terms:
        integer, _, decimal = count.partition(b".")
        if len(integer) + len(decimal) > MAX_DIGITS:
            return FeatureResult("UNRESOLVED_LIMIT", "DIGIT_LIMIT", None)
        if len(decimal) > MAX_PLACES:
            return FeatureResult("UNRESOLVED_LIMIT", "SCALE_LIMIT", None)
        parsed.append((element, integer + decimal, len(decimal)))
    # Every term and scale cap has passed before the first int conversion.
    common_places = max(places for _, _, places in parsed)
    coefficients = {}
    for element, digits, places in parsed:
        value = int(digits) * 10 ** (common_places - places)
        if value.bit_length() > MAX_BITS:
            return FeatureResult("UNRESOLVED_LIMIT", "ARITHMETIC_LIMIT", None)
        coefficients[element] = coefficients.get(element, 0) + value
        if coefficients[element].bit_length() > MAX_BITS:
            return FeatureResult("UNRESOLVED_LIMIT", "ARITHMETIC_LIMIT", None)
    try:
        vector = normalize_coefficients(AXES, coefficients)
    except RepresentationError as error:
        if str(error) == "RESOURCE_LIMIT":
            return FeatureResult("UNRESOLVED_LIMIT", "ARITHMETIC_LIMIT", None)
        raise FeatureError("INTERNAL_ARITHMETIC_CONFLICT") from None
    return FeatureResult("KNOWN", "DECLARED_COEFFICIENTS_NORMALIZED", vector)


def parse_formula_coefficients(token):
    terms, error = _lexical_terms(token)
    if terms is None:
        return FeatureResult("UNRESOLVED_LIMIT" if error == "FIELD_LIMIT" else "UNRESOLVED", error, None)
    return _compile_terms(terms)


@dataclass(frozen=True)
class FixtureRow:
    ordinal: int
    record_id: str
    formula_status: str
    formula_group: int | None
    formula_token: bytes
    source_group: int | None
    processing_status: str
    processing_category: str | None

    def __post_init__(self):
        if type(self.ordinal) is not int or self.ordinal < 0 or type(self.record_id) is not str or type(self.formula_token) is not bytes:
            raise FeatureError("INVALID_FIXTURE_ROW")
        if self.formula_status == "TOKEN_GROUP":
            if type(self.formula_group) is not int or self.formula_group < 0:
                raise FeatureError("INVALID_FORMULA_GROUP")
        elif self.formula_status != "UNRESOLVED" or self.formula_group is not None:
            raise FeatureError("INVALID_FORMULA_GROUP")
        if self.source_group is not None and (type(self.source_group) is not int or self.source_group < 0):
            raise FeatureError("INVALID_SOURCE_GROUP")
        encode_processing(self.processing_status, self.processing_category)


@dataclass(frozen=True)
class FeatureRow:
    ordinal: int
    record_id: str
    formula_group: int | None
    source_group: int | None
    composition: FeatureResult
    processing: ProcessingEncoding

    def __post_init__(self):
        if (type(self.ordinal) is not int or self.ordinal < 0 or type(self.record_id) is not str
                or type(self.composition) is not FeatureResult or type(self.processing) is not ProcessingEncoding
                or (self.formula_group is not None and (type(self.formula_group) is not int or self.formula_group < 0))
                or (self.source_group is not None and (type(self.source_group) is not int or self.source_group < 0))
                or ((self.composition.status == "UNRESOLVED") != (self.formula_group is None))):
            raise FeatureError("INVALID_FEATURE_ROW")


@dataclass(frozen=True)
class FeatureTable:
    fixture_sha256: str
    rows: tuple[FeatureRow, ...]
    table_digest: str = field(init=False)
    descriptor_version: str = field(init=False, default=DESCRIPTOR_VERSION)

    def __post_init__(self):
        if not _hex(self.fixture_sha256) or self.fixture_sha256 == REAL_SOURCE_SHA256:
            raise FeatureError("SYNTHETIC_IDENTITY_REQUIRED")
        if not isinstance(self.rows, (tuple, list)) or len(self.rows) > MAX_ROWS:
            raise FeatureError("INVALID_FEATURE_TABLE")
        rows = tuple(self.rows)
        formula_groups = {}
        source_groups = set()
        for ordinal, row in enumerate(rows):
            if type(row) is not FeatureRow or row.ordinal != ordinal or row.record_id != self.fixture_sha256 + ":" + str(ordinal):
                raise FeatureError("ROW_IDENTITY_CONFLICT")
            if row.formula_group is not None:
                if row.formula_group > len(formula_groups):
                    raise FeatureError("FORMULA_GROUP_ORDER_CONFLICT")
                if row.formula_group in formula_groups and formula_groups[row.formula_group] != row.composition:
                    raise FeatureError("FORMULA_GROUP_FEATURE_CONFLICT")
                formula_groups[row.formula_group] = row.composition
            if row.source_group is not None:
                if row.source_group > len(source_groups):
                    raise FeatureError("SOURCE_GROUP_ORDER_CONFLICT")
                source_groups.add(row.source_group)
        record = _table_record(self.fixture_sha256, rows)
        sealed = hashlib.sha256(json.dumps(record, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("ascii")).hexdigest()
        object.__setattr__(self, "rows", rows)
        object.__setattr__(self, "table_digest", sealed)


def _table_record(fixture_sha256, rows):
    return {"mode": "synthetic_fixture", "fixture_sha256": fixture_sha256,
            "descriptor_version": DESCRIPTOR_VERSION, "axes": AXES,
            "processing_axes": PROCESSING_AXES, "resource_profile": PROFILE,
            "rows": [{"ordinal": row.ordinal, "record_id": row.record_id,
                      "formula_group": row.formula_group, "source_group": row.source_group,
                      "composition_status": row.composition.status, "composition_reason": row.composition.reason,
                      "composition": None if row.composition.vector is None else tuple(str(x) for x in row.composition.vector.values),
                      "processing_status": row.processing.status, "processing_category": row.processing.category,
                      "processing_indicator": row.processing.indicator} for row in rows]}


def build_fixture_features(rows, *, fixture_sha256):
    """Validate synthetic source-bound rows and preserve all rows, never targets.

This API has no source-file reader or real-data enable flag. Its identity is a
caller declaration for constructed fixtures, not a recomputed artifact hash.
"""
    if not _hex(fixture_sha256) or fixture_sha256 == REAL_SOURCE_SHA256:
        raise FeatureError("SYNTHETIC_IDENTITY_REQUIRED")
    if not isinstance(rows, (tuple, list)) or len(rows) > MAX_ROWS:
        raise FeatureError("INVALID_FIXTURE_ROWS")
    original = tuple(rows)
    for ordinal, row in enumerate(original):
        if type(row) is not FixtureRow or row.ordinal != ordinal or row.record_id != fixture_sha256 + ":" + str(ordinal):
            raise FeatureError("ROW_IDENTITY_CONFLICT")
    results = []
    token_groups = {}
    known_sources = set()
    for row in original:
        terms, error = _lexical_terms(row.formula_token)
        # This adapter receives only framed cells; field overflow contradicts its input contract.
        if error == "FIELD_LIMIT":
            raise FeatureError("FRAMED_FIELD_CONFLICT")
        if terms is None:
            if row.formula_status != "UNRESOLVED":
                raise FeatureError("FORMULA_RECOGNITION_CONFLICT")
            feature = FeatureResult("UNRESOLVED", error, None)
        else:
            if row.formula_token not in token_groups:
                token_groups[row.formula_token] = len(token_groups)
            if row.formula_status != "TOKEN_GROUP" or row.formula_group != token_groups[row.formula_token]:
                raise FeatureError("FORMULA_RECOGNITION_CONFLICT")
            feature = _compile_terms(terms)
        if row.source_group is not None:
            if row.source_group > len(known_sources):
                raise FeatureError("SOURCE_GROUP_ORDER_CONFLICT")
            known_sources.add(row.source_group)
        results.append(FeatureRow(row.ordinal, row.record_id, row.formula_group, row.source_group,
                                  feature, encode_processing(row.processing_status, row.processing_category)))
    return FeatureTable(fixture_sha256, tuple(results))


def aggregate_readiness(table):
    """Public aggregate projection; no per-row IDs, groups, vectors or tokens."""
    if type(table) is not FeatureTable:
        raise FeatureError("INVALID_FEATURE_TABLE")
    expected = hashlib.sha256(json.dumps(_table_record(table.fixture_sha256, table.rows),
        sort_keys=True, separators=(",", ":"), allow_nan=False).encode("ascii")).hexdigest()
    if table.table_digest != expected or table.descriptor_version != DESCRIPTOR_VERSION:
        raise FeatureError("FEATURE_TABLE_IDENTITY_CONFLICT")
    status = Counter(row.composition.status for row in table.rows)
    reasons = Counter(row.composition.reason for row in table.rows)
    processing = Counter(row.processing.category if row.processing.status == "KNOWN" else "UNRESOLVED" for row in table.rows)
    return {"schema": "lupine.discovery.mpea.synthetic_feature_readiness.v1", "mode": "synthetic_fixture",
            "descriptor_version": DESCRIPTOR_VERSION, "table_digest": table.table_digest,
            "row_count": len(table.rows), "composition_status_counts": dict(sorted(status.items())),
            "composition_reason_counts": dict(sorted(reasons.items())),
            "processing_category_counts": dict(sorted(processing.items())),
            "unknown_source_rows": sum(row.source_group is None for row in table.rows),
            "all_rows_preserved": True, "per_row_features_published": False,
            "physical_composition_established": False, "features_from_targets": False,
            "scientific_eligibility_decisions": False, "fits": 0, "splits": 0}
