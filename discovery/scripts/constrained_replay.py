#!/usr/bin/env python3
"""Guarded retrospective replay of the frozen JARVIS constrained protocol.

Only the receipt-verifying entry point opens archive targets. Acquisition sees
frozen metadata/predictions and its own immutable reveal history. Full-target
metrics run after every policy has completed its independent reveal budget.
"""
from __future__ import annotations

import argparse
from collections.abc import Mapping
from dataclasses import dataclass
from fractions import Fraction
import hashlib
import importlib
import json
from math import comb
from pathlib import Path
import platform
import sys
from time import monotonic, process_time
from types import MappingProxyType

from lupine_discovery.calibration import plan_calibration
from lupine_discovery.core import Candidate, Interval, exact, select
from lupine_discovery.serialization import encode, loads


PROTOCOL_ID = 'jarvis-gap-formation-v1'
BUDGETS = (0, 1, 2, 4, 8, 20)
POLICIES = ('interval', 'nominal_5nn', 'nearest_1nn') + tuple(f'random_{i}' for i in range(100))
COMPARATORS = ('nominal_5nn', 'nearest_1nn', 'random_0')
ROOT = Path(__file__).resolve().parents[1]
PREMISE_STATUS = 'assumed_unverified'
COMPUTATION_BUDGET_SECONDS = 3600


def canonical_bytes(value):
    return json.dumps(encode(value), sort_keys=True, separators=(',', ':'),
                      ensure_ascii=False, allow_nan=False).encode('utf-8')


def digest(value):
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def H(tag, text):
    return hashlib.sha256(f'{PROTOCOL_ID}\n{tag}\n{text}'.encode('utf-8')).digest()


def _ratio(numerator, denominator):
    return str(Fraction(numerator, denominator)) if denominator else None


def _mean(values):
    return str(sum(values, Fraction(0)) / len(values)) if values else None


def _median(values):
    ordered = sorted(values)
    if not ordered:
        return None
    index = len(ordered) // 2
    return ordered[index] if len(ordered) % 2 else (ordered[index-1] + ordered[index]) / 2


def _fraction(value):
    return exact(value)


@dataclass(frozen=True)
class FrozenCandidate:
    jid: str
    predicted_gap: Fraction
    predicted_formation: Fraction
    nearest_gap: Fraction
    nearest_formation: Fraction
    score: Interval | None
    formation: Interval | None


@dataclass(frozen=True)
class FrozenPanel:
    panel_id: str
    role: str
    operational_status: str
    candidates: tuple[FrozenCandidate, ...]
    nominal_order: tuple[str, ...]
    nearest_order: tuple[str, ...]
    random_orders: tuple[tuple[str, ...], ...]

    @property
    def ids(self):
        return tuple(candidate.jid for candidate in self.candidates)


def parse_panels(freeze):
    """Validate frozen orders without consulting targets or label missingness."""
    if freeze.get('protocol_id') != PROTOCOL_ID:
        raise ValueError('unexpected constrained protocol ID')
    calibration = freeze['calibration']
    plan = plan_calibration(calibration['count'], 20, Fraction(1, 10), target_count=2)
    if calibration['rank'] != plan.rank or calibration['candidate_count'] != 20 \
            or calibration['target_count'] != 2 or _fraction(calibration['delta']) != Fraction(1, 10) \
            or _fraction(calibration['epsilon']) != Fraction(1, 400) \
            or calibration['outcome_kind'] != plan.outcome_kind:
        raise ValueError('frozen calibration differs from the fixed 20-candidate two-target allocation')
    radii = tuple(None if calibration[key] is None else _fraction(calibration[key])
                  for key in ('gap_radius', 'formation_radius'))
    if plan.outcome_kind == 'finite' and any(value is None or value < 0 for value in radii):
        raise ValueError('finite calibration requires two nonnegative radii')
    if plan.outcome_kind == 'unbounded' and any(value is not None for value in radii):
        raise ValueError('insufficient calibration cannot use clamped finite radii')
    result, seen_panels, seen_jids = [], set(), set()
    for row in freeze['panels']:
        panel_id, role, status = row['id'], row['role'], row['operational_status']
        if role not in ('primary', 'shift') or panel_id in seen_panels:
            raise ValueError('invalid or duplicate panel identity')
        if not isinstance(panel_id, str) or not panel_id.startswith(role + '-'):
            raise ValueError('panel ID does not match its role')
        expected_status = ('abstain_unsupported_scope',) if role == 'shift' else (
            'conditional_finite', 'abstain_unbounded')
        if status not in expected_status:
            raise ValueError('scope does not permit this operational status')
        candidates = []
        for value in row['candidates']:
            required = {'jid', 'predicted_gap', 'predicted_formation', 'nearest_gap', 'nearest_formation',
                        'score_interval', 'constraint_interval'}
            if not required <= set(value) or not set(value) <= required | {'neighbors'}:
                raise ValueError('candidate fields exceed the frozen prediction allowlist')
            if 'neighbors' in value and (not isinstance(value['neighbors'], list)
                                        or len(value['neighbors']) != 5
                                        or any(not isinstance(jid, str) or not jid.startswith('JVASP-')
                                               or not jid[6:].isdigit() for jid in value['neighbors'])):
                raise ValueError('frozen nearest-neighbor metadata must contain five training JIDs')
            jid = value['jid']
            if not isinstance(jid, str) or not jid.startswith('JVASP-') or not jid[6:].isdigit():
                raise ValueError('invalid candidate JID')
            if jid in seen_jids:
                raise ValueError('candidate crosses panels or has a duplicate JID')
            score_data, formation_data = value['score_interval'], value['constraint_interval']
            if (score_data is None) != (formation_data is None):
                raise ValueError('both interval targets must be finite or both unbounded')
            if score_data is not None and (not isinstance(score_data, list) or len(score_data) != 2
                                          or not isinstance(formation_data, list)
                                          or len(formation_data) != 2):
                raise ValueError('finite intervals need exactly two endpoints')
            score = None if score_data is None else Interval(*score_data)
            formation = None if formation_data is None else Interval(*formation_data)
            predicted_gap, predicted_formation = _fraction(value['predicted_gap']), _fraction(value['predicted_formation'])
            if plan.outcome_kind == 'finite':
                if score != Interval(-predicted_gap-radii[0], -predicted_gap+radii[0]) \
                        or formation != Interval(predicted_formation-radii[1], predicted_formation+radii[1]):
                    raise ValueError('candidate intervals do not match frozen predictions and radii')
            elif score is not None:
                raise ValueError('unbounded calibration cannot supply diagnostic finite intervals')
            if status == 'conditional_finite' and score is None:
                raise ValueError('finite primary selection requires finite intervals')
            if status == 'abstain_unbounded' and score is not None:
                raise ValueError('unbounded primary state cannot contain finite intervals')
            candidates.append(FrozenCandidate(jid, predicted_gap, predicted_formation,
                                              _fraction(value['nearest_gap']),
                                              _fraction(value['nearest_formation']), score, formation))
            seen_jids.add(jid)
        if len(candidates) != 20:
            raise ValueError('each frozen evaluation panel must contain exactly 20 candidates')
        nominal = tuple(candidate.jid for candidate in sorted(candidates, key=lambda candidate: (
            candidate.predicted_formation > 0, max(candidate.predicted_formation, 0),
            -candidate.predicted_gap, candidate.jid)))
        nearest = tuple(candidate.jid for candidate in sorted(candidates, key=lambda candidate: (
            candidate.nearest_formation > 0, max(candidate.nearest_formation, 0),
            -candidate.nearest_gap, candidate.jid)))
        random_orders = tuple(tuple(sorted((candidate.jid for candidate in candidates), key=lambda jid: (
            H(f'random-{seed}', panel_id + '\n' + jid), jid))) for seed in range(100))
        if tuple(row['nominal_order']) != nominal or tuple(row['nearest_order']) != nearest:
            raise ValueError('frozen nominal order does not match the fixed rule')
        if set(row['random_orders']) != {str(i) for i in range(100)}:
            raise ValueError('all 100 prespecified random orders must be frozen')
        if any(tuple(row['random_orders'][str(i)]) != random_orders[i] for i in range(100)):
            raise ValueError('frozen random order does not match the fixed hash rule')
        result.append(FrozenPanel(panel_id, role, status, tuple(candidates), nominal, nearest, random_orders))
        seen_panels.add(panel_id)
    return tuple(result)


