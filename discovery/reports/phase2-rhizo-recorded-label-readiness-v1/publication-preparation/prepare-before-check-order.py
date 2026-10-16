from pathlib import Path
import hashlib,json,datetime,re
ROOT=Path.cwd()
BASE=ROOT/'.cache/phase2-rhizo-recorded-label-publication-v1'
DEST=Path('reports/phase2-rhizo-recorded-label-readiness-v1')
PROM=BASE/'promotion'
rows=[]
def digest(raw): return hashlib.sha256(raw).hexdigest()
def jsonbytes(d): return (json.dumps(d,indent=2,sort_keys=True)+'\n').encode()
def read_public(path):
    p=Path(path)
    assert 'private.json' not in p.parts and 'projection-custody' not in p.parts and 'li-v3-custody' not in p.parts,str(p)
    return (ROOT/p).read_bytes()
def write(dest,raw):
    p=PROM/dest;p.parent.mkdir(parents=True,exist_ok=True)
    if p.exists(): assert p.read_bytes()==raw,str(dest)
    else: p.write_bytes(raw)
def copy(src,dest,expected=None):
    raw=read_public(src)
    if expected: assert len(raw)==expected['bytes'] and digest(raw)==expected['sha256'],str(src)
    out=raw; method='EXACT_COPY'; why=None
    text=raw.decode('utf-8')
    badwhite=bool(re.search(r'[ \t]+$',text,re.M)) or (raw.endswith(b'\n\n'))
    if badwhite:
        # Never normalize source bytes; preserve exact UTF-8 text and hashes.
        out=jsonbytes({'schema':'lupine.lossless-utf8-evidence.v1','original_relative_path':str(src),'original_bytes':len(raw),'original_sha256':digest(raw),'reason':'Lossless historical evidence wrapper; original whitespace retained in text without weakening tracked whitespace checks.','text':text})
        dest=Path(str(dest)+'.json');method='LOSSLESS_UTF8_WRAPPER';why='WHITESPACE'
        # Author had already frozen a lossless wrapper. Reuse those reviewed bytes.
        sibling=Path(str(src)+'.json')
        if (ROOT/sibling).is_file():
            candidate=read_public(sibling)
            try:d=json.loads(candidate)
            except json.JSONDecodeError:d={}
            if d.get('text','').encode()==raw and d.get('original_sha256')==digest(raw):out=candidate;why='EXISTING_LOSSLESS_WRAPPER'
    write(dest,out)
    rows.append({'source':str(src),'source_bytes':len(raw),'source_sha256':digest(raw),'destination':str(dest),'destination_bytes':len(out),'destination_sha256':digest(out),'method':method,**({'reason':why} if why else {})})
def inventory_tree(source,dest):
    source=Path(source);inv=json.loads(read_public(source/'inventory.json'))
    for rel,meta in sorted(inv['files'].items()):copy(source/rel,dest/rel,meta)
    for rel in ('inventory.json','handoff.json'):copy(source/rel,dest/rel)

inventory_tree('.cache/phase2-rhizo-recorded-label-candidate-v1',DEST/'author')
inventory_tree('.cache/phase2-rhizo-recorded-label-review-v1',DEST/'independent-review')
inventory_tree('.cache/phase2-rhizo-recorded-label-actual-review-v1',DEST/'actual-review')
for rel in ('run_actual_once.py','public-summary.json','actual-execution/start.json','actual-execution/execution.json','actual-execution/stdout.json','actual-execution/stderr.txt'):
    copy(Path('.cache/phase2-rhizo-recorded-label-operations-v1')/rel,DEST/'operations'/rel)
for rel,dest in [('reviewed-invocation.json','invocation.json'),('actual/public.json','public.json'),('actual/reservation.json','reservation.json')]:
    copy(Path('.cache/phase2-rhizo-recorded-label-candidate-v1')/rel,DEST/'actual'/dest)
for rel in ('README.md','source-bindings.json'):
    copy(Path('.cache/phase2-rhizo-label-readiness-decision-v1')/rel,DEST/'priority-decision'/rel)

