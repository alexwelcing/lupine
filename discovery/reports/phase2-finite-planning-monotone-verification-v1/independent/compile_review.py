"""One offline independent compile; no lake invocation or dependency mutation."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, os, re, subprocess, time
ROOT = Path('/workspace/lupine-discovery-branch/discovery')
HERE = Path(__file__).resolve().parent
AUTHOR = ROOT / '.cache/phase2-finite-planning-monotone-candidate-v1'
SOURCE = AUTHOR / 'LupineFinitePlanningMonotone.lean'
EXPECTED = 'fa1dedddf324fbd66a96de9eef1d775babccbc3668a81fd48726287dffe2268d'
LEAN = Path('/home/agent/.elan/toolchains/leanprover--lean4---v4.29.0/bin/lean')
IMPORTED = ROOT / 'formal/.lake/build/lib/lean/LupineFinitePlanning.olean'
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def save(path, value): path.write_text(json.dumps(value, indent=2, sort_keys=True)+'\n')
def now(): return datetime.now(timezone.utc).isoformat()
scope = json.loads((AUTHOR/'scope.json').read_bytes())
bindings = {str(ROOT/k):v for k,v in scope['source_bindings'].items()}
bindings.update({str(SOURCE):EXPECTED, str(IMPORTED):scope['imported_formal_object_sha256'], str(LEAN):'3e0d0d3d801675359f2d4cf9815bfdb417b20b92fdd9d48b3b14c95bbae28bbf'})
for name in ('README.md','scope.json','handoff.json','inventory.json','axiom-audit.json'):
    bindings[str(AUTHOR/name)] = sha(AUTHOR/name)
before = {p:sha(Path(p)) for p in bindings}
assert before == bindings, 'pre-execution binding drift'
OUT = HERE/'first'
OUT.mkdir(exist_ok=False)
copy = OUT/'LupineFinitePlanningMonotone.lean'
copy.write_bytes(SOURCE.read_bytes())
obj = OUT/'LupineFinitePlanningMonotone.olean'
paths = [ROOT/'formal/.lake/build/lib/lean'] + sorted((ROOT/'formal/.lake/packages').glob('*/.lake/build/lib/lean'))
assert len(paths) == 9 and all(p.is_dir() for p in paths)
env = os.environ.copy()
env['LEAN_PATH'] = ':'.join(map(str,paths))
env['LEAN_NUM_THREADS'] = '1'
cmd = [str(LEAN),'-DwarningAsError=true','-o',str(obj),str(copy)]
started, clock = now(), time.monotonic()
save(OUT/'start.json', {'command':cmd,'cwd':str(OUT),'started':started,'bindings':bindings,'lean_path':list(map(str,paths)),'lean_threads':1})
try:
    done = subprocess.run(cmd,cwd=OUT,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=90)
    stdout,stderr,exit_code,timed_out = done.stdout,done.stderr,done.returncode,False
except subprocess.TimeoutExpired as exc:
    stdout,stderr,exit_code,timed_out = exc.stdout or b'',exc.stderr or b'',None,True
finished, elapsed = now(),time.monotonic()-clock
(OUT/'stdout.txt').write_bytes(stdout)
(OUT/'stderr.txt').write_bytes(stderr)
after = {p:sha(Path(p)) for p in bindings}
expected_names = ['evaluation_step','evaluation_antitone','capped_feasible_iff','unique_first_count']
lines = stdout.decode('utf-8').splitlines()
expected_lines = [f"'LupineFinitePlanningMonotone.{name}' depends on axioms: [propext, Classical.choice, Quot.sound]" for name in expected_names]
axioms_exact = lines == expected_lines
source_theorems = re.findall(r'^theorem (\w+)',copy.read_text(),re.M)
report = {'schema':'lupine.finite-planning-monotone.independent-execution.v1','started':started,'finished':finished,'elapsed_seconds':elapsed,'command':cmd,'cwd':str(OUT),'exit_code':exit_code,'timed_out':timed_out,'source_sha256':sha(copy),'source_held':sha(copy)==EXPECTED and sha(SOURCE)==EXPECTED,'all_bound_inputs_held':before==after,'bound_input_count':len(bindings),'bindings_before':before,'bindings_after':after,'stdout_sha256':sha(OUT/'stdout.txt'),'stderr_sha256':sha(OUT/'stderr.txt'),'stderr_empty':not stderr,'compiled_object_sha256':sha(obj) if obj.exists() else None,'author_object_equal':obj.exists() and sha(obj)=='b39d9bab874b23dc10d2a3465f19120860802024d21629d2f11bd3367021dc7d','axiom_output_exact':axioms_exact,'declaration_names_exact':source_theorems==expected_names,'axioms':['propext','Classical.choice','Quot.sound'],'theorem_count':4,'tracked_edits':False,'network_or_dependency_build':False,'python_refinement':False}
save(OUT/'execution.json',report)
print(json.dumps({k:report[k] for k in ('exit_code','elapsed_seconds','source_held','all_bound_inputs_held','axiom_output_exact','declaration_names_exact','author_object_equal')}))
assert exit_code==0 and not timed_out and not stderr and before==after and axioms_exact and source_theorems==expected_names
