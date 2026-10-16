"""Read-only exact payload/source audit; never imports or runs wheel contents."""
from pathlib import Path
import hashlib, json, tarfile, zipfile, subprocess, sys
from datetime import datetime, timezone
project = Path.cwd()
assert len(sys.argv) == 2 and sys.flags.optimize == 0
commit = sys.argv[1]
EXPECTED_RESOURCE_SHA256 = 'd93769b07fba52f9bc95dbed92c5303aa8344867e7a663d0ca58cff7af2ba274'
retained = project / ('.cache/release-artifacts-present-contract-' + commit[:12])
receipt_path = retained / 'release-artifacts.json'
receipt_raw = receipt_path.read_bytes()
receipt = json.loads(receipt_raw)
sha = lambda raw: hashlib.sha256(raw).hexdigest()
assert len(commit)==40 and all(c in '0123456789abcdef' for c in commit)
assert receipt['source']['git_commit'] == commit
paths = {}
for key in ('wheel','source_archive'):
    identity = receipt['artifacts'][key]
    path = retained / identity['filename']
    raw = path.read_bytes()
    assert len(raw) == identity['bytes'] and sha(raw) == identity['sha256']
    paths[key] = path
with tarfile.open(paths['source_archive'], 'r:') as source, zipfile.ZipFile(paths['wheel']) as wheel:
    members = source.getmembers()
    assert len({m.name for m in members}) == len(members)
    archived = {m.name: source.extractfile(m).read() for m in members if m.isfile()}
    names = wheel.namelist()
    assert len(set(names)) == len(names)
    prefix = 'lupine-source/discovery/src/'
    source_runtime = {k.removeprefix(prefix): v for k,v in archived.items()
                      if k.startswith(prefix+'lupine_discovery/')}
    wheel_runtime = {name for name in names if name.startswith('lupine_discovery/')}
    assert wheel_runtime == set(source_runtime), (wheel_runtime-set(source_runtime),set(source_runtime)-wheel_runtime)
    bindings = []
    for name in sorted(wheel_runtime):
        raw = wheel.read(name)
        assert raw == source_runtime[name], name
        bindings.append({'wheel_member':name,'source_member':prefix+name,'bytes':len(raw),'sha256':sha(raw)})
    for name,source_name in [('LICENSE','LICENSE'),('NOTICE.md','NOTICE.md')]:
        wheel_name='lupine_discovery-0.1.0.dist-info/licenses/'+name
        source_name='lupine-source/discovery/'+source_name
        raw=wheel.read(wheel_name)
        assert raw == archived[source_name]
        bindings.append({'wheel_member':wheel_name,'source_member':source_name,'bytes':len(raw),'sha256':sha(raw)})
    reviewed_name = 'lupine_discovery/resources/mpea-t25-v1.json'
    assert reviewed_name in wheel_runtime, 'Reviewed MPEA resource missing'
    reviewed_raw = wheel.read(reviewed_name)
    assert sha(reviewed_raw) == EXPECTED_RESOURCE_SHA256, 'Reviewed MPEA resource bytes differ'
    assert reviewed_raw == source_runtime[reviewed_name]
    expected_claim = {'resource': 'resources/mpea-t25-v1.json',
                      'status': 'present_exactly_served',
                      'javascript': 'packaged_and_exactly_served'}
    assert receipt['verification']['optional_mpea'] == expected_claim
    reviewed = {'wheel_member': reviewed_name, 'source_member': prefix + reviewed_name,
                'bytes': len(reviewed_raw), 'sha256': sha(reviewed_raw),
                'wheel_equals_source_bytes': True, 'recorded_http_value_agreement': True,
                'http_reexecuted_by_this_auditor': False,
                'scientific_report_semantics_validated': False}
    generated=sorted(set(names)-{x['wheel_member'] for x in bindings})
    assert generated == ['lupine_discovery-0.1.0.dist-info/'+x for x in ['METADATA','RECORD','WHEEL','entry_points.txt','top_level.txt']]
result = {'schema':'lupine.discovery.wheel-source-payload-audit.v1','status':'PASS',
 'executed_at_utc':datetime.now(timezone.utc).isoformat(),'source_commit':commit,
 'command':[sys.executable,'.cache/package-present-release-preparation-v1/audit-wheel-source-present-v1.py',commit],
 'audit_source_sha256':sha(Path(__file__).read_bytes()),'retained_receipt_sha256':sha(receipt_raw),
 'wheel_sha256':receipt['artifacts']['wheel']['sha256'],'source_archive_sha256':receipt['artifacts']['source_archive']['sha256'],
 'runtime_payload_count':len(wheel_runtime),'exact_source_payload_count':len(bindings),
 'runtime_payload_set_equals_archived_source_set':True,'bindings':bindings,
 'reviewed_mpea_resource':reviewed,
 'generated_metadata_not_byte_compared_to_source':generated,
 'scope':'Exact wheel library, resources, web assets and license bytes match retained committed source. Does not execute wheel, establish build reproducibility, or establish scientific correctness.'}
out=project/('.cache/wheel-source-present-contract-'+commit[:12]+'.json')
assert not out.exists()
with out.open('x') as stream:
    stream.write(json.dumps(result,sort_keys=True,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='bindings'},indent=2))
