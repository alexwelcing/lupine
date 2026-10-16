"""Prospective Li A/B/C recorder: explicit one phase, two frozen slots, no retry.

No production module is imported. Only the reviewed public-only validator is
loaded from captured, pinned source. Unbound preparation cannot run a command.
"""
from __future__ import annotations
import argparse
import ast
import sys
import types
from pathlib import Path
import recorder_support as s

HERE = Path(__file__).absolute().parent
TARGET = '.cache/li-v3-custody/complete-readiness-v1'
PHASES = ('layout', 'inventory', 'frame')
TOOLS = ('run_after_ci.py', 'recorder_support.py', 'run_package.py')
SCHEMA = 'lupine.li.complete-readiness.operation-binding.v1'
BASELINE = 'ddd4a6a8df0f908a162b7e5387b0faac325180d6'
EXPECTED_KEYS = {'phase', 'implementation', 'observed', 'prerequisite_receipt_sha256',
                 'capture_receipt_sha256', 'phase_binding_pins', 'command_prefix'}
PACKAGE_KEYS = {'schema','operation','command','commit','runtime_before','runtime_after',
    'before_state','after_state','source_unchanged','head_unchanged','worktree_clean',
    'tools_before','tools_after','state_error','stdout_sha256','stdout_bytes',
    'stderr_sha256','stderr_bytes','started_ns','finished_ns','exit_code','timed_out',
    'launch_failed','output_limit','process_completed','process_group_cleanup'}
FRAME_PATH = '.cache/li-v3-custody/complete-readiness-bindings-v1/frame.json'
PROBLEM_SCHEMAS = sorted('lupine.discovery.'+name+'.v1' for name in
    ('problem','calibrated_problem','pareto_problem','coupled_problem','projection_problem','decision_pool_problem'))
CHECKS = [
    'all_packaged_cases_select_verify_replay', 'known_answer_oracle_and_controls',
    'web_assets_and_original_archive_reports', 'constrained_negative_results_packaged_and_served',
    'installed_http_cli_agreement', 'coupled_python_api_and_missing_point_fallback',
    'coupled_projection_and_statistical_guarded_http_replay_agree_with_installed_cli',
    'scoped_projection_translation_and_missing_bound_abstention',
    'direct_statistical_pool_python_api_and_distinct_abstention', 'training_only_no_go_packaged_and_served',
    'prospective_pool_planning_cli_hypothesis_and_unknown',
    'prospective_zero_failure_resolution_cli_not_observed_power',
    'prospective_planning_http_cli_agreement_and_assets', 'finite_population_zero_failure_cli_http_exact_scope',
    'optional_mpea_resource_presence_and_http_agreement', 'mpea_javascript_packaged_and_served',
    'fixed_stored_census_identity_scope_and_http_asset_agreement']


