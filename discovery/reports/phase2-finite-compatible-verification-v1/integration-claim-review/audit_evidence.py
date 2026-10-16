"""Read-only public receipt and synthetic evidence audit; no runtime execution."""
from pathlib import Path
import ast
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
F7 = 'f7c6ccd04b535f8830f07905b51a5dc2c8a6ca4f'
FLAG = ROOT / 'reports/phase2-li-flag-verification-v1'
COMPAT = ROOT / 'reports/phase2-li-compatible-envelope-v1'
bindings = {}

def raw(path):
    path = Path(path)
    if not path.is_absolute():
        path = ROOT / path
    data = path.read_bytes()
    bindings[str(path.relative_to(ROOT))] = hashlib.sha256(data).hexdigest()
    return data

def obj(path):
    return json.loads(raw(path))

def sha(data):
    return hashlib.sha256(data).hexdigest()

def instant(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))

def git_bytes(relative):
    return subprocess.check_output(['git', 'show', F7 + ':discovery/' + relative], cwd=ROOT)

def execution(path, stdout, stderr, expected_code, runtime_count):
    receipt = obj(path)
    assert receipt['exit_code'] == expected_code
    assert receipt['source_unchanged'] is True
    assert receipt['runtime_before'] == receipt['runtime_after']
    assert len(receipt['runtime_before']) == runtime_count
    assert sha(raw(stdout)) == receipt['stdout_sha256']
    assert sha(raw(stderr)) == receipt['stderr_sha256']
    assert instant(receipt['started_at']) <= instant(receipt['finished_at'])
    return receipt

started = datetime.now(timezone.utc).isoformat()
head = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
assert head == '4492858d9e55ddfa3cca2e208063799517948b13'

# The six wrappers are compared to original synthetic browser/reviewer files,
# not merely to the asserted digest in the publication map.
mapping = obj('reports/phase2-finite-workbench-v1/lossless-artifact-map.json')
assert len(mapping['artifacts']) == 6
wrappers = []
for entry in mapping['artifacts']:
    wrapper = obj(entry['published_wrapper'])
    assert wrapper['schema'] == 'lupine.discovery.lossless_text_artifact.v1'
    assert wrapper['original_relative_path'] == entry['original_path']
    assert wrapper['encoding'] == 'utf-8'
    rebuilt = wrapper['text'].encode('utf-8')
    assert len(rebuilt) == wrapper['original_bytes']
    assert sha(rebuilt) == wrapper['original_sha256'] == entry['original_sha256']
    assert entry['round_trip_exact'] is True
    assert not (ROOT / entry['original_path']).exists()
    if '/interface/browser-attempt-1/artifacts/' in entry['original_path']:
        source = '.cache/phase2-finite-ui-candidate-v1/browser-attempt-1/artifacts/' + Path(entry['original_path']).name
    else:
        source = '.cache/phase2-li-compatible-envelope-review-v1/reviewer-fixture-fix.patch'
    assert rebuilt == raw(source)
    wrappers.append({'wrapper':entry['published_wrapper'], 'original_cache':source,
                     'sha256':sha(rebuilt), 'bytes':len(rebuilt), 'exact':True})

# CI metadata, not remote log contents or a fresh network observation.
ci = obj(FLAG/'ci-recovered/final.json')
ancestor = obj(FLAG/'ancestor-ci/final.json')
for observed, commit, run_id in [(ci,F7,38864077153),(ancestor,'ea69d01e144747c97bf288b37249f39af9e8f715',38862239658)]:
    assert observed['commit'] == observed['run']['head_sha'] == commit
    assert observed['run']['id'] == run_id
    assert observed['run']['event'] == 'push' and observed['run']['run_attempt'] == 1
    assert observed['run']['status'] == 'completed' and observed['run']['conclusion'] == 'success'
    assert observed['all_four_jobs_successful'] is True
    assert {j['name'] for j in observed['jobs']} == {'lean','browser','python (3.11)','python (3.12)'}
    for job in observed['jobs']:
        assert job['status'] == 'completed' and job['conclusion'] == 'success'
        assert instant(job['completed_at']) <= instant(observed['observed_at'])
