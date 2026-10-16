"""Review retained receipts and JSON projection; never opens XLSX or network."""
from pathlib import Path
import datetime
import hashlib
import json

ROOT=Path('.cache/phase2-bam-metrology-workbook-v1')
OUT=Path('.cache/phase2-bam-metrology-workbook-review-v1')
def load(name):return json.loads((ROOT/name).read_text())
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def when(text):return datetime.datetime.fromisoformat(text)
scope=load('scope.json');receipt=load('acquisition.json');result=load('result.json')
execution=load('actual-first/execution.json');slot=load('request-slot.json')
projection_bytes=(ROOT/'internal-workbook-projection.json').read_bytes()
assert hashlib.sha256(projection_bytes).hexdigest()=='4a0c0165e980e2e40418dac63f161215a04ab955aeff750193030cbd7c6e44e1'
projection=json.loads(projection_bytes)
assert execution['preacquisition_review_sha256']==sha(OUT/'preacquisition-review.json')
assert result['acquisition_sha256']==sha(ROOT/'acquisition.json')
assert result['scope_sha256']==receipt['scope_sha256']==slot['scope_sha256']==sha(ROOT/'scope.json')
assert receipt['status']=='ACQUIRED_IDENTITY_MATCH' and result['status']=='WORKBOOK_DOCUMENTARY_PROJECTED'
assert receipt['http_status']==200 and receipt['requests_attempted']==1 and receipt['retries']==receipt['redirects_followed']==0
assert receipt['body_read_started'] and receipt['body_read_completed']
identity=scope['source_identity']
assert receipt['url']==receipt['final_url']==slot['url']==identity['url']
assert receipt['bytes']==identity['bytes']==54960 and receipt['md5']==identity['md5']
assert result['source_sha256']==receipt['sha256']==execution['outputs']['workbook.xlsx']['sha256']
assert when(scope['frozen_at'])<when(json.loads((OUT/'preacquisition-review.json').read_text())['reviewed_at'])<when(execution['started_at'])<=when(slot['claimed_at'])==when(receipt['started_at'])<when(receipt['finished_at'])<=when(execution['finished_at'])
assert execution['exit_code']==0
assert (ROOT/'actual-first/stderr.txt').read_bytes()==b''
assert execution['stderr_sha256']==sha(ROOT/'actual-first/stderr.txt')
assert execution['stdout_sha256']==sha(ROOT/'actual-first/stdout.json')
assert load('actual-first/stdout.json')=={'acquisition':receipt,'result':result}
verified=[]
for name,entry in execution['outputs'].items():
    if name=='workbook.xlsx':continue
    raw=(ROOT/name).read_bytes()
    assert len(raw)==entry['bytes'] and hashlib.sha256(raw).hexdigest()==entry['sha256']
    verified.append(name)
for name,digest in execution['held_source_sha256'].items():assert sha(ROOT/name)==digest
for entry in scope['frozen_inputs']:
    raw=Path(entry['path']).read_bytes()
    assert len(raw)==entry['bytes'] and hashlib.sha256(raw).hexdigest()==entry['sha256']
assert len(projection['sheets'])==result['sheets']==9
assert sum(len(s['cells']) for s in projection['sheets'])==result['cells']==2409
assert sum(c['formula'] is not None for s in projection['sheets'] for c in s['cells'])==result['formula_cells']==2
assert len(projection['external_relationships'])==result['external_relationships_seen_in_parsed_parts']==0
assert not result['blind_predictive_benchmark_eligible'] and result['permanently_exposed_metrology_reference']
assert not projection['formula_execution'] and not projection['number_format_rendering'] and not projection['category_or_merge_fill']
test_sheets=[s for s in projection['sheets'] if s['name'] in ('Vh5205_T-71','Vh5205_T-74','Vh5205_T-84')]
assert len(test_sheets)==3
pairing_checks=[]
for s in test_sheets:
    d={c['ref']:c for c in s['cells']}
    value=lambda ref:d[ref]['resolved_text_or_raw_number']
    assert value('F3')==value('F4')==s['name']
    for row,label,unit in [(13,'Rp0.2','MPa'),(14,'Rm','MPa'),(15,'Z','%'),(16,'Agt','%'),(17,'Ag','%')]:
        assert value('C'+str(row))==label and value('D'+str(row))==unit
        assert value('F'+str(row)) is not None and d['F'+str(row)]['formula'] is None
    pairing_checks.append({'sheet':s['name'],'matching_test_and_piece_id_cells':['F3','F4'],'jointly_stored_endpoint_rows':[13,14,15,16,17],'independent_sample_inference':False})
terms=['uncertainty','uncertainties','coverage','covariance','correlation','expanded','standard deviation','standard uncertainty','k=','k =','95%','95 %','batch','heat number']
matches={term:[{'sheet':s['name'],'cell':c['ref']} for s in projection['sheets'] for c in s['cells'] if term in str(c['resolved_text_or_raw_number'] or '').lower()] for term in terms}
summary={
 'schema':'lupine.bam-metrology-independent-retained-artifact-check.v1',
 'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'status':'PASS',
 'scope_sha256':sha(ROOT/'scope.json'),
 'projection_sha256':hashlib.sha256(projection_bytes).hexdigest(),
 'projection_bytes':len(projection_bytes),
 'verified_actual_output_files':verified,
 'raw_workbook_byte_verification_by_reviewer':False,
 'raw_workbook_digest_consistency':'Acquisition, result and execution receipts agree; no reviewer XLSX read or independent ZIP/XML reparse.',
 'chronology':'Final scope, completed independent pre-acquisition review, execution start, durable slot/acquisition start, acquisition finish, execution finish ordered.',
 'projection_counts_independently_recounted':{'sheets':9,'stored_cells':2409,'formula_cells':2,'external_relationships_in_projection':0},
 'parser_counts_reported_not_independently_reparsed':{'archive_members':33,'xml_parts_parsed':20,'shared_strings':475},
 'pairing_checks':pairing_checks,
 'lexical_check':{'domain':'case-insensitive substring scan across every resolved_text_or_raw_number value in retained projection; not unparsed OOXML parts, links or cited sources','term_cell_matches':matches,'absence_scope':'Only literal scanned strings in admitted projected values; no proof that uncertainty information cannot exist elsewhere.'},
 'reviewer_exposure':'Whole 760280-byte internal projection parsed as JSON, including all stored documentary/measurement values and potential contacts; selected technical labels, definitions, IDs and endpoint values inspected. Full-cell projection and contacts not copied to public artifact.',
 'network_requests':0,'workbook_parser_invocations':0,'xlsx_raw_reads':0,
}
(OUT/'actual-artifact-check.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'status':'PASS','output':'actual-artifact-check.json','sha256':sha(OUT/'actual-artifact-check.json')}))
