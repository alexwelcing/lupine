"""Constructed direct-pool controls; no model, scientific data, or coverage fit.

Run from discovery/: python examples/statistical_pool.py
This is a Python API example, not a workbench JSON input.
"""
import json

from lupine_discovery.decision_pool import (
    PoolProtocol, RankedPanel, PanelOutcome, PanelOutcomes, CalibrationPanel,
    assess_panel, calibrate_panels, select_pool,
)
from lupine_discovery.evidence import Scope


def protocol(premise='assumed_unverified'):
    return PoolProtocol('synthetic-example', 'synthetic-example', 'fixed-order',
        'ordinal-ranks', 'lexical-IDs', 'declared-constructed-panels',
        'No fitted ranker: all rankings are explicitly supplied',
        'Synthetic algebra only; no application sampling law established',
        Scope('synthetic-example', 'score', 'synthetic-unit', 'minimize'),
        {'g': Scope('synthetic-example', 'g', 'synthetic-unit', 'g <= 0')}, premise)


def panel(p, name, size):
    ids = tuple(f'x{i:02}' for i in range(1, size + 1))
    return RankedPanel(name, f'constructed-{size}-options', p.protocol_digest,
                       'a' * 64, ids, ids)


def truth(q, best_ranks, feasible=True, missing=False):
    return PanelOutcomes(q.panel_digest, 'Constructed exact example outcomes',
        tuple(PanelOutcome(cid, None if missing and i == 1 else 0 if i in best_ranks else 1,
                           {'g': 0 if feasible else 1})
              for i, cid in enumerate(q.ranked_ids, 1)))


def control(name, p, cases, alpha):
    calibration = calibrate_panels(p, cases, alpha)
    future = panel(p, 'future-' + name, 6)
    decision = select_pool(calibration, future)  # No future outcomes supplied.
    row = {'name': name, 'status': calibration.status, 'n': calibration.n,
           'complete_count': calibration.complete_count, 'k': calibration.k,
           'threshold': None if calibration.threshold is None else str(calibration.threshold),
           'retained': list(decision.retained), 'reasons': list(decision.reasons),
           'guarantee_status': decision.guarantee_status,
           'decision_digest': decision.decision_digest}
    return row, future, decision


def run():
    p = protocol()
    calibration_panels = tuple(panel(p, f'calibration-{i}', 4) for i in (1, 2, 3))
    cases = tuple(CalibrationPanel(q, truth(q, (i,))) for i, q in enumerate(calibration_panels, 1))
    finite, future, decision = control('finite-prefix', p, cases, '1/2')
    assert finite['threshold'] == '1/2' and len(decision.retained) == 3
    # Assess separately AFTER selection. One realized failure is compatible
    # with a marginal guarantee; a particular pool has no attested risk rate.
    assessment = assess_panel(p, future, truth(future, (2, 5)))
    finite['known_answer_audit'] = {'all_true_minimizers': list(assessment.minimizers),
        'lost_minimizers': [cid for cid in assessment.minimizers if cid not in decision.retained],
        'interpretation': 'Constructed realized failure; no population coverage experiment.'}
    assert finite['known_answer_audit']['lost_minimizers'] == ['x05']
    incomplete_cases = (CalibrationPanel(calibration_panels[0], truth(calibration_panels[0], (1,), missing=True)), *cases[1:])
    incomplete, _, d = control('missing-label', p, incomplete_cases, '1/2')
    assert incomplete['n'] == 3 and incomplete['threshold'] is None and len(d.retained) == 6
    insufficient, _, d = control('insufficient-count', p, (), '1/20')
    assert insufficient['status'] == 'insufficient_calibration' and len(d.retained) == 6
    tied = panel(p, 'calibration-all-tied', 4)
    ties, _, d = control('all-optima-tied', p, (CalibrationPanel(tied, truth(tied, (1, 2, 3, 4))),), '1/2')
    assert ties['threshold'] == '1' and len(d.retained) == 6
    unsupported_protocol = protocol('unsupported')
    unknown_panel = panel(unsupported_protocol, 'calibration-unsupported', 4)
    unsupported, _, d = control('unsupported-law', unsupported_protocol,
        (CalibrationPanel(unknown_panel, truth(unknown_panel, (1,))),), '1/2')
    assert unsupported['threshold'] is None and len(d.retained) == 6
    infeasible_panel = panel(p, 'calibration-infeasible', 4)
    empty, _, d = control('statistical-empty', p,
        (CalibrationPanel(infeasible_panel, truth(infeasible_panel, (), feasible=False)),), '1/2')
    assert not d.retained and 'statistical_empty_pool' in d.reasons
    empty['interpretation'] = 'Empty statistical prefix does not certify future infeasibility.'
    return {'schema': 'lupine.discovery.decision_pool.synthetic_example.v1',
        'controls_passed': 6, 'physical_attestation': 'not_established_by_this_program',
        'scope': 'Exact Python API controls; not a wire schema or physical coverage validation.',
        'cases': [finite, incomplete, insufficient, ties, unsupported, empty]}


if __name__ == '__main__':
    print(json.dumps(run(), indent=2, sort_keys=True))
