"""Publication metadata/byte audit only; no product imports or source readers."""
from pathlib import Path
import datetime
import hashlib
import json
import re
import subprocess

ROOT = Path.cwd()
OUT = ROOT / '.cache/phase2-growth-publication-review-v1'
REPORTS = ('reports/phase2-growth-implementation-v1', 'reports/phase2-bam-encoding-comparison-v1')
CHECKPOINTS = ('GOAL.md', 'STATUS.md', 'reports/progress.md', 'reports/continuation.json', 'docs/release-validation.md')
DENIED = ('.cache/li-v3-custody/', '.cache/phase2-bam-schema-documentary-v1/schema.csv',
          '.cache/phase2-bam-encoding-comparison-v1/internal-ascii-projection.json')
seen = {}
checks = []
failures = []

def sha(raw): return hashlib.sha256(raw).hexdigest()
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def read(name):
    name = str(name)
    assert not any(name.startswith(p) for p in DENIED), name
    path = ROOT / name
    assert path.resolve().is_relative_to(ROOT)
    raw = path.read_bytes()
    identity = {'bytes': len(raw), 'sha256': sha(raw)}
    if name in seen: assert seen[name] == identity, ('changed during audit', name)
    seen[name] = identity
    return raw
def obj(name): return json.loads(read(name))
def check(condition, label):
    checks.append(label)
    if not condition: failures.append(label)
def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, check=True).stdout
def stamp(value): return datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))

started = now()
head = git('rev-parse', 'HEAD').decode().strip()
growth = obj(REPORTS[0] + '/publication-map.json')
wrappers = {x['original_published_path']: x for x in growth['lossless_wrappers']}
check(len(growth['copies']) == 225, '225 root copy entries')
check(len(wrappers) == 3, '3 explicit wrappers')
check(len({x['published'] for x in growth['copies']}) == 225, 'unique root copy destinations')
for item in growth['copies']:
    original = read(item['original'])
    check(len(original) == item['bytes'] and sha(original) == item['sha256'], 'original identity ' + item['original'])
    name = item['published']
    if name in wrappers:
        wrapper = obj(wrappers[name]['wrapper'])
        restored = wrapper['text'].encode('utf-8')
        check(wrapper['representation'] == 'lossless_utf8_text', 'wrapper format ' + name)
        check(wrapper['original_sha256'] == sha(original) == wrappers[name]['original_sha256'], 'wrapper digest ' + name)
        check(wrapper['original_bytes'] == len(original) and restored == original, 'wrapper reconstruction ' + name)
        check(not (ROOT / name).exists(), 'wrapped original path absent ' + name)
    else:
        check(read(name) == original, 'exact root copy ' + name)

bam = obj(REPORTS[1] + '/publication-map.json')
check(len(bam['originals']) == 27 and len(bam['retained_not_published']) == 2, 'BAM 27 source copies and 2 explicit omissions')
for item in bam['originals']:
    raw = read(item['original_path'])
    check(len(raw) == item['bytes'] and sha(raw) == item['sha256'], 'BAM original identity ' + item['original_path'])
    check(raw == read(item['published_path']), 'BAM exact copy ' + item['published_path'])
check(bam['raw_or_internal_text_body_copied'] is False, 'BAM no claimed raw body copy')
published = [p for directory in REPORTS for p in (ROOT / directory).rglob('*') if p.is_file()]
published_identities = {sha(read(p.relative_to(ROOT))) for p in published}
for item in bam['retained_not_published']:
    check(item['sha256'] not in published_identities, 'omitted body digest absent ' + item['path'])
check(all(p.suffix.lower() not in ('.csv', '.xlsx', '.ipynb', '.zip') for p in published), 'no raw source-format publication files')

