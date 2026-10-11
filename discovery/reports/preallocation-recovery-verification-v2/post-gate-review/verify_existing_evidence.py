"""Read existing public engineering evidence; never run tests/study/API code."""
from pathlib import Path
from hashlib import sha256
import ast
import datetime
import difflib
import json
import subprocess

HERE=Path(__file__).resolve().parent
ROOT=next(p for p in HERE.parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
REPO=ROOT.parent
COMMIT='a0624cac9abb20320629cce41f10270b9b8e2136'
PACKAGE=ROOT/'.cache/package-release-execution-a0624cac9abb'
SUITE=ROOT/'.cache/mpea-preallocation-recovery-full-suite-v1'
RECORDER=ROOT/'.cache/run-preallocation-recovery-full-suite-v1.py'
BASE=ROOT/'.cache/run-contract-freeze-suite-v2.py'
reads={}
def capture(path):
    raw=path.read_bytes();reads[str(path.relative_to(ROOT))]=sha256(raw).hexdigest();return raw
def load(path):return json.loads(capture(path))
def git(*args):return subprocess.check_output(['git',*args],cwd=REPO)
def save(name,value):
    with (HERE/name).open('x') as f:json.dump(value,f,sort_keys=True,indent=2);f.write('\n')
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
assert git('rev-parse','HEAD').decode().strip()==COMMIT
base=capture(BASE).decode();recorder=capture(RECORDER).decode()
assert sha256(base.encode()).hexdigest()=='a4d890661da9088df072b46ddb9fb20ee74f7efbb24f6fc85e098694d8485b26'
assert sha256(recorder.encode()).hexdigest()=='9a8f169c1f0a9b2a01ec72036d5e9b4efe10dca19202353f3f3c42b0a5e78df2'
addition=" required.update({'discovery/docs/mpea-preallocation-recovery-v2.md','discovery/reports/mpea-t25-archival-v1/operational-stop.json'})\n"
normalized=recorder.replace("out=root/'.cache/mpea-preallocation-recovery-full-suite-v1'","out=root/'.cache/mpea-contract-full-suite-v2'")
assert normalized.count(addition)==1
assert normalized.replace(addition,'')==base
with (HERE/'recorder-exact-delta.patch').open('x') as f:
    f.write(''.join(difflib.unified_diff(base.splitlines(True),recorder.splitlines(True),fromfile='actually-executed-prior-recorder',tofile='current-recovery-recorder')))
correction=load(ROOT/'reports/mpea-preallocation-repair-v2/registration-review/recorder-base-correction.json')
assert correction['base_sha256']==sha256(base.encode()).hexdigest()
assert correction['new_recorder_sha256']==sha256(recorder.encode()).hexdigest()

# Do not open the live log or treat transient files as completed suite evidence.
before=load(SUITE/'source-before.json');index=load(SUITE/'index-before.json');head=load(SUITE/'head-before.json')
assert before==index==head and len(before)==343
registration=capture(ROOT/'scripts/mpea_registration_allocation.py').decode()
pins=None
for node in ast.parse(registration).body:
    if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='METADATA_PINS' for t in node.targets):pins=ast.literal_eval(node.value)
assert type(pins) is dict
tracked=git('ls-tree','-r','--name-only',COMMIT).decode().splitlines()
required={p for p in tracked if p.startswith(('discovery/src/','discovery/scripts/','discovery/tests/','discovery/formal/'))}
required.update({'.github/workflows/discovery-verify.yml','discovery/pyproject.toml','discovery/docs/mpea-registration-publication-v1.md','discovery/docs/mpea-preallocation-recovery-v2.md','discovery/reports/mpea-t25-archival-v1/operational-stop.json'})
required.update('discovery/docs/'+n for n in ('mpea-t25-archival-protocol-v1.md','mpea-t25-implementation-contract-v1.md','mpea-t25-operational-enforcement-v1.md'))
required.update('discovery/'+p for p in pins)
required.update('discovery/reports/mpea-protocol-review-v1/randomization/'+n for n in ('README.md','engineering-v1.json','permutation_allocation.py','test_permutation_allocation.py','tests-final.txt','peer-review-note-v1.json'))
required.update('discovery/reports/mpea-feature-readiness-v1/'+p+'/'+n for p in ('process-1','process-2') for n in ('readiness.json','execution.json'))
required.add('discovery/reports/mpea-feature-readiness-v1/reproduction.json')
assert required==set(before)
index_blobs={}
for line in git('ls-files','-s').decode().splitlines():
    fields,path=line.split('\t',1);mode,oid,stage=fields.split()
    if path in required:assert stage=='0';index_blobs[path]=oid
assert set(index_blobs)==required
for name,digest in before.items():
    assert not name.startswith('/') and '..' not in Path(name).parts
    assert sha256((REPO/name).read_bytes()).hexdigest()==digest
    assert sha256(git('show',COMMIT+':'+name)).hexdigest()==digest
    assert sha256(git('cat-file','blob',index_blobs[name])).hexdigest()==digest

