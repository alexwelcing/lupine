from pathlib import Path
import datetime,hashlib,importlib.util,json,subprocess,sys,time
root=Path.cwd();out=root/'.cache/phase2-li-compatible-production-v1';commit='4492858d9e55ddfa3cca2e208063799517948b13'
ci=json.loads((root/'.cache/phase2-finite-compatible-ci-v1/final.json').read_text())
assert ci['commit']==commit and ci['all_four_jobs_successful'] and ci['run']['head_sha']==commit and ci['run']['event']=='push' and ci['run']['run_attempt']==1
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==commit
assert not subprocess.check_output(['git','status','--porcelain'])
assert subprocess.check_output(['git','ls-remote','origin','refs/heads/research/lupine-discovery'],text=True).split()[0]==commit
for i in (0,1):
 p=json.loads((root/f'.cache/phase2-finite-compatible-clean-package-v1/{i}-execution.json').read_text());assert p['commit']==commit and p['exit_code']==0 and p['source_unchanged'] and p['head_unchanged'] and p['worktree_clean']
audit=json.loads((root/'.cache/phase2-finite-artifact-review-v1/actual-4492858/review.json').read_text());assert audit['status']=='PASS' and audit['commit']==commit and audit['exit_code']==0
prerequisite=(root/'.cache/li-v3-custody/flag-diagnostic-v1/1/public.json').read_bytes();assert hashlib.sha256(prerequisite).hexdigest()=='74404679ec62a18ef50d1847f652ba749c85eb8f63d08740d2fa0a5fb956c47b'
spec=importlib.util.spec_from_file_location('manifest',root/'scripts/runtime_manifest.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);before=m.source_files(root)
outputs=[]
for i in (1,2):
 folder=out/str(i);folder.mkdir(exist_ok=False);command=[sys.executable,'scripts/li_v3_compatible_envelope.py','envelope','--run',str(i)];start=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic()
 (folder/'start.json').write_text(json.dumps({'command':command,'commit':commit,'started_at':start,'expected_exit_code':2,'ci_run':ci['run']['id'],'exposure_until_completed_receipt':'UNKNOWN'},indent=2)+'\n')
 timed_out=False
 with (folder/'stdout.txt').open('xb') as a,(folder/'stderr.txt').open('xb') as b:
  try:r=subprocess.run(command,stdout=a,stderr=b,timeout=100)
  except subprocess.TimeoutExpired:timed_out=True;r=subprocess.CompletedProcess(command,124)
 after=m.source_files(root);raw=(folder/'stdout.txt').read_bytes()
 try:data=json.loads(raw)
 except (ValueError,UnicodeError):data={'status':'NO_COMPLETE_PUBLIC_RESULT'}
 receipt={'command':command,'commit':commit,'ci_run':ci['run']['id'],'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'exit_code':r.returncode,'expected_exit_code':2,'timed_out':timed_out,'result_status':data.get('status'),'reason':data.get('reason'),'engineering_status':data.get('engineering_status'),'member_count':data.get('member_count'),'sheet_count':data.get('sheet_count'),'recognized_roles':data.get('recognized_roles'),'exposure':data.get('exposure'),'runtime_before':before,'runtime_after':after,'source_unchanged':before==after,'head_unchanged':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==commit,'worktree_clean':not bool(subprocess.check_output(['git','status','--porcelain'])),'stdout_sha256':hashlib.sha256(raw).hexdigest(),'stderr_sha256':hashlib.sha256((folder/'stderr.txt').read_bytes()).hexdigest()}
 (folder/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:v for k,v in receipt.items() if k not in ('runtime_before','runtime_after')}),flush=True)
 assert receipt['source_unchanged'] and receipt['head_unchanged'] and receipt['worktree_clean']
 if r.returncode!=2 or data.get('status')!='BLOCKED_SCHEMA':raise SystemExit('STOP_PRESERVE_ACTUAL_RESULT')
 assert data['source_identity_verified'] and data['observed']['sha256']=='9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa'
 assert data['exposure']['worksheet_cells_decoded'] is False and data['exposure']['shared_strings_decoded'] is False and data['exposure']['target_numeric_validity_checked'] is False and data['exposure']['fits']==0 and data['exposure']['splits']==0
 outputs.append(raw)
assert outputs[0]==outputs[1]
print('Two identical compatible-envelope receipts; inspect exact engineering reason and exposure; scientific schema remains blocked.',flush=True)
