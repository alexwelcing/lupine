"""Before/after source-bound independent constructed-driver test execution."""
from datetime import datetime,timezone
from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess
import sys

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
sys.path.insert(0,str(HERE))
from constructed_case import d
EXPECTED_DRIVER='ed1d00479ec0c74bdd15a933ce07abdb44aba09f40f974dc37b3750b78bfe66f'
EXTRA=(HERE/'constructed_case.py',HERE/'test_fixture_driver_review.py',HERE/'README.md',Path(__file__).resolve(),
       ROOT/'.cache/mpea-protocol-design/mpea-t25-archival-protocol-v1.md',
       ROOT/'.cache/mpea-protocol-design/mpea-t25-implementation-contract-v1.md')

def capture():
    return {'implementation':d.implementation_identity(),
            'review_and_specification':{str(path.relative_to(ROOT)):sha256(path.read_bytes()).hexdigest() for path in EXTRA}}

def canonical(value):
    return (json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False)+'\n').encode()

def main():
    output=HERE/'independent-review-v1.json';log=HERE/'tests-final.txt'
    if output.exists() or log.exists():raise SystemExit('REVIEW_OUTPUT_ALREADY_EXISTS')
    before=capture()
    if before['implementation']['mpea_fixture_driver']!=EXPECTED_DRIVER:raise SystemExit('UNEXPECTED_DRIVER_SOURCE')
    (HERE/'source-bindings-before.json').write_bytes(canonical(before))
    command=[sys.executable,'-m','unittest','discover','-s',str(HERE),'-p','test_fixture_driver_review.py','-v']
    started=datetime.now(timezone.utc).isoformat()
    completed=subprocess.run(command,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=600,check=False)
    after=capture()
    with log.open('xb') as stream:stream.write(completed.stdout)
    match=re.search(rb'\nRan ([0-9]+) tests in [0-9.]+s\n\nOK\n\Z',completed.stdout)
    count=int(match.group(1)) if match else None
    result={'schema':'lupine.fixture_driver.independent_review.v1',
        'status':'PASS' if completed.returncode==0 and count==15 and before==after else 'FAIL',
        'test_count':count,'returncode':completed.returncode,'sources_unchanged':before==after,
        'source_sha256_before':before,'source_sha256_after':after,'command':command,
        'started_utc':started,'completed_utc':datetime.now(timezone.utc).isoformat(),
        'log_sha256':sha256(completed.stdout).hexdigest(),
        'initial_execution':{'tests':14,'passed':13,'failed':1,'log_sha256':sha256((HERE/'tests-first.txt').read_bytes()).hexdigest(),
            'test_sha256':sha256((HERE/'test_fixture_driver_review-first.py').read_bytes()).hexdigest(),
            'failure_classification':'review_test_ordering_assumption_corrected_to_exact_ID_set_and_length'},
        'constructed_shape':{'original_rows':1545,'condition_rows':314,'source_groups':75,
            'development_groups':35,'calibration_groups':20,'evaluation_groups':20,'total_policy_runs':960},
        'scope':{'constructed_fixtures_only':True,'experimental_source_opened':False,
            'actual_features_or_targets_opened':False,'allocation_entropy_drawn':False,
            'actual_allocation_performed':False,'main_tree_edited':False,
            'production_registration_established':False,'hostile_Python_isolation_established':False,
            'physical_truth_established':False,'formal_refinement_established':False},
        'limitations':['Trusted custodian/scheduler owns mixed bytes and both vaults; policies receive bound consumers.',
            'Fixture stage integrity is separate from production registration, resource supervision and archival acquisition.',
            'Fresh-process equality is computational reproduction on constructed inputs, not a new scientific sample.']}
    result['content_sha256']=sha256(canonical(result)).hexdigest()
    with output.open('xb') as stream:stream.write(canonical(result))
    print(json.dumps({'status':result['status'],'tests':count,'sources_unchanged':before==after,
                      'receipt_sha256':sha256(output.read_bytes()).hexdigest()},sort_keys=True))
    return 0 if result['status']=='PASS' else 1

if __name__=='__main__':raise SystemExit(main())
