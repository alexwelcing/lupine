"""Bounded public artifact/delta audit; no artifact code or science operations."""
from pathlib import Path, PurePosixPath
import base64
import csv
import datetime
import hashlib
import io
import json
import stat
import subprocess
import tarfile
import time
import zipfile

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
REPO = ROOT.parent
OLD = 'eaed2e7a00c8bb5c68d9dafb62c03ceb01ca218f'
NEW = 'e668b349e130cdfd1a8cfe94e3e38d4755507f72'
RUN = ROOT / '.cache/phase2-fixture-repair-release-v1' / ('run-'+NEW)
PRIOR = ROOT / '.cache/phase2-source-readiness-release-v1' / ('run-'+NEW)
RECORDER = 'b74867438bda41235f0b93b028f91caf422284037d6ebe65cf244fa4f4084c33'
CHANGED = 'tests/test_li_v3_readiness_production.py'
OLD_PIN = '809c0126ef9f130fad264ef2617f67b9b99db103a3a14c476a6e60bfb4905470'
NEW_PIN = 'a38e2d7c0cfdc0fd0ef122795f12e97d1b9ba1cd263495356b5e3f79b7325503'
MANIFEST = '452711071f2e3abf8eb734cb6e2e94ee85d04b64f8b40d39300b0597d64d489b'
EXT = {'.toml','.py','.json','.html','.css','.js','.svg'}
SLOT = BASE / 'first-actual-review'
SLOT.mkdir(exist_ok=False)
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
t0 = time.monotonic()
checks, inputs, packet, observed = [], [], {}, {}


def sha(raw): return hashlib.sha256(raw).hexdigest()
def canonical(value): return (json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)+'\n').encode()
def require(name, condition):
    checks.append({'check':name,'passed':bool(condition)})
    if not condition: raise AssertionError(name)
def save(name, value):
    with (SLOT/name).open('x') as f: json.dump(value,f,indent=2,sort_keys=True); f.write('\n')
def strict_json(raw):
    def pairs(items):
        d={}
        for k,v in items:
            if k in d: raise ValueError('duplicate JSON key')
            d[k]=v
        return d
    return json.loads(raw,object_pairs_hook=pairs,parse_constant=lambda _:(_ for _ in ()).throw(ValueError('nonfinite JSON')))
def public(path):
    raw=path.read_bytes(); key=str(path)
    if key not in packet:
        descriptor={'path':key,'bytes':len(raw),'sha256':sha(raw)}
        inputs.append(descriptor); packet[key]={**descriptor,'utf8':raw.decode('utf-8')}
    return raw
def load(path): return strict_json(public(path))
def git(*args):
    if args[0] not in {'rev-parse','status','ls-tree','show','merge-base'}: raise ValueError('read-only Git only')
    return subprocess.run(['git',*args],cwd=REPO,capture_output=True,check=True).stdout
def tree(commit):
    value={}
    for record in git('ls-tree','-r','-z',commit,'--','discovery','.github/workflows/discovery-verify.yml').split(b'\0'):
        if not record: continue
        metadata,name=record.split(b'\t',1); mode,kind,oid=metadata.decode().split(); name=name.decode()
        if name in value or mode not in {'100644','100755'} or kind!='blob': raise ValueError('unsupported Git tree entry')
        value[name]=(mode,oid)
    return value
def runtime(name):
    if not name.startswith('discovery/'): return None
    p=name[10:]
    return p if (p=='pyproject.toml' or p.startswith(('scripts/','tests/','src/lupine_discovery/'))) and PurePosixPath(p).suffix in EXT else None
def payload(name):
    prefix='discovery/src/lupine_discovery/'
    if not name.startswith(prefix): return None
    p=name[len(prefix):]; ext=PurePosixPath(p).suffix
    return 'lupine_discovery/'+p if ext=='.py' or (p.startswith('web/') and ext in {'.html','.css','.js','.svg'}) or (p.startswith('resources/') and ext=='.json') else None
def file_sha(path):
    digest=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1048576),b''): digest.update(chunk)
    return digest.hexdigest()
