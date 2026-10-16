"""Closed aggregate projection of the prospective study's private results.

No reader, writer, parser, allocator, fit, or target-access capability. Supplied
upstream identities/counts are not re-attested by this pure projector.
"""
from __future__ import annotations

from collections import Counter
from collections.abc import Mapping
from dataclasses import dataclass, field, fields, is_dataclass
from fractions import Fraction
from hashlib import sha256
from types import MappingProxyType
import json
import re

import mpea_study as kernel
from lupine_discovery.decision_pool import CONDITIONAL_GUARANTEE

SCHEMA = 'lupine.discovery.mpea.evaluation_public.v1'
UNAVAILABLE_SCHEMA = 'lupine.discovery.mpea.unavailable_public.v1'
MAX_PUBLIC_BYTES = 8 * 1024 * 1024
REGISTERED_SOURCE = (332126, '6d29eb6018157b863ca0033ccec936d5',
    'c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d')
ROLES = ('DEVELOPMENT', 'CALIBRATION', 'EVALUATION')
STAGES = ('allocation', 'input_freeze', 'development', 'rank_freeze', 'reserved', 'calibration', 'replay', 'evaluation')
INPUT_NAMES = ('feature', 'mapping', 'metadata_b', 'formula_c') + STAGES
TARGET_NAMES = ('yield_strength', 'elongation')
TARGET_REASONS = {
    'VALID': ('FINITE_NONNEGATIVE_RECORDED_POINT',), 'MISSING': ('EMPTY_TOKEN',),
    'UNSUPPORTED_LEXICAL': ('NON_ASCII_TOKEN', 'NOT_POINT_DECIMAL'),
    'UNSUPPORTED_NONFINITE': ('NONFINITE_TOKEN',),
    'UNRESOLVED_LIMIT': ('TOKEN_BYTES_LIMIT', 'DECIMAL_DIGIT_LIMIT', 'EXPONENT_LIMIT', 'TARGET_BITS_LIMIT'),
    'SEMANTIC_CONFLICT': ('NEGATIVE_YS', 'NEGATIVE_ELONGATION'),
}
ALL_TARGET_REASONS = tuple(code for codes in TARGET_REASONS.values() for code in codes)
STOP_REASONS = frozenset(('REGISTRATION_MISSING REGISTRATION_MISMATCH CI_NOT_PASSED ENGINEERING_NOT_PASSED '
    'IMPLEMENTATION_MISMATCH SOURCE_IDENTITY_MISMATCH INPUT_IDENTITY_MISMATCH METADATA_LINKAGE_CONFLICT '
    'METADATA_COUNT_MISMATCH SCHEMA_INVALID CSV_FRAMING_INVALID CSV_COUNT_MISMATCH OUTPUT_PATH_INVALID '
    'OUTPUT_ALREADY_EXISTS CACHE_IO_FAILURE ALLOCATION_ALREADY_ATTEMPTED ALLOCATION_TRANSCRIPT_INVALID '
    'ALLOCATION_PROVIDER_FAILURE ALLOCATION_DRAW_LIMIT ALLOCATION_INTERRUPTED FEATURE_PROFILE_MISMATCH '
    'STAGE_ORDER_VIOLATION UNAUTHORIZED_TARGET_ACCESS DEVELOPMENT_ROWS_BELOW_50 DEVELOPMENT_GROUPS_BELOW_15 '
    'DOCUMENTED_ENDPOINT_CONFLICT ARITHMETIC_LIMIT WALL_TIME_LIMIT RSS_LIMIT WORKER_INTERRUPTED '
    'STALE_OR_INVALID_DECISION REPLAY_REQUEST_INVALID REPLAY_INCOMPLETE INTERNAL_FAILURE SYNTHETIC_FIXTURE_REQUIRED').split())
METRIC_REASONS = ('TRUTH_UNKNOWN', 'EMPTY_PANEL', 'NO_FEASIBLE_CANDIDATE', 'NO_FEASIBLE_REVEAL', 'NOT_REACHED')
PRIMARY_ROUTES = ('FIVE_GROUP_NEIGHBORS', 'FEWER_GROUP_NEIGHBORS', 'UNKNOWN_COMPOSITION_PROCESSING',
                  'NO_KNOWN_DEVELOPMENT_COMPOSITION_PROCESSING')
