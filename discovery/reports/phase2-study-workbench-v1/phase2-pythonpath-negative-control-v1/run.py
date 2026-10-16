from pathlib import Path
import datetime,json,os,subprocess,sys,time
root=Path.cwd();out=root/'.cache/phase2-pythonpath-negative-control-v1';assert not (out/'venv').exists()
commands=[]
def run(label,cmd,env=None):
 start=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic();r=subprocess.run(cmd,cwd=out,env=env,capture_output=True,text=True);(out/(label+'-stdout.txt')).write_text(r.stdout);(out/(label+'-stderr.txt')).write_text(r.stderr);commands.append({'label':label,'command':cmd,'started_at':start,'elapsed_seconds':time.monotonic()-tick,'exit_code':r.returncode});return r
r=run('create',[sys.executable,'-m','venv',str(out/'venv')]);assert r.returncode==0
wheel=next((root/'.cache/phase2-clean-package-v1/artifacts').glob('*.whl'));python=str(out/'venv/bin/python');env={**os.environ,'PYTHONPATH':str(root/'.cache/phase2-combined-ui-validation-v1/mirror/discovery/src')}
r=run('install',[python,'-m','pip','install','--no-index','--no-deps',str(wheel)],env);print(r.stdout)
r2=run('isolated-import',[python,'-I','-c','import lupine_discovery; print(lupine_discovery.__file__)'],env)
receipt={'scope':'Labeled negative reproduction of source PYTHONPATH leaking into pip; no product or science pass','commands':commands,'injected_path_scope':'isolated synthetic integration mirror source directory','pip_skipped_as_already_installed':'already installed with the same version' in r.stdout,'isolated_import_failed':r2.returncode!=0 and 'ModuleNotFoundError' in r2.stderr,'wheel':str(wheel)};(out/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:receipt[k] for k in ['pip_skipped_as_already_installed','isolated_import_failed']}));assert receipt['pip_skipped_as_already_installed'] and receipt['isolated_import_failed']
