from pathlib import Path
import datetime,hashlib,json,os,signal,subprocess,time
R=Path(__file__).absolute().parents[2];H=Path(__file__).absolute().parent;sha=lambda b:hashlib.sha256(b).hexdigest();held=json.loads((R/'reports/runtime-manifest.json').read_bytes())['files'];assert len(held)==351 and all(sha((R/n).read_bytes())==d for n,d in held.items())
previous=R/'.cache/browser';saved=R/'.cache/browser-before-source-readiness-20261016';assert not saved.exists()
if previous.exists():previous.rename(saved)
cmd=['python','scripts/browser_smoke.py'];start=datetime.datetime.now(datetime.timezone.utc).isoformat();t=time.monotonic();timeout=False
p=subprocess.Popen(cmd,cwd=R,env=dict(os.environ,PYTHONPATH='src',PYTHONDONTWRITEBYTECODE='1'),stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
try:out,err=p.communicate(timeout=600)
except subprocess.TimeoutExpired:
 timeout=True;os.killpg(p.pid,signal.SIGKILL);out,err=p.communicate()
seconds=time.monotonic()-t;(H/'browser-first-stdout.txt').write_bytes(out);(H/'browser-first-stderr.txt').write_bytes(err);stable=all(sha((R/n).read_bytes())==d for n,d in held.items());v={'command':cmd,'environment':{'PYTHONPATH':'src','PYTHONDONTWRITEBYTECODE':'1'},'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':p.returncode,'timed_out':timeout,'seconds':seconds,'source_held':stable,'held_files':held,'stdout_sha256':sha(out),'stderr_sha256':sha(err),'scope':'Actual full workbench Chromium regression with generated HTTP controls; no scientific source operation.'}
with (H/'browser-first-execution.json').open('x') as f:f.write(json.dumps(v,indent=2)+'\n')
print(json.dumps({k:x for k,x in v.items() if k!='held_files'}));print(err.decode()[-5000:]);assert p.returncode==0 and not timeout and stable
report=json.loads((R/'.cache/browser/decision-pool/browser-report.json').read_bytes());assert report['status']=='passed' and len(report['checks'])==86 and len(set(report['checks']))==86
(H/'browser-first-report.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS86 real browser checks')
