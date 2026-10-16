"""Synthetic recorder validation/flow challenge. No source reader is imported or run."""
import argparse
import ast
import contextlib
import copy
import datetime
import hashlib
import io
import json
import os
from pathlib import Path
import signal
import sys
import tempfile
import time
from types import SimpleNamespace

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
CURRENT=ROOT/'.cache/phase2-local-extra-operations-v1/run_after_ci.py'
ORIGINAL=ROOT/'.cache/phase2-local-extra-operations-v1/recorder-before-exception-stop.py'
EXPECTED='06e1a086dad664f51bb2b96533d8317889b909aa8a9fe349a7742c129f585adf'
OLD_EXPECTED='860ba8b9b26045a30144a505e1a229a577680a0dabf279437024c6002a672d34'
PRED={'reason':'LOCAL_EXTRA_PRESENT','categories':['LOCAL_EXTRA_PRESENT'],'primary_categories':['LOCAL_EXTRA_PRESENT'],'supplementary_local_categories':[],'compatible_reason':'ZIP_LAYOUT_UNSUPPORTED','first_rejection_stage':'entry_local','same_entry_local_checks':'CHECKED'}
REASONS={'PREDECESSOR_PATH_MISMATCH','PREDECESSOR_CLEANUP_FAILED','LOCAL_EXTRA_LOCATOR_MISMATCH','EXTRA_HEADER_TRUNCATED','EXTRA_DATA_TRUNCATED','EXTRA_RECORD_LIMIT','LOCAL_EXTRA_PARSE_FAILED','LOCAL_EXTRA_PREREQUISITE_INVALID'}

def canonical(value):
 return (json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)+'\n').encode('ascii')

def digest(raw):return hashlib.sha256(raw).hexdigest()

def fixture(reason):
 # Entirely invented source identity, never the real workbook identity.
 identity={'mode':'committed_source','commit':'a'*40,'files':{'synthetic-only.py':'b'*64}}
 exposure={k:False for k in ['raw_buffer_read_started','raw_buffer_read_completed','target_bearing_source_bytes_read','header_checks_started','header_checks_completed','directory_name_decoding_started','directory_name_decoding_completed','member_names_published','xml_decoded','worksheet_cells_decoded','shared_strings_decoded','target_numeric_validity_checked','scientific_eligibility_decisions','sampling_independence_established','archive_close_started','archive_close_completed','local_header_locator_started','local_header_locator_completed','local_extra_header_walk_started','local_extra_header_walk_completed','local_extra_payload_interpreted']}
 for key in ['raw_buffer_read_started','raw_buffer_read_completed','target_bearing_source_bytes_read','header_checks_started','directory_name_decoding_started','directory_name_decoding_completed','archive_close_started','archive_close_completed','local_header_locator_started','local_header_locator_completed','local_extra_header_walk_started']:
  exposure[key]=True
 exposure.update(members_decompressed=[],archive_close_error=None,fits=0,splits=0)
 exposure['local_extra_header_walk_completed']=reason=='LOCAL_EXTRA_HEADERS_COMPLETE'
 return {'schema':'synthetic.local-extra-recorder.v1','profile':'synthetic-only','status':'BLOCKED_SCHEMA','reason':reason,'synthetic_fixture':False,'source_identity_verified':True,'implementation':identity,'capture_identity':{'synthetic-only':True},'observed':{'sha256':'c'*64,'bytes':99,'md5':'d'*32},'exposure':exposure,'row_count':None,'paired_count':None,'source_group_count':None,'overlap_count':None,'overlap_status':'NOT_ASSESSED','prerequisite_receipt_sha256':'4ee25afe053f68b4b9331a9ebc94bccb2e1d96e0ce5700d78a45866ef7b0cc12','prerequisite_producer_commit':'e'*40,'predecessor_classification':copy.deepcopy(PRED),'field_headers':[{'header_id':0,'data_size':0}] if reason=='LOCAL_EXTRA_HEADERS_COMPLETE' else None}

