"""Exact direct panel calibration under an explicitly unverified score law.

This is a Python-only statistical contract, separate from interval/coupled
certificates. Rankings are supplied permutations, never inferred from truth.
The single-panel marginal claim does not attest a population, a material, or
coverage conditional on a realized calibration set. No fitting or solver runs.
"""
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from fractions import Fraction
import re
from types import MappingProxyType

from .core import exact
from .evidence import Scope, digest, nonempty
from .serialization import encode


PREMISES = (
    'Calibration and one future panel score are exchangeable under an additive probability law.',
    'The ranker, features, tie rule, generator, risk budget and calibration count were frozen independently of calibration labels.',
    'Complete recorded outcomes represent the declared objective and constraints in the stated panel population.',
    'The statement is marginal over calibration and one future panel, not conditional on calibration, feasibility, family or a candidate.',
)
CONDITIONAL_GUARANTEE = (
    'Under the stated unverified premises, the probability that this procedure retains '
    'all true feasible tied minimizers of one future finite panel is at least 1-alpha.'
)
PHYSICAL_ATTESTATION = 'not_established_by_this_program'


def _sequence(value, label):
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes, bytearray)):
        raise TypeError(f'{label} must be a finite sequence')
    return tuple(value)


def _mapping(value, label):
    if not isinstance(value, Mapping):
        raise TypeError(f'{label} must be a mapping')
    for key in value:
        nonempty(key, f'{label} key')
    return {key: value[key] for key in sorted(value)}


def _checksum(value, label):
    if not isinstance(value, str) or re.fullmatch('[0-9a-f]{64}', value) is None:
        raise ValueError(f'{label} must be a lowercase SHA-256 digest')
    return value


def _identity(kind, **values):
    return digest(encode({'contract': 'decision_pool.python.v1', 'kind': kind, **values}))


def _require(value, cls, label):
    if not isinstance(value, cls):
        raise TypeError(f'{label} must be {cls.__name__}')


def _check_scope(scope, scenario_id, quantity):
    _require(scope, Scope, 'quantity scope')
    for name in ('scenario_id', 'quantity', 'unit', 'reference'):
        nonempty(getattr(scope, name), f'scope {name}')
    if scope.scenario_id != scenario_id or scope.quantity != quantity:
        raise ValueError('quantity scope does not match the protocol')


@dataclass(frozen=True)
class PoolProtocol:
    protocol_id: str
    scenario_id: str
    ranker_id: str
    ranking_rule_id: str
    tie_rule_id: str
    generator_id: str
    freeze_reference: str
    sampling_scope: str
    objective_scope: Scope
    constraint_scopes: Mapping[str, Scope]
    premise_status: str = 'assumed_unverified'
    protocol_digest: str = field(init=False)

    def __post_init__(self):
        names = ('protocol_id', 'scenario_id', 'ranker_id', 'ranking_rule_id',
                 'tie_rule_id', 'generator_id', 'freeze_reference', 'sampling_scope')
        for name in names:
            nonempty(getattr(self, name), name)
        scopes = _mapping(self.constraint_scopes, 'constraint scopes')
        if 'score' in scopes:
            raise ValueError('score is reserved for the objective')
        _check_scope(self.objective_scope, self.scenario_id, 'score')
        for key, scope in scopes.items():
            _check_scope(scope, self.scenario_id, key)
        if self.premise_status not in ('assumed_unverified', 'unsupported'):
            raise ValueError('premise status must remain assumed_unverified or unsupported')
        object.__setattr__(self, 'constraint_scopes', MappingProxyType(scopes))
        identity = _identity('protocol', **{name: getattr(self, name) for name in names},
                             objective_scope=self.objective_scope, constraint_scopes=scopes,
                             premise_status=self.premise_status)
        object.__setattr__(self, 'protocol_digest', identity)


