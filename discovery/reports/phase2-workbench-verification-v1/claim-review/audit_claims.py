from pathlib import Path
import datetime, hashlib, json
ROOT=Path.cwd(); BASE=ROOT/'reports/phase2-workbench-verification-v1'; OUT=ROOT/'.cache/phase2-workbench-final-claim-review-v1'
COMMIT='41d3e31a14bea040fb37b0aa6a650d6d5e704551'
def read(rel): return json.loads((BASE/rel).read_text())
def sha(raw): return hashlib.sha256(raw).hexdigest()
bindings=[]
def bind(path):
 raw=path.read_bytes(); bindings.append({'path':str(path.relative_to(ROOT)),'bytes':len(raw),'sha256':sha(raw)}); return raw
inventory_checks=[]
for name, key in [('copy-inventory.initial.json','files'),('publication-copy-inventory.json','copies')]:
 inventory=read(name)
 for entry in inventory[key]:
  target=entry['destination']
  if name=='copy-inventory.initial.json': path=BASE/target
  else:
   prefix='.cache/phase2-workbench-publication-v1/promotion/'
   if target.startswith(prefix): target=target[len(prefix):]
   assert target.startswith('reports/'), target
   path=ROOT/target
  raw=path.read_bytes(); assert len(raw)==entry['bytes'] and sha(raw)==entry['sha256'], str(path)
 inventory_checks.append({'inventory':name,'destination_hashes_verified':len(inventory[key])})
 bind(BASE/name)
ci=read('ci/final.json'); observations=read('ci/observations.json')
assert ci['commit']==COMMIT and ci['run']['head_sha']==COMMIT and ci['run']['event']=='push'
assert ci['run']['id']==38858784217 and ci['run']['run_attempt']==1
assert ci['run']['status']=='completed' and ci['run']['conclusion']=='success'
assert len(ci['jobs'])==4 and {j['name'] for j in ci['jobs']}=={'python (3.11)','python (3.12)','browser','lean'}
assert all(j['status']=='completed' and j['conclusion']=='success' for j in ci['jobs'])
assert ci['all_four_jobs_successful'] is True
assert {k:v for k,v in ci.items() if k!='all_four_jobs_successful'}==observations[-1]
manifest=read('runtime-manifest.json')['files']; assert len(manifest)==306
execution_checks=[]
for folder,index,expected in [('clean-package',0,0),('clean-package',1,0),('actual-header-diagnostic',1,2),('actual-header-diagnostic',2,2)]:
 prefix=f'{folder}/{index}'
 receipt_path=prefix+'-execution.json' if folder=='clean-package' else prefix+'/execution.json'
 receipt=read(receipt_path)
 assert receipt['commit']==COMMIT and receipt['exit_code']==expected
 assert receipt['runtime_before']==receipt['runtime_after']==manifest
 assert all(receipt[k] is True for k in ['source_unchanged','head_unchanged','worktree_clean'])
 for stream in ['stdout','stderr']:
  log_path=prefix+'-'+stream+'.txt' if folder=='clean-package' else prefix+'/'+stream+'.txt'
  assert sha((BASE/log_path).read_bytes())==receipt[stream+'_sha256']
 if folder=='actual-header-diagnostic':
  assert receipt['ci_run']==ci['run']['id'] and receipt['started_at']>ci['observed_at']
  assert receipt['timed_out'] is False and receipt['result_status']=='BLOCKED_SCHEMA'
  assert receipt['reason']=='MEMBER_FLAGS' and receipt['legacy_zip_reason']=='ZIP_LAYOUT_UNSUPPORTED'
  raw=(BASE/(prefix+'/public.json')).read_bytes(); assert raw==(BASE/(prefix+'/stdout.txt')).read_bytes()
  result=json.loads(raw); assert result['implementation']['commit']==COMMIT
  assert result['source_identity_verified'] is True and result['synthetic_fixture'] is False
  assert result['observed']=={'bytes':183878,'md5':'041bbe095c54615e5a3c289facb18ce5','sha256':'9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa'}
  assert result['capture_identity']['files']==result['implementation']['legacy_files']
  assert result['capture_identity']['receipt_sha256']=='13f6f1b0354d15a214169cdd52e58d5349a30b6c2f481f793f9d3af12fb28009'
  exp=result['exposure']; assert exp==receipt['exposure']
  assert exp['target_bearing_source_bytes_read'] is True and exp['directory_name_decoding_completed'] is True
  assert exp['header_checks_completed'] is False and exp['members_decompressed']==[]
  assert all(exp[k] is False for k in ['member_names_published','xml_decoded','worksheet_cells_decoded','shared_strings_decoded','target_numeric_validity_checked','scientific_eligibility_decisions','sampling_independence_established'])
  assert exp['fits']==exp['splits']==0
  assert all(result[k] is None for k in ['row_count','paired_count','source_group_count','overlap_count'])
  assert sha(raw)=='50931018f877a66ee56cf522e5d8a0be35cfc35f2c8b7f34884f5ba6caba6ca0'
 execution_checks.append({'receipt':receipt_path,'exit_code':expected,'runtime_hashes_unchanged':306,'log_hashes_match':True})
 bind(BASE/receipt_path)
