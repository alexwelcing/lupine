#!/usr/bin/env python3
"""Verify a completed replay, project its dashboard, and seal a local audit copy.

Never runs the scientific replay or reads the source archive/target table. The
full compressed report remains a local ignored artifact because its policy
audit events contain revealed point targets. Only derived summaries are bundled.
"""
from __future__ import annotations

import argparse
import copy
import gzip
import hashlib
import io
import json
from pathlib import Path
import sys

from lupine_discovery.serialization import loads


SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))
import constrained_replay as replay


DISPLAY_POLICIES = ('interval', 'nominal_5nn', 'nearest_1nn', 'random_0')
FAILURE_KINDS = ('interval_miss', 'lost_optimum', 'false_infeasibility', 'regret_violation')
RAW_PAYLOAD_FIELDS = frozenset(('raw_source', 'raw_archive', 'raw_source_rows', 'source_rows',
                                'evaluation_targets', 'evaluation_table', 'target_table'))


def _sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def verify_full_report(raw):
    """Verify both receipt content and normalized scientific identity first."""
    if not isinstance(raw, bytes):
        raise TypeError('full report input must be exact bytes')
    report = loads(raw.decode('utf-8'))
    if not isinstance(report, dict) or report.get('schema') != 'lupine.discovery.constrained.replay.v1':
        raise ValueError('expected a complete constrained replay report')
    checksum = report.get('report_content_sha256')
    if not isinstance(checksum, str) or checksum != replay.digest({
            key: value for key, value in report.items() if key != 'report_content_sha256'}):
        raise ValueError('full replay report content digest mismatch')
    scientific = report.get('scientific_result_sha256')
    if not isinstance(scientific, str) or scientific != replay.scientific_result_identity(report):
        raise ValueError('normalized scientific result digest mismatch')
    return report


def deterministic_gzip(raw):
    """Stable gzip header, no filename/mtime, and exactly recoverable input bytes."""
    buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode='wb', filename='', mtime=0, compresslevel=9) as stream:
        stream.write(raw)
    return buffer.getvalue()


def _panel_identity(panel):
    return {key: copy.deepcopy(panel[key]) for key in ('panel_id', 'role', 'operational_status')}


def _coverage_failure(panel, coverage, destination):
    if not isinstance(coverage, dict) or not isinstance(coverage.get('misses'), list):
        raise ValueError('every panel coverage audit must include its complete misses array')
    if coverage['misses'] or coverage.get('panel_simultaneous') is False:
        destination['interval_miss'].append({**_panel_identity(panel),
            'coverage_scope': coverage.get('scope'),
            'panel_simultaneous': coverage.get('panel_simultaneous'),
            'misses': copy.deepcopy(coverage['misses'])})


def _screening_failures(panel, screening, destination):
    if not isinstance(screening, dict):
        raise ValueError('every screening audit must be an object')
    for field, category in (('lost_optimum_ids', 'lost_optimum'),
                            ('false_infeasibility_exclusions', 'false_infeasibility')):
        if not isinstance(screening.get(field), list):
            raise ValueError(f'every screening audit must include its complete {field} array')
        if screening[field] or (category == 'lost_optimum' and screening.get('all_optimum_retained') is False):
            summary = {**_panel_identity(panel), field: copy.deepcopy(screening[field])}
            if category == 'lost_optimum' and 'all_optimum_retained' in screening:
                summary['all_optimum_retained'] = screening['all_optimum_retained']
            destination[category].append(summary)
    if 'conditional_regret_bound_violation' not in screening:
        raise ValueError('every screening audit must state its regret-check availability')
    if screening['conditional_regret_bound_violation'] is True:
        if not isinstance(screening.get('selection'), dict):
            raise ValueError('a regret violation requires the audited selection')
        destination['regret_violation'].append({**_panel_identity(panel),
            'conditional_regret_bound_violation': True,
            'certified_incumbent_true_regret': screening.get('certified_incumbent_true_regret'),
            'incumbent': screening['selection'].get('incumbent'),
            'regret_bound': screening['selection'].get('regret_bound')})


def failure_panels(panels):
    """Keep every reported initial-screening failure, without row truncation."""
    if not isinstance(panels, list):
        raise ValueError('the full report must contain its panel audit array')
    result = {role: {kind: [] for kind in FAILURE_KINDS}
              for role in ('primary', 'shift', 'unsupported_transfer_diagnostic')}
    seen = set()
    for panel in panels:
        if not isinstance(panel, dict) or panel.get('role') not in ('primary', 'shift'):
            raise ValueError('panel audit has an invalid arm')
        pid = panel.get('panel_id')
        if not isinstance(pid, str) or not pid or pid in seen:
            raise ValueError('panel audit IDs must be nonempty and unique')
        seen.add(pid)
        _panel_identity(panel)
        coverage = panel.get('coverage')
        coverage_destination = result['unsupported_transfer_diagnostic'] if (
            isinstance(coverage, dict) and coverage.get('scope') == 'unsupported_transfer_diagnostic'
        ) else result[panel['role']]
        _coverage_failure(panel, coverage, coverage_destination)
        _screening_failures(panel, panel.get('screening'), result[panel['role']])
        diagnostic = panel.get('unsupported_transfer_diagnostic')
        if diagnostic is not None:
            if not isinstance(diagnostic, dict):
                raise ValueError('unsupported transfer diagnostic must be an object or null')
            diagnostic_coverage = diagnostic.get('coverage')
            # The same coverage is intentionally linked from the operational
            # panel and diagnostic. Record it once in the diagnostic section.
            if diagnostic_coverage != coverage or coverage_destination is not result['unsupported_transfer_diagnostic']:
                _coverage_failure(panel, diagnostic_coverage, result['unsupported_transfer_diagnostic'])
            _screening_failures(panel, diagnostic.get('screening'), result['unsupported_transfer_diagnostic'])
    return result


