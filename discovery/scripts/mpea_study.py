"""Synthetic-only prospective study kernel. No source reader, allocator or CLI.

Caller-supplied parsed labels are not physical attestations. Access capabilities,
source custody, and stage persistence must be enforced by a separate process.
All output fields are derived from immutable originals; no fitted uncertainty.
"""
from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from fractions import Fraction
from hashlib import sha256
from math import gcd
from types import MappingProxyType
import re

from lupine_discovery.decision_pool import (PoolProtocol, RankedPanel, PanelOutcome,
    PanelOutcomes, CalibrationPanel, calibrate_panels, select_pool)
from lupine_discovery.evidence import Scope, digest
from lupine_discovery.representation import NormalizedVector
from lupine_discovery.serialization import encode
from mpea_features import AXES, PROCESSING_AXES

PROTOCOL_ID = 'mpea-t25-archival-v1'
INPUT_TARGET_BITS, DERIVED_BITS, TEMP_BITS = 512, 8192, 16385
BUDGETS = (0, 1, 2, 4, 8, 16, 32)
FULL_POLICIES = ('primary', 'processing', 'objective_only') + tuple('random_' + str(i) for i in range(20))
POLICIES = ('primary', 'stopped', 'processing', 'objective_only') + tuple('random_' + str(i) for i in range(20))
SAMPLING_SCOPE = ('Fixed archived source-token panels; conditional uniform permutation of 40 '
    'reserved groups after a fixed development fit; single-future-panel marginal scope; '
    'no study independence or physical attestation.')


class StudyError(ValueError):
    """Constant code only, never includes a target or row value."""


def _fail(code='INPUT_IDENTITY_MISMATCH'):
    raise StudyError(code)


def _text(value):
    if type(value) is not str or not value or len(value) > 2048:
        _fail()
    return value


def _sha(value):
    if type(value) is not str or re.fullmatch('[0-9a-f]{64}', value) is None:
        _fail()
    return value


def _tuple(values, cls=None, cap=4096):
    if not isinstance(values, (tuple, list)) or len(values) > cap:
        _fail()
    values = tuple(values)
    if cls is not None and any(type(x) is not cls for x in values):
        _fail()
    return values


def _map(values):
    if not isinstance(values, Mapping) or any(type(k) is not str for k in values):
        _fail()
    return dict(sorted(values.items()))


def _identity(kind, **values):
    return digest(encode({'kernel': 'mpea.study.synthetic.v1', 'kind': kind, **values}))


def _exact(value, bits=DERIVED_BITS):
    if type(value) is not Fraction:
        _fail('INPUT_IDENTITY_MISMATCH')
    if abs(value.numerator).bit_length() > bits or value.denominator.bit_length() > bits:
        _fail('ARITHMETIC_LIMIT')
    return value


def _product(a, b):
    if a and b and abs(a).bit_length() + abs(b).bit_length() > TEMP_BITS and abs(a) > ((1 << TEMP_BITS) - 1) // abs(b):
        _fail('ARITHMETIC_LIMIT')
    return a * b


def _integer_sum(a, b):
    if (a > 0 and b > 0 or a < 0 and b < 0) and max(abs(a).bit_length(), abs(b).bit_length()) + 1 > TEMP_BITS and abs(a) > (1 << TEMP_BITS) - 1 - abs(b):
        _fail('ARITHMETIC_LIMIT')
    return a + b


def add(a, b):
    """Bounded exact addition; failure blocks the dependent calculation."""
    a, b = _exact(a), _exact(b)
    common = gcd(a.denominator, b.denominator)
    left, right = b.denominator // common, a.denominator // common
    n = _integer_sum(_product(a.numerator, left), _product(b.numerator, right))
    d = _product(a.denominator, left)
    return _exact(Fraction(n, d))


