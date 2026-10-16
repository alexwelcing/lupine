"""Read-only verification of constructed publication evidence; no study run."""
from pathlib import Path
from hashlib import sha256
import difflib
import json
import re

ROOT=Path(__file__).resolve().parents[2]
BUNDLE=ROOT/'reports/mpea-guarded-components-v1'
OUT=Path(__file__).resolve().parent


def digest(path):return sha256(path.read_bytes()).hexdigest()


def main():
    errors=[]
    mapping=json.loads((BUNDLE/'artifact-copies.json').read_bytes())
    entries=mapping['copies']; destinations=set(); byte_index={};encoded=0
    for entry in entries:
        relative=Path(entry['destination']);path=BUNDLE/relative
        assert not relative.is_absolute() and '..' not in relative.parts
        assert path.resolve().is_relative_to(BUNDLE.resolve())
        assert not any(p.is_symlink() for p in (path,*path.parents) if p.is_relative_to(BUNDLE))
        assert entry['destination'] not in destinations
        destinations.add(entry['destination'])
        raw=path.read_bytes();actual=sha256(raw).hexdigest();byte_index[actual]=raw
        assert len(raw)==entry['bytes'] and actual==entry['sha256']
        if 'encoding' in entry:
            assert entry['encoding']=='UTF-8 log in JSON text field'
            wrapper=json.loads(raw);original=wrapper['text'].encode('utf-8')
            assert wrapper['schema']=='lupine.discovery.lossless_utf8_log.v1'
            assert len(original)==entry['original_bytes']==wrapper['original_bytes']
            assert sha256(original).hexdigest()==entry['original_sha256']==wrapper['original_sha256']
            assert original==(ROOT/entry['source']).read_bytes()
            encoded+=1
    generated=set(p.relative_to(BUNDLE).as_posix() for p in BUNDLE.rglob('*') if p.is_file())-destinations-{'artifact-copies.json'}
    expected_generated={'integrated-verification/'+name for name in ('summary.json','python-execution.json','python-unittest.txt','browser-report.json','browser-execution.txt')}
    expected_generated|={'README.md','promotion/final-main-identities.json','promotion/main-review-path-adaptations.json',
        'supervisor/main-layout/loader-adaptation.json','supervisor/review/main-layout/path-adaptation.json'}
    assert generated==expected_generated,(generated-expected_generated,expected_generated-generated)
    summary=json.loads((BUNDLE/'integrated-verification/summary.json').read_bytes())
    for entry in summary['copies']:
        path=BUNDLE/'integrated-verification'/entry['destination']
        assert len(path.read_bytes())==entry['bytes'] and digest(path)==entry['sha256']
    for name in ('supervisor/main-layout/loader-adaptation.json','supervisor/review/main-layout/path-adaptation.json'):
        value=json.loads((BUNDLE/name).read_bytes());raw=value['text'].encode('utf-8')
        assert len(raw)==value['original_bytes'] and sha256(raw).hexdigest()==value['original_sha256']
    final=json.loads((BUNDLE/'promotion/final-main-identities.json').read_bytes())
    assert all(digest(ROOT/name)==value for name,value in final.items())
    adaptations=json.loads((BUNDLE/'promotion/main-review-path-adaptations.json').read_bytes())
    for entry in adaptations['files']:
        current=(ROOT/entry['current_path']).read_bytes()
        assert sha256(current).hexdigest()==entry['current_sha256']
        original=byte_index[entry['original_sha256']]
        expected=''.join(difflib.unified_diff(original.decode().splitlines(True),current.decode().splitlines(True),
            fromfile=entry['original_path'],tofile=entry['current_path']))
        assert expected==entry['unified_diff']
    python=json.loads((BUNDLE/'integrated-verification/python-execution.json').read_bytes())
    assert python['exit_code']==0 and python['source_before']==python['source_after']
    assert all(digest(ROOT/name)==value for name,value in python['source_after'].items())
    log=(BUNDLE/'integrated-verification/python-unittest.txt').read_bytes()
    assert sha256(log).hexdigest()==python['log_sha256']
    count=int(re.search(rb'Ran ([0-9]+) tests in ',log).group(1));assert count==981
    assert log.rstrip().endswith(b'OK')
    browser=json.loads((BUNDLE/'integrated-verification/browser-report.json').read_bytes())
    assert browser['status']=='passed' and len(browser['checks'])==56 and browser['javascript_errors']==[]
    assert all(digest(ROOT/name)==value for name,value in browser['source_sha256'].items())
    fixture_manifest=json.loads((ROOT/'tests/fixtures/mpea_ui/manifest.json').read_bytes())
    for entry in fixture_manifest['outputs']:
        path=ROOT/'tests/fixtures/mpea_ui'/entry['file'];value=json.loads(path.read_bytes())
        assert digest(path)==entry['sha256'] and len(path.read_bytes())==entry['bytes']
        assert value['execution_kind']=='synthetic_fixture'
    regeneration=json.loads((BUNDLE/'workbench/regeneration-comparison.json').read_bytes())
    assert regeneration['status']=='PASS' and len(regeneration['outputs'])==5
    assert all(digest(ROOT/'tests/fixtures/mpea_ui'/e['file'])==e['sha256'] for e in regeneration['outputs'])
    assert not (ROOT/'src/lupine_discovery/resources/mpea-t25-v1.json').exists()
    producers={name:value for name,value in final.items() if name.startswith('scripts/')}
    report={'schema':'lupine.review.mpea_integrated_publication.v1','status':'PASS','scope':'Read-only artifact/source audit; no new suite, browser, actual allocation, feature, target or study execution.',
        'copied_artifacts':len(entries),'direct_copies':len(entries)-encoded,'lossless_utf8_logs':encoded,
        'separately_generated_artifacts':len(generated),'generated':sorted(generated),
        'copy_manifest_sha256':digest(BUNDLE/'artifact-copies.json'),
        'integrated_summary_sha256':digest(BUNDLE/'integrated-verification/summary.json'),
        'python':{'recorded_tests':count,'source_count':len(python['source_after']),'current_sources_match':True},
        'browser':{'recorded_checks':len(browser['checks']),'source_count':len(browser['source_sha256']),'current_sources_match':True},
        'exact_adaptation_diff_count':len(adaptations['files']),'synthetic_ui_reports':5,'actual_resource_present':False,
        'final_producer_sha256':producers,'review_program_sha256':digest(Path(__file__)),
        'bundle_file_sha256':{p.relative_to(BUNDLE).as_posix():digest(p) for p in sorted(BUNDLE.rglob('*')) if p.is_file()},
        'limits':['Copied historical commands reference their original scratch locations; those receipts record past runs, not portable launchers.',
            'Main entry points/tests and fixture regeneration are the portable paths; no complete suite was rerun for this audit.',
            'Fresh installed packaging remains pending the committed release candidate, as explicitly stated by the integrated summary.',
            'This is constructed-input engineering evidence, not production registration or scientific performance evidence.']}
    raw=(json.dumps(report,sort_keys=True,indent=2)+'\n').encode()
    with (OUT/'review-v1.json').open('xb') as stream:stream.write(raw)
    print(json.dumps({'status':'PASS','copies':len(entries),'generated':len(generated),'receipt_sha256':sha256(raw).hexdigest()}))


if __name__=='__main__':main()