def load_bindings(phase, expected_sha):
    s.require(phase in PHASES and s.hexhash(expected_sha), 'BINDING_ARGUMENT_INVALID')
    raw = s.read(HERE / ('bindings-' + phase + '.json'))
    s.require(s.sha(raw) == expected_sha, 'BINDING_IDENTITY_CHANGED')
    value = s.strict_json(raw)
    s.require(s.keys(value, {'schema','phase','commit','branch','runtime_count','runtime_manifest',
        'source_files','recorder_files','validator','expected','frame_binding','prior_acceptances','gates'}), 'BINDING_SHAPE_INVALID')
    s.require(value['schema'] == SCHEMA and value['phase'] == phase and s.hexhash(value['commit'],40)
        and value['branch'] == s.BRANCH and type(value['runtime_count']) is int
        and value['runtime_count'] == 345, 'BINDING_UNBOUND')
    s.require(s.keys(value['source_files'], s.OWN_FILES)
        and all(s.hexhash(h) for h in value['source_files'].values()), 'OWN_PINS_UNBOUND')
    s.require(s.keys(value['recorder_files'], TOOLS), 'RECORDER_PINS_UNBOUND')
    for name, pin in value['recorder_files'].items():
        s.require(s.pin(pin) == HERE / name, 'RECORDER_PATH_INVALID')
        s.capture_pin(pin, cap=s.SOURCE_CAP)
    s.pin(value['validator']); s.pin(value['runtime_manifest'])
    s.require(value['runtime_manifest']['path'] == 'reports/runtime-manifest.json', 'MANIFEST_PATH_INVALID')
    s.require(s.keys(value['expected'], EXPECTED_KEYS) and value['expected']['phase'] == phase
        and value['expected']['command_prefix'] == [sys.executable, s.SOURCE], 'EXPECTED_UNBOUND')
    identity = value['expected']['implementation']
    s.require(type(identity) is dict and identity.get('commit') == value['commit']
        and s.canonical(identity.get('files')) == s.canonical(value['source_files']), 'EXPECTED_SOURCE_MISMATCH')
    s.require((phase == 'frame') == (value['frame_binding'] is not None), 'FRAME_BINDING_INVALID')
    if value['frame_binding'] is not None:
        custody_public_pin(value['frame_binding'], FRAME_PATH)
    s.require(s.keys(value['prior_acceptances'], () if phase=='layout' else ('layout',) if phase=='inventory'
                     else ('layout','inventory')), 'PRIOR_ACCEPTANCE_UNBOUND')
    s.require(s.keys(value['gates'], {'ci','package','strict','artifact_review','artifacts'}), 'GATES_UNBOUND')
    s.pin(value['gates']['ci'], public_only=True)
    for key in ('package','strict'):
        s.require(s.keys(value['gates'][key], {'receipt','stdout','stderr'}), 'EXECUTION_PINS_INVALID')
        for pin in value['gates'][key].values(): s.pin(pin, public_only=True)
    s.require(s.keys(value['gates']['artifact_review'], {'receipt','source'}), 'AUDIT_PINS_INVALID')
    for pin in value['gates']['artifact_review'].values(): s.pin(pin, public_only=True)
    s.require(s.keys(value['gates']['artifacts'], {'receipt','source_archive','wheel'}), 'ARTIFACT_PINS_INVALID')
    for pin in value['gates']['artifacts'].values(): s.pin(pin, public_only=True)
    return value


def custody_public_pin(pin, expected_path):
    s.require(s.keys(pin, {'path','bytes','sha256'}) and pin['path'] == expected_path
        and type(pin['bytes']) is int and 0 < pin['bytes'] <= s.PUBLIC_CAP
        and s.hexhash(pin['sha256']), 'PUBLIC_CUSTODY_PIN_INVALID')
    return s.ROOT / expected_path


def capture_custody_public(pin, expected_path):
    raw=s.read(custody_public_pin(pin,expected_path))
    s.require(len(raw)==pin['bytes'] and s.sha(raw)==pin['sha256'],'PUBLIC_CUSTODY_CHANGED')
    return raw


