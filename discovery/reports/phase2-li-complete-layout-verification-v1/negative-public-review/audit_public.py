"""Independent public-only audit of the retained blocked first layout operation."""
import datetime
import hashlib
import json
from pathlib import Path
import stat
import time

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
COMMIT = '9d1f21dae141a28db378ee2e16aa83340df57877'
LAYOUT = ROOT / '.cache/phase2-li-complete-readiness-operations-v1/production/layout'
OUTER_ROOT = ROOT / '.cache/phase2-li-complete-readiness-outer-observer-v1'
OUTER = OUTER_ROOT / ('runs/layout-' + COMMIT)
PUBLIC_SHA = 'aae55ee5a939c37ed13e73d82d68c9e3c92273f22aa7161f46d19b2799158545'
BINDING_SHA = '8055eedf46f0e532da428adf353efd1d170bb9f1b88c5076f739f75aba062a3d'
FILES = {**{'operation/' + name: LAYOUT / name for name in (
    '1/execution.json', '1/start.json', '1/stdout.bin', '1/stderr.bin',
    '1/persisted-public.json', '1/persisted-reservation.json',
    'preflight.json', 'reservation.json', 'stopped.json')},
    **{'outer/' + name: OUTER / name for name in (
    'execution.json', 'stdout.bin', 'stderr.bin', 'stopped.json',
    'before-state.json', 'after-state.json')},
    'root-observed-layout.json': OUTER_ROOT / 'root-observed-layout.json'}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'),
                       ensure_ascii=True, allow_nan=False) + '\n').encode('ascii')


def parse(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('DUPLICATE_JSON_KEY')
            result[key] = value
        return result
    return json.loads(raw.decode('ascii'), object_pairs_hook=pairs,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError('NONFINITE_JSON')))


def stamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


slot = BASE / 'first-public-audit'
slot.mkdir(exist_ok=False)
snapshots = BASE / 'inputs'
snapshots.mkdir(exist_ok=False)
checks, inputs, raw, findings = [], [], {}, {}
started, t0 = stamp(), time.monotonic()


def require(name, condition):
    checks.append({'check': name, 'passed': bool(condition)})
    if not condition:
        raise AssertionError(name)


def keys(value, names):
    return type(value) is dict and set(value) == set(names.split())