PROCESSING_ROUTES = ('CATEGORY_MEDIAN', 'GLOBAL_MEDIAN_EMPTY_CATEGORY')
SCOPE = {
    'population': 'Fixed archived source-token panels; rows are recorded entries, not verified specimens.',
    'statistical_claim': 'Conditional single-future-panel marginal retention under the frozen score law; no simultaneous evaluation-panel claim.',
    'source_scope': 'Lexical source-group separation does not establish chemical, specimen or study independence.',
    'physical_attestation': 'not_established_by_this_program',
    'endpoint_scope': 'Recorded column 11 YS in MPa and column 13 elongation in percentage points; uncertainty not interpreted and specimen pairing not verified.',
    'threshold_scope': 'Derived lower median of complete development-row elongation; not an independently specified engineering requirement.',
    'metric_scope': 'Exact descriptive archival replay aggregates; no conditional coverage or deployment claim.',
    'privacy_scope': 'Aggregate projection only; no record IDs, memberships, targets, neighbors, predictions, orders, cell hashes or local paths.',
    'custody_scope': 'Completed ledgers are audited by the kernel; active access capabilities and external identity checks belong to upstream custody.',
    'identity_scope': 'Supplied whole-artifact identities are bound, not independently authenticated by this projector.',
    'cost_scope': 'Logical recorded-row YS/E bundle requests; no physical experiment cost claim.',
}


class ReportError(ValueError):
    pass


def _fail(code='SCHEMA_INVALID'):
    raise ReportError(code)


def _count(value, cap=1000000000):
    if type(value) is not int or not 0 <= value <= cap:
        _fail()
    return value


def _hex(value, size=64):
    if type(value) is not str or re.fullmatch('[0-9a-f]{' + str(size) + '}', value) is None:
        _fail()
    return value


def _closed(value, names):
    if not isinstance(value, Mapping) or set(value) != set(names) or any(type(k) is not str for k in value):
        _fail()
    return {key: value[key] for key in names}


def _counts(value, names, cap=1000000000):
    return MappingProxyType({key: _count(n, cap) for key, n in _closed(value, names).items()})


def _sequence(value, allowed):
    if not isinstance(value, (tuple, list)) or len(value) > len(allowed) or any(type(x) is not str or x not in allowed for x in value) or len(set(value)) != len(value):
        _fail()
    return tuple(value)


def _fraction(value, optional=False):
    if optional and value is None:
        return None
    if type(value) is not Fraction:
        _fail()
    try:
        kernel._exact(value)
    except kernel.StudyError:
        _fail('ARITHMETIC_LIMIT')
    if value < 0:
        _fail()
    return value


def _wire(value):
    if type(value) is Fraction:
        text = str(value.numerator) + '/' + str(value.denominator)
        if len(text) > 5000:
            _fail('ARITHMETIC_LIMIT')
        return text
    if is_dataclass(value):
        return {f.name: _wire(getattr(value, f.name)) for f in fields(value)}
    if isinstance(value, Mapping):
        return {key: _wire(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_wire(item) for item in value]
    if value is None or type(value) in (str, int, bool):
        return value
    _fail()


def _preflight(value):
    stack, nodes, approximate_bytes = [(value, 0, '')], 0, 0
    rational_keys = {'value', 'sum', 'mean', 'rate', 'threshold', 'score', 'alpha', 'pool_size', 'wall_seconds', 'cpu_seconds'}
    while stack:
        item, depth, slot = stack.pop()
        nodes += 1
        if nodes > 1000000 or depth > 32:
            _fail()
        approximate_bytes += 1
        if type(item) is str:
            if len(item) > 2048 and (slot not in rational_keys or len(item) > 5000 or re.fullmatch(r'-?[0-9]+/[1-9][0-9]*', item) is None):
                _fail()
            approximate_bytes += len(item)
        elif type(item) is int:
            if abs(item).bit_length() > 64:
                _fail()
        elif item is None or type(item) is bool:
            pass
        elif type(item) is dict:
            if any(type(key) is not str or len(key) > 2048 for key in item):
                _fail()
            approximate_bytes += sum(len(key) for key in item)
            stack.extend((child, depth+1, key) for key, child in item.items())
        elif type(item) is list:
            stack.extend((child, depth+1, slot) for child in item)
        else:
            _fail()
        if approximate_bytes > MAX_PUBLIC_BYTES:
            _fail()


def _canonical(value):
    _preflight(value)
    try:
        return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False) + '\n').encode('ascii')
    except (TypeError, ValueError, OverflowError, RecursionError):
        _fail()


def _hash(value):
    return sha256(_canonical(value)).hexdigest()


def _freeze(value):
    if type(value) is dict:
        return MappingProxyType({key: _freeze(item) for key, item in value.items()})
    if type(value) is list:
        return tuple(_freeze(item) for item in value)
    return value


@dataclass(frozen=True)
class ArtifactIdentity:
    bytes_sha256: str
    content_sha256: str | None
    scientific_sha256: str | None

    def __post_init__(self):
        _hex(self.bytes_sha256)
        for value in (self.content_sha256, self.scientific_sha256):
            if value is not None:
                _hex(value)


