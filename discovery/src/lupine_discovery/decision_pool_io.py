"""Bounded exact wire for a conditional single-panel statistical pool.

All original calibration declarations are sealed. Future outcomes are separate
and never enter selection. This mode supplies no feasibility or regret claim.
"""
from dataclasses import dataclass
from fractions import Fraction

from . import __version__
from .coupled_io import _Numbers, _array, _checksum, _object, _preflight_value, _text, loads_coupled
from .decision_pool import (
    CalibrationPanel, PanelOutcome, PanelOutcomes, PoolProtocol, RankedPanel,
    assess_panel, calibrate_panels, select_pool,
)
from .evidence import Scope, digest, fields
from .serialization import encode


PROBLEM_SCHEMA = 'lupine.discovery.decision_pool_problem.v1'
OUTCOMES_SCHEMA = 'lupine.discovery.decision_pool_outcomes.v1'
CERTIFICATE_SCHEMA = 'lupine.discovery.decision_pool_certificate.v1'
REPLAY_SCHEMA = 'lupine.discovery.decision_pool_replay.v1'
PROFILE_ID = 'decision-pool-local-v1'
ADAPTER_VERSION = 'decision-pool-adapter-v1'
MAX_CALIBRATION_PANELS = 64
MAX_CANDIDATES_PER_PANEL = 64
MAX_TOTAL_CANDIDATES = 4096
MAX_CONSTRAINTS = 8
_PROTOCOL = ('protocol_id', 'scenario_id', 'ranker_id', 'ranking_rule_id', 'tie_rule_id',
             'generator_id', 'freeze_reference', 'sampling_scope', 'objective_scope',
             'constraint_scopes', 'premise_status')
_SCOPE = ('scenario_id', 'quantity', 'unit', 'reference')
_PANEL = ('panel_id', 'universe_id', 'feature_manifest_digest', 'candidate_ids', 'ranked_ids')
_ASSESSMENT = ('assessment_digest', 'status', 'reason', 'm', 'score', 'feasible', 'minimizers', 'missing')
_CALIBRATION = ('alpha', 'n', 'complete_count', 'k', 'threshold', 'status', 'premise_status',
                'reasons', 'guarantee_status', 'conditional_guarantee', 'calibration_digest')


def loads_decision_pool(raw):
    """Use the unchanged 256 KiB/depth24 exact JSON lexical profile."""
    return loads_coupled(raw)


def _scope_shape(value, scenario_id, quantity):
    fields(value, _SCOPE)
    for key in _SCOPE:
        _text(value[key], f'quantity scope {key}', 2048 if key == 'reference' else 128)
    if value['scenario_id'] != scenario_id or value['quantity'] != quantity:
        raise ValueError('quantity scope does not match the decision-pool protocol')


def _protocol_shape(value):
    fields(value, _PROTOCOL)
    for key in _PROTOCOL[:8]:
        _text(value[key], key, 2048 if key in ('freeze_reference', 'sampling_scope') else 128)
    if value['premise_status'] not in ('assumed_unverified', 'unsupported'):
        raise ValueError('premise status must remain assumed_unverified or unsupported')
    _scope_shape(value['objective_scope'], value['scenario_id'], 'score')
    constraints = _object(value['constraint_scopes'], 'constraint scopes', MAX_CONSTRAINTS)
    if 'score' in constraints:
        raise ValueError('score is reserved for the objective')
    for key, scope in constraints.items():
        _scope_shape(scope, value['scenario_id'], key)
    return set(constraints)


def _panel_shape(value):
    fields(value, _PANEL)
    _text(value['panel_id'], 'panel-draw ID')
    _text(value['universe_id'], 'universe ID')
    _checksum(value['feature_manifest_digest'], 'feature manifest digest')
    ids = _array(value['candidate_ids'], 'candidate IDs', MAX_CANDIDATES_PER_PANEL)
    ranks = _array(value['ranked_ids'], 'ranked IDs', MAX_CANDIDATES_PER_PANEL)
    for cid in (*ids, *ranks):
        _text(cid, 'candidate ID')
    if len(ids) != len(set(ids)):
        raise ValueError('duplicate candidate ID')
    if len(ranks) != len(ids) or set(ranks) != set(ids):
        raise ValueError('ranked IDs must be an exact permutation of candidate IDs')
    return tuple(sorted(ids))


def _outcome_shape(value, ids, constraints, numbers):
    fields(value, ('source_reference', 'rows'))
    _text(value['source_reference'], 'outcome source reference', 2048)
    rows = _array(value['rows'], 'outcome rows', MAX_CANDIDATES_PER_PANEL)
    seen = set()
    for row in rows:
        fields(row, ('candidate_id', 'score', 'constraints'))
        cid = _text(row['candidate_id'], 'outcome candidate ID')
        if cid in seen or cid not in ids:
            raise ValueError('unknown or duplicate outcome candidate ID')
        seen.add(cid)
        margins = _object(row['constraints'], 'outcome constraints', MAX_CONSTRAINTS)
        if set(margins) != constraints:
            raise ValueError('outcome constraint keys do not match the protocol scopes')
        for scalar in (row['score'], *margins.values()):
            if scalar is not None:
                numbers.token(scalar)
    if seen != set(ids):
        raise ValueError('every candidate requires an explicit outcome row; use null for unknown labels')


