import datetime,hashlib,importlib.util,json,pathlib,subprocess,sys,time
root=pathlib.Path.cwd();out=root/'.cache/phase2-li-production-v1'
commit='5addf4f80e345afa50a4bcc26b9db24d220a3af5'
ci=json.loads((root/'.cache/phase2-implementation-ci-v1/final.json').read_text())
assert ci['commit']==commit and ci['all_four_jobs_successful'] and ci['run']['head_sha']==commit and ci['run']['event']=='push' and ci['run']['run_attempt']==1
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==commit
assert not subprocess.check_output(['git','status','--porcelain'])
remote=subprocess.check_output(['git','ls-remote','origin','refs/heads/research/lupine-discovery'],text=True).split()[0];assert remote==commit
for i in (0,1):
 p=json.loads((root/f'.cache/phase2-clean-package-v1/{i}-execution.json').read_text());assert p['commit']==commit and p['exit_code']==0 and p['source_unchanged'] and p['head_unchanged'] and p['worktree_clean']
spec=importlib.util.spec_from_file_location('manifest',root/'scripts/runtime_manifest.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);before=m.source_files(root)
steps=[('capture','.cache/li-v3-custody/capture-1/public.json',0),('envelope','.cache/li-v3-custody/envelope-1/public.json',2),('envelope','.cache/li-v3-custody/envelope-2/public.json',2)]
for i,(action,dest,expected) in enumerate(steps):
 folder=out/str(i);folder.mkdir(exist_ok=False)
 cmd=[sys.executable,'scripts/li_v3_custody.py',action,'--receipt',dest];start=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic()
 (folder/'start.json').write_text(json.dumps({'command':cmd,'commit':commit,'started_at':start,'expected_exit_code':expected,'ci_run':ci['run']['id'],'exposure_until_completed_receipt':'UNKNOWN'},indent=2)+'\n')
 timed_out=False
 with (folder/'stdout.txt').open('xb') as a,(folder/'stderr.txt').open('xb') as b:
  try:r=subprocess.run(cmd,stdout=a,stderr=b,timeout=100)
  except subprocess.TimeoutExpired:
   timed_out=True;r=subprocess.CompletedProcess(cmd,124)
 after=m.source_files(root);stdout=(folder/'stdout.txt').read_bytes()
 try:data=json.loads(stdout)
 except (ValueError,UnicodeError):data={'status':'NO_COMPLETE_PUBLIC_RESULT','reason':'TIMEOUT' if timed_out else 'OUTPUT_INVALID'}
 receipt={'command':cmd,'commit':commit,'ci_run':ci['run']['id'],'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'exit_code':r.returncode,'expected_exit_code':expected,'timed_out':timed_out,'result_status':data.get('status'),'result_reason':data.get('reason'),'engineering_status':data.get('engineering_status'),'runtime_before':before,'runtime_after':after,'source_unchanged':before==after,'head_unchanged':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==commit,'worktree_clean':not bool(subprocess.check_output(['git','status','--porcelain'])),'stdout_sha256':hashlib.sha256(stdout).hexdigest(),'stderr_sha256':hashlib.sha256((folder/'stderr.txt').read_bytes()).hexdigest(),'public_projection_exists':(root/dest).is_file()}
 (folder/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print(json.dumps({k:v for k,v in receipt.items() if k not in ('runtime_before','runtime_after')}),flush=True)
 assert receipt['source_unchanged'] and receipt['head_unchanged'] and receipt['worktree_clean']
 if r.returncode!=expected or data.get('status')=='BLOCKED_GUARD':raise SystemExit('STOP_PRESERVE_ACTUAL_RESULT')
 if i and data.get('status')!='BLOCKED_SCHEMA':raise SystemExit('STOP_UNEXPECTED_SCHEMA_STATUS')
print('Completed fixed capture and two envelope invocations; no scientific schema approval.',flush=True)
