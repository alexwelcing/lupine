from pathlib import Path
import datetime,hashlib,json,os,subprocess,sys,time
R=Path(__file__).resolve().parents[2];H=Path(__file__).resolve().parent
manifest=json.loads((R/'reports/runtime-manifest.json').read_bytes())['files'];assert len(manifest)==339
sha=lambda b:hashlib.sha256(b).hexdigest();assert all(sha((R/n).read_bytes())==v for n,v in manifest.items())
start=datetime.datetime.now(datetime.timezone.utc).isoformat();command=[sys.executable,'-B','-m','unittest','discover','-s','tests','-v'];(H/'start.json').write_text(json.dumps({'at':start,'command':command,'manifest':manifest,'published_commit':'2975d6d0b9111cc84adb82ccc673bc82339ab154','purpose':'Reproduce failing complete CI unittest suite; Python version printed in receipt; no inference from narrower97PASS.'},indent=2)+'\n');tick=time.monotonic();env=dict(os.environ);env['PYTHONPATH']=str(R/'src');env['PYTHONDONTWRITEBYTECODE']='1'
with (H/'stdout.txt').open('xb') as out,(H/'stderr.txt').open('xb') as err:p=subprocess.run(command,cwd=R,env=env,stdout=out,stderr=err)
v={'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'process_seconds':time.monotonic()-tick,'exit_code':p.returncode,'python':sys.version,'runtime_source_unchanged':all(sha((R/n).read_bytes())==d for n,d in manifest.items()),'stdout_sha256':sha((H/'stdout.txt').read_bytes()),'stderr_sha256':sha((H/'stderr.txt').read_bytes())};(H/'execution.json').write_text(json.dumps(v,indent=2)+'\n');print(json.dumps(v));print((H/'stderr.txt').read_text()[-16000:]);raise SystemExit(p.returncode)