@dataclass(frozen=True)
class Target:
    gap: Fraction
    formation: Fraction


@dataclass(frozen=True)
class Observation:
    panel_id: str
    policy_id: str
    jid: str
    gap: Fraction
    formation: Fraction


@dataclass(frozen=True)
class RevealRequest:
    panel_id: str
    policy_id: str
    jid: str
    ordinal: int


class PolicyOracle:
    """One policy's guarded one-use capabilities; no raw target mapping API."""

    def __init__(self, panel_id, policy_id, ids, target_reader, access_log, maximum_budget=20):
        self.panel_id, self.policy_id = panel_id, policy_id
        self._ids, self._reader, self._log = frozenset(ids), target_reader, access_log
        if isinstance(maximum_budget, bool) or not isinstance(maximum_budget, int) or maximum_budget < 0:
            raise ValueError('maximum budget must be a nonnegative integer')
        self.maximum_budget = maximum_budget
        self._seen, self._authorized = set(), None

    @property
    def count(self):
        return len(self._seen)

    def authorize(self, panel_id, policy_id, jid):
        if panel_id != self.panel_id or policy_id != self.policy_id:
            raise PermissionError('cross-policy or cross-panel selection is forbidden')
        if self._authorized is not None:
            raise PermissionError('a selection is already awaiting its reveal')
        if jid not in self._ids:
            raise PermissionError('candidate is outside the selected panel')
        if jid in self._seen:
            raise PermissionError('duplicate reveal is forbidden')
        if self.count >= self.maximum_budget:
            raise PermissionError('reveal budget exhausted')
        request = RevealRequest(panel_id, policy_id, jid, self.count + 1)
        self._authorized = request
        return request

    def reveal(self, request):
        if request is not self._authorized or request is None:
            raise PermissionError('only this policy\'s currently selected capability may reveal a target')
        if request.panel_id != self.panel_id or request.policy_id != self.policy_id:
            raise PermissionError('cross-policy reveal is forbidden')
        target = self._reader(request.jid)
        self._seen.add(request.jid)
        self._authorized = None
        self._log.append({'event': 'oracle_reveal', 'panel_id': self.panel_id,
                          'policy_id': self.policy_id, 'jid': request.jid,
                          'ordinal': request.ordinal, 'target_digest': digest(target)})
        return Observation(self.panel_id, self.policy_id, request.jid, target.gap, target.formation)


class TargetVault:
    """Custodian boundary: policy requests first, full evaluator access last."""

    def __init__(self, payload, panels, access_log):
        if payload.get('schema') != 'lupine.discovery.constrained.targets.v1' \
                or payload.get('protocol_id') != PROTOCOL_ID:
            raise ValueError('unexpected sealed target schema')
        if set(payload['panels']) != {panel.panel_id for panel in panels}:
            raise ValueError('target panel scope differs from the frozen receipt')
        targets = {}
        for panel in panels:
            rows = payload['panels'][panel.panel_id]
            if set(rows) != set(panel.ids):
                raise ValueError('target candidate scope differs from the frozen receipt')
            parsed = {}
            for jid, row in rows.items():
                if set(row) != {'gap', 'formation'}:
                    raise ValueError('target bundles contain only the two authorized properties')
                parsed[jid] = Target(_fraction(row['gap']), _fraction(row['formation']))
            targets[panel.panel_id] = MappingProxyType(parsed)
        self._targets = MappingProxyType(targets)
        self._expected = {(panel.panel_id, policy) for panel in panels for policy in POLICIES}
        self._issued, self._complete = {}, set()
        self._log = access_log
        self._audit_opened = False

    def oracle(self, panel_id, policy_id):
        key = (panel_id, policy_id)
        if key not in self._expected or key in self._issued:
            raise PermissionError('unexpected or repeated policy oracle')
        rows = self._targets[panel_id]
        oracle = PolicyOracle(panel_id, policy_id, tuple(rows), rows.__getitem__, self._log, 20)
        self._issued[key] = oracle
        return oracle

    def finish(self, oracle):
        key = (oracle.panel_id, oracle.policy_id)
        if self._issued.get(key) is not oracle or oracle.count != 20 or key in self._complete:
            raise PermissionError('only a completed independent 20-bundle run can be recorded')
        self._complete.add(key)

    def audit_all(self):
        if self._complete != self._expected:
            raise PermissionError('full target audit is forbidden before every policy finishes')
        if self._audit_opened:
            raise PermissionError('full target audit has already opened')
        self._audit_opened = True
        self._log.append({'event': 'post_run_full_target_audit', 'completed_runs': len(self._complete)})
        return self._targets