try:
    for label, path in FILES.items():
        require('public_regular_file_' + label, stat.S_ISREG(path.lstat().st_mode)
                and not path.is_symlink() and path.stat().st_size <= 2 * 1024 * 1024)
        raw[label] = path.read_bytes()
        destination = snapshots / label
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(raw[label])
        inputs.append({'source': str(path.relative_to(ROOT)), 'snapshot': 'inputs/' + label,
                       'bytes': len(raw[label]), 'sha256': sha(raw[label])})
    values = {k: parse(v) for k, v in raw.items() if k.endswith('.json')}
    public = values['operation/1/persisted-public.json']
    reserve = values['operation/1/persisted-reservation.json']
    execution = values['operation/1/execution.json']
    start = values['operation/1/start.json']
    preflight = values['operation/preflight.json']
    phase_reserve = values['operation/reservation.json']
    stop = values['operation/stopped.json']
    outer = values['outer/execution.json']
    outer_stop = values['outer/stopped.json']
    observed = values['root-observed-layout.json']
    recording, process = execution['recording'], execution['process']
    result = public['result']
    expected = preflight['binding']['expected']
    require('public_identity_and_stdout_persistence', len(raw['operation/1/persisted-public.json']) == 7760
            and sha(raw['operation/1/persisted-public.json']) == PUBLIC_SHA
            and raw['operation/1/stdout.bin'] == raw['operation/1/persisted-public.json'])
    require('canonical_public_and_reservation', canonical(public) == raw['operation/1/stdout.bin']
            and canonical(reserve) == raw['operation/1/persisted-reservation.json'])
    require('public_closed_outer_shape', keys(public, 'schema parser_profile synthetic_fixture phase status engineering_status reason implementation source_identity_verified observed prerequisite_receipt_sha256 capture_receipt_sha256 phase_binding_pins result scientific_counts fits splits operation_exposure'))
    require('public_closed_inner_shape', keys(result, 'schema synthetic_fixture production_binding phase status engineering_status reason validation_reason_before_cleanup source_sha256 replay_matched package roles documentary frame exposure numeric_outcome_interpretation formula_evaluation scientific_eligibility_decisions sampling_independence_established scientific_counts fits splits workbook_sheets sheet_name_exposure'))
    require('negative_schema_and_scope', public['schema'] == 'lupine.discovery.li_v3.readiness.production.v1'
            and public['parser_profile'] == 'li_v3.complete_bounded_structural_inventory_frame.v1'
            and result['schema'] == 'lupine.discovery.li_v3.readiness.result.v1'
            and result['production_binding'] == 'FIXED_LI_V3_SOURCE_G34_PREREQUISITE'
            and all(v['phase'] == 'layout' and v['synthetic_fixture'] is False
                    and v['status'] == 'BLOCKED_SCHEMA' and v['engineering_status'] == 'NO_GO'
                    and v['reason'] == 'XML_PROFILE_UNSUPPORTED' for v in (public, result)))
    require('science_claims_absent', all(v['scientific_counts'] is None
            and type(v['fits']) is int and v['fits'] == 0
            and type(v['splits']) is int and v['splits'] == 0 for v in (public, result))
            and all(result[k] is False for k in ('numeric_outcome_interpretation',
            'formula_evaluation', 'scientific_eligibility_decisions', 'sampling_independence_established')))
    require('all_failed_payloads_cleared', all(result[k] is None for k in
            ('package', 'roles', 'workbook_sheets', 'documentary', 'frame'))
            and public['phase_binding_pins'] is None)
    require('source_identity_matches_frozen_public_expectation', public['source_identity_verified'] is True
            and canonical(public['implementation']) == canonical(expected['implementation'])
            and canonical(public['observed']) == canonical(expected['observed'])
            and public['implementation']['commit'] == COMMIT
            and result['source_sha256'] == public['observed']['sha256']
            and type(public['observed']['bytes']) is int and public['observed']['bytes'] == 183878
            and all(public[k] == expected[k] for k in ('capture_receipt_sha256', 'prerequisite_receipt_sha256')))
    operation = public['operation_exposure']
    require('outer_exposure_closed_and_complete', keys(operation, 'reservation_write_attempted reservation_may_exist reservation_created raw_buffer_read_started raw_buffer_read_completed target_bearing_source_bytes_read source_buffer_verified output_write_attempted output_may_exist output_directory_close_error')
            and operation['output_directory_close_error'] is None
            and all(v is True for k, v in operation.items() if k != 'output_directory_close_error'))
    exposure = result['exposure']
    flags = 'whole_buffer_supplied header_replay_started header_replay_completed archive_open_started archive_open_completed archive_close_started archive_close_completed'.split()
    counters = ['member_opens', 'decompressions', 'utf8_decodes', 'xml_parses']
    counter_names = [p + '_' + state for p in counters for state in ('started', 'completed')]
    require('inner_exposure_closed', set(exposure) == set(flags + counter_names +
            ['archive_close_error', 'character_data_state', 'layout_roles']))
    require('replay_and_archive_cleanup', all(exposure[k] is True for k in flags)
            and result['replay_matched'] is True and exposure['archive_close_error'] is None
            and result['validation_reason_before_cleanup'] is None)
    require('failure_prefix_counters_have_exact_integer_types', all(type(exposure[k]) is int
            and 0 <= exposure[k] <= 4096 for k in counter_names))
    require('failure_prefix_counter_order', all(exposure[p + '_completed'] <= exposure[p + '_started']
            for p in counters))
    require('observed_five_read_decompress_decode_operations', all(exposure[p + '_' + state] == 5
            for p in counters[:3] for state in ('started', 'completed')))
    require('observed_partial_xml_parse', exposure['xml_parses_started'] == 5
            and exposure['xml_parses_completed'] == 4)
    require('retained_character_exposure_no_documentary_role_projection', exposure['character_data_state']
            == 'PRIVATE_XML_DECODE_COMPLETED' and exposure['layout_roles'] == {})
    names = result['sheet_name_exposure']
    require('name_exposure_not_started', keys(names, 'started completed names_projected disclosure_policy fresh_status')
            and names['started'] is False and names['completed'] is False
            and type(names['names_projected']) is int and names['names_projected'] == 0
            and names['fresh_status'] == 'UNESTABLISHED'
            and names['disclosure_policy'] == 'COMPLETE_SHEET_NAMES_MAY_INCLUDE_INCIDENTAL_OUTCOMES')
    require('reservation_matches_actual_public_implementation', keys(reserve, 'schema implementation phase run status')
            and reserve['schema'] == 'lupine.discovery.li_v3.readiness.reservation.v1'
            and reserve['phase'] == 'layout' and reserve['run'] == '1'
            and reserve['status'] == 'RESERVED_NO_RETRY'
            and canonical(reserve['implementation']) == canonical(public['implementation']))
    require('fixed_layout_binding_chain', sha(canonical(preflight['binding'])) == BINDING_SHA
            and all(v['binding_sha256'] == BINDING_SHA for v in (preflight, phase_reserve, start, execution, stop, outer))
            and preflight['binding']['phase'] == 'layout' and preflight['binding']['commit'] == COMMIT
            and preflight['binding']['runtime_count'] == 345)
    require('phase_reserved_then_stopped_without_retry', phase_reserve['status'] == 'RESERVED_ONE_PHASE_TWO_SLOTS'
            and start['status'] == 'RESERVED_NO_RETRY' and stop['status'] == 'STOP_PRESERVE_EVIDENCE'
            and stop['no_retry'] is True and stop['scientific_admission'] is False)
    require('recording_source_command_and_exit', recording['phase'] == 'layout' and recording['run'] == '1'
            and recording['command'] == expected['command_prefix'] + ['layout', '--run', '1']
            and recording['command'] == start['command'] and type(recording['exit_code']) is int
            and recording['exit_code'] == 2 and recording['process_completed'] is True
            and recording['timed_out'] is False and recording['returned_observation'] == 'CLI_STDOUT_SERIALIZATION')
    for stream in ('stdout', 'stderr'):
        content = raw['operation/1/' + stream + '.bin']
        require('recording_' + stream + '_identity', sha(content) == recording[stream + '_sha256']
                and type(recording[stream + '_bytes']) is int and len(content) == recording[stream + '_bytes'])
    require('recording_persisted_reservation_identities', recording['persisted_sha256'] == PUBLIC_SHA
            and type(recording['persisted_bytes']) is int and recording['persisted_bytes'] == 7760
            and recording['reservation_sha256'] == sha(raw['operation/1/persisted-reservation.json'])
            and raw['operation/1/stderr.bin'] == b'')
    require('source_child_completed_without_timeout_or_launch_failure', type(process['exit_code']) is int
            and process['exit_code'] == 2 and process['process_completed'] is True
            and process['process_group_cleanup'] is True
            and all(process[k] is False for k in ('timed_out', 'launch_failed', 'output_limit'))
            and all(process[k] == recording[k] for k in ('started_ns', 'finished_ns')))
    require('execution_recording_errors_absent', execution['post_state_error'] is None
            and execution['capture_errors'] == [] and execution['log_publication_errors'] == []
            and execution['public_review_error'] is None and execution['scientific_admission'] is False)
    require('public_review_preserves_nonreusable_block', execution['public_review']['status'] == 'RETAINED_BLOCKED_OPERATION'
            and execution['public_review']['public_sha256'] == PUBLIC_SHA
            and all(execution['public_review'][k] is False for k in ('reusable_completed_prior',
            'next_operation_authorized', 'actual_operation_approved', 'release_approved', 'scientific_admission')))
    require('operation_state_hashes_and_equality', canonical(execution['before']) == canonical(execution['after'])
            == canonical(start['before']) == canonical(preflight['state'])
            and recording['before_state_sha256'] == sha(canonical(execution['before']))
            and recording['after_state_sha256'] == sha(canonical(execution['after'])))
    require('operation_gate_hashes_held', recording['gate_inputs_sha256_before'] == recording['gate_inputs_sha256_after']
            == sha(canonical(execution['before']['gates'])))
    repository = execution['before']['repository']
    require('recorded_repository_hold', repository['commit'] == COMMIT and repository['worktree_clean'] is True
            and repository['remote_exact'] is True and repository['index_head_worktree_agree'] is True
            and len(repository['runtime']) == 345
            and canonical(repository['own_files']) == canonical(public['implementation']['files']))
    require('outer_observed_exit_and_cleanup', outer['commit'] == COMMIT and outer['phase'] == 'layout'
            and type(outer['exit_code']) is int and outer['exit_code'] == 2
            and all(outer[k] is True for k in ('process_completed', 'process_group_cleanup', 'source_and_tools_verified'))
            and all(outer[k] is False for k in ('timed_out', 'launch_failed', 'output_limit')))
    for stream in ('stdout', 'stderr'):
        content = raw['outer/' + stream + '.bin']
        require('outer_' + stream + '_identity', sha(content) == outer[stream + '_sha256']
                and type(outer[stream + '_bytes']) is int and len(content) == outer[stream + '_bytes'])
    require('outer_stop_preserves_missing_success_final', outer_stop['status'] == 'STOP_PRESERVE_EVIDENCE'
            and outer_stop['errors'] == ['FINAL_NOT_READABLE']
            and canonical(outer_stop['observed']) == canonical(outer) and raw['outer/stderr.bin'] == b''
            and parse(raw['outer/stdout.bin']) == {'phase': 'layout', 'reason': 'RECORDER_REJECTED',
                 'scientific_admission': False, 'status': 'STOP_PRESERVE_EVIDENCE'})
    require('outer_state_hashes_held', raw['outer/before-state.json'] == raw['outer/after-state.json']
            and sha(raw['outer/before-state.json']) == outer['before_state_sha256'] == outer['after_state_sha256'])
    require('root_observed_real_pty_exit', observed['commit'] == COMMIT and observed['pty_session'] == 62838
            and observed['tool_chunk'] == 'f8c4dd' and type(observed['actual_outer_exit_code']) is int
            and observed['actual_outer_exit_code'] == 2 and observed['no_retry'] is True
            and observed['stdout_status'] == 'STOP_PRESERVE_EVIDENCE' and observed['scientific_admission'] is False)
    require('chronology', outer['started_ns'] <= recording['started_ns'] < recording['finished_ns'] <= outer['finished_ns'])
    require('no_second_slot_or_dependent_phase_public_artifacts', not (LAYOUT / '2').exists()
            and not (LAYOUT.parent / 'inventory').exists() and not (LAYOUT.parent / 'frame').exists()
            and not (LAYOUT / 'final.json').exists() and not (OUTER / 'completion-packet.json').exists())
    require('all_supplied_public_inputs_held', all(path.read_bytes() == raw[label] for label, path in FILES.items()))
    findings = {'actual_layout_slots_observed': 1, 'second_layout_slot_public_artifacts_present': False,
        'dependent_phase_public_artifacts_present': False, 'producer_exit_code': 2, 'outer_observed_exit_code': 2,
        'engineering_status': 'NO_GO', 'status': 'BLOCKED_SCHEMA', 'reason': 'XML_PROFILE_UNSUPPORTED',
        'member_opens': {'started': 5, 'completed': 5}, 'decompressions': {'started': 5, 'completed': 5},
        'utf8_decodes': {'started': 5, 'completed': 5}, 'xml_parses': {'started': 5, 'completed': 4},
        'public_payloads_cleared': True, 'names_projected': 0, 'role_projection_started': False,
        'source_bytes_read': 183878, 'character_data_state': 'PRIVATE_XML_DECODE_COMPLETED',
        'archive_close_completed': True, 'output_directory_close_error': None,
        'completed_layout_counter_equation_applicable': False, 'reusable_completed_prior': False,
        'retry_or_next_phase_authorized': False, 'scientific_admission': False,
        'blocking_member_or_XML_construct_identified': False}