failed_watcher = obj(FLAG/'ci-first/watcher-first-failure.json')
cancelled = obj(FLAG/'actual-commands/supervisor-cancelled-before-execution.json')
assert failed_watcher['exit_code'] == 1 and '401' in failed_watcher['stderr']
assert cancelled['actual_diagnostic_started'] is False
assert instant(cancelled['observed_at']) < instant(ci['observed_at'])

package = []
for i in (0,1):
    record = execution(FLAG/f'clean-package/{i}-execution.json',FLAG/f'clean-package/{i}-stdout.txt',FLAG/f'clean-package/{i}-stderr.txt',0,309)
    assert record['commit'] == F7 and record['head_unchanged'] and record['worktree_clean']
    package.append(record)
smoke = obj(FLAG/'clean-package/0-stdout.txt')
verifier = obj(FLAG/'clean-package/1-stdout.txt')
retained = obj(FLAG/'clean-package/release-artifacts.json')
assert smoke['status'] == 'passed' and smoke['case_count'] == 28
assert len(smoke['problem_schemas']) == 6 and len(smoke['checks']) == 15
assert verifier['status'] == 'PASS' and verifier['expected_git_commit'] == F7
assert verifier['reported_smoke']['checks'] == smoke['checks'] == retained['verification']['checks']
assert retained['source']['git_commit'] == F7
assert verifier['artifact_identities'] == retained['artifacts']
assert verifier['receipt_sha256'] == sha(raw(FLAG/'clean-package/release-artifacts.json'))
assert verifier['ci_success_established'] is False

public = [raw(FLAG/f'public-{i}.json') for i in (1,2)]
assert public[0] == public[1]
assert sha(public[0]) == '74404679ec62a18ef50d1847f652ba749c85eb8f63d08740d2fa0a5fb956c47b'
projection = json.loads(public[0])
assert projection['status'] == 'BLOCKED_SCHEMA'
assert projection['reason'] == 'DEFLATE_OPTION_FLAGS_ONLY'
assert projection['prior_diagnostic_reason'] == 'MEMBER_FLAGS'
assert projection['legacy_zip_reason'] == 'ZIP_LAYOUT_UNSUPPORTED'
assert projection['implementation']['commit'] == F7
assert projection['source_identity_verified'] is True and projection['synthetic_fixture'] is False
exposure = projection['exposure']
assert exposure['target_bearing_source_bytes_read'] is True
assert exposure['raw_buffer_read_completed'] is True and exposure['directory_name_decoding_completed'] is True
assert exposure['members_decompressed'] == []
for key in ['xml_decoded','worksheet_cells_decoded','shared_strings_decoded','member_names_published','sampling_independence_established','scientific_eligibility_decisions','target_numeric_validity_checked']:
    assert exposure[key] is False
assert exposure['fits'] == exposure['splits'] == 0
for key in ['row_count','paired_count','source_group_count','overlap_count']:
    assert projection[key] is None
prior_pins = {}
for key in ['files','legacy_files','prior_files']:
    prior_pins.update(projection['implementation'][key])
assert len(prior_pins) == 13
for relative, digest in prior_pins.items():
    assert sha(raw(relative)) == digest == sha(git_bytes(relative))
actual = []
for i in (1,2):
    record = execution(FLAG/f'actual-commands/{i}/execution.json',FLAG/f'actual-commands/{i}/stdout.txt',FLAG/f'actual-commands/{i}/stderr.txt',2,309)
    assert record['commit'] == F7 and record['ci_run'] == 38864077153
    assert record['head_unchanged'] and record['worktree_clean']
    assert record['expected_exit_code'] == 2 and record['timed_out'] is False
    assert record['exposure'] == exposure
    assert raw(FLAG/f'actual-commands/{i}/stdout.txt') == public[i-1]
    assert max(instant(ci['observed_at']),*(instant(p['finished_at']) for p in package)) < instant(record['started_at'])
    actual.append(record)