def safe(name):
    p=PurePosixPath(name)
    return bool(name) and not p.is_absolute() and '..' not in p.parts and '\\' not in name and not set(p.parts)&{'.cache','.git','.venv','__pycache__'}
def command(directory,label,argv,expected_exit,empty_stderr=True):
    start=load(directory/(label+'.started.json')); done=load(directory/(label+'.execution.json'))
    require(label+'_argv_start_and_actual_exit_'+directory.parent.name,
        done['argv']==argv and canonical(start)==canonical({k:done[k] for k in start})
        and type(done['returncode']) is int and done['returncode']==expected_exit and done['launch_error'] is None
        and datetime.datetime.fromisoformat(done['started_utc'])<=datetime.datetime.fromisoformat(done['finished_utc']))
    for stream in ('stdout','stderr'):
        require(label+'_'+stream+'_name_'+directory.parent.name,done[stream]==label+'.'+stream)
        raw=public(directory/done[stream])
        require(label+'_'+stream+'_identity_'+directory.parent.name,done[stream+'_identity']=={'bytes':len(raw),'sha256':sha(raw)})
    if empty_stderr: require(label+'_empty_stderr_'+directory.parent.name,public(directory/(label+'.stderr'))==b'')
    return done


try:
    require('live_exact_clean_start',git('rev-parse','HEAD').decode().strip()==NEW and git('status','--porcelain=v1','--untracked-files=all')==b'')
    git('merge-base','--is-ancestor',OLD,NEW)
    prior_review=load(PRIOR/'review.json'); prior_outer=load(PRIOR/'root-observed-exit.json')
    require('first_network_failure_preserved',prior_review['status']=='STOPPED' and prior_review['published_commit']==NEW
        and prior_review['package_execution'] is None and prior_review['strict_execution'] is None
        and prior_review['package_returncode'] is None and prior_review['strict_returncode'] is None
        and prior_review['errors']==[{'message':'Read-only Git gate failed: before-remote','phase':'precondition_or_execution','type':'ValueError'}])
    require('first_attempt_outer_exit_two',type(prior_outer['actual_exit_code']) is int and prior_outer['actual_exit_code']==2
        and prior_outer['review_sha256']==sha(public(PRIOR/'review.json')) and prior_outer['package_executed'] is False and prior_outer['strict_executed'] is False)
    remote_argv=['git','ls-remote','--exit-code','origin','refs/heads/research/lupine-discovery']
    command(PRIOR,'before-remote',remote_argv,128,False)
    require('first_attempt_connect_502',b'CONNECT tunnel failed, response 502' in public(PRIOR/'before-remote.stderr'))
    require('first_attempt_no_package_or_strict_slot',all(not (PRIOR/n).exists() for n in ('package.started.json','package.execution.json','strict.started.json','strict.execution.json','retained')))
    review=load(RUN/'review.json'); outer=load(RUN/'root-observed-exit.json'); request=load(RUN/'request.json')
    require('same_recorder_recovered_attempt',sha(public(RUN/'executed-recorder.py'))==RECORDER==sha(public(PRIOR/'executed-recorder.py'))==review['recorder_sha256']
        and request['commit']==NEW and request['recorder']['sha256']==RECORDER)
    require('completed_local_package_and_strict',review['status']=='PASS' and review['published_commit']==NEW and review['source_held'] is True
        and review['errors']==[] and type(review['package_returncode']) is int and review['package_returncode']==0
        and type(review['strict_returncode']) is int and review['strict_returncode']==0)
    require('root_observed_success',type(outer['actual_exit_code']) is int and outer['actual_exit_code']==0
        and outer['session_id']==9969 and outer['tool_chunk']=='9db5fe' and outer['review_sha256']==sha(public(RUN/'review.json')))
    before=load(RUN/'source-before.json'); after=load(RUN/'source-after.json')
    require('351_source_states_held',public(RUN/'source-before.json')==public(RUN/'source-after.json') and before['git_commit']==NEW
        and before['remote_branch_commit']==NEW and len(before['runtime_files'])==351 and before['runtime_manifest']['sha256']==MANIFEST)
    python=load(RUN/'package.started.json')['argv'][0]
    require('held_interpreter',str(Path(python).resolve())==before['python_executable'])
    package=command(RUN,'package',[python,'-I',str(ROOT/'scripts/package_smoke.py'),'--retain-directory',str(RUN/'retained'),'--output',str(RUN/'package-report.json')],0)
    strict=command(RUN,'strict',[python,'-I',str(ROOT/'scripts/verify_retained_artifacts.py'),'--directory',str(RUN/'retained'),'--commit',NEW,'--repository',str(REPO)],0)
    require('command_working_directories',package['cwd']==strict['cwd']==str(ROOT))
    require('execution_order',review['started_utc']<=package['started_utc']<=package['finished_utc']<=strict['started_utc']<=strict['finished_utc']<=review['finished_utc']<=outer['at'])
    report=load(RUN/'package-report.json'); strict_report=load(RUN/'strict.stdout'); receipt_raw=public(RUN/'retained/release-artifacts.json'); receipt=strict_json(receipt_raw)
    require('receipt_seal',receipt['content_sha256']==sha(canonical({k:v for k,v in receipt.items() if k!='content_sha256'})))
    require('package_report_and_receipt_equal',canonical({k:v for k,v in report.items() if k!='retention'})==canonical(receipt['verification'])
        and report['retention']['receipt_sha256']==sha(receipt_raw) and report['retention']['git_commit']==NEW
        and report['retention']['artifacts']==receipt['artifacts'])
    require('package_stdout_matches_report',canonical(load(RUN/'package.stdout'))==canonical({k:report[k] for k in ('status','case_count','problem_schemas','checks')}))
    require('strict_receipt_link',strict_report['status']=='PASS' and strict_report['expected_git_commit']==NEW
        and strict_report['receipt_sha256']==sha(receipt_raw) and strict_report['artifact_identities']==receipt['artifacts'])
    old_report_path=ROOT/'.cache/phase2-source-readiness-artifact-review-v1/first-actual-artifact-audit/review.json'
    old_report_raw=old_report_path.read_bytes()
    require('prior_audit_attribution',sha(old_report_raw)=='ebc7095e823dc5271ca333f09f11d8f9a9bd87efb67ed0f6aa840494d2cb4362'
        and strict_json(old_report_raw)['published_commit_requested']==OLD)
    old_receipt_raw=(ROOT/'.cache/phase2-source-readiness-artifact-review-v1/completed-command-evidence/retained__release-artifacts.json').read_bytes()
    old_receipt=strict_json(old_receipt_raw)
    require('eighteen_original_flags_retained',sha(old_receipt_raw)=='5a64e895c6e48c5e23e4ec266a294a9cd6d8e0c64ef30c867a51862c201a74ae'
        and type(report['checks']) is list and len(report['checks'])==18 and report['checks']==old_receipt['verification']['checks']==strict_report['reported_smoke']['checks'])
    state=receipt['source']; current,old_tree=tree(NEW),tree(OLD)
    require('receipt_exact_commit_tree_scope',state['git_commit']==NEW and state['git_tree']==git('rev-parse',NEW+'^{tree}').decode().strip()
        and state['archive_copyset']==['discovery','.github/workflows/discovery-verify.yml'] and state['project_path']=='discovery'
        and state['worktree_status']=='clean' and receipt['source_state_rechecked_after_smoke'] is True
        and receipt['wheel_build_source']=='committed_source_archive')
    scope_names=lambda t:{n for n in t if n=='discovery/pyproject.toml' or n.startswith(('discovery/scripts/','discovery/tests/','discovery/src/lupine_discovery/'))}
    require('whole_runtime_directory_git_delta_exact',scope_names(current)==scope_names(old_tree)
        and sorted(n for n in scope_names(current) if current[n]!=old_tree[n])==['discovery/'+CHANGED])
    require('test_delta_exact_pins',sha(git('show',OLD+':discovery/'+CHANGED))==OLD_PIN and sha(git('show',NEW+':discovery/'+CHANGED))==NEW_PIN
        and current['discovery/'+CHANGED][0]==old_tree['discovery/'+CHANGED][0])
    artifacts={}
    for kind,item in receipt['artifacts'].items():
        path=RUN/'retained'/item['filename']
        require(kind+'_exact_identity',path.name==item['filename'] and path.is_file() and path.resolve()==path.absolute()
            and path.stat().st_size==item['bytes'] and file_sha(path)==item['sha256'])
        artifacts[kind]=path
    require('exact_two_artifact_types',set(artifacts)=={'source_archive','wheel'})
    hashes={}; manifest_raw=None; object_format=git('rev-parse','--show-object-format').decode().strip()
    require('git_object_format',object_format in {'sha1','sha256'})
    with tarfile.open(artifacts['source_archive'],'r:') as archive:
        members=archive.getmembers(); names=[m.name for m in members if m.isfile()]
        require('source_exact_members_and_pax_commit',len({m.name for m in members})==len(members)
            and set(names)=={'lupine-source/'+n for n in current} and len(names)==state['archived_file_count']
            and archive.pax_headers.get('comment')==NEW)
        for m in members:
            if not safe(m.name) or not (m.name=='lupine-source' or m.name.startswith('lupine-source/')) or not (m.isdir() or m.isfile()): raise ValueError('unsafe source entry')
            if m.isdir(): continue
            name=m.name[len('lupine-source/'):]; mode,oid=current[name]
            if m.mode&0o7000 or (mode=='100644' and m.mode&0o111) or (mode=='100755' and not m.mode&0o100): raise ValueError('source mode mismatch: '+name)
            g=hashlib.new(object_format); g.update(b'blob '+str(m.size).encode()+b'\0'); h=hashlib.sha256(); held=bytearray()
            with archive.extractfile(m) as stream:
                for chunk in iter(lambda:stream.read(1048576),b''):
                    g.update(chunk);h.update(chunk)
                    if name=='discovery/reports/runtime-manifest.json':held.extend(chunk)
            if g.hexdigest()!=oid:raise ValueError('source Git blob mismatch: '+name)
            hashes[name]=h.hexdigest()
            if held:manifest_raw=bytes(held)
    require('all_source_git_blobs_verified',len(hashes)==len(current))
    require('source_hash_mapping_seal',sha(canonical(hashes))==state['archived_file_hashes_sha256'])
    runtime_now={runtime(n):h for n,h in hashes.items() if runtime(n)}; manifest=strict_json(manifest_raw)
    old_manifest=strict_json(git('show',OLD+':discovery/reports/runtime-manifest.json'))
    require('independent_351_runtime_coverage',len(runtime_now)==351 and manifest['files']==runtime_now
        and set(old_manifest['files'])=={runtime(n) for n in old_tree if runtime(n)}==set(runtime_now)
        and sha(manifest_raw)==MANIFEST==state['runtime_manifest']['sha256'] and state['runtime_manifest']['file_count']==351
        and before['runtime_files']==runtime_now)
    require('exact_one_changed_350_held_runtime_hashes',[p for p in sorted(runtime_now) if runtime_now[p]!=old_manifest['files'][p]]==[CHANGED]
        and runtime_now[CHANGED]==NEW_PIN and old_manifest['files'][CHANGED]==OLD_PIN)
    payloads={payload(n):h for n,h in hashes.items() if payload(n)}
    require('all_113_package_source_blobs_unchanged',len(payloads)==113 and {payload(n) for n in old_tree if payload(n)}==set(payloads)
        and all(current[n]==old_tree[n] for n in current if payload(n)))
    with zipfile.ZipFile(artifacts['wheel']) as wheel:
        infos=wheel.infolist(); require('wheel_unique_bounded_members',len({x.filename for x in infos})==len(infos)==120 and sum(x.file_size for x in infos)<128*1024*1024)
        contents={}
        for x in infos:
            if not safe(x.filename) or x.is_dir() or x.flag_bits&1 or stat.S_IFMT(x.external_attr>>16) not in {0,stat.S_IFREG}:raise ValueError('unsafe wheel member')
            contents[x.filename]=wheel.read(x)
    dist='lupine_discovery-0.1.0.dist-info/'
    require('wheel_exact_payload_and_metadata_set',set(contents)==set(payloads)|{dist+n for n in ('licenses/LICENSE','licenses/NOTICE.md','METADATA','WHEEL','entry_points.txt','top_level.txt','RECORD')})
    require('all_wheel_payloads_match_committed_source',all(sha(contents[n])==h for n,h in payloads.items()))
    rows=list(csv.reader(io.StringIO(contents[dist+'RECORD'].decode(),newline='')))
    require('RECORD_complete_unique_rows',all(len(x)==3 for x in rows) and len(rows)==len({x[0] for x in rows})==120 and {x[0] for x in rows}==set(contents))
    for n,h,size in rows:
        expected='sha256='+base64.urlsafe_b64encode(hashlib.sha256(contents[n]).digest()).rstrip(b'=').decode()
        if not ((h==size=='') if n==dist+'RECORD' else (h==expected and size==str(len(contents[n])))):raise ValueError('RECORD digest/size mismatch: '+n)
    require('all_119_RECORD_content_digests_verified',len(rows)-1==119)
    require('wheel_license_source_identity',all(sha(contents[dist+'licenses/'+n])==hashes['discovery/'+n] for n in ('LICENSE','NOTICE.md')))
    require('both_public_resource_pins',sha(contents['lupine_discovery/resources/source-readiness-v1.json'])=='9abad97d5675f416cc38a325bcd1e108825af001b2fdfccaa1f5c7dfb66f3f0b'
        and sha(contents['lupine_discovery/resources/recorded-census-v1.json'])=='a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a')
    require('artifacts_receipt_held',all(file_sha(path)==receipt['artifacts'][kind]['sha256'] for kind,path in artifacts.items())
        and (RUN/'retained/release-artifacts.json').read_bytes()==receipt_raw)
    require('live_exact_clean_finish',git('rev-parse','HEAD').decode().strip()==NEW and git('status','--porcelain=v1','--untracked-files=all')==b'')
    observed={'commit':NEW,'baseline_commit':OLD,'source_archive_files':len(hashes),'runtime_files':351,'runtime_changed':[CHANGED],
        'runtime_unchanged':350,'old_test_sha256':OLD_PIN,'new_test_sha256':NEW_PIN,'runtime_manifest_sha256':MANIFEST,
        'package_payloads':113,'package_payloads_unchanged':113,'wheel_members':120,'RECORD_content_digests':119,
        'mandatory_receipt_flags':18,'prior_audit_check_count_not_reattributed':22005,'new_artifacts':receipt['artifacts'],
        'release_receipt_sha256':sha(receipt_raw),'first_attempt':'STOPPED_BEFORE_PACKAGE_CONNECT_502','recovered_attempt':'PACKAGE_AND_STRICT_EXIT_ZERO',
        'package_execution_sha256':sha(public(RUN/'package.execution.json')),'strict_execution_sha256':sha(public(RUN/'strict.execution.json'))}
