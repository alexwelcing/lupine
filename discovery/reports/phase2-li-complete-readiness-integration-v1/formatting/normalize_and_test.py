"""Remove one terminal blank line, preserve prior bytes, verify syntax and module."""
from pathlib import Path
import ast
import datetime
import hashlib
import json
import os
import subprocess
import sys
import time

H = Path(__file__).resolve().parent
R = H.parents[2]
I = H.parent
sha = lambda b: hashlib.sha256(b).hexdigest()
git = lambda *args: subprocess.check_output(['git',*args],cwd=R)
assert git('rev-parse','HEAD').decode().strip() == 'ddd4a6a8df0f908a162b7e5387b0faac325180d6'
publication = json.loads((I/'final-copyset.json').read_bytes())
expected = {'discovery/'+n for n in publication['files']}
assert set(git('diff','--cached','--name-only').decode().splitlines()) == expected
assert not git('diff','--name-only')
(H/'prior-final-copyset.json').write_bytes((I/'final-copyset.json').read_bytes())
git('restore','--staged','--',*publication['files'])
name = 'tests/test_li_v3_readiness_review.py'
raw = (R/name).read_bytes()
assert sha(raw) == '7ec52e6a72aef1b289503d187fa5966025a1d488ca60f55200d12fd9c10b85f0'
assert raw.endswith(b'\n\n') and not raw.endswith(b'\n\n\n')
new = raw[:-1]
assert ast.dump(ast.parse(raw),include_attributes=False) == ast.dump(ast.parse(new),include_attributes=False)
(H/'original-test.py').write_bytes(raw)
(H/'test_li_v3_readiness_review.py').write_bytes(new)
(R/name).write_bytes(new)
mp = R/'reports/runtime-manifest.json'
manifest = json.loads(mp.read_bytes())
assert manifest['files'][name] == sha(raw)
manifest['files'][name] = sha(new)
mp.write_text(json.dumps(manifest,indent=2)+'\n')
candidate = json.loads((R/'.cache/phase2-li-complete-readiness-production-v1/promotion-copyset.final.json').read_bytes())
for entry in candidate['entries']:
    if entry['destination'] == name:
        entry.update(source=str((H/'test_li_v3_readiness_review.py').relative_to(R)),
                     overlay=str((H/'test_li_v3_readiness_review.py').relative_to(R)),
                     bytes=len(new),sha256=sha(new),byte_identical=True)
candidate['formatting_only_correction'] = {'path':name,'original_sha256':sha(raw),'final_sha256':sha(new),
    'removed_bytes':1,'syntax_tree_identical':True,'original_author_copyset_preserved':True}
(I/'runtime-copyset.final.json').write_text(json.dumps(candidate,indent=2)+'\n')
hold = {n:sha((R/n).read_bytes()) for n in set(manifest['files']) | {'docs/li-v3-readiness.md','docs/li-v3-readiness-production.md'}}
command = [sys.executable,'-B','-m','unittest','discover','-s','tests','-p','test_li_v3_readiness_review.py','-v']
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
(H/'start.json').write_text(json.dumps({'at':started,'command':command,'hold':hold,
    'correction':candidate['formatting_only_correction']},indent=2)+'\n')
tick = time.monotonic()
with (H/'stdout.txt').open('xb') as out,(H/'stderr.txt').open('xb') as err:
    result = subprocess.run(command,cwd=R,env=dict(os.environ,PYTHONPATH=str(R/'src'),PYTHONDONTWRITEBYTECODE='1'),stdout=out,stderr=err)
receipt = {'started_at':started,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'process_seconds':time.monotonic()-tick,'exit_code':result.returncode,
    'source_unchanged':all(sha((R/n).read_bytes())==d for n,d in hold.items()),'held_files':len(hold),
    'correction':candidate['formatting_only_correction'],
    'stdout_sha256':sha((H/'stdout.txt').read_bytes()),'stderr_sha256':sha((H/'stderr.txt').read_bytes()),'actual_operations':0}
(H/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
print((H/'stderr.txt').read_text()[-500:])
raise SystemExit(result.returncode)
