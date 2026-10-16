from pathlib import Path
import datetime,hashlib,json,re,subprocess,urllib.parse
R=Path.cwd();H=R/'.cache/phase2-growth-predicate-verification-release-v1';D=R/'reports/phase2-growth-predicate-verification-v1/root-publication'
sha=lambda b:hashlib.sha256(b).hexdigest()
files={}
for d in ['reports/phase2-growth-predicate-verification-v1','reports/phase2-opc-part-scope-v1','reports/phase2-rhizo-vacancy-methods-v1']:
 for p in (R/d).rglob('*'):
  if p.is_file(): files[str(p.relative_to(R))]=sha(p.read_bytes())
for f in ['GOAL.md','STATUS.md','docs/release-validation.md','reports/continuation.json','reports/progress.md']:
 files[f]=sha((R/f).read_bytes())
for f in ['finalize.py','check_publication.py','publish.py']:
 p=D/f;assert not p.exists();p.write_bytes((H/f).read_bytes());files[str(p.relative_to(R))]=sha(p.read_bytes())
links=[]
for f,h in files.items():
 raw=(R/f).read_bytes();assert sha(raw)==h
 if f.endswith('.json'):json.loads(raw)
 if f.endswith('.md'):
  for t in re.findall(r'\]\(([^)]+)\)',raw.decode()):
   t=t.split()[0].strip('<>');u=urllib.parse.urlsplit(t)
   if u.scheme or not u.path or t.startswith('/'):continue
   assert ((R/f).parent/urllib.parse.unquote(u.path)).exists(),(f,t)
   links.append({'source':f,'target':t})
m=json.loads((R/'reports/runtime-manifest.json').read_bytes())['files'];assert len(m)==335
for f,h in m.items():assert sha((R/f).read_bytes())==h
checks={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'json_syntax':'PASS','relative_markdown_links':len(links),'links':links,'runtime_files_unchanged':335,'source_operations_or_tests_rerun':False,'new_report_ci':'NOT_YET_PUBLISHED'}
p=D/'publication-checks.json';p.write_text(json.dumps(checks,indent=2)+'\n');files[str(p.relative_to(R))]=sha(p.read_bytes())
p=D/'publication-inventory.json';p.write_text(json.dumps({'self_excluded':str(p.relative_to(R)),'files':files},indent=2,sort_keys=True)+'\n');files[str(p.relative_to(R))]=sha(p.read_bytes())
(H/'final-copyset.json').write_text(json.dumps({'files':files},indent=2,sort_keys=True)+'\n')
print(json.dumps({'files':len(files),'relative_links':len(links),'runtime_held':335,'copyset_sha256':sha((H/'final-copyset.json').read_bytes())}))
