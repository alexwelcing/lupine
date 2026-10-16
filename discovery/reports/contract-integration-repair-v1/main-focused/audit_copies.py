from pathlib import Path
import base64,hashlib,json
R=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery').is_dir());result=[]
for d in ('reports/bridge-fixture-repair-v1','reports/supervisor-test-isolation-v1'):
 count=0;failures=[]
 for p in (R/d).rglob('*.json'):
  v=json.loads(p.read_text())
  if not isinstance(v,dict) or v.get('encoding')!='base64':continue
  raw=base64.b64decode(v['data'],validate=True);assert hashlib.sha256(raw).hexdigest()==v['sha256'];assert len(raw)==v['bytes'];assert raw==(R/v['original_path']).read_bytes();count+=1
  if b'FAILED' in raw or b'Traceback' in raw:failures.append(str(p.relative_to(R)))
 result.append({'directory':d,'exact_wrappers_verified':count,'preserved_failure_wrappers':failures})
p=Path(__file__).parent/'copy-audit.json';p.write_text(json.dumps({'schema':'repair_evidence_copy_review.v1','status':'PASS','bundles':result,'scope':'Read-only restoration/copy audit; focusedtest receipt separate.'},indent=2)+'\n');print(hashlib.sha256(p.read_bytes()).hexdigest());print([(r['directory'],r['exact_wrappers_verified']) for r in result])
