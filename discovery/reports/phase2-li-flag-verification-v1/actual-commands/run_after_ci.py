from pathlib import Path
import datetime,hashlib,importlib.util,json,subprocess,sys,time
root=Path.cwd();out=root/'.cache/phase2-li-flag-production-v1';commit='f7c6ccd04b535f8830f07905b51a5dc2c8a6ca4f'
ci=json.loads((root/'.cache/phase2-li-flags-ci-v1/final.json').read_text())
assert ci['commit']==commit and ci['all_four_jobs_successful'] and ci['run']['head_sha']==commit and ci['run']['event']=='push' and ci['run']['run_attempt']==1
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==commit
assert not subprocess.check_output(['git','status','--porcelain'])
assert subprocess.check_output(['git','ls-remote','origin','refs/heads/research/lupine-discovery'],text=True).split()[0]==commit
for i in (0,1):
 p=json.loads((root/f'.cache/phase2-li-flags-clean-package-v1/{i}-execution.json').read_text());assert p['commit']==commit and p['exit_code']==0 and p['source_unchanged'] and p['head_unchanged'] and p['worktree_clean']
spec=importlib.util.spec_from_file_location('manifest',root/'scripts/runtime_manifest.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);before=m.source_files(root)
outputs=[]
for i in (1,2):
 folder=out/str(i);folder.mkdir(exist_ok=False);command=[sys.executable,'scripts/li_v3_flag_diagnostic.py','diagnose','--run',str(i)];start=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic()
 (folder/'start.json').write_text(json.dumps({'command':command,'commit':commit,'started_at':start,'expected_exit_code':2,'ci_run':ci['run']['id'],'exposure_until_completed_receipt':'UNKNOWN'},indent=2)+'\n')
 timed_out=False
 with (folder/'stdout.txt').open('xb') as a,(folder/'stderr.txt').open('xb') as b:
  try:r=subprocess.run(command,stdout=a,stderr=b,timeout=100)
  except subprocess.TimeoutExpired:timed_out=True;r=subprocess.CompletedProcess(command,124)
 after=m.source_files(root);raw=(folder/'stdout.txt').read_bytes()
 try:data=json.loads(raw)
 except (ValueError,UnicodeError):data={'status':'NO_COMPLETE_PUBLIC_RESULT'}
 receipt={'command':command,'commit':commit,'ci_run':ci['run']['id'],'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'exit_code':r.returncode,'expected_exit_code':2,'timed_out':timed_out,'result_status':data.get('status'),'reason':data.get('reason'),'legacy_zip_reason':data.get('legacy_zip_reason'),'exposure':data.get('exposure'),'runtime_before':before,'runtime_after':after,'source_unchanged':before==after,'head_unchanged':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==commit,'worktree_clean':not bool(subprocess.check_output(['git','status','--porcelain'])),'stdout_sha256':hashlib.sha256(raw).hexdigest(),'stderr_sha256':hashlib.sha256((folder/'stderr.txt').read_bytes()).hexdigest()}
 (folder/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:v for k,v in receipt.items() if k not in ('runtime_before','runtime_after')}),flush=True)
 assert receipt['source_unchanged'] and receipt['head_unchanged'] and receipt['worktree_clean']
 if r.returncode!=2 or data.get('status')!='BLOCKED_SCHEMA':raise SystemExit('STOP_PRESERVE_ACTUAL_RESULT')
 assert data['source_identity_verified'] and data['observed']['sha256']=='9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa'
 outputs.append(raw)
assert outputs[0]==outputs[1]
print('Two identical first flag-family diagnostic receipts; scientific schema remains blocked.',flush=True)
