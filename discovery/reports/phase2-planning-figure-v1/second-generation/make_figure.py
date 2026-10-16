#!/usr/bin/env python3
"""Fixed hypothetical examples; exact planner arithmetic, floats only for plotting."""
from __future__ import annotations

import csv
from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path
import sys

sys.dont_write_bytecode = True
OUTPUT = Path(__file__).resolve().parent
PROJECT = OUTPUT.parents[1]
os.environ['MPLCONFIGDIR'] = str(OUTPUT / '.mplconfig')
sys.path.insert(0, str(PROJECT / 'src'))

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from lupine_discovery import study_planning

EXPECTED_PLANNER_SHA256 = '7a2b00bc81f8bc025b9bb3d6c6c212875d44a9839c4665ec67c86e46fe5f6d83'
ALPHA = Fraction(1, 10)
CUTOFF = Fraction(3, 4)
ASSUMED_PROBABILITIES = (Fraction(4, 5), Fraction(19, 20))
COUNTS = range(61)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run():
    source = PROJECT / 'src/lupine_discovery/study_planning.py'
    if Path(study_planning.__file__).resolve() != source or digest(source) != EXPECTED_PLANNER_SHA256:
        raise RuntimeError('Planner source differs from the fixed reviewed source.')
    plans = {p: [study_planning.plan_pool_threshold(n, ALPHA, CUTOFF, p) for n in COUNTS]
             for p in ASSUMED_PROBABILITIES}
    rows = []
    for p in ASSUMED_PROBABILITIES:
        for plan in plans[p]:
            event = plan.threshold_event_probability
            if not isinstance(event, Fraction):
                raise RuntimeError('The specified hypothetical scenario requires an exact event probability.')
            rows.append({
                'alpha': str(ALPHA), 'cutoff': str(CUTOFF), 'assumed_iid_score_probability': str(p),
                'calibration_count': plan.calibration_count, 'rank': plan.rank,
                'finite_rank': plan.finite_rank,
                'minimum_finite_calibration_count': plan.minimum_finite_calibration_count,
                'tolerated_above_cutoff': plan.tolerated_above_cutoff,
                'threshold_event_probability': str(event),
                'probability_numerator': str(event.numerator),
                'probability_denominator': str(event.denominator),
                'planning_status': plan.planning_status,
                'adequacy_status': plan.adequacy_status,
                'calibrated_guarantee_status': plan.calibrated_guarantee_status,
                'premise_status': plan.premise_status,
            })
    p = Fraction(19, 20)
    before = plans[p][19].threshold_event_probability
    after = plans[p][20].threshold_event_probability
    ratio = after / before
    if ratio != Fraction(741, 760):
        raise RuntimeError('The fixed explanatory contrast differs from its exact declared ratio.')
    data = {
        'schema': 'lupine.discovery.hypothetical_planning_figure.v1',
        'scope': 'Fixed hypothetical IID threshold-event probabilities; no dataset or observed outcomes.',
        'event': 'tau <= 3/4', 'alpha': str(ALPHA), 'cutoff': str(CUTOFF),
        'assumed_score_probabilities': [str(p) for p in ASSUMED_PROBABILITIES],
        'counts': {'first': 0, 'last': 60},
        'rank_rule': 'ceil((n + 1) * (1 - alpha))',
        'probability_rule_when_finite': 'sum(j=k..n, binomial(n,j) * p^j * (1-p)^(n-j))',
        'rank_infeasible_rule': 'tau=1, so tau<=3/4 is deterministically false; this is not a calibrated guarantee.',
        'premises': list(plans[p][19].premises),
        'exact_n19_to_n20_contrast': {
            'assumed_score_probability': '19/20', 'rank_at_19': plans[p][19].rank,
            'rank_at_20': plans[p][20].rank, 'probability_at_19': str(before),
            'probability_at_20': str(after), 'probability_20_over_probability_19': str(ratio),
            'equivalent_requested_ratio': '741/760', 'relative_decrease': str(1-ratio),
            'absolute_probability_decrease': str(before-after),
        },
        'does_not_establish': ['measured coverage', 'statistical power', 'useful candidate reduction',
                               'a sampling independence attestation', 'physical validity', 'scientific superiority'],
        'arithmetic': 'All stored data use integers and exact reduced rational strings. Floats are used only for figure coordinates and labels.',
        'rows': rows,
    }
    (OUTPUT / 'exact-values.json').write_text(json.dumps(data, indent=2) + '\n')
    with (OUTPUT / 'exact-values.csv').open('w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    plt.rcParams.update({
        'font.family': 'DejaVu Sans', 'font.size': 10, 'axes.spines.top': False,
        'axes.spines.right': False, 'svg.hashsalt': 'lupine-prospective-planning-figure-v1',
        'axes.titleweight': 'semibold', 'axes.labelcolor': '#273544',
        'text.color': '#273544', 'xtick.color': '#4a5968', 'ytick.color': '#4a5968',
    })
    figure = plt.figure(figsize=(12.4, 7.3), facecolor='white')
    grid = figure.add_gridspec(1, 2, width_ratios=[2.5, 1], left=.085, right=.965,
                              bottom=.25, top=.75, wspace=.31)
    main, detail = figure.add_subplot(grid[0, 0]), figure.add_subplot(grid[0, 1])
    colors = {Fraction(4, 5): '#267884', Fraction(19, 20): '#70549a'}
    main.axvspan(0, 8.5, color='#eff1f4', zorder=0)
    for probability in ASSUMED_PROBABILITIES:
        main.plot(list(COUNTS), [float(plan.threshold_event_probability) for plan in plans[probability]],
                  marker='o', markersize=3, linewidth=1.45, color=colors[probability],
                  label=f'Assumed p = {probability}')
    main.axvline(9, color='#687786', linewidth=1.05, linestyle=(0, (4, 4)))
    main.text(10.0, .975, 'First finite rank: n = 9', va='top', fontsize=9)
    main.text(4.2, .40, 'No finite\nrank', ha='center', color='#596574', fontsize=9)
    main.annotate(r'$\tau=1$' + '\nprobability 0', xy=(4.2, .015), xytext=(4.2, .26),
                  ha='center', fontsize=8, color='#596574',
                  arrowprops={'arrowstyle':'-', 'color':'#a1aab3', 'linewidth':.8})
    main.scatter([19,20], [float(before),float(after)], s=45, facecolor='white',
                 edgecolor=colors[p], linewidth=1.6, zorder=5)
    main.set(xlim=(0,60), ylim=(-.025,1.025), xticks=range(0,61,10),
             xlabel='Calibration panel count n', ylabel=r'$\Pr(\tau \leq 3/4)$')
    main.grid(axis='y', color='#e5e8ec', linewidth=.65)
    main.legend(loc='upper left', bbox_to_anchor=(.48,.51), frameon=False, fontsize=9)
    main.set_title('Exact probabilities at each integer count', loc='left', fontsize=11, pad=14)

    detail.plot([19,20], [float(before),float(after)], marker='o', markersize=7,
                linewidth=2, color=colors[p])
    for n, value in [(19,before),(20,after)]:
        detail.annotate(f'{float(value):.6f}', (n,float(value)), xytext=(0,11),
                        textcoords='offset points', ha='center', fontsize=10, color=colors[p])
    detail.set(xlim=(18.7,20.3), ylim=(.70,.80), xticks=[19,20],
               xticklabels=['n = 19\nk = 18','n = 20\nk = 19'], yticks=[.70,.725,.75,.775,.80])
    detail.tick_params(axis='y', labelsize=9)
    detail.grid(axis='y', color='#e5e8ec', linewidth=.65)
    detail.set_title('A one-panel increase can lower it', loc='left', fontsize=11, pad=14)
    detail.text(.5,.965, 'Assumed p = 19/20', transform=detail.transAxes,
                ha='center', va='top', fontsize=10, color=colors[p])
    detail.text(.5,.12, r'$P_{20}/P_{19}=741/760=39/40$' + '\n2.5% relative decrease',
                transform=detail.transAxes, ha='center', fontsize=10)

    figure.text(.085,.94, 'Hypothetical IID threshold-event probability',
                fontsize=20, fontweight='semibold', va='top')
    figure.text(.085,.87, r'Fixed $\alpha=1/10$, cutoff $c=3/4$; assumed $p=\Pr(R\leq c)$', fontsize=12)
    figure.text(.085,.825, 'The rank changes in steps. This event probability need not increase with the number of panels.',
                fontsize=10, color='#52616d')
    figure.text(.085,.175, 'A finite rank is not evidence of useful reduction. Lines connect integer counts only.', fontsize=10)
    figure.text(.085,.125, 'IID score events are assumed conditional on a frozen rule. No observations were used.', fontsize=10)
    figure.text(.085,.08, 'These probabilities are not measured coverage, statistical power, or evidence of useful candidate reduction.',
                fontsize=10, fontweight='semibold')
    figure.savefig(OUTPUT/'prospective-threshold-probability.svg', metadata={'Date':None,'Creator':'Lupine Discovery hypothetical planning figure'})
    figure.savefig(OUTPUT/'prospective-threshold-probability.png', dpi=180,
                   metadata={'Software':'Lupine Discovery hypothetical planning figure'})
    plt.close(figure)

    paths = [source, PROJECT/'src/lupine_discovery/calibration.py', PROJECT/'src/lupine_discovery/core.py', Path(__file__).resolve()]
    bindings = {'schema':'lupine.discovery.planning_figure_source_bindings.v1',
                'python_version':sys.version.split()[0], 'matplotlib_version':matplotlib.__version__,
                'source_files':{str(path.relative_to(PROJECT)):{'bytes':path.stat().st_size,'sha256':digest(path)} for path in paths},
                'data_points':len(rows), 'new_test_pass_claim':False,
                'scope':'Existing exact planner for two fixed hypothetical score laws; no outcomes, data sources, fitting or scientific choices.'}
    (OUTPUT/'source-bindings.json').write_text(json.dumps(bindings,indent=2)+'\n')
    print(json.dumps({'status':'GENERATED','exact_data_points':len(rows),'first_finite_count':9,
                      'ratio_n20_over_n19':str(ratio),'equivalent_ratio':'741/760',
                      'artifacts':['exact-values.json','exact-values.csv','prospective-threshold-probability.svg',
                                   'prospective-threshold-probability.png','source-bindings.json'],
                      'new_test_pass_claim':False},indent=2))


if __name__ == '__main__':
    run()