@dataclass(frozen=True)
class SourceIdentity:
    byte_count: int
    md5: str
    sha256: str

    def __post_init__(self):
        _count(self.byte_count, 32 * 1024 * 1024)
        _hex(self.md5, 32), _hex(self.sha256)


@dataclass(frozen=True)
class RegistrationSummary:
    commit: str
    protocol_sha256: str
    contract_sha256: str
    implementation_manifest_sha256: str
    engineering_receipt_sha256: str
    ci_receipt_sha256: str
    receipt: ArtifactIdentity

    def __post_init__(self):
        if type(self.commit) is not str or len(self.commit) not in (40, 64):
            _fail()
        _hex(self.commit, len(self.commit))
        for name in ('protocol_sha256', 'contract_sha256', 'implementation_manifest_sha256', 'engineering_receipt_sha256', 'ci_receipt_sha256'):
            _hex(getattr(self, name))
        if type(self.receipt) is not ArtifactIdentity:
            _fail()


@dataclass(frozen=True)
class FunnelCounts:
    source_rows: int
    condition_rows: int
    condition_source_groups: int
    out_of_scope_rows: int
    unresolved_source_rows: int

    def __post_init__(self):
        for item in fields(self):
            _count(getattr(self, item.name), 1545)
        if self.source_rows != self.condition_rows + self.out_of_scope_rows + self.unresolved_source_rows or self.condition_source_groups > self.condition_rows:
            _fail('METADATA_COUNT_MISMATCH')


@dataclass(frozen=True)
class RoleCounts:
    rows: int
    source_groups: int

    def __post_init__(self):
        _count(self.rows, 314), _count(self.source_groups, 75)
        if self.source_groups > self.rows or (self.rows == 0) != (self.source_groups == 0):
            _fail('METADATA_COUNT_MISMATCH')


@dataclass(frozen=True)
class TargetAggregates:
    row_count: int
    complete_row_count: int
    complete_source_group_count: int
    target_status_counts: Mapping[str, Mapping[str, int]]
    target_reason_counts: Mapping[str, Mapping[str, int]]

    def __post_init__(self):
        for n in (self.row_count, self.complete_row_count, self.complete_source_group_count):
            _count(n, 314)
        if not self.complete_source_group_count <= self.complete_row_count <= self.row_count or (self.complete_row_count == 0) != (self.complete_source_group_count == 0):
            _fail('METADATA_COUNT_MISMATCH')
        status, reasons = _closed(self.target_status_counts, TARGET_NAMES), _closed(self.target_reason_counts, TARGET_NAMES)
        for name in TARGET_NAMES:
            status[name] = _counts(status[name], TARGET_REASONS, 314)
            reasons[name] = _counts(reasons[name], ALL_TARGET_REASONS, 314)
            if sum(status[name].values()) != self.row_count or sum(reasons[name].values()) != self.row_count:
                _fail('METADATA_COUNT_MISMATCH')
            if any(sum(reasons[name][code] for code in codes) != status[name][state] for state, codes in TARGET_REASONS.items()):
                _fail('METADATA_COUNT_MISMATCH')
            impossible = 'NEGATIVE_ELONGATION' if name == 'yield_strength' else 'NEGATIVE_YS'
            if reasons[name][impossible] != 0:
                _fail('METADATA_COUNT_MISMATCH')
        ys, el = (status[name]['VALID'] for name in TARGET_NAMES)
        if not max(0, ys + el - self.row_count) <= self.complete_row_count <= min(ys, el):
            _fail('METADATA_COUNT_MISMATCH')
        object.__setattr__(self, 'target_status_counts', MappingProxyType(status))
        object.__setattr__(self, 'target_reason_counts', MappingProxyType(reasons))


@dataclass(frozen=True)
class AccessCounts:
    mixed_source_captures: int
    mixed_source_bytes: int
    accumulated_bundles: Mapping[str, int | None]
    decoded_bundles: Mapping[str, int | None]
    interpreted_bundles: Mapping[str, int | None]
    model_visible_bundles: int | None
    calibrator_visible_bundles: int | None
    policy_bundle_requests: int | None
    auditor_unique_bundles: int | None

    def __post_init__(self):
        _count(self.mixed_source_captures), _count(self.mixed_source_bytes)
        if self.mixed_source_captures == 0 and self.mixed_source_bytes != 0:
            _fail('METADATA_COUNT_MISMATCH')
        for name in ('accumulated_bundles', 'decoded_bundles', 'interpreted_bundles'):
            values = _closed(getattr(self, name), ROLES)
            for value in values.values():
                if value is not None:
                    _count(value)
            object.__setattr__(self, name, MappingProxyType(values))
        for name in ('model_visible_bundles', 'calibrator_visible_bundles', 'policy_bundle_requests', 'auditor_unique_bundles'):
            if getattr(self, name) is not None:
                _count(getattr(self, name))
        for role in ROLES:
            seq = tuple(getattr(self, name)[role] for name in ('accumulated_bundles', 'decoded_bundles', 'interpreted_bundles'))
            if any(later is not None and (earlier is None or later > earlier) for earlier, later in zip(seq, seq[1:])):
                _fail('METADATA_COUNT_MISMATCH')


