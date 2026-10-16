from pathlib import Path
import json,hashlib,re,datetime
ROOT=Path.cwd();BASE=ROOT/'.cache/phase2-growth-predicate-verification-publication-v1';PROM=BASE/'promotion';DEST=Path('reports/phase2-growth-predicate-verification-v1');COMMIT='a064a2c0e4a7cce1fbcb0541f49aae132944e785'
def sha(raw):return hashlib.sha256(raw).hexdigest()
def jraw(d):return (json.dumps(d,indent=2,sort_keys=True)+'\n').encode()
def read(path):
 p=Path(path);assert not p.is_absolute() and '..' not in p.parts
 assert p.suffix in ('.json','.txt','.md','.py','.diff') and p.name!='private.json'
 assert not any(x in str(p) for x in ('li-v3-custody','projection-custody','growth-predicate-ci','growth-predicate-operations'))
 return (ROOT/p).read_bytes()
def write(path,raw):
 p=PROM/path;p.parent.mkdir(parents=True,exist_ok=True);assert not p.exists(),str(p);p.write_bytes(raw)
rows=[]
def copy(src,dest,meta=None):
 src=Path(src);raw=read(src)
 if meta:assert len(raw)==meta['bytes'] and sha(raw)==meta['sha256'],str(src)
 text=raw.decode();wrapper=src.suffix=='.diff' or bool(re.search(r'[ \t]+$',text,re.M)) or raw.endswith(b'\n\n')
 out=raw;method='EXACT_COPY'
 if wrapper:
  dest=Path(str(dest)+'.json');method='LOSSLESS_UTF8_WRAPPER';out=jraw({'schema':'lupine.lossless-utf8-evidence.v1','original_relative_path':str(src),'original_bytes':len(raw),'original_sha256':sha(raw),'reason':'Preserve historical diff/log bytes exactly without weakening tracked whitespace checks.','text':text})
 write(dest,out);rows.append({'source':str(src),'source_bytes':len(raw),'source_sha256':sha(raw),'destination':str(dest),'destination_bytes':len(out),'destination_sha256':sha(out),'method':method})
review=Path('.cache/phase2-growth-predicate-artifact-review-v1')
invraw=read(review/'inventory.json');assert sha(invraw)=='3adc07d68764febbc550c38d27b286541f644e835f19dd5dd92659260188622f'
inv=json.loads(invraw);assert len(inv['files'])==37
for rel,meta in sorted(inv['files'].items()):copy(review/rel,DEST/'independent-artifact-review'/rel,meta)
for rel in ('inventory.json','handoff.json'):copy(review/rel,DEST/'independent-artifact-review'/rel)
package=Path('.cache/phase2-growth-predicate-clean-package-v1')
for index in (0,1):
 for suffix in ('execution.json','start.json','stdout.txt','stderr.txt'):copy(package/f'{index}-{suffix}',DEST/'clean-package'/f'{index}-{suffix}')
copy(package/'artifacts/release-artifacts.json',DEST/'clean-package/artifacts/release-artifacts.json')
release=Path('.cache/phase2-growth-predicate-release-v1')
release_files=('final-reviewed-pins.json','artifact-reviewed-pins.json','published.json','final-copyset.json','first-finalization-hold-failure.json','finalize-before-final-hold.py','finalize_publication.py','publish.py','package.py','pr-body-pending.json','pr-patch-pending.json','pr-verified-pending.json','update_pr.py')
for rel in release_files:copy(release/rel,DEST/'publication'/rel)
manifest=json.loads(read(package/'artifacts/release-artifacts.json'));assert manifest['source']['git_commit']==COMMIT
v=manifest['verification'];assert v['case_count']==28 and len(v['problem_schemas'])==6 and len(v['checks'])==16 and v['status']=='passed'
assert manifest['source']['archived_file_count']==5003 and manifest['source']['runtime_manifest']['file_count']==335
for index in (0,1):
 d=json.loads(read(package/f'{index}-execution.json'))
 assert d['commit']==COMMIT and d['exit_code']==0 and d['source_unchanged'] and d['head_unchanged'] and d['worktree_clean']
 assert len(d['runtime_before'])==335 and d['runtime_before']==d['runtime_after']
 for stream in ('stdout','stderr'):assert sha(read(package/f'{index}-{stream}.txt'))==d[stream+'_sha256']
 assert read(package/f'{index}-stderr.txt')==b''
