"""Inspect public completed command evidence; never open wheel/source archives."""
from pathlib import Path
import ast
import datetime
import hashlib
import json
import subprocess
import sys

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
REPO = ROOT.parent
COMMIT = 'eaed2e7a00c8bb5c68d9dafb62c03ceb01ca218f'
RUN = ROOT / '.cache/phase2-source-readiness-release-v1' / ('run-' + COMMIT)
RETAINED = RUN / 'retained'
MANIFEST_SHA = '5137c79614e1090a766046a09817ed5867929c3984933d7c0825c2429c9f3ca0'
RECORDER_SHA = 'b74867438bda41235f0b93b028f91caf422284037d6ebe65cf244fa4f4084c33'
AUDITOR_SHA = '7487bc9ca66ed5b132c928836fd9c435d43577f2b00b6fa4f6383e812b5139a6'
PREPARATION_SHA = '8fee501aa69b69bf772d1c402f185e97743f0a0e934065e61af3d851972b3b17'
SLOT = BASE / 'completed-command-evidence'
SLOT.mkdir(exist_ok=False)
checks, inputs, gate_packet = [], [], {}
cache = {}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True,
                       allow_nan=False) + '\n').encode('ascii')


def strict_json(raw):
    def pairs(items):
        value = {}
        for key, item in items:
            if key in value:
                raise ValueError('Duplicate JSON key')
            value[key] = item
        return value
    def invalid(_):
        raise ValueError('Nonfinite JSON token')
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=invalid)


def save(path, value):
    with path.open('x') as f:
        json.dump(value, f, indent=2, sort_keys=True, allow_nan=False)
        f.write('\n')


def require(label, value):
    checks.append({'check':label, 'passed':bool(value)})
    if not value:
        raise AssertionError(label)


def identity(path, raw):
    return {'path':str(path), 'bytes':len(raw), 'sha256':sha(raw)}


def read(name, packet=False):
    if name in cache:
        return cache[name]
    path = RUN / name
    require('regular_public_input_' + name, path.is_file() and path.resolve() == path.absolute())
    raw = path.read_bytes()
    inputs.append(identity(path, raw))
    cache[name] = raw
    if packet:
        gate_packet[name] = {'bytes':len(raw), 'sha256':sha(raw), 'utf8':raw.decode('utf-8')}
    else:
        target = SLOT / name.replace('/', '__')
        with target.open('xb') as f:
            f.write(raw)
    return raw


def load(name, packet=False):
    return strict_json(read(name, packet))


def timestamp(value):
    parsed = datetime.datetime.fromisoformat(value)
    require('timezone_in_timestamp_' + value, parsed.tzinfo is not None)
    return parsed


def command(label, expected_argv, expected_cwd, packet=False):
    start = load(label + '.started.json', packet)
    execution = load(label + '.execution.json', packet)
    require('started_shape_' + label, set(start) == {'argv','cwd','started_utc','stdout','stderr'})
    require('completed_shape_' + label, set(execution) == set(start) | {
        'finished_utc','returncode','launch_error','stdout_identity','stderr_identity'})
    require('started_fields_preserved_' + label, canonical(start) == canonical({k:execution[k] for k in start}))
    require('actual_argv_cwd_' + label, execution['argv'] == expected_argv and execution['cwd'] == str(expected_cwd))
    require('observed_zero_exit_' + label, type(execution['returncode']) is int and execution['returncode'] == 0 and execution['launch_error'] is None)
    require('ordered_command_time_' + label, timestamp(execution['started_utc']) <= timestamp(execution['finished_utc']))
    for stream in ('stdout','stderr'):
        require('closed_stream_name_' + label + '_' + stream, execution[stream] == label + '.' + stream)
        raw = read(execution[stream], packet)
        require('actual_stream_identity_' + label + '_' + stream,
                execution[stream+'_identity'] == {'bytes':len(raw),'sha256':sha(raw)})
    require('empty_stderr_' + label, read(label+'.stderr', packet) == b'')
    return execution