def prior_acceptances(binding, *, collect=False):
    hashes={}; originals={}; operations=[]; expected_by_phase={}
    for phase in PHASES:
        if phase not in binding['prior_acceptances']: continue
        packet=binding['prior_acceptances'][phase]
        s.require(s.keys(packet,{'binding','final','executions','public','reservations'}), 'PRIOR_PACKET_INVALID')
        s.require(type(packet['executions']) is list and len(packet['executions'])==2
            and type(packet['public']) is list and len(packet['public'])==2
            and type(packet['reservations']) is list and len(packet['reservations'])==2,'PRIOR_PAIR_INVALID')
        raw=s.capture_pin(packet['binding']); original=s.strict_json(raw)
        hashes[phase+'/binding']=s.sha(raw)
        s.require(original.get('schema')==SCHEMA and original.get('phase')==phase
            and s.hexhash(original.get('commit'),40),'PRIOR_BINDING_INVALID')
        expected_by_phase[phase]=original['expected']
        raw=s.capture_pin(packet['final']); final=s.strict_json(raw,canonical_required=True)
        hashes[phase+'/final']=s.sha(raw)
        s.require(final.get('status')=='COMPLETE_IDENTICAL_PHASE_PAIR' and final.get('phase')==phase
            and final.get('commit')==original['commit'] and final.get('binding_sha256')==packet['binding']['sha256']
            and final.get('scientific_admission') is False and final.get('automatic_advance') is False,
            'PRIOR_FINAL_NOT_ACCEPTED')
        reports=[]
        for index in (0,1):
            public_pin=packet['public'][index]
            public_raw=capture_custody_public(public_pin,f'{TARGET}/{phase}/{index+1}/public.json')
            public=s.strict_json(public_raw,canonical_required=True); reports.append(public)
            hashes[f'{phase}/public/{index+1}']=s.sha(public_raw)
            reservation=capture_custody_public(packet['reservations'][index],
                f'{TARGET}/{phase}/{index+1}/reservation.json')
            hashes[f'{phase}/reservation/{index+1}']=s.sha(reservation)
            s.require(s.sha(public_raw)==final.get('public_sha256') and public.get('phase')==phase
                and public.get('engineering_status')=='COMPLETE'
                and s.canonical(public.get('implementation'))==s.canonical(original['expected']['implementation']),
                'PRIOR_PUBLIC_NOT_ACCEPTED')
            execution_raw=s.capture_pin(packet['executions'][index]); execution=s.strict_json(execution_raw,canonical_required=True)
            hashes[f'{phase}/execution/{index+1}']=s.sha(execution_raw)
            recording=execution.get('recording',{}); review=execution.get('public_review',{})
            s.require(execution.get('schema')=='lupine.li.complete-readiness.operation-execution.v1'
                and execution.get('binding_sha256')==packet['binding']['sha256']
                and execution.get('post_state_error') is None and execution.get('capture_errors')==[]
                and execution.get('public_review_error') is None
                and type(recording.get('exit_code')) is int and recording['exit_code']==0
                and recording.get('process_completed') is True and recording.get('timed_out') is False
                and recording.get('phase')==phase and recording.get('run')==str(index+1)
                and recording.get('stdout_sha256')==recording.get('persisted_sha256')==s.sha(public_raw)
                and recording.get('reservation_sha256')==s.sha(reservation)
                and type(recording.get('stdout_bytes')) is int and recording['stdout_bytes']==len(public_raw)
                and recording.get('stderr_bytes')==0 and type(recording.get('stderr_bytes')) is int
                and recording.get('stderr_sha256')==s.sha(b'')
                and recording.get('before_state_sha256')==s.sha(s.canonical(execution.get('before')))
                and recording.get('after_state_sha256')==s.sha(s.canonical(execution.get('after')))
                and s.canonical(execution.get('before'))==s.canonical(execution.get('after'))
                and review.get('status')=='COMPLETED_PUBLIC_CONSISTENCY'
                and review.get('reusable_completed_prior') is True,'PRIOR_EXECUTION_NOT_ACCEPTED')
            operations.append({'stdout':public_raw,'persisted':public_raw,'reservation':reservation,'recording':recording})
            pin=binding['expected']['phase_binding_pins'][phase][index]
            s.require(s.canonical(pin)==s.canonical({'path':public_pin['path'],'sha256':public_pin['sha256'],
                                                    'producer':original['commit']}),'PRIOR_ORIGINAL_PRODUCER_CHANGED')
        s.require(s.canonical(reports[0])==s.canonical(reports[1]),'PRIOR_PAIR_BYTES_DIFFER')
        originals[phase]=reports[0]
    if binding['phase']=='frame':
        s.require(s.canonical(originals['inventory']['phase_binding_pins']['layout'])==
                  s.canonical(binding['expected']['phase_binding_pins']['layout']),'HISTORICAL_A_EDGE_CHANGED')
    return (hashes,operations,expected_by_phase) if collect else hashes