summary=json.loads(read_public('.cache/phase2-rhizo-recorded-label-operations-v1/public-summary.json'))
public=read_public('.cache/phase2-rhizo-recorded-label-candidate-v1/actual/public.json')
assert digest(public)==summary['public_sha256']=='b444e7d33cb18619942c2dfbb5cd3374fd9cd9adee6732825ce20ed431641a33'
assert summary['all_144_pairs_complete'] and summary['objects_read_and_projected']==36
assert summary['position_state_counts']['tolerance_state']=={'NULL':144}
assert summary['scientific_status']=='NOT_ADMITTED' and summary['actual_reference_choice']=='UNKNOWN'
assert not summary['residuals_ranks_fits_splits_or_performance_computed']
assert summary['first_label_issue'] is None and summary['output_error'] is None
readme='''# Rhizo stored-label readiness: completed historical inspection

One actual operation inspected **36 retained bound objects (126,885 bytes)** and
all **144 fixed stored prediction/reference positions** on 2026-10-16 at
12:16:28 UTC. All positions have one record, matching literal units, exact JSON
numbers within the declared engineering bounds and nonempty citation strings.
All 144 optional tolerances are **NULL**. The [public receipt](actual/public.json)
and [summary](operations/public-summary.json) record no label issue or output
error; the [execution receipt](operations/actual-execution/execution.json) records
exit 0 and empty stderr. No prediction-error values, residuals, rankings, fits,
splits or performance comparisons were computed.

Scientific status remains **NOT_ADMITTED** and historical reference choice
**UNKNOWN**. These are stored archival numbers: presence, exact serialized-number
validity and literal unit agreement do not establish physical accuracy, source
selection, citation adequacy or independent experimental units. The original
36-ID, 43-reference-location and 172-candidate-edge context is retained without
choosing a reference. No reference container or binder was invoked by this pass.

The whole mixed JSON buffers were read and parsed. Historical labels and
citations were materialized and a private projection was written. That projection
and every raw source object are excluded from this publication and were not read
by the publication preparer. A false `private_projection_returned` flag describes
the wrapper return, not absence of private processing. No researcher inspection
of the numerical projection is claimed here, and these data are not a fresh
holdout. The [public-receipt review](actual-review/README.md) checks public/source
consistency; it does not independently recompute from private data.

The [frozen contract](author/contract.json) preceded implementation and the
[generated candidate](author/README.md) passed 30 author tests. The
[independent review](independent-review/README.md) passed 19 methods on its third
invocation. Its first two failed harness invocations remain preserved: a
bytecode-cache read was blocked, then relative temporary cleanup paths were
misresolved. Candidate and test bytes remained unchanged. These software checks
are distinct from the single actual inspection and do not establish science.
The actual operation used held source `13f1f4ee` and recorded 332 runtime files
unchanged at repository checkpoint `9766b683`.

The [priority decision](priority-decision/README.md) closes the stored-field
readiness question for this fixed archive and gives the next substantial
scientific effort to a bounded Li source-admission decision. It defines or
executes no numerical census and supplies no G20/G21 screening pass. A later
census would require a declared estimand and reporting rule; NULL tolerances
supply no success threshold or uncertainty bound.

[publication-copy-map.json](publication-copy-map.json) binds every original to
its explicit destination and SHA256. Exact copies are retained where possible;
whitespace-bearing logs use lossless UTF-8 JSON wrappers. Original inventory
paths still identify the original byte streams and can be reconstructed from
the map; their hashes were not rewritten. Preoperation statements in the author
and generated-review snapshots remain historical, and do not override the
completed actual receipt. [publication-checks.json](publication-checks.json)
records reconstruction, link and whitespace checks; no product or source test
was rerun to assemble this report.

The fixed public [input-object metadata](../phase2-rhizo-reference-readiness-v1/bound-label-scope/objects.json)
and [reference context frame](../phase2-rhizo-reference-readiness-v1/design/reference-frame.json)
remain in the earlier report. Source paths in historical JSON manifests are
provenance records rather than instructions to read private inputs.
'''
write(DEST/'README.md',readme.encode())
copy_map={'schema':'lupine.rhizo.recorded-label-publication-map.v1','created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Completed historical readiness public evidence only. Exact generated-data inventories plus separately identified actual public records. No actual/private.json, raw evidence/reference object, or private projection read or copied.','destination_root':str(DEST),'source_entry_count':len(rows),'entries':rows,'historical_statements':'Author and generated reviewer snapshots were frozen before actual operation and remain historical. Original inventory paths/hashes identify original bytes; wrappers reconstruct those bytes.','private_exclusions':['.cache/phase2-rhizo-recorded-label-candidate-v1/actual/private.json','all raw retained objects','all private documentary projections'],'generated_publication_files':['README.md','publication-copy-map.json','publication-checks.json'],'markdown_link_repairs':[]}
write(DEST/'publication-copy-map.json',jsonbytes(copy_map))
checks=[]
for row in rows:
    p=PROM/row['destination'];raw=p.read_bytes();assert digest(raw)==row['destination_sha256']
    reconstructed=json.loads(raw)['text'].encode() if row['method']=='LOSSLESS_UTF8_WRAPPER' else raw
    assert digest(reconstructed)==row['source_sha256'] and len(reconstructed)==row['source_bytes']
    checks.append('SOURCE_RECONSTRUCTION:'+row['source'])