@dataclass(frozen=True)
class Usage:
    wall_seconds: Fraction | None
    cpu_seconds: Fraction | None
    peak_rss_bytes: int | None

    def __post_init__(self):
        _fraction(self.wall_seconds, True), _fraction(self.cpu_seconds, True)
        if self.peak_rss_bytes is not None:
            _count(self.peak_rss_bytes, 1 << 63)


@dataclass(frozen=True)
class PublicContext:
    registration: RegistrationSummary | None
    source: SourceIdentity | None
    inputs: Mapping[str, ArtifactIdentity | None]
    execution_kind: str
    funnel_counts: FunnelCounts | None
    role_counts: Mapping[str, RoleCounts | None]
    target_aggregates: Mapping[str, TargetAggregates | None]
    access: AccessCounts
    usage: Usage

    def __post_init__(self):
        for value, cls in ((self.registration, RegistrationSummary), (self.source, SourceIdentity), (self.funnel_counts, FunnelCounts)):
            if value is not None and type(value) is not cls:
                _fail()
        if self.execution_kind not in ('synthetic_fixture', 'registered_original', 'registered_reproduction') or type(self.execution_kind) is not str:
            _fail()
        if type(self.access) is not AccessCounts or type(self.usage) is not Usage:
            _fail()
        for name, keys, cls in (('inputs', INPUT_NAMES, ArtifactIdentity), ('role_counts', ROLES, RoleCounts), ('target_aggregates', ROLES, TargetAggregates)):
            values = _closed(getattr(self, name), keys)
            if any(value is not None and type(value) is not cls for value in values.values()):
                _fail()
            object.__setattr__(self, name, MappingProxyType(values))
        if self.execution_kind != 'synthetic_fixture':
            if self.source is not None and (self.source.byte_count, self.source.md5, self.source.sha256) != REGISTERED_SOURCE:
                _fail('SOURCE_IDENTITY_MISMATCH')
            if self.funnel_counts is not None and (self.funnel_counts.source_rows, self.funnel_counts.condition_rows,
                self.funnel_counts.condition_source_groups) != (1545, 314, 75):
                _fail('METADATA_COUNT_MISMATCH')
            for role, count in zip(ROLES, (35, 20, 20)):
                if self.role_counts[role] is not None and self.role_counts[role].source_groups != count:
                    _fail('METADATA_COUNT_MISMATCH')
        if self.funnel_counts is not None and all(self.role_counts.values()):
            if sum(r.rows for r in self.role_counts.values()) != self.funnel_counts.condition_rows or sum(r.source_groups for r in self.role_counts.values()) != self.funnel_counts.condition_source_groups:
                _fail('METADATA_COUNT_MISMATCH')
        for role in ROLES:
            records, targets = self.role_counts[role], self.target_aggregates[role]
            if targets is not None and (records is None or targets.row_count != records.rows or targets.complete_source_group_count > records.source_groups):
                _fail('METADATA_COUNT_MISMATCH')
            for collection in (self.access.accumulated_bundles, self.access.decoded_bundles, self.access.interpreted_bundles):
                if collection[role] is not None and records is not None and collection[role] > records.rows:
                    _fail('METADATA_COUNT_MISMATCH')
                if targets is not None and collection[role] is not None and collection[role] < targets.row_count:
                    _fail('METADATA_COUNT_MISMATCH')
        for name, role in (('model_visible_bundles', 'DEVELOPMENT'), ('calibrator_visible_bundles', 'CALIBRATION'),
                           ('auditor_unique_bundles', 'EVALUATION')):
            visible = getattr(self.access, name)
            records, interpreted = self.role_counts[role], self.access.interpreted_bundles[role]
            if visible is not None and (records is not None and visible > records.rows or
                                       interpreted is not None and visible > interpreted):
                _fail('METADATA_COUNT_MISMATCH')


@dataclass(frozen=True)
class FailureState:
    status: str
    reasons: tuple[str, ...]
    last_sealed_stage: str | None
    completed_policy_runs: int

    def __post_init__(self):
        if self.status not in ('BLOCKED', 'INCOMPLETE', 'NO_GO_INSUFFICIENT_DEVELOPMENT'):
            _fail()
        reasons = _sequence(self.reasons, STOP_REASONS)
        if not reasons or self.last_sealed_stage is not None and self.last_sealed_stage not in STAGES:
            _fail()
        _count(self.completed_policy_runs, 960)
        if self.status == 'NO_GO_INSUFFICIENT_DEVELOPMENT' and (not set(reasons) <= {'DEVELOPMENT_ROWS_BELOW_50', 'DEVELOPMENT_GROUPS_BELOW_15'} or self.completed_policy_runs):
            _fail()
        object.__setattr__(self, 'reasons', reasons)