pins = obj('.cache/phase2-growth-release-v1/final-reviewed-pins.json')
check(len(pins['files']) == 8, 'eight reviewed source/test/contract pins')
for name, digest in pins['files'].items(): check(sha(read(name)) == digest, 'current reviewed pin ' + name)
manifest = obj('reports/runtime-manifest.json')['files']
baseline = json.loads(git('show', pins['baseline_commit'] + ':discovery/reports/runtime-manifest.json'))['files']
check(len(manifest) == 332 and len(baseline) == 326, '332 current and 326 baseline manifest entries')
check(all(manifest.get(k) == v for k,v in baseline.items()), 'all 326 predecessor identities retained')
check(set(manifest) - set(baseline) == {k for k in pins['files'] if not k.startswith('docs/')}, 'exact six runtime additions')
extensions = {'.toml', '.py', '.json', '.html', '.css', '.js', '.svg'}
runtime_paths = {Path('pyproject.toml')}
for directory in ('scripts', 'tests', 'src/lupine_discovery'):
    runtime_paths.update(p.relative_to(ROOT) for p in (ROOT / directory).rglob('*')
                         if p.is_file() and '__pycache__' not in p.parts and p.suffix in extensions)
check(set(map(str,runtime_paths)) == set(manifest), 'filesystem runtime scope equals manifest')
for name,digest in manifest.items(): check(sha(read(name)) == digest, 'runtime bytes ' + name)

integration = obj(REPORTS[0] + '/root/integration-first/execution.json')
check(integration['runtime_before'] == integration['runtime_after'] == manifest, 'combined-run before/after equals current manifest')
check(integration['exit_code'] == 0 and integration['source_unchanged'] and integration['old326_unchanged'], 'combined first run exit and held flags')
check(stamp(pins['reviewed_at']) <= stamp(integration['started_at']) < stamp(integration['finished_at']), 'review pins precede combined run')
check(abs((stamp(integration['finished_at'])-stamp(integration['started_at'])).total_seconds()-integration['elapsed_seconds']) < .01, 'combined elapsed chronology')
check(integration['command'][1:] == ['-m','unittest','discover','-s','tests','-p','test_li_v3*.py','-v'], 'combined test command')
for channel in ('stdout','stderr'):
    raw = read(REPORTS[0] + '/root/integration-first/' + channel + '.txt')
    check(sha(raw) == integration[channel + '_sha256'], 'combined ' + channel + ' identity')
    if channel == 'stderr': log = raw.decode()
check(len(re.findall(r'^test_.* \.\.\. ok$',log,re.M)) == 359, '359 individually successful test lines')
check('Ran 359 tests in 5.339s\n\nOK\n' in log and not re.search(r'^(FAIL|ERROR|skipped)',log,re.M), '359-test summary without failure/error/skip')

ci = obj(REPORTS[0] + '/previous-report-ci.json')
check(ci['commit'] == head == '2428c313597980c81b79ed50b4d025b42085f5b7', 'preceding CI is current report-only HEAD')
check(ci['run']['head_sha'] == head and ci['run']['id'] == 38885071479 and ci['run']['event'] == 'push' and ci['run']['run_attempt'] == 1, 'original push predecessor CI identity')
check(ci['all_four_jobs_successful'] and len(ci['jobs']) == 4 and all(x['status']=='completed' and x['conclusion']=='success' for x in ci['jobs']), 'all four predecessor jobs passed')
check(all(stamp(x['completed_at']) <= stamp(ci['observed_at']) for x in ci['jobs']), 'CI observation follows all completed jobs')

bamexec = obj(REPORTS[1] + '/execution.json')
bamresult = obj(REPORTS[1] + '/result.json')
bamreview = obj(REPORTS[1] + '/independent-review/source-review.json')
check(stamp(bamreview['completed_at']) < stamp(bamexec['started_at']) < stamp(bamresult['started_at']) < stamp(bamresult['finished_at']) < stamp(bamexec['finished_at']), 'BAM review before actual single comparison')
check(bamexec['invocations']==1 and bamexec['exit_code']==0 and bamexec['network_requests']==0, 'BAM one successful retained-input invocation no new request')
for key,name in [('scope_sha256','scope.json'),('script_sha256','compare_documentation.py')]:
    check(bamresult[key] == bamreview[key] == sha(read(REPORTS[1]+'/'+name)), 'BAM actual/review final pin '+name)
