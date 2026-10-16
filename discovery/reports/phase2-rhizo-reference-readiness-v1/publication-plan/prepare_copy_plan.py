"""Prepare only declared, completed preoperation Rhizo evidence for publication."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import subprocess

ROOT = Path('/workspace/lupine-discovery-branch/discovery')
OUT = ROOT / '.cache/phase2-rhizo-publication-plan-v1'
TARGET = 'reports/phase2-rhizo-reference-readiness-v1'
BUNDLES = {
    'design': ROOT / '.cache/phase2-rhizo-reference-readiness-design-v1',
    'projector': ROOT / '.cache/phase2-rhizo-reference-projector-v1',
    'independent-review': ROOT / '.cache/phase2-rhizo-reference-projector-review-v1',
}
sha = lambda b: hashlib.sha256(b).hexdigest()
def save(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, sort_keys=True) + '\n')
def rel(path):
    return str(path.relative_to(ROOT))

pi = json.loads((BUNDLES['projector'] / 'inventory.json').read_text())
ri = json.loads((BUNDLES['independent-review'] / 'inventory.json').read_text())
allowed = {
    'design': sorted(str(p.relative_to(BUNDLES['design'])) for p in BUNDLES['design'].rglob('*') if p.is_file()),
    'projector': sorted([*pi['files'], 'inventory.json', 'handoff.json']),
    'independent-review': sorted([*(r['path'] for r in ri['files']), 'inventory.json', 'handoff.json']),
}
assert {k:len(v) for k,v in allowed.items()} == {'design':12, 'projector':41, 'independent-review':28}
source = {}
for bundle, names in allowed.items():
    for name in names:
        assert not set(PurePosixPath(name).parts) & {'actual','actual-execution','__pycache__'}
        assert name not in {'reviewed-invocation.json','run_actual_once.py'}
        path = BUNDLES[bundle] / name
        assert path.is_file() and not path.is_symlink()
        raw = path.read_bytes()
        source[(bundle,name)] = raw
for name, row in pi['files'].items():
    raw = source['projector',name]
    assert len(raw) == row['bytes'] and sha(raw) == row['sha256']
for row in ri['files']:
    raw = source['independent-review',row['path']]
    assert len(raw) == row['bytes'] and sha(raw) == row['sha256']
ph = json.loads(source['projector','handoff.json'])
rh = json.loads(source['independent-review','handoff.json'])
assert ph['inventory']['sha256'] == sha(source['projector','inventory.json'])
assert rh['inventory_sha256'] == sha(source['independent-review','inventory.json'])
layout = json.loads(source['projector','publication-layout.json'])
wrappers = []
omit = set()
for item in layout['wrappers']:
    raw = source['projector', item['omit_raw_on_publication']]
    wrapper = json.loads(source['projector', item['copy_wrapper']])
    assert wrapper['text'].encode('utf-8') == raw
    assert wrapper['original_bytes'] == len(raw)
    assert wrapper['original_sha256'] == sha(raw) == item['original_sha256']
    omit.add(('projector', item['omit_raw_on_publication']))
    wrappers.append({'kind':'author_existing_lossless_utf8', 'original':rel(BUNDLES['projector']/item['omit_raw_on_publication']),
        'original_sha256':sha(raw), 'original_bytes':len(raw),
        'published_wrapper':f"{TARGET}/projector/{item['copy_wrapper']}",
        'wrapper_sha256':sha(source['projector',item['copy_wrapper']]),
        'note':'Prescribed by held author publication-layout; original bytes reconstruct from text UTF-8.'})
repair_key = ('independent-review','reviewed-contract.md')
original = source[repair_key]
old = b'](scope.json)'
new = b'](../projector/scope.json)'
assert original.count(old) == 1
repaired = original.replace(old,new)
repair_target = f'{TARGET}/independent-review/reviewed-contract.md'
repair_file = OUT / 'overrides' / repair_target
repair_file.parent.mkdir(parents=True,exist_ok=True)
repair_file.write_bytes(repaired)
original_target = f'{TARGET}/independent-review/reviewed-contract.original.json'
original_file = OUT / 'overrides' / original_target
save(original_file, {'schema':'lupine.lossless-utf8-publication-original.v1',
    'reason':'Preserve exact original Markdown while repairing one relocated scope link in the readable copy.',
    'original':rel(BUNDLES['independent-review']/'reviewed-contract.md'),
    'original_bytes':len(original),'original_sha256':sha(original),'text':original.decode('utf-8')})
assert json.loads(original_file.read_text())['text'].encode('utf-8') == original
entries = []
for (bundle,name), raw in sorted(source.items()):
    if (bundle,name) in omit:
        continue
    origin = BUNDLES[bundle]/name
    target = f'{TARGET}/{bundle}/{name}'
    copy_from = repair_file if (bundle,name) == repair_key else origin
    data = repaired if (bundle,name) == repair_key else raw
    entries.append({'original':rel(origin),'original_sha256':sha(raw),'copy_from':rel(copy_from),
        'published':target,'bytes':len(data),'sha256':sha(data),
        'mode':'one_link_relocation' if (bundle,name)==repair_key else 'exact_copy'})
entries.append({'original':rel(BUNDLES['independent-review']/'reviewed-contract.md'),
    'original_sha256':sha(original),'copy_from':rel(original_file),'published':original_target,
    'bytes':original_file.stat().st_size,'sha256':sha(original_file.read_bytes()),'mode':'lossless_original_utf8'})
entries.sort(key=lambda row:row['published'])
assert len(entries) == 80 and len({r['published'] for r in entries}) == 80
published = {r['published']: (ROOT/r['copy_from']).read_bytes() for r in entries}
links = []
for path, raw in published.items():
    if not path.endswith('.md'):
        continue
    for match in re.finditer(r'\[[^\]]*\]\(([^)]+)\)',raw.decode('utf-8')):
        dest = match.group(1).strip('<>')
        if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:',dest) or dest.startswith('#'):
            continue
        path_only = dest.split('#',1)[0]
        resolved = posixpath.normpath(str(PurePosixPath(path).parent / path_only))
        assert resolved in published, (path,dest,resolved)
        links.append({'from':path,'target':dest,'resolved':resolved})
assert len(links) == 17
whitespace = []
for row in entries:
    result = subprocess.run(['git','-c','core.whitespace=blank-at-eol,blank-at-eof,space-before-tab',
        'diff','--no-index','--check','/dev/null',str(ROOT/row['copy_from'])],cwd=ROOT,capture_output=True)
    assert result.returncode in {0,1} and not result.stdout and not result.stderr, row['published']
    whitespace.append(row['published'])
for (bundle,name), raw in source.items():
    assert (BUNDLES[bundle]/name).read_bytes() == raw
save(OUT/'source-bindings.json',{'scope':'Only completed preoperation bundle files; no actual-operation files included or read.',
    'sources':[{ 'path':rel(BUNDLES[b]/n),'bytes':len(raw),'sha256':sha(raw)} for (b,n),raw in sorted(source.items())]})
save(OUT/'copy-map.json',{'schema':'lupine.rhizo.preoperation-publication-copy-plan.v1',
    'created_at':datetime.now(timezone.utc).isoformat(),'source_files':81,'publication_files':80,
    'entries':entries,'explicitly_excluded':['projector/actual/**','projector/actual-execution/**',
        'projector/reviewed-invocation.json','projector/run_actual_once.py','all __pycache__/**'],
    'rule':'Copy only explicit rows, then stage every row explicitly and reconcile Git index/commit blobs by SHA-256; no glob or ignored-file assumptions.'})
save(OUT/'lossless-wrappers.json',{'existing_author_wrappers':wrappers,'new_whitespace_wrappers':[],
    'relocation_original_wrapper':{'published':original_target,'sha256':sha(original_file.read_bytes()),
        'original_sha256':sha(original),'reason':'Exact original preservation, not a whitespace correction.'}})
save(OUT/'relocation-link-repairs.json',{'repairs':[{'original':rel(BUNDLES['independent-review']/'reviewed-contract.md'),
    'original_sha256':sha(original),'published':repair_target,'published_sha256':sha(repaired),
    'old_target':'scope.json','new_target':'../projector/scope.json','occurrences':1,'original_wrapper':original_target}]})
save(OUT/'validation.json',{'status':'PASS_PREOPERATION_COPY_PLAN','source_files_held':81,
    'publication_rows':80,'exact_copy_rows':78,'one_link_relocations':1,'relocation_original_wrappers':1,
    'existing_author_stderr_wrappers':2,'new_whitespace_wrappers':0,'relative_markdown_links':links,
    'whitespace_checked_files':whitespace,'source_inventory_hashes_valid':True,
    'source_files_unchanged_after_check':True,'tests_run':False,'project_imports':False,
    'actual_operation_or_private_source_reads':False,'tracked_edits':False,
    'limitations':['This is a preoperation historical evidence copy plan; zero-operation statements describe those earlier bundles.',
        'Root adds actual receipts, documentary conclusions and project documentation separately.',
        'No staging, committed-blob, remote or CI inclusion is established by this plan.']})
print(json.dumps({'status':'PASS_PREOPERATION_COPY_PLAN','sources':81,'publication_files':80,
    'author_wrappers':2,'new_whitespace_wrappers':0,'link_repairs':1,'links':len(links)}))