def _summary(values, reasons=None, *, binary=False):
    values = tuple(values)
    known = tuple(Fraction(value) for value in values if value is not None)
    reason_counts = dict.fromkeys(METRIC_REASONS, 0)
    if reasons is not None:
        for value, reason in zip(values, reasons, strict=True):
            if value is None:
                if reason not in METRIC_REASONS:
                    _fail()
                reason_counts[reason] += 1
    result = {'panel_denominator': len(values), 'known_count': len(known), 'unavailable_count': len(values)-len(known),
              'unavailable_reasons': reason_counts}
    if binary:
        if any(value not in (Fraction(0), Fraction(1)) for value in known):
            _fail()
        result.update(success_count=sum(int(value) for value in known), rate=kernel.mean(known) if known else None)
    else:
        result.update(sum=kernel.total(known) if known else None, mean=kernel.mean(known) if known else None)
    return result


def _metric_group(panels, metrics):
    panels, metrics = tuple(panels), tuple(metrics)
    if len(panels) != len(metrics):
        _fail()
    result = {'panel_count': len(panels),
        'truth_complete_count': sum(p.truth_status == 'COMPLETE' for p in panels),
        'truth_unknown_count': sum(p.truth_status != 'COMPLETE' for p in panels),
        'empty_count': sum(p.candidate_count == 0 for p in panels),
        'complete_infeasible_count': sum(p.candidate_count > 0 and p.feasible_count == 0 for p in panels),
        'feasible_count': sum(bool(p.feasible_count) for p in panels),
        'actual_bundle_cost': _summary(tuple(m.actual_cost for m in metrics)),
        'observed_known_feasible_row_total': sum(m.observed_known_feasible_count for m in metrics),
        'whole_universe_retained_panel_count': sum(m.whole_universe_retained for m in metrics)}
    for name in ('any_optimum_hit', 'all_optima_retained', 'feasible_hit'):
        result[name] = _summary(tuple(getattr(m, name) for m in metrics),
            tuple('TRUTH_UNKNOWN' if p.truth_status != 'COMPLETE' else None for p in panels), binary=True)
    for name in ('best_feasible_yield_strength', 'regret', 'first_optimum_cost'):
        reasons = tuple(m.first_optimum_reason if name == 'first_optimum_cost' else m.reason for m in metrics)
        result[name] = _summary(tuple(getattr(m, name) for m in metrics), reasons)
    return result


def _metric_views(panels, metrics):
    panels, metrics = tuple(panels), tuple(metrics)
    feasible = tuple((p, m) for p, m in zip(panels, metrics, strict=True) if p.feasible_count)
    return {'assigned_panels': _metric_group(panels, metrics),
            'observed_feasible_panels': _metric_group(tuple(p for p, _ in feasible), tuple(m for _, m in feasible))}


def _fallback_counts(evaluation):
    fit = evaluation.primary.plan.fit
    usable_sources = len({row.feature.source_group for row in fit.complete_rows if row.feature.composition is not None})
    groups = {'DEVELOPMENT': [], 'CALIBRATION': [], 'EVALUATION': []}
    for row in fit.development:
        route = ('UNKNOWN_COMPOSITION_PROCESSING' if row.feature.composition is None else
            'NO_KNOWN_DEVELOPMENT_COMPOSITION_PROCESSING' if usable_sources == 0 else
            'FIVE_GROUP_NEIGHBORS' if usable_sources >= 5 else 'FEWER_GROUP_NEIGHBORS')
        base = 'CATEGORY_MEDIAN' if row.feature.processing in fit.processing_medians else 'GLOBAL_MEDIAN_EMPTY_CATEGORY'
        groups['DEVELOPMENT'].append((route, base))
    for role, panels in (('CALIBRATION', evaluation.primary.plan.calibration_panels), ('EVALUATION', evaluation.primary.plan.future_panels)):
        groups[role] = [(p.route, p.processing_route) for panel in panels for p in panel.predictions]
    return {role: {'row_count': len(rows), 'primary': {key: sum(a == key for a, _ in rows) for key in PRIMARY_ROUTES},
        'processing': {key: sum(b == key for _, b in rows) for key in PROCESSING_ROUTES}} for role, rows in groups.items()}