@dataclass(frozen=True)
class RankedPanel:
    panel_id: str
    universe_id: str
    protocol_digest: str
    feature_manifest_digest: str
    candidate_ids: tuple[str, ...]
    ranked_ids: tuple[str, ...]
    panel_digest: str = field(init=False)

    def __post_init__(self):
        nonempty(self.panel_id, 'panel ID')
        nonempty(self.universe_id, 'universe ID')
        _checksum(self.protocol_digest, 'protocol digest')
        _checksum(self.feature_manifest_digest, 'feature manifest digest')
        ids = _sequence(self.candidate_ids, 'candidate IDs')
        ranked = _sequence(self.ranked_ids, 'ranked IDs')
        for value in (*ids, *ranked):
            nonempty(value, 'candidate ID')
        if len(set(ids)) != len(ids):
            raise ValueError('duplicate candidate ID')
        if len(ranked) != len(ids) or set(ranked) != set(ids):
            raise ValueError('ranked IDs must be an exact permutation of the universe')
        ids = tuple(sorted(ids))
        object.__setattr__(self, 'candidate_ids', ids)
        object.__setattr__(self, 'ranked_ids', ranked)
        identity = _identity('panel', panel_id=self.panel_id, universe_id=self.universe_id,
                             protocol_digest=self.protocol_digest,
                             feature_manifest_digest=self.feature_manifest_digest,
                             candidate_ids=ids, ranked_ids=ranked)
        object.__setattr__(self, 'panel_digest', identity)


@dataclass(frozen=True)
class PanelOutcome:
    candidate_id: str
    score: Fraction | None
    constraints: Mapping[str, Fraction | None]

    def __post_init__(self):
        nonempty(self.candidate_id, 'outcome candidate ID')
        score = None if self.score is None else exact(self.score)
        constraints = _mapping(self.constraints, 'outcome constraints')
        if 'score' in constraints:
            raise ValueError('score is reserved for the objective')
        constraints = {key: None if value is None else exact(value)
                       for key, value in constraints.items()}
        object.__setattr__(self, 'score', score)
        object.__setattr__(self, 'constraints', MappingProxyType(constraints))


@dataclass(frozen=True)
class PanelOutcomes:
    panel_digest: str
    source_reference: str
    rows: tuple[PanelOutcome, ...]
    outcomes_digest: str = field(init=False)

    def __post_init__(self):
        _checksum(self.panel_digest, 'outcomes panel digest')
        nonempty(self.source_reference, 'outcome source reference')
        rows = _sequence(self.rows, 'outcome rows')
        for row in rows:
            _require(row, PanelOutcome, 'outcome row')
        if len({row.candidate_id for row in rows}) != len(rows):
            raise ValueError('duplicate outcome candidate ID')
        rows = tuple(sorted(rows, key=lambda row: row.candidate_id))
        object.__setattr__(self, 'rows', rows)
        identity = _identity('outcomes', panel_digest=self.panel_digest,
                             source_reference=self.source_reference, rows=rows)
        object.__setattr__(self, 'outcomes_digest', identity)


@dataclass(frozen=True)
class CalibrationPanel:
    panel: RankedPanel
    outcomes: PanelOutcomes

    def __post_init__(self):
        _require(self.panel, RankedPanel, 'calibration panel')
        _require(self.outcomes, PanelOutcomes, 'calibration outcomes')
        if self.outcomes.panel_digest != self.panel.panel_digest:
            raise ValueError('outcomes do not match the exact ranked panel')
        if tuple(row.candidate_id for row in self.outcomes.rows) != self.panel.candidate_ids:
            raise ValueError('outcomes must contain exactly the panel candidate IDs')


def _validate_panel(protocol, panel, outcomes=None):
    _require(protocol, PoolProtocol, 'protocol')
    _require(panel, RankedPanel, 'panel')
    if panel.protocol_digest != protocol.protocol_digest:
        raise ValueError('panel does not match the frozen protocol')
    if outcomes is not None:
        CalibrationPanel(panel, outcomes)
        expected = set(protocol.constraint_scopes)
        if any(set(row.constraints) != expected for row in outcomes.rows):
            raise ValueError('outcome constraint keys do not match the protocol scopes')