def capture_gates(binding):
    values, hashes = {}, {}
    for key, value in binding['gates'].items():
        if key == 'ci':
            raw = s.capture_pin(value, public_only=True)
            values[key] = s.strict_json(raw); hashes[key] = s.sha(raw)
        else:
            values[key] = {}
            for part, pin in value.items():
                cap = s.ARTIFACT_CAP if key == 'artifacts' and part != 'receipt' else s.LOG_CAP
                raw = s.capture_pin(pin, cap=cap, public_only=True)
                hashes[key + '/' + part] = s.sha(raw)
                # Artifact containers are hashed only; never extracted/imported here.
                if part == 'receipt': values[key][part] = s.strict_json(raw, s.LOG_CAP)
                elif part in {'stdout','stderr'}: values[key][part] = raw
    return values, hashes


def gates_valid(binding, values, runtime):
    commit, pins = binding['commit'], binding['gates']
    ci = values['ci']
    s.require(type(ci) is dict and ci.get('commit') == commit
        and ci.get('all_four_jobs_successful') is True, 'CI_INVALID')
    run, jobs = ci.get('run'), ci.get('jobs')
    s.require(type(run) is dict and run.get('head_sha') == commit and run.get('event') == 'push'
        and type(run.get('id')) is int and run['id'] > 0 and type(run.get('run_attempt')) is int
        and run['run_attempt'] == 1 and run.get('status') == 'completed'
        and run.get('conclusion') == 'success', 'CI_NOT_ORIGINAL_SUCCESS')
    s.require(type(jobs) is list and len(jobs) == 4 and all(type(j) is dict for j in jobs)
        and {j.get('name') for j in jobs} == {'lean','browser','python (3.11)','python (3.12)'}
        and all(j.get('status') == 'completed' and j.get('conclusion') == 'success' for j in jobs), 'CI_JOBS_INVALID')
    artifact_dir = s.pin(pins['artifacts']['receipt']).parent
    for key in ('package','strict'):
        item, parts = values[key]['receipt'], values[key]
        s.require(s.keys(item, PACKAGE_KEYS) and item['schema'] == 'lupine.li.complete-readiness.package-execution.v1'
            and item['operation'] == key and item['commit'] == commit, 'PACKAGE_RECEIPT_INVALID')
        s.require(type(item['exit_code']) is int and item['exit_code'] == 0
            and all(item[k] is False for k in ('timed_out','launch_failed','output_limit'))
            and all(item[k] is True for k in ('process_completed','process_group_cleanup','source_unchanged','head_unchanged','worktree_clean'))
            and item['state_error'] is None, 'PACKAGE_RUN_FAILED')
        s.require(type(item['started_ns']) is int and type(item['finished_ns']) is int
            and 0 < item['started_ns'] <= item['finished_ns'], 'PACKAGE_TIMING_INVALID')
        s.require(s.canonical(item['runtime_before']) == s.canonical(item['runtime_after']) == s.canonical(runtime)
            and s.canonical(item['before_state']) == s.canonical(item['after_state'])
            and s.canonical(item['tools_before']) == s.canonical(item['tools_after']), 'PACKAGE_STATE_CHANGED')
        s.require(item['tools_before'] == {name: binding['recorder_files'][name]['sha256']
                  for name in ('run_package.py','recorder_support.py')}, 'PACKAGE_RECORDER_CHANGED')
        command = [sys.executable, 'scripts/package_smoke.py', '--retain-directory', str(artifact_dir),
                   '--output', str(artifact_dir.parent / 'package-verification.json')] if key == 'package' else [
                   sys.executable,'scripts/verify_retained_artifacts.py','--directory',str(artifact_dir),'--commit',commit]
        s.require(s.canonical(item['command']) == s.canonical(command), 'PACKAGE_COMMAND_INVALID')
        for stream in ('stdout','stderr'):
            s.require(type(item[stream+'_bytes']) is int and item[stream+'_bytes'] == len(parts[stream])
                and item[stream+'_sha256'] == s.sha(parts[stream]), 'PACKAGE_LOG_CHANGED')
    retained = values['artifacts']['receipt']
    s.require(type(retained) is dict and s.hexhash(retained.get('content_sha256')), 'ARTIFACT_RECEIPT_INVALID')
    content = {k:v for k,v in retained.items() if k != 'content_sha256'}
    s.require(s.sha(s.canonical(content)) == retained['content_sha256']
        and retained.get('schema') == 'lupine.discovery.release_artifacts.v1'
        and retained.get('source_state_rechecked_after_smoke') is True
        and retained.get('wheel_build_source') == 'committed_source_archive'
        and retained['source']['git_commit'] == commit and retained['source']['worktree_status'] == 'clean', 'ARTIFACT_SCOPE_INVALID')
    for kind in ('wheel','source_archive'):
        desc = retained['artifacts'][kind]; pin = pins['artifacts'][kind]
        s.require(type(desc.get('bytes')) is int and desc['bytes'] == pin['bytes']
            and desc['sha256'] == pin['sha256'] and desc['filename'] == Path(pin['path']).name
            and s.pin(pin).parent == artifact_dir, 'ARTIFACT_DESCRIPTOR_MISMATCH')
    verification = retained['verification']
    s.require(verification['status'] == 'passed' and verification['isolated_install'] is True
        and type(verification['case_count']) is int and verification['case_count'] == 28
        and s.canonical(verification['checks']) == s.canonical(CHECKS)
        and s.canonical(verification['problem_schemas']) == s.canonical(PROBLEM_SCHEMAS)
        and verification['wheel_sha256'] == pins['artifacts']['wheel']['sha256'], 'PROBE_PROFILE_INVALID')
    strict = s.strict_json(values['strict']['stdout'])
    s.require(strict.get('schema') == 'lupine.discovery.retained-artifact-independent-audit.v1'
        and strict.get('status') == 'PASS' and strict.get('expected_git_commit') == commit
        and strict.get('receipt_sha256') == pins['artifacts']['receipt']['sha256']
        and strict.get('verifier_sha256') == runtime['scripts/verify_retained_artifacts.py']
        and s.canonical(strict.get('artifact_identities')) == s.canonical(retained['artifacts'])
        and s.canonical(strict['reported_smoke']['checks']) == s.canonical(CHECKS)
        and s.canonical(strict['reported_smoke']['problem_schemas']) == s.canonical(PROBLEM_SCHEMAS), 'STRICT_OUTPUT_INVALID')
    review = values['artifact_review']['receipt']
    s.require(review.get('schema') == 'lupine.li.complete-readiness.independent-artifact-review.v1'
        and review.get('status') == 'PASS_EXACT_RETAINED_ARTIFACT_AND_DECLARED_DELTA'
        and review.get('published_commit_requested') == commit
        and review.get('audit_source_sha256') == pins['artifact_review']['source']['sha256'], 'ARTIFACT_REVIEW_INVALID')
    checks = review.get('checks')
    s.require(type(checks) is list and checks and all(s.keys(c, {'check','passed'})
        and type(c['check']) is str and c['check'] and c['passed'] is True for c in checks)
        and len({c['check'] for c in checks}) == len(checks), 'ARTIFACT_CHECKS_INVALID')
    o = review['observed']
    required = {'published_commit':commit,'runtime_files':345,'baseline_commit':BASELINE,
        'unchanged_baseline_runtime_files':339,'baseline_runtime_files':339,
        'promoted_source_pins':binding['source_files'],'source_manifest_sha256':binding['runtime_manifest']['sha256'],
        'retained_receipt_sha256':pins['artifacts']['receipt']['sha256'],
        'source_archive_sha256':pins['artifacts']['source_archive']['sha256'],
        'wheel_sha256':pins['artifacts']['wheel']['sha256'],'artifact_identities_held':True,
        'added_runtime_files':sorted(p for p in s.OWN_FILES if p.endswith('.py')),
        'changed_existing_runtime_files':[],'removed_runtime_files':[], 'changed_package_payloads':[],
        'added_package_payloads':[],'unchanged_baseline_package_payloads':110,
        'mandatory_package_receipt_checks':17,'retained_demonstrations':28,'retained_problem_schemas':6}
    s.require(type(o) is dict and s.canonical({k:o.get(k) for k in required}) == s.canonical(required), 'ARTIFACT_OBSERVED_INVALID')
    labels = {'retained_receipt':'receipt','source_archive':'source_archive','wheel':'wheel'}
    inputs = review['inputs']
    s.require(type(inputs) is list and all(type(v) is dict for v in inputs), 'AUDIT_INPUTS_INVALID')
    for label, key in labels.items():
        matching = [v for v in inputs if v.get('label') == label]
        pin = pins['artifacts'][key]
        s.require(len(matching) == 1 and type(matching[0].get('bytes')) is int
            and matching[0]['bytes'] == pin['bytes'] and matching[0].get('sha256') == pin['sha256'], 'AUDIT_INPUT_CHANGED')
    return run['id']


