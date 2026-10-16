from pathlib import Path
import datetime,hashlib,importlib.util,json,os,subprocess,sys,time
root=Path.cwd();out=root/'.cache/phase2-finite-compatible-integrated-v1'
spec=importlib.util.spec_from_file_location('manifest',root/'scripts/runtime_manifest.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);before=m.source_files(root)
command=[sys.executable,'-m','unittest','discover','-s','tests','-p','test_li_v3*.py','-v'];env=dict(os.environ,PYTHONPATH=str(root/'src'))
start=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic()
(out/'start.json').write_text(json.dumps({'command':command,'started_at':start,'runtime_before':before,'scope':'Actual uncommitted integrated source; no CI or clean-retention claim.'},indent=2)+'\n')
with (out/'stdout.txt').open('w') as a,(out/'stderr.txt').open('w') as b:result=subprocess.run(command,stdout=a,stderr=b,env=env)
after=m.source_files(root);record={'command':command,'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'exit_code':result.returncode,'runtime_before':before,'runtime_after':after,'source_unchanged':before==after,'stdout_sha256':hashlib.sha256((out/'stdout.txt').read_bytes()).hexdigest(),'stderr_sha256':hashlib.sha256((out/'stderr.txt').read_bytes()).hexdigest(),'scope':'Synthetic fixtures/public source only; prior actual source receipts are not experimental inputs.'}
(out/'execution.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({k:v for k,v in record.items() if k not in ('runtime_before','runtime_after')}),flush=True)
assert before==after
raise SystemExit(result.returncode)
