"""Read-only review of retained public release bytes and completed execution records."""
from pathlib import Path
from hashlib import sha256,sha1
import base64,csv,datetime,io,json,subprocess,tarfile,zipfile
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1];REPO=ROOT.parent
COMMIT='6585a605d5d325e84423c7e35c7286efe85cfb6f'
PREVIOUS='a0624cac9abb20320629cce41f10270b9b8e2136'
RESOURCE='d93769b07fba52f9bc95dbed92c5303aa8344867e7a663d0ca58cff7af2ba274'
E=ROOT/'.cache/package-present-release-execution-6585a605d5d3'
R=ROOT/'.cache/release-artifacts-present-contract-6585a605d5d3'
B=ROOT/'reports/research-preview-interface-v1';reads={}
def capture(p):
 b=p.read_bytes();reads[str(p.relative_to(ROOT))]=sha256(b).hexdigest();return b
def load(p):return json.loads(capture(p))
def canon(v):return (json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)+'\n').encode()
def git(*args):return subprocess.check_output(['git',*args],cwd=REPO)
def stamp(v):return datetime.datetime.fromisoformat(v)
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
execution=load(E/'execution.json');assert reads[str((E/'execution.json').relative_to(ROOT))]=='0eb931dc8f73a2fdf71f8d91d42f8b9951e9574d66abb0b948d192e9933fd15a'
retained=load(R/'release-artifacts.json');audit=load(ROOT/'.cache/wheel-source-present-contract-6585a605d5d3.json')
assert execution['status']==audit['status']=='PASS' and execution['source_commit']==audit['source_commit']==COMMIT
assert execution['retained_receipt_sha256']==reads[str((R/'release-artifacts.json').relative_to(ROOT))]==audit['retained_receipt_sha256']
assert execution['wheel_source_audit_sha256']==reads['.cache/wheel-source-present-contract-6585a605d5d3.json']=='e03eaaf3f550867b19494a55e5f1c40ffe31d8d324f3cd339777cf8dd8c84140'
assert retained['content_sha256']==sha256(canon({k:v for k,v in retained.items() if k!='content_sha256'})).hexdigest()
before=execution['source_before'];assert before==execution['source_after']==load(E/'source-before.json')
assert before['git_head']==COMMIT and before['git_status_porcelain']==''
assert execution['source_unchanged'] is True and execution['expected_mpea_resource_sha256']==RESOURCE
assert before['optional_mpea_resource_exists'] is True and before['optional_mpea_resource_regular_path'] is True and before['optional_mpea_resource_sha256']==RESOURCE
for path,h in before['source_sha256'].items():assert sha256(capture(ROOT/path)).hexdigest()==h
assert [x['name'] for x in execution['commands']]==['package','retained-verifier','wheel-source-audit']
logs={};previous=None
for record in execution['commands']:
 name=record['name'];assert load(E/(name+'.execution.json'))==record
 start=load(E/(name+'.started.json'))
 for key in ('command','cwd','pid','started_at_utc'):assert start[key]==record[key]
 assert start['source_state']==before==record['source_after'] and record['source_unchanged'] is True
 assert record['exit_code']==0 and record['timeout'] is False
 assert stamp(record['started_at_utc'])<stamp(record['finished_at_utc'])
 if previous:assert previous<=stamp(record['started_at_utc'])
 previous=stamp(record['finished_at_utc'])
 for stream in ('stdout','stderr'):
  b=capture(E/(name+'.'+stream+'.txt'));assert sha256(b).hexdigest()==record[stream+'_sha256']
  if stream=='stderr':assert b==b''
  else:logs[name]=json.loads(b)
assert logs['package']=={k:retained['verification'][k] for k in ('status','case_count','problem_schemas','checks')}
strict=logs['retained-verifier'];assert strict['status']=='PASS' and strict['ci_success_established'] is False
assert strict['receipt_sha256']==execution['retained_receipt_sha256'] and strict['expected_git_commit']==COMMIT
assert strict['artifact_identities']==execution['artifacts']==retained['artifacts']
assert logs['wheel-source-audit']=={k:v for k,v in audit.items() if k!='bindings'}
assert all(execution['reviewed_resource_transport_checks'].values())
claim={'resource':'resources/mpea-t25-v1.json','status':'present_exactly_served','javascript':'packaged_and_exactly_served'}
verification=retained['verification'];assert verification['status']=='passed' and verification['isolated_install'] is True
assert verification['optional_mpea']==claim==execution['optional_mpea_probe']
assert verification['case_count']==28 and len(verification['problem_schemas'])==6 and len(verification['checks'])==12
assert verification['known_answer_summary']=={'failed':0,'passed':13,'total':13}
assert len(verification['certificate_digests'])==len(verification['replay_digests'])==28
assert retained['source_state_rechecked_after_smoke'] is True and retained['wheel_build_source']=='committed_source_archive'
assert retained['source']['git_commit']==COMMIT and retained['source']['git_tree']==git('rev-parse',COMMIT+'^{tree}').decode().strip()
assert retained['source']['worktree_status']=='clean'
paths={}
for kind,record in retained['artifacts'].items():
 p=R/record['filename'];b=capture(p);assert len(b)==record['bytes'] and sha256(b).hexdigest()==record['sha256'];paths[kind]=p
