"""Read-only retained public evidence audit; no project import, network or source data."""
import datetime
from fractions import Fraction
import hashlib
import json
from math import comb
from pathlib import Path

ROOT = next(p for p in Path(__file__).absolute().parents if p.name == 'discovery' and (p/'AGENTS.md').is_file())
OUT = ROOT/'.cache/phase2-next-publication-claim-review-v1'
bindings={}
def read(path):
    raw=(ROOT/path).read_bytes();bindings[path]={'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)};return raw

def data(path): return json.loads(read(path))
base='reports/phase2-finite-compatible-verification-v1/'
commit='4492858d9e55ddfa3cca2e208063799517948b13'
ci=data(base+'ci/final.json')
assert ci['commit']==ci['run']['head_sha']==commit
assert ci['run']['id']==38867704072 and ci['run']['run_attempt']==1 and ci['run']['event']=='push'
assert ci['run']['status']=='completed' and ci['run']['conclusion']=='success'
assert {j['name'] for j in ci['jobs']}=={'lean','browser','python (3.11)','python (3.12)'}
assert all(j['status']=='completed' and j['conclusion']=='success' for j in ci['jobs'])
parse=lambda value:datetime.datetime.fromisoformat(value.replace('Z','+00:00'))
assert all(parse(j['completed_at'])<=parse(ci['observed_at']) for j in ci['jobs'])
packages=[]
for n in ('0','1'):
    e=data(base+'clean-package/'+n+'-execution.json')
    assert e['commit']==commit and e['exit_code']==0 and e['head_unchanged'] and e['worktree_clean']
    assert e['runtime_before']==e['runtime_after'] and len(e['runtime_before'])==317
    for stream in ('stdout','stderr'):
        assert hashlib.sha256(read(base+'clean-package/'+n+'-'+stream+'.txt')).hexdigest()==e[stream+'_sha256']
    packages.append(e)
public=[];executions=[]
for n in ('1','2'):
    raw=read(base+'actual-envelope/'+n+'/public.json');p=json.loads(raw)
    assert hashlib.sha256(raw).hexdigest()=='7010e99afcafbf29d32d5ff7d3f356474c2a670571285d884b80441e91ce3d07'
    assert p['implementation']['commit']==commit and p['status']=='BLOCKED_SCHEMA'
    assert p['engineering_status']=='BLOCKED_LAYOUT' and p['reason']=='ZIP_LAYOUT_UNSUPPORTED'
    assert p['source_identity_verified'] and not p['synthetic_fixture']
    ex=p['exposure']
    assert ex['raw_buffer_read_started'] and ex['raw_buffer_read_completed'] and ex['target_bearing_source_bytes_read']
    assert all(ex[k]==[] for k in ('decompression_started','decompression_completed','xml_decoding_started','xml_decoding_completed'))
    assert ex['inspected_xml_bytes']==0 and ex['fits']==ex['splits']==0
    assert not ex['worksheet_cells_decoded'] and not ex['shared_strings_decoded'] and not ex['scientific_eligibility_decisions']
    assert all(p[k] is None for k in ('member_count','sheet_count','recognized_roles','row_count','paired_count','source_group_count','overlap_count'))
    e=data(base+'actual-envelope/'+n+'/execution.json')
    assert e['commit']==commit and e['exit_code']==2 and e['expected_exit_code']==2
    assert e['source_unchanged'] and e['head_unchanged'] and e['worktree_clean']
    assert e['runtime_before']==e['runtime_after']==packages[0]['runtime_before'] and len(e['runtime_before'])==317
    assert parse(e['started_at'])>parse(ci['observed_at']) and all(parse(e['started_at'])>parse(a['finished_at']) for a in packages)
    for stream in ('stdout','stderr'):
        assert hashlib.sha256(read(base+'actual-envelope/'+n+'/'+stream+'.txt')).hexdigest()==e[stream+'_sha256']
    public.append(raw);executions.append(e)
assert public[0]==public[1]
byteaudit=data(base+'independent-artifact-audit/review.json')
assert byteaudit['status']=='PASS' and byteaudit['commit']==commit
assert byteaudit['source_files_compared_to_git_blobs']==2954
assert byteaudit['runtime_source_files_matching_manifest_and_worktree']==317
assert byteaudit['wheel_record_content_digests_checked']==114 and byteaudit['wheel_package_members_matching_exact_git_source']==108
assert byteaudit['wheel_members']==115 and byteaudit['prior_installed_probe_assertions_preserved']==63 and byteaudit['new_installed_probe_assertions']==9
assert not byteaudit['artifact_contents_executed'] and not byteaudit['scientific_replication'] and not byteaudit['remote_ci_verified_by_this_audit']
figure=data('reports/phase2-finite-planning-figure-v1/independent-review/review.json')
assert figure['checked_sample_counts']==101 and figure['finite_null_world_count']==9191
assert figure['minimum_finite']==25 and figure['minimum_iid']==29
assert Fraction(comb(90,25),comb(100,25))==Fraction(655281507,13684039096)<=Fraction(1,20)
assert Fraction(comb(90,24),comb(100,24))>Fraction(1,20)
assert Fraction(9,10)**29<=Fraction(1,20)<Fraction(9,10)**28
integration=data('reports/phase2-li-notebook-methods-candidate-v1/integrated/execution.json')
assert integration['exit_code']==0 and len(integration['runtime_before'])==320
assert integration['runtime_before']==integration['runtime_after']
log=read('reports/phase2-li-notebook-methods-candidate-v1/integrated/stderr.txt')
assert b'Ran 159 tests' in log and b'\nOK\n' in log
for key in ('stdout','stderr'):
    if key+'_sha256' in integration:
        assert hashlib.sha256(read('reports/phase2-li-notebook-methods-candidate-v1/integrated/'+key+'.txt')).hexdigest()==integration[key+'_sha256']
current=data('reports/continuation.json')['current_checkpoint']
assert current['published_commit']==commit and current['published_ci_all_four_jobs_pass']
assert current['notebook_methods']['actual_capture_performed'] is False
assert current['notebook_methods']['source_sha256']=='2423ee14f16b6b7ec46ef896f25cb5962b1c28dbea79fcb365e14b0919752049'
assert current['notebook_methods']['integrated_li_tests_pass']==159 and current['notebook_methods']['runtime_files_unchanged']==320
for path in ['GOAL.md','STATUS.md','reports/progress.md','docs/release-validation.md','docs/finite-planning-walkthrough.md',base+'README.md','reports/phase2-finite-planning-figure-v1/PUBLICATION.md','reports/phase2-li-author-methods-v1/README.md',base+'actual-envelope/independent-review/review.json',base+'actual-envelope/independent-review/source-path-review.json']:
    read(path)
result={'schema':'lupine.discovery.next_publication_retained_claim_audit.v1','status':'PASS_RETAINED_EVIDENCE_AND_HYPOTHETICAL_ARITHMETIC','observed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_commit':commit,'checks':{'exact_original_push_ci_receipt':True,'ci_package_before_actual_operations':True,'two_actual_schema_blocks_identical':True,'zero_decompression_or_xml_started_in_actual_receipts':True,'actual_raw_machine_access_preserved':True,'actual_317_source_maps_unchanged':True,'retained_package_and_audit_counts':True,'finite_vs_iid_boundary_arithmetic':True,'notebook_159_integration_and_320_source_map':True,'current_checkpoint_does_not_claim_notebook_capture':True},'bindings':bindings,'not_performed':['new remote CI query','project tests or production commands','project module import','raw notebook/workbook/private custody access','new scientific evaluation or criteria','tracked writes','Git mutation'],'limitations':['This audit checks retained public records, not independent remote-provider authenticity or raw artifact bytes.','Finite arithmetic is the existing hypothetical worked example, not scientific outcome evidence.','Earlier source-format failures and the separately documented unobserved archive-close reporting limitation remain unchanged.']}
(OUT/'retained-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'status':result['status'],'files_bound':len(bindings),'sha256':hashlib.sha256((OUT/'retained-audit.json').read_bytes()).hexdigest()}))