assert instant(actual[0]['finished_at']) < instant(actual[1]['started_at'])
for relative,digest in actual[0]['runtime_before'].items():
    assert sha(git_bytes(relative)) == digest
assert all(r['runtime_before'] == actual[0]['runtime_before'] for r in actual+package)

# The 109-test receipt is checked, not reexecuted. Its entire source map must
# match the promoted tracked runtime and current manifest.
combined = execution(COMPAT/'integrated/execution.json',COMPAT/'integrated/stdout.txt',COMPAT/'integrated/stderr.txt',0,317)
log = raw(COMPAT/'integrated/stderr.txt').decode('utf-8')
assert re.search(r'Ran 109 tests in 1\.373s\s+OK\s*$',log)
assert len(re.findall(r'\.\.\. ok$',log,re.M)) == 109
assert instant(actual[1]['finished_at']) < instant(combined['started_at'])
manifest = obj('reports/runtime-manifest.json')
assert manifest['files'] == combined['runtime_before']
for relative,digest in manifest['files'].items():
    assert sha(raw(relative)) == digest
assert sha(raw('scripts/li_v3_compatible_envelope.py')) == 'e771b3fc2a66d6e2ff3a26d8aae88b7a2915ac908907908316e697997761c847'
assert sha(raw('src/lupine_discovery/finite_planning.py')) == '027785ccdf24f6e8cf9b7a8ac98987b821fcdb19c875bbe8d2ba52d2fc3895f8'

# Preservation of prior executable assertions/strict producer-verifier flags.
def value(source,name):
    for node in ast.parse(source).body:
        if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in node.targets):
            return ast.literal_eval(node.value)
    raise AssertionError(name)
old_package = git_bytes('scripts/package_smoke.py').decode()
new_package = raw('scripts/package_smoke.py').decode()
old_probe,new_probe = (value(s,'PROBE') for s in [old_package,new_package])
old_asserts = Counter(ast.dump(n,include_attributes=False) for n in ast.walk(ast.parse(old_probe)) if isinstance(n,ast.Assert))
new_asserts = Counter(ast.dump(n,include_attributes=False) for n in ast.walk(ast.parse(new_probe)) if isinstance(n,ast.Assert))
assert not old_asserts-new_asserts
assert sum(old_asserts.values()) == 63 and sum(new_asserts.values()) == 72
assert sha(new_probe.encode()) == 'a990a5aa825b1ed55caeb2551b86dae3efc4f0e258e95afc696b95f4919415a6'
producer_check_lists = [ast.literal_eval(v) for n in ast.walk(ast.parse(new_probe)) if isinstance(n,ast.Dict) for k,v in zip(n.keys,n.values) if isinstance(k,ast.Constant) and k.value=='checks']
assert len(producer_check_lists) == 1
checks = producer_check_lists[0]
assert len(checks) == 16
assert [c for c in checks if c in smoke['checks']] == smoke['checks']
assert checks == value(raw('scripts/verify_retained_artifacts.py').decode(),'CHECKS')
assert value(raw('tests/test_package_retention_review.py').decode(),'PROBE_SHA256') == sha(new_probe.encode())
retention_test = ast.parse(raw('tests/test_package_retention.py').decode())
pin_calls = [node for node in ast.walk(retention_test) if isinstance(node,ast.Call) and isinstance(node.func,ast.Attribute) and node.func.attr=='assertEqual' and len(node.args)==2 and isinstance(node.args[1],ast.Constant) and node.args[1].value==sha(new_probe.encode())]
assert len(pin_calls)==1 and ast.unparse(pin_calls[0].args[0])=='sha256(smoke.PROBE.encode()).hexdigest()'
changed = subprocess.check_output(['git','diff',F7,head,'--name-only'],cwd=ROOT,text=True).splitlines()
assert not any(p.endswith(('.gitattributes','.gitconfig')) or p.startswith('.github/') for p in changed)
workflow = ROOT.parent/'.github/workflows/discovery-verify.yml'
assert workflow.read_bytes() == subprocess.check_output(['git','show',F7+':.github/workflows/discovery-verify.yml'],cwd=ROOT)