except Exception as error:
    checks.append({'check':'review_stopped','passed':False,'error_type':type(error).__name__,'error':str(error)})
result={'schema':'lupine.fixture-repair.independent-artifact-review.v1','status':'PASS_BOUNDED_REPAIR_ARTIFACT_DELTA' if all(c['passed'] for c in checks) else 'FAIL_BOUNDED_REPAIR_AUDIT',
    'started_at':started,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'seconds':time.monotonic()-t0,
    'audit_source_sha256':sha(Path(__file__).read_bytes()),'checks':checks,'observed':observed,'inputs':inputs,
    'scope':['Public exact-Git source archive, runtime delta, wheel payload/RECORD and completed-command evidence audit.','One earlier network-blocked package attempt remains separate; no package or strict command ran in that attempt.','This reviewer does not execute archive contents, rerun package/tests/verifier, read private custody or raw science, use network, mutate Git, or establish CI/scientific success.','The prior 22005-check audit belongs to eaed only; this report states its own checks and execution.']}
save('public-command-evidence.json',{'encoding':'Exact UTF-8 originals; encode each utf8 value to reconstruct original bytes.','files':packet})
save('review.json',result)
print(json.dumps({'status':result['status'],'checks':len(checks),'failures':[c for c in checks if not c['passed']],'observed':observed},indent=2))
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