def state(binding, binding_sha):
    s.require(s.sha(s.read(HERE / ('bindings-' + binding['phase'] + '.json'))) == binding_sha, 'BINDINGS_CHANGED')
    for pin in binding['recorder_files'].values(): s.capture_pin(pin, cap=s.SOURCE_CAP)
    s.capture_pin(binding['validator'], cap=s.SOURCE_CAP)
    s.capture_pin(binding['runtime_manifest'])
    repository = s.repository_state(binding['commit'], own_files=binding['source_files'])
    s.require(repository['runtime_manifest_sha256'] == binding['runtime_manifest']['sha256'], 'MANIFEST_CHANGED')
    # Static literal assignment only; never call an adapter guard during preflight.
    tree = ast.parse(s.read(s.ROOT / s.SOURCE, s.SOURCE_CAP))
    assignments = [n.value for n in tree.body if isinstance(n, ast.Assign)
        and any(isinstance(t, ast.Name) and t.id == 'PHASE_BINDINGS' for t in n.targets)]
    s.require(len(assignments) == 1, 'PHASE_SOURCE_BINDING_INVALID')
    phase_pins = ast.literal_eval(assignments[0])
    expected_pins = None if binding['phase'] == 'layout' else phase_pins[binding['phase']]
    s.require(s.canonical(expected_pins) == s.canonical(binding['expected']['phase_binding_pins']), 'PHASE_BINDING_CHANGED')
    values, hashes = capture_gates(binding)
    ci_run = gates_valid(binding, values, repository['runtime'])
    prior_hashes=prior_acceptances(binding)
    frame_raw = None
    if binding['frame_binding'] is not None:
        frame_raw = capture_custody_public(binding['frame_binding'],FRAME_PATH)
        s.require(s.canonical(expected_pins['binding']) == s.canonical({k:binding['frame_binding'][k]
                  for k in ('path','sha256')}), 'FRAME_PIN_MISMATCH')
    return {'repository':repository,'gates':hashes,'prior_acceptances':prior_hashes,'ci_run':ci_run,
            'binding_sha256':binding_sha,'frame_binding_sha256':None if frame_raw is None else s.sha(frame_raw)}, frame_raw