@dataclass(frozen=True)
class PanelScore:
    protocol: PoolProtocol
    panel: RankedPanel
    outcomes: PanelOutcomes
    status: str = field(init=False)
    reason: str = field(init=False)
    m: int = field(init=False)
    score: Fraction | None = field(init=False)
    feasible: tuple[str, ...] | None = field(init=False)
    minimizers: tuple[str, ...] | None = field(init=False)
    missing: tuple[tuple[str, str], ...] = field(init=False)
    assessment_digest: str = field(init=False)

    def __post_init__(self):
        _require(self.outcomes, PanelOutcomes, 'panel outcomes')
        _validate_panel(self.protocol, self.panel, self.outcomes)
        rows = self.outcomes.rows
        missing = tuple((row.candidate_id, key) for row in rows
                        for key, value in (('score', row.score), *row.constraints.items())
                        if value is None)
        m = len(self.panel.candidate_ids)
        if missing:
            status, reason = 'incomplete', 'missing_truth'
            score = feasible = minimizers = None
        else:
            status = 'complete'
            feasible_rows = tuple(row for row in rows if all(g <= 0 for g in row.constraints.values()))
            feasible = tuple(row.candidate_id for row in feasible_rows)
            if feasible_rows:
                best = min(row.score for row in feasible_rows)
                minimizers = tuple(row.candidate_id for row in feasible_rows if row.score == best)
                ranks = {name: index for index, name in enumerate(self.panel.ranked_ids, 1)}
                score = Fraction(max(ranks[name] for name in minimizers), m)
                reason = 'feasible_minimizers'
            else:
                minimizers, score = (), Fraction(0)
                reason = 'empty_universe' if m == 0 else 'no_feasible_candidate'
        values = dict(status=status, reason=reason, m=m, score=score, feasible=feasible,
                      minimizers=minimizers, missing=missing)
        for name, value in values.items():
            object.__setattr__(self, name, value)
        identity = _identity('assessment', protocol_digest=self.protocol.protocol_digest,
                             panel_digest=self.panel.panel_digest,
                             outcomes_digest=self.outcomes.outcomes_digest, **values)
        object.__setattr__(self, 'assessment_digest', identity)


def assess_panel(protocol, panel, outcomes) -> PanelScore:
    """Derive the worst rank of every true tied optimum from complete outcomes."""
    return PanelScore(protocol, panel, outcomes)


def _universe_bindings(panels):
    bindings = {}
    for panel in panels:
        previous = bindings.setdefault(panel.universe_id, panel.candidate_ids)
        if previous != panel.candidate_ids:
            raise ValueError('one universe ID has conflicting candidate membership')
    return bindings


