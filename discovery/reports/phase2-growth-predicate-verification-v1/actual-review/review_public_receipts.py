"""Public metadata reconciliation only; never imports or executes producer code."""
from pathlib import Path
import ast,datetime,hashlib,json,time
ROOT=Path.cwd();HERE=ROOT/'.cache/phase2-growth-predicate-actual-review-v1';OPS=Path('.cache/phase2-growth-predicate-operations-v1');COMMIT='a064a2c0e4a7cce1fbcb0541f49aae132944e785'
BIND='f658a3ee3d9a7e676a8f21cd73fab1f4a892f729d05a0ec9d35ecb7df5bc2898';PUBLIC='68c9042325e93cebd08f9dd056ccbf8833b16f4f045f25bbe2e8be69623326be';PRIOR='01cce9e57b26e204a9d31959f747768c70abf7543bedb6ab104b3b4b623f094f'
source_bindings={};checks=[]
def sha(raw):return hashlib.sha256(raw).hexdigest()
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def pairs(items):
 d={}
 for k,v in items:
  if k in d:raise ValueError('DUPLICATE_PUBLIC_KEY')
  d[k]=v
 return d
def read(path):
 p=Path(path);assert not p.is_absolute() and '..' not in p.parts and p.name!='private.json'
 # Fixed public names only within the scientific custody tree; no capture/object reads.
 if 'li-v3-custody' in p.parts:assert str(p) in [f'.cache/li-v3-custody/growth-predicate-audit-v1/{i}/public.json' for i in (1,2)]+['.cache/li-v3-custody/growth-envelope-v1/1/public.json']
 assert 'projection-custody' not in p.parts and p.suffix in ('.json','.py','.md','.txt')
 raw=(ROOT/p).read_bytes();assert len(raw)<=2*1024*1024
 source_bindings[str(p)]={'bytes':len(raw),'sha256':sha(raw)};return raw
def load(path):return json.loads(read(path),object_pairs_hook=pairs,parse_constant=lambda _:(_ for _ in ()).throw(ValueError('NONFINITE_PUBLIC_TOKEN')))
def check(value,code):
 if not value:raise AssertionError(code)
 checks.append(code)
def canonical(v):return (json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)+'\n').encode('ascii')
def dt(s):return datetime.datetime.fromisoformat(s.replace('Z','+00:00'))
def put(name,obj):
 p=HERE/name
 with p.open('x') as f:json.dump(obj,f,indent=2,sort_keys=True);f.write('\n')