def project_report(report, identity):
    """Project verified derived results; preserve gate and aggregate values."""
    if RAW_PAYLOAD_FIELDS & report.keys():
        raise ValueError('raw source or evaluation tables cannot enter the dashboard projection')
    if not isinstance(report.get('gates'), dict) or not isinstance(report.get('arms'), dict):
        raise ValueError('the full report must include gates and arm aggregates')
    if set(report['arms']) != {'primary', 'shift'}:
        raise ValueError('the full report must include primary and shift arm aggregates')
    omitted = {'schema', 'report_content_sha256', 'panels', 'oracle_access_log', 'arms'}
    dashboard = {key: copy.deepcopy(value) for key, value in report.items() if key not in omitted}
    dashboard['schema'] = 'lupine.discovery.constrained.dashboard.v1'
    dashboard['arms'] = {}
    for role, arm in report['arms'].items():
        if not isinstance(arm, dict) or not isinstance(arm.get('policy_curves'), dict):
            raise ValueError('each arm must have its recorded policy curves')
        if set(arm['policy_curves']) != set(replay.POLICIES):
            raise ValueError('a full report must preserve all 100 random-seed policy curves')
        projected = {key: copy.deepcopy(value) for key, value in arm.items() if key != 'policy_curves'}
        projected['policy_curves'] = {key: copy.deepcopy(arm['policy_curves'][key]) for key in DISPLAY_POLICIES}
        if not isinstance(projected.get('random_sensitivity'), dict):
            raise ValueError('each arm must include the complete random sensitivity summary')
        projected['random_sensitivity']['all_seed_curves'] = {
            'artifact': identity['path'],
            'json_location': f'arms.{role}.policy_curves.random_0 through random_99',
            'distribution': 'local_reproducible_artifact_not_bundled',
        }
        dashboard['arms'][role] = projected
    dashboard['failure_panels'] = failure_panels(report['panels'])
    dashboard['failure_panel_scope'] = (
        'Every reported initial-screening interval miss, lost optimum, false infeasibility exclusion, '
        'and regret violation is included without truncation. Unsupported-transfer diagnostics are '
        'separate from operational decisions. Full policy events remain in the local audit artifact.')
    dashboard['full_report_identity'] = copy.deepcopy(identity)
    dashboard['projection'] = {
        'display_policies': list(DISPLAY_POLICIES),
        'all_recorded_gates_checks_and_arm_aggregates_preserved': True,
        'all_random_seed_sensitivity_numeric_values_preserved': True,
        'full_report_bytes_reproduction_claim': False,
        'scientific_result_identity_scope': (
            'Normalized scientific inputs, policy results, complete curves and gate checks; excludes '
            'run times, machine paths and engineering-receipt byte identities. Requires equivalent validation status.'),
        'full_report_reproduction': {
            'replay': copy.deepcopy(report.get('reproduction')),
            'projection_command': ['python', 'scripts/constrained_dashboard.py', 'FULL_REPLAY_REPORT.json'],
        },
    }
    dashboard['dashboard_content_sha256'] = replay.digest(dashboard)
    return dashboard


def _display_path(path):
    try:
        return Path(path).resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return str(path)


def build_dashboard(full_report_path, output_path, resource_path, full_artifact_path):
    """Validate everything before any destination is created or overwritten."""
    paths = [Path(path) for path in (full_report_path, output_path, resource_path, full_artifact_path)]
    if len({path.resolve() for path in paths}) != len(paths):
        raise ValueError('source and all three output destinations must be distinct')
    raw = paths[0].read_bytes()
    report = verify_full_report(raw)
    compressed = deterministic_gzip(raw)
    identity = {
        'path': _display_path(paths[3]), 'compression': 'gzip',
        'distribution': 'local_reproducible_artifact_not_bundled',
        'compressed_sha256': _sha256(compressed), 'uncompressed_sha256': _sha256(raw),
        'report_content_sha256': report['report_content_sha256'],
        'scientific_result_sha256': report['scientific_result_sha256'],
        'compressed_bytes': len(compressed), 'uncompressed_bytes': len(raw),
        'byte_identity_scope': 'This local replay artifact only; not a cross-run scientific reproducibility claim.',
    }
    dashboard = project_report(report, identity)
    projected_raw = replay.canonical_bytes(dashboard) + b'\n'
    for destination, payload in ((paths[1], projected_raw), (paths[2], projected_raw), (paths[3], compressed)):
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(payload)
    return dashboard


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('full_report', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'reports/constrained-v1.json')
    parser.add_argument('--resource', type=Path, default=ROOT / 'src/lupine_discovery/resources/constrained-v1.json')
    parser.add_argument('--full-artifact', type=Path, default=ROOT / '.cache/constrained/constrained-full-v1.json.gz')
    args = parser.parse_args(argv)
    dashboard = build_dashboard(args.full_report, args.output, args.resource, args.full_artifact)
    print(json.dumps({'output': str(args.output), 'resource': str(args.resource),
                      'full_report_identity': dashboard['full_report_identity'],
                      'dashboard_content_sha256': dashboard['dashboard_content_sha256']}, sort_keys=True))


if __name__ == '__main__':
    main()