@dataclass(frozen=True)
class PolicyView:
    panel: FrozenPanel
    policy_id: str
    history: tuple[Observation, ...]

    def __post_init__(self):
        if self.policy_id not in POLICIES:
            raise ValueError('unknown frozen policy')
        if not isinstance(self.history, tuple):
            raise TypeError('policy history must be an immutable tuple')
        ids = set()
        for observation in self.history:
            if not isinstance(observation, Observation) or observation.policy_id != self.policy_id \
                    or observation.panel_id != self.panel.panel_id:
                raise PermissionError('cross-policy history is forbidden')
            if observation.jid not in self.panel.ids or observation.jid in ids:
                raise PermissionError('history contains an outside or duplicate candidate')
            ids.add(observation.jid)


def current_selection(view):
    """Only frozen intervals and this policy's authorized observations enter."""
    panel = view.panel
    revealed = {observation.jid: observation for observation in view.history}
    if panel.operational_status == 'conditional_finite':
        candidates = []
        for frozen in panel.candidates:
            observed = revealed.get(frozen.jid)
            score = frozen.score if observed is None else Interval(-observed.gap, -observed.gap)
            formation = frozen.formation if observed is None else Interval(observed.formation, observed.formation)
            candidates.append(Candidate(frozen.jid, score, {'formation': formation}))
        result = encode(select(candidates))
        result['status'] = 'conditional_finite'
        result['unmeasured_guarantee'] = 'conditional_on_original_sound_intervals'
        return result
    unknown = set(panel.ids) - set(revealed)
    known_feasible = {jid for jid, row in revealed.items() if row.formation <= 0}
    return {'status': panel.operational_status,
            'certified_feasible': sorted(known_feasible),
            'possible_feasible': sorted(unknown | known_feasible),
            'retained': sorted(unknown | known_feasible),
            'certified_infeasible': sorted(set(revealed) - known_feasible),
            'dominated': [], 'incumbent': None, 'threshold': None, 'regret_bound': None,
            'unmeasured_guarantee': None}


def choose_next(view):
    panel, policy = view.panel, view.policy_id
    revealed = {observation.jid for observation in view.history}
    if len(revealed) == len(panel.candidates):
        return None
    selection = None
    reason = 'fixed_frozen_order'
    if policy == 'interval':
        selection = current_selection(view)
        if panel.operational_status == 'conditional_finite':
            eligible = set(selection['retained']) - revealed
            if eligible:
                selected = min((candidate for candidate in panel.candidates if candidate.jid in eligible),
                               key=lambda candidate: (candidate.score.lower, candidate.jid))
                return {'jid': selected.jid, 'reason': 'retained_lower_bound', 'selection': selection}
            reason = 'fallback_outside_pool'
        else:
            reason = 'abstention_nominal_order'
        order = panel.nominal_order
    elif policy == 'nominal_5nn':
        order = panel.nominal_order
    elif policy == 'nearest_1nn':
        order = panel.nearest_order
    else:
        order = panel.random_orders[int(policy.removeprefix('random_'))]
    return {'jid': next(jid for jid in order if jid not in revealed),
            'reason': reason, 'selection': selection}


def _observed_snapshot(view, initial_suggestion, fallback_count):
    feasible = tuple(observation for observation in view.history if observation.formation <= 0)
    best = max((observation.gap for observation in feasible), default=None)
    best_ids = sorted(observation.jid for observation in feasible if observation.gap == best)
    result = {'budget': len(view.history), 'reveal_count': len(view.history),
              'revealed_ids': [observation.jid for observation in view.history],
              'revealed_feasible_count': len(feasible), 'verified_feasible_hit': bool(feasible),
              'status': 'verified_feasible_hit' if feasible else 'no_verified_feasible_hit',
              'best_verified_gap': None if best is None else str(best),
              'incumbent_ids': best_ids, 'incumbent_display_id': best_ids[0] if best_ids else None,
              'unmeasured_initial_suggestion': initial_suggestion, 'fallback_count': fallback_count}
    if view.policy_id == 'interval':
        result['selection'] = current_selection(view)
    return result


def run_policy(panel, policy_id, oracle):
    if (oracle.panel_id, oracle.policy_id) != (panel.panel_id, policy_id):
        raise PermissionError('policy was given a different policy\'s oracle')
    history, events, snapshots = (), [], {}
    view = PolicyView(panel, policy_id, history)
    initial = choose_next(view)['jid']
    snapshots['0'] = _observed_snapshot(view, initial, 0)
    fallback_count = 0
    for step in range(1, 21):
        view = PolicyView(panel, policy_id, history)
        choice = choose_next(view)
        if choice is None:
            raise RuntimeError('policy exhausted its candidates before its fixed budget')
        request = oracle.authorize(panel.panel_id, policy_id, choice['jid'])
        observation = oracle.reveal(request)
        history = (*history, observation)
        fallback_count += choice['reason'] == 'fallback_outside_pool'
        events.append({'step': step, **choice, 'revealed': encode(observation)})
        if step in BUDGETS:
            snapshots[str(step)] = _observed_snapshot(PolicyView(panel, policy_id, history),
                                                     initial, fallback_count)
    return {'policy_id': policy_id, 'initial_suggestion': initial, 'events': events, 'budgets': snapshots,
            'target_bundles': oracle.count, 'fallback_count': fallback_count}


def truth_summary(targets):
    feasible = sorted(jid for jid, target in targets.items() if target.formation <= 0)
    optimum = max((targets[jid].gap for jid in feasible), default=None)
    return {'population_count': len(targets), 'feasible_count': len(feasible),
            'feasible_fraction': _ratio(len(feasible), len(targets)),
            'feasible_ids': feasible, 'mixed_feasibility': 0 < len(feasible) < len(targets),
            'archive_optimum_gap': None if optimum is None else str(optimum),
            'optimum_ids': [jid for jid in feasible if targets[jid].gap == optimum],
            'within_0_1_ev_ids': [] if optimum is None else [jid for jid in feasible
                                                           if optimum - targets[jid].gap <= Fraction(1, 10)],
            'status': 'has_feasible_truth' if feasible else 'no_feasible_truth'}


