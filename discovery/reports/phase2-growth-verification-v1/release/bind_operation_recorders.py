from pathlib import Path
import json,hashlib,datetime,subprocess,difflib,ast
root=Path.cwd();publication=json.loads((root/'.cache/phase2-growth-release-v1/published.json').read_text());commit=publication['commit'];assert publication['remote_verified'] is True
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==commit
assert subprocess.check_output(['git','ls-remote','origin','refs/heads/research/lupine-discovery'],text=True).split()[0]==commit
assert not subprocess.check_output(['git','status','--porcelain'])
records=[]
for directory,expected in [('phase2-growth-shape-operations-v1','c0e5e38f4669cd339002defd7c563afec6ea931525b4faad625c05fdd4af555d'),('phase2-growth-envelope-operations-v1','b13232eb55efec6a6fadfd5f900bc3f3fd9a2b44fa3ac91bb3a763e7c80a84b7')]:
 base=root/'.cache'/directory;p=base/'run_after_ci.py';raw=p.read_bytes();assert hashlib.sha256(raw).hexdigest()==expected
 old=raw.decode();assert old.count("COMMIT = 'UNBOUND_COMMIT'")==1;new=old.replace("COMMIT = 'UNBOUND_COMMIT'","COMMIT = '"+commit+"'",1)
 a=ast.parse(old);b=ast.parse(new)
 for tree in (a,b):
  node=next(n for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='COMMIT' for t in n.targets));node.value=ast.Constant(value='NORMALIZED')
 assert ast.dump(a)==ast.dump(b)
 save=base/'reviewed-unbound-recorder.py';assert not save.exists();save.write_bytes(raw);p.write_text(new)
 diff=''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile=save.name,tofile=p.name));(base/'commit-binding.diff').write_text(diff)
 r={'recorded_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commit':commit,'prior_reviewed_sha256':expected,'bound_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'only_commit_literal_changed':True,'normalized_ast_identical':True,'actual_invocations':0};(base/'commit-binding.json').write_text(json.dumps(r,indent=2,sort_keys=True)+'\n');records.append(r)
print(json.dumps(records))