except Exception as exc:
    checks.append({'check': 'review_stopped_with_exception', 'passed': False,
                   'exception_type': type(exc).__name__, 'message': str(exc)})

review = {'schema': 'lupine.li.complete-layout.independent-blocked-public-review.v1',
    'status': 'PASS_CONSISTENT_BLOCKED_LAYOUT_STOP' if all(c['passed'] for c in checks) else 'FAIL_PUBLIC_REVIEW',
    'started_at': started, 'finished_at': stamp(), 'seconds': time.monotonic() - t0,
    'published_commit': COMMIT, 'public_sha256': PUBLIC_SHA, 'source_sha256': sha(Path(__file__).read_bytes()),
    'inputs': inputs, 'checks': checks, 'findings': findings,
    'scope': ['Independent public-byte consistency audit after exposure to the first blocked result.',
      'No raw workbook, capture/G34 receipt, custody source, producer/guard invocation, network or Git call.',
      'No producer, test, validator or source operation rerun. Fixed documentary contracts were read before actual evidence.',
      'State and gate hashes corroborate retained receipts; they do not independently authenticate external CI or recompute raw operations.',
      'Absence checks concern only public operation folders, not private custody storage.',
      'No complete manifest or role mapping exists to validate. No sheet names, cell values or physical units inferred.',
      'Failure-prefix counters must not be subjected to the completed-layout equality and minimum-six rule.',
      'PRIVATE_XML_DECODE_COMPLETED retains machine exposure despite no public names; this was not target-free access.',
      'Generic terminal_negative=false denotes absence of a completed negative frame; it does not authorize retry of this blocked operation.']}
(slot / 'review.json').write_text(json.dumps(review, indent=2, sort_keys=True) + '\n')
print(json.dumps({'status': review['status'], 'checks': len(checks), 'failures': [c for c in checks if not c['passed']],
                  'findings': findings}, indent=2))
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