def coverage_audit(panel, targets):
    if any(candidate.score is None or candidate.formation is None for candidate in panel.candidates):
        return {'available': False, 'scope': 'unbounded', 'panel_simultaneous': None,
                'candidate_joint_covered': None, 'candidate_count': 20, 'misses': []}
    misses, gap_hits, formation_hits, joint_hits = [], 0, 0, 0
    gap_widths, formation_widths = [], []
    for candidate in panel.candidates:
        target = targets[candidate.jid]
        gap_interval = Interval(-candidate.score.upper, -candidate.score.lower)
        gap_ok, formation_ok = gap_interval.contains(target.gap), candidate.formation.contains(target.formation)
        gap_hits += gap_ok
        formation_hits += formation_ok
        joint_hits += gap_ok and formation_ok
        gap_widths.append(gap_interval.upper - gap_interval.lower)
        formation_widths.append(candidate.formation.upper - candidate.formation.lower)
        for name, interval, value, contained in (
                ('gap', gap_interval, target.gap, gap_ok),
                ('formation', candidate.formation, target.formation, formation_ok)):
            if not contained:
                misses.append({'jid': candidate.jid, 'property': name, 'lower': str(interval.lower),
                               'upper': str(interval.upper), 'truth': str(value)})
    return {'available': True,
            'scope': 'unsupported_transfer_diagnostic' if panel.role == 'shift' else 'primary_conditional',
            'gap_covered': gap_hits, 'formation_covered': formation_hits,
            'candidate_joint_covered': joint_hits, 'candidate_count': 20,
            'panel_simultaneous': not misses, 'misses': misses,
            'gap_width': {'minimum': str(min(gap_widths)), 'maximum': str(max(gap_widths)),
                          'mean': _mean(gap_widths)},
            'formation_width': {'minimum': str(min(formation_widths)), 'maximum': str(max(formation_widths)),
                                'mean': _mean(formation_widths)}}


def screening_audit(selection, targets, truth):
    feasible, optimum_ids = set(truth['feasible_ids']), set(truth['optimum_ids'])
    retained = set(selection['retained'])
    incumbent, bound = selection['incumbent'], selection['regret_bound']
    actual_feasible = None if incumbent is None else targets[incumbent].formation <= 0
    true_regret = None
    if actual_feasible and truth['archive_optimum_gap'] is not None:
        true_regret = _fraction(truth['archive_optimum_gap']) - targets[incumbent].gap
    return {'selection': selection, 'retained_count': len(retained),
            'retained_fraction': _ratio(len(retained), len(targets)),
            'feasible_candidates_retained': len(retained & feasible), 'feasible_count': len(feasible),
            'feasible_retention_fraction': _ratio(len(retained & feasible), len(feasible)),
            'all_optimum_retained': None if not optimum_ids else optimum_ids <= retained,
            'lost_optimum_ids': sorted(optimum_ids - retained),
            'false_infeasibility_exclusions': sorted(set(selection['certified_infeasible']) & feasible),
            'certified_incumbent_actual_feasibility': actual_feasible,
            'certified_incumbent_true_regret': None if true_regret is None else str(true_regret),
            'conditional_regret_bound_violation': None if true_regret is None or bound is None
            else true_regret > _fraction(bound)}


def evaluate_panel(panel, runs, targets):
    truth = truth_summary(targets)
    selection = current_selection(PolicyView(panel, 'interval', ()))
    coverage = coverage_audit(panel, targets)
    screening = screening_audit(selection, targets, truth)
    diagnostic = None
    if panel.role == 'shift' and coverage['available']:
        diagnostic_selection = encode(select([Candidate(candidate.jid, candidate.score,
                                                        {'formation': candidate.formation})
                                               for candidate in panel.candidates]))
        diagnostic = {'label': 'unsupported_transfer_diagnostic',
                      'screening': screening_audit(diagnostic_selection, targets, truth),
                      'coverage': coverage}
    optimum = None if truth['archive_optimum_gap'] is None else _fraction(truth['archive_optimum_gap'])
    for run in runs.values():
        for state in run['budgets'].values():
            found = None if state['best_verified_gap'] is None else _fraction(state['best_verified_gap'])
            if optimum is None:
                state.update(simple_regret=None, exact_optimum_recovered=None,
                             all_optima_recovered=None, within_0_1_ev_success=None)
            else:
                regret = None if found is None else optimum - found
                if regret is not None and regret < 0:
                    raise RuntimeError('verified policy incumbent exceeds the post-run optimum')
                state.update(simple_regret=None if regret is None else str(regret),
                             exact_optimum_recovered=found == optimum,
                             all_optima_recovered=set(truth['optimum_ids']) <= set(state['revealed_ids']),
                             within_0_1_ev_success=regret is not None and regret <= Fraction(1, 10))
    return {'panel_id': panel.panel_id, 'role': panel.role, 'operational_status': panel.operational_status,
            'truth': truth, 'coverage': coverage, 'screening': screening,
            'unsupported_transfer_diagnostic': diagnostic, 'policies': runs,
            'archive_quality_flags': {'negative_gap_ids': sorted(jid for jid, target in targets.items()
                                                                if target.gap < 0)}}


def _rate_summary(states, field):
    defined = [state[field] for state in states if state[field] is not None]
    return {'numerator': sum(defined), 'denominator': len(defined),
            'fraction': _ratio(sum(defined), len(defined)), 'undefined': len(states) - len(defined)}


def aggregate_policy(panels, policy):
    result = {}
    for budget in BUDGETS:
        states = [panel['policies'][policy]['budgets'][str(budget)] for panel in panels]
        feasible_states = [state for state in states if state['within_0_1_ev_success'] is not None]
        gaps = [_fraction(state['best_verified_gap']) for state in states if state['best_verified_gap'] is not None]
        regrets = [_fraction(state['simple_regret']) for state in states if state['simple_regret'] is not None]
        revealed = sum(state['reveal_count'] for state in states)
        revealed_feasible = sum(state['revealed_feasible_count'] for state in states)
        result[str(budget)] = {
            'panel_count': len(states), 'feasible_panel_count': len(feasible_states),
            'feasible_hit': _rate_summary(states, 'verified_feasible_hit'),
            'feasible_hit_among_feasible_panels': _rate_summary(feasible_states, 'verified_feasible_hit'),
            'exact_optimum_recovery': _rate_summary(states, 'exact_optimum_recovered'),
            'all_optima_recovery': _rate_summary(states, 'all_optima_recovered'),
            'within_0_1_ev_success': _rate_summary(states, 'within_0_1_ev_success'),
            'no_verified_feasible_hit_count': sum(not state['verified_feasible_hit'] for state in states),
            'revealed_bundles': revealed, 'revealed_feasible_count': revealed_feasible,
            'revealed_feasible_fraction': _ratio(revealed_feasible, revealed),
            'best_verified_gap_mean_when_found': _mean(gaps), 'best_verified_gap_defined_count': len(gaps),
            'simple_regret_mean_when_found': _mean(regrets), 'simple_regret_defined_count': len(regrets),
            'simple_regret_undefined_count': len(states) - len(regrets),
            'fallback_count': sum(state['fallback_count'] for state in states),
        }
    return result