def trial(raw, report):
 # Execute only selected recorder definitions. Its imports and top-level values
 # are not executed; all filesystem/context/transport dependencies are injected.
 names={'Stop','require','now','digest','validate_report','run_command','Parser','main'}
 tree=ast.parse(raw.decode())
 selected=[node for node in tree.body if isinstance(node,(ast.FunctionDef,ast.ClassDef)) and node.name in names]
 assert {node.name for node in selected}==names
 with tempfile.TemporaryDirectory(prefix='synthetic-recorder-',dir=HERE) as temporary:
  root=Path(temporary)
  runtime={f'synthetic-only-{i}.py':'0'*64 for i in range(326)}
  identity=copy.deepcopy(report['implementation'])
  identity['commit']='a'*40
  calls=[]; stores={}
  class FakeProcess:
   def wait(self,timeout=None):return 2
   def poll(self):return 2
   def kill(self):raise AssertionError('unexpected synthetic kill')
  def popen(command,**kwargs):
   assert command[1:4]==['scripts/li_v3_local_extra_headers.py','diagnose','--run']
   run=command[4]
   calls.append(run)
   kwargs['stdout'].write(canonical(report))
   return FakeProcess()
  diagnostic=SimpleNamespace(SCHEMA='synthetic.local-extra-recorder.v1',PROFILE='synthetic-only',EXPECTED_CLASSIFICATION=PRED,ERRORS=REASONS,MAX_FIELDS=256,MAX_EXTRA_BYTES=65535,PREREQUISITE='.cache/synthetic-prerequisite/public.json',PREREQUISITE_SHA256=report['prerequisite_receipt_sha256'],PREREQUISITE_PRODUCER='e'*40,_base=lambda _:fixture('LOCAL_EXTRA_HEADERS_COMPLETE'),_validate_prerequisite=lambda _:report['prerequisite_receipt_sha256'],custody=SimpleNamespace(canonical=canonical,SOURCE_BYTES=99,SOURCE_MD5='d'*32),header_diagnostic=SimpleNamespace(OBJECT_SHA256='c'*64),compatible=SimpleNamespace(_capture_identity=lambda:{'synthetic-only':True}))
  runtime_module=SimpleNamespace(source_files=lambda _:copy.deepcopy(runtime))
  def import_module(name):
   if name=='runtime_manifest':return runtime_module
   if name=='li_v3_local_extra_headers':return diagnostic
   raise AssertionError('unapproved synthetic import request')
  ci={'commit':'a'*40,'all_four_jobs_successful':True,'run':{'id':1,'head_sha':'a'*40,'event':'push','run_attempt':1,'status':'completed','conclusion':'success'},'jobs':[{'name':name,'status':'completed','conclusion':'success'} for name in ['lean','browser','python (3.11)','python (3.12)']]}
  package={'commit':'a'*40,'exit_code':0,'source_unchanged':True,'head_unchanged':True,'worktree_clean':True,'runtime_before':runtime,'runtime_after':runtime}
  inputs={root/'.cache/audit.json':canonical({'status':'PASS','commit':'a'*40}),root/'.cache/phase2-local-extra-ci-v1/final.json':canonical(ci),root/diagnostic.PREREQUISITE:b'synthetic prerequisite bytes',Path('synthetic-recorder.py'):raw}
  for index in (0,1):inputs[root/f'.cache/phase2-local-extra-clean-package-v1/{index}-execution.json']=canonical(package)
  for run in (1,2):inputs[root/f'.cache/li-v3-custody/local-extra-headers-v1/{run}/public.json']=canonical(report)
  def read(path):
   path=Path(path)
   if path in inputs:return inputs[path]
   assert path.is_relative_to(root), 'synthetic read attempted outside its isolated directory'
   return path.read_bytes()
  def store(path,value):
   assert Path(path).is_relative_to(root)
   assert str(path) not in stores
   stores[str(path)]=copy.deepcopy(value)
  def state(runtime_manifest,diag,expected=None):
   assert runtime_manifest is runtime_module and diag is diagnostic
   assert expected is None or expected==runtime
   return copy.deepcopy(runtime),copy.deepcopy(identity)
  namespace={'__file__':'synthetic-recorder.py','__name__':'synthetic_recorder_challenge','argparse':argparse,'datetime':datetime,'hashlib':hashlib,'json':json,'os':os,'signal':signal,'subprocess':SimpleNamespace(Popen=popen,TimeoutExpired=TimeoutError),'sys':sys,'time':time,'Path':Path,'ROOT':root,'COMMIT':'a'*40,'BRANCH':'synthetic-only','BASE':root/'production','CAP':8*1024*1024,'COMMAND_TIMEOUT':100,'read':read,'store':store,'state':state,'importlib':SimpleNamespace(import_module=import_module)}
  exec(compile(ast.Module(body=selected,type_ignores=[]),'<synthetic-reviewed-recorder>','exec'),namespace)
  output=io.StringIO()
  old_path=list(sys.path);old_dont_write=sys.dont_write_bytecode
  try:
   with contextlib.redirect_stdout(output):code=namespace['main'](['--artifact-review','.cache/audit.json'])
  finally:
   sys.path[:]=old_path;sys.dont_write_bytecode=old_dont_write
  execution=[value for path,value in stores.items() if path.endswith('/execution.json')]
  final=[value for path,value in stores.items() if path.endswith('/final.json') or path.endswith('/stopped.json')]
  assert len(final)==1
  return {'returncode':code,'synthetic_subprocess_calls':calls,'final_status':final[0]['status'],'recorded_slots':len(execution),'validation_errors':[r['public_validation_error'] for r in execution],'source_operations_executed':0}

