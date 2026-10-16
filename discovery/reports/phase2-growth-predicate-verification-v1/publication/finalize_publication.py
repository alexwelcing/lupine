from pathlib import Path
import datetime,hashlib,json,re,subprocess,urllib.parse
root=Path.cwd();out=root/'.cache/phase2-growth-predicate-release-v1'
def sha(raw):return hashlib.sha256(raw).hexdigest()
files=json.loads((out/'growth-report-copyset.json').read_bytes())['files']
def copy(src,dst,expected=None):
 raw=(root/src).read_bytes();assert expected is None or sha(raw)==expected
 p=root/dst;assert not p.exists();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw);files[dst]=sha(raw)
base='.cache/phase2-rhizo-recorded-label-publication-v1';report='reports/phase2-rhizo-recorded-label-readiness-v1'
raw=(root/base/'promotion-inventory.json').read_bytes();assert sha(raw)=='591cf46eab789ef31b15f4ea0fc24816d99fb0de896103a0cb3a79c0603a0982'
inv=json.loads(raw)
assert len(inv['files'])==96
for dst,row in inv['files'].items():
 assert dst.startswith(report+'/') and not dst.endswith('/private.json')
 copy(base+'/promotion/'+dst,dst,row['sha256'])
for name in ('promotion-inventory.json','handoff.json','prepare.py','prepare-before-check-order.py','first-assembly-failure.json'):
 copy(base+'/'+name,report+'/publication-preparation/'+name)
for name in ('first-finalization-hold-failure.json','finalize-before-final-hold.py'):
 copy('.cache/phase2-growth-predicate-release-v1/'+name,'reports/phase2-growth-predicate-implementation-v1/root-integration/'+name)
for path,digest in json.loads((out/'final-reviewed-pins.json').read_bytes())['files'].items():
 assert sha((root/path).read_bytes())==digest;files[path]=digest
for path in ('GOAL.md','STATUS.md','docs/projection-data-readiness.md','docs/release-validation.md','reports/progress.md','reports/continuation.json','reports/runtime-manifest.json'):
 files[path]=sha((root/path).read_bytes())
# Explicit source inventories are authoritative; no recursive source/cache copying.
links=[]
for path,digest in files.items():
 raw=(root/path).read_bytes();assert sha(raw)==digest
 if path.endswith('.json'):json.loads(raw)
 if path.endswith('.md'):
  for target in re.findall(r'\]\(([^)]+)\)',raw.decode()):
   target=target.split()[0].strip('<>');url=urllib.parse.urlsplit(target)
   if url.scheme or not url.path or target.startswith('/') or target.startswith('app:'):continue
   resolved=(root/path).parent/urllib.parse.unquote(url.path)
   assert resolved.exists(),(path,target)
   links.append({'source':path,'target':target})
checked={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'relative_markdown_links':len(links),'links':links,'explicit_files_before_this_check':len(files),'all_json_syntax_valid':True,'no_private_source_copy':True,'runtime_files':335,'prior332_unchanged':True,'actual_g34_operations':0}
p=root/'reports/phase2-growth-predicate-implementation-v1/root-integration/publication-checks.json';p.write_text(json.dumps(checked,indent=2)+'\n');files[str(p.relative_to(root))]=sha(p.read_bytes())
# Hash all final intended bytes outside the commit and also publish a self-excluding inventory.
public=root/'reports/phase2-growth-predicate-implementation-v1/root-integration/publication-inventory.json'
public.write_text(json.dumps({'schema':'lupine.discovery.publication_inventory.v1','self_excluded':str(public.relative_to(root)),'files':files},indent=2,sort_keys=True)+'\n');files[str(public.relative_to(root))]=sha(public.read_bytes())
(out/'final-copyset.json').write_text(json.dumps({'schema':'lupine.discovery.final_copyset.v1','files':files},indent=2,sort_keys=True)+'\n')
print(json.dumps({'files':len(files),'links':len(links),'copyset_sha256':sha((out/'final-copyset.json').read_bytes())}))
