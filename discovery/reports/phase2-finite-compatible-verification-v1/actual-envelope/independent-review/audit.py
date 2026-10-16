"""Audit only explicitly authorized public receipts and source, never raw custody."""
from pathlib import Path
import ast
from datetime import datetime, timezone
import hashlib
import json
import subprocess

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
COMMIT='4492858d9e55ddfa3cca2e208063799517948b13'
RUN=38867704072
bindings={}
def raw(path):
    path=Path(path)
    if not path.is_absolute():path=ROOT/path
    data=path.read_bytes()
    bindings[str(path.relative_to(ROOT))]=hashlib.sha256(data).hexdigest()
    return data
def obj(path):return json.loads(raw(path))
def sha(data):return hashlib.sha256(data).hexdigest()
def moment(value):return datetime.fromisoformat(value.replace('Z','+00:00'))
started=datetime.now(timezone.utc).isoformat()
ci=obj('.cache/phase2-finite-compatible-ci-v1/final.json')
assert ci['commit']==ci['run']['head_sha']==COMMIT
assert ci['run']['id']==RUN and ci['run']['event']=='push' and ci['run']['run_attempt']==1
assert ci['run']['status']=='completed' and ci['run']['conclusion']=='success'
assert ci['all_four_jobs_successful'] is True
assert {j['name'] for j in ci['jobs']}=={'lean','browser','python (3.11)','python (3.12)'}
for job in ci['jobs']:
    assert job['status']=='completed' and job['conclusion']=='success'
    assert moment(job['completed_at'])<=moment(ci['observed_at'])

package=ROOT/'.cache/phase2-finite-compatible-clean-package-v1'
production=ROOT/'.cache/phase2-li-compatible-production-v1'
public=ROOT/'.cache/li-v3-custody/compatible-envelope-v1'
def read_execution(path,stdout,stderr,code):
    record=obj(path)
    assert record['commit']==COMMIT and record['exit_code']==code
    assert record['source_unchanged'] is True
    assert record['runtime_before']==record['runtime_after']
    assert len(record['runtime_before'])==317
    assert record['head_unchanged'] is True and record['worktree_clean'] is True
    assert sha(raw(stdout))==record['stdout_sha256']
    assert sha(raw(stderr))==record['stderr_sha256']
    assert moment(record['started_at'])<=moment(record['finished_at'])
    return record
packages=[read_execution(package/f'{i}-execution.json',package/f'{i}-stdout.txt',package/f'{i}-stderr.txt',0) for i in (0,1)]
smoke=obj(package/'0-stdout.txt')
verified=obj(package/'1-stdout.txt')
assert smoke['status']=='passed' and smoke['case_count']==28 and len(smoke['problem_schemas'])==6
assert len(smoke['checks'])==16
assert verified['status']=='PASS' and verified['expected_git_commit']==COMMIT
assert verified['reported_smoke']['checks']==smoke['checks']
assert verified['ci_success_established'] is False
assert moment(packages[0]['finished_at'])<=moment(packages[1]['started_at'])

actual=[]
for index in (1,2):
    record=read_execution(production/str(index)/'execution.json',production/str(index)/'stdout.txt',production/str(index)/'stderr.txt',2)
    assert record['ci_run']==RUN and record['expected_exit_code']==2
    assert record['timed_out'] is False
    assert record['command'][1:]==['scripts/li_v3_compatible_envelope.py','envelope','--run',str(index)]
    assert moment(record['started_at'])>max(moment(ci['observed_at']),moment(packages[-1]['finished_at']))
    payload=raw(public/str(index)/'public.json')
    assert payload==raw(production/str(index)/'stdout.txt')
    report=json.loads(payload)
    assert report['status']==record['result_status']=='BLOCKED_SCHEMA'
    assert report['engineering_status']==record['engineering_status']=='BLOCKED_LAYOUT'
    assert report['reason']==record['reason']=='ZIP_LAYOUT_UNSUPPORTED'
    assert report['exposure']==record['exposure']
    assert report['member_count'] is report['sheet_count'] is report['recognized_roles'] is None
    assert report['source_identity_verified'] is True and report['synthetic_fixture'] is False
    assert report['capture_receipt_sha256']=='13f6f1b0354d15a214169cdd52e58d5349a30b6c2f481f793f9d3af12fb28009'
    assert report['flag_producer_commit']=='f7c6ccd04b535f8830f07905b51a5dc2c8a6ca4f'
    assert report['flag_receipt_sha256']=='74404679ec62a18ef50d1847f652ba749c85eb8f63d08740d2fa0a5fb956c47b'
    assert report['observed']=={'bytes':183878,'md5':'041bbe095c54615e5a3c289facb18ce5','sha256':'9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa'}
    exposure=report['exposure']
    for key in ['raw_buffer_read_started','raw_buffer_read_completed','raw_workbook_buffer_read','target_bearing_source_bytes_acquired','target_bearing_source_bytes_read']:
        assert exposure[key] is True
    for key in ['decompression_started','decompression_completed','xml_decoding_started','xml_decoding_completed']:
        assert exposure[key]==[]
    assert exposure['inspected_xml_bytes']==exposure['fits']==exposure['splits']==0
    for key in ['formulas_executed','sampling_independence_established','scientific_eligibility_decisions','shared_strings_decoded','target_numeric_validity_checked','worksheet_cells_decoded']:
        assert exposure[key] is False
    for key in ['row_count','paired_count','overlap_count','source_group_count']:
        assert report[key] is None
    assert report['implementation']['commit']==COMMIT
    actual.append((record,payload,report))
