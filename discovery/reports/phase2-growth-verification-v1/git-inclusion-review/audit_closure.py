"""Read-only local Git/index closure check; no project import or reader execution."""
import hashlib
import json
from pathlib import Path
import subprocess
from datetime import datetime, timezone

ROOT = Path('/workspace/lupine-discovery-branch/discovery')
OUT = ROOT / '.cache/phase2-growth-publication-closure-review-v1'
FIRST = '280dff57de0f9bbbf8f28e83498d36a7cf7b206b'
BASE = 'c17c4c6b152af2e7bc1b7a7639336f6b0f733ace'
FREEZE = '.cache/phase2-growth-verification-release-v1/final-input-manifest.json'
FREEZE_SHA = 'cd7b2a6ff07f6f728fdb36827236965b7e662cbe8f1d2bf46c2dca9d9289d574'
COPY = 'reports/phase2-growth-verification-v1/publication/publication-review-copy.json'
FAILURE = 'reports/phase2-growth-verification-v1/publication/git-inclusion-failure.json'
sha = lambda data: hashlib.sha256(data).hexdigest()
def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT.parent)
def blobs(ref, paths):
    expressions = [(ref + ':discovery/' + p) for p in paths]
    raw = git('cat-file', '--batch') if not expressions else subprocess.check_output(
        ['git', 'cat-file', '--batch'], cwd=ROOT.parent,
        input=('\n'.join(expressions) + '\n').encode())
    pos = 0
    result = {}
    for p in paths:
        end = raw.index(b'\n', pos)
        header = raw[pos:end]
        pos = end + 1
        if header.endswith(b' missing'):
            result[p] = None
        else:
            oid, kind, size = header.split()
            assert kind == b'blob'
            n = int(size)
            result[p] = raw[pos:pos+n]
            assert raw[pos+n:pos+n+1] == b'\n'
            pos += n + 1
    assert pos == len(raw)
    return result

start = datetime.now(timezone.utc).isoformat()
index_before = git('ls-files', '--stage', '-z')
assert git('rev-parse', 'HEAD').decode().strip() == FIRST
freeze_raw = (ROOT / FREEZE).read_bytes()
assert sha(freeze_raw) == FREEZE_SHA
freeze = json.loads(freeze_raw)
assert freeze['source_commit'] == BASE
copy_raw = (ROOT / COPY).read_bytes()
copy = json.loads(copy_raw)
expected = dict(freeze['promotion_files'])
assert len(expected) == 485
for row in copy['copies']:
    assert row['published'] not in expected
    original = (ROOT / row['original']).read_bytes()
    assert sha(original) == row['sha256'] and len(original) == row['bytes']
    expected[row['published']] = row['sha256']
assert len(copy['copies']) == 18 and len(expected) == 503
doc_paths = {'GOAL.md':'GOAL.md', 'STATUS.md':'STATUS.md', 'progress.md':'reports/progress.md',
             'continuation.json':'reports/continuation.json', 'release-validation.md':'docs/release-validation.md'}
for name, digest in freeze['project_docs_files'].items():
    assert doc_paths[name] not in expected
    expected[doc_paths[name]] = digest
assert len(expected) == 508
failure = json.loads((ROOT / FAILURE).read_bytes())
assert failure['first_report_commit'] == FIRST
first = blobs(FIRST, expected)
index = blobs('', expected)
missing = {p: expected[p] for p, data in first.items() if data is None}
assert missing == failure['missing_exact_files'] and len(missing) == 8
for p, digest in expected.items():
    assert sha((ROOT / p).read_bytes()) == digest, ('worktree', p)
    assert index[p] is not None and sha(index[p]) == digest, ('index', p)
    if first[p] is not None:
        assert sha(first[p]) == digest, ('first_commit', p)
metadata = ['reports/phase2-growth-verification-v1/PUBLICATION_REVIEW.md',
            'reports/phase2-growth-verification-v1/publication/promotion-receipt.json', COPY]