def _panel(value, protocol):
    return RankedPanel(value['panel_id'], value['universe_id'], protocol.protocol_digest,
                       value['feature_manifest_digest'], tuple(value['candidate_ids']), tuple(value['ranked_ids']))


def _outcomes(value, panel, numbers):
    scalar = lambda value: None if value is None else numbers.get(value)
    return PanelOutcomes(panel.panel_digest, value['source_reference'],
        tuple(PanelOutcome(row['candidate_id'], scalar(row['score']),
                           {key: scalar(value) for key, value in row['constraints'].items()})
              for row in value['rows']))


@dataclass(frozen=True)
class ParsedDecisionPoolProblem:
    protocol: PoolProtocol
    calibration_panels: tuple[CalibrationPanel, ...]
    alpha: Fraction
    future_panel: RankedPanel
    problem_digest: str


def parse_decision_pool_problem(value):
    """Check the entire bounded experiment before any exact conversion or selection."""
    _preflight_value(value)
    fields(value, ('schema', 'protocol', 'alpha', 'calibration_panels', 'future_panel'), ('description',))
    if value['schema'] != PROBLEM_SCHEMA:
        raise ValueError('unsupported decision-pool problem schema')
    if 'description' in value and type(value['description']) is not str:
        raise ValueError('description must be a string')
    constraints = _protocol_shape(value['protocol'])
    cases = _array(value['calibration_panels'], 'calibration panels', MAX_CALIBRATION_PANELS)
    # Count expansion and validate identities before Fraction construction.
    panels = []
    for case in cases:
        fields(case, ('panel', 'outcomes'))
        panels.append(case['panel'])
    panels.append(value['future_panel'])
    memberships, draws, count = {}, set(), 0
    for item in panels:
        ids = _panel_shape(item)
        count += len(ids)
        if count > MAX_TOTAL_CANDIDATES:
            raise ValueError('total calibration and future candidate count exceeds 4096')
        if item['panel_id'] in draws:
            raise ValueError('duplicate panel-draw ID, including the future panel')
        draws.add(item['panel_id'])
        previous = memberships.setdefault(item['universe_id'], ids)
        if previous != ids:
            raise ValueError('one universe ID has conflicting candidate membership')
    numbers = _Numbers()
    numbers.token(value['alpha'])
    for case in cases:
        _outcome_shape(case['outcomes'], case['panel']['candidate_ids'], constraints, numbers)
    numbers.convert()
    source = value['protocol']
    protocol = PoolProtocol(**{key: source[key] for key in _PROTOCOL
                               if key not in ('objective_scope', 'constraint_scopes')},
                            objective_scope=Scope(**source['objective_scope']),
                            constraint_scopes={key: Scope(**scope) for key, scope in source['constraint_scopes'].items()})
    parsed_cases = []
    for case in cases:
        panel = _panel(case['panel'], protocol)
        parsed_cases.append(CalibrationPanel(panel, _outcomes(case['outcomes'], panel, numbers)))
    alpha = numbers.get(value['alpha'])
    if not 0 < alpha < 1:
        raise ValueError('alpha must be strictly between zero and one')
    return ParsedDecisionPoolProblem(protocol, tuple(parsed_cases), alpha,
                                     _panel(value['future_panel'], protocol), digest(value))


def _selection_receipt(parsed):
    calibration = calibrate_panels(parsed.protocol, parsed.calibration_panels, parsed.alpha)
    decision = select_pool(calibration, parsed.future_panel)
    entries = []
    for case, assessment in zip(calibration.panels, calibration.scores):
        entries.append({'panel': case.panel, 'outcomes': case.outcomes,
            'assessment': {'panel_digest': case.panel.panel_digest,
                           'outcomes_digest': case.outcomes.outcomes_digest,
                           **{key: getattr(assessment, key) for key in _ASSESSMENT}}})
    retained = set(decision.retained)
    selection = {key: getattr(decision, key) for key in (
        'm', 'original_ids', 'retained', 'threshold', 'calibration_status', 'premise_status',
        'reasons', 'guarantee_status', 'conditional_guarantee', 'decision_digest')}
    selection.update(ranked_ids=parsed.future_panel.ranked_ids,
                     not_retained=tuple(cid for cid in parsed.future_panel.ranked_ids if cid not in retained),
                     retained_count=len(retained),
                     retained_fraction=Fraction(len(retained), decision.m) if decision.m else None)
    payload = encode({'schema': CERTIFICATE_SCHEMA, 'engine_version': __version__,
        'adapter_version': ADAPTER_VERSION, 'profile_id': PROFILE_ID,
        'scenario_id': parsed.protocol.scenario_id, 'problem_digest': parsed.problem_digest,
        'protocol': parsed.protocol,
        'calibration': {**{key: getattr(calibration, key) for key in _CALIBRATION}, 'panels': entries},
        'future_panel': parsed.future_panel, 'selection': selection,
        'assumptions': decision.assumptions, 'physical_attestation': decision.physical_attestation})
    return {**payload, 'certificate_digest': digest(payload)}