package=load(PACKAGE/'execution.json');package_before=load(PACKAGE/'source-before.json')
assert package['source_commit']==COMMIT and package['status']=='PASS' and package['source_unchanged'] is True
assert package['source_before']==package['source_after']==package_before
assert package_before['git_head']==COMMIT and package_before['git_status_porcelain']==''
assert package_before['optional_mpea_resource_exists'] is False
overlap={}
for name,digest in package_before['source_sha256'].items():
    assert not name.startswith('/') and '..' not in Path(name).parts
    assert sha256(capture(ROOT/name)).hexdigest()==digest
    if 'discovery/'+name in before:
        assert before['discovery/'+name]==digest;overlap[name]=digest
assert [c['name'] for c in package['commands']]==['package','retained-verifier','wheel-source-audit']
for command in package['commands']:
    name=command['name'];record=load(PACKAGE/(name+'.execution.json'));start=load(PACKAGE/(name+'.started.json'))
    assert record==command
    assert record['exit_code']==0 and type(record['exit_code']) is int and record['timeout'] is False
    assert record['source_unchanged'] is True and record['source_after']==package_before
    assert start['command']==record['command'] and start['pid']==record['pid']
    assert start['started_at_utc']==record['started_at_utc']
    assert sha256(capture(PACKAGE/(name+'.stdout.txt'))).hexdigest()==record['stdout_sha256']
    assert sha256(capture(PACKAGE/(name+'.stderr.txt'))).hexdigest()==record['stderr_sha256']
smoke=load(PACKAGE/'package.stdout.txt');retained=load(PACKAGE/'retained-verifier.stdout.txt');wheel=load(PACKAGE/'wheel-source-audit.stdout.txt')
assert smoke['status']=='passed' and smoke['case_count']==28 and len(smoke['checks'])==12 and len(smoke['problem_schemas'])==6
assert retained['status']=='PASS' and retained['expected_git_commit']==COMMIT
assert retained['ci_success_established'] is False and retained['scientific_data_opened'] is False
assert retained['artifact_identities']==package['artifacts']
assert retained['receipt_sha256']==package['retained_receipt_sha256']
assert retained['mpea_transport_audit']['optional_resource_present'] is False
assert retained['mpea_transport_audit']['scientific_report_semantics_validated'] is False
assert retained['source_audit']['runtime_manifest_source_count']==292
assert retained['source_audit']['archived_file_count']==2096
assert wheel['status']=='PASS' and wheel['source_commit']==COMMIT
assert wheel['wheel_sha256']==package['artifacts']['wheel']['sha256']
assert wheel['source_archive_sha256']==package['artifacts']['source_archive']['sha256']
assert wheel['retained_receipt_sha256']==package['retained_receipt_sha256']
assert wheel['runtime_payload_count']==104 and wheel['exact_source_payload_count']==106
assert wheel['runtime_payload_set_equals_archived_source_set'] is True
assert len(wheel['generated_metadata_not_byte_compared_to_source'])==5
assert package['optional_mpea_probe']==retained['reported_smoke']['optional_mpea']
assert package['optional_mpea_probe']['status']=='absent'
assert git('rev-parse','HEAD').decode().strip()==COMMIT
assert all(sha256((ROOT/p).read_bytes()).hexdigest()==digest for p,digest in reads.items())
receipt={
    'schema':'lupine.mpea.post_gate_compatibility_review.v1',
    'status':'COMPATIBLE_PENDING_COMPLETED_SUITE_CI_AND_NEW_ENGINEERING_HANDOFF',
    'source_commit':COMMIT,'recorded_started_at':started,
    'recorded_completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'reviewed_input_sha256':reads,
    'suite_before_snapshot':{'registration_closure_count':343,'complete_required_path_set':True,
        'recorded_working_index_head_maps_equal':True,'current_working_index_commit_matches':True,
        'scope':'Start snapshots and current read-only source check, not completed suite evidence'},
    'recorder_review':{'actual_prior_sha256':sha256(base.encode()).hexdigest(),'current_sha256':sha256(recorder.encode()).hexdigest(),
        'delta':['fresh exclusive output directory','two mandatory recovery/failure evidence paths'],
        'executed_by_reviewer':False},
    'package_review':{'three_completed_process_records_and_log_hashes_match':True,
        'source_snapshots_match':True,'full_suite_overlap_source_sha256':overlap,
        'cases':28,'schemas':6,'flags':12,'optional_mpea_resource':'ABSENT',
        'runtime_manifest_paths':292,'archive_committed_files':2096,
        'wheel_runtime_payloads':104,'exact_source_payloads_including_licenses':106,
        'generated_packaging_metadata_files':5,
        'wheel_and_archive_reopened_by_reviewer':False,'commands_reexecuted_by_reviewer':False},
    'scope_distinction':'343-file registration closure, 292-path runtime manifest and 2096-file archived copyset serve different purposes and are not interchangeable.',
    'full_suite_result':'NOT_AUTHENTICATED_BY_THIS_REVIEW',
    'ci_result':'NOT_AUTHENTICATED_BY_THIS_REVIEW',
    'new_engineering_receipt':'AWAITING_EXPLICIT_HANDOFF',
    'engineering_approval':None,'scientific_verdict':None,
    'not_performed':['test duplication','API access','registration creation','tag mutation','archive/private feature/target access','allocation or registry access','main-tree edits'],
    'reviewer_source_sha256':sha256(Path(__file__).read_bytes()).hexdigest(),
}
save('compatibility-review.json',receipt)
print(json.dumps({'status':receipt['status'],'receipt_sha256':sha256((HERE/'compatibility-review.json').read_bytes()).hexdigest()},sort_keys=True))