assert verification['wheel_sha256']==audit['wheel_sha256']==retained['artifacts']['wheel']['sha256']
assert audit['source_archive_sha256']==retained['artifacts']['source_archive']['sha256']
# Independently authenticate every public source archive member against Git blobs.
expected={}
for item in git('ls-tree','-r','-z',COMMIT,'--','discovery','.github/workflows/discovery-verify.yml').split(b'\0'):
 if not item:continue
 meta,name=item.split(b'\t',1);mode,kind,oid=meta.split();assert mode in (b'100644',b'100755') and kind==b'blob'
 name=name.decode();assert not set(Path(name).parts)&{'.cache','.git','.venv','__pycache__'}
 expected['lupine-source/'+name]=oid.decode()
with tarfile.open(paths['source_archive'],'r:') as bundle:
 members=bundle.getmembers();assert len({x.name for x in members})==len(members)
 assert all(x.isfile() or x.isdir() for x in members)
 assert all(not Path(x.name).is_absolute() and '..' not in Path(x.name).parts for x in members)
 files={x.name:bundle.extractfile(x).read() for x in members if x.isfile()}
assert set(files)==set(expected) and len(files)==retained['source']['archived_file_count']==2210
source_hashes={}
for name,b in files.items():
 assert sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==expected[name]
 source_hashes[name.removeprefix('lupine-source/')]=sha256(b).hexdigest()
assert sha256(canon(source_hashes)).hexdigest()==retained['source']['archived_file_hashes_sha256']
manifest_path='lupine-source/discovery/reports/runtime-manifest.json';manifest=json.loads(files[manifest_path])
assert sha256(files[manifest_path]).hexdigest()==retained['source']['runtime_manifest']['sha256']
assert len(manifest['files'])==retained['source']['runtime_manifest']['file_count']==293
with zipfile.ZipFile(paths['wheel']) as bundle:
 names=bundle.namelist();assert len(names)==len(set(names))==112
 wheel={name:bundle.read(name) for name in names}
runtime={k for k in wheel if k.startswith('lupine_discovery/')}
source_runtime={k.removeprefix('lupine-source/discovery/src/'):v for k,v in files.items() if k.startswith('lupine-source/discovery/src/lupine_discovery/')}
assert runtime==set(source_runtime) and len(runtime)==audit['runtime_payload_count']==105
for name in runtime:assert wheel[name]==source_runtime[name]
assert len(audit['bindings'])==audit['exact_source_payload_count']==107
for item in audit['bindings']:
 assert wheel[item['wheel_member']]==files[item['source_member']]
 assert len(wheel[item['wheel_member']])==item['bytes'] and sha256(wheel[item['wheel_member']]).hexdigest()==item['sha256']
assert set(wheel)-{x['wheel_member'] for x in audit['bindings']}==set(audit['generated_metadata_not_byte_compared_to_source'])
record_name='lupine_discovery-0.1.0.dist-info/RECORD'
records=list(csv.reader(io.StringIO(wheel[record_name].decode())));assert len(records)==112 and {r[0] for r in records}==set(wheel)
for name,hash_text,size in records:
 if name==record_name:assert hash_text==size==''
 else:
  assert size==str(len(wheel[name])) and hash_text=='sha256='+base64.urlsafe_b64encode(sha256(wheel[name]).digest()).rstrip(b'=').decode()
