"""Retained JSON/receipt checks only; no HTML reread, parser execution or network."""
from pathlib import Path
import datetime
import hashlib
import json

P=Path('.cache/phase2-nist-metrology-guidance-v1')
O=Path('.cache/phase2-nist-metrology-guidance-review-v1')
def read(name):return json.loads((P/name).read_text())
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def time(text):return datetime.datetime.fromisoformat(text)
scope=read('scope.json');slot=read('request-slot.json');execution=read('actual-first/execution.json');operation=read('operation.json')
assert execution['review_sha256']==sha(O/'preacquisition-review.json')
assert slot['scope_sha256']==sha(P/'scope.json')
assert time(scope['frozen_at'])<time(json.loads((O/'preacquisition-review.json').read_text())['reviewed_at'])<time(execution['started_at'])<=time(slot['reserved_at'])
for name,digest in execution['held_source_sha256'].items():assert sha(P/name)==digest
verified=[]
for name,entry in execution['outputs'].items():
    if name.endswith('.html'):continue
    raw=(P/name).read_bytes();assert len(raw)==entry['bytes'] and hashlib.sha256(raw).hexdigest()==entry['sha256'];verified.append(name)
assert execution['exit_code']==0 and (P/'actual-first/stderr.txt').read_bytes()==b''
assert execution['stderr_sha256']==sha(P/'actual-first/stderr.txt') and execution['stdout_sha256']==sha(P/'actual-first/stdout.json')
assert read('actual-first/stdout.json')==operation
assert operation['attempted_requests']==operation['maximum_requests']==2 and operation['unattempted_scoped_sources']==[]
prior=time(slot['reserved_at']);snapshots=[]
for source,receipt in zip(scope['sources'],operation['results']):
    name=source['id'];assert read(name+'-receipt.json')==receipt
    assert receipt['name']==name and receipt['url']==receipt['final_url']==source['url']
    assert receipt['scope_sha256']==sha(P/'scope.json')
    assert receipt['attempts']==1 and receipt['retries']==receipt['redirects_followed']==0
    assert receipt['status']=='ACQUIRED_STATIC_TEXT' and receipt['http_status']==200
    assert all(receipt[k] for k in ('body_read_started','body_read_completed','decode_started','decode_completed','parse_started','parse_completed'))
    assert 0<receipt['bytes']<=1024*1024
    assert receipt['bytes']==execution['outputs'][name+'.html']['bytes'] and receipt['sha256']==execution['outputs'][name+'.html']['sha256']
    assert prior<=time(receipt['started_at'])<time(receipt['finished_at']);prior=time(receipt['finished_at'])
    projection=read(name+'-projection.json');assert len(projection['blocks'])==receipt['blocks'];assert projection['title']==receipt['title']
    relevant=range(128,137) if name=='section5' else range(128,136)
    snapshots.append({'source':name,'reported_html_sha256':receipt['sha256'],'projection_sha256':sha(P/(name+'-projection.json')),'blocks':len(projection['blocks']),'selected_block_locators':[{'zero_based_index':i,'html_start_line':projection['blocks'][i]['line'],'tag':projection['blocks'][i]['tag']} for i in relevant]})
assert prior<=time(execution['finished_at'])
check={'schema':'lupine.nist-guidance-independent-retained-check.v1','checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS','review_and_scope_precede_requests':True,'exact_output_hashes_verified_except_raw_html':verified,'snapshots':snapshots,'raw_html_digest_check':'Receipt/execution consistency only; raw HTML not independently reread or reparsed. Full retained projection JSON bytes independently hashed and parsed.','actual_guidance_requests_by_reviewer':0,'raw_html_reads_by_reviewer':0,'html_parser_invocations_by_reviewer':0,'measurement_body_reads':0,'exposure':'Whole two retained projection JSON containers machine exposed. Researcher inspected selected technical blocks plus adjacent headings/navigation/public webmaster text from indexes126..140. Full projections/contact text are not copied to this public review.'}
(O/'retained-guidance-check.json').write_text(json.dumps(check,indent=2)+'\n')
print(json.dumps({'status':'PASS','sha256':sha(O/'retained-guidance-check.json')}))