def decision_pool_certificate(value):
    return _selection_receipt(parse_decision_pool_problem(value))


def parse_decision_pool_outcomes(value, parsed, problem_digest, certificate_digest):
    _preflight_value(value)
    fields(value, ('schema', 'scenario_id', 'problem_digest', 'certificate_digest',
                   'panel_digest', 'source_reference', 'rows'))
    if value['schema'] != OUTCOMES_SCHEMA:
        raise ValueError('unsupported decision-pool outcomes schema')
    if not isinstance(parsed, ParsedDecisionPoolProblem):
        raise TypeError('expected ParsedDecisionPoolProblem')
    for key in ('problem_digest', 'certificate_digest', 'panel_digest'):
        _checksum(value[key], key)
    if (value['scenario_id'] != parsed.protocol.scenario_id or value['problem_digest'] != problem_digest
            or value['certificate_digest'] != certificate_digest
            or value['panel_digest'] != parsed.future_panel.panel_digest):
        raise ValueError('future outcomes do not match the sealed original decision-pool experiment')
    source = {'source_reference': value['source_reference'], 'rows': value['rows']}
    numbers = _Numbers()
    _outcome_shape(source, parsed.future_panel.candidate_ids, set(parsed.protocol.constraint_scopes), numbers)
    numbers.convert()
    return _outcomes(source, parsed.future_panel, numbers)


def _outcome_audit(parsed, outcomes, receipt):
    assessment = assess_panel(parsed.protocol, parsed.future_panel, outcomes)
    selection = receipt['selection']
    retained = set(selection['retained'])
    complete = assessment.status == 'complete'
    feasible = bool(assessment.feasible) if complete else None
    minimizers = assessment.minimizers
    optimum = next((row.score for row in outcomes.rows if minimizers and row.candidate_id in minimizers), None)
    lost = tuple(cid for cid in minimizers if cid not in retained) if complete else None
    all_retained = not lost if complete else None
    if not complete:
        test = 'unknown_incomplete_truth'
    elif not assessment.m:
        test = 'vacuous_empty_universe'
    elif not feasible:
        test = 'vacuous_no_feasible_candidate'
    else:
        test = 'feasible_success' if all_retained else 'feasible_failure'
    threshold = selection['threshold']
    threshold_event = (assessment.score <= Fraction(threshold)) if complete and threshold is not None else None
    return {
        'assessment_digest': assessment.assessment_digest, 'status': assessment.status,
        'reason': assessment.reason, 'm': assessment.m, 'missing': assessment.missing,
        'reported_feasible_ids': assessment.feasible, 'true_minimizer_ids': minimizers,
        'true_optimum_value': optimum, 'worst_minimizer_rank_fraction': assessment.score,
        'has_feasible_candidate': feasible, 'all_true_minimizers_retained': all_retained,
        'lost_minimizer_ids': lost, 'retention_test': test, 'threshold_event_holds': threshold_event,
        'retained_count': selection['retained_count'], 'retained_fraction': selection['retained_fraction'],
    }


def decision_pool_replay_report(value, outcomes_or_zero_argument_loader):
    parsed = parse_decision_pool_problem(value)
    receipt = _selection_receipt(parsed)
    raw = outcomes_or_zero_argument_loader() if callable(outcomes_or_zero_argument_loader) else outcomes_or_zero_argument_loader
    outcomes = parse_decision_pool_outcomes(raw, parsed, receipt['problem_digest'], receipt['certificate_digest'])
    payload = encode({'schema': REPLAY_SCHEMA, 'engine_version': __version__,
        'problem_digest': receipt['problem_digest'], 'certificate_digest': receipt['certificate_digest'],
        'outcomes_digest': digest(raw), 'decision': {'certificate': receipt, 'selection': receipt['selection']},
        'reported_outcomes': outcomes, 'outcome_audit': _outcome_audit(parsed, outcomes, receipt),
        'interpretation': [
            'This audit compares the actual fixed pool with supplied finite-panel outcomes, not attested physical truth.',
            'A realized loss is possible under the marginal theorem; one success or failure alone does not verify or refute exchangeability.',
            'The claim concerns a procedure marginally over calibration and one future panel, not a verified probability for this realized pool.',
            'Vacuous empty or infeasible panels are separate from feasible-panel successes; no aggregate coverage is inferred.',
        ],
        'physical_attestation': 'not_established_by_this_program'})
    return {**payload, 'replay_digest': digest(payload)}