resource_name='lupine_discovery/resources/mpea-t25-v1.json';js_name='lupine_discovery/web/mpea.js'
assert sha256(wheel[resource_name]).hexdigest()==RESOURCE
assert sha256(wheel[js_name]).hexdigest()==strict['mpea_transport_audit']['nonempty_javascript_sha256']=='f760f6225e60f08d7b4217bae7e7499fe1b4d3ea91514c5b1e429c5b4523f35e'
assert wheel[resource_name]==capture(ROOT/'src'/resource_name)
scope=('discovery/src','discovery/scripts','discovery/tests','discovery/formal','discovery/pyproject.toml','.github/workflows/discovery-verify.yml')
delta=git('diff','--name-status',PREVIOUS,COMMIT,'--',*scope).decode()
assert delta=='A\tdiscovery/src/lupine_discovery/resources/mpea-t25-v1.json\n'
# Browser ran before the publication commit; join its exact bytes, not its HEAD.
browser=load(B/'execution-result.json');bs=load(B/'execution-start.json');visual=load(B/'copy-and-visual-review.json')
assert browser['status']=='PASS' and len(browser['checks'])==10
assert browser['source_stable'] is True and browser['original_public_bytes_stable'] is True
assert browser['source_sha256_before']==browser['source_sha256_after']==bs['source_sha256']
assert bs['git_head']==PREVIOUS and browser['started_utc']==bs['started_utc']
assert browser['public_identity']==bs['public_identity'] and browser['public_identity']['original_public_sha256']==RESOURCE
for key in ('javascript_errors','console_errors','request_failures','cleanup_errors'):assert browser[key]==[]
assert browser['api']['status']==200 and browser['api']['mpea_object_exactly_matches_original'] is True
for name,item in browser['artifacts'].items():
 b=capture(B/name);assert len(b)==item['bytes'] and sha256(b).hexdigest()==item['sha256']
for item in visual['copies']:
 b=capture(B/item['path']);assert len(b)==item['bytes'] and sha256(b).hexdigest()==item['sha256']
for name,h in browser['source_sha256_before'].items():
 if not name.startswith('.cache/'):
  assert sha256(capture(ROOT/name)).hexdigest()==h
assert capture(B/'displayed-original-public-report.json')==wheel[resource_name]
assert sha256(capture(B/'probe-source.py')).hexdigest()==browser['source_sha256_before']['.cache/actual-public-browser-preparation/verify_actual_public_browser.py']
assert stamp(browser['finished_utc'])<stamp(execution['commands'][0]['started_at_utc'])
assert all(sha256((ROOT/name).read_bytes()).hexdigest()==h for name,h in reads.items())
receipt={'schema':'lupine.mpea.final_release_artifact_transport_review.v1','status':'PASS_LOCAL_RELEASE_EVIDENCE_CI_NOT_ADJUDICATED','source_commit':COMMIT,'recorded_started_at':started,'recorded_completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_head_at_review':git('rev-parse','HEAD').decode().strip(),'git_status_at_review':git('status','--porcelain=v1','--untracked-files=all').decode(),'reviewer_sha256':sha256(Path(__file__).read_bytes()).hexdigest(),'reviewed_input_sha256':reads,'checks':{'actual_three_command_start_exit_log_and_source_chain':True,'recorded_release_clean_before_and_after':True,'all_2210_archive_files_exact_git_blobs':True,'runtime_manifest_293_files_bound':True,'wheel_105_runtime_and_two_license_payloads_exact_source':True,'all_112_wheel_record_entries_verified':True,'reviewed_resource_exact_in_commit_archive_wheel_and_browser_copy':True,'mpea_javascript_exact_source_wheel_identity':True,'source_diff_since_registered_commit_only_new_public_resource_in_executing_scope':True,'recorded_installed_http_json_value_equality_and_js_byte_equality':True,'browser_ten_groups_source_and_artifact_joins':True},'artifacts':retained['artifacts'],'resource_sha256':RESOURCE,'package_cases':28,'package_schemas':6,'package_assertion_groups':12,'browser_assertion_groups':10,'browser_run_head':PREVIOUS,'browser_bytes_join_release_commit':True,'source_delta_in_executing_scope':delta.strip(),'ci_status':'NOT_REVIEWED_PENDING_PARENT_EXACT_RUN_HANDOFF','limits':['This review did not rebuild, reinstall, rerun HTTP or browser, or rerun any scientific study.','Installed HTTP claim is type-sensitive JSON-value equality; original file bytes are separately exact. JavaScript serving is byte equality.','Browser records bind precommit actual bytes; they are not an exact-6585 browser execution.','Root visual-review attestation is retained; this reviewer did not independently inspect screenshot pixels.','Bit-reproducible build, hostile-host attestation and scientific usefulness are not established by these checks.','Registered archival scientific verdict remains NO_GO_ARCHIVAL_USEFULNESS.'],'main_tree_edits':False,'private_study_data_access':False}
with (HERE/'review.json').open('x') as out:json.dump(receipt,out,sort_keys=True,indent=2);out.write('\n')
print(json.dumps({'status':receipt['status'],'receipt_sha256':sha256((HERE/'review.json').read_bytes()).hexdigest(),'archive_files':len(files),'wheel_members':len(wheel),'resource_sha256':RESOURCE}))