def paired_comparison(panels, comparator, budget=4):
    wins = losses = ties = interval_successes = comparator_successes = excluded_no_feasible = 0
    for panel in panels:
        left = panel['policies']['interval']['budgets'][str(budget)]['within_0_1_ev_success']
        right = panel['policies'][comparator]['budgets'][str(budget)]['within_0_1_ev_success']
        if left is None or right is None:
            if left is not None or right is not None:
                raise ValueError('paired policies disagree on the feasible-truth stratum')
            excluded_no_feasible += 1
            continue
        interval_successes += left
        comparator_successes += right
        wins += left and not right
        losses += right and not left
        ties += left == right
    denominator, discordant = wins + losses + ties, wins + losses
    pvalue = Fraction(sum(comb(discordant, index) for index in range(wins, discordant + 1)),
                      2**discordant) if discordant else Fraction(1)
    difference = Fraction(wins-losses, denominator) if denominator else None
    return {'comparator': comparator, 'budget': budget, 'wins': wins, 'losses': losses, 'ties': ties,
            'feasible_panel_denominator': denominator, 'excluded_no_feasible_panels': excluded_no_feasible,
            'interval_successes': interval_successes, 'comparator_successes': comparator_successes,
            'paired_success_fraction_difference': None if difference is None else str(difference),
            'gain_at_least_10_percentage_points': None if difference is None else difference >= Fraction(1, 10),
            'one_sided_sign_test_p': str(pvalue), 'multiplicity_threshold': '1/60',
            'provisional_p_gate': None if denominator == 0 else pvalue <= Fraction(1, 60),
            'independent_panel_premise': PREMISE_STATUS,
            'interpretation': 'Descriptive paired comparison; shared calibration and chemical dependence '
                              'preclude independently confirmed superiority.'}


def aggregate_arm(panels, role=None):
    if role is None and panels:
        role = panels[0]['role']
    candidate_count = sum(panel['truth']['population_count'] for panel in panels)
    feasible_count = sum(panel['truth']['feasible_count'] for panel in panels)
    feasible_panels = [panel for panel in panels if panel['truth']['feasible_count']]
    finite = [panel for panel in panels if panel['coverage']['available']]
    retention = [Fraction(panel['screening']['retained_count'], panel['truth']['population_count'])
                 for panel in panels]
    simultaneous = sum(panel['coverage']['panel_simultaneous'] for panel in finite)
    optimum_retained = sum(panel['screening']['all_optimum_retained'] for panel in feasible_panels)
    policy_curves = {policy: aggregate_policy(panels, policy) for policy in POLICIES}
    sensitivity = {}
    for budget in BUDGETS:
        success = [policy_curves[f'random_{seed}'][str(budget)]['within_0_1_ev_success']['fraction']
                   for seed in range(100)]
        defined = [_fraction(value) for value in success if value is not None]
        sensitivity[str(budget)] = {'seed_count': 100, 'defined_seed_count': len(defined),
                                    'within_0_1_ev_success_mean': _mean(defined),
                                    'within_0_1_ev_success_minimum': str(min(defined)) if defined else None,
                                    'within_0_1_ev_success_maximum': str(max(defined)) if defined else None}
        sensitivity[str(budget)]['metrics'] = {}
        for field in ('feasible_hit', 'exact_optimum_recovery', 'all_optima_recovery', 'within_0_1_ev_success'):
            values = [policy_curves[f'random_{seed}'][str(budget)][field]['fraction'] for seed in range(100)]
            values = [_fraction(value) for value in values if value is not None]
            sensitivity[str(budget)]['metrics'][field] = {
                'defined_seed_count': len(values), 'mean': _mean(values),
                'minimum': str(min(values)) if values else None, 'maximum': str(max(values)) if values else None}
    incumbent_checks = [panel['screening']['certified_incumbent_actual_feasibility'] for panel in panels
                        if panel['screening']['certified_incumbent_actual_feasibility'] is not None]
    diagnostic_panels = [panel for panel in panels if panel['unsupported_transfer_diagnostic'] is not None]
    diagnostic_feasible = [panel for panel in diagnostic_panels if panel['truth']['feasible_count']]
    diagnostic_retained = sum(panel['unsupported_transfer_diagnostic']['screening']['all_optimum_retained']
                              for panel in diagnostic_feasible)
    return {'panel_count': len(panels), 'candidate_count': candidate_count,
            'interval_coverage_scope': 'unsupported_transfer_diagnostic' if role == 'shift' else 'primary_conditional',
            'premise_status': 'unsupported_scope' if role == 'shift' else PREMISE_STATUS,
            'feasible_candidate_count': feasible_count, 'infeasible_candidate_count': candidate_count-feasible_count,
            'feasible_candidate_fraction': _ratio(feasible_count, candidate_count),
            'infeasible_candidate_fraction': _ratio(candidate_count-feasible_count, candidate_count),
            'feasible_panel_count': len(feasible_panels), 'no_feasible_panel_count': len(panels)-len(feasible_panels),
            'mixed_feasibility_panel_count': sum(panel['truth']['mixed_feasibility'] for panel in panels),
            'panel_simultaneous_coverage': {'numerator': simultaneous, 'denominator': len(finite),
                                           'fraction': _ratio(simultaneous, len(finite)),
                                           'unavailable_panels': len(panels)-len(finite)},
            'scalar_and_joint_coverage': {
                name: {'numerator': sum(panel['coverage'][field] for panel in finite),
                       'denominator': 20 * len(finite),
                       'fraction': _ratio(sum(panel['coverage'][field] for panel in finite), 20 * len(finite))}
                for name, field in (('gap', 'gap_covered'), ('formation', 'formation_covered'),
                                    ('candidate_joint', 'candidate_joint_covered'))},
            'all_optimum_retention': {'numerator': optimum_retained, 'denominator': len(feasible_panels),
                                      'fraction': _ratio(optimum_retained, len(feasible_panels))},
            'median_retained_fraction': None if not retention else str(_median(retention)),
            'retained_candidate_count': sum(panel['screening']['retained_count'] for panel in panels),
            'feasible_candidate_retention': {
                'numerator': sum(panel['screening']['feasible_candidates_retained'] for panel in panels),
                'denominator': feasible_count,
                'fraction': _ratio(sum(panel['screening']['feasible_candidates_retained'] for panel in panels),
                                   feasible_count)},
            'abstention_panel_count': sum(panel['operational_status'] != 'conditional_finite' for panel in panels),
            'no_certified_incumbent_panel_count': sum(panel['screening']['selection']['incumbent'] is None
                                                     for panel in panels),
            'certified_incumbent_count': len(incumbent_checks),
            'actually_infeasible_certified_incumbent_count': incumbent_checks.count(False),
            'false_infeasibility_exclusion_count': sum(len(panel['screening']['false_infeasibility_exclusions'])
                                                      for panel in panels),
            'lost_optimum_count': sum(len(panel['screening']['lost_optimum_ids']) for panel in panels),
            'conditional_regret_bound_violation_count': sum(
                panel['screening']['conditional_regret_bound_violation'] is True for panel in panels),
            'conditional_regret_bound_defined_count': sum(
                panel['screening']['conditional_regret_bound_violation'] is not None for panel in panels),
            'unsupported_transfer_diagnostic': None if role != 'shift' else {
                'label': 'unsupported_transfer_diagnostic', 'finite_panel_count': len(diagnostic_panels),
                'all_optimum_retention': {'numerator': diagnostic_retained,
                                          'denominator': len(diagnostic_feasible),
                                          'fraction': _ratio(diagnostic_retained, len(diagnostic_feasible))},
                'lost_optimum_ids_by_panel': {
                    panel['panel_id']: panel['unsupported_transfer_diagnostic']['screening']['lost_optimum_ids']
                    for panel in diagnostic_panels},
                'false_infeasibility_exclusion_count': sum(len(
                    panel['unsupported_transfer_diagnostic']['screening']['false_infeasibility_exclusions'])
                    for panel in diagnostic_panels)},
            'policy_curves': policy_curves,
            'paired_budget4': {name: paired_comparison(panels, name) for name in COMPARATORS},
            'random_sensitivity': {'primary_seed': 0, 'all_seed_curves': 'policy_curves.random_0 through random_99',
                                   'independent_experiments': False, 'budgets': sensitivity}}


