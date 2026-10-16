"""Original hypothetical figure from exact sequential recurrences, no runtime import."""
import argparse
import csv
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import time

BASE = Path(__file__).resolve().parent
DISCOVERY = BASE.parents[1]
os.environ['MPLCONFIGDIR'] = str(BASE / 'matplotlib-config')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import MultipleLocator


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, sort_keys=True, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-directory', required=True, type=Path)
    args = parser.parse_args()
    target = args.output_directory.resolve()
    if not target.is_relative_to(BASE):
        raise ValueError('Output must remain inside this ignored figure directory')
    target.mkdir(parents=True, exist_ok=False)
    started = datetime.now(timezone.utc).isoformat()
    clock = time.monotonic()
    script_before = digest(Path(__file__))
    paths = ('src/lupine_discovery/finite_planning.py',
             'src/lupine_discovery/study_planning.py')
    bindings_before = {path: digest(DISCOVERY / path) for path in paths}
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'],
                                   cwd=DISCOVERY, text=True).strip()
    status = subprocess.check_output(['git', 'status', '--porcelain'],
                                     cwd=DISCOVERY, text=True)

    population = 100
    rho = Fraction(1, 10)
    eta = Fraction(1, 20)
    exact_expected_failures = population * rho
    minimum_null_failures = -(-exact_expected_failures.numerator
                             // exact_expected_failures.denominator)
    nonfailures = population - minimum_null_failures
    finite = iid = Fraction(1)
    rows = []
    for sample_count in range(population + 1):
        if sample_count:
            # Given the first e-1 draws were nonfailures, precisely
            # (M-K)-(e-1) nonfailures remain among M-(e-1) remaining IDs.
            # Once more than M-K IDs are drawn, the zero-failure event is
            # impossible. The branch preserves an exact zero, never a floor.
            finite = (finite * Fraction(nonfailures - sample_count + 1,
                                        population - sample_count + 1)
                      if sample_count <= nonfailures else Fraction(0))
            # A separate IID experiment at its null boundary q=rho.
            iid *= 1 - rho
        rows.append({
            'sample_count': sample_count,
            'finite_null_bound': str(finite),
            'finite_numerator': str(finite.numerator),
            'finite_denominator': str(finite.denominator),
            'iid_null_bound': str(iid),
            'iid_numerator': str(iid.numerator),
            'iid_denominator': str(iid.denominator),
            'finite_qualifies_at_eta': sample_count > 0 and finite <= eta,
            'iid_qualifies_at_eta': sample_count > 0 and iid <= eta,
        })
    finite_minimum = next(row['sample_count'] for row in rows
                          if row['finite_qualifies_at_eta'])
    iid_minimum = next(row['sample_count'] for row in rows
                       if row['iid_qualifies_at_eta'])
    assert (minimum_null_failures, finite_minimum, iid_minimum) == (10, 25, 29)
    assert rows[90]['finite_null_bound'] != '0'
    assert all(row['finite_null_bound'] == '0' for row in rows[91:])
    assert rows[-1]['iid_null_bound'] != '0'

    payload = {
        'schema': 'lupine.discovery.hypothetical_finite_planning_figure.v1',
        'population_panels': population, 'loss_ceiling': str(rho),
        'significance': str(eta), 'minimum_null_failures': minimum_null_failures,
        'attainable_null_failure_fraction': str(Fraction(minimum_null_failures, population)),
        'sample_count_range': [0, population],
        'finite_minimum_positive_count': finite_minimum,
        'iid_minimum_positive_count': iid_minimum,
        'finite_first_exact_zero_count': nonfailures + 1,
        'finite_experiment': 'Uniform draw of distinct IDs without replacement from a fixed complete residual frame; fixed policy and binary endpoints.',
        'iid_experiment': 'Separate hypothetical IID Bernoulli failures conditional on a frozen policy, with common probability q at the null boundary rho.',
        'finite_derivation': 'Start at one; at draw e multiply by (M-K_min-e+1)/(M-e+1), while e<=M-K_min; otherwise exact zero.',
        'iid_derivation': 'Start at one; at each draw multiply by 1-rho.',
        'finite_null': 'Fixed finite-population failure fraction K/M >= rho; supremum attained at K_min.',
        'iid_null': 'Common IID failure probability q >= rho; supremum attained at q=rho.',
        'scientific_adequacy': 'unestablished', 'observed_evidence': 'no_observations',
        'power': 'not_computed', 'sampling_premises': 'hypothetical_unverified',
        'comparison_claim': 'Distinct sampling experiments; 25 versus 29 is not evidence of improved performance, acquisition cost, or future-population risk.',
        'rendering': 'All table values and qualifying counts are exact. Only plotting coordinates convert Fraction to float. Axes are linear and exact zero is plotted at zero.',
        'rows': rows,
    }
    write_json(target / 'exact-data.json', payload)
    with (target / 'exact-data.csv').open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    write_json(target / 'source-bindings.json', {
        'commit': head, 'files': bindings_before,
        'binding_scope': 'Current planner source identity only; no project module imported and no runtime conformance assertion executed.',
    })

    plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 11,
                         'svg.hashsalt': 'lupine-finite-planning-figure-v1',
                         'axes.spines.top': False, 'axes.spines.right': False})
    figure, axes = plt.subplots(1, 2, figsize=(14, 7.3), gridspec_kw={'width_ratios': [1.1, 1]})
    figure.subplots_adjust(left=.07, right=.975, bottom=.28, top=.70, wspace=.22)
    finite_color, iid_color, threshold_color = '#126a63', '#a85324', '#77716b'
    x = [row['sample_count'] for row in rows]
    y_finite = [float(Fraction(row['finite_null_bound'])) for row in rows]
    y_iid = [float(Fraction(row['iid_null_bound'])) for row in rows]
    for axis in axes:
        axis.plot(x, y_finite, color=finite_color, linewidth=2.8,
                  label='Fixed finite frame: distinct IDs, without replacement')
        axis.plot(x, y_iid, color=iid_color, linewidth=2.4, linestyle='--',
                  label='Separate hypothetical IID experiment')
        axis.axhline(float(eta), color=threshold_color, linestyle=':', linewidth=1.5,
                     label='Significance η = 1/20')
        axis.set_xlabel('Evaluation panel count e')
        axis.grid(axis='y', color='#e7e4de', linewidth=.8)
        axis.set_axisbelow(True)
        axis.set_ylim(bottom=0)
    axes[0].set_title('Full range', loc='left', fontweight='bold', pad=12)
    axes[0].set_ylabel('Probability of zero failures under the null boundary')
    axes[0].set_xlim(0, 100)
    axes[0].set_ylim(0, 1.02)
    axes[0].xaxis.set_major_locator(MultipleLocator(20))
    axes[0].yaxis.set_major_locator(MultipleLocator(.2))
    axes[0].annotate('Finite bound is exactly zero\nfrom e = 91 through the census.',
                     xy=(95, 0), xytext=(46, .22), fontsize=10.5,
                     arrowprops={'arrowstyle': '->', 'color': finite_color}, color=finite_color)
    axes[1].set_title('Detail near the significance threshold', loc='left',
                      fontweight='bold', pad=12)
    axes[1].set_xlim(18, 34)
    axes[1].set_ylim(0, .16)
    axes[1].xaxis.set_major_locator(MultipleLocator(2))
    axes[1].yaxis.set_major_locator(MultipleLocator(.04))
    axes[1].plot(x, y_finite, linestyle='none', marker='o', markersize=3.8, color=finite_color)
    axes[1].plot(x, y_iid, linestyle='none', marker='s', markersize=3.8, color=iid_color)
    axes[1].annotate('25: first qualifying\nfinite-frame count',
                     xy=(25, y_finite[25]), xytext=(19.1, .012), color=finite_color,
                     fontsize=10.5, arrowprops={'arrowstyle': '->', 'color': finite_color})
    axes[1].annotate('29: first qualifying\nIID count',
                     xy=(29, y_iid[29]), xytext=(27.1, .116), color=iid_color,
                     fontsize=10.5, arrowprops={'arrowstyle': '->', 'color': iid_color})
    axes[1].text(33.5, float(eta) + .004, 'η = 1/20', ha='right', va='bottom',
                 fontsize=10, color=threshold_color)
    figure.suptitle('Zero-failure resolution under two sampling designs',
                    x=.07, y=.955, ha='left', fontsize=22, fontweight='bold')
    figure.text(.07, .891,
                'Fixed hypothetical settings: M = 100, ρ = 1/10, η = 1/20. '
                'Finite null boundary: 10 failing IDs.', fontsize=12)
    handles, labels = axes[0].get_legend_handles_labels()
    figure.legend(handles, labels, loc='upper left', bbox_to_anchor=(.065, .857),
                   frameon=False, ncol=1, fontsize=10.5, handlelength=3.2,
                   labelspacing=.45)
    figure.text(.07, .185,
                'Exact minimum counts: 25 for the fixed finite frame; 29 for the hypothetical IID experiment.',
                fontsize=12, fontweight='bold')
    figure.text(.07, .132,
                'These are different sampling experiments. The count difference does not establish better performance or lower acquisition cost.',
                fontsize=10.5)
    figure.text(.07, .088,
                'Prospective resolution if zero failures occur; no observations, power, physical validity, or future-risk guarantee is established.',
                fontsize=10.5)
    figure.text(.07, .044,
                'Exact rational CSV/JSON accompany this figure. Coordinates use floating-point rendering; both axes are linear and zeros stay zero.',
                fontsize=9.5, color='#57534d')
    figure.savefig(target / 'finite-versus-iid.png', dpi=170,
                   metadata={'Software': 'Lupine Discovery hypothetical figure generator'})
    figure.savefig(target / 'finite-versus-iid.svg',
                   metadata={'Date': None, 'Creator': 'Lupine Discovery hypothetical figure generator'})
    plt.close(figure)

    bindings_after = {path: digest(DISCOVERY / path) for path in paths}
    head_after = subprocess.check_output(['git', 'rev-parse', 'HEAD'],
                                         cwd=DISCOVERY, text=True).strip()
    status_after = subprocess.check_output(['git', 'status', '--porcelain'],
                                           cwd=DISCOVERY, text=True)
    assert bindings_before == bindings_after
    assert digest(Path(__file__)) == script_before
    assert head_after == head and status_after == status
    receipt = {
        'status': 'GENERATED', 'command': [sys.executable, str(Path(__file__).resolve()), *sys.argv[1:]],
        'started_at_utc': started, 'finished_at_utc': datetime.now(timezone.utc).isoformat(),
        'elapsed_seconds': time.monotonic() - clock, 'exit_code': 0,
        'python_version': platform.python_version(), 'matplotlib_version': matplotlib.__version__,
        'commit_before': head, 'commit_after': head_after,
        'worktree_status_before': status, 'worktree_status_after': status_after,
        'script_sha256': script_before, 'bound_sources_unchanged': bindings_before == bindings_after,
        'exact_table_rows': len(rows), 'project_modules_imported': False,
        'runtime_conformance_executed': False, 'scientific_data_read': False,
        'new_tests_or_experiments_claimed': False,
        'artifacts': {path.name: digest(path) for path in sorted(target.iterdir()) if path.is_file()},
    }
    write_json(target / 'execution.json', receipt)
    print(json.dumps(receipt, sort_keys=True))


if __name__ == '__main__':
    main()