assert read('actual-header-diagnostic/1/execution.json')['started_at']>read('clean-package/1-execution.json')['finished_at']
assert (BASE/'actual-header-diagnostic/1/public.json').read_bytes()==(BASE/'actual-header-diagnostic/2/public.json').read_bytes()
package=read('clean-package/release-artifacts.json'); smoke=read('clean-package/0-stdout.txt'); strict=read('clean-package/1-stdout.txt'); independent=read('independent-artifact-review/review.json')
assert package['source']['git_commit']==COMMIT and smoke['status']=='passed' and smoke['case_count']==28
assert len(smoke['problem_schemas'])==6 and len(smoke['checks'])==15
assert smoke['checks']==package['verification']['checks']==independent['mandatory_checks']
assert independent['status']=='PASS' and independent['commit']==COMMIT
assert package['artifacts']==strict['artifact_identities']==independent['artifact_identities']
assert independent['source_files_compared_to_git_blobs']==2522 and independent['runtime_source_files_matching_manifest_and_worktree']==306
assert independent['wheel_record_content_digests_checked']==113 and independent['wheel_package_members_matching_exact_git_source']==107
assert sha((BASE/'clean-package/release-artifacts.json').read_bytes())==independent['receipt_sha256']==strict['receipt_sha256']
for rel in ['README.md','ci/final.json','ci/observations.json','ci/executed-watcher.py','clean-package/release-artifacts.json','clean-package/executed-recorder.py','actual-header-diagnostic/run_after_ci.py','actual-header-diagnostic/await_verified_ci.py','actual-header-diagnostic/1/public.json','actual-header-diagnostic/2/public.json','runtime-manifest.json','independent-artifact-review/review.json']: bind(BASE/rel)
for rel in ['GOAL.md','STATUS.md','reports/progress.md','reports/continuation.json','docs/release-validation.md']: bind(ROOT/rel)
report={'schema':'lupine.discovery.final_claim_review.v1','status':'NO_BLOCKER','reviewed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runtime_commit':COMMIT,'owner':'phase2_math','inventory_checks':inventory_checks,'execution_checks':execution_checks,'findings':['Original push41d3, attempt1, four completed successful CI jobs agree with retained final observation and watcher; no remote test totals inferred.','Both actual diagnostics follow completed CI and clean package, preserve306hashes, and return identical expected BLOCKED_SCHEMA/MEMBER_FLAGS; whole-buffer/name exposure is disclosed, no decompression/XML/schema/scientific result inferred.','Clean package28cases/sixschemas/15checks and strict verifier match their actual logs; independent2522source/306runtime/113RECORD/107package-file audit evidence has the advertised narrower scope.','Renewed-phase records preserve old closed preview and unchanged scientific NO_GO; report-only descendant remote/CI remains pending.','A minor future-tense ambiguity in report intro was corrected by root during review.'],'source_bindings':bindings,'limitations':['Reviewed retained public receipts and sources; no new independent GitHub API request.','No raw workbook/private capture/production cache read, test rerun or new scientific validation.','Final publication report-inventory.json is staging and will be regenerated by root after this review is copied.'],'tests_run':False,'network_used':False,'tracked_edits_by_reviewer':False,'scientific_claim_changed':False}
raw=(json.dumps(report,indent=2)+'\n').encode();(OUT/'review.json').write_bytes(raw)
print(json.dumps({'status':report['status'],'sha256':sha(raw),'inventory_counts':inventory_checks,'execution_count':len(execution_checks)}))