@dataclass(frozen=True)
class PoolCalibration:
    protocol: PoolProtocol
    panels: tuple[CalibrationPanel, ...]
    alpha: Fraction
    scores: tuple[PanelScore, ...] = field(init=False)
    n: int = field(init=False)
    complete_count: int = field(init=False)
    k: int = field(init=False)
    threshold: Fraction | None = field(init=False)
    premise_status: str = field(init=False)
    status: str = field(init=False)
    reasons: tuple[str, ...] = field(init=False)
    guarantee_status: str = field(init=False)
    conditional_guarantee: str | None = field(init=False)
    assumptions: tuple[str, ...] = field(default=PREMISES, init=False)
    physical_attestation: str = field(default=PHYSICAL_ATTESTATION, init=False)
    calibration_digest: str = field(init=False)

    def __post_init__(self):
        _require(self.protocol, PoolProtocol, 'protocol')
        alpha = exact(self.alpha)
        if not 0 < alpha < 1:
            raise ValueError('alpha must be strictly between zero and one')
        panels = _sequence(self.panels, 'calibration panels')
        for case in panels:
            _require(case, CalibrationPanel, 'calibration record')
        if len({case.panel.panel_id for case in panels}) != len(panels):
            raise ValueError('duplicate calibration panel-draw ID')
        _universe_bindings(case.panel for case in panels)
        scores = tuple(assess_panel(self.protocol, case.panel, case.outcomes) for case in panels)
        n = len(panels)
        complete = sum(item.status == 'complete' for item in scores)
        rank_value = (n + 1) * (1 - alpha)
        k = -(-rank_value.numerator // rank_value.denominator)
        reasons = []
        if self.protocol.premise_status == 'unsupported':
            reasons.append('unsupported_sampling_premise')
        if complete != n:
            reasons.append('incomplete_calibration_truth')
        if k > n:
            reasons.append('required_rank_exceeds_calibration_count')
        threshold = None
        if self.protocol.premise_status == 'unsupported':
            status = 'unsupported_premise'
        elif complete != n:
            status = 'incomplete_calibration'
        elif k > n:
            status, threshold = 'insufficient_calibration', Fraction(1)
        else:
            status = 'finite_conditional'
            threshold = sorted(item.score for item in scores)[k - 1]
            reasons.append('finite_order_statistic_under_unverified_premises')
            if threshold == 1:
                reasons.append('no_pool_reduction')
        guarantee = ('conditional_single_panel_marginal' if status == 'finite_conditional' else
                     'deterministic_all_universe' if status == 'insufficient_calibration' else
                     'no_calibrated_guarantee')
        conditional = CONDITIONAL_GUARANTEE if status == 'finite_conditional' else None
        values = dict(n=n, complete_count=complete, k=k, threshold=threshold,
                      premise_status=self.protocol.premise_status, status=status,
                      reasons=tuple(reasons), guarantee_status=guarantee,
                      conditional_guarantee=conditional)
        object.__setattr__(self, 'alpha', alpha)
        object.__setattr__(self, 'panels', panels)
        object.__setattr__(self, 'scores', scores)
        for name, value in values.items():
            object.__setattr__(self, name, value)
        identity = _identity('calibration', protocol_digest=self.protocol.protocol_digest,
                             panel_assessments=tuple(item.assessment_digest for item in scores),
                             alpha=alpha, assumptions=self.assumptions,
                             physical_attestation=self.physical_attestation, **values)
        object.__setattr__(self, 'calibration_digest', identity)


def calibrate_panels(protocol, panels, alpha) -> PoolCalibration:
    """Validate every original record; missing labels never shrink the sample."""
    return PoolCalibration(protocol, panels, alpha)


@dataclass(frozen=True)
class PoolDecision:
    calibration: PoolCalibration
    panel: RankedPanel
    m: int = field(init=False)
    original_ids: tuple[str, ...] = field(init=False)
    retained: tuple[str, ...] = field(init=False)
    calibration_status: str = field(init=False)
    premise_status: str = field(init=False)
    threshold: Fraction | None = field(init=False)
    reasons: tuple[str, ...] = field(init=False)
    guarantee_status: str = field(init=False)
    conditional_guarantee: str | None = field(init=False)
    assumptions: tuple[str, ...] = field(default=PREMISES, init=False)
    physical_attestation: str = field(default=PHYSICAL_ATTESTATION, init=False)
    decision_digest: str = field(init=False)

    def __post_init__(self):
        _require(self.calibration, PoolCalibration, 'calibration')
        calibration, panel = self.calibration, self.panel
        _validate_panel(calibration.protocol, panel)
        if panel.panel_id in {case.panel.panel_id for case in calibration.panels}:
            raise ValueError('future panel-draw ID was already used for calibration')
        _universe_bindings((*[case.panel for case in calibration.panels], panel))
        m = len(panel.candidate_ids)
        reasons = list(calibration.reasons)
        if calibration.status == 'finite_conditional':
            retained = tuple(name for rank, name in enumerate(panel.ranked_ids, 1)
                             if rank <= m * calibration.threshold)
        else:
            retained = panel.ranked_ids
            reasons.append('retained_all_' + calibration.status)
        if m == 0:
            reasons.append('future_universe_empty')
        elif not retained:
            reasons.append('statistical_empty_pool')
        elif len(retained) == m and 'no_pool_reduction' not in reasons:
            reasons.append('no_pool_reduction')
        values = dict(m=m, original_ids=panel.candidate_ids, retained=retained,
                      calibration_status=calibration.status, premise_status=calibration.premise_status,
                      threshold=calibration.threshold, reasons=tuple(reasons),
                      guarantee_status=calibration.guarantee_status,
                      conditional_guarantee=calibration.conditional_guarantee)
        for name, value in values.items():
            object.__setattr__(self, name, value)
        identity = _identity('decision', calibration_digest=calibration.calibration_digest,
                             panel_digest=panel.panel_digest, assumptions=self.assumptions,
                             physical_attestation=self.physical_attestation, **values)
        object.__setattr__(self, 'decision_digest', identity)


def select_pool(calibration, future_panel) -> PoolDecision:
    """Select the actual pool with no access to any future outcome record."""
    return PoolDecision(calibration, future_panel)
