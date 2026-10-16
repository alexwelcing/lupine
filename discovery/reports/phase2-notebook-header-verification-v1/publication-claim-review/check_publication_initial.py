from pathlib import Path
from hashlib import sha256
from datetime import datetime,timezone
import json,re
ROOT=Path.cwd()
BASE=ROOT/'.cache/phase2-a6-publication-claim-review-v1'
REPORT=ROOT/'reports/phase2-notebook-header-verification-v1'
paths=['reports/phase2-notebook-header-verification-v1/README.md','GOAL.md','STATUS.md','reports/progress.md','docs/release-validation.md','reports/continuation.json','reports/phase2-notebook-header-verification-v1/checkpoint.json','reports/phase2-notebook-header-verification-v1/publication-copy-map.json','reports/phase2-notebook-header-verification-v1/scaffold-README.md','reports/phase2-notebook-header-verification-v1/scaffold-checkpoint.json','reports/phase2-notebook-header-verification-v1/scaffold-inventory.json','reports/phase2-li-paper-methods-v1/PUBLICATION.md','reports/phase2-bam-readiness-v1/PUBLICATION.md','reports/phase2-finite-risk-inversion-design-v1/PUBLICATION.md']
bindings={p:{'bytes':(ROOT/p).stat().st_size,'sha256':sha256((ROOT/p).read_bytes()).hexdigest()} for p in paths}
errors=[]
links=[]
copychecks=[]
for relative in paths:
 p=ROOT/relative
 if p.suffix!='.md':continue
 text=p.read_text()
 if relative=='reports/progress.md':text=text[text.index('## 2026-10-16 — actual notebook/header result and source-provenance checkpoint'):]
 if relative=='docs/release-validation.md':text=text[text.index('## October 16: actual notebook/header and documentary-source checkpoint'):]
 if relative=='STATUS.md':text=text[:text.index('Snapshot: 2026-10-11')]
 if relative=='GOAL.md':text=text[text.index('## Renewed active work'):text.index('## Completed preview release state')]
 for match in re.finditer(r'\[[^\]\n]*\]\(([^)\n]+)\)',text):
  target=match.group(1).strip('<>')
  if target.startswith(('https:','http:','#','mailto:')):continue
  local=(p.parent/target.split('#',1)[0]).resolve()
  result={'from':relative,'target':target,'exists':local.exists()}
  links.append(result)
  if not result['exists']:errors.append({'kind':'missing_local_link',**result})
# Preserve publication-map provenance without opening raw source objects.
for name,key in [('copy-map-first.json','records'),('public-copy-map.json','files'),('review-copy-map.json','files')]:
 data=json.loads((REPORT/name).read_text())
 for item in data[key]:
  src=(ROOT/item['source']).resolve()
  dest=(ROOT/item['destination']).resolve()
  assert src.is_relative_to(ROOT) and dest.is_relative_to(ROOT)
  assert not src.is_relative_to(ROOT/'.cache/li-v3-custody/objects')
  original=src.read_bytes()
  published=dest.read_bytes()
  if item.get('representation','exact')=='exact':
   reconstructed=published
  else:
   wrapped=json.loads(published)
   reconstructed=wrapped['text'].encode(wrapped['encoding'])
   assert len(reconstructed)==wrapped['bytes'] and sha256(reconstructed).hexdigest()==wrapped['sha256']
  expected=item.get('original_sha256',item.get('sha256'))
  expected_len=item.get('original_bytes',item.get('bytes'))
  okay=original==reconstructed and len(original)==expected_len and sha256(original).hexdigest()==expected
  if 'published_sha256' in item:okay=okay and sha256(published).hexdigest()==item['published_sha256']
  check={'ledger':name,'source':item['source'],'destination':item['destination'],'representation':item.get('representation','exact'),'pass':okay}
  copychecks.append(check)
  if not okay:errors.append({'kind':'copy_mismatch',**check})
# Original scaffold inventory is verified under its explicitly recorded renames.
old=json.loads((REPORT/'scaffold-inventory.json').read_text())
rename={'README.md':'scaffold-README.md','checkpoint.json':'scaffold-checkpoint.json','inventory.json':'scaffold-inventory.json'}
scaffold=[]
for name,identity in old['files'].items():
 p=REPORT/rename.get(name,name)
 raw=p.read_bytes()
 okay=len(raw)==identity['bytes'] and sha256(raw).hexdigest()==identity['sha256']
 scaffold.append({'original':name,'public':str(p.relative_to(REPORT)),'pass':okay})
 if not okay:errors.append({'kind':'scaffold_identity_mismatch','path':str(p)})
assert (REPORT/'inventory.json').read_bytes()==(REPORT/'scaffold-inventory.json').read_bytes()
# Compare accepted actual audit and finite-counting files with exact published copies.
for cache,public in [('.cache/phase2-notebook-header-actual-review-v1','reports/phase2-notebook-header-verification-v1/independent-actual-review'),('.cache/phase2-finite-risk-inversion-counting-v1','reports/phase2-finite-risk-inversion-design-v1/counting-review')]:
 for source in sorted((ROOT/cache).iterdir()):
  if source.is_file():
   dest=ROOT/public/source.name
   okay=dest.read_bytes()==source.read_bytes()
   check={'source':str(source.relative_to(ROOT)),'destination':str(dest.relative_to(ROOT)),'pass':okay}
   copychecks.append(check)
   if not okay:errors.append({'kind':'independent_audit_copy_mismatch',**check})
held=all((ROOT/p).stat().st_size==b['bytes'] and sha256((ROOT/p).read_bytes()).hexdigest()==b['sha256'] for p,b in bindings.items())
result={'status':'PASS' if not errors and held else 'REVIEW_NEEDED','checked_at':datetime.now(timezone.utc).isoformat(),'narrative_bindings':bindings,'narrative_bytes_held_during_check':held,'local_link_count':len(links),'copy_check_count':len(copychecks),'scaffold_identity_count':len(scaffold),'links':links,'copies':copychecks,'scaffold':scaffold,'errors':errors,'scope':'Publication byte and link checks only; no product test, network, source-reader invocation, private object read or scientific claim.'}
(BASE/'publication-checks.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
print(json.dumps({k:result[k] for k in ('status','checked_at','narrative_bytes_held_during_check','local_link_count','copy_check_count','scaffold_identity_count','errors')},indent=2))