def _validate_evaluation_context(evaluation, context):
    if type(evaluation) is not kernel.StudyEvaluation:
        _fail()
    if context.registration is None or context.source is None or context.funnel_counts is None or any(value is None for value in context.inputs.values()):
        _fail('INPUT_IDENTITY_MISMATCH')
    plan = evaluation.primary.plan
    groups = {
        'DEVELOPMENT': tuple((row.feature.source_group, row.targets) for row in plan.fit.development),
        'CALIBRATION': tuple((p.panel.source_group, row) for p in plan.calibration_panels for row in plan.calibration_targets[p.panel.panel_id]),
        'EVALUATION': tuple((p.panel.source_group, row) for p in plan.future_panels for row in evaluation.primary.truth[p.panel.panel_id]),
    }
    for role, rows in groups.items():
        supplied, counts = context.target_aggregates[role], context.role_counts[role]
        expected = (len(rows), sum(row.complete for _, row in rows), len({group for group, row in rows if row.complete}))
        if supplied is None or counts is None or (supplied.row_count, supplied.complete_row_count, supplied.complete_source_group_count) != expected:
            _fail('METADATA_COUNT_MISMATCH')
        if (counts.rows, counts.source_groups) != (len(rows), len({group for group, _ in rows})):
            _fail('METADATA_COUNT_MISMATCH')
        for target in TARGET_NAMES:
            if supplied.target_status_counts[target]['VALID'] != sum(getattr(row, target) is not None for _, row in rows):
                _fail('METADATA_COUNT_MISMATCH')
        for values in (context.access.accumulated_bundles, context.access.decoded_bundles, context.access.interpreted_bundles):
            if values[role] != len(rows):
                _fail('METADATA_COUNT_MISMATCH')
    expected_access = {'model_visible_bundles': len(groups['DEVELOPMENT']), 'calibrator_visible_bundles': len(groups['CALIBRATION']),
        'policy_bundle_requests': evaluation.costs['policy_bundle_requests'], 'auditor_unique_bundles': len(groups['EVALUATION'])}
    if any(getattr(context.access, key) != value for key, value in expected_access.items()):
        _fail('METADATA_COUNT_MISMATCH')
    if context.access.mixed_source_captures < 1 or context.access.mixed_source_bytes != context.access.mixed_source_captures * context.source.byte_count:
        _fail('METADATA_COUNT_MISMATCH')
    if context.execution_kind != 'synthetic_fixture':
        if context.funnel_counts.source_rows != 1545 or context.funnel_counts.condition_rows != 314 or context.funnel_counts.condition_source_groups != 75:
            _fail('METADATA_COUNT_MISMATCH')
        if tuple(context.role_counts[role].source_groups for role in ROLES) != (35, 20, 20):
            _fail('METADATA_COUNT_MISMATCH')


def _calibration_summary(plan):
    calibration = plan.calibration
    scores = Counter(score.score for score in calibration.scores if score.score is not None)
    decision_counts = dict(empty_universe=0, empty_pool_nonempty_universe=0, proper_nonempty_reduction=0, full_nonempty_pool=0)
    for decision in plan.decisions:
        key = ('empty_universe' if decision.m == 0 else 'empty_pool_nonempty_universe' if not decision.retained else
               'full_nonempty_pool' if len(decision.retained) == decision.m else 'proper_nonempty_reduction')
        decision_counts[key] += 1
    return {'n': calibration.n, 'complete_count': calibration.complete_count, 'k': calibration.k,
        'alpha': calibration.alpha, 'threshold': calibration.threshold, 'status': calibration.status,
        'premise_status': calibration.premise_status, 'reasons': calibration.reasons, 'study_reasons': plan.reasons,
        'guarantee_status': calibration.guarantee_status, 'conditional_guarantee': calibration.conditional_guarantee,
        'calibration_sha256': calibration.calibration_digest, 'plan_sha256': plan.plan_digest,
        'score_histogram': tuple({'score': score, 'count': scores[score]} for score in sorted(scores)),
        'unknown_score_count': calibration.n - calibration.complete_count,
        'empty_calibration_panels': sum(score.reason == 'empty_universe' for score in calibration.scores),
        'complete_infeasible_calibration_panels': sum(score.reason == 'no_feasible_candidate' for score in calibration.scores),
        'future_assigned_panels': 20, 'decision_counts': decision_counts}


def _population_summary(replay):
    panels = replay.panels
    fractions = tuple(panel.pool_fraction for panel in panels)
    reasons = tuple(panel.pool_fraction_reason for panel in panels)
    feasible = tuple(panel for panel in panels if panel.feasible_count)
    return {'counts': dict(replay.counts), 'pool': _metric_views(panels, tuple(panel.pool for panel in panels)),
        'pool_fraction_assigned': _summary(fractions, reasons),
        'pool_fraction_observed_feasible': _summary(tuple(panel.pool_fraction for panel in feasible)),
        'logical_costs': dict(replay.costs), 'replay_sha256': replay.replay_digest}