def multiply(a, b):
    a, b = _exact(a), _exact(b)
    first, second = gcd(abs(a.numerator), b.denominator), gcd(abs(b.numerator), a.denominator)
    return _exact(Fraction(_product(a.numerator // first, b.numerator // second),
                           _product(a.denominator // second, b.denominator // first)))


def total(values):
    result = Fraction(0)
    for value in values:
        result = add(result, value)
    return result


def mean(values):
    values = tuple(values)
    if not values:
        _fail()
    return multiply(total(values), Fraction(1, len(values)))


def lower_median(values):
    values = tuple(_exact(x) for x in values)
    if not values:
        _fail()
    return sorted(values)[(len(values) - 1) // 2]


def composition_distance(left, right):
    if type(left) is not NormalizedVector or type(right) is not NormalizedVector or left.axes != AXES or right.axes != AXES:
        _fail('FEATURE_PROFILE_MISMATCH')
    return total(abs(add(x, -y)) for x, y in zip(left.values, right.values) if x != y)


def rank_hash(tag, record_id):
    _text(tag), _text(record_id)
    return sha256(b'mpea-t25-archive-option-v1\0' + tag.encode('utf-8') + b'\0' + record_id.encode('utf-8')).hexdigest()


@dataclass(frozen=True)
class FeatureRow:
    record_id: str
    ordinal: int
    source_group: str
    composition: NormalizedVector | None
    processing: str

    def __post_init__(self):
        _text(self.record_id), _text(self.source_group)
        if type(self.ordinal) is not int or not 0 <= self.ordinal < 1545:
            _fail()
        if type(self.processing) is not str or self.processing not in PROCESSING_AXES:
            _fail('FEATURE_PROFILE_MISMATCH')
        if self.composition is not None and (type(self.composition) is not NormalizedVector or self.composition.axes != AXES):
            _fail('FEATURE_PROFILE_MISMATCH')


@dataclass(frozen=True)
class Targets:
    record_id: str
    yield_strength: Fraction | None
    elongation: Fraction | None

    def __post_init__(self):
        _text(self.record_id)
        for value in (self.yield_strength, self.elongation):
            if value is not None and _exact(value, INPUT_TARGET_BITS) < 0:
                _fail('INPUT_IDENTITY_MISMATCH')

    @property
    def complete(self):
        return self.yield_strength is not None and self.elongation is not None


@dataclass(frozen=True)
class DevelopmentRow:
    feature: FeatureRow
    targets: Targets

    def __post_init__(self):
        if type(self.feature) is not FeatureRow or type(self.targets) is not Targets or self.feature.record_id != self.targets.record_id:
            _fail()


def _unique_features(rows):
    if len({r.record_id for r in rows}) != len(rows) or len({r.ordinal for r in rows}) != len(rows):
        _fail()


@dataclass(frozen=True)
class StudyFit:
    development: tuple[DevelopmentRow, ...]
    status: str = field(init=False)
    reasons: tuple[str, ...] = field(init=False)
    complete_rows: tuple[DevelopmentRow, ...] = field(init=False)
    complete_source_count: int = field(init=False)
    threshold: Fraction | None = field(init=False)
    global_medians: tuple[Fraction, Fraction] | None = field(init=False)
    processing_medians: Mapping[str, tuple[Fraction, Fraction]] = field(init=False)
    fit_digest: str = field(init=False)

    def __post_init__(self):
        original = _tuple(self.development, DevelopmentRow, 314)
        _unique_features(tuple(row.feature for row in original))
        original = tuple(sorted(original, key=lambda r: r.feature.ordinal))
        complete = tuple(row for row in original if row.targets.complete)
        groups = len({row.feature.source_group for row in complete})
        reasons = tuple(code for condition, code in ((len(complete) < 50, 'DEVELOPMENT_ROWS_BELOW_50'),
            (groups < 15, 'DEVELOPMENT_GROUPS_BELOW_15')) if condition)
        medians, categories = None, {}
        if not reasons:
            def pair(rows):
                return lower_median(r.targets.yield_strength for r in rows), lower_median(r.targets.elongation for r in rows)
            medians = pair(complete)
            for category in PROCESSING_AXES:
                subset = tuple(r for r in complete if r.feature.processing == category)
                if subset:
                    categories[category] = pair(subset)
        values = dict(development=original, complete_rows=complete, complete_source_count=groups,
            status='NO_GO_INSUFFICIENT_DEVELOPMENT' if reasons else 'COMPLETE', reasons=reasons,
            threshold=None if medians is None else medians[1], global_medians=medians,
            processing_medians=MappingProxyType(categories))
        for key, value in values.items():
            object.__setattr__(self, key, value)
        object.__setattr__(self, 'fit_digest', _identity('fit', **values))


def fit_development(rows):
    return StudyFit(rows)


@dataclass(frozen=True)
class Prediction:
    fit: StudyFit
    query: FeatureRow
    yield_strength: Fraction = field(init=False)
    elongation: Fraction = field(init=False)
    route: str = field(init=False)
    neighbors: tuple[tuple[str, Fraction], ...] = field(init=False)
    processing_yield_strength: Fraction = field(init=False)
    processing_elongation: Fraction = field(init=False)
    processing_route: str = field(init=False)

    def __post_init__(self):
        if type(self.fit) is not StudyFit or type(self.query) is not FeatureRow or self.fit.status != 'COMPLETE':
            _fail('NO_GO_INSUFFICIENT_DEVELOPMENT')
        fit, query = self.fit, self.query
        baseline = fit.processing_medians.get(query.processing, fit.global_medians)
        baseline_route = 'CATEGORY_MEDIAN' if query.processing in fit.processing_medians else 'GLOBAL_MEDIAN_EMPTY_CATEGORY'
        neighbors = ()
        if query.composition is None:
            predicted, route = baseline, 'UNKNOWN_COMPOSITION_PROCESSING'
        else:
            representatives = {}
            for row in fit.complete_rows:
                if row.feature.composition is None:
                    continue
                item = (composition_distance(query.composition, row.feature.composition), row.feature.ordinal, row)
                previous = representatives.get(row.feature.source_group)
                if previous is None or item[:2] < previous[:2]:
                    representatives[row.feature.source_group] = item
            chosen = tuple(sorted(representatives.values(), key=lambda x: x[:2])[:5])
            if not chosen:
                predicted, route = baseline, 'NO_KNOWN_DEVELOPMENT_COMPOSITION_PROCESSING'
            else:
                predicted = (mean(x[2].targets.yield_strength for x in chosen), mean(x[2].targets.elongation for x in chosen))
                neighbors = tuple((x[2].feature.record_id, x[0]) for x in chosen)
                route = 'FIVE_GROUP_NEIGHBORS' if len(chosen) == 5 else 'FEWER_GROUP_NEIGHBORS'
        for key, value in dict(yield_strength=predicted[0], elongation=predicted[1], route=route,
            neighbors=neighbors, processing_yield_strength=baseline[0], processing_elongation=baseline[1],
            processing_route=baseline_route).items():
            object.__setattr__(self, key, value)


def predict(fit, query):
    return Prediction(fit, query)


@dataclass(frozen=True)
class AssignedPanel:
    panel_id: str
    source_group: str
    rows: tuple[FeatureRow, ...]

    def __post_init__(self):
        _text(self.panel_id), _text(self.source_group)
        rows = _tuple(self.rows, FeatureRow, 25)
        _unique_features(rows)
        if any(row.source_group != self.source_group for row in rows):
            _fail()
        object.__setattr__(self, 'rows', tuple(sorted(rows, key=lambda row: row.ordinal)))


@dataclass(frozen=True)
class FrozenPanel:
    fit: StudyFit
    panel: AssignedPanel
    predictions: tuple[Prediction, ...] = field(init=False)
    orders: Mapping[str, tuple[str, ...]] = field(init=False)
    rank_digest: str = field(init=False)

    def __post_init__(self):
        if type(self.fit) is not StudyFit or self.fit.status != 'COMPLETE' or type(self.panel) is not AssignedPanel:
            _fail()
        predictions = tuple(predict(self.fit, row) for row in self.panel.rows)
        def key(prediction, policy):
            row = prediction.query
            suffix = (rank_hash('tie', row.record_id), row.ordinal)
            if policy == 'objective_only':
                return (-prediction.yield_strength, *suffix)
            ys, elong = ((prediction.yield_strength, prediction.elongation) if policy == 'primary' else
                         (prediction.processing_yield_strength, prediction.processing_elongation))
            return (0 if elong >= self.fit.threshold else 1, -ys, *suffix)
        orders = {policy: tuple(p.query.record_id for p in sorted(predictions, key=lambda p: key(p, policy)))
                  for policy in FULL_POLICIES[:3]}
        for seed in range(20):
            orders['random_' + str(seed)] = tuple(row.record_id for row in sorted(self.panel.rows,
                key=lambda row: (rank_hash('random-' + str(seed), row.record_id), row.ordinal)))
        object.__setattr__(self, 'predictions', predictions)
        object.__setattr__(self, 'orders', MappingProxyType(orders))
        object.__setattr__(self, 'rank_digest', _identity('rank', fit=self.fit.fit_digest, panel=self.panel,
            predictions=tuple({name: getattr(p, name) for name in ('query', 'yield_strength', 'elongation',
                'route', 'neighbors', 'processing_yield_strength', 'processing_elongation', 'processing_route')} for p in predictions), orders=orders))


def rank_panel(fit, panel):
    return FrozenPanel(fit, panel)


@dataclass(frozen=True)
class ReservedCompleteness:
    """Role-blind membership only, with all original 40 panels preserved."""
    panels: tuple[AssignedPanel, ...]
    complete_ids: Mapping[str, tuple[str, ...]]
    all_defined: bool = field(init=False)
    completeness_digest: str = field(init=False)

    def __post_init__(self):
        panels = _tuple(self.panels, AssignedPanel, 40)
        _validate_reserved(panels)
        complete = _map(self.complete_ids)
        if set(complete) != {p.panel_id for p in panels}:
            _fail()
        for panel in panels:
            ids = _tuple(complete[panel.panel_id], str, 25)
            if len(set(ids)) != len(ids) or not set(ids) <= {r.record_id for r in panel.rows}:
                _fail()
            complete[panel.panel_id] = tuple(sorted(ids))
        panels = tuple(sorted(panels, key=lambda p: p.panel_id))
        all_defined = all(len(complete[p.panel_id]) == len(p.rows) for p in panels)
        object.__setattr__(self, 'panels', panels)
        object.__setattr__(self, 'complete_ids', MappingProxyType(complete))
        object.__setattr__(self, 'all_defined', all_defined)
        object.__setattr__(self, 'completeness_digest', _identity('completeness', panels=panels, complete_ids=complete))


def _validate_reserved(panels):
    if len(panels) != 40 or any(not p.rows for p in panels) or len({p.panel_id for p in panels}) != 40 or len({p.source_group for p in panels}) != 40:
        _fail()
    rows = tuple(row for panel in panels for row in panel.rows)
    if len(rows) > 314:
        _fail()
    _unique_features(rows)


def _target_map(rows, expected_ids):
    rows = _tuple(rows, Targets, 314)
    result = {r.record_id: r for r in rows}
    if len(result) != len(rows) or set(result) != set(expected_ids):
        _fail()
    return dict(sorted(result.items()))


@dataclass(frozen=True)
class PolicySchedule:
    panel_id: str
    policy_id: str
    decision_digest: str
    order: tuple[str, ...]
    reveal_ids: tuple[str, ...]
    snapshots: tuple[int, ...]

    def __post_init__(self):
        _text(self.panel_id), _sha(self.decision_digest)
        if self.policy_id not in POLICIES:
            _fail()
        order, reveals = _tuple(self.order, str, 25), _tuple(self.reveal_ids, str, 25)
        snapshots = _tuple(self.snapshots, int, 8)
        if len(set(order)) != len(order) or reveals != order[:len(reveals)] or any(type(n) is not int or not 0 <= n <= 32 for n in snapshots):
            _fail()
        object.__setattr__(self, 'order', order)
        object.__setattr__(self, 'reveal_ids', reveals)
        object.__setattr__(self, 'snapshots', snapshots)


@dataclass(frozen=True)
class PopulationPlan:
    fit: StudyFit
    calibration_panels: tuple[FrozenPanel, ...]
    calibration_targets: Mapping[str, tuple[Targets, ...]]
    future_panels: tuple[FrozenPanel, ...]
    completeness: ReservedCompleteness
    population: str
    sampling_premise: str
    freeze_reference: str
    objective_reference: str
    constraint_reference: str
    outcome_reference: str
    protocol: PoolProtocol = field(init=False)
    calibration: object = field(init=False)
    ranked_future: tuple[RankedPanel, ...] = field(init=False)
    decisions: tuple = field(init=False)
    schedules: tuple[PolicySchedule, ...] = field(init=False)
    orders: Mapping[str, Mapping[str, tuple[str, ...]]] = field(init=False)
    reasons: tuple[str, ...] = field(init=False)
    plan_digest: str = field(init=False)

    def __post_init__(self):
        if type(self.fit) is not StudyFit or self.fit.status != 'COMPLETE' or type(self.completeness) is not ReservedCompleteness:
            _fail()
        if self.population not in ('primary', 'secondary') or self.sampling_premise not in ('assumed_unverified', 'unsupported'):
            _fail()
        _sha(self.freeze_reference)
        for ref in (self.objective_reference, self.constraint_reference, self.outcome_reference):
            _text(ref)
        calibration_panels = _tuple(self.calibration_panels, FrozenPanel, 20)
        future_panels = _tuple(self.future_panels, FrozenPanel, 20)
        if len(calibration_panels) != 20 or len(future_panels) != 20:
            _fail()
        combined = calibration_panels + future_panels
        _validate_reserved(tuple(p.panel for p in combined))
        if any(p.fit.fit_digest != self.fit.fit_digest for p in combined):
            _fail()
        if {p.panel.panel_id: p.panel for p in combined} != {p.panel_id: p for p in self.completeness.panels}:
            _fail()
        development = tuple(row.feature for row in self.fit.development)
        reserved = tuple(row for p in combined for row in p.panel.rows)
        _unique_features(development + reserved)
        if {r.source_group for r in development} & {p.panel.source_group for p in combined}:
            _fail()
        supplied = _map(self.calibration_targets)
        if set(supplied) != {p.panel.panel_id for p in calibration_panels}:
            _fail()
        targets = {}
        for frozen in calibration_panels:
            panel = frozen.panel
            rows = _target_map(supplied[panel.panel_id], tuple(r.record_id for r in panel.rows))
            if tuple(sorted(k for k, row in rows.items() if row.complete)) != self.completeness.complete_ids[panel.panel_id]:
                _fail('METADATA_LINKAGE_CONFLICT')
            targets[panel.panel_id] = tuple(rows.values())
        premise = self.sampling_premise
        if self.population == 'primary' and not self.completeness.all_defined:
            premise = 'unsupported'
        reasons = [('PRIMARY_ALL_40_ENDPOINTS_DEFINED' if self.completeness.all_defined else 'PRIMARY_ENDPOINTS_UNDEFINED')
                   if self.population == 'primary' else 'SECONDARY_COMPLETE_RECORD_POPULATION',
                   'SAMPLING_PREMISE_ASSUMED_UNVERIFIED' if premise == 'assumed_unverified' else 'SAMPLING_PREMISE_UNSUPPORTED']
        scenario = PROTOCOL_ID + '/' + self.population
        protocol = PoolProtocol(scenario, scenario, 'composition-source-balanced-5nn-v1',
            'predicted-feasible-first-ys-desc-v1', 'sha256-tie-then-original-ordinal-v1',
            'fixed40-uniform-permutation-20cal-20eval-v1', self.freeze_reference, SAMPLING_SCOPE,
            Scope(scenario, 'score', 'MPa', self.objective_reference),
            {'elongation': Scope(scenario, 'elongation', 'percentage_points', self.constraint_reference)}, premise)
        orders, generic_cal, ranked_future = {}, [], []
        for role, panels in (('calibration', calibration_panels), ('evaluation', future_panels)):
            for frozen in panels:
                panel = frozen.panel
                membership = ({r.record_id for r in panel.rows} if self.population == 'primary' else
                              set(self.completeness.complete_ids[panel.panel_id]))
                restricted = {key: tuple(x for x in order if x in membership) for key, order in frozen.orders.items()}
                orders[panel.panel_id] = MappingProxyType(restricted)
                # Bind source group, assigned draw ID, population and role explicitly.
                pid = scenario + '/' + role + '/' + panel.panel_id
                uid = scenario + '/source/' + panel.source_group
                ranked = RankedPanel(pid, uid, protocol.protocol_digest,
                    _identity('panel_inputs', freeze=self.freeze_reference, rank=frozen.rank_digest,
                              completeness=self.completeness.completeness_digest),
                    tuple(sorted(membership)), restricted['primary'])
                if role == 'calibration':
                    rows = tuple(PanelOutcome(row.record_id, None if row.yield_strength is None else -row.yield_strength,
                        {'elongation': None if row.elongation is None else add(self.fit.threshold, -row.elongation)})
                        for row in targets[panel.panel_id] if row.record_id in membership)
                    generic_cal.append(CalibrationPanel(ranked, PanelOutcomes(ranked.panel_digest, self.outcome_reference, rows)))
                else:
                    ranked_future.append(ranked)
        calibration = calibrate_panels(protocol, tuple(generic_cal), Fraction(1, 10))
        decisions = tuple(select_pool(calibration, panel) for panel in ranked_future)
        schedules = []
        for frozen, decision in zip(future_panels, decisions):
            panel_id = frozen.panel.panel_id
            snapshots = tuple(sorted(set(BUDGETS + (len(decision.retained),))))
            for policy in POLICIES:
                order = decision.retained if policy == 'stopped' else orders[panel_id][policy]
                reveals = order if policy == 'stopped' else order[:32]
                schedules.append(PolicySchedule(panel_id, policy, decision.decision_digest, order, reveals, snapshots))
        values = dict(calibration_panels=calibration_panels, future_panels=future_panels,
            calibration_targets=MappingProxyType(targets), protocol=protocol, calibration=calibration,
            ranked_future=tuple(ranked_future), decisions=decisions, schedules=tuple(schedules),
            orders=MappingProxyType(orders), reasons=tuple(reasons))
        for key, value in values.items():
            object.__setattr__(self, key, value)
        object.__setattr__(self, 'plan_digest', _identity('plan', fit=self.fit.fit_digest,
            calibration=calibration.calibration_digest, rank_inputs=tuple(p.rank_digest for p in combined),
            completeness=self.completeness.completeness_digest, freeze=self.freeze_reference,
            decisions=tuple(d.decision_digest for d in decisions), schedules=tuple(schedules),
            population=self.population, reasons=reasons))


def calibrate_population(fit, calibration_panels, calibration_targets, future_panels, completeness,
                         population, sampling_premise, freeze_reference, objective_reference,
                         constraint_reference, outcome_reference):
    return PopulationPlan(fit, calibration_panels, calibration_targets, future_panels, completeness,
        population, sampling_premise, freeze_reference, objective_reference, constraint_reference, outcome_reference)


@dataclass(frozen=True)
class PolicyRun:
    plan_digest: str
    panel_id: str
    policy_id: str
    decision_digest: str
    observations: tuple[Targets, ...]

    def __post_init__(self):
        _sha(self.plan_digest), _sha(self.decision_digest), _text(self.panel_id)
        if self.policy_id not in POLICIES:
            _fail('REPLAY_REQUEST_INVALID')
        observations = _tuple(self.observations, Targets, 25)
        if len({r.record_id for r in observations}) != len(observations):
            _fail('REPLAY_REQUEST_INVALID')
        object.__setattr__(self, 'observations', observations)


@dataclass(frozen=True)
class SetMetrics:
    actual_cost: int
    truth_status: str
    reason: str | None
    any_optimum_hit: int | None
    all_optima_retained: int | None
    feasible_hit: int | None
    best_feasible_yield_strength: Fraction | None
    regret: Fraction | None
    first_optimum_cost: int | None
    first_optimum_reason: str | None
    observed_known_feasible_count: int
    whole_universe_retained: bool


def _truth(rows, threshold):
    if not all(row.complete for row in rows):
        return 'UNKNOWN', None, None, 'TRUTH_UNKNOWN'
    if not rows:
        return 'COMPLETE', (), None, 'EMPTY_PANEL'
    feasible = tuple(row for row in rows if row.elongation >= threshold)
    if not feasible:
        return 'COMPLETE', (), None, 'NO_FEASIBLE_CANDIDATE'
    best = max(row.yield_strength for row in feasible)
    return 'COMPLETE', tuple(row.record_id for row in feasible if row.yield_strength == best), best, None


def _metrics(truth, revealed, threshold):
    status, optima, best, reason = _truth(truth, threshold)
    known = tuple(row for row in revealed if row.elongation is not None and row.elongation >= threshold)
    whole = {r.record_id for r in revealed} == {r.record_id for r in truth}
    if status == 'UNKNOWN':
        return SetMetrics(len(revealed), status, reason, None, None, None, None, None, None,
                          'TRUTH_UNKNOWN', len(known), whole)
    if not optima:
        return SetMetrics(len(revealed), status, reason, 0, 1, 0, None, None, None, reason, len(known), whole)
    revealed_ids = tuple(row.record_id for row in revealed)
    hit = int(bool(set(optima) & set(revealed_ids)))
    all_retained = int(set(optima) <= set(revealed_ids))
    first = next((i for i, name in enumerate(revealed_ids, 1) if name in optima), None)
    achieved = max((row.yield_strength for row in known), default=None)
    return SetMetrics(len(revealed), status, 'NO_FEASIBLE_REVEAL' if achieved is None else None,
        hit, all_retained, int(bool(known)), achieved, None if achieved is None else add(best, -achieved),
        first, 'NOT_REACHED' if first is None else None, len(known), whole)


@dataclass(frozen=True)
class PolicyAudit:
    policy_id: str
    snapshots: Mapping[int, SetMetrics]
    at_pool_cost: SetMetrics
    final: SetMetrics


@dataclass(frozen=True)
class PanelAudit:
    panel_id: str
    original_candidate_count: int
    candidate_count: int
    pool_size: int
    pool_fraction: Fraction | None
    pool_fraction_reason: str | None
    truth_status: str
    truth_reason: str | None
    feasible_count: int | None
    optimum_ids: tuple[str, ...] | None
    pool: SetMetrics
    policies: Mapping[str, PolicyAudit]


@dataclass(frozen=True)
class Rate:
    numerator: int
    denominator: int
    value: Fraction | None = field(init=False)

    def __post_init__(self):
        if type(self.numerator) is not int or type(self.denominator) is not int or not 0 <= self.numerator <= self.denominator:
            _fail()
        object.__setattr__(self, 'value', Fraction(self.numerator, self.denominator) if self.denominator else None)


@dataclass(frozen=True)
class PopulationReplay:
    plan: PopulationPlan
    runs: tuple[PolicyRun, ...]
    truth: Mapping[str, tuple[Targets, ...]]
    panels: tuple[PanelAudit, ...] = field(init=False)
    counts: Mapping[str, int] = field(init=False)
    macro_rates: Mapping[str, Rate] = field(init=False)
    policy_rates: Mapping[str, Mapping[int, Mapping[str, Rate]]] = field(init=False)
    costs: Mapping[str, int] = field(init=False)
    replay_digest: str = field(init=False)

    def __post_init__(self):
        if type(self.plan) is not PopulationPlan:
            _fail('STALE_OR_INVALID_DECISION')
        plan = self.plan
        if not isinstance(self.runs, (tuple, list)) or len(self.runs) != 480:
            _fail('REPLAY_INCOMPLETE')
        runs = _tuple(self.runs, PolicyRun, 480)
        lookup = {(r.panel_id, r.policy_id): r for r in runs}
        if len(runs) != 480 or len(lookup) != 480 or set(lookup) != {(s.panel_id, s.policy_id) for s in plan.schedules}:
            _fail('REPLAY_INCOMPLETE')
        truth = _map(self.truth)
        if set(truth) != {p.panel.panel_id for p in plan.future_panels}:
            _fail('REPLAY_INCOMPLETE')
        parsed = {}
        for frozen in plan.future_panels:
            panel = frozen.panel
            # Later auditor receives original primary truth even for secondary;
            # validates complete membership before restricting the population.
            rows = _target_map(truth[panel.panel_id], tuple(r.record_id for r in panel.rows))
            if tuple(sorted(name for name, row in rows.items() if row.complete)) != plan.completeness.complete_ids[panel.panel_id]:
                _fail('METADATA_LINKAGE_CONFLICT')
            parsed[panel.panel_id] = rows
        for schedule in plan.schedules:
            run = lookup[schedule.panel_id, schedule.policy_id]
            if run.plan_digest != plan.plan_digest or run.decision_digest != schedule.decision_digest:
                _fail('STALE_OR_INVALID_DECISION')
            if tuple(row.record_id for row in run.observations) != schedule.reveal_ids:
                _fail('REPLAY_REQUEST_INVALID')
            if any(parsed[schedule.panel_id][row.record_id] != row for row in run.observations):
                _fail('REPLAY_REQUEST_INVALID')
        audits = []
        for frozen, decision in zip(plan.future_panels, plan.decisions):
            panel_id = frozen.panel.panel_id
            rows_by_id = parsed[panel_id]
            rows = tuple(rows_by_id[name] for name in decision.original_ids)
            status, optima, _, reason = _truth(rows, plan.fit.threshold)
            k, m = len(decision.retained), len(rows)
            pool = _metrics(rows, tuple(rows_by_id[name] for name in decision.retained), plan.fit.threshold)
            policies = {}
            for policy in POLICIES:
                observed = lookup[panel_id, policy].observations
                snapshots = {cap: _metrics(rows, observed[:cap], plan.fit.threshold) for cap in BUDGETS}
                policies[policy] = PolicyAudit(policy, MappingProxyType(snapshots),
                    _metrics(rows, observed[:k], plan.fit.threshold), _metrics(rows, observed, plan.fit.threshold))
            audits.append(PanelAudit(panel_id, len(frozen.panel.rows), m, k, Fraction(k, m) if m else None,
                None if m else 'EMPTY_PANEL', status, reason,
                sum(row.elongation >= plan.fit.threshold for row in rows) if status == 'COMPLETE' else None,
                optima, pool, MappingProxyType(policies)))
        complete = tuple(p for p in audits if p.truth_status == 'COMPLETE')
        feasible = tuple(p for p in complete if p.feasible_count)
        counts = dict(assigned_panels=20, complete_panels=len(complete), unknown_panels=20 - len(complete),
            empty_panels=sum(p.candidate_count == 0 for p in audits),
            complete_infeasible_panels=sum(p.candidate_count > 0 and p.feasible_count == 0 for p in complete),
            feasible_panels=len(feasible), original_candidate_total=sum(p.original_candidate_count for p in audits),
            population_candidate_total=sum(p.candidate_count for p in audits), retained_candidate_total=sum(p.pool_size for p in audits),
            original_unknown_candidate_total=sum(not row.complete for rows in parsed.values() for row in rows.values()),
            population_unknown_candidate_total=sum(not parsed[frozen.panel.panel_id][name].complete
                for frozen, decision in zip(plan.future_panels, plan.decisions) for name in decision.original_ids))
        macro = {'pool_all_optima_feasible': Rate(sum(p.pool.all_optima_retained for p in feasible), len(feasible)),
                 'pool_all_optima_complete': Rate(sum(p.pool.all_optima_retained for p in complete), len(complete))}
        rates = {}
        for policy in POLICIES:
            by_cap = {}
            for cap in BUDGETS:
                by_cap[cap] = MappingProxyType({
                    'any_optimum_feasible': Rate(sum(p.policies[policy].snapshots[cap].any_optimum_hit for p in feasible), len(feasible)),
                    'all_optima_feasible': Rate(sum(p.policies[policy].snapshots[cap].all_optima_retained for p in feasible), len(feasible)),
                    'any_optimum_complete': Rate(sum(p.policies[policy].snapshots[cap].any_optimum_hit for p in complete), len(complete))})
            rates[policy] = MappingProxyType(by_cap)
        costs = dict(policy_bundle_requests=sum(len(run.observations) for run in runs),
            full_truth_unique_bundles=sum(len(rows) for rows in parsed.values()),
            scheduled_policy_runs=480, completed_policy_runs=len(runs))
        original_truth = MappingProxyType({key: tuple(rows.values()) for key, rows in parsed.items()})
        values = dict(runs=tuple(lookup[p.panel_id, name] for p in audits for name in POLICIES), truth=original_truth,
            panels=tuple(audits), counts=MappingProxyType(counts), macro_rates=MappingProxyType(macro),
            policy_rates=MappingProxyType(rates), costs=MappingProxyType(costs))
        for key, value in values.items():
            object.__setattr__(self, key, value)
        object.__setattr__(self, 'replay_digest', _identity('replay', plan=plan.plan_digest, **values))


def audit_replay(plan, runs, truth):
    """Audit sealed policy ledgers and later truth; this function is not a vault."""
    return PopulationReplay(plan, runs, truth)


def _gate_values(f, d, recalled, fractions, a, proc, obj, random, finite):
    """Arithmetic gates only; caller must bind statistics to a complete replay."""
    counts = (f, d, recalled, a, proc, obj, random)
    if any(type(x) is not int for x in counts) or not 0 <= d <= f <= 20:
        _fail()
    if not 0 <= recalled <= f or any(not 0 <= x <= d for x in (a, proc, obj)) or not 0 <= random <= 20*d:
        _fail()
    if not 0 <= _exact(fractions) <= f or type(finite) is not bool:
        _fail()
    margins = dict(adequacy=d - 10, pool_recall=10 * recalled - 9 * f if f else None,
        pool_size=add(Fraction(3 * f), -multiply(Fraction(4), fractions)) if f else None,
        ranking_random=20 * a - random - 2 * d if d else None,
        ranking_processing=a - proc if d else None, ranking_objective_only=a - obj if d else None)
    checks = dict(adequacy=d >= 10,
        pool_recall=f > 0 and margins['pool_recall'] >= 0,
        pool_size=f > 0 and margins['pool_size'] >= 0,
        pool_status=finite,
        ranking_random=d > 0 and margins['ranking_random'] >= 0,
        ranking_processing=d > 0 and margins['ranking_processing'] > 0,
        ranking_objective_only=d > 0 and margins['ranking_objective_only'] > 0)
    return margins, checks


@dataclass(frozen=True)
class StudyEvaluation:
    primary: PopulationReplay
    secondary: PopulationReplay
    denominators: Mapping[str, int] = field(init=False)
    margins: Mapping[str, int | Fraction | None] = field(init=False)
    gate_checks: Mapping[str, bool] = field(init=False)
    failed_gates: tuple[str, ...] = field(init=False)
    component_verdicts: Mapping[str, bool | None] = field(init=False)
    gate_reasons: Mapping[str, tuple[str, ...]] = field(init=False)
    component_reasons: Mapping[str, tuple[str, ...]] = field(init=False)
    overall_verdict: str = field(init=False)
    costs: Mapping[str, int] = field(init=False)
    evaluation_digest: str = field(init=False)

    def __post_init__(self):
        if type(self.primary) is not PopulationReplay or type(self.secondary) is not PopulationReplay:
            _fail('REPLAY_INCOMPLETE')
        p, s = self.primary.plan, self.secondary.plan
        if p.population != 'primary' or s.population != 'secondary':
            _fail()
        for attr in ('fit', 'calibration_panels', 'calibration_targets', 'future_panels', 'completeness',
                     'sampling_premise', 'freeze_reference', 'objective_reference', 'constraint_reference', 'outcome_reference'):
            if getattr(p, attr) != getattr(s, attr):
                _fail()
        if self.primary.truth != self.secondary.truth:
            _fail()
        feasible = tuple(panel for panel in self.secondary.panels if panel.feasible_count)
        discovery = tuple(panel for panel in feasible if panel.candidate_count >= 2)
        f, d = len(feasible), len(discovery)
        recalled = sum(panel.pool.all_optima_retained for panel in feasible)
        fractions = total(panel.pool_fraction for panel in feasible)
        a = sum(panel.policies['primary'].snapshots[4].any_optimum_hit for panel in discovery)
        proc = sum(panel.policies['processing'].snapshots[4].any_optimum_hit for panel in discovery)
        obj = sum(panel.policies['objective_only'].snapshots[4].any_optimum_hit for panel in discovery)
        random = sum(panel.policies['random_' + str(seed)].snapshots[4].any_optimum_hit for panel in discovery for seed in range(20))
        margins, checks = _gate_values(f, d, recalled, fractions, a, proc, obj, random, s.calibration.status == 'finite_conditional')
        codes = dict(adequacy='SECONDARY_DISCOVERY_PANELS_BELOW_10', pool_recall='POOL_RECALL_BELOW_9_10',
            pool_size='POOL_MEAN_FRACTION_ABOVE_3_4', pool_status='POOL_STATUS_NOT_FINITE_CONDITIONAL',
            ranking_random='RANKING_RANDOM_MARGIN_BELOW_1_10', ranking_processing='RANKING_NOT_ABOVE_PROCESSING',
            ranking_objective_only='RANKING_NOT_ABOVE_OBJECTIVE_ONLY')
        gate_reasons = {}
        for key, passed in checks.items():
            if passed:
                gate_reasons[key] = ()
            elif key in ('pool_recall', 'pool_size') and not f:
                gate_reasons[key] = ('NO_FEASIBLE_CANDIDATE',)
            elif key in ('ranking_random', 'ranking_processing', 'ranking_objective_only') and not d:
                gate_reasons[key] = ('SECONDARY_DISCOVERY_PANELS_BELOW_10',)
            else:
                gate_reasons[key] = (codes[key],)
        failed = tuple(dict.fromkeys(code for reasons in gate_reasons.values() for code in reasons))
        pool_keys = ('pool_recall', 'pool_size', 'pool_status')
        ranking_keys = ('ranking_random', 'ranking_processing', 'ranking_objective_only')
        components = dict(adequacy=checks['adequacy'], pool_usefulness=all(checks[k] for k in pool_keys) if f else None,
            ranking_usefulness=all(checks[k] for k in ranking_keys) if d else None, complete_execution=True)
        component_reasons = dict(adequacy=gate_reasons['adequacy'],
            pool_usefulness=tuple(dict.fromkeys(code for key in pool_keys for code in gate_reasons[key])),
            ranking_usefulness=tuple(dict.fromkeys(code for key in ranking_keys for code in gate_reasons[key])),
            complete_execution=())
        denominators = dict(assigned_panels_per_population=20, scheduled_policy_runs=960,
            feasible_secondary_panels=f, discovery_secondary_panels=d,
            discovery_secondary_panels_larger_than_four=sum(x.candidate_count > 4 for x in discovery),
            ranking_random_controls=20, pool_recall_numerator=recalled,
            ranking_primary_hits=a, ranking_processing_hits=proc, ranking_objective_only_hits=obj,
            ranking_random_hit_sum=random)
        costs = dict(development_unique_bundles=len(p.fit.development),
            calibration_unique_bundles=sum(len(rows) for rows in p.calibration_targets.values()),
            evaluation_unique_bundles=sum(len(rows) for rows in self.primary.truth.values()),
            policy_bundle_requests=self.primary.costs['policy_bundle_requests'] + self.secondary.costs['policy_bundle_requests'])
        values = dict(denominators=MappingProxyType(denominators), margins=MappingProxyType(margins),
            gate_checks=MappingProxyType(checks), failed_gates=failed, component_verdicts=MappingProxyType(components),
            gate_reasons=MappingProxyType(gate_reasons), component_reasons=MappingProxyType(component_reasons),
            overall_verdict='GO_DESIGN_INDEPENDENT_STUDY' if all(checks.values()) else 'NO_GO_ARCHIVAL_USEFULNESS',
            costs=MappingProxyType(costs))
        for key, value in values.items():
            object.__setattr__(self, key, value)
        object.__setattr__(self, 'evaluation_digest', _identity('evaluation', primary=self.primary.replay_digest,
            secondary=self.secondary.replay_digest, **values))


def evaluate_study(primary, secondary):
    return StudyEvaluation(primary, secondary)