assert actual[0][1]==actual[1][1]
assert sha(actual[0][1])=='7010e99afcafbf29d32d5ff7d3f356474c2a670571285d884b80441e91ce3d07'
assert moment(actual[0][0]['finished_at'])<moment(actual[1][0]['started_at'])
held=actual[0][0]['runtime_before']
assert all(record['runtime_before']==held for record in packages+[x[0] for x in actual])
for relative,digest in held.items():
    assert sha(raw(relative))==digest
    assert sha(subprocess.check_output(['git','show',COMMIT+':discovery/'+relative],cwd=ROOT))==digest
pins={}
for key in ['files','header_files','legacy_files','prior_files']:
    pins.update(actual[0][2]['implementation'][key])
assert len(pins)==17
for relative,digest in pins.items():
    assert sha(raw(relative))==digest
    assert sha(subprocess.check_output(['git','show',COMMIT+':discovery/'+relative],cwd=ROOT))==digest

# Read-only structural confirmation. Do not import candidate modules, inspect
# the source object, or execute a parser on either actual or fixture data.
compatible=raw('scripts/li_v3_compatible_envelope.py').decode()
custody=raw('scripts/li_v3_custody.py').decode()
assert sha(compatible.encode())=='e771b3fc2a66d6e2ff3a26d8aae88b7a2915ac908907908316e697997761c847'
assert sha(custody.encode())=='3ead51f0afdf16be973743257be488669c988aa40443779e7a5c400e9b0d3234'
tree=ast.parse(compatible)
functions={n.name:n for n in tree.body if isinstance(n,ast.FunctionDef)}
zip_function=ast.unparse(functions['_compatible_zip_structure'])
assert 'archive.open' not in zip_function and 'archive.read' not in zip_function and '_xml(' not in zip_function
inspection=ast.unparse(functions['_inspect_envelope'])
assert inspection.index('_compatible_zip_structure(raw)')<inspection.index("report['member_count'] = len(names)")<inspection.index('custody._xml(')
assert inspection.count("report['member_count']") == 1
assert "report = custody._base(raw, synthetic, implementation)" in inspection
assert inspection.count('report =')==1
assert 'report[\'reason\'] = str(error)' in inspection
xml_function=next(n for n in ast.parse(custody).body if isinstance(n,ast.FunctionDef) and n.name=='_xml')
xml=ast.unparse(xml_function)
assert xml.index("exposure['decompression_started'].append(member)")<xml.index('archive.open(member)')
assert xml.index("exposure['xml_decoding_started'].append(member)")<xml.index("raw.decode('utf-8', errors='strict')")
assert "exposure['decompression_started'] =" not in xml
assert "exposure['xml_decoding_started'] =" not in xml

report={'schema':'lupine.discovery.compatible_actual_independent_audit.v1',
 'status':'PASS_PUBLIC_RECEIPT_CHRONOLOGY_AND_FAILURE_PATH_AUDIT','blockers':[],
 'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),
 'commit':COMMIT,'ci_run':RUN,'ci_attempt':1,
 'ci_scope':'Retained API observation of four successful original push jobs; not a new network observation or remote test-log audit.',
 'package_scope':{'producer_exit_code':0,'verifier_exit_code':0,'cases':28,'schemas':6,'required_checks':16,'retained_logs_match_receipt_hashes':True,'fresh_wheel_or_source_archive_byte_audit':False},
 'chronology':{'package_verified_at':packages[-1]['finished_at'],'ci_observed_at':ci['observed_at'],'first_actual_started_at':actual[0][0]['started_at'],'last_actual_finished_at':actual[-1][0]['finished_at'],'all_prerequisite_completions_before_both_actual_commands':True},
 'actual_result':{'two_commands':2,'expected_exit_code':2,'status':'BLOCKED_SCHEMA','engineering_status':'BLOCKED_LAYOUT','reason':'ZIP_LAYOUT_UNSUPPORTED','identical_stdout_and_public_receipts':True,'public_sha256':sha(actual[0][1]),'held_runtime_files':317,'all_runtime_maps_equal_to_current_and_4492858_git':True,'source_contract_pins_checked':17},
 'failure_path_findings':[
  'The original target-bearing archive buffer was read completely and hash-checked. This is not zero machine exposure or a new acquisition.',
  'member_count is null. In the bound source it is assigned immediately after complete ZIP structure admission and before the first _xml call, and never reset. Thus this result rejected during ZIP structure admission.',
  'The ZIP admission path constructs/reads the directory and raw local-header slices but never opens a member payload or invokes XML decoding. The public reason alone does not name which remaining structural predicate failed.',
  'Each XML helper appends its decompression-start marker before archive.open and XML-start marker before decoding, on the same report; these lists are not reset after failures. Null member_count plus this control flow corroborates all empty start/completion arrays and zero XML-byte count for this path.',
  'ZIP metadata can decode member names internally; the current envelope schema does not carry per-directory-stage flags. Do not infer no metadata decoding from empty XML/decompression arrays.',
  'DEFLATE_OPTION_FLAGS_ONLY was the earlier first rejected entry classification. Permitting those option bits did not establish all other predicates on that entry or later entries. The new block does not identify archive corruption, a particular remaining feature or a worksheet location.',
  'Both runs are computational replays of identical bytes and policy, not independent scientific samples. Schema, pairing, provenance, counts, independence and all prior scientific NO_GO conclusions remain unresolved.'
 ],
 'not_performed':['actual object or private capture access','new source operation or recapture','module import or execution','new tests','network or fresh CI verification','retained wheel/archive re-audit','tracked edits','scientific evaluation'],
 'bindings':bindings}
(OUT/'review.json').write_text(json.dumps(report,indent=2,sort_keys=True)+'\n')
print(json.dumps({'status':report['status'],'commit':COMMIT,'runtime_files':317,'public_sha256':sha(actual[0][1]),'review_sha256':sha((OUT/'review.json').read_bytes())},sort_keys=True))