r=json.loads(read(review/'actual-review.json'));assert r['result']['exact_source_archive_Git_file_count']==5003 and r['result']['runtime_files']==335 and r['result']['unchanged_predecessor_runtime_files']==332 and r['result']['wheel_package_members_unchanged']==108
assert [x['exit_code'] for x in r['actual_executions']]==[0,1,0]
pins=json.loads(read(release/'final-reviewed-pins.json'));artpins=json.loads(read(release/'artifact-reviewed-pins.json'));assert pins['baseline_commit']=='9766b6838388c35a92d32b1a60e65613c72b3fee' and artpins['baseline_commit']=='c17c4c6b152af2e7bc1b7a7639336f6b0f733ace' and pins['files']==artpins['files']
readme='''# G34 retained package and artifact verification

The clean package and retained-artifact verifier completed successfully for
`a064a2c0e4a7cce1fbcb0541f49aae132944e785`. The retained
[release record](clean-package/artifacts/release-artifacts.json) reports **28
cases, 6 problem schemas and 16 required installed-package checks**. The
[package receipt](clean-package/0-execution.json) records 34.855678 seconds and
the [verifier receipt](clean-package/1-execution.json) 1.493245 seconds; both exit
0 with empty stderr, clean unchanged HEAD and all 335 runtime files held.
These are completed local engineering operations, not a whole-CI claim.

The [independent artifact review](independent-artifact-review/actual-review.md)
matched **5,003 source files** to the exact Git revision and **335 runtime
files** to the archive and working tree. The additive audit confirmed all
**332 predecessor runtime files unchanged**, exactly three new runtime files,
all four reviewed source/test/contract pins and **108 wheel package payload
members unchanged** against both retained and Git baselines. Its wheel checks
also covered 115 members and 114 RECORD content digests. The full and corrected
additive results are bound by [actual-review.json](independent-artifact-review/actual-review.json).

The first generic audit passed. The first additive audit failed an exact
metadata-baseline assertion: the [integration pin record](publication/final-reviewed-pins.json)
named the immediate parent `9766b683`, while the predeclared artifact comparison
baseline was `c17c4c6b`. A separate [artifact pin record](publication/artifact-reviewed-pins.json)
now states both roles. The **unchanged additive auditor** passed in a distinct
recorded invocation; the generic audit was not rerun. This was a pin-record
role mismatch, not a product test failure. The first failed receipt, logs,
original pin record, recorder change and preparation evidence are preserved.
No auditor assertion was weakened.

The [publication receipt](publication/published.json) records the pushed commit
and exact branch state. The [draft PR verification](publication/pr-verified-pending.json)
records PR #263 at that same HEAD, with CI pending at that observation. These
are historical observations, not a current CI result. This bundle intentionally
contains no new actual scientific-source operation or CI outcome; root owns
those later gate/result additions separately. The earlier publication hold
failure is also retained: an intermediate Rhizo copy inventory changed before
copying, and its hash gate stopped before any Rhizo tracked write.

The independent artifact reviewer checked bytes and recorded engineering
results without running package contents, tests or scientific source readers.
This publication preparation only copied and checked authorized public evidence.
No archive/wheel binary, private object or cache tree is included, and none was
opened by the publication preparer. Artifact identities remain in the release
record; this is not a bit-reproducible-build, physical-validation, independent
scientific-reproduction or recommendation-superiority claim. Prior scientific
blocks and negative findings remain unchanged.

[publication-copy-map.json](publication-copy-map.json) gives explicit original
and destination paths and SHA256 identities. Historical diffs or whitespace-
bearing logs use lossless UTF-8 JSON wrappers; original bytes reconstruct exactly
and original inventories retain their historical paths/hashes. Other evidence
is copied byte-for-byte. [publication-checks.json](publication-checks.json)
records file, receipt, link and whitespace checks. Source paths in historical
records are provenance rather than a request to open inputs.
'''
write(DEST/'README.md',readme.encode())
copy_map={'schema':'lupine.growth-predicate-verification-publication-map.v1','created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commit':COMMIT,'scope':'Package/artifact evidence only; no archive or wheel binary, private raw data, new actual source-operation receipt or CI result read/copied.','destination_root':str(DEST),'source_entry_count':len(rows),'entries':rows,'generated_files':['README.md','publication-copy-map.json','publication-checks.json'],'historical_markdown_link_repairs':[],'pending_root_additions':['exact-commit CI observations','actual source-operation records and independent public-receipt audit']}
write(DEST/'publication-copy-map.json',jraw(copy_map))
# Create the exact prospective check-record target before checking navigation.
write(DEST/'publication-checks.json',jraw({'status':'ASSEMBLING'}))
links=[];reconstructed=[]
for row in rows:
 out=(PROM/row['destination']).read_bytes();assert sha(out)==row['destination_sha256']
 raw=json.loads(out)['text'].encode() if row['method']=='LOSSLESS_UTF8_WRAPPER' else out
 assert len(raw)==row['source_bytes'] and sha(raw)==row['source_sha256'];reconstructed.append(row['source'])