try:
    source = (BASE/'audit_retained.py').read_bytes()
    require('frozen_auditor', sha(source) == AUDITOR_SHA)
    require('frozen_preparation', sha((BASE/'preparation.json').read_bytes()) == PREPARATION_SHA)
    request = load('request.json')
    final = load('review.json')
    outer = load('root-observed-exit.json')
    before, after = load('source-before.json'), load('source-after.json')
    recorder = read('executed-recorder.py')
    require('executed_recorder_identity', sha(recorder) == RECORDER_SHA == sha((RUN.parent/'record_release.py').read_bytes()))
    require('request_bound_commit_scope', request['schema'] == 'lupine.source-readiness.release-request.v1'
        and request['commit'] == COMMIT and request['recorder'] == {'bytes':len(recorder),'sha256':RECORDER_SHA}
        and type(request['runtime_file_count_required']) is int and request['runtime_file_count_required'] == 351
        and type(request['mandatory_strict_flags_expected']) is int and request['mandatory_strict_flags_expected'] == 18)
    require('final_completed_success', final['schema'] == 'lupine.source-readiness.recorded-release.v1'
        and final['status'] == 'PASS' and final['published_commit'] == COMMIT
        and final['source_held'] is True and final['errors'] == []
        and type(final['package_returncode']) is int and final['package_returncode'] == 0
        and type(final['strict_returncode']) is int and final['strict_returncode'] == 0
        and final['run_directory'] == str(RUN) and final['retained_directory'] == str(RETAINED)
        and final['recorder_sha256'] == RECORDER_SHA)
    require('root_outer_observed_actual_completion', outer['commit'] == COMMIT
        and type(outer['actual_tool_session']) is int and outer['actual_tool_session'] == 98858
        and outer['actual_completion_chunk'] == 'd102bd'
        and type(outer['actual_exit_code']) is int and outer['actual_exit_code'] == 0
        and outer['observed_by'] == 'root' and outer['review_sha256'] == sha(read('review.json'))
        and outer['recorder_sha256'] == RECORDER_SHA and outer['scientific_admission'] is False)
    require('before_after_source_exactly_held', read('source-before.json') == read('source-after.json'))
    require('source_commit_branch_remote_clean', before['git_commit'] == COMMIT == before['remote_branch_commit']
        and before['branch'] == 'research/lupine-discovery'
        and before['worktree_status'] == 'clean_tracked_and_nonignored_untracked'
        and before['recorder'] == {'bytes':len(recorder),'sha256':RECORDER_SHA})
    manifest_raw = (ROOT/'reports/runtime-manifest.json').read_bytes()
    manifest = strict_json(manifest_raw)
    require('source_manifest_exact_identity', sha(manifest_raw) == MANIFEST_SHA
        and before['runtime_manifest'] == {'bytes':len(manifest_raw),'sha256':MANIFEST_SHA}
        and before['runtime_files'] == manifest['files'] and len(before['runtime_files']) == 351)
    promotion = strict_json((BASE/'prepared-promotion-inputs.json').read_bytes())
    require('held_package_and_verifier_sources', before['tools'] == {
        p:promotion['files'][p]['sha256'] for p in ('scripts/package_smoke.py','scripts/verify_retained_artifacts.py')})
    package_start = load('package.started.json')
    python = package_start['argv'][0]
    require('actual_interpreter_matches_held_state', str(Path(python).resolve()) == before['python_executable'])
    package = command('package',[python,'-I',str(ROOT/'scripts/package_smoke.py'),
        '--retain-directory',str(RETAINED),'--output',str(RUN/'package-report.json')],ROOT)
    strict = command('strict',[python,'-I',str(ROOT/'scripts/verify_retained_artifacts.py'),
        '--directory',str(RETAINED),'--commit',COMMIT,'--repository',str(REPO)],ROOT)
    gate_commands = {}
    for prefix in ('before','after'):
        operations = {
            'head':(['git','rev-parse','HEAD'],(COMMIT+'\n').encode()),
            'status':(['git','status','--porcelain=v1','--untracked-files=all'],b''),
            'branch':(['git','symbolic-ref','--short','HEAD'],b'research/lupine-discovery\n'),
            'remote':(['git','ls-remote','--exit-code','origin','refs/heads/research/lupine-discovery'],
                     (COMMIT+'\trefs/heads/research/lupine-discovery\n').encode()),
            'committed-manifest':(['git','show',COMMIT+':discovery/reports/runtime-manifest.json'],manifest_raw),
        }
        previous = None
        for suffix,(argv,stdout) in operations.items():
            label = prefix+'-'+suffix
            observed = command(label,argv,REPO,packet=True)
            gate_commands[label] = observed
            require('git_gate_literal_stdout_'+label,read(label+'.stdout',True)==stdout)
            if previous:
                require('git_gate_sequence_'+label,timestamp(previous['finished_utc'])<=timestamp(observed['started_utc']))
            previous = observed
    require('whole_recorded_chronology',
        timestamp(request['started_utc']) == timestamp(final['started_utc'])
        <= timestamp(gate_commands['before-head']['started_utc'])
        <= timestamp(gate_commands['before-committed-manifest']['finished_utc'])
        <= timestamp(package['started_utc']) <= timestamp(package['finished_utc'])
        <= timestamp(strict['started_utc']) <= timestamp(strict['finished_utc'])
        <= timestamp(gate_commands['after-head']['started_utc'])
        <= timestamp(gate_commands['after-committed-manifest']['finished_utc'])
        <= timestamp(final['finished_utc']) <= timestamp(outer['at']))
    report = load('package-report.json')
    package_stdout = strict_json(read('package.stdout'))
    strict_report = strict_json(read('strict.stdout'))
    receipt_raw = read('retained/release-artifacts.json')
    receipt = strict_json(receipt_raw)
    parsed = ast.parse(source)
    constants = {n.targets[0].id:ast.literal_eval(n.value) for n in parsed.body if isinstance(n,ast.Assign)
        and len(n.targets)==1 and isinstance(n.targets[0],ast.Name)
        and n.targets[0].id in {'OLD_CHECKS','NEW_CHECK','READINESS_CHECK'}}
    flags = constants['OLD_CHECKS']+[constants['NEW_CHECK'],constants['READINESS_CHECK']]
    require('all_eighteen_flags_in_reports', len(flags) == 18 and report['checks'] == flags
        and strict_report['reported_smoke']['checks'] == flags and receipt['verification']['checks'] == flags)
    require('package_stdout_exact_summary',canonical(package_stdout) == canonical({k:report[k] for k in ('status','case_count','problem_schemas','checks')}))
    require('package_report_exact_receipt_verification',canonical({k:v for k,v in report.items() if k!='retention'}) == canonical(receipt['verification']))
    require('retention_metadata_link',report['retention'] == {'artifacts':receipt['artifacts'],
        'directory':str(RETAINED),'git_commit':COMMIT,'receipt':'release-artifacts.json','receipt_sha256':sha(receipt_raw)})
    unsealed = {k:v for k,v in receipt.items() if k!='content_sha256'}
    require('retention_seal',receipt['content_sha256']==sha(canonical(unsealed)))
    require('strict_completed_receipt_link',strict_report['schema']=='lupine.discovery.retained-artifact-independent-audit.v1'
        and strict_report['status']=='PASS' and strict_report['expected_git_commit']==COMMIT
        and strict_report['receipt_sha256']==sha(receipt_raw) and strict_report['artifact_identities']==receipt['artifacts']
        and strict_report['verifier_sha256']==before['tools']['scripts/verify_retained_artifacts.py'])
    require('strict_smoke_subset_matches_package',all(canonical(v)==canonical(report[k]) for k,v in strict_report['reported_smoke'].items()))
    require('strict_source_claim_matches_commit_manifest',strict_report['source_audit']['git_commit']==COMMIT
        and strict_report['source_audit']['runtime_manifest_sha256']==MANIFEST_SHA
        and type(strict_report['source_audit']['runtime_manifest_source_count']) is int
        and strict_report['source_audit']['runtime_manifest_source_count']==351
        and strict_report['source_audit']['all_original_git_blobs_verified'] is True)
    require('strict_limits_preserved',strict_report['archive_contents_executed'] is False
        and strict_report['scientific_data_opened'] is False and strict_report['ci_success_established'] is False)
    require('exact_worktree_head_and_clean_now',subprocess.run(['git','rev-parse','HEAD'],cwd=REPO,capture_output=True,check=True).stdout==(COMMIT+'\n').encode()
        and subprocess.run(['git','status','--porcelain=v1','--untracked-files=all'],cwd=REPO,capture_output=True,check=True).stdout==b'')
    save(SLOT/'git-command-evidence.json',{'schema':'lupine.source-readiness.git-command-public-evidence.v1',
        'encoding':'Exact UTF-8 decoded originals; encode each utf8 value as UTF-8 to reconstruct and verify its SHA256.','files':gate_packet})
    gate = {'schema':'lupine.source-readiness.artifact-gate-review.v1',
        'status':'PASS_BOUND_COMPLETED_PACKAGE_AND_STRICT_EXECUTION','published_commit':COMMIT,
        'retained_directory':str(RETAINED),'package_observed_exit_code':0,'strict_observed_exit_code':0,
        'source_clean_observed':True,'reviewed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'checks':checks,'inputs':inputs,'scope':'Public command receipts/logs/outer observation inspected; wheel/source-archive contents have not been read by this binder. No scientific or CI claim.'}
    save(BASE/'actual-gate-review.json',gate)
    gate_raw=(BASE/'actual-gate-review.json').read_bytes()
    binding={'schema':'lupine.source-readiness.artifact-actual-binding.v1','published_commit':COMMIT,
        'retained_directory':str(RETAINED),'audit_source_sha256':AUDITOR_SHA,'preparation_sha256':PREPARATION_SHA,
        'runtime_manifest_sha256':MANIFEST_SHA,'gate_review':identity(BASE/'actual-gate-review.json',gate_raw),'evidence':inputs}
    save(BASE/'actual-binding.json',binding)
    print(json.dumps({'status':gate['status'],'checks':len(checks),'evidence_files':len(inputs),
        'binding_sha256':sha((BASE/'actual-binding.json').read_bytes()),'gate_review_sha256':sha(gate_raw)},indent=2))
except Exception as exc:
    save(BASE/'first-binding-failure.json',{'status':'FAIL_BINDING_NO_ARTIFACT_AUDIT','checks':checks,
        'error_type':type(exc).__name__,'error':str(exc),'inputs':inputs})
    raise