links=[]
for p in sorted((PROM/DEST).rglob('*')):
    if not p.is_file():continue
    raw=p.read_bytes();text=raw.decode()
    assert not re.search(r'[ \t]+$',text,re.M) and not raw.endswith(b'\n\n'),str(p)
    if p.suffix=='.json':json.loads(text)
    if p.suffix=='.md':
        for target in re.findall(r'\]\(([^)]+)\)',text):
            if '://' in target or target.startswith('#'):continue
            target=target.split('#')[0];local=(p.parent/target).resolve()
            exists=local.exists()
            if not exists:
                rel=local.relative_to(PROM.resolve());exists=(ROOT/rel).exists()
            assert exists,(str(p),target)
            links.append({'source':str(p.relative_to(PROM)),'target':target,'exists':True})
checkdoc={'status':'PASS_PUBLICATION_BYTE_AND_LINK_CHECKS','created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'reconstructed_source_entries':len(rows),'lossless_wrapper_entries':sum(r['method']=='LOSSLESS_UTF8_WRAPPER' for r in rows),'unique_destination_files_before_check_record':len(list((PROM/DEST).rglob('*')))-sum(p.is_dir() for p in (PROM/DEST).rglob('*')),'relative_markdown_links':links,'checks':checks,'actual_private_projection_reads':0,'actual_raw_object_reads':0,'source_operations':0,'product_tests_run':0,'claim_check':'Public actual summary matches 144 complete positions,36 objects,144 NULL tolerances,UNKNOWN choice,NOT_ADMITTED,no performance computed.'}
write(DEST/'publication-checks.json',jsonbytes(checkdoc))
files={str(p.relative_to(PROM)):{'bytes':p.stat().st_size,'sha256':digest(p.read_bytes())} for p in sorted((PROM/DEST).rglob('*')) if p.is_file()}
(BASE/'promotion-inventory.json').write_bytes(jsonbytes({'files':files,'file_count':len(files),'total_bytes':sum(v['bytes'] for v in files.values())}))
(BASE/'handoff.json').write_bytes(jsonbytes({'status':'PUBLICATION_BUNDLE_READY','destination_root':str(DEST),'promotion_root':str(PROM.relative_to(ROOT)),'source_entries':len(rows),'promoted_files':len(files),'promoted_bytes':sum(v['bytes'] for v in files.values()),'copy_map_sha256':digest((PROM/DEST/'publication-copy-map.json').read_bytes()),'readme_sha256':digest((PROM/DEST/'README.md').read_bytes()),'checks_sha256':digest((PROM/DEST/'publication-checks.json').read_bytes()),'inventory_sha256':digest((BASE/'promotion-inventory.json').read_bytes()),'private_projection_or_raw_objects_read':False,'source_operations_or_tests_rerun':False,'scientific_status':'NOT_ADMITTED','actual_reference_choice':'UNKNOWN'}))
print((BASE/'handoff.json').read_text())
print('handoff_sha256',digest((BASE/'handoff.json').read_bytes()))