for p in sorted((PROM/DEST).rglob('*')):
 if not p.is_file():continue
 raw=p.read_bytes();text=raw.decode();assert not re.search(r'[ \t]+$',text,re.M) and not raw.endswith(b'\n\n'),str(p)
 if p.suffix=='.json':json.loads(text)
 if p.suffix=='.md':
  for link in re.findall(r'\]\(([^)]+)\)',text):
   if '://' in link or link.startswith('#'):continue
   target=(p.parent/link.split('#')[0]).resolve();assert target.exists(),(str(p),link)
   links.append({'source':str(p.relative_to(PROM)),'target':link,'exists':True})
checks={'schema':'lupine.growth-predicate-verification-publication-checks.v1','status':'PASS_BYTE_RECEIPT_LINK_AND_WHITESPACE_CHECKS','created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_entries_reconstructed':len(rows),'lossless_wrapper_entries':sum(x['method']=='LOSSLESS_UTF8_WRAPPER' for x in rows),'independent_inventory_files_verified':37,'package_execution_log_bindings_verified':2,'package_summary':{'cases':28,'schemas':6,'checks':16},'review_summary':{'source_files':5003,'runtime_files':335,'old_runtime_unchanged':332,'unchanged_wheel_payload':108,'first_additive_failure_preserved':True,'generic_and_corrected_additive_pass':True},'relative_markdown_links':links,'source_entries':reconstructed,'product_tests_run':0,'source_operations_run':0,'archive_or_wheel_binaries_read':0,'private_inputs_read':0,'CI_claim':'No new CI observation included.'}
(PROM/DEST/'publication-checks.json').write_bytes(jraw(checks))
files={str(p.relative_to(PROM)):{'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in sorted((PROM/DEST).rglob('*')) if p.is_file()}
inventory={'files':files,'file_count':len(files),'total_bytes':sum(v['bytes'] for v in files.values())};(BASE/'inventory.json').write_bytes(jraw(inventory))
handoff={'status':'FROZEN_PACKAGE_ARTIFACT_PUBLICATION_READY','commit':COMMIT,'promotion_root':str(PROM.relative_to(ROOT)),'destination_root':str(DEST),'source_entries':len(rows),'files':len(files),'bytes':inventory['total_bytes'],'inventory_sha256':sha((BASE/'inventory.json').read_bytes()),'copy_map_sha256':sha((PROM/DEST/'publication-copy-map.json').read_bytes()),'readme_sha256':sha((PROM/DEST/'README.md').read_bytes()),'checks_sha256':sha((PROM/DEST/'publication-checks.json').read_bytes()),'builder_sha256':sha((BASE/'prepare.py').read_bytes()),'wrappers':checks['lossless_wrapper_entries'],'relative_links':len(links),'no_binaries_private_actual_or_CI_records':True,'no_tests_or_source_operations_rerun':True,'root_additions_remain_separate':True}
(BASE/'handoff.json').write_bytes(jraw(handoff));print(json.dumps(handoff,indent=2));print('handoff_sha256',sha((BASE/'handoff.json').read_bytes()))