def _policy_summary(replay):
    result = {}
    for policy in kernel.POLICIES:
        snapshots = tuple({'requested_cap': cap, 'metrics': _metric_views(replay.panels,
            tuple(panel.policies[policy].snapshots[cap] for panel in replay.panels))} for cap in kernel.BUDGETS)
        result[policy] = {'scheduled_runs': 20, 'completed_runs': 20, 'budget_snapshots': snapshots,
            'same_actual_pool_cost': _metric_views(replay.panels, tuple(panel.policies[policy].at_pool_cost for panel in replay.panels)),
            'final': _metric_views(replay.panels, tuple(panel.policies[policy].final for panel in replay.panels))}
    return result


def _complete_payload(evaluation, context):
    _validate_evaluation_context(evaluation, context)
    populations = {'primary': evaluation.primary, 'secondary': evaluation.secondary}
    return {'funnel': {'counts': context.funnel_counts, 'roles': context.role_counts},
        'target_status_counts': context.target_aggregates,
        'derived_threshold': {'quantity': 'lower_development_median_elongation', 'unit': 'percentage_points', 'value': evaluation.primary.plan.fit.threshold},
        'all_40_primary_endpoints_defined': evaluation.primary.plan.completeness.all_defined,
        'fallback_counts': _fallback_counts(evaluation),
        'calibration_summary': {name: _calibration_summary(replay.plan) for name, replay in populations.items()},
        'population_metrics': {name: _population_summary(replay) for name, replay in populations.items()},
        'policy_metrics': {name: _policy_summary(replay) for name, replay in populations.items()},
        'gate_denominators': evaluation.denominators, 'gate_margins': evaluation.margins,
        'gate_checks': evaluation.gate_checks, 'gate_reasons': evaluation.gate_reasons,
        'failed_gates': evaluation.failed_gates, 'component_verdicts': evaluation.component_verdicts,
        'component_reasons': evaluation.component_reasons, 'overall_verdict': evaluation.overall_verdict,
        'costs': evaluation.costs, 'run_accounting': {'scheduled_runs': 960, 'completed_runs': 960,
            'populations': 2, 'assigned_panels_per_population': 20, 'policies_per_panel': 24},
        'kernel_evaluation_sha256': evaluation.evaluation_digest, 'scope': SCOPE}


def _failure_payload(context, failure):
    last = -1 if failure.last_sealed_stage is None else STAGES.index(failure.last_sealed_stage)
    if failure.last_sealed_stage is not None and context.inputs[failure.last_sealed_stage] is None:
        _fail('INPUT_IDENTITY_MISMATCH')
    if any(context.inputs[stage] is not None for stage in STAGES[last+1:]) or any(context.inputs[stage] is None for stage in STAGES[:last+1]):
        _fail('INPUT_IDENTITY_MISMATCH')
    def at_least(stage):
        return last >= STAGES.index(stage)
    # Availability of summaries follows a sealed completed parse; actual partial
    # cell-access counters may follow its authorized predecessor instead.
    for role in ROLES:
        summary_stage = 'development' if role == 'DEVELOPMENT' else 'reserved'
        access_stage = 'input_freeze' if role == 'DEVELOPMENT' else 'rank_freeze'
        if context.target_aggregates[role] is not None and not at_least(summary_stage):
            _fail('STAGE_ORDER_VIOLATION')
        if any((values[role] or 0) > 0 for values in (context.access.accumulated_bundles,
            context.access.decoded_bundles, context.access.interpreted_bundles)) and not at_least(access_stage):
            _fail('STAGE_ORDER_VIOLATION')
    for name, stage in (('model_visible_bundles', 'development'), ('calibrator_visible_bundles', 'reserved'),
                        ('policy_bundle_requests', 'calibration'), ('auditor_unique_bundles', 'replay')):
        if (getattr(context.access, name) or 0) > 0 and not at_least(stage):
            _fail('STAGE_ORDER_VIOLATION')
    if context.access.mixed_source_captures > 0 and not at_least('input_freeze'):
        _fail('STAGE_ORDER_VIOLATION')
    if failure.completed_policy_runs and not at_least('calibration'):
        _fail('METADATA_COUNT_MISMATCH')
    if failure.status == 'NO_GO_INSUFFICIENT_DEVELOPMENT':
        if failure.last_sealed_stage != 'development' or any((getattr(context.access, name) or 0) > 0
            for name in ('model_visible_bundles', 'calibrator_visible_bundles', 'policy_bundle_requests', 'auditor_unique_bundles')):
            _fail('STAGE_ORDER_VIOLATION')
        development = context.target_aggregates['DEVELOPMENT']
        if development is None or development.row_count != context.role_counts['DEVELOPMENT'].rows:
            _fail('METADATA_COUNT_MISMATCH')
        expected = tuple(code for condition, code in ((development.complete_row_count < 50, 'DEVELOPMENT_ROWS_BELOW_50'),
            (development.complete_source_group_count < 15, 'DEVELOPMENT_GROUPS_BELOW_15')) if condition)
        if set(failure.reasons) != set(expected) or not expected or any(context.target_aggregates[role] is not None for role in ('CALIBRATION', 'EVALUATION')):
            _fail('METADATA_COUNT_MISMATCH')
    return {'last_sealed_stage': failure.last_sealed_stage,
        'funnel': None if context.funnel_counts is None else {'counts': context.funnel_counts, 'roles': context.role_counts},
        'target_status_counts': context.target_aggregates,
        'completed_policy_runs': failure.completed_policy_runs,
        'calibration_summary': None, 'population_metrics': None, 'policy_metrics': None,
        'gate_denominators': None, 'gate_margins': None, 'gate_checks': None, 'gate_reasons': None,
        'failed_gates': None, 'component_verdicts': None, 'component_reasons': None, 'overall_verdict': None,
        'scope': SCOPE}