current=CURRENT.read_bytes();original=ORIGINAL.read_bytes()
assert digest(current)==EXPECTED and digest(original)==OLD_EXPECTED
cases=[]
def run_case(name,report,accepted):
 result=trial(current,report)
 assert result['returncode']==(0 if accepted else 2), (name,result)
 assert result['synthetic_subprocess_calls']==(['1','2'] if accepted else ['1']), (name,result)
 assert result['final_status']==('COMPLETE_TWO_IDENTICAL_DIAGNOSES' if accepted else 'STOP_PRESERVE_EVIDENCE'),(name,result)
 cases.append({'name':name,'expected':'two synthetic slots' if accepted else 'stop after one synthetic slot','result':result})
for reason in ['LOCAL_EXTRA_HEADERS_COMPLETE','EXTRA_HEADER_TRUNCATED','EXTRA_DATA_TRUNCATED','EXTRA_RECORD_LIMIT']:
 run_case(reason,fixture(reason),True)
for reason in ['LOCAL_EXTRA_PARSE_FAILED','LOCAL_EXTRA_LOCATOR_MISMATCH','PREDECESSOR_PATH_MISMATCH','PREDECESSOR_CLEANUP_FAILED']:
 run_case(reason,fixture(reason),False)
for name,key,value in [('boolean ID','header_id',True),('boolean size','data_size',False),('negative ID','header_id',-1),('oversized size','data_size',65536)]:
 report=fixture('LOCAL_EXTRA_HEADERS_COMPLETE');report['field_headers'][0][key]=value
 run_case(name,report,False)
report=fixture('EXTRA_HEADER_TRUNCATED');report['field_headers']=[{'header_id':0,'data_size':0}]
run_case('partial list on structural failure',report,False)
report=fixture('LOCAL_EXTRA_HEADERS_COMPLETE');report['field_headers']=[]
run_case('empty complete list',report,False)
report=fixture('LOCAL_EXTRA_HEADERS_COMPLETE');report['field_headers']=[{'header_id':0,'data_size':0}]*257
run_case('too many fields',report,False)
report=fixture('LOCAL_EXTRA_HEADERS_COMPLETE');report['field_headers'][0]['data_size']=65535
run_case('declared area exceeds uint16 span',report,False)
report=fixture('LOCAL_EXTRA_HEADERS_COMPLETE');report['field_headers'][0]['payload']='synthetic-canary'
run_case('extra disclosed field key',report,False)
report=fixture('LOCAL_EXTRA_HEADERS_COMPLETE');report['exposure']['local_extra_header_walk_completed']=False
run_case('incomplete success exposure',report,False)
report=fixture('EXTRA_DATA_TRUNCATED');report['exposure']['local_header_locator_completed']=False
run_case('walk without completed locator',report,False)
report=fixture('LOCAL_EXTRA_HEADERS_COMPLETE');report['status']='BLOCKED_GUARD'
run_case('guard failure',report,False)
report=fixture('LOCAL_EXTRA_HEADERS_COMPLETE');report['predecessor_classification']['reason']='LOCAL_SIGNATURE'
run_case('different predecessor',report,False)
# Mutation sensitivity: the preserved original actually permits the unexpected
# broad exception code to reach a second fake slot. This is an expected control.
control=trial(original,fixture('LOCAL_EXTRA_PARSE_FAILED'))
assert control['returncode']==0 and control['synthetic_subprocess_calls']==['1','2']
result={'status':'PASS','synthetic_cases':len(cases),'cases':cases,'original_recorder_negative_control':{'expected_bad_flow_detected':True,'result':control},'current_recorder_sha256':digest(current),'original_recorder_sha256':digest(original),'project_modules_imported':False,'actual_subprocesses_started':0,'private_objects_read':False,'scope':'Extracted recorder validator/run_command/main definitions with invented source IDs and injected gate/context/transport functions; no product reader imported or executed, no actual CI/package/source claims.'}
with (HERE/'synthetic-flow-results.json').open('x') as out:json.dump(result,out,indent=2,sort_keys=True);out.write('\n')
print(json.dumps({'status':result['status'],'synthetic_cases':len(cases),'original_bad_flow_detected':True,'actual_subprocesses_started':0,'project_modules_imported':False},sort_keys=True))