def _gate(checks):
    return 'FAIL' if any(value is False for value in checks.values()) else (
        'OPEN' if any(value is None for value in checks.values()) else 'PASS')


def acceptance_gates(panels, arms, engineering_validation, runtime_integrity):
    primary, shift = arms['primary'], arms['shift']
    integrity = {**runtime_integrity, 'executed_engineering_validation':
                 True if engineering_validation.get('status') == 'verified_passed' else None}
    nontrivial = {'at_least_40_primary_panels': primary['panel_count'] >= 40,
                  'at_least_5_percent_infeasible': None if not primary['candidate_count'] else
                  Fraction(primary['infeasible_candidate_count'], primary['candidate_count']) >= Fraction(1, 20),
                  'at_least_10_mixed_panels': primary['mixed_feasibility_panel_count'] >= 10}
    coverage = primary['panel_simultaneous_coverage']['fraction']
    optimum = primary['all_optimum_retention']['fraction']
    retained = primary['median_retained_fraction']
    screening = {'simultaneous_coverage_at_least_90_percent': None if coverage is None else
                 _fraction(coverage) >= Fraction(9, 10),
                 'all_optimum_retention_at_least_95_percent': None if optimum is None else
                 _fraction(optimum) >= Fraction(19, 20),
                 'no_infeasible_certified_incumbent': primary['actually_infeasible_certified_incumbent_count'] == 0,
                 'median_retained_fraction_at_most_80_percent': None if retained is None else
                 _fraction(retained) <= Fraction(4, 5)}
    recommendations = {f'{name}_gain': result['gain_at_least_10_percentage_points']
                       for name, result in primary['paired_budget4'].items()}
    recommendations.update({f'{name}_provisional_sign_test': result['provisional_p_gate']
                            for name, result in primary['paired_budget4'].items()})
    shift_panels = [panel for panel in panels if panel['role'] == 'shift']
    shift_checks = {'has_shift_panels': True if shift_panels else None,
                    'all_panels_abstain': all(panel['operational_status'] == 'abstain_unsupported_scope'
                                             for panel in shift_panels),
                    'all_unrevealed_retained_and_no_finite_unmeasured_guarantee': True}
    # At each intermediate budget, all as-yet unrevealed candidates must remain.
    for panel in shift_panels:
        ids = set(panel['policies']['interval']['budgets']['20']['revealed_ids'])
        for state in panel['policies']['interval']['budgets'].values():
            selection = state['selection']
            if not ids - set(state['revealed_ids']) <= set(selection['retained']) \
                    or selection['regret_bound'] is not None or selection['unmeasured_guarantee'] is not None:
                shift_checks['all_unrevealed_retained_and_no_finite_unmeasured_guarantee'] = False
    engineering_status = _gate(integrity)
    result = {
        'engineering_integrity': {'status': engineering_status, 'checks': integrity,
                                  'validation': engineering_validation},
        'nontrivial_constrained_evidence': {'status': 'PASS' if all(value is True for value in nontrivial.values())
                                           else 'OPEN', 'checks': nontrivial,
                                           'reason': 'Insufficient or easy constrained populations leave usefulness open.'},
        'observed_primary_screening': {'status': _gate(screening), 'checks': screening,
                                       'claim': 'Observed gates only, not future joint coverage.'},
        'recommendation_value': {'status': _gate(recommendations), 'checks': recommendations,
                                'independent_panel_premise': PREMISE_STATUS,
                                'external_replication_required': True},
        'shift_behavior': {'status': _gate(shift_checks), 'checks': shift_checks,
                           'claim': 'Scope handling, not prediction accuracy in oxygen chemistry.'},
    }
    if engineering_status != 'PASS':
        for name, gate in result.items():
            if name != 'engineering_integrity':
                gate['scientific_interpretation'] = 'BLOCKED pending engineering integrity evidence'
    return result


def injected_unsound_control():
    """Preserved synthetic falsifier, explicitly excluded from archive metrics."""
    candidates = [Candidate('false-witness', Interval(0, 0), {'formation': Interval(-1, -1)}),
                  Candidate('true-optimum', Interval(1, 1), {'formation': Interval(-1, -1)})]
    selection = select(candidates)
    # Actual objective of false-witness is 2, outside its supplied [0,0].
    return {'kind': 'synthetic_unsound_interval_negative_control',
            'counted_as_archive_accuracy': False, 'true_optimum_id': 'true-optimum',
            'retained': list(selection.retained),
            'lost_optimum_exposed': 'true-optimum' not in selection.retained,
            'violated_premise': 'false-witness objective 2 is outside supplied [0,0]'}