@dataclass(frozen=True, init=False)
class PublicProjection:
    document: Mapping = field(init=False, repr=False)

    def __init__(self, context: PublicContext, evaluation=None, failure=None):
        if type(context) is not PublicContext or (evaluation is None) == (failure is None):
            _fail()
        if failure is not None and type(failure) is not FailureState:
            _fail()
        complete = evaluation is not None
        try:
            payload = _complete_payload(evaluation, context) if complete else _failure_payload(context, failure)
        except kernel.StudyError as error:
            _fail('ARITHMETIC_LIMIT' if str(error) == 'ARITHMETIC_LIMIT' else 'INPUT_IDENTITY_MISMATCH')
        value = _wire({'schema': SCHEMA if complete else UNAVAILABLE_SCHEMA, 'protocol_id': kernel.PROTOCOL_ID,
            'stage': 'evaluation' if complete else 'unavailable',
            'status': 'COMPLETE' if complete else failure.status,
            'reasons': () if complete else failure.reasons,
            'registration': context.registration, 'source': context.source, 'inputs': context.inputs,
            'execution_kind': context.execution_kind, 'payload': payload,
            'access': {'authorized_target_positions': (11, 13), 'counts': context.access,
                'actor_scope': 'Role-specific parser/model/calibrator/policy/auditor counters supplied by custody; mixed-source byte capture is separate.'},
            'usage': context.usage})
        # Scientific identity excludes usage and volatile receipt-byte identities;
        # retains source + semantic stage identity where supplied, otherwise full bytes.
        scientific = {key: value[key] for key in ('schema', 'protocol_id', 'stage', 'status', 'reasons', 'source', 'payload', 'access')}
        scientific['execution_scope'] = 'synthetic_fixture' if context.execution_kind == 'synthetic_fixture' else 'registered_study'
        scientific['registration'] = None if context.registration is None else {
            key: value['registration'][key] for key in ('commit', 'protocol_sha256', 'contract_sha256', 'implementation_manifest_sha256')}
        scientific['inputs'] = {key: None if identity is None else identity.scientific_sha256 or identity.bytes_sha256 for key, identity in context.inputs.items()}
        value['scientific_sha256'] = _hash(scientific)
        value['content_sha256'] = _hash(value)
        raw = _canonical(value)
        if len(raw) > MAX_PUBLIC_BYTES:
            _fail('ARITHMETIC_LIMIT')
        object.__setattr__(self, 'document', _freeze(value))

    def as_dict(self):
        return _wire(self.document)

    def canonical_bytes(self):
        # This record retains only a document built through validated originals.
        # It cannot be constructed from a user-supplied document argument.
        return _canonical(self.as_dict())


def project_evaluation(evaluation, context):
    return PublicProjection(context, evaluation=evaluation)


def project_unavailable(context, status, reasons, last_sealed_stage, completed_policy_runs):
    return PublicProjection(context, failure=FailureState(status, reasons, last_sealed_stage, completed_policy_runs))


def validate_public_report(value, expected_projection):
    """Exact deterministic verification requires the original typed inputs.

A seal-only reader cannot infer source truth or verify the private aggregation.
This comparison rejects extra keys and type substitutions even after resealing.
"""
    if type(value) is not dict or type(expected_projection) is not PublicProjection:
        _fail()
    raw = _canonical(value)
    if len(raw) > MAX_PUBLIC_BYTES or raw != _canonical(expected_projection.as_dict()):
        _fail('INPUT_IDENTITY_MISMATCH')
    return True
