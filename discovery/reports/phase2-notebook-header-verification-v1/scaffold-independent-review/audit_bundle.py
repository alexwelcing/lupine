"""Read-only audit of the bounded public report scaffold; no project imports."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re

ROOT = Path('/workspace/lupine-discovery-branch/discovery')
SCAFFOLD = ROOT / '.cache/phase2-notebook-header-verification-v1'
BUNDLE = SCAFFOLD / 'promotion/reports/phase2-notebook-header-verification-v1'
OUT = Path(__file__).absolute().parent
COMMIT = 'a6e87c198d8116d26c523e0e1b2eedce4aeb225b'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def load(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            assert key not in result
            result[key] = value
        return result
    return json.loads(path.read_bytes(), object_pairs_hook=unique)


def identity(path):
    assert path.absolute() == path.resolve() and path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    raw.decode('utf-8', errors='strict')
    return {'bytes': len(raw), 'sha256': sha(raw)}


def main():
    before = {str(p.relative_to(BUNDLE)): identity(p)
              for p in sorted(BUNDLE.rglob('*')) if p.is_file()}
    assert len(before) == 33 and sum(v['bytes'] for v in before.values()) == 307954
    assert all(Path(name).suffix in {'.md', '.json', '.txt', '.py'} for name in before)
    assert not any(p.is_symlink() for p in BUNDLE.rglob('*'))
    assert not any(set(Path(name).parts) & {'.git', '.venv', '.cache', 'objects', '__pycache__'}
                   for name in before)
    handoff = load(SCAFFOLD / 'handoff.json')
    prefix = 'reports/phase2-notebook-header-verification-v1/'
    assert handoff['mapping'] == {prefix + name: value for name, value in before.items()}
    assert handoff['file_count'] == len(before)
    assert handoff['total_bytes'] == sum(v['bytes'] for v in before.values())
    assert handoff['commit'] == COMMIT
    outer = load(BUNDLE / 'inventory.json')['files']
    assert outer == {name: value for name, value in before.items() if name != 'inventory.json'}
    inner_root = BUNDLE / 'independent-artifact-review'
    inner = load(inner_root / 'inventory.json')['files']
    assert inner == {str(p.relative_to(inner_root)): identity(p)
                     for p in sorted(inner_root.rglob('*'))
                     if p.is_file() and p != inner_root / 'inventory.json'}
    copies = load(BUNDLE / 'copy-map.json')['files']
    assert len(copies) == 29 == handoff['copy_count']
    assert len({record['target'] for record in copies}) == len(copies)
    allowed = (ROOT / '.cache/phase2-notebook-header-clean-package-v1',
               ROOT / '.cache/phase2-notebook-header-artifact-review-v1',
               ROOT / '.cache/phase2-compatible-zip-decision-map-v1')
    copy_checks = []
    for record in copies:
        source, target = ROOT / record['source'], BUNDLE / record['target']
        assert any(source.is_relative_to(path) for path in allowed)
        assert source.suffix in {'.md', '.json', '.txt', '.py'}
        assert target.is_relative_to(BUNDLE) and '..' not in Path(record['target']).parts
        assert record['representation'] == 'exact_bytes'
        expected = {key: record[key] for key in ('bytes', 'sha256')}
        assert identity(source) == identity(target) == expected
        assert source.read_bytes() == target.read_bytes()
        copy_checks.append({'source': record['source'], 'target': record['target'], **expected})
    assert set(before) - {record['target'] for record in copies} == {
        'README.md', 'checkpoint.json', 'copy-map.json', 'inventory.json'}
    links = []
    for path in sorted(BUNDLE.rglob('*.md')):
        text = path.read_text()
        for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', text):
            if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target):
                continue
            leaf = target.split('#', 1)[0]
            if not leaf:
                continue
            resolved = (path.parent / leaf).resolve()
            assert resolved.is_relative_to(BUNDLE) and resolved.is_file()
            links.append({'from': str(path.relative_to(BUNDLE)), 'target': target})
    assert links == handoff['local_markdown_links_checked'] and len(links) == 11
    checkpoint = load(BUNDLE / 'checkpoint.json')
    assert checkpoint['commit'] == COMMIT and checkpoint['scientific_claim_changed'] is False
    assert checkpoint['ci'] == {'status': 'PENDING', 'verified_in_this_bundle': False}
    for key in ('actual_notebook_operations', 'actual_compatible_header_diagnostic'):
        assert checkpoint[key] == {'execution_receipt_present': False,
                                   'status': 'NOT_RECORDED_IN_THIS_BUNDLE'}
    assert checkpoint['decision_map'] == {'actual_cause_inferred': False, 'status': 'PROSPECTIVE_SOURCE_ONLY'}
    runs = [load(BUNDLE / f'clean-package/{index}-execution.json') for index in (0, 1)]
    for index, run in enumerate(runs):
        assert run['commit'] == COMMIT and run['exit_code'] == 0 and not run['timed_out']
        assert run['source_unchanged'] and run['head_unchanged'] and run['worktree_clean']
        assert len(run['runtime_before']) == 323 and run['runtime_before'] == run['runtime_after']
        for stream in ('stdout', 'stderr'):
            assert sha((BUNDLE / f'clean-package/{index}-{stream}.txt').read_bytes()) == run[stream + '_sha256']
    assert runs[0]['runtime_before'] == runs[1]['runtime_before']
    for key, run in zip(('retained_package', 'strict_retained_verifier'), runs):
        check = checkpoint['completed'][key]
        assert check['status'] == 'PASS' and check['exit_code'] == run['exit_code']
        assert check['elapsed_seconds'] == run['elapsed_seconds']
        assert check['finished_utc'] == run['finished_at']
    release_path = BUNDLE / 'clean-package/release-artifacts.json'
    release = load(release_path)
    full = load(inner_root / 'actual-a6e87c/review.json')
    add = load(inner_root / 'additive-review.json')
    assert full['status'] == add['status'] == 'PASS' and full['commit'] == add['commit'] == COMMIT
    assert full['receipt_sha256'] == sha(release_path.read_bytes())
    assert full['artifact_identities'] == release['artifacts']
    assert full['source_files_compared_to_git_blobs'] == release['source']['archived_file_count'] == 3172
    assert full['runtime_source_files_matching_manifest_and_worktree'] == 323
    assert full['wheel_members'] == 115 and full['wheel_record_content_digests_checked'] == 114
    assert full['wheel_package_members_matching_exact_git_source'] == 108
    assert len(full['mandatory_checks']) == 16 and release['verification']['checks'] == full['mandatory_checks']
    assert add['unchanged_full_artifact_auditor_review_sha256'] == sha((inner_root / 'actual-a6e87c/review.json').read_bytes())
    assert add['baseline_runtime_pins_verified_against_baseline_git_bytes'] == add['unchanged_prior_runtime_files'] == 317
    assert len(add['added_runtime_files']) == 6 and len(add['new_source_test_contracts_exact_in_git_archive_worktree']) == 8
    assert add['unchanged_wheel_package_members'] == 108 and add['wheel_payload_equals_complete_baseline_git_package']
    assert add['wheel_nonpackage_content_delta'] == {} and add['wheel_archive_bytes_claimed_unchanged'] is False
    first = load(inner_root / 'additive-first/additive-review.json')
    assert first['status'] == 'FAIL' and first['exit_code'] == 1
    assert 'returned non-zero exit status 128' in first['failure']
    assert sha((inner_root / 'additive-first/additive_audit.py').read_bytes()) == first['script_sha256']
    after = {str(p.relative_to(BUNDLE)): identity(p)
             for p in sorted(BUNDLE.rglob('*')) if p.is_file()}
    assert before == after
    result = {'status': 'PASS', 'scope': 'Report copy/inventory/link and recorded-claim consistency only',
              'reviewer': '/root/phase2_planner/ui_review', 'finished_utc': datetime.now(timezone.utc).isoformat(),
              'commit': COMMIT, 'bundle_files': len(before), 'bundle_bytes': sum(v['bytes'] for v in before.values()),
              'exact_copies_verified': copy_checks, 'outer_inventory_entries': len(outer),
              'inner_inventory_entries': len(inner), 'local_markdown_links': links,
              'bundle_unchanged_during_review': True, 'file_bindings': before,
              'pending_states_preserved': True, 'actual_diagnostic_cause_assessed': False,
              'package_tests_or_audits_rerun': False, 'ci_read': False,
              'private_scientific_or_actual_operation_receipts_read': False,
              'review_script_sha256': sha(Path(__file__).read_bytes())}
    (OUT / 'copy-link-check.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({key: result[key] for key in ('status', 'bundle_files', 'bundle_bytes',
                     'outer_inventory_entries', 'inner_inventory_entries', 'bundle_unchanged_during_review')}))


if __name__ == '__main__':
    main()
