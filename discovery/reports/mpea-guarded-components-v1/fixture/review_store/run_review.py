"""Re-run independent synthetic stage-store tests with before/after bindings."""
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess
import sys

REVIEW = Path(__file__).resolve().parent
PROJECT = REVIEW.parents[2]
CUSTODY = REVIEW.parent
EXPECTED_STORE = '86c2b51d1c04e03e725b3f245c4f917d698a05d8830f465917c8f8a10209f304'
FILES = [CUSTODY/'scripts/mpea_stage_store.py', CUSTODY/'scripts/mpea_target_custody.py',
         REVIEW/'test_stage_store_review.py', REVIEW/'README.md', Path(__file__).resolve(),
         PROJECT/'.cache/mpea-protocol-design/mpea-t25-implementation-contract-v1.md']

def capture():
    return {str(path.relative_to(PROJECT)): sha256(path.read_bytes()).hexdigest() for path in FILES}

def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False,
                       allow_nan=False)+'\n').encode('utf-8')

def main():
    result_path = REVIEW/'independent-review-v1.json'
    log_path = REVIEW/'tests-final.txt'
    if result_path.exists() or log_path.exists():
        raise SystemExit('FINAL_REVIEW_OUTPUT_ALREADY_EXISTS')
    before = capture()
    if before[str(FILES[0].relative_to(PROJECT))] != EXPECTED_STORE:
        raise SystemExit('STORE_SOURCE_CHANGED_BEFORE_REVIEW')
    command = [sys.executable, '-m', 'unittest', 'discover', '-s', str(REVIEW),
               '-p', 'test_stage_store_review.py', '-v']
    started = datetime.now(timezone.utc).isoformat()
    completed = subprocess.run(command, cwd=PROJECT, stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT, timeout=60, check=False)
    after = capture()
    text = completed.stdout.decode('utf-8', errors='strict')
    match = re.search(r'\nRan ([0-9]+) tests in [0-9.]+s\n\nOK\n\Z', text)
    count = int(match.group(1)) if match else None
    passed = completed.returncode == 0 and count == 21 and before == after
    with log_path.open('xb') as output:
        output.write(completed.stdout)
    result = {
        'schema': 'lupine.fixture_stage_store.independent_review.v1',
        'status': 'PASS' if passed else 'FAIL', 'test_count': count,
        'returncode': completed.returncode, 'started_utc': started,
        'completed_utc': datetime.now(timezone.utc).isoformat(),
        'command': command, 'source_sha256_before': before, 'source_sha256_after': after,
        'sources_unchanged': before == after,
        'log_sha256': sha256(completed.stdout).hexdigest(),
        'resolved_findings': ['ancestor_symlink_swap_redirected_COMPLETE_write',
            'failed_flush_left_completion_named_receipt', 'read_symlink_replacement_followed',
            'pending_name_substitution_published_foreign_bytes'],
        'preserved_prior_runs': {
            'tests-first.txt': {'tests':14,'passed':11,'failed':3},
            'tests-fd-repair.txt': {'tests':18,'passed':17,'failed':1},
            'tests-repaired.txt': {'tests':19,'passed':19,'failed':0}},
        'coverage': ['canonical_seals_reconstructed_independently',
            'eight_ordered_stages_and_terminal_failure', 'same_chain_across_fresh_attempts',
            'source_and_implementation_identity_sensitivity', 'detached_returned_snapshots',
            'traversal_symlinks_parent_replacement_no_overwrite', 'captured_inode_and_bytes',
            'file_directory_flush_shortwrite_failure_cleanup', 'FIFO_and_oversize_rejection',
            'duplicate_nonfinite_float_noncanonical_JSON', 'exact_size_node_depth_string_integer_limits'],
        'scope': {'constructed_fixtures_only': True, 'experimental_source_opened': False,
            'actual_features_or_labels_opened': False, 'allocation_entropy_drawn': False,
            'actual_allocation_performed': False, 'scientific_payload_validation': False,
            'production_authorization_established': False, 'formal_refinement_established': False,
            'concurrent_writer_or_cross_process_resume_verified': False,
            'main_tree_edited': False},
        'limitations': ['Generic canonicalization erases Fraction/string and dataclass/map Python type distinctions.',
            'Caller-supplied implementation hash maps are bound, not independently authenticated.',
            'Fixture scientific chains include whole predecessor hashes; future usage-bearing receipts need separate scientific identities.',
            'No hostile-operator isolation or crash-resumption guarantee.']}
    result['content_sha256'] = sha256(canonical(result)).hexdigest()
    with result_path.open('xb') as output:
        output.write(canonical(result))
    print(json.dumps({'status':result['status'],'tests':count,'sources_unchanged':before==after,
                      'receipt_sha256':sha256(result_path.read_bytes()).hexdigest()},sort_keys=True))
    return 0 if passed else 1

if __name__ == '__main__':
    raise SystemExit(main())