def load_validator(binding):
    raw = s.capture_pin(binding['validator'], cap=s.SOURCE_CAP)
    module = types.ModuleType('li_public_operation_review')
    module.__file__ = str(s.pin(binding['validator']))
    exec(compile(raw, module.__file__, 'exec'), module.__dict__)
    s.require(callable(getattr(module, 'review_operation', None)) and callable(getattr(module,'validate_public',None))
        and callable(getattr(module,'review_route',None)),
              'VALIDATOR_API_INVALID')
    return module


def command(phase, run):
    return [sys.executable, s.SOURCE, phase, '--run', str(run)]


def run_one(phase, run, binding, binding_sha, validator, before, frame_raw, folder):
    slot = folder / str(run); s.reserve(slot)
    target = s.ROOT / TARGET / phase / str(run)
    s.require(s.absent(target), 'TARGET_SLOT_CONSUMED')
    cmd = command(phase, run)
    s.publish(slot/'start.json', s.canonical({'phase':phase,'run':str(run),'command':cmd,
        'binding_sha256':binding_sha,'before':before,'status':'RESERVED_NO_RETRY'}))
    result = s.bounded_process(cmd, timeout=100)
    for key in ('stdout','stderr'): s.publish(slot/(key+'.bin'), result[key])
    after = None; post_error = None
    try:
        after, after_frame = state(binding,binding_sha)
        s.require(s.canonical(before) == s.canonical(after) and frame_raw == after_frame, 'POST_STATE_CHANGED')
    except BaseException:
        post_error = 'POST_STATE_REJECTED'
    persisted = reservation = None; capture_errors = []
    for name, cap in (('public.json',s.PUBLIC_CAP),('reservation.json',65536)):
        try:
            raw = s.read(target/name,cap)
            s.publish(slot/('persisted-'+name),raw)
            if name == 'public.json': persisted=raw
            else: reservation=raw
        except BaseException: capture_errors.append(name)
    recording = {'phase':phase,'run':str(run),'command':cmd,'exit_code':result['exit_code'],
        'timed_out':result['timed_out'],'process_completed':result['process_completed'],
        'started_ns':result['started_ns'],'finished_ns':result['finished_ns'],
        'stdout_sha256':s.sha(result['stdout']),'stdout_bytes':len(result['stdout']),
        'stderr_sha256':s.sha(result['stderr']),'stderr_bytes':len(result['stderr']),
        'persisted_sha256':None if persisted is None else s.sha(persisted),
        'persisted_bytes':None if persisted is None else len(persisted),
        'reservation_sha256':None if reservation is None else s.sha(reservation),
        'before_state_sha256':s.sha(s.canonical(before)),
        'after_state_sha256':None if after is None else s.sha(s.canonical(after)),
        'gate_inputs_sha256_before':s.sha(s.canonical(before['gates'])),
        'gate_inputs_sha256_after':None if after is None else s.sha(s.canonical(after['gates'])),
        'returned_observation':'CLI_STDOUT_SERIALIZATION'}
    review = None; review_error = None
    try:
        review = validator.review_operation(stdout=result['stdout'], persisted=persisted,
            reservation=reservation, recording=recording, expected=binding['expected'],frame_binding=frame_raw)
    except BaseException: review_error='PUBLIC_REVIEW_FAILED'
    receipt = {'schema':'lupine.li.complete-readiness.operation-execution.v1',
        'binding_sha256':binding_sha,'recording':recording,'before':before,'after':after,
        'post_state_error':post_error,'capture_errors':capture_errors,
        'process':{k:v for k,v in result.items() if k not in ('stdout','stderr')},
        'public_review':review,'public_review_error':review_error,
        'scientific_admission':False,'raw_exposure_until_validated':'UNKNOWN_SEE_RETAINED_BYTES'}
    s.publish(slot/'execution.json',s.canonical(receipt))
    s.require(post_error is None and not capture_errors and result['process_completed'] is True
        and result['exit_code'] == 0 and type(result['exit_code']) is int and result['stderr'] == b''
        and persisted == result['stdout'] and reservation is not None, 'STOP_PRESERVE_OPERATION')
    # The strict parser proves completed semantics/cleanup; review records gate/recording consistency.
    report = validator.validate_public(result['stdout'],binding['expected'],frame_binding=frame_raw)
    s.require(report['engineering_status'] == 'COMPLETE' and review_error is None
        and type(review) is dict and review.get('status')=='COMPLETED_PUBLIC_CONSISTENCY', 'STOP_PRESERVE_OPERATION')
    return {'stdout':result['stdout'],'persisted':persisted,'reservation':reservation,
            'recording':recording,'review':review}