for channel in ('stdout','stderr'):
    check(sha(read(REPORTS[1]+'/'+channel+'.txt')) == bamexec[channel+'_sha256'], 'BAM '+channel+' hash')
check(read(REPORTS[1]+'/stdout.txt') == read(REPORTS[1]+'/result.json'), 'BAM printed result exact public result')
check(bamresult['actual_encoding']=='UNBOUND' and bamresult['whole_raw_body_machine_read'] and not bamresult['semantic_dictionary_admitted'], 'BAM scope/exposure preserved')
check(bamresult['csv_record_width_counts']=={'11':234} and bamresult['ascii_invariant_cells']==2558 and bamresult['non_ascii_or_different_cells']==16 and bamresult['cells_differing_between_hypotheses']==3, 'BAM narrative aggregate counts')

checkpoint = obj('reports/continuation.json')['current_checkpoint']
check(checkpoint['growth_hint_shape']['status']=='PRODUCTION_IMPLEMENTED_INTEGRATED_RELEASE_GATES_PENDING' and checkpoint['growth_hint_shape']['author_tests_pass']==35 and checkpoint['growth_hint_shape']['pure_preparation_author_tests_pass']==18, 'corrected current versus historical G30 checkpoint')
check(checkpoint['growth_reader_implementation']['actual_operations_performed'] is False and checkpoint['growth_reader_implementation']['scientific_schema_approved'] is False, 'new operation and scientific gates pending')
links=[]
for path in published + [ROOT / x for x in CHECKPOINTS]:
    name=str(path.relative_to(ROOT));raw=read(name)
    if path.suffix=='.json': json.loads(raw)
    if path.suffix!='.md': continue
    text=raw.decode()
    if name in CHECKPOINTS:
        diff=git('diff','HEAD','--unified=0','--',name).decode()
        text='\n'.join(x[1:] for x in diff.splitlines() if x.startswith('+') and not x.startswith('+++'))
    for target in re.findall(r'\]\(([^\s)]+)\)',text):
        if '://' in target or target.startswith('#'):continue
        destination=path.parent/target.split('#')[0]
        check(destination.exists(), 'Markdown link '+name+' -> '+target)
        links.append({'source':name,'target':target,'exists':destination.exists()})

# Verify only relevant index entries, not unrelated historical files.
staged = {}
for path in published + [ROOT/x for x in CHECKPOINTS] + [ROOT/'reports/runtime-manifest.json'] + [ROOT/x for x in pins['files']]:
    name=str(path.relative_to(ROOT));raw=read(name)
    indexed=git('show',':discovery/'+name)
    check(raw==indexed, 'index equals current '+name)
    staged[name]=sha(indexed)
whitespace=subprocess.run(['git','diff','--cached','--check'],cwd=ROOT,capture_output=True)
check(whitespace.returncode==0 and whitespace.stdout==whitespace.stderr==b'', 'unchanged staged whitespace check')
for name,identity in tuple(seen.items()):
    check(sha(read(name))==identity['sha256'], 'end identity held '+name)
check(git('rev-parse','HEAD').decode().strip()==head, 'HEAD held during review')
result={'status':'PASS' if not failures else 'FAIL','started_at':started,'finished_at':now(),
        'reviewer':'/root/finite_inverse_check','independence_limit':'Reviewer authored G31; this audit independently checks root publication bytes, receipt metadata and claim consistency only. It is not an independent G31 correctness or scientific source review.',
        'checks':len(checks),'failures':failures,'growth_copy_entries':225,'lossless_wrappers':3,'bam_original_copies':27,
        'runtime_current':332,'runtime_predecessor':326,'reviewed_pins':8,'combined_tests':359,'markdown_links':links,
        'staged_files':staged,'observed_identities':seen,'private_raw_inputs_read':False,'product_modules_imported':False,
        'source_operations_or_product_tests_run':False,'new_ci_or_package_claimed':False}
(OUT/'audit-result.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('markdown_links','staged_files','observed_identities')},indent=2))
raise SystemExit(bool(failures))
