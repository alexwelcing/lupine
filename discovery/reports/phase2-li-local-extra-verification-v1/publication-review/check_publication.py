"""Publication custody/links check only: no product imports or scientific source reads."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,re,subprocess
ROOT=Path.cwd().resolve();BASE=ROOT/'.cache/phase2-local-extra-publication-review-v1'
PREFIX=ROOT/'reports/phase2-li-local-extra-verification-v1'
REPORTS=[PREFIX,ROOT/'reports/phase2-local-extra-semantics-v1',ROOT/'reports/phase2-bam-schema-contract-design-v1',ROOT/'reports/phase2-bam-schema-documentary-v1']
READS={}
def read(p):
 p=Path(p)
 if not p.is_absolute():p=ROOT/p
 p=p.resolve()
 assert p.is_relative_to(ROOT)
 allowed={ROOT/'.cache/li-v3-custody/compatible-zip-diagnostic-v1/1/public.json',*(ROOT/f'.cache/li-v3-custody/local-extra-headers-v1/{i}/public.json' for i in (1,2))}
 assert not p.is_relative_to(ROOT/'.cache/li-v3-custody') or p in allowed
 assert p.suffix.lower() not in {'.csv','.ipynb','.xlsx','.zip','.whl','.tar'}
 raw=p.read_bytes();assert len(raw)<8*1024*1024
 rel=str(p.relative_to(ROOT));digest=hashlib.sha256(raw).hexdigest()
 assert rel not in READS or READS[rel]==digest
 READS[rel]=digest
 return raw
def obj(p):return json.loads(read(p))
def digest(raw):return hashlib.sha256(raw).hexdigest()
record=obj(PREFIX/'root-copy-record.json')
additional=obj(PREFIX/'additional-lossless-wrappers.json')
wrapped={x['original_path']:x['wrapper'] for x in additional['wrappers']}
amendment=obj(PREFIX/'post-copy-amendment.json')
issues=[];copies=[]
for c in record['copies']:
 original=read(c['source'])
 assert len(original)==c['bytes'] and digest(original)==c['sha256']
 destination=ROOT/c['destination']
 wrapper=None
 if destination.exists():published=read(destination)
 elif c['destination'] in wrapped:
  wrapper=wrapped[c['destination']];j=obj(wrapper)
  assert j['encoding']=='utf-8';published=j['text'].encode('utf-8')
  assert len(published)==j['bytes'] and digest(published)==j['sha256']
 else:raise AssertionError('unexplained missing published destination '+c['destination'])
 same=published==original
 copies.append({'destination':c['destination'],'source':c['source'],'identical_original_bytes':same,'wrapper':wrapper,'original_sha256':digest(original),'published_sha256':digest(published)})
 if not same:
  assert c['destination']==amendment['path'] and digest(original)==amendment['copied_draft_sha256'] and digest(published)==amendment['current_sha256']
  assert amendment['runtime_or_test_change'] is False and amendment['original_draft_preserved'] is True
  copies[-1]['explained_by_post_copy_amendment']=True
wrappers=[]
for directory in REPORTS:
 for p in sorted(directory.rglob('*.bytes.json')):
  j=obj(p);assert j['encoding']=='utf-8';raw=j['text'].encode('utf-8')
  assert len(raw)==j['bytes'] and digest(raw)==j['sha256']
  wrappers.append({'path':str(p.relative_to(ROOT)),'reconstructed_bytes':len(raw),'reconstructed_sha256':digest(raw)})
for conversion in obj(PREFIX/'lossless-diff-wrappers.json')['conversions']:
 rel=conversion['wrapper']
 if rel.startswith('bam-design/'):
  target=REPORTS[2]/rel[len('bam-design/'):]
 elif rel.startswith('zip-semantics/'):
  target=REPORTS[1]/rel[len('zip-semantics/'):]
 else:
  target=PREFIX/rel
 j=obj(target);assert digest(j['text'].encode('utf-8'))==conversion['sha256']
for item in obj(PREFIX/'mutation-copy-check.json')['exact_copies']:
 target=PREFIX/'mutation-review'/item['path']
 raw=read(target) if target.exists() else obj(str(target)+'.bytes.json')['text'].encode('utf-8')
 assert len(raw)==item['bytes'] and digest(raw)==item['sha256']
for name,dest in [('phase2-local-extra-artifact-review-v1','artifact-review'),('phase2-local-extra-operation-review-v1','operation-review')]:
 inv=obj(ROOT/'.cache'/name/'inventory.json')
 for relative,identity in inv['files'].items():
  original=read(ROOT/'.cache'/name/relative)
  assert digest(original)==identity['sha256'] and len(original)==identity['bytes']
  target=PREFIX/dest/relative
  raw=read(target) if target.exists() else obj(str(target)+'.bytes.json')['text'].encode('utf-8')
  assert raw==original
links=[]
for directory in REPORTS:
 for p in sorted(directory.rglob('*.md')):
  txt=read(p).decode('utf-8')
  for match in re.finditer(r'\[[^\]\n]+\]\(([^)\n]+)\)',txt):
   target=match.group(1).strip().split(' "')[0].strip('<>')
   if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:',target) or target.startswith('#'):continue
   path=target.split('#')[0]
   if not path:continue
   dest=(p.parent/path).resolve();exists=dest.exists()
   links.append({'from':str(p.relative_to(ROOT)),'target':target,'exists':exists})
   if not exists:issues.append({'kind':'missing_link','from':str(p.relative_to(ROOT)),'target':target})
manifest=obj(ROOT/'reports/runtime-manifest.json')['files'];assert len(manifest)==326
for relative,pin in manifest.items():assert digest(read(relative))==pin
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()=='d0505b9b358a4bdeafbd742f1aeeb6c2b955abf3'
changed=subprocess.check_output(['git','diff','--cached','--relative','--name-only'],text=True).splitlines()
assert all(p.startswith('reports/') or p in {'GOAL.md','STATUS.md','docs/release-validation.md'} for p in changed)
for p in changed:
 assert subprocess.check_output(['git','show',':discovery/'+p])==read(p)
check=subprocess.run(['git','diff','--cached','--check'],capture_output=True)
assert check.returncode==0 and check.stdout==check.stderr==b''
result={'recorded_at':datetime.now(timezone.utc).isoformat(),'status':'PASS' if not issues else 'FINDINGS','copy_count':len(copies),'wrapper_count':len(wrappers),'local_link_count':len(links),'runtime_files_held':len(manifest),'staged_files_match_worktree':len(changed),'issues':issues,'copies':copies,'wrappers':wrappers,'links':links,'evidence_reads':READS,'private_objects_or_raw_sources_read':False,'product_tests_run':False}
with (BASE/'final-publication-check.json').open('x') as f:json.dump(result,f,indent=2,sort_keys=True);f.write('\n')
print(json.dumps({k:v for k,v in result.items() if k not in {'copies','wrappers','links','evidence_reads'}},indent=2))
