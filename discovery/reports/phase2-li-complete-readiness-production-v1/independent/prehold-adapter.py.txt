"""Fixed-source bounded Li readiness adapter. Actual operations require frozen pins."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).absolute().parent))
import li_v3_readiness as core

ROOT = core.ROOT
custody = core.custody
diagnostic = core.diagnostic
SCHEMA = 'lupine.discovery.li_v3.readiness.production.v1'
PROFILE = 'li_v3.complete_bounded_readiness.v1'
RESULT_SCHEMA = 'lupine.discovery.li_v3.readiness.result.v1'
PRODUCTION_BINDING = 'FIXED_LI_V3_SOURCE_G34_PREREQUISITE'
CORE_SHA256 = '5fd1b06c683bb44ed582964bc59f5281cbdbe7e880c749ec9c55276145fa5219'
BASELINE_COMMIT = '2975d6d0b9111cc84adb82ccc673bc82339ab154'
BASELINE_MANIFEST_SHA256 = 'b2c35e48c8dc837d78aba0047d112dabbd30b8ff11e66bba0f45e9da92a0eb2f'
BASELINE_RUNTIME_COUNT = 339
FROZEN_PATHS = (
    'scripts/li_v3_readiness.py', 'scripts/li_v3_readiness_production.py',
    'tests/test_li_v3_readiness.py', 'tests/test_li_v3_readiness_review.py',
    'tests/test_li_v3_readiness_production.py', 'tests/test_li_v3_readiness_production_review.py',
    'docs/li-v3-readiness.md', 'docs/li-v3-readiness-production.md')
PREREQUISITE = '.cache/li-v3-custody/growth-predicate-audit-v1/1/public.json'
PREREQUISITE_SHA256 = '68c9042325e93cebd08f9dd056ccbf8833b16f4f045f25bbe2e8be69623326be'
PREREQUISITE_PRODUCER = 'a064a2c0e4a7cce1fbcb0541f49aae132944e785'
PROJECTION_SHA256 = 'f905ac1f31d4f139da54139585e91aeb346d3abf540bb87f1b306c042faf345e'
PROJECTION_KEYS = ('scope', 'initial_padding_semantics', 'first_rejection', 'selected_growth',
    'selected_growth_exposure', 'exposure', 'aggregate_exposure', 'families', 'aggregate_status',
    'diagnostic_complete', 'predecessor_reproduction_checked', 'predecessor_reproduction_matched',
    'engineering_status', 'reason')
OBJECT_SHA256 = diagnostic.G31.header_diagnostic.OBJECT_SHA256
CAPTURE_SHA256 = diagnostic.G31.header_diagnostic.CAPTURE_SHA256
MAX_PUBLIC = 2 * 1024 * 1024
MAX_PINNED_FILE = 8 * 1024 * 1024
PHASE_BINDINGS = {'documentary': None, 'frame': None}
GUARD_REASONS = frozenset({'FROZEN_SOURCE_REQUIRED', 'SOURCE_CONTEXT_CHANGED',
    'G34_PREREQUISITE_INVALID', 'G34_REPLAY_MISMATCH', 'G34_REPLAY_FAILED',
    'PHASE_BINDING_UNBOUND', 'PHASE_BINDING_INVALID', 'PHASE_PRIOR_INVALID',
    'PUBLIC_RECEIPT_LIMIT', 'INTERNAL_FAILURE', 'CLI_ARGUMENT_INVALID'})


class ProductionError(ValueError):
    def __init__(self, reason):
        super().__init__(reason if reason in GUARD_REASONS else 'INTERNAL_FAILURE')


def _require(condition, reason):
    if not condition:
        raise ProductionError(reason)


def _git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True,
                          check=True, timeout=30).stdout


def _oid(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()


def _git_files(raw, index=False):
    result = {}
    for entry in raw.split(b'\0'):
        if not entry:
            continue
        header, path = entry.split(b'\t', 1)
        fields = header.decode('ascii').split()
        if index:
            _require(len(fields) == 3 and fields[2] == '0', 'FROZEN_SOURCE_REQUIRED')
            mode, oid = fields[:2]
        else:
            _require(len(fields) == 3 and fields[1] == 'blob', 'FROZEN_SOURCE_REQUIRED')
            mode, _, oid = fields
        name = path.decode('utf-8')
        _require(mode in ('100644', '100755') and name not in result,
                 'FROZEN_SOURCE_REQUIRED')
        result[name] = oid
    return result


def _identity(value):
    keys = {'mode', 'commit', 'files', 'baseline_commit', 'baseline_manifest_sha256', 'g34'}
    _require(core._keys(value, keys) and value['mode'] == 'committed_source'
             and type(value['commit']) is str and re.fullmatch(r'[0-9a-f]{40}', value['commit'])
             and value['baseline_commit'] == BASELINE_COMMIT
             and value['baseline_manifest_sha256'] == BASELINE_MANIFEST_SHA256
             and core._keys(value['files'], FROZEN_PATHS)
             and all(core._digest(v) for v in value['files'].values())
             and value['files'][FROZEN_PATHS[0]] == CORE_SHA256, 'FROZEN_SOURCE_REQUIRED')
    diagnostic._identity(value['g34'])
    _require(value['g34']['commit'] == value['commit'], 'FROZEN_SOURCE_REQUIRED')
    return value


def production_context():
    """Baseline/runtime and own worktree/index/HEAD agreement, before cache access."""
    try:
        _require(Path(__file__).absolute() == ROOT / FROZEN_PATHS[1]
                 and type(BASELINE_COMMIT) is str and re.fullmatch(r'[0-9a-f]{40}', BASELINE_COMMIT)
                 and core._digest(BASELINE_MANIFEST_SHA256)
                 and type(BASELINE_RUNTIME_COUNT) is int and 1 <= BASELINE_RUNTIME_COUNT <= 1024,
                 'FROZEN_SOURCE_REQUIRED')
        previous = diagnostic._identity(diagnostic.production_context())
        commit = previous['commit']
        _require(_git('rev-parse', 'HEAD').decode('ascii').strip() == commit
                 and _git('rev-parse', '--show-object-format').decode('ascii').strip() == 'sha1',
                 'FROZEN_SOURCE_REQUIRED')
        prefix = _git('rev-parse', '--show-prefix').decode('utf-8').strip()
        _git('merge-base', '--is-ancestor', BASELINE_COMMIT, commit)
        manifest_raw = _git('show', BASELINE_COMMIT + ':' + prefix + 'reports/runtime-manifest.json')
        _require(len(manifest_raw) <= MAX_PUBLIC and custody.sha256(manifest_raw) == BASELINE_MANIFEST_SHA256,
                 'FROZEN_SOURCE_REQUIRED')
        baseline = json.loads(manifest_raw)['files']
        _require(type(baseline) is dict and len(baseline) == BASELINE_RUNTIME_COUNT
                 and all(type(k) is str and not k.startswith('/') and '..' not in k.split('/')
                         and core._digest(v) for k, v in baseline.items()), 'FROZEN_SOURCE_REQUIRED')
        paths = sorted(set(baseline) | set(FROZEN_PATHS))
        pathspec = [prefix + name for name in paths]
        index = _git_files(_git('ls-files', '--stage', '-z', '--', *paths), index=True)
        head = _git_files(_git('ls-tree', '-r', '-z', '--full-name', commit, '--', *paths))
        expected_names = set(pathspec)
        # ls-files paths are relative to the discovery working directory.
        index = {prefix + name: oid for name, oid in index.items()}
        _require(set(index) == expected_names and set(head) == expected_names,
                 'FROZEN_SOURCE_REQUIRED')
        own = {}
        for name in paths:
            raw = custody._read_relative(name, MAX_PINNED_FILE)
            digest = custody.sha256(raw)
            _require(index[prefix + name] == head[prefix + name] == _oid(raw)
                     and (name not in baseline or digest == baseline[name]), 'FROZEN_SOURCE_REQUIRED')
            if name in FROZEN_PATHS:
                own[name] = digest
        _require(_git('rev-parse', 'HEAD').decode('ascii').strip() == commit,
                 'FROZEN_SOURCE_REQUIRED')
        return _identity({'mode': 'committed_source', 'commit': commit, 'files': own,
            'baseline_commit': BASELINE_COMMIT, 'baseline_manifest_sha256': BASELINE_MANIFEST_SHA256,
            'g34': previous})
    except Exception:
        raise ProductionError('FROZEN_SOURCE_REQUIRED') from None


def _projection(report):
    return {key: report[key] for key in PROJECTION_KEYS}


def _validate_prerequisite(raw):
    try:
        _require(type(raw) is bytes and len(raw) <= diagnostic.MAX_RECEIPT
                 and custody.sha256(raw) == PREREQUISITE_SHA256, 'G34_PREREQUISITE_INVALID')
        value = json.loads(raw)
        _require(custody.canonical(value) == raw and value['schema'] == diagnostic.SCHEMA
                 and value['parser_profile'] == diagnostic.PROFILE and value['action'] == 'audit'
                 and value['synthetic_fixture'] is False and value['source_identity_verified'] is True
                 and value['archive_accepted'] is False and value['status'] == 'BLOCKED_SCHEMA'
                 and value['scientific_counts'] is None and type(value['fits']) is int and value['fits'] == 0
                 and type(value['splits']) is int and value['splits'] == 0
                 and value['capture_receipt_sha256'] == CAPTURE_SHA256
                 and diagnostic._identity(value['implementation'])['commit'] == PREREQUISITE_PRODUCER
                 and custody.sha256(custody.canonical(_projection(value))) == PROJECTION_SHA256,
                 'G34_PREREQUISITE_INVALID')
        return value
    except Exception:
        raise ProductionError('G34_PREREQUISITE_INVALID') from None


def _replay(raw, report):
    e = report['exposure']
    e['header_replay_started'] = True
    previous = diagnostic._production_report()
    previous['implementation'] = report['_g34_implementation']
    previous['exposure']['whole_buffer_supplied'] = True
    previous['aggregate_exposure']['whole_buffer_supplied'] = True
    try:
        diagnostic._production_inspect(raw, previous)
    except Exception:
        raise ProductionError('G34_REPLAY_FAILED') from None
    e['header_replay_completed'] = True
    _require(custody.sha256(custody.canonical(_projection(previous))) == PROJECTION_SHA256,
             'G34_REPLAY_MISMATCH')
    report['replay_matched'] = True


def _result(phase):
    value = core._report(phase)
    value['schema'] = RESULT_SCHEMA
    value['synthetic_fixture'] = False
    value['production_binding'] = PRODUCTION_BINDING
    return value


def _prior_production(prior, phase, source):
    try:
        core._bounded_json(prior, core.LIMITS['output'])
        core._require(core._keys(prior, _result(phase)), 'PRIOR_RECEIPT_INVALID')
        exposure = prior['exposure']
        core._require(core._keys(exposure, _result(phase)['exposure']), 'PRIOR_RECEIPT_INVALID')
        for field in ('whole_buffer_supplied', 'header_replay_started', 'header_replay_completed',
                      'archive_open_started', 'archive_open_completed',
                      'archive_close_started', 'archive_close_completed'):
            core._require(exposure[field] is True, 'PRIOR_RECEIPT_INVALID')
        for prefix in ('member_opens', 'decompressions', 'utf8_decodes', 'xml_parses'):
            for state in ('started', 'completed'):
                value = exposure[prefix + '_' + state]
                core._require(type(value) is int and 0 <= value <= 4096, 'PRIOR_RECEIPT_INVALID')
            core._require(exposure[prefix + '_started'] == exposure[prefix + '_completed'], 'PRIOR_RECEIPT_INVALID')
        core._require(exposure['character_data_state'] == 'PRIVATE_XML_DECODE_COMPLETED'
                 and core._keys(exposure['layout_roles'], core.ROLES), 'PRIOR_RECEIPT_INVALID')
        operation_keys = {name + '_' + state for name in core.OPERATIONS for state in ('started', 'completed')}
        for local in exposure['layout_roles'].values():
            core._require(core._keys(local, operation_keys | {'character_data_state'})
                     and all(local[key] is True for key in operation_keys)
                     and local['character_data_state'] == 'PRIVATE_XML_DECODE_COMPLETED', 'PRIOR_RECEIPT_INVALID')
        core._require(core._keys(prior['package'], {'status', 'opaque_parts', 'opaque_semantics',
                    'unopened_payload_crc_verified', 'known_role_checks'})
                 and prior['package']['status'] == 'RESTRICTED_METADATA_VALID'
                 and type(prior['package']['opaque_parts']) is int
                 and 0 <= prior['package']['opaque_parts'] <= core.MAX_MEMBERS
                 and prior['package']['opaque_semantics'] == 'UNINTERPRETED'
                 and prior['package']['unopened_payload_crc_verified'] is False
                 and prior['package']['known_role_checks'] == 'UNCHANGED', 'PRIOR_RECEIPT_INVALID')
        core._require(core._keys(prior['roles'], core.ROLES) and prior['frame'] is None
                 and (phase != 'layout' or prior['documentary'] is None), 'PRIOR_RECEIPT_INVALID')
        success = {'layout': 'LAYOUT_READY_MAPPING_UNBOUND',
                   'documentary': 'DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS'}[phase]
        core._require(prior['schema'] == RESULT_SCHEMA and prior['synthetic_fixture'] is False
                 and prior['production_binding'] == PRODUCTION_BINDING and prior['phase'] == phase
                 and prior['status'] == 'BLOCKED_SCHEMA' and prior['engineering_status'] == 'COMPLETE'
                 and prior['reason'] == success and prior['source_sha256'] == source
                 and prior['replay_matched'] is True and prior['validation_reason_before_cleanup'] is None
                 and prior['exposure']['archive_close_completed'] is True
                 and prior['exposure']['archive_close_error'] is None
                 and prior['numeric_outcome_interpretation'] is False
                 and prior['formula_evaluation'] is False and prior['scientific_eligibility_decisions'] is False
                 and prior['sampling_independence_established'] is False
                 and prior['scientific_counts'] is None and type(prior['fits']) is int and prior['fits'] == 0
                 and type(prior['splits']) is int and prior['splits'] == 0,
                 'PRIOR_RECEIPT_INVALID')
    except (core.ReadinessError, KeyError, TypeError, ValueError):
        raise core.ReadinessError('PRIOR_RECEIPT_INVALID') from None
    return hashlib.sha256(core.canonical(prior)).hexdigest()


def _run_production(raw, phase, g34_implementation, binding=None, prior_layout=None, prior_documentary=None):
    report = _result(phase)
    holder = []
    try:
        report['source_sha256'] = custody.sha256(raw)
        report['exposure']['whole_buffer_supplied'] = True
        report['_g34_implementation'] = g34_implementation
        try:
            _replay(raw, report)
        finally:
            report.pop('_g34_implementation', None)
        doc_fields = records = None
        if phase != 'layout':
            layout_hash = _prior_production(prior_layout, 'layout', report['source_sha256'])
            if phase == 'documentary':
                doc_fields = core._doc_binding(binding, report['source_sha256'], layout_hash)
            else:
                documentary_hash = _prior_production(prior_documentary, 'documentary', report['source_sha256'])
                records = core._frame_binding(binding, report['source_sha256'], layout_hash, documentary_hash)
                doc_fields = core._doc_binding(binding['documentary_binding'], report['source_sha256'], layout_hash)
        package = core._package(raw, report, holder)
        layouts, raw_sheets = core._layout(package, report)
        if phase != 'layout':
            core._require(core.canonical(prior_layout['package']) == core.canonical(report['package'])
                     and core.canonical(prior_layout['roles']) == core.canonical(layouts), 'PRIOR_RECEIPT_INVALID')
        report['roles'] = layouts
        shared_state = [None]
        if phase == 'layout':
            report.update(engineering_status='COMPLETE', reason='LAYOUT_READY_MAPPING_UNBOUND')
        else:
            documentary = core._documentary(doc_fields, layouts, raw_sheets, package, report, shared_state)
            report['documentary'] = documentary
            if phase == 'documentary':
                report.update(engineering_status='COMPLETE', reason='DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS')
            else:
                core._require(core.canonical(prior_documentary['package']) == core.canonical(report['package'])
                         and core.canonical(prior_documentary['roles']) == core.canonical(layouts)
                         and core.canonical(prior_documentary['documentary']) == core.canonical(documentary),
                         'PRIOR_RECEIPT_INVALID')
                report['frame'] = core._frame(binding, records, documentary, package, report, shared_state)
                report.update(engineering_status='COMPLETE', reason=report['frame']['admission_status'])
    except ProductionError as error:
        core._clear(report, 'INTERNAL_FAILURE')
        report['reason'] = str(error)
    except (core.ReadinessError, core.LayoutError) as error:
        core._clear(report, str(error))
    except Exception:
        core._clear(report, 'INTERNAL_FAILURE')
    finally:
        if holder:
            report['exposure']['archive_close_started'] = True
            try:
                holder[0].close()
                report['exposure']['archive_close_completed'] = True
            except Exception:
                report['validation_reason_before_cleanup'] = report['reason']
                report['exposure']['archive_close_error'] = 'ARCHIVE_CLOSE_FAILED'
                holder[0].fp = None
                core._clear(report, 'ARCHIVE_CLOSE_FAILED')
    if len(core.canonical(report)) > core.LIMITS['output']:
        core._clear(report, 'PUBLIC_OUTPUT_LIMIT')
    return report


def _pin(pin, *, prior=False):
    keys = {'path', 'sha256', 'producer'} if prior else {'path', 'sha256'}
    _require(core._keys(pin, keys) and type(pin['path']) is str and core._digest(pin['sha256']),
             'PHASE_BINDING_INVALID')
    if prior:
        _require(type(pin['producer']) is str and re.fullmatch(r'[0-9a-f]{40}', pin['producer']),
                 'PHASE_BINDING_INVALID')
    raw = custody._read_relative(pin['path'], MAX_PUBLIC)
    _require(custody.sha256(raw) == pin['sha256'], 'PHASE_BINDING_INVALID')
    try:
        value = json.loads(raw)
        _require(custody.canonical(value) == raw, 'PHASE_BINDING_INVALID')
        core._bounded_json(value, MAX_PUBLIC)
        return value
    except Exception:
        raise ProductionError('PHASE_BINDING_INVALID') from None


def _prior_receipt(pin, phase):
    _require(pin['path'] in tuple(f'.cache/li-v3-custody/complete-readiness-v1/{phase}/{slot}/public.json'
                                 for slot in ('1', '2')), 'PHASE_BINDING_INVALID')
    value = _pin(pin, prior=True)
    try:
        _require(core._keys(value, _public_report(phase)) and value['schema'] == SCHEMA
                 and value['parser_profile'] == PROFILE and value['synthetic_fixture'] is False
                 and value['phase'] == phase and value['status'] == 'BLOCKED_SCHEMA'
                 and value['engineering_status'] == 'COMPLETE'
                 and _identity(value['implementation'])['commit'] == pin['producer']
                 and value['prerequisite_receipt_sha256'] == PREREQUISITE_SHA256
                 and value['capture_receipt_sha256'] == CAPTURE_SHA256
                 and value['source_identity_verified'] is True
                 and value['operation_exposure']['source_buffer_verified'] is True
                 and value['operation_exposure']['output_directory_close_error'] is None,
                 'PHASE_PRIOR_INVALID')
        return value
    except Exception:
        raise ProductionError('PHASE_PRIOR_INVALID') from None


def _prior_pair(pins, phase):
    _require(type(pins) is list and len(pins) == 2, 'PHASE_PRIOR_INVALID')
    values = []
    for slot, pin in zip(('1', '2'), pins):
        _require(type(pin) is dict and pin.get('path') ==
                 f'.cache/li-v3-custody/complete-readiness-v1/{phase}/{slot}/public.json',
                 'PHASE_PRIOR_INVALID')
        values.append(_prior_receipt(pin, phase))
    _require(custody.canonical(values[0]) == custody.canonical(values[1]), 'PHASE_PRIOR_INVALID')
    return values[0]['result']


def _phase_material(phase):
    if phase == 'layout':
        return None, None, None
    pins = PHASE_BINDINGS[phase]
    _require(pins is not None, 'PHASE_BINDING_UNBOUND')
    _require(core._keys(pins, {'binding', 'layout'} | ({'documentary'} if phase == 'frame' else set())),
             'PHASE_BINDING_INVALID')
    _require(pins['binding']['path'] == f'.cache/li-v3-custody/complete-readiness-bindings-v1/{phase}.json',
             'PHASE_BINDING_INVALID')
    binding = _pin(pins['binding'])
    layout = _prior_pair(pins['layout'], 'layout')
    documentary = _prior_pair(pins['documentary'], 'documentary') if phase == 'frame' else None
    return binding, layout, documentary


def _public_report(phase):
    return {'schema': SCHEMA, 'parser_profile': PROFILE, 'synthetic_fixture': False,
        'phase': phase, 'status': 'BLOCKED_SCHEMA', 'engineering_status': 'NO_GO',
        'reason': 'NOT_STARTED', 'implementation': None, 'source_identity_verified': False,
        'observed': None, 'prerequisite_receipt_sha256': None, 'capture_receipt_sha256': None,
        'phase_binding_pins': None, 'result': _result(phase), 'scientific_counts': None,
        'fits': 0, 'splits': 0, 'operation_exposure': {
            'reservation_write_attempted': False, 'reservation_may_exist': False,
            'reservation_created': False, 'raw_buffer_read_started': False,
            'raw_buffer_read_completed': False, 'target_bearing_source_bytes_read': False,
            'source_buffer_verified': False, 'output_write_attempted': False,
            'output_may_exist': False, 'output_directory_close_error': None}}


def _guard_failure(report, reason):
    safe = reason if reason in GUARD_REASONS or reason in custody.ERRORS else 'INTERNAL_FAILURE'
    report.update(status='BLOCKED_GUARD', engineering_status='NO_GO', reason=safe)
    core._clear(report['result'], 'INTERNAL_FAILURE')
    report['result']['reason'] = safe


def _canonical_public(report):
    raw = custody.canonical(report)
    if len(raw) > MAX_PUBLIC:
        raise ProductionError('PUBLIC_RECEIPT_LIMIT')
    return raw


def _recheck(identity):
    _require(_identity(production_context()) == identity, 'SOURCE_CONTEXT_CHANGED')


def inspect(phase, run):
    """One fixed phase/slot; no caller paths, expectations, bindings, or source bytes."""
    report, output = _public_report(phase if phase in ('layout', 'documentary', 'frame') else None), None
    try:
        _require(type(phase) is str and phase in ('layout', 'documentary', 'frame')
                 and type(run) is str and run in ('1', '2'), 'CLI_ARGUMENT_INVALID')
        report['implementation'] = _identity(production_context())
        destination = custody._receipt_path(f'.cache/li-v3-custody/complete-readiness-v1/{phase}/{run}/public.json')
        output = custody._output_directory(destination)
        custody._absent_at(output, destination.name)
        operation = report['operation_exposure']
        operation['reservation_write_attempted'] = operation['reservation_may_exist'] = True
        custody._write_at(output, 'reservation.json', custody.canonical({
            'schema': 'lupine.discovery.li_v3.readiness.reservation.v1',
            'implementation': report['implementation'], 'phase': phase, 'run': run,
            'status': 'RESERVED_NO_RETRY'}))
        operation['reservation_created'] = True
        _validate_prerequisite(custody._read_relative(PREREQUISITE, diagnostic.MAX_RECEIPT))
        report['prerequisite_receipt_sha256'] = PREREQUISITE_SHA256
        diagnostic.G31.header_diagnostic._validate_capture(custody._read_relative(custody.CAPTURE, 65536))
        report['capture_receipt_sha256'] = CAPTURE_SHA256
        binding, layout, documentary = _phase_material(phase)
        report['phase_binding_pins'] = None if phase == 'layout' else custody._detached(PHASE_BINDINGS[phase])
        _recheck(report['implementation'])
        operation['raw_buffer_read_started'] = True
        operation['target_bearing_source_bytes_read'] = None
        raw = custody._read_relative(custody.OBJECT, custody.SOURCE_BYTES)
        operation['raw_buffer_read_completed'] = True
        operation['target_bearing_source_bytes_read'] = True
        report['observed'] = custody._verify_source(raw, OBJECT_SHA256)
        report['source_identity_verified'] = operation['source_buffer_verified'] = True
        report['result'] = _run_production(raw, phase, report['implementation']['g34'], binding, layout, documentary)
        report['engineering_status'] = report['result']['engineering_status']
        report['reason'] = report['result']['reason']
        _recheck(report['implementation'])
        _canonical_public(report)
        operation['output_write_attempted'] = operation['output_may_exist'] = True
        custody._write_at(output, destination.name, _canonical_public(report))
    except (ProductionError, custody.CustodyError, diagnostic.AuditError) as error:
        _guard_failure(report, str(error))
    except Exception:
        _guard_failure(report, 'INTERNAL_FAILURE')
    finally:
        if output is not None:
            try:
                custody.os.close(output)
            except Exception:
                report['operation_exposure']['output_directory_close_error'] = 'INTERNAL_FAILURE'
                _guard_failure(report, 'INTERNAL_FAILURE')
    try:
        _canonical_public(report)
    except ProductionError:
        report['implementation'] = report['phase_binding_pins'] = report['observed'] = None
        _guard_failure(report, 'PUBLIC_RECEIPT_LIMIT')
        _canonical_public(report)
    return report


def main(argv=None):
    try:
        parser = custody._Parser(description=__doc__)
        parser.add_argument('phase', choices=('layout', 'documentary', 'frame'))
        parser.add_argument('--run', choices=('1', '2'), required=True)
        args = parser.parse_args(argv)
        report = inspect(args.phase, args.run)
    except Exception:
        report = _public_report(None)
        _guard_failure(report, 'CLI_ARGUMENT_INVALID')
    try:
        sys.stdout.buffer.write(_canonical_public(report))
    except ProductionError:
        report = _public_report(None)
        _guard_failure(report, 'PUBLIC_RECEIPT_LIMIT')
        sys.stdout.buffer.write(custody.canonical(report))
    return 0 if report['engineering_status'] == 'COMPLETE' else 2


if __name__ == '__main__':
    raise SystemExit(main())