def run_phase(phase, binding_sha):
    binding = load_bindings(phase,binding_sha)
    folder = HERE/'production'/phase
    s.require(s.absent(folder), 'RECORDER_PHASE_CONSUMED')
    for run in (1,2): s.require(s.absent(s.ROOT/TARGET/phase/str(run)), 'TARGET_SLOT_CONSUMED')
    s.reserve(folder)
    s.publish(folder/'reservation.json',s.canonical({'phase':phase,'binding_sha256':binding_sha,
        'status':'RESERVED_ONE_PHASE_TWO_SLOTS','scientific_admission':False}))
    try:
        before, frame_raw = state(binding,binding_sha)
        validator = load_validator(binding)
        s.publish(folder/'preflight.json',s.canonical({'binding':binding,'binding_sha256':binding_sha,
            'state':before,'status':'GATES_VERIFIED_BEFORE_COMMAND','scientific_admission':False}))
        outputs=[]
        for run in (1,2):
            current, current_frame=state(binding,binding_sha)
            s.require(s.canonical(current)==s.canonical(before) and current_frame==frame_raw,'PRE_STATE_CHANGED')
            outputs.append(run_one(phase,run,binding,binding_sha,validator,current,frame_raw,folder))
        s.require(outputs[0]['stdout']==outputs[1]['stdout'],'PAIR_BYTES_DIFFER')
        prior_hashes,prior_operations,expected_by_phase=prior_acceptances(binding,collect=True)
        s.require(s.canonical(prior_hashes)==s.canonical(before['prior_acceptances']),'PRIOR_ACCEPTANCE_CHANGED')
        expected_by_phase[phase]=binding['expected']
        route=validator.review_route(prior_operations+[{k:out[k] for k in
            ('stdout','persisted','reservation','recording')} for out in outputs],expected_by_phase,frame_binding=frame_raw)
        s.publish(folder/'route-review.json',s.canonical(route))
        s.require(type(route) is dict and route.get('status')=='ROUTE_PUBLIC_CONSISTENCY',
                  'ROUTE_PUBLIC_REVIEW_REJECTED')
        final_state, final_frame=state(binding,binding_sha)
        s.require(s.canonical(final_state)==s.canonical(before) and final_frame==frame_raw,'FINAL_STATE_CHANGED')
        final={'status':'COMPLETE_IDENTICAL_PHASE_PAIR','phase':phase,'commit':binding['commit'],
            'binding_sha256':binding_sha,'public_sha256':s.sha(outputs[0]['stdout']),
            'route_review_sha256':s.sha(s.canonical(route)),
            'scientific_admission':False,'automatic_advance':False,'no_retry':True}
        s.publish(folder/'final.json',s.canonical(final)); return final
    except BaseException:
        s.publish(folder/'stopped.json',s.canonical({'status':'STOP_PRESERVE_EVIDENCE','phase':phase,
            'binding_sha256':binding_sha,'scientific_admission':False,'no_retry':True}))
        raise


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--phase',required=True,choices=PHASES)
    parser.add_argument('--binding-sha256',required=True)
    args=parser.parse_args(argv)
    try: result=run_phase(args.phase,args.binding_sha256)
    except BaseException:
        result={'status':'STOP_PRESERVE_EVIDENCE','phase':args.phase,
                'reason':'RECORDER_REJECTED','scientific_admission':False}
        sys.stdout.buffer.write(s.canonical(result)); return 2
    sys.stdout.buffer.write(s.canonical(result)); return 0


if __name__=='__main__':
    raise SystemExit(main())
