"""Fresh installed retained-wheel asset check; no scientific source data."""
import hashlib,json,os,subprocess,sys,tempfile,venv
from pathlib import Path
ROOT=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
OUT=Path(__file__).resolve().parent
WHEEL=ROOT/'.cache/release-artifacts-a67815e/lupine_discovery-0.1.0-py3-none-any.whl'
COMMIT='a67815e60561df1ea08a44e63227e2e3b6780c6c'
expected=hashlib.sha256(subprocess.check_output(['git','-C',str(ROOT.parent),'show',COMMIT+':discovery/src/lupine_discovery/web/mpea.js'])).hexdigest()
probe='''from importlib.resources import files
from pathlib import Path
import hashlib,json,sys,lupine_discovery
from lupine_discovery.server import benchmark_report,ASSETS
asset=files('lupine_discovery').joinpath('web/mpea.js').read_bytes()
assert hashlib.sha256(asset).hexdigest()==sys.argv[1]
assert not files('lupine_discovery').joinpath('resources/mpea-t25-v1.json').is_file()
assert 'mpea_archived' not in benchmark_report()
assert '/mpea.js' in ASSETS
print(json.dumps({'status':'PASS','module_path':str(Path(lupine_discovery.__file__).resolve()),'mpea_js_sha256':hashlib.sha256(asset).hexdigest(),'mpea_resource_absent':True,'mpea_benchmark_field_absent':True,'static_route_present':True}))
'''
(OUT/'installed-probe.py').write_text(probe)
before=hashlib.sha256(WHEEL.read_bytes()).hexdigest();commands=[]
with tempfile.TemporaryDirectory(prefix='a67815e-installed-audit-') as d:
    outside=Path(d);venv.EnvBuilder(with_pip=True).create(outside/'venv');python=outside/'venv/bin/python'
    for name,cmd in [('install',[str(python),'-I','-m','pip','install','--no-index','--no-deps',str(WHEEL)]),('probe',[str(python),'-I','-c',probe,expected])]:
        p=subprocess.run(cmd,cwd=outside,capture_output=True,timeout=60);(OUT/(name+'.stdout.txt')).write_bytes(p.stdout);(OUT/(name+'.stderr.txt')).write_bytes(p.stderr)
        commands.append({'name':name,'argv':cmd,'exit_code':p.returncode,'stdout_sha256':hashlib.sha256(p.stdout).hexdigest(),'stderr_sha256':hashlib.sha256(p.stderr).hexdigest()})
        if p.returncode:break
    result={'schema':'lupine.retained-installed-asset-audit.v1','status':'PASS' if len(commands)==2 and all(c['exit_code']==0 for c in commands) else 'FAIL','wheel_before':before,'wheel_after':hashlib.sha256(WHEEL.read_bytes()).hexdigest(),'expected_commit':COMMIT,'expected_mpea_js_sha256':expected,'commands':commands,'probe_sha256':hashlib.sha256(probe.encode()).hexdigest(),'scope':'Actual fresh isolated installed asset/API check, not repetition of28case smoke or scientific evaluation'}
(OUT/'installed-asset-current.json').write_text(json.dumps(result,sort_keys=True,indent=2)+'\n');print(result['status'])