for relative in ['GOAL.md','STATUS.md','README.md','docs/release-validation.md','docs/study-planning.md','docs/finite-population-planning.md','docs/li-v3-compatible-envelope-plan.md','reports/progress.md','reports/continuation.json','reports/phase2-finite-workbench-v1/README.md','reports/phase2-li-compatible-envelope-v1/README.md','reports/phase2-li-flag-verification-v1/README.md','reports/phase2-li-next-schema-design-v1/README.md']:
    raw(relative)
continuation = obj('reports/continuation.json')['current_checkpoint']
assert continuation['published_commit'] == F7
assert continuation['compatible_envelope']['status'] == 'REVIEWED_SYNTHETIC_PASS_NOT_RUN_ON_ACTUAL_SOURCE'
assert continuation['clean_package']['mandatory_checks'] == 15
assert continuation['clean_package']['independent_artifact_audit'] == 'NOT_RUN_AT_THIS_COMMIT'
assert continuation['finite_planning']['overlay_installed_package']['checks'] == 16

report = {'schema':'lupine.discovery.independent_integration_review.v1',
 'status':'PASS_READ_ONLY_EVIDENCE_AUDIT','blockers':[],
 'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),'base_head':head,
 'scope':'Public receipt/log identity and chronology, source-bound narrative review, six synthetic evidence round trips and executable assertion preservation; no test or runtime reexecution.',
 'lossless_round_trips':wrappers,
 'ci':{'commit':F7,'run':38864077153,'attempt':1,'four_jobs':'success','source':'retained API metadata','fresh_network_observation':False},
 'chronology':{'package_finished':package[-1]['finished_at'],'ci_observed':ci['observed_at'],'first_actual_started':actual[0]['started_at'],'last_actual_finished':actual[-1]['finished_at'],'combined_synthetic_started':combined['started_at'],'combined_synthetic_finished':combined['finished_at']},
 'actual_flag':{'two_public_receipts_identical':True,'sha256':sha(public[0]),'reason':projection['reason'],'status':projection['status'],'runtime_count':309,'same_runtime_matches_git_commit':True,'prior_frozen_pins_unchanged':13,'member_decompression':False,'xml_decoding':False,'scope':'First rejected entry only; no complete archive/schema/scientific inference.'},
 'integrated':{'test_count':109,'receipt_exit_code':0,'unittest_seconds':1.373,'runtime_files':317,'current_runtime_matches_receipt_and_manifest':True,'scientific_source_read':False},
 'checks_preserved':{'old_probe_assertions':63,'new_probe_assertions':72,'all_old_assertions_preserved':True,'mandatory_checks':16,'old_15_order_preserved':True,'both_fixed_probe_pins_match':True,'workflow_bytes_unchanged':True,'check_config_change_in_staged_paths':False},
 'claim_review':{'finite_vs_iid_and_future_risk_separate':True,'exact_f7_vs_pending_descendant_separate':True,'renewed_phase_vs_historical_closure_separate':True,'compatible_actual_execution_not_claimed':True,'historical_scientific_no_go_preserved':True,'independent_child_review':'No blocker; source-bound child review reported separately.'},
 'not_performed':{'tests':True,'candidate_import_or_execution':True,'network':True,'actual_object_or_private_capture_access':True,'retained_archive_or_wheel_byte_audit':True,'scientific_replication':True,'new_ci_verification':True},
 'bindings':bindings}
(OUT/'review.json').write_text(json.dumps(report,indent=2,sort_keys=True)+'\n')
print(json.dumps({'status':report['status'],'six_round_trips':len(wrappers),'actual_flag_hash':sha(public[0]),'combined_tests':109,'runtime_files':317,'review_sha256':sha((OUT/'review.json').read_bytes())},sort_keys=True))