first_changed = {p.removeprefix('discovery/') for p in git('diff', '--name-only', BASE, FIRST, '--', 'discovery/').decode().splitlines()}
assert first_changed == (set(expected) - set(missing)) | set(metadata)
assert len(first_changed) == 503
new_metadata = ['reports/phase2-growth-verification-v1/GIT_PUBLICATION.md', FAILURE]
meta_first = blobs(FIRST, metadata)
meta_index = blobs('', metadata + new_metadata)
for p in metadata + new_metadata:
    assert meta_index[p] == (ROOT / p).read_bytes()
for p in metadata[1:]:
    assert meta_first[p] == meta_index[p]
assert meta_first[metadata[0]] != meta_index[metadata[0]]
staged = {p.removeprefix('discovery/') for p in git('diff', '--cached', '--name-only').decode().splitlines()}
assert staged == set(missing) | set(new_metadata) | {metadata[0]}, sorted(staged)
assert not git('ls-files', '--unmerged')
runtime_raw = (ROOT / 'reports/runtime-manifest.json').read_bytes()
runtime = json.loads(runtime_raw)['files']
assert len(runtime) == 332
runtime_refs = {ref or 'index': blobs(ref, runtime) for ref in [BASE, FIRST, '']}
for p, digest in runtime.items():
    assert sha((ROOT / p).read_bytes()) == digest, ('runtime_worktree', p)
    for ref, values in runtime_refs.items():
        assert values[p] is not None and sha(values[p]) == digest, ('runtime', ref, p)
manifest_refs = {ref or 'index': blobs(ref, ['reports/runtime-manifest.json'])['reports/runtime-manifest.json'] for ref in [BASE, FIRST, '']}
assert all(value == runtime_raw for value in manifest_refs.values())
ignore = subprocess.run(['git','check-ignore','--no-index','-v','--', *['discovery/' + p for p in missing]], cwd=ROOT.parent, capture_output=True, check=True)
assert ignore.stderr == b'' and len(ignore.stdout.decode().splitlines()) == 8
assert all('*.log' in line for line in ignore.stdout.decode().splitlines())
assert git('ls-files', '--stage', '-z') == index_before
assert git('rev-parse', 'HEAD').decode().strip() == FIRST
receipt = {
    'status':'PASS', 'started_at':start, 'completed_at':datetime.now(timezone.utc).isoformat(),
    'scope':'Read-only local Git/index closure; no tests, project imports, network or actual scientific/private source access.',
    'first_publication_commit':FIRST, 'implementation_commit':BASE,
    'freeze_sha256':FREEZE_SHA, 'copy_map_sha256':sha(copy_raw),
    'first_commit':{'expected_fixed_files':508,'matching_fixed_blobs':500,'missing_exact_files':missing,
                    'post_review_metadata_files':3,'total_changed_files':503,'mismatched_present_blobs':0},
    'index':{'matching_fixed_blobs':508,'report_blobs':503,'frozen_docs':5,'staged_paths':sorted(staged),
             'all_expected_fixed_files_present':True,'index_stage_listing_sha256':sha(index_before),'held_before_after':True},
    'runtime':{'files':332,'worktree_index_first_and_implementation_match_manifest':True,'manifest_unchanged':True},
    'metadata':{p:{'index_sha256':sha(meta_index[p]),'first_sha256':sha(meta_first[p]) if p in meta_first else None} for p in metadata + new_metadata},
    'ignore_explanation':'All eight omitted paths independently match the repository *.log ignore rule.',
    'correction_claim_review':'GIT_PUBLICATION and PUBLICATION_REVIEW correctly distinguish retained local-copy evidence from Git inclusion, preserve the first push, and leave correction commit/remote/CI verification to root.',
    'limitations':['This check binds the index before copying its own future evidence; root must reconcile that later evidence separately.',
                  'No correction commit, remote publication, or correction CI result is claimed.',
                  'Check success is publication integrity, not physical validation or a changed scientific release decision.'],
}
(OUT / 'review.json').write_text(json.dumps(receipt, indent=2, sort_keys=True) + '\n')
(OUT / 'ignore-rules.txt').write_bytes(ignore.stdout)
print(json.dumps({'status':'PASS','fixed_index_blobs':508,'first_commit_missing':8,'runtime_files_unchanged':332,'review_sha256':sha((OUT/'review.json').read_bytes())}))
