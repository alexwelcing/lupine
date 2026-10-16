"""Read-only public-document link and byte-binding review; no product execution."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
import datetime, hashlib, json, re

ROOT = Path('/workspace/lupine-discovery-branch/discovery')
OUT = ROOT / '.cache/phase2-next-publication-link-review-v1'
SEEN = {}

def read(path):
    raw = path.read_bytes()
    SEEN[str(path.relative_to(ROOT))] = {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
    return raw

def obj(path):
    return json.loads(read(path))

docs = ['reports/phase2-finite-compatible-verification-v1/README.md',
        'reports/phase2-finite-planning-figure-v1/PUBLICATION.md',
        'docs/finite-planning-walkthrough.md', 'reports/phase2-li-author-methods-v1/README.md',
        'reports/phase2-finite-planning-figure-v1/README.md',
        'reports/phase2-li-author-methods-v1/PUBLICATION.md']
links = []
for relative in docs:
    path = ROOT / relative
    text = read(path).decode()
    for match in re.finditer(r'!?\[[^\]]*\]\(([^)]+)\)', text):
        target = match.group(1)
        parsed = urlsplit(target)
        if parsed.scheme or not parsed.path:
            continue
        resolved = (path.parent / unquote(parsed.path)).resolve()
        links.append({'document': relative, 'line': text[:match.start()].count('\n') + 1,
                      'target': target, 'exists': resolved.exists(),
                      'resolved': str(resolved.relative_to(ROOT))})
assert all(item['exists'] for item in links)
source = ROOT / '.cache/phase2-li-author-methods-v1'
pub = ROOT / 'reports/phase2-li-author-methods-v1'
lossless_map = obj(ROOT / 'reports/phase2-finite-compatible-verification-v1/publication-checks/lossless-map.json')
source_wrappers = {entry['original_path']: entry for entry in lossless_map['files']}
binding = obj(pub / 'source-bindings.json')
mapping = []
original_binding = read(source / 'source-bindings.json')
entries = [*binding['artifact_files'], {'path': 'source-bindings.json',
            'sha256': hashlib.sha256(original_binding).hexdigest(), 'bytes': len(original_binding)}]
for entry in entries:
    relative = entry['path']
    original = read(source / relative)
    published_path = str((pub / relative).relative_to(ROOT))
    if published_path in source_wrappers:
        representation = source_wrappers[published_path]
        wrapper = obj(ROOT / representation['wrapper'])
        published = wrapper['text'].encode('utf-8')
        readable = read(pub / relative)
        assert readable == b'\n'.join(line.rstrip() for line in original.splitlines()).rstrip() + b'\n'
        assert hashlib.sha256(readable).hexdigest() == representation['readable_copy_sha256']
        assert wrapper['original_sha256'] == entry['sha256']
        published_path = representation['wrapper']
        representation_kind = 'lossless_original_wrapper_with_whitespace_only_readable_copy'
    else:
        published = read(pub / relative)
        representation_kind = 'direct_exact_bytes'
    assert original == published
    assert hashlib.sha256(published).hexdigest() == entry['sha256']
    assert len(published) == entry['bytes']
    mapping.append({'historical_source': str((source / relative).relative_to(ROOT)),
                    'published': published_path, 'representation_kind': representation_kind,
                    'bytes': len(published), 'sha256': entry['sha256'], 'exact_copy': True})
contexts = []
for entry in binding['local_context']:
    raw = read(ROOT.parent / entry['path'])
    assert len(raw) == entry['bytes'] and hashlib.sha256(raw).hexdigest() == entry['sha256']
    contexts.append({'path': entry['path'], 'matches': True})
copy_map = {'schema': 'lupine.discovery.author_methods_public_copy_map.v1',
            'created_by': 'independent publication-link reviewer',
            'scope': 'Exact author-audit cache-to-public correspondence; original review/source bindings remain unchanged. Paths are relative to discovery/.',
            'copies': mapping}
(OUT / 'author-copy-map.json').write_text(json.dumps(copy_map, indent=2) + '\n')
publication_wrappers = []
for entry in lossless_map['files']:
    wrapper = obj(ROOT / entry['wrapper'])
    raw = wrapper['text'].encode('utf-8')
    assert hashlib.sha256(raw).hexdigest() == entry['original_sha256'] == wrapper['original_sha256']
    assert wrapper['original_path'] == entry['original_path']
    publication_wrappers.append({'wrapper': entry['wrapper'], 'original_sha256': entry['original_sha256'],
                                 'round_trip_exact': True, 'decoded_bytes': len(raw)})
fig = ROOT / 'reports/phase2-finite-planning-figure-v1'
fmt = obj(fig / 'publication-format.json')
wrappers = {x['original_path']: x for x in fmt['originals']}
figure_checks = []
for relative, digest in obj(fig / 'copy-inventory.json')['files'].items():
    if relative in wrappers:
        entry = wrappers[relative]
        wrapper = obj(fig / entry['wrapper'])
        raw = wrapper['text'].encode('utf-8')
        assert digest == entry['original_sha256'] == wrapper['original_sha256']
        assert wrapper['encoding'] == 'utf-8'
        assert wrapper.get('original_relative_path', wrapper.get('original_path')) == relative
        if 'original_bytes' in wrapper:
            assert len(raw) == wrapper['original_bytes']
        kind, path = 'lossless_utf8_wrapper', entry['wrapper']
    else:
        raw = read(fig / relative)
        kind, path = 'direct_exact_bytes', relative
    assert hashlib.sha256(raw).hexdigest() == digest
    figure_checks.append({'original_relative_path': relative, 'published_representation': path,
                          'representation_kind': kind, 'original_sha256': digest,
                          'decoded_bytes': len(raw), 'match': True})
for relative, key in [('exact-data.csv', 'clean_csv_sha256'), ('finite-versus-iid.svg', 'clean_svg_sha256')]:
    assert hashlib.sha256(read(fig / relative)).hexdigest() == fmt[key]
original_readme = obj(fig / 'README.md.bytes.json')['text']
current_readme = read(fig / 'README.md').decode()
notice = ('Publication navigation revision: the two CSV/SVG links below point to the equivalent\n'
          'clean exports. The exact original author README is retained in `README.md.bytes.json`;\n'
          'its original hashes and chronology are unchanged. See [publication mapping](PUBLICATION.md).\n\n')
expected = original_readme.replace('[SVG](second-generation/finite-versus-iid.svg)', '[SVG](finite-versus-iid.svg)').replace('[exact CSV](second-generation/exact-data.csv)', '[exact CSV](exact-data.csv)')
head, rest = expected.split('\n\n', 1)
assert current_readme == head + '\n\n' + notice + rest
assert hashlib.sha256(current_readme.encode()).hexdigest() == fmt['navigation_revision']['sha256']
for relative in ['reports/phase2-li-author-methods-review-v1/review.json',
                 'reports/phase2-li-author-methods-review-v1/scope.json',
                 'reports/phase2-finite-planning-figure-v1/independent-review/review.json',
                 'reports/phase2-finite-planning-figure-v1/independent-review/execution.json',
                 'reports/phase2-finite-planning-figure-v1/first-generation/execution.json',
                 'reports/phase2-finite-planning-figure-v1/second-generation/execution.json',
                 'reports/phase2-finite-compatible-verification-v1/publication-scope.json',
                 'reports/phase2-finite-compatible-verification-v1/actual-copy-inventory.json',
                 'reports/phase2-finite-compatible-verification-v1/independent-artifact-audit/copy-inventory.json',
                 'reports/phase2-finite-compatible-verification-v1/clean-package/release-artifacts.json',
                 'reports/phase2-finite-compatible-verification-v1/independent-artifact-audit/review.json',
                 'reports/phase2-finite-compatible-verification-v1/integration-claim-review/review.json',
                 'reports/phase2-finite-compatible-verification-v1/promotion-execution.json']:
    read(ROOT / relative)
report = {
 'schema': 'lupine.discovery.publication_link_review.v1',
 'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'reviewer': '/root/phase2_evidence/author_methods_review',
 'status': 'PUBLICATION_LINK_AND_ORIGINAL_BYTE_REVIEW_PASS',
 'tracked_files_modified': False, 'reviewed_documents': docs, 'relative_links': links,
 'blocking_findings': [],
 'resolved_findings': [{
   'id': 'FIGURE_ORIGINAL_README_LINKS', 'initial_document_sha256': 'c73de3aa4df464914077ceb4c71e7de1a365f3a239d0ccb8f0eb909faf7ffb8d',
   'original_missing_targets': ['second-generation/finite-versus-iid.svg', 'second-generation/exact-data.csv'],
   'initial_problem': 'Preserved author README still linked files replaced by lossless wrappers; primary PUBLICATION.md exports already worked.',
   'resolution': 'Root retained exact original README in README.md.bytes.json, mapped its original identity, and changed active README only by two export links plus explicit navigation notice.',
   'original_readme_wrapper_exact': True, 'active_readme_only_expected_navigation_changes': True,
   'current_readme_sha256': fmt['navigation_revision']['sha256']}],
 'reviewer_audit_failure_preserved': {
   'exception': "KeyError: 'original_bytes'", 'classification': 'REVIEWER_WRAPPER_SCHEMA_ASSUMPTION',
   'cause': 'An initial in-memory assembly assumed every wrapper had original_bytes. The newly added README wrapper binds original_sha256 and encoding but does not declare that optional byte-count field.',
   'repair': 'Retain exact SHA-256, encoding and original-path checks for every wrapper; verify original_bytes whenever present and record actual decoded length for all.',
   'product_or_source_change_required': False, 'final_recheck_completed': True},
 'superseded_direct_copy_check': {
   'exception': 'AssertionError: original == published',
   'cause': 'Root normalized readable author README/license copies and added exact original wrappers while this review was running. The earlier direct-file comparison no longer described the new publication representation.',
   'original_audit_script': 'audit_publication.first-direct-copy-assumption.py',
   'repair': 'Use the explicit lossless map: compare decoded originals to retained original bytes and audit hashes, and separately require exact whitespace-only normalization for readable copies.',
   'normalization_check_correction': 'The first readable-copy comparison also preserved extra final blank lines. Public README normalization removes those trailing blank lines; exact comparison now requires per-line rstrip, final rstrip, and one LF. This changes no words or interior line structure.',
   'product_or_evidence_failure': False},
 'nonblocking_provenance_notes': [
   'Copied author independent-review read_files retain truthful historical .cache locations. All ten exact public counterparts match. author-copy-map.json supplies an explicit publication mapping without rewriting original records.',
   'Historical execution commands retain cache paths and timestamps; they were reviewed as records, not rerun instructions or evidence of a new execution.',
   'Upstream source README links to excluded notebook/workbook bodies are retained upstream text; those bodies were neither opened nor expected as locally published artifacts.',
   'Dated pending-status scope/handoff snapshots remain historical; no finding calls them false merely because later verification occurred.'],
 'author_exact_copy_checks': mapping, 'author_local_context_hash_checks': contexts,
 'figure_original_representation_checks': figure_checks,
 'additional_publication_wrapper_checks': publication_wrappers,
 'unperformed': ['network requests','private custody access','actual workbook or notebook access',
                 'product/test/audit-source execution','scientific-claim or CI/custody-completion adjudication',
                 'tracked writes','Git mutations'],
 'limitations': ['Own metadata and hash-check code ran; no product or copied audit source ran.',
                 'Link and byte checks do not establish scientific validity or release behavior.']}
(OUT / 'source-bindings.json').write_text(json.dumps({'files': SEEN}, indent=2) + '\n')
(OUT / 'review.json').write_text(json.dumps(report, indent=2) + '\n')
for name in ['review.json', 'source-bindings.json', 'author-copy-map.json']:
    print(name, hashlib.sha256((OUT / name).read_bytes()).hexdigest())
print('resolved local links', len(links), 'author exact copies', len(mapping), 'figure exact representations', len(figure_checks))