def verify_engineering_validation(value, root=ROOT):
    if value is None:
        return {'status': 'missing', 'reason': 'A bound executed-test receipt is required for gate 1.'}
    if isinstance(value, (str, Path)):
        value = loads(Path(value).read_text())
    if value.get('schema') != 'lupine.discovery.engineering-validation.v1' \
            or value.get('status') != 'passed' or value.get('exit_code') != 0:
        raise ValueError('engineering validation receipt must record a successful executed test command')
    if not isinstance(value.get('command'), list) or not value['command'] \
            or not all(isinstance(part, str) for part in value['command']):
        raise ValueError('engineering validation needs the executed command')
    root = Path(root).resolve()
    required = {'scripts/constrained_benchmark.py', 'scripts/constrained_replay.py'}
    required.update(str(path.relative_to(root)) for path in (root / 'tests').glob('test_constrained*.py'))
    if not required <= set(value.get('source_sha256', {})):
        raise ValueError('engineering receipt does not bind all constrained scripts and tests')
    paths = dict(value['source_sha256'])
    paths[value['result_log_path']] = value['result_log_sha256']
    for name, expected in paths.items():
        path = (root / name).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise ValueError('engineering receipt path escapes or is missing from the project')
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f'engineering source or result log changed: {name}')
    return {**value, 'status': 'verified_passed', 'receipt_sha256': digest(value),
            'interpretation': 'Executed local engineering evidence; no independent scientific replication.'}


def _protocol_tools():
    scripts_path = str(Path(__file__).resolve().parent)
    if scripts_path not in sys.path:
        sys.path.insert(0, scripts_path)
    return importlib.import_module('constrained_benchmark')


def seal_execution_receipt(freeze_path, freeze, validation):
    """Save the policy implementation identity before any target seal opens."""
    names = ('scripts/constrained_replay.py', 'src/lupine_discovery/core.py',
             'src/lupine_discovery/calibration.py', 'src/lupine_discovery/serialization.py')
    receipt = {'schema': 'lupine.discovery.constrained.execution.v1',
               'protocol_id': PROTOCOL_ID, 'freeze_receipt_sha256': freeze['receipt_sha256'],
               'target_seal': freeze['target_seal'],
               'implementation_sha256': {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
                                          for name in names},
               'engineering_validation_receipt_sha256': validation.get('receipt_sha256'),
               'policies': list(POLICIES), 'budgets': list(BUDGETS),
               'boundary': 'Saved before evaluation target seal opening; retrospective archive, not prospective blinding.'}
    receipt_sha = digest(receipt)
    path = Path(freeze_path).parent / f'replay-execution-{receipt_sha}.json'
    raw = canonical_bytes(receipt) + b'\n'
    if path.exists():
        if path.read_bytes() != raw:
            raise ValueError('existing execution receipt differs from the pre-open identity')
    else:
        with path.open('xb') as stream:
            stream.write(raw)
    return {'path': path.name, 'sha256': hashlib.sha256(raw).hexdigest(), 'receipt': receipt}


def scientific_result_identity(report):
    """Digest scientific outputs independently of machine, paths and run timing.

    Engineering gate status/checks remain included: an untested and a tested
    result are distinct. Only the engineering receipt identity/log location is
    omitted. Full report bytes retain their own separate content identity.
    """
    identity_fields = ('protocol_id', 'protocol_commit', 'protocol_sha256',
                       'format_amendment_commit', 'format_amendment_sha256', 'source_format',
                       'source_receipt_sha256', 'metadata_sha256', 'model_digest',
                       'prediction_sha256', 'source', 'calibration', 'acquisition_summary',
                       'training_calibration_cost', 'premise_status', 'primary_comparison_budget',
                       'budgets', 'policies', 'panels', 'arms', 'negative_control')
    value = {key: report[key] for key in identity_fields if key in report}
    value['target_sha256'] = report['target_seal']['sha256']
    value['gates'] = {name: {'status': gate['status'], 'checks': gate['checks']}
                      for name, gate in report['gates'].items()}
    return digest(value)