def main():
 plan=load(HERE.relative_to(ROOT)/'checklist.json')
 check(sha(read(HERE.relative_to(ROOT)/'checklist.json'))=='5e5b1272527e7b36a48d88ab7f04c3c7ad1b647576eb519a59ff45ef4abeb5d9','FROZEN_PROSPECTIVE_CHECKLIST')
 for m in plan['source_bindings']:check(sha(read(m['path']))==m['sha256'],'HELD_SOURCE:'+m['path'])
 binding=load(OPS/'bindings.json');check(sha(read(OPS/'bindings.json'))==BIND,'FINAL_BINDING_HASH')
 check(binding['commit']==COMMIT and binding['branch']=='research/lupine-discovery' and binding['runtime_count']==335,'FINAL_BINDING_IDENTITY')
 check(binding['recorder_sha256']==sha(read(OPS/'run_after_ci.py')),'RECORDER_PIN')
 for path,h in binding['source_files'].items():check(sha(read(path))==h,'OWN_PIN:'+path)
 runtime=load('reports/runtime-manifest.json');check(sha(read('reports/runtime-manifest.json'))==binding['runtime_manifest_sha256'] and len(runtime['files'])==335,'CURRENT_MANIFEST_PIN')
 gates={}
 expected_paths={'ci':'.cache/phase2-growth-predicate-ci-v1/final.json','package':'.cache/phase2-growth-predicate-clean-package-v1/0-execution.json','strict':'.cache/phase2-growth-predicate-clean-package-v1/1-execution.json','artifact_review':'.cache/phase2-growth-predicate-artifact-review-v1/actual-a064a2c0e4a7/review.json','additive_review':'.cache/phase2-growth-predicate-artifact-review-v1/additive-correction-1-a064a2c0e4a7/additive-review.json'}
 check(set(binding['gates'])==set(expected_paths),'EXACT_FIVE_GATES')
 for name,path in expected_paths.items():
  row=binding['gates'][name];check(row['path']==path and sha(read(path))==row['sha256'],'GATE_PIN:'+name);gates[name]=load(path)
 ci=gates['ci'];run=ci['run'];check(ci['commit']==run['head_sha']==COMMIT and run['id']==38901590399 and run['event']=='push' and type(run['run_attempt'])is int and run['run_attempt']==1 and run['status']=='completed' and run['conclusion']=='success' and ci['all_four_jobs_successful']is True,'CI_ORIGINAL_EXACT_SUCCESS')
 check(len(ci['jobs'])==4 and {x['name']for x in ci['jobs']}=={'lean','browser','python (3.11)','python (3.12)'} and all(x['status']=='completed' and x['conclusion']=='success' for x in ci['jobs']),'CI_FOUR_JOBS')
 for name,script in [('package','scripts/package_smoke.py'),('strict','scripts/verify_retained_artifacts.py')]:
  v=gates[name];check(v['commit']==COMMIT and type(v['exit_code'])is int and v['exit_code']==0 and v['timed_out']is False and all(v[k]is True for k in ('source_unchanged','head_unchanged','worktree_clean')) and v['runtime_before']==v['runtime_after']==runtime['files'] and v['command'][1]==script,'RECORDED_PACKAGE_HOLD:'+name)
 artifact=gates['artifact_review'];additive=gates['additive_review'];check(artifact['commit']==additive['commit']==COMMIT and artifact['status']==additive['status']=='PASS','ARTIFACT_EXACT_PRODUCER')
 check(artifact['runtime_source_files_matching_manifest_and_worktree']==335 and artifact['artifact_and_recorded_run_inputs_unchanged_at_end']is True and artifact['producer_verifier_receipt_and_two_fixed_pins_agree']is True,'GENERIC_ARTIFACT_HOLDS')
 check(additive['unchanged_prior_runtime_files']==332 and additive['added_runtime_files']=={p:h for p,h in binding['source_files'].items() if not p.startswith('docs/')} and additive['new_source_test_contracts_exact_in_git_archive_worktree']==binding['source_files'] and additive['source_pins_match_final_reviewed_pin_record']is True and additive['unchanged_full_artifact_auditor_review_sha256']==binding['gates']['artifact_review']['sha256'],'CORRECTED_ADDITIVE_HOLDS')
 recorded=artifact['recorded_package_and_strict_verifier_runs'];check(len(recorded)==2 and {x['sha256']for x in recorded}=={binding['gates'][k]['sha256']for k in ('package','strict')} and all(x['exit_code']==0 and x['checked_log_hashes']is True and x['runtime_count']==335 for x in recorded),'ARTIFACT_PACKAGE_RECEIPT_JOIN')
 prior=load('.cache/li-v3-custody/growth-envelope-v1/1/public.json');check(sha(read('.cache/li-v3-custody/growth-envelope-v1/1/public.json'))==PRIOR,'EXACT_PRIOR_PUBLIC')
 check(prior['implementation']['commit']=='c17c4c6b152af2e7bc1b7a7639336f6b0f733ace' and prior['reason']=='ZIP_LAYOUT_UNSUPPORTED','PRIOR_PRODUCER_DISTINCT')
 pre=load(OPS/'production/preflight.json');check(pre['bindings']==binding and pre['bindings_sha256']==BIND and pre['runtime']==runtime['files'] and pre['commit']==COMMIT and pre['ci_run']==run['id'] and pre['prerequisite_sha256']==PRIOR,'PREFLIGHT_BINDINGS')
 additive_execution_path='.cache/phase2-growth-predicate-artifact-review-v1/execution-additive-correction-1-a064a2c0e4a7/0-execution.json'
 additive_execution=load(additive_execution_path)
 check(sha(read(additive_execution_path))=='4bbec735b6d63a633b511c539ca542e80b16c3ae7070330c3d3482b688dc2a0a' and additive_execution['commit']==COMMIT and additive_execution['exit_code']==additive_execution['child_exit_code']==0 and additive_execution['child_invoked']is True and additive_execution['timed_out']is False and additive_execution['launch_error']is None and additive_execution['stdout_sha256']==binding['gates']['additive_review']['sha256'],'ADDITIVE_EXECUTION_COMPLETION_BINDING')
 gate_times={k:gates[k]['finished_at'] for k in ('package','strict','artifact_review')};gate_times['additive_review']=additive_execution['finished_at'];gate_times['ci_observed']=ci['observed_at']
 check(all(dt(t)<dt(pre['checked_at']) for t in gate_times.values()) and all(dt(j['completed_at'])<=dt(ci['observed_at'])for j in ci['jobs']),'ALL_GATE_COMPLETIONS_PRECEDE_PREFLIGHT')
 source_ast=ast.parse(read('scripts/li_v3_growth_predicate_audit.py'));functions={x.name:x for x in source_ast.body if isinstance(x,ast.FunctionDef)}
 exposure_template=ast.literal_eval(next(x.value for x in functions['_new_exposure'].body if isinstance(x,ast.Return)))
 report_node=next(x.value for x in functions['_production_report'].body if isinstance(x,ast.Assign) and any(isinstance(t,ast.Name)and t.id=='report' for t in x.targets))
 report_keys={ast.literal_eval(k)for k in report_node.keys};operation_template=ast.literal_eval(next(v for k,v in zip(report_node.keys,report_node.values) if ast.literal_eval(k)=='operation_exposure'))
 schema=plan['closed_schema'];families=set(schema['families']);outputs=[];summaries=[];last=pre['checked_at']
 for number in (1,2):
  folder=OPS/f'production/{number}';start=load(folder/'start.json');ex=load(folder/'execution.json');raw=read(f'.cache/li-v3-custody/growth-predicate-audit-v1/{number}/public.json');v=json.loads(raw,object_pairs_hook=pairs)
  check(len(raw)<=65536 and raw==canonical(v) and sha(raw)==PUBLIC and raw==read(folder/'stdout.txt')==read(folder/'persisted-public.json'),'CANONICAL_EXACT_PUBLIC:'+str(number));check(read(folder/'stderr.txt')==b'' and ex['stderr_sha256']==sha(b'') and ex['stdout_sha256']==ex['persisted_public_sha256']==PUBLIC,'LOG_HASHES:'+str(number))
  check(set(v)==report_keys,'CLOSED_REPORT:'+str(number))
  check(start['command']==ex['command'] and ex['command'][1:]==['-B','scripts/li_v3_growth_predicate_audit.py','audit','--run',str(number)] and start['bindings_sha256']==BIND and start['commit']==ex['commit']==COMMIT and start['ci_run']==ex['ci_run']==run['id'],'COMMAND_PRODUCER:'+str(number))
  check(start['runtime_before']==ex['runtime_before']==ex['runtime_after']==pre['runtime'] and start['implementation']==v['implementation']==pre['implementation'],'RECORDED_335_SOURCE_HOLD:'+str(number))
  check(type(ex['exit_code'])is int and ex['exit_code']==2 and ex['timed_out']is False and ex['launch_failed']is False and all(ex[k]is True for k in ('source_unchanged','head_branch_remote_source_guard_held','public_report_canonical_and_closed','returned_equals_persisted')) and all(ex[k]is None for k in ('state_recheck_error','public_validation_error','persisted_public_error','unvalidated_exposure_interpretation')),'EXECUTION_COMPLETE_NO_ERROR:'+str(number))
  check(dt(last)<dt(start['started_at']) and start['started_at']==ex['started_at'] and dt(ex['started_at'])<dt(ex['finished_at']),'ORDERED_EXECUTION:'+str(number));last=ex['finished_at']
  check(v['schema']==schema['schema'] and v['parser_profile']==schema['profile'] and v['action']=='audit' and v['scope']=='G29_G30_AND_G31_HEADERS' and v['status']=='BLOCKED_SCHEMA' and v['synthetic_fixture']is False and v['source_identity_verified']is True,'IDENTITY_AND_SCIENTIFIC_BLOCK:'+str(number))
  ident=v['implementation'];prior_ident=prior['implementation'];expected_ident={('growth_envelope_files' if k=='files' else k):value for k,value in prior_ident.items()};expected_ident.update(commit=COMMIT,files=binding['source_files']);check(ident==expected_ident,'EXACT_SOURCE_CHAIN:'+str(number))
  check(v['observed']==prior['observed'] and v['capture_receipt_sha256']==prior['capture_receipt_sha256'] and v['prerequisite_receipt_sha256']==PRIOR and v['prerequisite_producer_commit']==prior_ident['commit'],'OBSERVED_CAPTURE_PRIOR_IDENTITIES:'+str(number))
  check(v['archive_accepted']is False and v['scientific_counts']is None and v['initial_padding_semantics']=='UNBOUND' and all(type(v[k])is int and v[k]==0 for k in ('fits','splits')),'NO_SCIENTIFIC_ADMISSION:'+str(number))
  primary=v['first_rejection'];check(set(primary)==set(schema['first_rejection_keys']) and primary['category'] in families and primary['stage']in schema['first_stage_mapping'] and primary['category']in schema['group_to_families'][schema['first_stage_mapping'][primary['stage']]] and primary['g31_reason']=='ZIP_LAYOUT_UNSUPPORTED','CLOSED_ORDERED_FIRST_REJECTION:'+str(number))
  check(v['predecessor_reproduction_checked']is True and v['predecessor_reproduction_matched']is True and v['selected_growth']==prior['selected_growth_check'] and v['selected_growth_exposure']==prior['exposure']['selected_growth'],'PRIOR_REPLAY_PROJECTION:'+str(number))
  for key in ('exposure','aggregate_exposure'):
   e=v[key];check(set(e)==set(exposure_template),'EXPOSURE_SHAPE:'+str(number)+key)
   for name,default in exposure_template.items():
    check(type(e[name])is type(default) and (0<=e[name]<=128 if type(default)is int else True),'EXPOSURE_TYPE:'+str(number)+key+name)
   check(e['whole_buffer_supplied']is True and e['archive_close_error']is None and all(type(e[k])is int and e[k]==0 for k in ('member_opens','decompressed_bytes','xml_parses','worksheet_decodes','shared_string_decodes','formula_evaluations')),'ZERO_PAYLOAD_EXPOSURE:'+str(number)+key)
  e=v['exposure'];check(all(e[k]is True for k in ('central_directory_preflight_started','central_directory_preflight_completed','archive_open_started','archive_open_completed','directory_name_decoding_started','directory_name_decoding_completed','header_checks_started','archive_close_started','archive_close_completed')) and e['header_checks_completed']is False and e['local_growth_payload_interpretation_completed']is False,'PRIMARY_LIFECYCLE:'+str(number))
  check(all(type(e[k])is int and e[k]==3 for k in ('local_extra_areas_completed','local_growth_fixed_words_interpreted','local_growth_padding_scans_started','local_growth_padding_scans_completed')),'PRIMARY_THREE_AREAS_NOT_MEMBER_TOTAL:'+str(number))
  op=v['operation_exposure'];check(set(op)==set(operation_template) and op['output_directory_close_error']is None and all(op[k]is True for k in op if k!='output_directory_close_error'),'WHOLE_BUFFER_AND_OUTPUT_ATTEMPTS:'+str(number))
  check(set(v['families'])==families,'CLOSED_FAMILY_SET:'+str(number));failure=[];partials=[]
  for name,row in v['families'].items():
   check(set(row)==set(schema['family_keys']) and type(row['checked'])is bool and type(row['partial'])is bool and type(row['dependencies'])is list,'FAMILY_SHAPE:'+str(number)+name)
   status=row['status'];deps=row['dependencies'];checked=row['checked'];partial=row['partial'];check(status in schema['status_values'],'FAMILY_STATUS:'+str(number)+name)
   if partial:
    check(bool(deps) and deps==sorted(set(deps)) and set(deps)<=set(schema['dependencies']) and status in ('FAILURES_AND_INCOMPLETE','INCOMPLETE_NO_FAILURE_OBSERVED'),'PARTIAL_DEPENDENCY:'+str(number)+name);partials.append(name)
   else:check(deps==['CHECKED' if checked else 'NOT_APPLICABLE'] and status in (('ALL_APPLICABLE_CHECKS_PASS','FAILURES_OBSERVED')if checked else ('NOT_APPLICABLE',)),'COMPLETE_DEPENDENCY:'+str(number)+name)
   if status.startswith('FAILURES'):check(checked,'FAILURE_REQUIRES_CHECK:'+str(number)+name);failure.append(name)
  expected='FAILURES_AND_INCOMPLETE' if failure and partials else 'FAILURES_OBSERVED' if failure else 'INCOMPLETE_NO_FAILURE_OBSERVED' if partials else 'ALL_APPLICABLE_CHECKS_PASS'
  complete=not partials and e['archive_close_completed'] and e['archive_close_error']is None
  check(v['aggregate_status']==expected and type(v['diagnostic_complete'])is bool and v['diagnostic_complete']==complete and v['engineering_status']==('DIAGNOSTIC_COMPLETE'if complete else'DIAGNOSTIC_INCOMPLETE') and v['reason']==('HEADER_PREDICATE_AUDIT_COMPLETE'if complete else'HEADER_PREDICATE_AUDIT_INCOMPLETE'),'CATEGORICAL_COMPLETENESS_ONLY:'+str(number))
  check(all(ex[k]==v[k]for k in ('reason','first_rejection','diagnostic_complete','exposure','aggregate_exposure','operation_exposure')) and ex['scientific_schema_approved']is False,'RECEIPT_PUBLIC_JOIN:'+str(number))
  outputs.append(raw);summaries.append({'run':number,'started_at':ex['started_at'],'finished_at':ex['finished_at'],'elapsed_seconds':ex['elapsed_seconds'],'exit_code':ex['exit_code'],'first_rejection':primary,'aggregate_status':v['aggregate_status'],'diagnostic_complete':complete,'failure_families':failure,'partial_families':partials,'passing_families':sorted(name for name,row in v['families'].items()if row['status']=='ALL_APPLICABLE_CHECKS_PASS'),'primary_completed_local_areas':e['local_extra_areas_completed'],'aggregate_fixed_local_headers_interpreted':v['aggregate_exposure']['aggregate_fixed_local_headers_interpreted'],'aggregate_completed_local_areas':v['aggregate_exposure']['local_extra_areas_completed']})
 final=load(OPS/'production/final.json');check(outputs[0]==outputs[1] and final['status']=='COMPLETE_TWO_IDENTICAL_BOUNDED_DIAGNOSES' and final['commit']==COMMIT and final['public_sha256']==PUBLIC and final['no_automatic_retry']is True and final['scientific_schema_approved']is False and final['archive_accepted']is False and dt(last)<dt(final['finished_at']),'TWO_RUN_FINAL_IDENTITY')
 check(all(final[k]==v[k]for k in ('reason','first_rejection','diagnostic_complete','aggregate_status')),'FINAL_PUBLIC_JOIN')
 # Recheck only the explicit public/code inputs already read, never recurse source/cache.
 for path,m in tuple(source_bindings.items()):check(sha((ROOT/path).read_bytes())==m['sha256'],'INPUT_HELD:'+path)
 return {'schema':'lupine.g34.actual-public-receipt-review.v1','status':'PASS_PUBLIC_RECEIPT_CONSISTENCY','reviewed_at':now(),'producer':COMMIT,'public_sha256':PUBLIC,'binding_sha256':BIND,'checklist_sha256':'5e5b1272527e7b36a48d88ab7f04c3c7ad1b647576eb519a59ff45ef4abeb5d9','checks_completed':len(checks),'checks':checks,'gate_completion_times':gate_times,'preflight_at':pre['checked_at'],'ci_run':run['id'],'source_bindings':source_bindings,'runs':summaries,'source_and335_runtime_hold_scope':'Recorded before/after maps reconciled with exact current manifest and package gates; own4source/contract and recorder bytes independently hashed. No production guard or335-file source scan rerun.','exposure_interpretation':'Whole target-bearing source buffers were read; primary and aggregate software progress are separate. Aggregate uses the primary archive, so its unused lifecycle flags are not a second cleanup result. Zero member/XML counters do not negate whole-buffer exposure. Fifteen fixed headers and five completed extras are traversal counts, not scientific observations or admitted archive totals.','limits':['Public consistency only; no raw predicate classification recomputed.','No private/capture/raw input, member payload, source operation, product import, production guard, test suite or network accessed or executed.','Reviewer authored prior G31; this does not independently revalidate that code.','Exact replay and complete categorical diagnosis do not admit archive or science, establish independent units/fresh holdout, or demonstrate recommendation superiority.']}
if __name__=='__main__':
 started=now();tick=time.monotonic();result=None
 try:result=main();code=0
 except Exception as exc:result={'status':'FAILED_PUBLIC_RECEIPT_REVIEW','error_type':type(exc).__name__,'closed_check_code':str(exc),'checks_completed':len(checks),'source_bindings':source_bindings};code=1
 put('review.json',result);put('execution.json',{'started_at':started,'finished_at':now(),'elapsed_seconds':time.monotonic()-tick,'exit_code':code,'script_sha256':sha(Path(__file__).read_bytes()),'review_sha256':sha((HERE/'review.json').read_bytes()),'product_tests_or_source_operations_run':0})
 print(json.dumps({'status':result['status'],'checks_completed':len(checks),'review_sha256':sha((HERE/'review.json').read_bytes())},sort_keys=True));raise SystemExit(code)
