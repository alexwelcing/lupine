"""Prepare an additive installed census check and explicitly updated probe pins."""
from pathlib import Path
import ast,hashlib,json
R=Path(__file__).resolve().parents[2];H=Path(__file__).resolve().parent
before={};after={}
def emit(name,text):
 before[name]=hashlib.sha256((R/name).read_bytes()).hexdigest();p=H/'integration'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text);compile(text,name,'exec');after[name]=hashlib.sha256(p.read_bytes()).hexdigest()
s=(R/'scripts/package_smoke.py').read_text()
s=s.replace("PROBE = r'''\nimport json", "PROBE = r'''\nfrom hashlib import sha256\nimport json")
needle="assert len(training_tail['models']) == 4\n"
s=s.replace(needle,needle+"""# Exact public historical artifact; this check does not recompute private labels.
census_raw = resources.joinpath('resources', 'recorded-census-v1.json').read_bytes()
assert sha256(census_raw).hexdigest() == 'a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a'
census = json.loads(census_raw)
assert census['status'] == 'DESCRIPTIVE_CENSUS_COMPLETE'
assert census['scientific_status'] == 'NOT_ADMITTED' and census['actual_reference_choice'] == 'UNKNOWN'
assert census['model_ranking_or_winner'] is None and census['tolerance_success_criterion'] is None
assert census['exposure']['fresh_holdout_claim'] is False
census_asset = resources.joinpath('web', 'recorded-census.js').read_bytes()
assert census_asset, 'missing stored-label census JavaScript'
""")
needle="    mpea_check = check_optional_mpea(resources, observed_reports, url)\n"
s=s.replace(needle,needle+"""    assert observed_reports['recorded_census'] == census
    with urlopen(url + '/recorded-census.js', timeout=10) as response:
        assert response.status == 200 and response.read() == census_asset
""")
s=s.replace("'mpea_javascript_packaged_and_served']", "'mpea_javascript_packaged_and_served',\n                             'fixed_stored_census_identity_scope_and_http_asset_agreement']")
emit('scripts/package_smoke.py',s)
tree=ast.parse(s);probe=next(n.value.value for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='PROBE' for t in n.targets));new_hash=hashlib.sha256(probe.encode()).hexdigest();old_hash='a990a5aa825b1ed55caeb2551b86dae3efc4f0e258e95afc696b95f4919415a6'
for name in ['tests/test_package_retention.py','tests/test_package_retention_review.py']:
 t=(R/name).read_text();assert t.count(old_hash)==1;t=t.replace(old_hash,new_hash).replace('installed probe (16 checks)','installed probe plus historical census (17 checks)');emit(name,t)
t=(R/'scripts/verify_retained_artifacts.py').read_text();t=t.replace("    'mpea_javascript_packaged_and_served',\n]", "    'mpea_javascript_packaged_and_served',\n    'fixed_stored_census_identity_scope_and_http_asset_agreement',\n]");emit('scripts/verify_retained_artifacts.py',t)
(H/'probe-delta.json').write_text(json.dumps({'existing_files_before':before,'prepared_files':after,'old_probe_sha256':old_hash,'new_probe_sha256':new_hash,'old_checks':16,'new_checks':17,'retention_assertions_weakened':False,'scope':'Adds installed fixed public resource identity, scientific limits, exact HTTP JSON and asset bytes. Pins updated only for this reviewed additive probe; no private recomputation or physics.'},indent=2)+'\n')
print(json.dumps({'probe_sha256':new_hash,'prepared_files':after}))