def _freeze_timing(freeze_path):
    path = Path(freeze_path).parent / 'freeze-execution.json'
    if not path.exists():
        return {'available': False, 'elapsed_seconds': None, 'elapsed_cpu_seconds': None,
                'interpretation': 'No verified prior-fit timing; only replay budget can be checked.'}
    value = loads(path.read_text())
    if value['freeze_sha256'] != hashlib.sha256(Path(freeze_path).read_bytes()).hexdigest():
        raise ValueError('freeze timing record does not identify the current frozen file')
    elapsed = _fraction(value['elapsed_seconds'])
    cpu = None if value.get('elapsed_cpu_seconds') is None else _fraction(value['elapsed_cpu_seconds'])
    if elapsed < 0 or (cpu is not None and cpu < 0):
        raise ValueError('recorded freeze duration must be nonnegative')
    return {'available': True, 'elapsed_seconds': str(elapsed),
            'elapsed_cpu_seconds': None if cpu is None else str(cpu),
            'record_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'peak_rss_kib_linux': value.get('peak_rss_kib_linux')}


def _peak_memory():
    try:
        import resource
    except ImportError:
        return None
    value = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return value if sys.platform != 'darwin' else value // 1024


class ComputationBudgetExceeded(RuntimeError):
    pass


def _preserve_checkpoint(freeze_path, receipt, runs, access_log, timing, full_audit_opened=False):
    checkpoint = {'schema': 'lupine.discovery.constrained.replay-incomplete.v1',
                  'status': 'blocked_computation_budget_exceeded', 'execution_receipt': receipt,
                  'completed_policy_runs': runs, 'oracle_access_log': access_log,
                  'oracle_access_log_sha256': digest(access_log), 'freeze_timing': timing,
                  'post_run_full_audit_opened': full_audit_opened,
                  'interpretation': 'Incomplete fixed protocol; no dataset reduction or changed policy.'}
    path = Path(freeze_path).parent / f'replay-incomplete-{digest(checkpoint)}.json'
    if not path.exists():
        with path.open('xb') as stream:
            stream.write(canonical_bytes(checkpoint) + b'\n')
    raise ComputationBudgetExceeded(f'fixed computation budget exhausted; checkpoint preserved at {path}')


def run_replay(freeze_path, output_path=None, engineering_validation=None):
    """Receipt verification precedes every evaluation-target access."""
    started = process_time()
    wall_started = monotonic()
    if output_path is not None and Path(output_path).exists():
        raise FileExistsError('replay output already exists; preserve it and choose a fresh output path')
    tools = _protocol_tools()
    freeze = tools.verify_freeze(Path(freeze_path))
    source = tools.read_verified_json(Path(freeze_path).parent / 'source-receipt.json',
                                      freeze['source_receipt_sha256'])
    panels = parse_panels(freeze)
    validation = verify_engineering_validation(engineering_validation)
    execution_receipt = seal_execution_receipt(freeze_path, freeze, validation)
    timing = _freeze_timing(freeze_path)
    prior_wall = _fraction(timing['elapsed_seconds']) if timing['available'] else Fraction(0)
    prior_cpu = (_fraction(timing['elapsed_cpu_seconds'])
                 if timing['elapsed_cpu_seconds'] is not None else prior_wall)
    remaining_wall = max(Fraction(0), COMPUTATION_BUDGET_SECONDS - prior_wall)
    remaining_cpu = max(Fraction(0), COMPUTATION_BUDGET_SECONDS - prior_cpu)
    access_log = [{'event': 'freeze_receipt_verified', 'receipt_sha256': freeze['receipt_sha256']}]
    access_log.append({'event': 'execution_receipt_saved_before_targets',
                       'sha256': execution_receipt['sha256'], 'path': execution_receipt['path']})
    def out_of_time():
        return monotonic() - wall_started >= remaining_wall or process_time() - started >= remaining_cpu
    if out_of_time():
        _preserve_checkpoint(freeze_path, execution_receipt, {}, access_log, timing)
    payload = tools.open_sealed_targets(Path(freeze_path), freeze)
    access_log.append({'event': 'custodian_target_seal_open', 'target_sha256': freeze['target_seal']['sha256']})
    vault = TargetVault(payload, panels, access_log)
    del payload
    runs = {}
    for panel in panels:
        runs[panel.panel_id] = {}
        for policy in POLICIES:
            oracle = vault.oracle(panel.panel_id, policy)
            runs[panel.panel_id][policy] = run_policy(panel, policy, oracle)
            vault.finish(oracle)
            if out_of_time():
                _preserve_checkpoint(freeze_path, execution_receipt, runs, access_log, timing)
    truths = vault.audit_all()
    results = []
    for panel in panels:
        results.append(evaluate_panel(panel, runs[panel.panel_id], truths[panel.panel_id]))
        if out_of_time():
            _preserve_checkpoint(freeze_path, execution_receipt, runs, access_log, timing, full_audit_opened=True)
    arms = {role: aggregate_arm([panel for panel in results if panel['role'] == role], role)
            for role in ('primary', 'shift')}
    if out_of_time():
        _preserve_checkpoint(freeze_path, execution_receipt, runs, access_log, timing, full_audit_opened=True)
    control = injected_unsound_control()
    runtime_integrity = {
        'freeze_and_target_seals_verified_before_metrics': True,
        'all_policy_budgets_equal_twenty': all(run['target_bundles'] == 20
                                             for panel in results for run in panel['policies'].values()),
        'budget20_recovers_all_exact_optima_on_every_feasible_panel': all(
            run['budgets']['20']['all_optima_recovered'] is True
            for panel in results if panel['truth']['feasible_count'] for run in panel['policies'].values()),
        'injected_unsound_control_exposes_loss': control['lost_optimum_exposed'],
    }
    gates = acceptance_gates(results, arms, validation, runtime_integrity)
    report = {'schema': 'lupine.discovery.constrained.replay.v1', 'protocol_id': PROTOCOL_ID,
              'protocol_commit': freeze['protocol_commit'], 'protocol_sha256': freeze['protocol_sha256'],
              'freeze_receipt_sha256': freeze['receipt_sha256'],
              'execution_receipt': execution_receipt,
              'source_receipt_sha256': freeze['source_receipt_sha256'],
              'metadata_sha256': freeze['metadata_sha256'], 'target_seal': freeze['target_seal'],
              'model_digest': freeze['model_digest'], 'calibration': freeze['calibration'],
              'prediction_sha256': freeze.get('prediction_sha256'),
              'source': source, 'acquisition_summary': freeze.get('summary', {}),
              'training_calibration_cost': {
                  'training_target_bundles': freeze.get('summary', {}).get('selected', {}).get('train'),
                  'calibration_target_bundles': freeze['calibration']['count'],
                  'same_allowance_for_every_policy': True,
                  'charged_separately_from_evaluation_budgets': True},
              'premise_status': {'primary': PREMISE_STATUS, 'shift': 'unsupported_scope'},
              'interpretation': 'Retrospective existing-DFT point-value replay; not experimental physical '
                                'validation, prospective blinding, exchangeability proof or independent superiority.',
              'primary_comparison_budget': 4, 'budgets': list(BUDGETS), 'policies': list(POLICIES),
              'panels': results, 'arms': arms, 'gates': gates, 'negative_control': control,
              'oracle_access_log': access_log, 'oracle_access_log_sha256': digest(access_log),
              'resources': {'elapsed_cpu_seconds': format(process_time()-started, '.6f'),
                            'elapsed_wall_seconds': format(monotonic()-wall_started, '.6f'),
                            'freeze_timing': timing, 'computation_budget_seconds': COMPUTATION_BUDGET_SECONDS,
                            'peak_rss_kib': _peak_memory(), 'peak_memory_target_kib': 2 * 1024**2,
                            'combined_budget_check': 'verified_timing' if timing['available'] else
                            'OPEN_missing_prior_fit_timing',
                            'target_bundles': sum(run['target_bundles'] for panel in results
                                                  for run in panel['policies'].values()),
                            'policy_run_count': len(results) * len(POLICIES),
                            'python_version': platform.python_version()},
              'reproduction': {'command': ['python', 'scripts/constrained_replay.py', str(freeze_path)],
                               'source_sha256': {str(Path(__file__).relative_to(ROOT)):
                                                 hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}}}
    for key in ('format_amendment_commit', 'format_amendment_sha256', 'source_format'):
        if key in freeze:
            report[key] = freeze[key]
    report['scientific_result_sha256'] = scientific_result_identity(report)
    report['resources'].update(elapsed_cpu_seconds=format(process_time()-started, '.6f'),
                               elapsed_wall_seconds=format(monotonic()-wall_started, '.6f'),
                               peak_rss_kib=_peak_memory(),
                               timing_scope='Replay through metric normalization; final JSON serialization excluded.')
    if out_of_time():
        _preserve_checkpoint(freeze_path, execution_receipt, runs, access_log, timing, full_audit_opened=True)
    report['report_content_sha256'] = digest(report)
    if output_path is not None:
        destination = Path(output_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open('xb') as stream:
            stream.write(canonical_bytes(report) + b'\n')
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('freeze', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--engineering-validation', type=Path)
    args = parser.parse_args(argv)
    report = run_replay(args.freeze, args.output, args.engineering_validation)
    print(json.dumps({'report': str(args.output), 'panels': len(report['panels']),
                      'gates': {key: value['status'] for key, value in report['gates'].items()},
                      'oracle_access_log_sha256': report['oracle_access_log_sha256']}, sort_keys=True))


if __name__ == '__main__':
    main()
